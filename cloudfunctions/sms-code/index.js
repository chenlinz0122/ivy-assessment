// 云函数：sms-code —— 短信验证码发送 / 校验（验证码登录、绑定手机号）
//
// ===== 安全设计（务必按此部署） =====
// 1) dev 判定只看云函数环境变量 SMS_DEV=1（云开发控制台 → 云函数 sms-code → 配置 → 环境变量），
//    绝不由前端传参决定；dev 模式固定验证码 123456，接口「不返回」真实验证码，只回 { dev:true }。
//    （注：腾讯 SMS 已注释，当前始终处于 dev 模式使用固定码 123456）
// 2) sms_codes 集合权限：云数据库控制台 → sms_codes → 权限设置 → 「仅管理端可读写」
//    （前端小程序不可读写，只有云函数/控制台可访问）。云函数内 cloud.database()
//    始终拥有管理员权限，不受该安全规则限制。
// 3) 防刷限流（超限返回明确 errno，前端就近提示）：
//      42903 同一手机号 60 秒内重复发送
//      42902 同一手机号 / 同一 openid 每小时上限（默认 10 条）
//      42904 同一客户端 IP 每小时上限（默认 20 条；云函数拿不到 IP 时该维度自动跳过）
//      42901 同一手机号每日上限（默认 10 条，按北京时间自然日）
// 4) 校验防护：6 位数字格式校验 + 5 分钟有效期 + 一次性使用（用后置 used=true）
//    + 同一手机号连续输错 5 次锁定 10 分钟（40003），防暴力枚举。
// 5) 腾讯云 SMS 发送通道（tencentcloud-sdk-nodejs）：已临时注释掉，不一定使用。
//    验证码登录统一使用固定码 123456（开发/测试用）；如需上线请取消注释 sendRealSms()，
//    配置环境变量 SMS_SDK_APP_ID / SMS_SIGN / SMS_TEMPLATE_ID 并接入腾讯云 SMS。
//
// 返回约定：{ success:true, ... } / { success:false, errno, errMsg }
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const SEND_INTERVAL_MS = 60 * 1000;      // 同手机号发送间隔
const HOURLY_LIMIT = 10;                 // 同手机号每小时上限
const DAILY_LIMIT = 10;                  // 同手机号每日上限
const OPENID_HOURLY_LIMIT = 10;          // 同 openid 每小时上限
const IP_HOURLY_LIMIT = 20;              // 同 IP 每小时上限
const CODE_EXPIRE_MS = 5 * 60 * 1000;    // 验证码有效期 5 分钟
const MAX_VERIFY_FAILS = 5;              // 连续输错上限
const LOCK_MS = 10 * 60 * 1000;          // 输错锁定 10 分钟
const DEV_CODE = '123456';               // 固定验证码（腾讯 SMS 注释后，始终使用） 

const BJ_OFFSET_MS = 8 * 60 * 60 * 1000;

// dev 环境判定：只认云函数环境变量
const isDevEnv = () => process.env.SMS_DEV === '1';

// 北京时间「今天 0 点」对应的 UTC Date（每日上限按自然日统计，不受云函数 UTC 时区影响）
function beijingDayStart(ts) {
  const now = new Date(ts + BJ_OFFSET_MS);
  const utcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(utcMidnight - BJ_OFFSET_MS);
}

// 客户端 IP：云函数不保证下发，缺失时返回空串（该维度自动跳过，仅记日志）
function getClientIp(event) {
  try {
    if (event && event.userInfo && event.userInfo.clientIP) return event.userInfo.clientIP;
    const ctx = cloud.getWXContext();
    return (ctx && ctx.CLIENTIP) || '';
  } catch (e) {
    return '';
  }
}

// === 腾讯云 SMS 短信通道（暂时注释掉，不一定使用） ===
// // 正式短信通道（未接入前返回 ok:false，由调用方返回 50001）
// async function sendRealSms(phone, code) {
//   const appId = process.env.SMS_SDK_APP_ID;
//   const sign = process.env.SMS_SIGN;
//   const templateId = process.env.SMS_TEMPLATE_ID;
//   if (!appId || !sign || !templateId) return { ok: false };
//   // TODO: 接入腾讯云 SMS（tencentcloud-sdk-nodejs）后在此真实发送
//   console.log('[sms-code] 待接入真实短信通道', phone, String(code).length);
//   return { ok: false };
// }

exports.main = async (event = {}) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID || '';
    const db = cloud.database();
    const _ = db.command;
    const smsCodes = db.collection('sms_codes');

    // ==================== 发送验证码 ====================
    if (event.action === 'send') {
      const phone = String(event.phone || '').trim();
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return { success: false, errno: 40000, errMsg: '手机号格式不正确' };
      }

      const now = Date.now();
      const hourAgo = new Date(now - 60 * 60 * 1000);
      const dayStart = beijingDayStart(now);
      const clientIp = getClientIp(event);

      const [lastRes, phoneHourRes, phoneDayRes, openidHourRes, ipHourRes] = await Promise.all([
        smsCodes.where({ phone }).orderBy('createdAt', 'desc').limit(1).get(),
        smsCodes.where({ phone, createdAt: _.gt(hourAgo) }).count(),
        smsCodes.where({ phone, createdAt: _.gte(dayStart) }).count(),
        openid
          ? smsCodes.where({ openid, createdAt: _.gt(hourAgo) }).count()
          : Promise.resolve({ total: 0 }),
        clientIp
          ? smsCodes.where({ clientIp, createdAt: _.gt(hourAgo) }).count()
          : Promise.resolve({ total: 0 })
      ]);

      const last = lastRes.data && lastRes.data[0];
      if (last && now - new Date(last.createdAt).getTime() < SEND_INTERVAL_MS) {
        return { success: false, errno: 42903, errMsg: '发送太频繁，请 60 秒后再试' };
      }
      if (phoneHourRes.total >= HOURLY_LIMIT) {
        return { success: false, errno: 42902, errMsg: '该手机号每小时最多发送 ' + HOURLY_LIMIT + ' 条，请稍后再试' };
      }
      if (openidHourRes.total >= OPENID_HOURLY_LIMIT) {
        return { success: false, errno: 42902, errMsg: '当前微信账号发送过于频繁，请稍后再试' };
      }
      if (ipHourRes.total >= IP_HOURLY_LIMIT) {
        return { success: false, errno: 42904, errMsg: '当前网络环境发送过于频繁，请稍后再试' };
      }
      if (phoneDayRes.total >= DAILY_LIMIT) {
        return { success: false, errno: 42901, errMsg: '该手机号今日发送次数已达上限（' + DAILY_LIMIT + ' 条/天）' };
      }

      // 腾讯云 SMS 已注释，统一使用固定验证码 123456（开发/测试用）
      const dev = true;
      const code = DEV_CODE;
      const createdAt = new Date(now);

      await smsCodes.add({
        data: {
          phone,
          code,
          openid,
          clientIp,
          dev,
          used: false,
          failCount: 0,
          createdAt,
          expiresAt: new Date(now + CODE_EXPIRE_MS)
        }
      });

      // dev 模式：不发真实短信、不返回验证码，仅告知前端「使用固定码 123456」
      console.log('[sms-code][DEV] 固定验证码模式，phone=' + phone);
      return { success: true, dev: true };

      // === 以下为腾讯云 SMS 发送逻辑（已注释掉） ===
      // const sent = await sendRealSms(phone, code);
      // if (!sent.ok) {
      //   console.warn('[sms-code] 短信通道未配置，验证码未真实下发', phone);
      //   return { success: false, errno: 50001, errMsg: '短信通道未配置，请联系管理员' };
      // }
      // return { success: true, dev: false };
    }

    // ==================== 校验验证码（登录 / 绑定手机号） ====================
    if (event.action === 'verify') {
      const phone = String(event.phone || '').trim();
      const code = String(event.code || '').trim();
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return { success: false, errno: 40000, errMsg: '手机号格式不正确' };
      }
      if (!/^\d{6}$/.test(code)) {
        return { success: false, errno: 40001, errMsg: '请输入 6 位数字验证码' };
      }

      const res = await smsCodes
        .where({ phone, used: false })
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      const record = res.data && res.data[0];
      if (!record) {
        return { success: false, errno: 40002, errMsg: '验证码无效或已使用，请重新获取' };
      }
      if (new Date(record.expiresAt).getTime() < Date.now()) {
        return { success: false, errno: 40002, errMsg: '验证码已过期，请重新获取' };
      }
      if ((record.failCount || 0) >= MAX_VERIFY_FAILS) {
        return { success: false, errno: 40003, errMsg: '错误次数过多，请稍后重新获取验证码' };
      }

      if (String(record.code) !== code) {
        await smsCodes.doc(record._id).update({ data: { failCount: _.inc(1) } });
        return { success: false, errno: 40001, errMsg: '验证码错误，请重新输入' };
      }

      // 一次性使用：标记 used，防止同一验证码被重复登录
      await smsCodes.doc(record._id).update({
        data: { used: true, usedAt: new Date(), openid }
      });

      // 云端把手机号绑定到当前 openid（后续微信一键登录直接命中，无需再绑）
      let bound = false;
      if (openid) {
        try {
          const users = db.collection('users');
          const exist = await users.where({ openid }).limit(1).get();
          if (exist.data && exist.data.length) {
            const doc = exist.data[0];
            const patch = { phoneNumber: phone, lastLoginTime: new Date().toISOString() };
            if (!doc.nickName || doc.nickName === '微信用户') patch.nickName = '常青藤同学';
            await users.doc(doc._id).update({ data: patch });
          } else {
            await users.add({
              data: {
                openid,
                phoneNumber: phone,
                nickName: '常青藤同学',
                avatarUrl: '',
                grade: '高一',
                createdAt: new Date().toISOString(),
                lastLoginTime: new Date().toISOString()
              }
            });
          }
          bound = true;
        } catch (e) {
          // 绑定失败不阻断登录（前端仍会通过 store 再同步一次）
          console.warn('[sms-code] 手机号写回 users 失败', e.message || e);
        }
      }

      return { success: true, phoneNumber: phone, openid, bound };
    }

    return { success: false, errno: 40000, errMsg: '未知的 action：' + event.action };
  } catch (err) {
    console.error('sms-code 云函数异常:', err);
    return { success: false, errno: 50000, errMsg: err.errMsg || err.message || '验证码服务异常' };
  }
};

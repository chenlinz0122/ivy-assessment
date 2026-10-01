// 云函数：getPhoneNumber
//
// 版本说明（重要）：
//   使用「新版」手机号能力 —— 前端 button open-type="getPhoneNumber" 回调里的 e.detail.code，
//   由本函数调用 cloud.openapi.phonenumber.getPhoneNumber 换手机号。
//   微信自 2023 年起已停止下发 encryptedData/iv（旧版 encryptedData + session_key 解密方式作废），
//   故本函数不再处理 encryptedData；如遇极老客户端，请改用 update-user-encrypted-data 云函数兜底。
//
// 入参：
//   { code }  → 换手机号，成功后在云端把手机号绑定到当前 OPENID 的 users 档案
//   {}        → 探测云函数是否部署成功（仅回 openid）
// 返回：
//   { success:true, phoneNumber, openid, unionid, bound } / { success:false, errno, errMsg }
// 错误码：1400001 次数用尽 / 1400002 code 非法或已使用 / 40004 用户拒绝 / 104、112 隐私未声明
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// openapi 错误 → 明确错误码 + 可读文案（前端就近提示）
function normalizeError(err) {
  const raw = (err && (err.errCode || err.errno)) || 0;
  const map = {
    1400001: '手机号组件次数已达上限（需在 MP 后台购买资源包）',
    1400002: '手机号 code 非法或已被使用（有效期 5 分钟且只能用一次）',
    40004: '您取消了手机号授权',
    104: '用户未同意隐私协议（需在 MP 后台声明收集手机号）',
    112: '隐私接口未声明（MP 后台 → 设置 → 服务内容声明 → 手机号）'
  };
  return {
    errno: raw || 50001,
    errMsg: map[raw] || (err && (err.errMsg || err.message)) || '获取手机号失败'
  };
}

// 云端绑定：把手机号写入当前 openid 的 users 档案（不依赖前端数据库权限）
// 返回 { banned: true, banReason } 表示该用户已被封禁（调用方应拒绝登录）
async function bindPhoneToUser(db, openid, phoneNumber) {
  const users = db.collection('users');
  const exist = await users.where({ openid }).limit(1).get();
  if (exist.data && exist.data.length) {
    const doc = exist.data[0];
    // 封禁检查：已封禁用户拒绝登录（先返回，不写 lastLoginTime）
    if (doc.banned) {
      return { banned: true, banReason: doc.banReason || '账号已被限制使用' };
    }
    const patch = { phoneNumber, lastLoginTime: new Date().toISOString() };
    if (!doc.nickName || doc.nickName === '微信用户') patch.nickName = '常青藤同学';
    await users.doc(doc._id).update({ data: patch });
    return { banned: false };
  } else {
    await users.add({
      data: {
        openid,
        phoneNumber,
        nickName: '常青藤同学',
        avatarUrl: '',
        grade: '高一',
        banned: false,
        createdAt: new Date().toISOString(),
        lastLoginTime: new Date().toISOString()
      }
    });
    return { banned: false };
  }
}

exports.main = async (event = {}) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID || '';

    // --- 场景1：一键获取手机号（新版 code）---
    if (event.code) {
      if (!openid) {
        return { success: false, errno: 40001, errMsg: '无法获取 openid，请重启小程序后重试' };
      }
      let phoneInfo;
      try {
        phoneInfo = await cloud.openapi.phonenumber.getPhoneNumber({ code: event.code });
      } catch (err) {
        console.error('getPhoneNumber openapi 调用失败:', err);
        return Object.assign({ success: false }, normalizeError(err));
      }

      const info = (phoneInfo && phoneInfo.phoneInfo) || {};
      const phoneNumber = info.phoneNumber || info.purePhoneNumber || '';
      if (!phoneNumber) {
        return { success: false, errno: 50001, errMsg: '未取到手机号，请重试或改用验证码登录' };
      }

      // 云端写回 users（失败不阻断登录，仅标记 bound=false）
      // 封禁检查：已封禁用户直接拒绝登录（不写 lastLoginTime）
      let bound = false;
      try {
        const bindResult = await bindPhoneToUser(cloud.database(), openid, phoneNumber);
        if (bindResult && bindResult.banned) {
          return {
            success: false,
            errno: 40301,
            errMsg: bindResult.banReason || '账号已被限制使用，如有疑问请联系客服'
          };
        }
        bound = true;
      } catch (e) {
        console.warn('[getPhoneNumber] 手机号写回 users 失败', e.message || e);
      }

      return {
        success: true,
        phoneNumber,
        openid,
        unionid: wxContext.UNIONID || '',
        bound
      };
    }

    // --- 场景2：探测云函数可用性（无 code）---
    return {
      success: true,
      openid,
      msg: '云函数部署正常'
    };
  } catch (err) {
    console.error('getPhoneNumber 云函数异常:', err);
    return Object.assign({ success: false }, normalizeError(err));
  }
};

// 云函数：notify-admin
// 登录关键事件通知：写入 admin_notifications 集合（运营留痕/排障记录）
//   + 新用户注册时给白名单管理员推送微信「订阅消息」（服务通知直达管理员微信）
//
// 部署前置：
//   1. 数据库 → 新建集合 admin_notifications，权限「仅管理端可读写」
//   2. MP 后台 → 功能 → 订阅消息 → 申请一个模板（建议含：用户昵称、身份、注册时间）
//      类目建议选「教育 → 教育信息服务」，把模板 ID 配到下方环境变量
//   3. 云函数环境变量（云开发控制台 → 云函数 → notify-admin → 配置 → 环境变量）：
//        ADMIN_PHONES            管理员手机号白名单（多个英文逗号分隔），
//                                未配置时使用下方 DEFAULT_ADMIN_PHONES 内置手机号
//        SUBSCRIBE_TEMPLATE_ID   订阅消息模板 ID（不配置则只写通知集合，不推送）
//   4. 权限配置：本目录 config.json 已声明 subscribeMessage.send 权限
//
// 触发时机（前端调用）：
//   - 新用户注册成功   type=register   { nickName, grade, role, phoneNumber }  → 推订阅消息
//   - 云同步失败       type=sync_fail  { nickName, phoneNumber, reason }      → 仅写集合
//   - 手机号获取失败   type=login_fail { reason }                              → 仅写集合
//
// 入参：{ type, data:{} }
// 返回：{ success:true, pushed } / { success:false, errno, errMsg }
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 事件类型 → 通知标题模板
const TYPE_TITLE = {
  register: '新用户注册',
  sync_fail: '云同步失败',
  login_fail: '登录失败'
};

// 手机号脱敏：138****5678
function maskPhone(p) {
  if (!p || p.length < 7) return p || '';
  return p.substr(0, 3) + '****' + p.substr(p.length - 4);
}

// 内置默认管理员手机号（与其他管理云函数保持一致）
const DEFAULT_ADMIN_PHONES = ['19817793985'];

// 管理员手机号白名单（环境变量优先）
function getAdminPhones() {
  const raw = process.env.ADMIN_PHONES || '';
  const list = raw.split(',').map(s => s.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_ADMIN_PHONES;
}

// 管理员手机号 → openid 列表（推送订阅消息需要 openid）
async function getAdminOpenids(db) {
  const phones = getAdminPhones();
  if (!phones.length) return [];
  const _ = db.command;
  const res = await db.collection('users')
    .where({ phoneNumber: _.in(phones) })
    .field({ openid: true })
    .get();
  return (res.data || []).map(u => u.openid).filter(Boolean);
}

// 订阅消息字段值安全处理（微信限制：thing 20 字符、time 等格式严格，超长截断）
function safeThing(v, max) {
  const s = String(v || '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s·（）()]/g, '');
  return s.length > (max || 20) ? s.substr(0, (max || 20)) : (s || '-');
}

// 内置订阅消息模板 ID（「用户加入申请通知」，字段：姓名/电话/时间）
// 环境变量 SUBSCRIBE_TEMPLATE_ID 配置时优先用环境变量，否则用这个内置值
const DEFAULT_TEMPLATE_ID = 'FAeMzEMf8h5QNn3pumyjXVgMdOJ7VOFDlTUHSbxL__Q';

// 给所有管理员推送订阅消息（新用户注册）
// 模板「用户加入申请通知」字段（与 MP 后台模板字段名严格对应）：
//   name1  = 姓名（用户昵称，thing 类，≤20 字符）
//   phone2 = 电话（用户手机号，完整号）
//   time3  = 时间（注册时间，格式 YYYY-MM-DD HH:mm）
async function pushSubscribeToAdmins(db, data, nowText) {
  const templateId = process.env.SUBSCRIBE_TEMPLATE_ID || DEFAULT_TEMPLATE_ID;
  const admins = await getAdminOpenids(db);
  if (!templateId || !admins.length) return { pushed: 0, skipped: '未配置模板ID或管理员未登录过小程序' };

  const name = safeThing(data.nickName || '新用户', 20);
  const phone = data.phoneNumber || '-';

  const results = await Promise.all(admins.map(openid =>
    cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId: templateId,
      // 点击通知后进入管理后台页
      page: 'pages/admin/index',
      data: {
        name1: { value: name },
        phone2: { value: phone },
        time3: { value: nowText }
      },
      miniprogramState: 'formal' // 正式版；体验版用 trial
    }).then(() => ({ openid, ok: true }))
      .catch(err => {
        // 常见失败：43101 用户未订阅/订阅次数用完（订阅消息是一次性的，用户点一次"允许"才能推一条）
        console.warn('[notify-admin] 订阅消息推送失败', openid, err.errCode || err.errMsg);
        return { openid, ok: false, err: err.errCode };
      })
  ));
  return { pushed: results.filter(r => r.ok).length, total: admins.length };
}

exports.main = async (event = {}) => {
  try {
    const wxContext = cloud.getWXContext();
    const type = event.type || '';
    const data = event.data || {};

    if (!TYPE_TITLE[type]) {
      return { success: false, errno: 40000, errMsg: '未知通知类型' };
    }

    const roleText = data.role === 'parent' ? '家长' : '学生';
    let content = '';
    if (type === 'register') {
      content = (data.nickName || '新用户') + '（' + roleText + ' · ' + (data.grade || '') +
        ' · ' + maskPhone(data.phoneNumber) + '）完成注册';
    } else if (type === 'sync_fail') {
      content = (data.nickName || '用户') + '（' + maskPhone(data.phoneNumber) +
        '）资料云同步失败：' + (data.reason || '未知原因');
    } else if (type === 'login_fail') {
      content = '手机号获取失败：' + (data.reason || '未知原因');
    }

    // 1. 写入通知集合（留痕）
    const db = cloud.database();
    const now = new Date();
    const pad = n => (n < 10 ? '0' + n : '' + n);
    const nowText = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
      ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
    await db.collection('admin_notifications').add({
      data: {
        type,
        title: TYPE_TITLE[type],
        content,
        fromOpenid: wxContext.OPENID || '',
        read: false,
        createdAt: db.serverDate()
      }
    });

    // 2. 新用户注册 → 推订阅消息给管理员（失败不影响主流程）
    let pushResult = { pushed: 0 };
    if (type === 'register') {
      try {
        pushResult = await pushSubscribeToAdmins(db, data, nowText);
      } catch (e) {
        console.warn('[notify-admin] 订阅消息推送异常（静默）', e.message || e);
      }
    }

    return { success: true, pushed: pushResult.pushed || 0 };
  } catch (err) {
    console.error('notify-admin 云函数异常:', err);
    return { success: false, errno: 50001, errMsg: err.errMsg || err.message || '通知写入失败' };
  }
};

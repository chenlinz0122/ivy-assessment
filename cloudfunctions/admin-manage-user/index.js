// 云函数：admin-manage-user
// 管理后台用户管理：封禁 / 解封 / 删除 用户（管理员【手机号】白名单鉴权）
//
// 鉴权方式（与 get-admin-user-list 一致）：
//   当前调用者的 openid → 查 users 表拿到手机号 → 在白名单内才放行
//   白名单：环境变量 ADMIN_PHONES（多个英文逗号分隔），
//           未配置时使用下方 DEFAULT_ADMIN_PHONES 内置手机号
//
// 入参：
//   { action: 'ban',    openid, reason? }  → 封禁：users 文档加 banned=true + banReason
//   { action: 'unban',  openid }           → 解封：banned=false
//   { action: 'delete', openid }           → 删除：删除 users 文档（不可恢复，前端有二次确认）
// 返回：
//   { success:true, action } / { success:false, errno, errMsg }
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 内置默认管理员手机号（与 get-admin-user-list 保持一致）
const DEFAULT_ADMIN_PHONES = ['19817793985'];

function getAdminPhones() {
  const raw = process.env.ADMIN_PHONES || '';
  const list = raw.split(',').map(s => s.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_ADMIN_PHONES;
}

// 管理员校验：返回 { isAdmin, phone } （phone 用于操作日志）
async function checkIsAdmin(db, openid) {
  if (!openid) return { isAdmin: false };
  const exist = await db.collection('users').where({ openid }).limit(1)
    .field({ phoneNumber: true }).get();
  if (!exist.data || !exist.data.length) return { isAdmin: false };
  const phone = exist.data[0].phoneNumber || '';
  return { isAdmin: getAdminPhones().indexOf(phone) >= 0, phone };
}

exports.main = async (event = {}) => {
  try {
    const wxContext = cloud.getWXContext();
    const adminOpenid = wxContext.OPENID || '';
    const db = cloud.database();
    const users = db.collection('users');

    // 鉴权
    const admin = await checkIsAdmin(db, adminOpenid);
    if (!admin.isAdmin) {
      return { success: false, errno: 403, errMsg: '无管理员权限' };
    }

    const action = event.action || '';
    const targetOpenid = event.openid || '';
    if (!targetOpenid) {
      return { success: false, errno: 40000, errMsg: '缺少目标用户 openid' };
    }
    if (['ban', 'unban', 'delete'].indexOf(action) < 0) {
      return { success: false, errno: 40001, errMsg: '未知操作类型（支持 ban/unban/delete）' };
    }

    // 防止管理员误操作自己
    if (targetOpenid === adminOpenid && action !== 'unban') {
      return { success: false, errno: 40002, errMsg: '不能对自己执行该操作' };
    }

    const exist = await users.where({ openid: targetOpenid }).limit(1).get();
    if (!exist.data || !exist.data.length) {
      return { success: false, errno: 40400, errMsg: '用户不存在' };
    }
    const docId = exist.data[0]._id;
    const targetPhone = exist.data[0].phoneNumber || '';

    if (action === 'ban') {
      await users.doc(docId).update({
        data: {
          banned: true,
          banReason: (event.reason || '').trim() || '管理员封禁',
          bannedAt: db.serverDate(),
          bannedBy: admin.phone || adminOpenid
        }
      });
    } else if (action === 'unban') {
      await users.doc(docId).update({
        data: {
          banned: false,
          banReason: '',
          bannedAt: null,
          bannedBy: ''
        }
      });
    } else if (action === 'delete') {
      await users.doc(docId).remove();
    }

    console.log('[admin-manage-user]', action, '目标:', targetPhone || targetOpenid, '操作人:', admin.phone || adminOpenid);
    return { success: true, action };
  } catch (err) {
    console.error('admin-manage-user 云函数异常:', err);
    return { success: false, errno: 50001, errMsg: err.errMsg || err.message || '操作失败' };
  }
};


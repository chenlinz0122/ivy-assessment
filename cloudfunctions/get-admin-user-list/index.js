// 云函数：get-admin-user-list
// 管理后台专用：拉取 users 集合全部用户（含手机号/身份/年级/封禁状态），供「管理后台」页展示
//
// 安全说明（重要）：
//   - 鉴权方式：管理员【手机号】白名单。当前调用者的 openid → 查 users 表拿到手机号
//     → 在白名单内才放行，非管理员调用一律返回 403
//   - 白名单配置（两种方式，任选，代码内置默认值兜底）：
//       ① 云函数环境变量：云开发控制台 → 云函数 → get-admin-user-list → 配置 → 环境变量
//          ADMIN_PHONES=19817793985,13900002222（多个英文逗号分隔）
//       ② 不配置环境变量时，使用下方 DEFAULT_ADMIN_PHONES 内置手机号
//   - 新增管理员：把对方手机号加进环境变量（或改 DEFAULT_ADMIN_PHONES 重新部署）即可，
//     对方只要用手机号在小程序登录过一次就会被识别为管理员
//
// 入参：
//   { keyword }  → 可选，按手机号或昵称模糊搜索
//   {}           → 返回全部用户（按最后登录时间倒序，上限 500 条）
// 返回：
//   { success:true, total, users:[...] } / { success:false, errno, errMsg }
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 内置默认管理员手机号（环境变量 ADMIN_PHONES 未配置时生效）
const DEFAULT_ADMIN_PHONES = ['19817793985'];

// 读取白名单（环境变量优先，否则用内置默认值）
function getAdminPhones() {
  const raw = process.env.ADMIN_PHONES || '';
  const list = raw.split(',').map(s => s.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_ADMIN_PHONES;
}

// 管理员校验：当前 openid 绑定的手机号是否在白名单内
async function checkIsAdmin(db, openid) {
  if (!openid) return false;
  const exist = await db.collection('users').where({ openid }).limit(1)
    .field({ phoneNumber: true }).get();
  if (!exist.data || !exist.data.length) return false;
  const phone = exist.data[0].phoneNumber || '';
  return getAdminPhones().indexOf(phone) >= 0;
}

exports.main = async (event = {}) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID || '';
    const db = cloud.database();

    // 鉴权：非管理员直接拒绝
    if (!(await checkIsAdmin(db, openid))) {
      return { success: false, errno: 403, errMsg: '无管理员权限' };
    }

    const _ = db.command;
    const users = db.collection('users');

    const keyword = (event.keyword || '').trim();
    let where = {};
    if (keyword) {
      where = _.or([
        { phoneNumber: db.RegExp({ regexp: keyword, options: 'i' }) },
        { nickName: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]);
    }

    const countRes = await users.where(where).count();
    const total = countRes.total || 0;

    const MAX_BATCH = 5;
    const tasks = [];
    for (let i = 0; i < Math.min(Math.ceil(total / 100), MAX_BATCH); i++) {
      tasks.push(
        users.where(where)
          .orderBy('lastLoginTime', 'desc')
          .skip(i * 100)
          .limit(100)
          .field({
            openid: true, phoneNumber: true, nickName: true, avatarUrl: true,
            grade: true, role: true, subjectCombo: true, points: true,
            banned: true, banReason: true,
            createTime: true, lastLoginTime: true
          })
          .get()
      );
    }
    const results = await Promise.all(tasks);
    const list = results.reduce((acc, r) => acc.concat(r.data || []), []);

    return {
      success: true,
      total,
      users: list.map(u => ({
        openid: u.openid || '',
        phoneNumber: u.phoneNumber || '',
        nickName: u.nickName || '',
        avatarUrl: u.avatarUrl || '',
        grade: u.grade || '',
        role: u.role || '',
        subjectCombo: u.subjectCombo || '',
        points: u.points || 0,
        banned: !!u.banned,
        banReason: u.banReason || '',
        createTime: u.createTime || '',
        lastLoginTime: u.lastLoginTime || ''
      }))
    };
  } catch (err) {
    console.error('get-admin-user-list 云函数异常:', err);
    return { success: false, errno: 50001, errMsg: err.errMsg || err.message || '查询失败' };
  }
};


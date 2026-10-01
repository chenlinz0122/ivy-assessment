// utils/store.js - 本地数据存储管理（模拟云数据库，后续可替换为云开发）
// 数据表：users / records / points / posts

const KEY_USER = 'db_users';
const KEY_RECORDS = 'db_records';
const KEY_POINTS = 'db_points';
const KEY_POSTS = 'db_posts';
const KEY_CURRENT = 'current_uid';
const KEY_PARTICIPANTS = 'db_participants'; // 测评参与次数累加表（按 assessId）
const KEY_CHECKINS = 'db_checkins';          // 学习打卡记录表

// 读取整张表
function readTable(key) {
  return wx.getStorageSync(key) || [];
}

// 写入整张表
function writeTable(key, list) {
  wx.setStorageSync(key, list);
}

// ---------- 用户表 ----------
// 获取当前登录用户
function getCurrentUser() {
  const uid = wx.getStorageSync(KEY_CURRENT);
  if (!uid) return null;
  const users = readTable(KEY_USER);
  return users.find(u => u._id === uid) || null;
}

// 保存/更新当前用户
function saveCurrentUser(user) {
  const users = readTable(KEY_USER);
  const idx = users.findIndex(u => u._id === user._id);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  writeTable(KEY_USER, users);
  wx.setStorageSync(KEY_CURRENT, user._id);
}

// 通过手机号查找用户
function findUserByPhone(phone) {
  const users = readTable(KEY_USER);
  return users.find(u => u.phone === phone) || null;
}

// 创建新用户
function createUser(info) {
  const user = {
    _id: 'u_' + Date.now(),
    openid: info.openid || '',           // 微信唯一标识
    phone: info.phone || '',             // 手机号（兼容旧字段）
    phoneNumber: info.phoneNumber || '', // 手机号（新字段，与云数据库一致）
    nickName: info.nickName || '常青藤同学',
    avatar: info.avatar || '',           // 头像（兼容旧字段）
    avatarUrl: info.avatarUrl || '',     // 头像URL（新字段，与云数据库一致）
    grade: info.grade || '高一',
    role: info.role || 'student',        // 身份：student 学生 / parent 家长
    subjectCombo: info.subjectCombo || '', // 选科组合
    points: 0,
    createTime: new Date().toISOString(),
    lastLoginTime: new Date().toISOString(), // 最后登录时间
    loginIP: info.loginIP || '',             // 登录IP（可选）
    createdAt: new Date().toISOString()       // 兼容旧字段
  };
  saveCurrentUser(user);
  return user;
}

// 退出登录（清除当前会话）
function clearCurrent() {
  wx.removeStorageSync(KEY_CURRENT);
}

// ---------- 云数据库用户表 ----------
// 获取云数据库实例（安全获取，云开发未初始化时返回 null）
function getCloudDb() {
  if (!wx.cloud || !wx.cloud.database) return null;
  try {
    return wx.cloud.database();
  } catch (e) {
    return null;
  }
}

// 云端：按 openid 查询用户信息（用于登录态恢复，参考 boilerplate get-user-info 流程）
async function getUserCloud() {
  if (!wx.cloud || !wx.cloud.callFunction) return null;
  try {
    const res = await wx.cloud.callFunction({
      name: 'get-user-info',
      data: {}
    });
    const r = res && res.result;
    if (r && r.success && r.user) return r.user;
    return null;
  } catch (e) {
    console.warn('[getUserCloud] 查询云端用户失败', e.message || e);
    return null;
  }
}

// 云端：注销账号，删除云端个人数据（参考 boilerplate delete-user-info）
async function deleteUserCloud() {
  if (!wx.cloud || !wx.cloud.callFunction) {
    return { success: false, errMsg: '云开发不可用' };
  }
  try {
    const res = await wx.cloud.callFunction({
      name: 'delete-user-info',
      data: {}
    });
    const r = res && res.result;
    if (r && r.success) {
      return { success: true, deleted: r.deleted };
    }
    return { success: false, errMsg: (r && r.errMsg) || '云端删除失败' };
  } catch (e) {
    console.warn('[deleteUserCloud] 注销失败', e.message || e);
    return { success: false, errMsg: e.message || '云函数调用失败' };
  }
}

// 云端：创建或更新用户（通过 openid 查询，存在则更新，不存在则创建）
async function createOrUpdateUserCloud(userInfo) {
  const db = getCloudDb();
  if (!db) {
    console.warn('云数据库未初始化，跳过云端保存');
    return null;
  }

  const usersCollection = db.collection('users');

  try {
    // 按 openid 查询是否已有该用户
    const { data } = await usersCollection.where({
      openid: userInfo.openid
    }).get();

    if (data.length > 0) {
      // 已有用户 —— 更新信息
      const existingUser = data[0];
      await usersCollection.doc(existingUser._id).update({
        data: {
          phoneNumber: userInfo.phoneNumber || existingUser.phoneNumber || '',
          nickName: userInfo.nickName || existingUser.nickName || '常青藤同学',
          avatarUrl: userInfo.avatarUrl || existingUser.avatarUrl || '',
          grade: userInfo.grade || existingUser.grade || '高一',
          role: userInfo.role || existingUser.role || 'student',
          subjectCombo: userInfo.subjectCombo || existingUser.subjectCombo || '',
          lastLoginTime: db.serverDate(),
          loginIP: userInfo.loginIP || ''
        }
      });
      return Object.assign({}, existingUser, {
        phoneNumber: userInfo.phoneNumber || existingUser.phoneNumber,
        nickName: userInfo.nickName || existingUser.nickName,
        avatarUrl: userInfo.avatarUrl || existingUser.avatarUrl,
        grade: userInfo.grade || existingUser.grade,
        role: userInfo.role || existingUser.role || 'student',
        subjectCombo: userInfo.subjectCombo || existingUser.subjectCombo,
        lastLoginTime: new Date().toISOString()
      });
    } else {
      // 新用户 —— 创建记录
      const addRes = await usersCollection.add({
        data: {
          openid: userInfo.openid,
          phoneNumber: userInfo.phoneNumber || '',
          nickName: userInfo.nickName || '常青藤同学',
          avatarUrl: userInfo.avatarUrl || '',
          grade: userInfo.grade || '高一',
          role: userInfo.role || 'student',
          subjectCombo: userInfo.subjectCombo || '',
          points: 0,
          createTime: db.serverDate(),
          lastLoginTime: db.serverDate(),
          loginIP: userInfo.loginIP || ''
        }
      });
      return Object.assign({ _id: addRes._id }, userInfo);
    }
  } catch (err) {
    console.error('云数据库操作失败:', err);
    return null;
  }
}

// 云端：获取所有用户列表（管理后台用）
async function getAllUsersCloud() {
  const db = getCloudDb();
  if (!db) return [];
  try {
    const { data } = await db.collection('users').get();
    return data;
  } catch (err) {
    console.error('获取用户列表失败:', err);
    return [];
  }
}

// 云端：上传头像到云存储，返回 fileID
async function uploadAvatarCloud(openid, filePath) {
  if (!wx.cloud || !wx.cloud.uploadFile) return '';
  try {
    const res = await wx.cloud.uploadFile({
      cloudPath: 'avatars/' + openid + '_' + Date.now() + '.png',
      filePath: filePath
    });
    return res.fileID;
  } catch (err) {
    console.error('头像上传失败:', err);
    return '';
  }
}

// 云端：管理后台拉取用户列表（云函数 get-admin-user-list，openid 白名单鉴权）
async function getAdminUserList(keyword) {
  if (!wx.cloud || !wx.cloud.callFunction) {
    return { success: false, errMsg: '云开发不可用' };
  }
  try {
    const res = await wx.cloud.callFunction({
      name: 'get-admin-user-list',
      data: { keyword: keyword || '' }
    });
    const r = res && res.result;
    if (r && r.success) return { success: true, total: r.total || 0, users: r.users || [] };
    return { success: false, errMsg: (r && r.errMsg) || '查询失败' };
  } catch (e) {
    return { success: false, errMsg: e.message || '云函数调用失败（请先部署 get-admin-user-list）' };
  }
}

// 云端：管理后台用户管理（云函数 admin-manage-user，手机号白名单鉴权）
// action: 'ban' | 'unban' | 'delete'
async function adminManageUser(action, openid, reason) {
  if (!wx.cloud || !wx.cloud.callFunction) {
    return { success: false, errMsg: '云开发不可用' };
  }
  try {
    const res = await wx.cloud.callFunction({
      name: 'admin-manage-user',
      data: { action: action, openid: openid, reason: reason || '' }
    });
    const r = res && res.result;
    if (r && r.success) return { success: true };
    return { success: false, errMsg: (r && r.errMsg) || '操作失败' };
  } catch (e) {
    return { success: false, errMsg: e.message || '云函数调用失败（请先部署 admin-manage-user）' };
  }
}

// 云端：登录关键事件通知管理员（云函数 notify-admin，静默失败不影响主流程）
function notifyAdmin(type, data) {
  if (!wx.cloud || !wx.cloud.callFunction) return Promise.resolve();
  return wx.cloud.callFunction({
    name: 'notify-admin',
    data: { type: type, data: data || {} }
  }).catch(err => console.warn('[notifyAdmin] 失败（静默）', err.message || err));
}

// ---------- 测评记录表 ----------
// 添加一条测评记录
function addRecord(record) {
  const records = readTable(KEY_RECORDS);
  records.unshift(record); // 倒序：最新在前
  writeTable(KEY_RECORDS, records);
  // 同步累加该测评的参与次数
  if (record && record.assessType) {
    incParticipants(record.assessType);
  }
}

// ---------- 测评参与次数表 ----------
// 获取某测评的本地累计参与次数（每次完成测评 +1）
function getParticipants(assessId) {
  const map = readTable(KEY_PARTICIPANTS);
  const item = map.find(p => p.assessId === assessId);
  return item ? item.count : 0;
}

// 累加参与次数
function incParticipants(assessId) {
  const map = readTable(KEY_PARTICIPANTS);
  const idx = map.findIndex(p => p.assessId === assessId);
  if (idx >= 0) {
    map[idx].count = (map[idx].count || 0) + 1;
  } else {
    map.push({ assessId: assessId, count: 1 });
  }
  writeTable(KEY_PARTICIPANTS, map);
}

// ---------- 学习打卡记录表 ----------
// 获取所有打卡记录（按日期升序）
function getCheckins() {
  const list = readTable(KEY_CHECKINS);
  return list.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// 添加一条打卡记录（date 为 YYYY-MM-DD 字符串）
function addCheckin(date) {
  const list = readTable(KEY_CHECKINS);
  if (!list.find(c => c.date === date)) {
    list.push({ _id: 'ck_' + Date.now(), date, createdAt: new Date().toISOString() });
    writeTable(KEY_CHECKINS, list);
  }
}

// 判断今天是否已打卡
function hasCheckinToday() {
  const today = formatYmd(new Date());
  const list = readTable(KEY_CHECKINS);
  return !!list.find(c => c.date === today);
}

// 格式化为 YYYY-MM-DD
function formatYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

// 获取某用户的全部记录
function getRecords(uid) {
  const records = readTable(KEY_RECORDS);
  return records.filter(r => r.uid === uid);
}

// 删除一条记录
function deleteRecord(recordId) {
  let records = readTable(KEY_RECORDS);
  records = records.filter(r => r._id !== recordId);
  writeTable(KEY_RECORDS, records);
}

// 获取单条记录
function getRecord(recordId) {
  const records = readTable(KEY_RECORDS);
  return records.find(r => r._id === recordId) || null;
}

// ---------- 积分明细表 ----------
function addPointLog(uid, value, reason) {
  const logs = readTable(KEY_POINTS);
  logs.unshift({
    _id: 'p_' + Date.now(),
    uid,
    value,
    reason,
    time: new Date().toISOString()
  });
  writeTable(KEY_POINTS, logs);
}

function getPointLogs(uid) {
  const logs = readTable(KEY_POINTS);
  return logs.filter(l => l.uid === uid);
}

// 给用户加积分并写明细
function addPoints(uid, value, reason) {
  const users = readTable(KEY_USER);
  const idx = users.findIndex(u => u._id === uid);
  if (idx >= 0) {
    users[idx].points = (users[idx].points || 0) + value;
    writeTable(KEY_USER, users);
  }
  addPointLog(uid, value, reason);
}

// ---------- 社区帖子表 ----------
function getPosts() {
  return readTable(KEY_POSTS);
}

function addPost(post) {
  const posts = readTable(KEY_POSTS);
  posts.unshift(post);
  writeTable(KEY_POSTS, posts);
}

// 根据 _id 获取单条帖子
function getPost(postId) {
  const posts = readTable(KEY_POSTS);
  return posts.find(p => p._id === postId) || null;
}

// 更新单条帖子（用于点赞数、评论数同步等）
function updatePost(postId, updates) {
  const posts = readTable(KEY_POSTS);
  const idx = posts.findIndex(p => p._id === postId);
  if (idx >= 0) {
    posts[idx] = Object.assign({}, posts[idx], updates);
    writeTable(KEY_POSTS, posts);
    return posts[idx];
  }
  return null;
}

// ---------- 评论表 ----------
const KEY_COMMENTS = 'db_comments';

function getComments(postId) {
  const all = readTable(KEY_COMMENTS);
  return all.filter(c => c.postId === postId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function addComment(comment) {
  const all = readTable(KEY_COMMENTS);
  all.push(comment);
  writeTable(KEY_COMMENTS, all);
  // 帖子评论数 +1
  const post = getPost(comment.postId);
  if (post) {
    updatePost(comment.postId, { comments: (post.comments || 0) + 1 });
  }
}

// ---------- 徽章判定 ----------
// 根据 userId 计算已获得的徽章
function getBadges(uid) {
  const records = getRecords(uid);
  const completedTypes = records.map(r => r.assessType);
  const completedCount = records.length;
  // 分享次数（从积分明细中统计）
  const pointLogs = getPointLogs(uid);
  const shareCount = pointLogs.filter(l => l.reason === '分享报告').length;

  const badges = [
    {
      key: 'explorer', name: '探索者', icon: '🌱', desc: '完成1个测评',
      unlocked: completedCount >= 1,
      progress: Math.min(completedCount, 1) + '/1'
    },
    {
      key: 'planner', name: '规划师', icon: '🌟', desc: '完成5个测评',
      unlocked: completedCount >= 5,
      progress: Math.min(completedCount, 5) + '/5'
    },
    {
      key: 'master', name: '升学达人', icon: '💎', desc: '完成8个测评',
      unlocked: completedCount >= 8,
      progress: Math.min(completedCount, 8) + '/8'
    },
    {
      key: 'sharer', name: '分享达人', icon: '📤', desc: '分享5次报告',
      unlocked: shareCount >= 5,
      progress: Math.min(shareCount, 5) + '/5'
    },
    {
      key: 'selector', name: '选科通关', icon: '🎯', desc: '完成霍兰德+学科优势+多元智能',
      unlocked: ['holland', 'subject', 'multiIntelligence'].every(t => completedTypes.includes(t)),
      progress: ['holland', 'subject', 'multiIntelligence'].filter(t => completedTypes.includes(t)).length + '/3'
    }
  ];
  return badges;
}

module.exports = {
  getCurrentUser,
  saveCurrentUser,
  findUserByPhone,
  createUser,
  clearCurrent,
  createOrUpdateUserCloud,
  getUserCloud,
  deleteUserCloud,
  getAllUsersCloud,
  getAdminUserList,
  adminManageUser,
  notifyAdmin,
  uploadAvatarCloud,
  addRecord,
  getRecords,
  deleteRecord,
  getRecord,
  addPointLog,
  getPointLogs,
  addPoints,
  getPosts,
  addPost,
  getPost,
  updatePost,
  getComments,
  addComment,
  getBadges,
  getParticipants,
  incParticipants,
  getCheckins,
  addCheckin,
  hasCheckinToday
};

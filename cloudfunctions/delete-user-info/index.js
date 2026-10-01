// 云函数：delete-user-info
// 参考 jiji262/wechat-miniprogram-login-boilerplate 的 delete-user-info 云函数
// 功能：注销账号 —— 按当前用户 OPENID 删除 users / records / points 集合中的个人数据
// 返回：{ success, deleted, errMsg? }
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    if (!openid) {
      return { success: false, errMsg: '无法获取 openid' };
    }

    const db = cloud.database();
    const _ = db.command;
    const deleted = {};

    // 1. 删除用户资料
    try {
      const res = await db.collection('users').where({ openid }).remove();
      deleted.users = res.stats ? res.stats.removed : 0;
    } catch (e) {
      deleted.users = -1; // 集合可能不存在
    }

    // 2. 删除测评记录（如集合存在）
    try {
      const res = await db.collection('records').where({ openid }).remove();
      deleted.records = res.stats ? res.stats.removed : 0;
    } catch (e) {
      deleted.records = -1;
    }

    // 3. 删除积分流水（如集合存在）
    try {
      const res = await db.collection('points').where({ openid }).remove();
      deleted.points = res.stats ? res.stats.removed : 0;
    } catch (e) {
      deleted.points = -1;
    }

    return { success: true, deleted };
  } catch (err) {
    console.error('delete-user-info 云函数异常:', err);
    return {
      success: false,
      errMsg: err.errMsg || err.message || '删除用户信息失败'
    };
  }
};
// 云函数：get-user-info
// 参考 jiji262/wechat-miniprogram-login-boilerplate 的 get-user-info 云函数
// 功能：按当前用户的 OPENID 从 users 集合查询用户信息并返回
// 用途：小程序启动时恢复登录态（换设备/清缓存后仍能自动登录）
// 返回：{ success, user?, errMsg? }
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
    const result = await db.collection('users')
      .where({ openid })
      .limit(1)
      .get();

    if (result.data && result.data.length > 0) {
      const user = result.data[0];
      // 去掉敏感/无用字段（参考 boilerplate：session_key 不下发）
      delete user.session_key;
      return { success: true, user };
    }
    // 云端无该用户（未注册）
    return { success: true, user: null };
  } catch (err) {
    console.error('get-user-info 云函数异常:', err);
    return {
      success: false,
      errMsg: err.errMsg || err.message || '查询用户信息失败'
    };
  }
};
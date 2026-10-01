// 云函数：update-user-info
// 复刻 jiji262/wechat-miniprogram-login-boilerplate 同名云函数：
// 前端 getUserProfile / chooseAvatar+nickname 授权后，将用户资料写入 users 集合
// 返回：{ success, openid, errMsg? }
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    if (!openid) {
      return { success: false, errMsg: '无法获取 openid' };
    }
    const user = event.user || {};
    const db = cloud.database();
    const users = db.collection('users');

    const data = {
      openid: wxContext.OPENID,   // 必写：档案必须带唯一标识，否则后台无法区分用户
      nickName: user.nickName || '微信用户',
      avatarUrl: user.avatarUrl || '',
      gender: user.gender || 0,
      lastUpdateTime: new Date().toISOString()
    };

    const exist = await users.where({ openid: wxContext.OPENID }).limit(1).get();
    if (exist.data.length) {
      await users.doc(exist.data[0]._id).update({ data });
    } else {
      await users.add({
        data: Object.assign({}, data, {
          openid,
          session_key: '',
          phoneNumber: '',
          grade: '高一',
          createdAt: new Date().toISOString()
        })
      });
    }
    return { success: true, openid };
  } catch (err) {
    console.error('update-user-info 云函数异常:', err);
    return { success: false, errMsg: err.errMsg || err.message || '保存用户信息失败' };
  }
};
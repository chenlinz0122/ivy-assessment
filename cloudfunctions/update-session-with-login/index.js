// 云函数：update-session-with-login
// 复刻 jiji262/wechat-miniprogram-login-boilerplate 同名云函数：
// 前端传 wx.login 的 code → 调微信 code2Session 接口换取 openid + session_key
// → 按 openid 查 users 集合：有则更新会话，无则新增用户档案
// 返回：{ success, openid?, errMsg? }
//
// 部署前配置：将本目录下 config-sample.js 复制为 config.js 并填入
// appId / secret（也可在云函数环境变量中配置 appId / secret）
const cloud = require('wx-server-sdk');
const https = require('https');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 读取配置：优先环境变量，其次 config.js
function getConfig() {
  if (process.env.appId && process.env.secret) {
    return { appId: process.env.appId, secret: process.env.secret };
  }
  try {
    return require('./config.js');
  } catch (e) {
    return { appId: '', secret: '' };
  }
}

// 调用微信 code2Session 接口（原生 https，不引入额外依赖）
function code2Session(appId, secret, code) {
  const url = 'https://api.weixin.qq.com/sns/jscode2session'
    + '?appid=' + encodeURIComponent(appId)
    + '&secret=' + encodeURIComponent(secret)
    + '&js_code=' + encodeURIComponent(code)
    + '&grant_type=authorization_code';
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('code2Session 返回解析失败')); }
      });
    }).on('error', reject);
  });
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { appId, secret } = getConfig();

  const db = cloud.database();
  const users = db.collection('users');

  // 1. code2Session 换取 session_key（配置缺失时跳过，仅用云开发注入的 openid）
  let sessionInfo = {};
  if (event.code && appId && secret) {
    try {
      sessionInfo = await code2Session(appId, secret, event.code);
      if (sessionInfo.errcode) {
        console.error('code2Session 失败:', sessionInfo);
        return {
          success: false,
          errMsg: 'code2Session 失败: ' + sessionInfo.errmsg
        };
      }
    } catch (e) {
      console.error('code2Session 异常:', e);
      return { success: false, errMsg: 'code2Session 异常: ' + e.message };
    }
  }

  // 2. 按 openid 查用户：有数据则更新会话信息，无数据则新增用户档案
  try {
    const user = await users.where({ openid }).limit(1).get();
    const sessionData = {
      openid: openid || (sessionInfo.openid || ''),
      session_key: sessionInfo.session_key || '',
      lastLoginTime: new Date().toISOString()
    };
    if (user.data.length) {
      await users.doc(user.data[0]._id).update({ data: sessionData });
    } else {
      await users.add({
        data: Object.assign({}, sessionData, {
          nickName: '微信用户',
          avatarUrl: '',
          phoneNumber: '',
          grade: '高一',
          createdAt: new Date().toISOString()
        })
      });
    }
  } catch (e) {
    return { success: false, errMsg: e.message };
  }

  return {
    success: true,
    openid: openid || (sessionInfo.openid || ''),
    message: 'login success'
  };
};
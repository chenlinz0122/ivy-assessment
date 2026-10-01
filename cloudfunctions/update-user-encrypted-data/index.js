// 云函数：update-user-encrypted-data
// 复刻 jiji262/wechat-miniprogram-login-boilerplate 同名云函数：
// 前端 getPhoneNumber 得到的 encryptedData/iv → 用 users 表中保存的
// session_key 做 AES-128-CBC 解密 → 得到纯文本手机号并写回 users 集合
// 返回：{ success, phoneNumber?, errMsg? }
//
// 注意：微信 2023 年后已停止下发 encryptedData（只下发 code）。
// 本函数保留以完整兼容 boilerplate；前端 auth.js 检测到只有 code 时
// 会自动改走 getPhoneNumber 云函数（openapi 新方案）。
const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 微信官方解密算法（AES-128-CBC，Base64，PKCS7 去填充）
function decryptData(encryptedData, iv, sessionKey) {
  const sessionKeyBuf = Buffer.from(sessionKey, 'base64');
  const encryptedBuf = Buffer.from(encryptedData, 'base64');
  const ivBuf = Buffer.from(iv, 'base64');
  const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuf, ivBuf);
  // 自动处理 PKCS7 去填充
  decipher.setAutoPadding(true);
  let decoded = decipher.update(encryptedBuf, 'binary', 'utf8');
  decoded += decipher.final('utf8');
  return JSON.parse(decoded);
}

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    if (!openid) {
      return { success: false, errMsg: '无法获取 openid' };
    }
    if (!event.encryptedData || !event.iv) {
      return { success: false, errMsg: '缺少 encryptedData/iv' };
    }

    const db = cloud.database();
    const users = db.collection('users');

    // 取该用户的 session_key
    const exist = await users.where({ openid }).limit(1).get();
    if (!exist.data.length || !exist.data[0].session_key) {
      return { success: false, errMsg: '会话不存在或 session_key 缺失，请重新登录' };
    }

    let decoded;
    try {
      decoded = decryptData(event.encryptedData, event.iv, exist.data[0].session_key);
    } catch (e) {
      return { success: false, errMsg: '解密失败，session_key 可能已过期，请重新登录' };
    }

    const phoneNumber = decoded && decoded.phoneNumber
      ? decoded.phoneNumber
      : (decoded.purePhoneNumber || '');

    if (!phoneNumber) {
      return { success: false, errMsg: '解密结果中无手机号' };
    }

    // 写回 users 集合
    await users.doc(exist.data[0]._id).update({
      data: { phoneNumber, lastUpdateTime: new Date().toISOString() }
    });

    return { success: true, phoneNumber };
  } catch (err) {
    console.error('update-user-encrypted-data 云函数异常:', err);
    return { success: false, errMsg: err.errMsg || err.message || '解密手机号失败' };
  }
};
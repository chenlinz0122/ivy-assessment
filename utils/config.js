// utils/config.js - 登录配置（参考 boilerplate 的 config-sample.js）
// 使用说明：
//   1. 登录微信公众平台（mp.weixin.qq.com）→ 开发管理 → 开发设置
//   2. 复制 AppID 填到 appId
//   3. 复制 AppSecret 填到 secret（仅存于云函数侧使用，勿泄露、勿提交到公开仓库）
//   4. 云函数 update-session-with-login 的 code2Session 也需要同一组值，
//      请复制 cloudfunctions/update-session-with-login/config-sample.js 为
//      config.js 并填入相同内容
module.exports = {
  appId: '',      // ← 填入你的小程序 AppID
  secret: ''      // ← 填入你的小程序 AppSecret
};
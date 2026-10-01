// utils/auth.js - 登录授权工具库
// 完整复刻 jiji262/wechat-miniprogram-login-boilerplate 的 auth.js 架构：
//   getUserInfo            启动时按 openid 从云端拉取用户信息，恢复登录态
//   updateSessionWithLogin wx.login -> 云函数 code2Session，云端保存 session_key
//   updateUserInfo         写入昵称/头像到云端（旧版资料授权回调的结果，已不在登录链路中使用）
//   updatePhoneNumber      getPhoneNumber 的 encryptedData/iv 云端解密写入
//   deleteUserInfo         注销账号，删除云端数据
// 注：微信平台限制，旧版资料授权与 encryptedData 已被官方收回，
//     各函数内置了新 API（chooseAvatar/nickname/code 换手机号）自动兜底。

let auth = {
  // 根据 openid 获取数据库中相关用户信息；无档案则自动走登录流程建档
  getUserInfo: async function (cb) {
    try {
      const resp = await wx.cloud.callFunction({
        name: 'get-user-info',
        data: {}
      });
      const r = resp && resp.result;
      const user = r && r.success ? r.user : null;
      if (user) {
        this.updateLocalUserInfo(user);
        typeof cb === 'function' && cb(user);
      } else {
        // 云端无档案 → 强制走 wx.login 建立会话并新增用户
        await this.updateSessionWithLogin();
      }
      return user;
    } catch (e) {
      console.warn('[auth.getUserInfo] 失败（云开发可能未部署）', e.message || e);
      return null;
    }
  },

  // 保存云端用户信息到本地 storage（与 boilerplate 相同的标志位）
  updateLocalUserInfo: function (userInfo = {}) {
    // 去掉敏感信息 session_key，绝不下发到前端
    if (Object.prototype.hasOwnProperty.call(userInfo, 'session_key')) {
      delete userInfo.session_key;
    }
    try {
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('isValidSession', !!userInfo.openid);
      wx.setStorageSync('hasUserInfo', !!userInfo.nickName);
      wx.setStorageSync('hasPhoneNumber', !!userInfo.phoneNumber);
    } catch (e) {}
  },

  // 清空本地 storage
  clearLocalStorage: function () {
    try { wx.clearStorageSync(); } catch (e) {}
  },

  // wx.login 获取 code → 云函数 code2Session 保存 session_key → 重新拉取用户
  updateSessionWithLogin: async function (cb) {
    wx.login({
      success: async (res) => {
        try {
          await wx.cloud.callFunction({
            name: 'update-session-with-login',
            data: { code: res.code }
          });
        } catch (e) {
          console.warn('[auth.updateSessionWithLogin] 失败', e.message || e);
        }
        await this.getUserInfo(cb);
      }
    });
  },

  // 用户授权后更新用户信息到云端（detail 格式与 boilerplate 一致：{ userInfo: {...} }）
  updateUserInfo: async function (detail, callback) {
    const info = detail && (detail.userInfo || detail);
    if (!info || (!info.nickName && !info.avatarUrl)) {
      wx.showModal({
        title: '警告',
        content: '您拒绝了授权，将无法使用完整功能，请授权之后再进入!',
        showCancel: false,
        confirmText: '返回授权'
      });
      return null;
    }
    wx.showLoading({ title: '正在获取...' });
    try {
      const result = await wx.cloud.callFunction({
        name: 'update-user-info',
        data: { user: info }
      });
      const r = result && result.result;
      if (r && r.success) {
        const local = wx.getStorageSync('userInfo') || {};
        const merged = Object.assign({}, local, {
          nickName: info.nickName || local.nickName,
          avatarUrl: info.avatarUrl || local.avatarUrl,
          openid: r.openid || local.openid
        });
        this.updateLocalUserInfo(merged);
        wx.hideLoading();
        await this.getUserInfo();
        typeof callback === 'function' && callback(merged);
        return merged;
      }
      wx.hideLoading();
      wx.showToast({ title: (r && r.errMsg) || '保存失败', icon: 'none' });
      return null;
    } catch (e) {
      wx.hideLoading();
      console.warn('[auth.updateUserInfo] 失败', e.message || e);
      wx.showToast({ title: '云服务异常，信息已暂存本地', icon: 'none' });
      const local = wx.getStorageSync('userInfo') || {};
      const merged = Object.assign({}, local, {
        nickName: info.nickName || local.nickName,
        avatarUrl: info.avatarUrl || local.avatarUrl
      });
      this.updateLocalUserInfo(merged);
      typeof callback === 'function' && callback(merged);
      return merged;
    }
  }
};

// 获取手机号：主路径 = 新版 e.detail.code（button open-type="getPhoneNumber" 回调）
// encryptedData/iv 为旧版方案，微信 2023 起已停止下发，仅在极老客户端无 code 时兜底
// （旧版本微信的 e.detail.encryptedData 路径已作废，仅保留兜底分支）
auth.updatePhoneNumber = async function (e, callback) {
  const detail = e && e.detail;
  if (!detail) return null;

  // 用户点了拒绝
  if (detail.errMsg && detail.errMsg.indexOf('ok') < 0 && !detail.code) {
    wx.showToast({ title: '您取消了手机号授权', icon: 'none' });
    return null;
  }

  wx.showLoading({ title: '正在获取...' });
  try {
    let phoneNumber = '';
    if (!detail.code && detail.encryptedData && detail.iv) {
      // 极老客户端兜底：encryptedData + iv + session_key 解密（已不推荐）
      const result = await wx.cloud.callFunction({
        name: 'update-user-encrypted-data',
        data: {
          encryptedData: detail.encryptedData,
          iv: detail.iv
        }
      });
      const r = result && result.result;
      if (r && r.success && r.phoneNumber) {
        phoneNumber = r.phoneNumber;
      }
    }
    if (!phoneNumber && detail.code) {
      // 主路径：新版 e.detail.code 换手机号（唯一在用的正式方式）
      const result = await wx.cloud.callFunction({
        name: 'getPhoneNumber',
        data: { code: detail.code }
      });
      const r = result && result.result;
      if (r && r.success && r.phoneNumber) {
        phoneNumber = r.phoneNumber;
      }
    }

    wx.hideLoading();
    if (phoneNumber) {
      const local = wx.getStorageSync('userInfo') || {};
      const merged = Object.assign({}, local, { phoneNumber });
      this.updateLocalUserInfo(merged);
      await this.getUserInfo();
      typeof callback === 'function' && callback(merged);
      return merged;
    }

    // 企业主体小程序失败必有错误码，弹窗展示便于定位（对照官方文档排查）
    const diag = [];
    if (!detail.code && !detail.encryptedData) {
      diag.push('未拿到 code/encryptedData');
    }
    if (detail.errno) {
      const errnoMap = {
        1400001: '手机号组件次数已达上限（1000次免费额度用完，需在 MP 后台购买资源包）',
        1400002: '非法的 code（可能已被使用或过期，code 有效期5分钟且只能用一次）',
        104: '用户未同意隐私协议（需在 MP 后台「用户隐私保护指引」声明收集手机号）',
        112: '隐私接口未声明（MP 后台 → 设置 → 服务内容声明 → 勾选「手机号」）',
        40004: '用户拒绝了授权'
      };
      diag.push('errno=' + detail.errno + (errnoMap[detail.errno] ? '：' + errnoMap[detail.errno] : '：未知错误'));
    }
    if (detail.errMsg) diag.push(detail.errMsg);
    console.warn('[手机号获取失败] e.detail =', detail);
    wx.showModal({
      title: '获取手机号失败',
      content: diag.join('\n') || '云函数返回异常，请确认 getPhoneNumber 云函数已部署，并查看云开发控制台日志',
      showCancel: false,
      confirmText: '知道了'
    });
    return null;
  } catch (err) {
    wx.hideLoading();
    console.warn('[auth.updatePhoneNumber] 失败', err.message || err);
    wx.showModal({
      title: '获取手机号失败',
      content: '云函数调用异常：' + (err.message || err) + '\n请确认 getPhoneNumber 云函数已上传部署（云端安装依赖）',
      showCancel: false,
      confirmText: '知道了'
    });
    return null;
  }
};

// 注销账号：删除云端数据并清空本地
auth.deleteUserInfo = async function (cb) {
  wx.showLoading({ title: '正在删除...' });
  try {
    await wx.cloud.callFunction({ name: 'delete-user-info', data: {} });
    auth.clearLocalStorage();
    typeof cb === 'function' && cb();
    wx.hideLoading();
    wx.showToast({ title: '删除成功', icon: 'none' });
  } catch (e) {
    wx.hideLoading();
    wx.showToast({ title: '删除失败', icon: 'none' });
  }
};

module.exports = auth;
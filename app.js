// app.js - 常青藤在线测评 全局逻辑
App({
  // 全局数据
  globalData: {
    // 用户信息（登录后填充）
    userInfo: null,
    // 是否已登录
    isLogin: false,
    // 云环境ID —— 请在微信开发者工具-云开发控制台中创建环境后替换为此ID
    cloudEnv: 'cloud1-d1gqdmwjz60ab98a0',
    // 主题色
    themeColor: '#2E8B57',
    // 年级选项
    gradeOptions: ['高一', '高二', '高三'],
    // 隐私协议是否已同意
    privacyAgreed: false
  },

  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: this.globalData.cloudEnv,
        traceUser: true
      });
    }

    // 隐私协议检查（2023年9月后微信要求）
    this.checkPrivacySetting();

    // 从本地缓存恢复登录态
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      this.globalData.isLogin = true;
    }

    // 注意：不做云端自动登录——注销/退出后必须由用户重新点击「授权登录」
    // （云档案仍保留，仅用于管理员后台查看）

    // 检查更新
    this.checkUpdate();
  },

  // 云端恢复登录态：本地未登录但云端有档案 → 自动登录；本地已登录 → 忽略
  async restoreLoginFromCloud() {
    if (!wx.cloud || !wx.cloud.callFunction) return;
    try {
      const cloudUser = await require('./utils/store.js').getUserCloud();
      if (!cloudUser) return; // 云端无档案（未注册或已注销）

      if (this.globalData.isLogin) {
        // 本地已登录，无需恢复
        return;
      }
      // 用云端档案重建本地会话
      const store = require('./utils/store.js');
      let localUser = cloudUser.phoneNumber
        ? store.findUserByPhone(cloudUser.phoneNumber)
        : null;
      if (localUser) {
        // 同步云端最新资料到本地
        localUser.nickName = cloudUser.nickName || localUser.nickName;
        localUser.avatarUrl = cloudUser.avatarUrl || localUser.avatarUrl;
        localUser.avatar = localUser.avatarUrl;
        localUser.grade = cloudUser.grade || localUser.grade;
        localUser.openid = cloudUser.openid || localUser.openid;
        store.saveCurrentUser(localUser);
      } else {
        localUser = store.createUser({
          openid: cloudUser.openid || '',
          phoneNumber: cloudUser.phoneNumber || '',
          nickName: cloudUser.nickName || '常青藤同学',
          avatarUrl: cloudUser.avatarUrl || '',
          avatar: cloudUser.avatarUrl || '',
          grade: cloudUser.grade || '高一'
        });
      }
      this.setUserInfo(localUser); // 内部会广播 loginChanged
      console.log('[登录态恢复] 已从云端恢复用户:', localUser.nickName);
    } catch (e) {
      console.warn('[登录态恢复] 失败（不影响本地使用）', e.message || e);
    }
  },

  // 隐私协议检查：采用官方隐私弹窗兜底（app.json 已配置 __usePrivacyCheck__: true）
  // 依据《小程序隐私协议开发指南》：开发者未通过 onNeedPrivacyAuthorization
  // 响应授权事件时，微信将自动弹出官方隐私授权弹窗，合规且免维护。
  checkPrivacySetting() {
    if (!wx.getPrivacySetting) return;
    wx.getPrivacySetting({
      success: (res) => {
        if (res.needAuthorization) {
          // 需要用户授权：交给官方隐私弹窗处理（调用隐私接口时自动弹出）
          this.globalData.privacyAgreed = false;
        } else {
          // 用户已授权
          this.globalData.privacyAgreed = true;
        }
      }
    });
  },

  // 检查小程序版本更新
  checkUpdate() {
    if (wx.getUpdateManager) {
      const updateManager = wx.getUpdateManager();
      updateManager.onCheckForUpdate(() => {});
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已就绪，是否重启应用？',
          success(res) {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });
    }
  },

  // 设置用户信息并持久化
  setUserInfo(info) {
    this.globalData.userInfo = info;
    this.globalData.isLogin = true;
    wx.setStorageSync('userInfo', info);
    // 广播登录状态变更事件
    require('./utils/notificationCenter.js').publish(
      'loginChanged',
      info
    );
  },

  // 退出登录
  logout() {
    this.globalData.userInfo = null;
    this.globalData.isLogin = false;
    wx.removeStorageSync('userInfo');
    // 同时清除本地用户会话
    const store = require('./utils/store.js');
    store.clearCurrent();
    // 广播登录状态变更事件
    require('./utils/notificationCenter.js').publish('loginChanged', null);
  },

  // 获取用户信息（未登录返回 null）
  getUserInfo() {
    return this.globalData.userInfo;
  },

  // 检查登录态，未登录则跳转登录页
  checkLogin(redirect) {
    if (!this.globalData.isLogin) {
      wx.navigateTo({
        url: '/pages/login/index?redirect=' + encodeURIComponent(redirect || '')
      });
      return false;
    }
    return true;
  }
});

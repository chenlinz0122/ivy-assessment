// pages/user/index.js - 个人中心（tabBar 页）
const app = getApp();
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');

Page({
  data: {
    user: null,            // 当前登录用户
    isLoggedIn: false,     // 登录态
    recordCount: 0,        // 已完成测评数
    level: {},             // 等级信息 {level,name,icon}
    showEdit: false,       // 是否显示编辑弹层
    editForm: {
      nickName: '',
      gradeIndex: 0,
      subjectCombo: ''
    },
    gradeOptions: ['高一', '高二', '高三']
  },

  // tabBar 页每次展示都刷新一次，保证登录/积分变化及时同步
  onShow() {
    this.refreshUser();
  },

  // 拉取最新用户信息并计算统计
  refreshUser() {
    const user = store.getCurrentUser();
    if (!user) {
      this.setData({ user: null, isLoggedIn: false, recordCount: 0, level: {} });
      return;
    }
    const records = store.getRecords(user._id);
    const level = util.getLevel(user.points || 0);
    this.setData({
      user,
      isLoggedIn: true,
      recordCount: records.length,
      level
    });
  },

  // 未登录 → 跳转登录页
  goLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },

  // 打开编辑弹层，回填当前资料
  openEdit() {
    const u = this.data.user || {};
    const gradeOptions = this.data.gradeOptions;
    let gradeIndex = gradeOptions.indexOf(u.grade);
    if (gradeIndex < 0) gradeIndex = 0;
    this.setData({
      showEdit: true,
      editAvatarTempPath: '',
      editForm: {
        nickName: u.nickName || '',
        gradeIndex,
        subjectCombo: u.subjectCombo || '',
        previewAvatar: ''
      }
    });
  },

  closeEdit() {
    this.setData({ showEdit: false });
  },

  // 阻止弹层内容区点击冒泡关闭
  stopPropagation() {},

  onNickInput(e) {
    this.setData({ 'editForm.nickName': e.detail.value });
  },

  onSubjectInput(e) {
    this.setData({ 'editForm.subjectCombo': e.detail.value });
  },

  onGradeChange(e) {
    this.setData({ 'editForm.gradeIndex': e.detail.value });
  },

  // 保存个人资料（含头像上传到云存储 + 云数据库同步）
  saveProfile() {
    const u = this.data.user;
    if (!u) return;
    const nickName = (this.data.editForm.nickName || '').trim();
    if (!nickName) {
      util.toast('请输入昵称');
      return;
    }
    const grade = this.data.gradeOptions[this.data.editForm.gradeIndex];
    const subjectCombo = (this.data.editForm.subjectCombo || '').trim();

    const applyUpdate = (avatarFileID) => {
      const updated = Object.assign({}, u, {
        nickName,
        grade,
        subjectCombo,
        avatarUrl: avatarFileID || u.avatarUrl || '',
        avatar: avatarFileID || u.avatar || ''
      });
      store.saveCurrentUser(updated);
      app.setUserInfo(updated);
      this.setData({ showEdit: false });
      this.refreshUser();
      util.toast('保存成功', 'success');
      // 同步上传云数据库（年级/选科/昵称/头像）
      store.createOrUpdateUserCloud({
        openid: updated.openid || '',
        phoneNumber: updated.phoneNumber || '',
        nickName: updated.nickName,
        avatarUrl: updated.avatarUrl,
        grade: updated.grade,
        subjectCombo: updated.subjectCombo
      }).catch(err => console.warn('[云同步] 资料上传失败', err));
    };

    // 若用户换了头像（临时路径），先上传云存储换永久 fileID
    const tmp = this.data.editAvatarTempPath;
    if (tmp) {
      util.showLoading('保存中...');
      store.uploadAvatarCloud(u.openid || '', tmp)
        .then(fileID => {
          util.hideLoading();
          applyUpdate(fileID || tmp);
        })
        .catch(() => {
          util.hideLoading();
          applyUpdate(tmp); // 云存储失败降级用本地临时路径
        });
    } else {
      applyUpdate('');
    }
  },

  // 编辑弹层：选择头像（官方头像昵称填写能力，微信已不再提供真实头像）
  onEditChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    if (!avatarUrl) return;
    this.setData({
      editAvatarTempPath: avatarUrl,
      'editForm.previewAvatar': avatarUrl
    });
  },

  // 快捷入口
  goRecords() {
    wx.navigateTo({ url: '/pages/user/records' });
  },
  goBadges() {
    wx.navigateTo({ url: '/pages/user/badges' });
  },
  goArchive() {
    if (!this.data.isLoggedIn) {
      util.toast('请先登录', 'none');
      return;
    }
    wx.navigateTo({ url: '/pages/user/archive' });
  },
  // 学习打卡日历
  goCheckin() {
    wx.navigateTo({ url: '/pages/checkin/calendar' });
  },
  inviteFriend() {
    wx.showModal({
      title: '邀请同学',
      content: '把"常青藤在线测评"分享给同学，一起科学规划升学吧！',
      confirmText: '去分享',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '点击右上角转发', icon: 'none' });
        }
      }
    });
  },
  // 隐私保护指引全文页
  goPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/index' });
  },

  aboutUs() {
    // 连点 5 次「关于我们」→ 进入管理后台（隐藏入口，普通用户无感知）
    this._aboutTapCount = (this._aboutTapCount || 0) + 1;
    if (this._aboutTapCount >= 5) {
      this._aboutTapCount = 0;
      wx.navigateTo({ url: '/pages/admin/index' });
      return;
    }
    // 2 秒内未连点则重置计数
    if (this._aboutTapTimer) clearTimeout(this._aboutTapTimer);
    this._aboutTapTimer = setTimeout(() => { this._aboutTapCount = 0; }, 2000);
    wx.showModal({
      title: '关于我们',
      content: '常青藤在线测评 · 为高中生量身打造的升学规划测评工具，助你科学选科、精准规划。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 退出登录：清除 app 全局态 + 清除本地会话，再刷新页面
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          app.logout();            // 清除 globalData 与本地 userInfo 缓存
          store.clearCurrent();    // 同步清除本地会话 uid，保证 getCurrentUser 返回 null
          this.refreshUser();
          util.toast('已退出登录', 'none');
        }
      }
    });
  },

  // 注销账号：删除云端个人数据 + 清除全部本地数据（参考 boilerplate delete-user-info）
  deleteAccount() {
    wx.showModal({
      title: '⚠️ 注销账号',
      content: '注销后将删除您的云端个人资料、测评记录与积分，且不可恢复。确定要注销吗？',
      confirmText: '继续注销',
      confirmColor: '#E53935',
      success: (res) => {
        if (!res.confirm) return;
        // 二次确认，防误触
        wx.showModal({
          title: '再次确认',
          content: '所有数据删除后无法找回，确定注销吗？',
          confirmText: '确认注销',
          confirmColor: '#E53935',
          success: async (res2) => {
            if (!res2.confirm) return;
            util.showLoading('正在注销...');
            // 1. 删除云端数据（云不可用时仅清除本地）
            let cloudMsg = '';
            try {
              const r = await store.deleteUserCloud();
              if (!r.success) cloudMsg = r.errMsg || '';
            } catch (e) {
              cloudMsg = e.message || '';
            }
            // 2. 清除全部本地数据
            try { wx.clearStorageSync(); } catch (e) {}
            // 3. 清除全局登录态（会广播 loginChanged）
            app.globalData.userInfo = null;
            app.globalData.isLogin = false;
            require('../../utils/notificationCenter.js').publish('loginChanged', null);
            util.hideLoading();
            this.refreshUser();
            if (cloudMsg) {
              wx.showModal({
                title: '注销完成',
                content: '本地数据已清除；云端数据删除失败（' + cloudMsg + '），可稍后重试或联系开发者。',
                showCancel: false
              });
            } else {
              util.toast('账号已注销', 'success');
            }
          }
        });
      }
    });
  },

  // 转发分享（胶囊菜单「发送给朋友」+「复制链接」依赖此回调）
  onShareAppMessage() {
    return {
      title: '常青藤在线测评 · 高中生升学规划测评',
      path: '/pages/index/index'
    };
  },
  onShareTimeline() {
    return { title: '常青藤在线测评 · 高中生升学规划测评' };
  }
});

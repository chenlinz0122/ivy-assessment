// pages/user/records.js - 测评记录列表（非 tabBar，navigateTo 进入）
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');

// 测评类型 → 友好标签映射（与 mockData.assessments 的 id 对应）
const assessTypeMap = {
  holland: '职业兴趣',
  subject: '学科优势',
  multiIntelligence: '多元智能',
  mbti: 'MBTI人格',
  bigFive: '大五人格',
  learningStyle: '学习风格',
  majorMatch: '专业匹配',
  stress: '压力自评'
};

Page({
  data: {
    isLoggedIn: false,
    records: [],     // 渲染用记录数组
    assessTypeMap
  },

  onLoad() {
    this.loadRecords();
  },

  // 每次返回此页刷新（删除/新增记录后及时同步）
  onShow() {
    if (typeof this.$needRefresh === 'boolean' && this.$needRefresh) {
      this.loadRecords();
      this.$needRefresh = false;
    }
  },

  // 拉取当前用户记录并格式化
  loadRecords() {
    const user = store.getCurrentUser();
    if (!user) {
      this.setData({ isLoggedIn: false, records: [] });
      return;
    }
    const list = store.getRecords(user._id); // 已按时间倒序
    const records = list.map(r => ({
      _id: r._id,
      assessName: r.assessName || '未命名测评',
      assessType: r.assessType,
      typeLabel: assessTypeMap[r.assessType] || '测评报告',
      time: util.formatTime(new Date(r.createdAt))
    }));
    this.setData({ isLoggedIn: true, records });
  },

  // 查看测评结果详情
  openRecord(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: '/pages/assess/result?recordId=' + id
    });
  },

  // 长按删除一条记录
  onLongPress(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const that = this;
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条测评记录吗？删除后不可恢复。',
      confirmColor: '#E74C3C',
      success(res) {
        if (res.confirm) {
          store.deleteRecord(id);
          util.toast('已删除', 'none');
          that.loadRecords();
        }
      }
    });
  },

  // 空状态 → 去测评列表
  goAssess() {
    wx.navigateTo({ url: '/pages/assess/list' });
  },

  // 未登录 → 登录
  goLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },

  // 转发分享
  onShareAppMessage() {
    return {
      title: '常青藤在线测评 · 看看我的测评记录',
      path: '/pages/index/index'
    };
  }
});

// pages/assess/detail.js - 测评详情页
const mockData = require('../../utils/mockData.js');
const store = require('../../utils/store.js');
const app = getApp();

Page({
  data: {
    assess: null,
    questionCount: 0
  },

  onLoad(options) {
    const id = options.id;
    const assess = mockData.getAssessById(id);
    if (!assess) {
      wx.showToast({ title: '测评不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }
    const questions = mockData.questionBank[id] || [];
    // 参与人数 = mock 基数 + 本地累计完成次数
    const localCount = store.getParticipants(id);
    const participants = (assess.participants || 0) + localCount;
    this.setData({
      assess: Object.assign({}, assess, { participants }),
      questionCount: questions.length
    });
    wx.setNavigationBarTitle({ title: assess.name });
  },

  // 开始测评（未登录自动跳登录页，登录成功后回来继续）
  startAssess() {
    if (!app.checkLogin('/pages/assess/answer?id=' + this.data.assess.id)) return;
    wx.navigateTo({ url: '/pages/assess/answer?id=' + this.data.assess.id });
  },

  // 转发分享（带上当前测评名称）
  onShareAppMessage() {
    const a = this.data.assess || {};
    return {
      title: a.name ? ('我正在做「' + a.name + '」，你也来试试') : '常青藤在线测评',
      path: '/pages/assess/detail?id=' + (a.id || '')
    };
  },
  onShareTimeline() {
    const a = this.data.assess || {};
    return { title: a.name ? ('我正在做「' + a.name + '」') : '常青藤在线测评' };
  }
});

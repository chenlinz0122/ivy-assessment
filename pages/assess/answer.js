// pages/assess/answer.js - 答题页（每题一屏，进度条，上一题/下一题）
const mockData = require('../../utils/mockData.js');
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    assessId: '',
    assess: null,
    questions: [],
    currentIdx: 0,       // 当前题号（0基）
    total: 0,
    answers: [],         // answers[i] = 选中选项索引
    selected: -1,        // 当前题选中项
    animClass: ''        // 切题动画
  },

  onLoad(options) {
    const id = options.id;
    const assess = mockData.getAssessById(id);
    const questions = mockData.questionBank[id] || [];
    if (!assess || questions.length === 0) {
      util.toast('测评数据加载失败');
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }
    this.setData({
      assessId: id,
      assess,
      questions,
      total: questions.length,
      answers: new Array(questions.length).fill(-1)
    });
    wx.setNavigationBarTitle({ title: assess.name });
  },

  // 选择选项
  selectOption(e) {
    const idx = e.currentTarget.dataset.idx;
    this.setData({ selected: idx });
    const answers = this.data.answers.slice();
    answers[this.data.currentIdx] = idx;
    this.setData({ answers });
    // 自动进入下一题（稍作延迟以显示选中态）
    setTimeout(() => {
      if (this.data.currentIdx < this.data.total - 1) {
        this.next();
      }
    }, 300);
  },

  // 上一题
  prev() {
    if (this.data.currentIdx <= 0) return;
    this.setData({
      currentIdx: this.data.currentIdx - 1,
      selected: this.data.answers[this.data.currentIdx - 1],
      animClass: 'slide-right'
    });
  },

  // 下一题
  next() {
    if (this.data.selected < 0) {
      util.toast('请选择一个选项');
      return;
    }
    if (this.data.currentIdx >= this.data.total - 1) {
      this.finish();
      return;
    }
    const nextIdx = this.data.currentIdx + 1;
    this.setData({
      currentIdx: nextIdx,
      selected: this.data.answers[nextIdx],
      animClass: 'slide-left'
    });
  },

  // 完成测评
  finish() {
    // 检查是否全部作答
    const unanswered = this.data.answers.findIndex(a => a < 0);
    if (unanswered >= 0) {
      wx.showModal({
        title: '提示',
        content: `还有第${unanswered + 1}题未作答，是否跳过未答题直接生成报告？`,
        confirmText: '生成报告',
        cancelText: '继续答题',
        success: (res) => {
          if (res.confirm) {
            this.generateReport();
          } else {
            this.setData({ currentIdx: unanswered, selected: -1 });
          }
        }
      });
      return;
    }
    this.generateReport();
  },

  // 生成报告并跳转
  generateReport() {
    util.showLoading('正在生成报告');
    // 未选的题按0处理
    const answers = this.data.answers.map(a => a < 0 ? 0 : a);
    const report = mockData.buildReport(this.data.assessId, answers);

    // 保存测评记录
    const user = store.getCurrentUser();
    const record = {
      _id: 'r_' + Date.now(),
      uid: user ? user._id : 'guest',
      assessType: this.data.assessId,
      assessName: this.data.assess.name,
      answers,
      report,
      createdAt: new Date().toISOString()
    };
    store.addRecord(record);

    // 完成测评加积分
    if (user) {
      store.addPoints(user._id, 10, '完成测评：' + this.data.assess.name);
    }

    util.hideLoading();
    // 跳转结果页（传 recordId）
    wx.redirectTo({ url: '/pages/assess/result?recordId=' + record._id });
  },

  // 退出确认
  onUnload() {
    // 简单清理
  },

  // 返回拦截
  onBack() {
    wx.showModal({
      title: '提示',
      content: '确定要退出本次测评吗？进度不会保存。',
      success: (res) => {
        if (res.confirm) wx.navigateBack();
      }
    });
  },

  // 转发分享
  onShareAppMessage() {
    return {
      title: '常青藤在线测评 · 我正在做测评，你也来试试',
      path: '/pages/assess/list'
    };
  }
});

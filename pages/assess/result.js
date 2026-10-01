// pages/assess/result.js - 测评结果页（报告展示）
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');
const mockData = require('../../utils/mockData.js');

Page({
  data: {
    record: null,
    report: null,
    assess: null,
    shareCount: 0  // 今日分享次数
  },

  onLoad(options) {
    const recordId = options.recordId;
    const record = store.getRecord(recordId);
    if (!record) {
      util.toast('报告不存在或已删除');
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }
    const assess = mockData.getAssessById(record.assessType);
    this.setData({
      record,
      report: record.report,
      assess
    });
    wx.setNavigationBarTitle({ title: record.assessName + ' · 报告' });

    // 统计今日分享次数（用于每日上限3次）
    this.countTodayShare();
  },

  // 统计今日分享次数
  countTodayShare() {
    const user = store.getCurrentUser();
    if (!user) return;
    const logs = store.getPointLogs(user._id);
    const today = util.formatDate();
    const count = logs.filter(l =>
      l.reason === '分享报告' && l.time.startsWith(today)
    ).length;
    this.setData({ shareCount: count });
  },

  // 分享报告（加积分，每日上限3次）
  shareReport() {
    if (this.data.shareCount >= 3) {
      util.toast('今日分享积分已达上限');
      // 仍可分享但不加分
      this.doShare();
      return;
    }
    const user = store.getCurrentUser();
    if (user) {
      store.addPoints(user._id, 5, '分享报告');
      this.setData({ shareCount: this.data.shareCount + 1 });
      util.toast('分享成功 +5积分', 'success');
    }
    this.doShare();
  },

  // 调起分享（按钮 open-type="share" 会自动触发 onShareAppMessage，无需额外处理）
  doShare() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
  },

  // 配置转发（带测评结果的自定义分享图文）
  onShareAppMessage() {
    const { record, report } = this.data;
    if (!record) {
      return { title: '常青藤在线测评', path: '/pages/index/index' };
    }
    // 拼接结果摘要：兴趣代码 / 人格类型 / 等级 / 标准分
    let summary = '';
    if (report) {
      if (report.code) summary += '兴趣代码 ' + report.code;
      if (report.type) summary += (summary ? '，' : '') + '类型 ' + report.type;
      if (report.styleName) summary += (summary ? '，' : '') + report.styleName;
      if (report.level) summary += (summary ? '，' : '') + report.level;
      else if (report.pct !== undefined) summary += (summary ? '，' : '') + '得分 ' + report.pct + ' 分';
    }
    return {
      title: '我在常青藤完成了' + record.assessName
        + (summary ? '：' + summary : '')
        + '，快来测测你的方向！',
      path: '/pages/assess/result?recordId=' + record._id,
      imageUrl: ''
    };
  },

  onShareTimeline() {
    // 分享到朋友圈（单页模式：无登录态、纯内容展示）
    const { record, report } = this.data;
    let title = '常青藤在线测评报告';
    if (record) {
      title = record.assessName + '测评报告';
      if (report && report.level) title += ' · ' + report.level;
    }
    return { title, query: record ? 'recordId=' + record._id : '' };
  },

  // 再测一次
  retry() {
    wx.redirectTo({ url: '/pages/assess/answer?id=' + this.data.record.assessType });
  },

  // 查看更多测评
  moreAssess() {
    wx.navigateTo({ url: '/pages/assess/list' });
  },

  // 导出成长档案（跳转到个人中心档案功能）
  exportArchive() {
    wx.switchTab({ url: '/pages/user/index' });
  }
});

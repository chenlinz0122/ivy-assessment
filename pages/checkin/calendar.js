// pages/checkin/calendar.js - 学习打卡日历页
const store = require('../../utils/store.js');

Page({
  data: {
    year: 0,
    month: 0,            // 0-11
    monthText: '',
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    days: [],            // 日历格子数据
    checkedSet: {},      // 已打卡日期集合（key=YYYY-MM-DD）
    totalDays: 0,        // 累计打卡天数
    continuousDays: 0,   // 连续打卡天数
    todayChecked: false, // 今天是否已打卡
    todayStr: ''         // 今天的 YYYY-MM-DD
  },

  onLoad() {
    const now = new Date();
    this.setData({
      year: now.getFullYear(),
      month: now.getMonth(),
      todayStr: this.formatYmd(now)
    });
    this.refresh();
  },

  onShow() {
    this.refresh();
  },

  // 刷新打卡数据和日历
  refresh() {
    const checkins = store.getCheckins();
    const checkedSet = {};
    checkins.forEach(c => { checkedSet[c.date] = true; });

    const todayStr = this.data.todayStr;
    const todayChecked = !!checkedSet[todayStr];

    // 计算连续打卡天数（从今天往回数）
    let continuousDays = 0;
    const cursor = new Date();
    while (true) {
      const ds = this.formatYmd(cursor);
      if (checkedSet[ds]) {
        continuousDays++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    this.setData({
      checkedSet,
      totalDays: checkins.length,
      continuousDays,
      todayChecked
    });
    this.buildCalendar();
  },

  // 构建当月日历
  buildCalendar() {
    const { year, month, checkedSet, todayStr } = this.data;
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay(); // 0-6
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // 前置空白格
    for (let i = 0; i < startWeekday; i++) {
      days.push({ empty: true });
    }
    // 当月每一天
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const ds = this.formatYmd(dateObj);
      const checked = !!checkedSet[ds];
      const isToday = ds === todayStr;
      const isFuture = dateObj > new Date(todayStr + 'T23:59:59');
      days.push({
        day: d,
        dateStr: ds,
        checked,
        isToday,
        isFuture
      });
    }

    this.setData({
      days,
      monthText: year + '年' + (month + 1) + '月'
    });
  },

  // 上一月
  prevMonth() {
    let { year, month } = this.data;
    if (month === 0) { year--; month = 11; } else { month--; }
    this.setData({ year, month });
    this.buildCalendar();
  },

  // 下一月
  nextMonth() {
    let { year, month } = this.data;
    if (month === 11) { year++; month = 0; } else { month++; }
    this.setData({ year, month });
    this.buildCalendar();
  },

  // 点击日期 - 仅今天可打卡
  onDayTap(e) {
    const { date, checked, isFuture } = e.currentTarget.dataset;
    if (!date || checked || isFuture) return;
    if (date !== this.data.todayStr) {
      wx.showToast({ title: '只能打卡今天哦', icon: 'none' });
      return;
    }
    store.addCheckin(date);
    wx.showToast({ title: '打卡成功！+1天', icon: 'success' });
    this.refresh();
  },

  // 立即打卡按钮
  doCheckin() {
    if (this.data.todayChecked) {
      wx.showToast({ title: '今天已打卡', icon: 'none' });
      return;
    }
    store.addCheckin(this.data.todayStr);
    wx.showToast({ title: '打卡成功！+1天', icon: 'success' });
    this.refresh();
  },

  // 去发打卡帖
  goPost() {
    wx.navigateTo({ url: '/pages/community/topic?compose=1&cat=study' });
  },

  // 格式化为 YYYY-MM-DD
  formatYmd(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  },

  // 转发分享
  onShareAppMessage() {
    return {
      title: '常青藤在线测评 · 一起坚持学习打卡',
      path: '/pages/checkin/calendar'
    };
  }
});

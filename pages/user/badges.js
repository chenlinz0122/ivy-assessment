// pages/user/badges.js - 积分商城/徽章页
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    isLogin: false,
    user: null,
    points: 0,
    level: null,
    badges: [],
    pointLogs: [],
    // 排行榜
    boardTab: 'week',
    boardList: [],
    myRank: 0
  },

  onShow() {
    const user = store.getCurrentUser();
    if (!user) {
      this.setData({ isLogin: false });
      return;
    }
    this.setData({
      isLogin: true,
      user,
      points: user.points || 0,
      level: util.getLevel(user.points || 0),
      badges: store.getBadges(user._id),
      pointLogs: store.getPointLogs(user._id).slice(0, 20)
    });
    this.buildLeaderboard();
  },

  // 构建排行榜（本地用户 + 模拟用户）
  buildLeaderboard() {
    const user = this.data.user;
    // 模拟榜单数据
    const mockBoard = [
      { nickName: '匿名同学A', points: 280, isMe: false },
      { nickName: '匿名同学B', points: 215, isMe: false },
      { nickName: '匿名同学C', points: 180, isMe: false },
      { nickName: '匿名同学D', points: 145, isMe: false },
      { nickName: '匿名同学E', points: 110, isMe: false },
      { nickName: '匿名同学F', points: 85, isMe: false },
      { nickName: '匿名同学G', points: 60, isMe: false },
      { nickName: '匿名同学H', points: 40, isMe: false },
      { nickName: '匿名同学I', points: 25, isMe: false }
    ];
    // 按当前榜单tab调整积分（模拟周/月差异）
    const factor = this.data.boardTab === 'week' ? 0.3 : (this.data.boardTab === 'month' ? 0.7 : 1);
    let list = mockBoard.map(u => ({ nickName: u.nickName, points: Math.round(u.points * factor), isMe: false }));
    // 加入当前用户
    list.push({ nickName: user.nickName, points: Math.round((user.points || 0) * factor), isMe: true });
    list.sort((a, b) => b.points - a.points);
    list = list.map((u, i) => ({ ...u, rank: i + 1 }));
    const myRank = list.find(u => u.isMe).rank;
    this.setData({ boardList: list, myRank });
  },

  // 切换榜单
  switchBoard(e) {
    this.setData({ boardTab: e.currentTarget.dataset.tab });
    this.buildLeaderboard();
  },

  // 去登录
  goLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },

  // 去测评赚积分
  goAssess() {
    wx.navigateTo({ url: '/pages/assess/list' });
  },

  // 转发分享
  onShareAppMessage() {
    return {
      title: '我在常青藤在线测评集徽章，你也来挑战',
      path: '/pages/index/index'
    };
  }
});

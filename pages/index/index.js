// pages/index/index.js - 首页（品牌展示+用户引导+内容种草）
const app = getApp();
const store = require('../../utils/store.js');

Page({
  data: {
    // 用户信息
    isLogin: false,
    nickName: '',
    avatar: '',
    hasNotice: true, // 是否有未读消息
    studyDays: 3,          // 已学习天数（mock）
    todayAssessCount: 326, // 今日完成测评人数（mock）

    // Banner 轮播 - 富化视觉层次
    banners: [
      { id: 1, title: '新高考7选3', highlight: '你选对了吗？', sub: '科学测评，选对方向', btn: '开始探索', emoji: '🌿', bg: 'linear-gradient(135deg, #0D3B1A 0%, #1B5E20 45%, #2E7D32 100%)' },
      { id: 2, title: '3分钟测出', highlight: '你的职业兴趣代码', sub: '霍兰德RIASEC专业测评', btn: '立即测评', emoji: '🧭', bg: 'linear-gradient(135deg, #003D33 0%, #00695C 45%, #00897B 100%)' }
    ],

    // 核心数据看板 - 超大数字 + 图标 + 渐变
    stats: [
      { num: '12,847', label: '已服务同学', icon: '👥', trend: '+128 本周' },
      { num: '36,201', label: '测评完成次数', icon: '📊', trend: '+2,340 本周' },
      { num: '98%', label: '用户满意度', icon: '⭐', trend: '行业领先' }
    ],

    // 四大分类入口 - 2x2 等大网格，每个卡片有独特配色
    categories: [
      { key: 'select', icon: '🧭', name: '选科决策', desc: '7选3科学推荐', count: '3项测评', gradient: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)', soft: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)', accent: '#2E7D32' },
      { key: 'self',   icon: '🧠', name: '自我认知', desc: '探索你的特质', count: '3项测评', gradient: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)', soft: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)', accent: '#1565C0' },
      { key: 'plan',   icon: '🎯', name: '升学规划', desc: '锁定目标专业', count: '1项测评', gradient: 'linear-gradient(135deg, #E65100 0%, #BF360C 100%)', soft: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)', accent: '#E65100' },
      { key: 'mind',   icon: '💚', name: '心理状态', desc: '压力情绪管理', count: '1项测评', gradient: 'linear-gradient(135deg, #AD1457 0%, #880E4F 100%)', soft: 'linear-gradient(135deg, #FCE4EC 0%, #F8BBD0 100%)', accent: '#AD1457' }
    ]
  },

  onShow() {
    const user = app.getUserInfo();
    // 动态计算连续打卡天数（从今天往回数）
    const checkins = store.getCheckins();
    const checkedSet = {};
    checkins.forEach(c => { checkedSet[c.date] = true; });
    let continuousDays = 0;
    const cursor = new Date();
    const pad = n => String(n).padStart(2, '0');
    while (true) {
      const ds = cursor.getFullYear() + '-' + pad(cursor.getMonth() + 1) + '-' + pad(cursor.getDate());
      if (checkedSet[ds]) {
        continuousDays++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    this.setData({
      isLogin: !!user,
      nickName: user ? user.nickName : '常青藤同学',
      avatar: user ? user.avatar || '' : '',
      studyDays: continuousDays
    });
  },

  // 跳转到分类筛选的测评列表
  goCategory(e) {
    const cat = e.currentTarget.dataset.cat;
    wx.navigateTo({ url: '/pages/assess/list?cat=' + cat });
  },

  // 点击 Banner - 精准跳转到对应测评详情页
  onBannerTap(e) {
    const id = e.currentTarget.dataset.id;
    // Banner①→学科优势评估 ②→霍兰德
    const assessMap = { '1': 'subject', '2': 'holland' };
    const assessId = assessMap[id];
    if (assessId) {
      if (!app.checkLogin('/pages/assess/detail?id=' + assessId)) return;
      wx.navigateTo({ url: '/pages/assess/detail?id=' + assessId });
    }
  },

  // 点击文章 - 跳转到话题讨论详情页（已移除文章模块，保留方法兼容旧引用）
  goArticle(e) {
    const id = e.currentTarget.dataset.id;
    const articleTopicMap = { '1': 'topic_seed_1', '2': 'topic_seed_2', '3': 'topic_seed_3' };
    const postId = articleTopicMap[id];
    if (postId) {
      wx.navigateTo({ url: '/pages/community/topicDetail?id=' + postId });
    } else {
      wx.switchTab({ url: '/pages/community/index' });
    }
  },

  // 去登录
  goLogin() {
    if (this.data.isLogin) {
      wx.switchTab({ url: '/pages/user/index' });
    } else {
      wx.navigateTo({ url: '/pages/login/index' });
    }
  },

  // 消息通知
  goNotice() {
    wx.showToast({ title: '暂无新消息', icon: 'none' });
  },

  // 去打卡 - 跳转打卡日历页
  goCheckIn() {
    wx.navigateTo({ url: '/pages/checkin/calendar' });
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

// pages/assess/list.js - 测评列表页（带分类筛选）
const mockData = require('../../utils/mockData.js');
const store = require('../../utils/store.js');
const app = getApp();

Page({
  data: {
    categories: mockData.categories,
    activeCat: 'all',
    list: [],
    loading: true   // 骨架屏加载标志
  },

  onLoad(options) {
    // 支持从首页分类入口跳转时带 cat 参数自动筛选
    if (options && options.cat) {
      this.setData({ activeCat: options.cat });
    }
  },

  onShow() {
    // 从首页 switchTab 跳转时，通过全局变量传递分类
    const app = getApp();
    if (app.pendingCategory) {
      this.setData({ activeCat: app.pendingCategory });
      app.pendingCategory = null;
    }
    this.filterList();
  },

  // 切换分类
  switchCat(e) {
    this.setData({ activeCat: e.currentTarget.dataset.cat });
    this.filterList();
  },

  // 按分类筛选
  filterList() {
    const cat = this.data.activeCat;
    // 展示骨架屏（模拟异步加载，避免列表闪烁）
    this.setData({ loading: true });
    setTimeout(() => {
      // 给每条测评叠加本地参与次数
      const withDynamic = mockData.assessments.map(a => {
        const localCount = store.getParticipants(a.id);
        return Object.assign({}, a, { participants: (a.participants || 0) + localCount });
      });
      let list;
      if (cat === 'all') {
        list = withDynamic;
      } else {
        // 找到分类对应的中文名称，按名称匹配
        const catItem = this.data.categories.find(c => c.key === cat);
        const catName = catItem ? catItem.name : '';
        list = withDynamic.filter(a => a.category === catName);
      }
      this.setData({ list, loading: false });
    }, 300);
  },

  // 点击测评
  onAssessTap(e) {
    // 优先取组件 triggerEvent 传递的 id，其次取 data-id
    const id = e.detail.id || e.currentTarget.dataset.id;
    // id 无效时直接忽略（避免原生 tap 冒泡导致的无效跳转）
    if (!id || id === 'undefined') return;
    if (!app.checkLogin('/pages/assess/detail?id=' + id)) return;
    wx.navigateTo({ url: '/pages/assess/detail?id=' + id });
  },

  // 转发分享
  onShareAppMessage() {
    return {
      title: '常青藤在线测评 · 测测评找方向',
      path: '/pages/assess/list'
    };
  },
  onShareTimeline() {
    return { title: '常青藤在线测评 · 测测评找方向' };
  }
});

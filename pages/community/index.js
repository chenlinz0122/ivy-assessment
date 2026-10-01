// pages/community/index.js - 社区广场（tabBar 页）
// 报告广场：混合展示「测评报告分享」与「话题讨论」两类帖子
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');
const seedComments = require('../../utils/seedComments.js');
const notificationCenter = require('../../utils/notificationCenter.js');

// 测评类型 → 展示标签映射（仅用于测评报告分享类帖子）
const assessTypeMap = {
  holland:          { tag: '霍兰德·兴趣派', icon: '🧭', name: '霍兰德' },
  subject:          { tag: '学科·优势派',   icon: '📊', name: '学科优势' },
  mbti:             { tag: 'MBTI·人格派',   icon: '🎯', name: 'MBTI' },
  bigFive:          { tag: '大五·人格派',   icon: '🌟', name: '大五人格' },
  learningStyle:    { tag: '学习·风格派',   icon: '📚', name: '学习风格' },
  majorMatch:       { tag: '专业·匹配派',   icon: '🎓', name: '专业匹配' },
  stress:           { tag: '压力·自评派',   icon: '💚', name: '压力自评' },
  multiIntelligence:{ tag: '多元·智能派',   icon: '🧩', name: '多元智能' }
};

// 话题分类 → 标签文案映射（用于话题讨论类帖子）
const topicCatMap = {
  select: '#选科交流',
  mbti: '#MBTI',
  holland: '#霍兰德',
  study: '#学习打卡',
  treehole: '#树洞',
  major: '#专业选择'
};

// 筛选下拉选项（仅对测评报告分享类帖子生效）
const filterOptions = [
  { key: 'all',             name: '全部' },
  { key: 'holland',         name: '霍兰德' },
  { key: 'mbti',            name: 'MBTI' },
  { key: 'subject',         name: '学科优势' },
  { key: 'majorMatch',      name: '专业匹配' },
  { key: 'bigFive',         name: '大五人格' },
  { key: 'learningStyle',   name: '学习风格' },
  { key: 'stress',          name: '压力自评' }
];

Page({
  data: {
    tab: 0,                // 0=报告广场（混合信息流） 1=话题讨论（独立入口）
    posts: [],             // 格式化后的帖子列表（已排序+筛选）
    rawPosts: [],          // 原始帖子列表
    // 筛选排序
    sortBy: 'latest',      // latest=最新 hot=最热
    filterType: 'all',     // all=全部 holland/mbti/...（仅对报告类生效）
    filterName: '全部',
    showTypeFilter: false, // 类型下拉菜单展开
    filterOptions,
    // 发帖弹层
    showComposer: false,
    composeContent: '',
    isAnonymous: false,    // 匿名开关（默认关闭）
    currentUser: null,
    loading: true          // 骨架屏加载标志
  },

  onLoad() {
    const user = store.getCurrentUser();
    this.setData({ currentUser: user });
    this.seedIfEmpty();
    // 为所有帖子补充虚假评论（幂等：已有评论的帖子只同步评论数）
    seedComments.ensureCommentsForAllPosts();
    this.loadPosts();
    // 订阅登录状态变更广播（在其他页面登录/退出后自动同步当前用户）
    this._unsubLogin = notificationCenter.subscribe(
      notificationCenter.EVENTS.LOGIN_CHANGED,
      (userInfo) => {
        this.setData({ currentUser: userInfo });
        this.loadPosts();
      }
    );
  },

  onUnload() {
    // 取消订阅，避免内存泄漏
    if (this._unsubLogin) this._unsubLogin();
  },

  onShow() {
    // 从其他页面返回时刷新当前用户信息与帖子列表
    const user = store.getCurrentUser();
    if (user && (!this.data.currentUser || user._id !== this.data.currentUser._id)) {
      this.setData({ currentUser: user });
    }
    this.loadPosts();
  },

  // 首次进入若帖子为空，播种 3 条示例「测评报告分享」帖子 + 评论
  // （话题讨论类种子帖在 topic.js 中播种，两边共用同一张帖子表）
  seedIfEmpty() {
    const exist = store.getPosts();
    // 仅当没有任何报告分享类种子帖时播种
    const hasReportSeeds = exist.some(p => p._id && p._id.indexOf('post_seed_') === 0);
    if (hasReportSeeds) return;
    const now = Date.now();
    // 种子帖 comments 初始为 0，后续通过 addComment 自动累加
    const seeds = [
      {
        _id: 'post_seed_1',
        uid: 'seed_user_1',
        nickName: '匿名同学A',
        avatar: '',
        anonymous: true,
        postType: 'report',
        content: '刚做完霍兰德职业兴趣测评，我的兴趣代码是 ISA，推荐选科组合是历史+生物+政治，专业方向偏教育学和心理学，感觉还挺准的！大家也去试试 🧭',
        likes: 24,
        comments: 0,
        assessType: 'holland',
        assessName: '霍兰德职业兴趣测评',
        createdAt: new Date(now - 3600 * 1000 * 2).toISOString()
      },
      {
        _id: 'post_seed_2',
        uid: 'seed_user_2',
        nickName: '匿名同学B',
        avatar: '',
        anonymous: true,
        postType: 'report',
        content: '学科优势评估报告出炉：物理、化学、地理排前三，雷达图很直观。最终选了"物化地"组合（浙江7选3），专业覆盖率约95%，避开了最弱的生物，开心 📊',
        likes: 38,
        comments: 0,
        assessType: 'subject',
        assessName: '学科优势评估',
        createdAt: new Date(now - 3600 * 1000 * 8).toISOString()
      },
      {
        _id: 'post_seed_3',
        uid: 'seed_user_3',
        nickName: '匿名同学C',
        avatar: '',
        anonymous: true,
        postType: 'report',
        content: 'MBTI测出来是 INTJ，建议适合学习方式是独立阅读+逻辑推演，推荐专业计算机/经济学/法学。难怪我刷题比听讲效率高太多 🎯',
        likes: 51,
        comments: 0,
        assessType: 'mbti',
        assessName: 'MBTI职业人格测试',
        createdAt: new Date(now - 3600 * 1000 * 24).toISOString()
      }
    ];
    seeds.reverse().forEach(p => store.addPost(p));
    // 评论由 utils/seedComments.js 统一生成（高中生长尾昵称+随机颜色头像+3天内时间）
  },

  // 读取原始帖子
  loadPosts() {
    const list = store.getPosts() || [];
    this.setData({ rawPosts: list, loading: true });
    // 模拟异步加载，避免列表闪烁，展示骨架屏
    setTimeout(() => {
      this.applyFilterAndSort();
      this.setData({ loading: false });
    }, 300);
  },

  // 格式化单条帖子（区分 postType: report / topic）
  formatPost(p) {
    const anonymous = p.anonymous === true;
    const postType = p.postType || 'report';
    const base = {
      _id: p._id,
      uid: p.uid || '',
      postType,
      nickName: anonymous ? '匿名用户' : (p.nickName || '常青藤同学'),
      avatar: anonymous ? '' : (p.avatar || ''),
      anonymous,
      content: p.content || '',
      likes: p.likes || 0,
      comments: p.comments || 0,
      liked: false,
      time: util.formatTime(new Date(p.createdAt)),
      timestamp: new Date(p.createdAt).getTime()
    };

    if (postType === 'topic') {
      // 话题讨论类：显示话题分类标签 + 帖子正文
      const category = p.category || '';
      return Object.assign(base, {
        category,
        catTag: topicCatMap[category] || '',
        // 话题帖内容截断展示（最多50字）
        contentShort: base.content.length > 50 ? base.content.slice(0, 50) + '…' : base.content,
        hasMore: base.content.length > 50,
        images: p.images || []
      });
    }
    // 测评报告分享类：显示测评类型标签 + 报告摘要
    const meta = assessTypeMap[p.assessType] || null;
    return Object.assign(base, {
      assessType: p.assessType || '',
      assessName: p.assessName || '',
      assessTag: meta ? meta.tag : '',
      assessIcon: meta ? meta.icon : ''
    });
  },

  // 应用筛选+排序（报告广场混合信息流）
  applyFilterAndSort() {
    let list = this.data.rawPosts.map(p => this.formatPost(p));
    // 类型筛选：仅对「测评报告分享」类帖子生效，话题讨论类帖子不受影响
    const filterType = this.data.filterType;
    if (filterType !== 'all') {
      list = list.filter(p => p.postType === 'topic' || p.assessType === filterType);
    }
    // 排序
    const sortBy = this.data.sortBy;
    if (sortBy === 'hot') {
      list.sort((a, b) => (b.likes + b.comments * 2) - (a.likes + a.comments * 2));
    } else {
      list.sort((a, b) => b.timestamp - a.timestamp);
    }
    this.setData({ posts: list });
  },

  // 切换 tab：tab=1 时跳转到独立的话题讨论页面
  switchTab(e) {
    const tab = Number(e.currentTarget.dataset.tab);
    if (tab === this.data.tab) return;
    if (tab === 1) {
      // 话题讨论已独立成单独页面，点击直接跳转
      wx.navigateTo({ url: '/pages/community/topic' });
      return;
    }
    this.setData({ tab });
  },

  // 切换排序方式
  switchSort(e) {
    const sortBy = e.currentTarget.dataset.sort;
    if (sortBy === this.data.sortBy) return;
    this.setData({ sortBy });
    this.applyFilterAndSort();
  },

  // 展开/收起类型筛选下拉
  toggleTypeFilter() {
    this.setData({ showTypeFilter: !this.data.showTypeFilter });
  },

  // 选择筛选类型
  selectType(e) {
    const key = e.currentTarget.dataset.key;
    const opt = this.data.filterOptions.find(o => o.key === key);
    this.setData({
      filterType: key,
      filterName: opt ? opt.name : '全部',
      showTypeFilter: false
    });
    this.applyFilterAndSort();
  },

  // 点赞 / 取消点赞
  onLike(e) {
    const id = e.currentTarget.dataset.id;
    const posts = this.data.posts.slice();
    const idx = posts.findIndex(p => p._id === id);
    if (idx < 0) return;
    const post = posts[idx];
    if (post.liked) {
      // 取消点赞
      post.liked = false;
      post.likes = Math.max((post.likes || 0) - 1, 0);
    } else {
      // 点赞
      post.liked = true;
      post.likes = (post.likes || 0) + 1;
    }
    this.setData({ posts });
    store.updatePost(id, { likes: post.likes });
  },

  // 预览话题帖图片
  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    wx.previewImage({ current, urls });
  },

  // 点击帖子卡片 → 按类型跳转到对应详情页
  openPost(e) {
    const id = e.currentTarget.dataset.id;
    const type = e.currentTarget.dataset.type;
    if (type === 'topic') {
      // 话题讨论类 → 话题讨论详情页
      wx.navigateTo({ url: '/pages/community/topicDetail?id=' + id });
    } else {
      // 测评报告分享类 → 报告详情页
      wx.navigateTo({ url: '/pages/community/reportDetail?id=' + id });
    }
  },

  // 打开发帖弹层
  openComposer() {
    this.setData({ showComposer: true, composeContent: '', isAnonymous: false });
  },
  closeComposer() {
    this.setData({ showComposer: false, showTypeFilter: false });
  },
  stopPropagation() {},

  onComposeInput(e) {
    this.setData({ composeContent: e.detail.value });
  },

  // 切换匿名开关
  toggleAnonymous() {
    this.setData({ isAnonymous: !this.data.isAnonymous });
  },

  // 提交新帖（默认为测评报告分享类）
  submitPost() {
    const content = (this.data.composeContent || '').trim();
    if (!content) {
      util.toast('请输入内容');
      return;
    }
    const user = this.data.currentUser;
    const anonymous = this.data.isAnonymous;
    const post = {
      _id: 'post_' + Date.now(),
      uid: user ? user._id : 'guest',  // 后台记录真实用户ID
      nickName: anonymous ? '匿名用户' : (user ? user.nickName : '常青藤同学'),
      avatar: anonymous ? '' : (user ? user.avatar || '' : ''),
      anonymous,
      postType: 'report',
      content,
      likes: 0,
      comments: 0,
      assessType: '',
      assessName: '',
      createdAt: new Date().toISOString()
    };
    store.addPost(post);
    this.setData({ showComposer: false });
    this.loadPosts();
    util.toast('发布成功', 'success');
  },

  onShareTimeline() {
    // 分享到朋友圈（单页模式：纯内容展示）
    return { title: '常青藤在线测评 · 社区广场' };
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '常青藤在线测评 · 社区广场',
      path: '/pages/community/index'
    };
  }
});

// pages/community/topic.js - 话题讨论独立空间
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');
const seedComments = require('../../utils/seedComments.js');

// 话题分类预设
const topicCategories = [
  { key: 'all',        name: '全部' },
  { key: 'select',     name: '选科交流' },
  { key: 'mbti',       name: 'MBTI' },
  { key: 'holland',    name: '霍兰德' },
  { key: 'study',      name: '学习打卡' },
  { key: 'treehole',  name: '树洞' },
  { key: 'major',      name: '专业选择' }
];

// 分类 → 标签文案映射
const catTagMap = {
  select: '#选科交流',
  mbti: '#MBTI',
  holland: '#霍兰德',
  study: '#学习打卡',
  treehole: '#树洞',
  major: '#专业选择'
};

Page({
  data: {
    topicCategories,
    activeCat: 'all',      // 当前选中分类
    posts: [],             // 话题帖子列表
    showComposer: false,   // 发帖弹层
    composeContent: '',
    composeCategory: '',   // 发帖时选择的话题分类（必选）
    composeImages: [],     // 发帖时上传的图片（最多3张）
    isAnonymous: false,    // 匿名开关
    currentUser: null
  },

  onLoad(options) {
    const user = store.getCurrentUser();
    this.setData({ currentUser: user });
    this.seedIfEmpty();
    // 为所有帖子补充虚假评论（幂等：已有评论的帖子只同步评论数）
    seedComments.ensureCommentsForAllPosts();
    this.loadPosts();
    // 支持从首页"去打卡"等入口带分类自动打开发帖弹层
    if (options && options.compose === '1' && options.cat) {
      this.setData({
        showComposer: true,
        composeContent: '',
        composeCategory: options.cat,
        composeImages: [],
        isAnonymous: false
      });
    }
  },

  onShow() {
    // 每次返回页面都刷新（评论数、点赞数等可能已变化）
    this.loadPosts();
  },

  // 首次进入播种 7 条高中生话题帖子 + 对应评论
  seedIfEmpty() {
    const exist = store.getPosts();
    // 只检查话题类帖子是否已存在
    const hasTopicSeeds = exist.some(p => p._id && p._id.indexOf('topic_seed_') === 0);
    if (hasTopicSeeds) return;

    const now = Date.now();
    // 种子帖 comments 初始为 0，后续通过 addComment 自动累加
    const seeds = [
      {
        _id: 'topic_seed_1',
        uid: 'hs_user_1',
        nickName: '小林同学',
        avatar: '',
        anonymous: false,
        postType: 'topic',
        category: 'select',
        content: '我高一，目前物理60分，历史85分，但我想学计算机专业，是不是必须选物理？好纠结啊，有没有学长学姐给点建议😭',
        images: [],
        likes: 47,
        comments: 0,
        createdAt: new Date(now - 3600 * 1000 * 3).toISOString()
      },
      {
        _id: 'topic_seed_2',
        uid: 'hs_user_2',
        nickName: 'ENFP快乐小狗',
        avatar: '',
        anonymous: false,
        postType: 'topic',
        category: 'mbti',
        content: '刚测完MBTI，我是ENFP！有没有同款的？你们选的什么科？我选了历史+政治+生物，感觉挺适合我的😊',
        images: [],
        likes: 32,
        comments: 0,
        createdAt: new Date(now - 3600 * 1000 * 6).toISOString()
      },
      {
        _id: 'topic_seed_3',
        uid: 'hs_user_3',
        nickName: '探索者阿哲',
        avatar: '',
        anonymous: false,
        postType: 'topic',
        category: 'holland',
        content: '我的霍兰德代码是RIA（现实+研究+艺术），推荐选科是物理+地理+技术。有没有一样的小伙伴？你们打算报什么专业？',
        images: [],
        likes: 28,
        comments: 0,
        createdAt: new Date(now - 3600 * 1000 * 12).toISOString()
      },
      {
        _id: 'topic_seed_4',
        uid: 'hs_user_4',
        nickName: '匿名同学',
        avatar: '',
        anonymous: true,
        postType: 'topic',
        category: 'treehole',
        content: '高二了，每天刷题刷到凌晨，压力好大。今天模拟考又砸了，感觉自己好没用……有没有人能告诉我该怎么调整心态😔',
        images: [],
        likes: 89,
        comments: 0,
        createdAt: new Date(now - 3600 * 1000 * 18).toISOString()
      },
      {
        _id: 'topic_seed_5',
        uid: 'hs_user_5',
        nickName: '想学心理的小雨',
        avatar: '',
        anonymous: false,
        postType: 'topic',
        category: 'major',
        content: '我想学心理学，但家里人说不赚钱，非要我报师范或者会计。我真的好喜欢心理学啊，有没有学姐学长在读心理学的？来说说真实情况🙏',
        images: [],
        likes: 56,
        comments: 0,
        createdAt: new Date(now - 3600 * 1000 * 26).toISOString()
      },
      {
        _id: 'topic_seed_6',
        uid: 'hs_user_6',
        nickName: '浙大冲冲冲',
        avatar: '',
        anonymous: false,
        postType: 'topic',
        category: 'study',
        content: '📢 开个学习打卡帖！高三党，目标浙大，每天6点起床，晚上11点睡。今天完成：数学卷2套+英语阅读4篇+物理错题整理。坚持打卡30天，冲！',
        images: [],
        likes: 73,
        comments: 0,
        createdAt: new Date(now - 3600 * 1000 * 30).toISOString()
      },
      {
        _id: 'topic_seed_7',
        uid: 'hs_user_7',
        nickName: '物化技选手',
        avatar: '',
        anonymous: false,
        postType: 'topic',
        category: 'select',
        content: '坐标浙江，7选3选了物理+化学+技术，有没有同组合的？这个组合专业覆盖率据说97%以上，但真的好难啊，物化双修要命了😭',
        images: [],
        likes: 41,
        comments: 0,
        createdAt: new Date(now - 3600 * 1000 * 40).toISOString()
      }
    ];
    seeds.reverse().forEach(p => store.addPost(p));
    // 评论由 utils/seedComments.js 统一生成（高中生长尾昵称+随机颜色头像+3天内时间）
  },

  // 加载并格式化话题帖子
  loadPosts() {
    const all = store.getPosts() || [];
    // 仅展示话题讨论类帖子
    let list = all.filter(p => p.postType === 'topic');
    // 按分类筛选
    const cat = this.data.activeCat;
    if (cat !== 'all') {
      list = list.filter(p => p.category === cat);
    }
    // 格式化
    list = list.map(p => {
      const anonymous = p.anonymous === true;
      return {
        _id: p._id,
        nickName: anonymous ? '匿名同学' : (p.nickName || '常青藤同学'),
        avatar: anonymous ? '' : (p.avatar || ''),
        anonymous,
        category: p.category || '',
        catTag: catTagMap[p.category] || '',
        content: p.content || '',
        contentShort: (p.content || '').length > 50 ? (p.content || '').slice(0, 50) + '…' : (p.content || ''),
        hasMore: (p.content || '').length > 50,
        images: p.images || [],
        likes: p.likes || 0,
        comments: p.comments || 0,
        liked: false,
        time: util.formatTime(new Date(p.createdAt)),
        timestamp: new Date(p.createdAt).getTime()
      };
    });
    // 按时间倒序
    list.sort((a, b) => b.timestamp - a.timestamp);
    this.setData({ posts: list });
  },

  // 切换分类标签
  switchCat(e) {
    const cat = e.currentTarget.dataset.cat;
    if (cat === this.data.activeCat) return;
    this.setData({ activeCat: cat });
    this.loadPosts();
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
    // 同步到存储
    store.updatePost(id, { likes: post.likes });
  },

  // 点击帖子 → 跳转详情页
  openPost(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/community/topicDetail?id=' + id });
  },

  // 预览图片
  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    wx.previewImage({ current, urls });
  },

  // ===== 发帖弹层 =====
  openComposer() {
    this.setData({
      showComposer: true,
      composeContent: '',
      composeCategory: '',
      composeImages: [],
      isAnonymous: false
    });
  },
  closeComposer() {
    this.setData({ showComposer: false });
  },
  stopPropagation() {},

  onComposeInput(e) {
    this.setData({ composeContent: e.detail.value });
  },

  // 选择话题分类
  selectComposeCat(e) {
    this.setData({ composeCategory: e.currentTarget.dataset.cat });
  },

  // 切换匿名
  toggleAnonymous() {
    this.setData({ isAnonymous: !this.data.isAnonymous });
  },

  // 选择图片（最多3张）
  chooseImage() {
    const remain = 3 - this.data.composeImages.length;
    if (remain <= 0) {
      util.toast('最多上传3张图片', 'none');
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newPaths = res.tempFiles.map(f => f.tempFilePath);
        this.setData({ composeImages: this.data.composeImages.concat(newPaths) });
      }
    });
  },

  // 删除已选图片
  removeImage(e) {
    const idx = e.currentTarget.dataset.idx;
    const images = this.data.composeImages.slice();
    images.splice(idx, 1);
    this.setData({ composeImages: images });
  },

  // 预览发帖中的图片
  previewComposeImage(e) {
    const idx = e.currentTarget.dataset.idx;
    wx.previewImage({ current: this.data.composeImages[idx], urls: this.data.composeImages });
  },

  // 提交发帖
  submitPost() {
    const content = (this.data.composeContent || '').trim();
    const category = this.data.composeCategory;
    if (!content) {
      util.toast('请输入内容');
      return;
    }
    if (!category) {
      util.toast('请选择话题分类');
      return;
    }
    const user = this.data.currentUser;
    const anonymous = this.data.isAnonymous;
    const post = {
      _id: 'topic_' + Date.now(),
      uid: user ? user._id : 'guest',
      nickName: anonymous ? '匿名同学' : (user ? user.nickName : '常青藤同学'),
      avatar: anonymous ? '' : (user ? user.avatar || '' : ''),
      anonymous,
      postType: 'topic',
      category,
      content,
      images: this.data.composeImages,
      likes: 0,
      comments: 0,
      createdAt: new Date().toISOString()
    };
    store.addPost(post);
    this.setData({ showComposer: false });
    this.loadPosts();
    util.toast('发布成功', 'success');
  },

  onShareAppMessage() {
    return { title: '常青藤在线测评 · 话题讨论', path: '/pages/community/topic' };
  }
});

// pages/community/topicDetail.js - 话题讨论详情页（完整内容 + 评论）
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');
const { escapeHtml } = require('../../utils/renderRichText.js');

// 话题分类 → 标签文案映射
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
    postId: '',
    post: null,            // 格式化后的帖子详情
    comments: [],          // 评论列表
    commentInput: '',      // 评论输入框
    currentUser: null,
    commentAnonymous: false // 评论匿名开关
  },

  onLoad(options) {
    const postId = options.id || '';
    this.setData({ postId });
    const user = store.getCurrentUser();
    this.setData({ currentUser: user });
    this.loadPost();
    this.loadComments();
  },

  // 加载帖子详情
  loadPost() {
    const raw = store.getPost(this.data.postId);
    if (!raw) {
      util.toast('帖子不存在或已被删除');
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }
    const anonymous = raw.anonymous === true;
    const post = {
      _id: raw._id,
      nickName: anonymous ? '匿名同学' : (raw.nickName || '常青藤同学'),
      avatar: anonymous ? '' : (raw.avatar || ''),
      anonymous,
      category: raw.category || '',
      catTag: catTagMap[raw.category] || '',
      content: raw.content || '',
      contentHtml: escapeHtml(raw.content || '').replace(/\n/g, '<br/>'),
      images: raw.images || [],
      likes: raw.likes || 0,
      comments: raw.comments || 0,
      liked: false,
      time: util.formatTime(new Date(raw.createdAt))
    };
    this.setData({ post });
    wx.setNavigationBarTitle({ title: '话题详情' });
  },

  // 加载评论列表
  loadComments() {
    const list = store.getComments(this.data.postId);
    const formatted = list.map(c => {
      const anonymous = c.anonymous === true;
      const nick = anonymous ? '匿名同学' : (c.nickName || '常青藤同学');
      return {
        _id: c._id,
        nickName: nick,
        avatar: anonymous ? '' : (c.avatar || ''),
        avatarColor: anonymous ? '' : (c.avatarColor || '#C8E6C9'),
        initial: anonymous ? '🌿' : (c.initial || nick.charAt(0)),
        anonymous,
        content: c.content || '',
        time: util.formatTime(new Date(c.createdAt))
      };
    });
    this.setData({ comments: formatted });
  },

  // 预览帖子图片
  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    wx.previewImage({ current, urls });
  },

  // 点赞 / 取消点赞
  onLike() {
    const post = Object.assign({}, this.data.post);
    if (post.liked) {
      // 取消点赞
      post.liked = false;
      post.likes = Math.max((post.likes || 0) - 1, 0);
    } else {
      // 点赞
      post.liked = true;
      post.likes = (post.likes || 0) + 1;
    }
    this.setData({ post });
    store.updatePost(this.data.postId, { likes: post.likes });
  },

  // 评论输入
  onCommentInput(e) {
    this.setData({ commentInput: e.detail.value });
  },

  // 切换评论匿名
  toggleCommentAnonymous() {
    this.setData({ commentAnonymous: !this.data.commentAnonymous });
  },

  // 提交评论
  submitComment() {
    const content = (this.data.commentInput || '').trim();
    if (!content) {
      util.toast('请输入评论内容');
      return;
    }
    const user = this.data.currentUser;
    const anonymous = this.data.commentAnonymous;
    const comment = {
      _id: 'c_' + Date.now(),
      postId: this.data.postId,
      uid: user ? user._id : 'guest',
      nickName: anonymous ? '匿名同学' : (user ? user.nickName : '常青藤同学'),
      avatar: anonymous ? '' : (user ? user.avatar || '' : ''),
      anonymous,
      content,
      createdAt: new Date().toISOString()
    };
    store.addComment(comment);
    this.setData({ commentInput: '', commentAnonymous: false });
    this.loadComments();
    // 同步帖子评论数
    const post = Object.assign({}, this.data.post);
    post.comments = (post.comments || 0) + 1;
    this.setData({ post });
    util.toast('评论成功', 'success');
  },

  onShareTimeline() {
    // 分享到朋友圈（单页模式：纯内容展示）
    const post = this.data.post;
    return {
      title: post ? (post.catTag + ' ' + (post.content || '').slice(0, 30)) : '话题讨论',
      query: 'id=' + this.data.postId
    };
  },

  // 分享（带帖子首图，提升分享卡片效果）
  onShareAppMessage() {
    const post = this.data.post;
    return {
      title: post ? (post.catTag + ' ' + (post.content || '').slice(0, 30)) : '话题讨论',
      path: '/pages/community/topicDetail?id=' + this.data.postId,
      imageUrl: (post && post.images && post.images.length) ? post.images[0] : ''
    };
  }
});

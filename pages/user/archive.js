// pages/user/archive.js - 我的成长档案
// 汇总用户所有测评结果，生成可导出的成长档案
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');
const mockData = require('../../utils/mockData.js');

// 测评类型 → 图标 与 分类
const assessMeta = {
  holland:          { icon: '🧭', label: '职业兴趣',   category: '选科决策' },
  subject:          { icon: '📊', label: '学科优势',   category: '选科决策' },
  multiIntelligence:{ icon: '🧩', label: '多元智能',   category: '选科决策' },
  mbti:             { icon: '🎯', label: 'MBTI人格',   category: '自我认知' },
  bigFive:          { icon: '🌟', label: '大五人格',   category: '自我认知' },
  learningStyle:    { icon: '📚', label: '学习风格',   category: '自我认知' },
  majorMatch:       { icon: '🎓', label: '专业匹配',   category: '升学规划' },
  stress:           { icon: '💚', label: '压力自评',   category: '心理状态' }
};

Page({
  data: {
    isLoggedIn: false,
    user: null,
    level: {},
    totalCount: 0,
    badgesUnlocked: 0,
    pointsLog: [],
    // 按分类聚合的已完成的测评摘要
    groupedSummary: [],
    // 时间轴：按完成时间倒序
    timeline: [],
    canvasReady: false,
    canvasStyle: 'width:690px;height:1400px;'
  },

  onLoad() {
    this.loadArchive();
  },

  onShow() {
    // 从记录页删除后回来需要刷新
    if (this.$needRefresh) {
      this.$needRefresh = false;
      this.loadArchive();
    }
  },

  loadArchive() {
    const user = store.getCurrentUser();
    if (!user) {
      this.setData({ isLoggedIn: false });
      return;
    }
    const records = store.getRecords(user._id); // 倒序
    const level = util.getLevel(user.points || 0);
    const badges = store.getBadges(user._id);
    const badgesUnlocked = badges.filter(b => b.unlocked).length;

    // 构建按分类聚合的摘要
    const groupMap = {};
    const timeline = records.map(r => {
      const meta = assessMeta[r.assessType] || { icon: '📋', label: '测评', category: '其他' };
      // 从报告 sections 提取首条摘要（核心结论）
      const summary = this.extractSummary(r);
      const item = {
        _id: r._id,
        assessType: r.assessType,
        assessName: r.assessName,
        icon: meta.icon,
        label: meta.label,
        category: meta.category,
        summary,
        time: util.formatTime(new Date(r.createdAt)),
        dateStr: util.formatDate(new Date(r.createdAt))
      };
      if (!groupMap[meta.category]) groupMap[meta.category] = [];
      // 同分类只保留最新一条（成长档案取最近一次结果）
      const existIdx = groupMap[meta.category].findIndex(g => g.assessType === r.assessType);
      if (existIdx < 0) {
        groupMap[meta.category].push(item);
      } else {
        // records 倒序，先到的就是最新的
      }
      return item;
    });

    // 转成数组并排序（按分类预设顺序）
    const catOrder = ['选科决策', '自我认知', '升学规划', '心理状态', '其他'];
    const groupedSummary = Object.keys(groupMap)
      .map(cat => ({ category: cat, list: groupMap[cat] }))
      .sort((a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category));

    this.setData({
      isLoggedIn: true,
      user,
      level,
      totalCount: records.length,
      badgesUnlocked,
      groupedSummary,
      timeline
    });
    // 预计算 canvas 高度并更新样式
    const canvasH = this.calcCanvasHeight();
    this.setData({ canvasStyle: `width:690px;height:${canvasH}px;` });
  },

  // 从报告里抽出关键结论作为摘要
  extractSummary(record) {
    const report = record.report || {};
    const sections = report.sections || [];
    // 优先使用 sections 第一条内容
    if (sections.length > 0) {
      const first = sections[0];
      let text = (first.content || '').trim();
      // 截断到合理长度，去掉换行
      text = text.replace(/\n/g, ' ');
      if (text.length > 60) text = text.slice(0, 60) + '…';
      return { title: first.title, text };
    }
    return { title: '已完成测评', text: '点击查看完整报告' };
  },

  // 查看某条记录详情
  openRecord(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/assess/result?recordId=' + id });
  },

  // 导出成长档案为图片（使用 canvas 2d）
  async exportImage() {
    if (this.data.totalCount === 0) {
      util.toast('暂无测评记录可导出');
      return;
    }
    util.showLoading('正在生成档案');
    try {
      await this.drawCanvas();
      const filePath = await this.canvasToImage();
      util.hideLoading();
      // 预览图片，用户可长按保存
      wx.previewImage({
        current: filePath,
        urls: [filePath]
      });
    } catch (err) {
      util.hideLoading();
      console.error('导出失败', err);
      util.toast('导出失败，请重试');
    }
  },

  // 在 canvas 上绘制档案内容
  drawCanvas() {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query.select('#archiveCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            reject(new Error('canvas 节点未找到'));
            return;
          }
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getSystemInfoSync().pixelRatio || 2;
          const cssW = 690;
          const cssH = this.calcCanvasHeight();
          canvas.width = cssW * dpr;
          canvas.height = cssH * dpr;
          ctx.scale(dpr, dpr);

          // 背景
          const grad = ctx.createLinearGradient(0, 0, 0, cssH);
          grad.addColorStop(0, '#F5F7F6');
          grad.addColorStop(1, '#EAF3EE');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, cssW, cssH);

          let y = 40;
          // 标题
          ctx.fillStyle = '#1F6E42';
          ctx.font = 'bold 40px sans-serif';
          ctx.fillText('🌿 我的成长档案', 40, y);
          y += 30;
          ctx.fillStyle = '#7A8A7C';
          ctx.font = '24px sans-serif';
          const user = this.data.user || {};
          const now = util.formatDate();
          ctx.fillText(`${user.nickName || '同学'} · ${user.grade || ''} · 生成于 ${now}`, 40, y);
          y += 30;

          // 用户概览卡片
          y = this.drawOverviewCard(ctx, 40, y, 610);
          y += 20;

          // 各分类摘要
          const groups = this.data.groupedSummary;
          groups.forEach(group => {
            y = this.drawGroupCard(ctx, 40, y, 610, group);
            y += 16;
          });

          // 时间轴
          if (this.data.timeline.length > 0) {
            y = this.drawTimelineCard(ctx, 40, y, 610);
            y += 16;
          }

          // 页脚
          y += 10;
          ctx.fillStyle = '#B8C5BC';
          ctx.font = '22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('— 常青藤在线测评 · 助力升学每一步 —', cssW / 2, y);
          ctx.textAlign = 'left';

          resolve();
        });
    });
  },

  // 估算 canvas 高度
  calcCanvasHeight() {
    let h = 200; // 标题 + 概览
    this.data.groupedSummary.forEach(g => {
      h += 70 + g.list.length * 90;
    });
    if (this.data.timeline.length > 0) {
      h += 70 + this.data.timeline.length * 50;
    }
    h += 80; // 页脚
    return h;
  },

  // 绘制概览卡片
  drawOverviewCard(ctx, x, y, w) {
    // 卡片背景
    this.roundRect(ctx, x, y, w, 150, 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    const user = this.data.user || {};
    // 头像/昵称
    ctx.fillStyle = '#2C3E2D';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText((user.nickName || '同学') + '  ' + (this.data.level.icon || ''), x + 24, y + 50);

    ctx.fillStyle = '#7A8A7C';
    ctx.font = '24px sans-serif';
    const combo = user.subjectCombo ? '选科：' + user.subjectCombo : '选科：未设置';
    ctx.fillText(`${user.grade || ''}  ·  ${combo}`, x + 24, y + 86);

    // 三列统计
    const colW = w / 3;
    const stats = [
      { num: this.data.totalCount, label: '已完成测评' },
      { num: user.points || 0, label: '累计积分' },
      { num: this.data.badgesUnlocked, label: '获得徽章' }
    ];
    stats.forEach((s, i) => {
      const cx = x + colW * i + colW / 2;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#2E8B57';
      ctx.font = 'bold 38px sans-serif';
      ctx.fillText(String(s.num), cx, y + 130);
      ctx.fillStyle = '#7A8A7C';
      ctx.font = '22px sans-serif';
      ctx.fillText(s.label, cx, y + 155);
    });
    ctx.textAlign = 'left';
    return y + 160;
  },

  // 绘制分类卡片
  drawGroupCard(ctx, x, y, w, group) {
    const itemH = 90;
    const headerH = 60;
    const cardH = headerH + group.list.length * itemH + 16;

    this.roundRect(ctx, x, y, w, cardH, 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // 分类标题
    ctx.fillStyle = '#2E8B57';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('▎ ' + group.category, x + 24, y + 42);

    let cy = y + headerH + 10;
    group.list.forEach(item => {
      // 图标圆背景
      ctx.fillStyle = '#E8F5EC';
      this.roundRect(ctx, x + 24, cy, 60, 60, 30);
      ctx.fill();
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.icon, x + 54, cy + 40);
      ctx.textAlign = 'left';

      // 测评名
      ctx.fillStyle = '#2C3E2D';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(item.assessName, x + 100, cy + 26);

      // 摘要
      ctx.fillStyle = '#5A6B5D';
      ctx.font = '22px sans-serif';
      const sumTitle = (item.summary.title || '') + '：';
      let text = sumTitle + (item.summary.text || '');
      if (text.length > 32) text = text.slice(0, 32) + '…';
      ctx.fillText(text, x + 100, cy + 54);

      // 日期
      ctx.fillStyle = '#B8C5BC';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(item.dateStr, x + w - 24, cy + 26);
      ctx.textAlign = 'left';

      cy += itemH;
    });

    return y + cardH;
  },

  // 绘制时间轴卡片
  drawTimelineCard(ctx, x, y, w) {
    const items = this.data.timeline.slice(0, 8); // 最多展示 8 条
    const cardH = 60 + items.length * 50 + 16;

    this.roundRect(ctx, x, y, w, cardH, 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    ctx.fillStyle = '#2E8B57';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('▎ 成长时间轴', x + 24, y + 42);

    let cy = y + 70;
    items.forEach(item => {
      // 圆点
      ctx.fillStyle = '#3CB371';
      ctx.beginPath();
      ctx.arc(x + 32, cy + 6, 6, 0, Math.PI * 2);
      ctx.fill();
      // 内容
      ctx.fillStyle = '#2C3E2D';
      ctx.font = '26px sans-serif';
      let text = item.icon + ' ' + item.assessName;
      if (text.length > 20) text = text.slice(0, 20) + '…';
      ctx.fillText(text, x + 50, cy + 12);
      // 时间
      ctx.fillStyle = '#B8C5BC';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(item.dateStr, x + w - 24, cy + 12);
      ctx.textAlign = 'left';
      cy += 50;
    });

    return y + cardH;
  },

  // 圆角矩形路径
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  },

  // canvas 转图片
  canvasToImage() {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query.select('#archiveCanvas')
        .fields({ node: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            reject(new Error('canvas 节点未找到'));
            return;
          }
          const canvas = res[0].node;
          wx.canvasToTempFilePath({
            canvas,
            fileType: 'png',
            quality: 1,
            success: (r) => {
              // 保存到相册需要先写入临时路径
              this.saveToAlbum(r.tempFilePath);
              resolve(r.tempFilePath);
            },
            fail: reject
          });
        });
    });
  },

  // 提示用户保存到相册
  saveToAlbum(filePath) {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => {
        util.toast('档案已保存到相册', 'success');
      },
      fail: () => {
        // 用户拒绝权限或取消，已通过 previewImage 让其长按保存
      }
    });
  },

  // 去测评
  goAssess() {
    wx.navigateTo({ url: '/pages/assess/list' });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '我在常青藤在线测评的成长档案，快来看看你的方向！',
      path: '/pages/index/index'
    };
  }
});

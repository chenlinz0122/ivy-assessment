// pages/admin/index.js - 管理后台（用户列表）
// 供不会代码的管理员使用：在小程序内直接查看注册用户，支持搜索、筛选、导出 CSV、封禁/解封/删除
// 鉴权：云函数 get-admin-user-list 管理员手机号白名单（内置 19817793985），
//       非管理员调用返回 403，本页显示「无权限」
// 订阅消息：管理员首次进入时请求订阅授权（一次性，用于接收新用户注册通知）
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');

// 订阅消息模板 ID（与 notify-admin 云函数内置的一致）
const SUBSCRIBE_TMPL_ID = 'FAeMzEMf8h5QNn3pumyjXVgMdOJ7VOFDlTUHSbxL__Q';

const ROLE_TEXT = { student: '学生', parent: '家长' };
const ROLE_FILTERS = [
  { key: '', label: '全部身份' },
  { key: 'student', label: '学生' },
  { key: 'parent', label: '家长' }
];
const GRADE_FILTERS = [
  { key: '', label: '全部年级' },
  { key: '高一', label: '高一' },
  { key: '高二', label: '高二' },
  { key: '高三', label: '高三' }
];

Page({
  data: {
    loading: true,
    denied: false,          // 非管理员
    keyword: '',            // 搜索关键字（手机号/昵称）
    roleFilter: '',         // 身份筛选
    gradeFilter: '',        // 年级筛选
    roleFilters: ROLE_FILTERS,
    gradeFilters: GRADE_FILTERS,
    users: [],              // 全部用户
    filtered: [],           // 筛选后展示
    total: 0
  },

  onLoad() {
    this.loadUsers();
    this.requestSubscribe();  // 请求订阅授权（新用户注册通知）
  },

  // 请求订阅消息授权：管理员点一次"允许"后，每次新用户注册都会收到微信服务通知
  // 静默处理：用户拒绝或已授权过都不再打扰
  requestSubscribe() {
    if (!wx.requestSubscribeMessage) return;
    // 已请求过则跳过（本地标记，避免每次进管理后台都弹）
    if (wx.getStorageSync('admin_subscribed')) return;
    wx.requestSubscribeMessage({
      tmplIds: [SUBSCRIBE_TMPL_ID],
      success: (res) => {
        if (res[SUBSCRIBE_TMPL_ID] === 'accept') {
          wx.setStorageSync('admin_subscribed', 1);
          util.toast('已开启新用户注册通知', 'success');
        }
      },
      fail: () => {}
    });
  },

  // 拉取用户列表
  loadUsers() {
    this.setData({ loading: true });
    store.getAdminUserList(this.data.keyword).then(res => {
      if (!res.success) {
        const denied = (res.errMsg || '').indexOf('权限') >= 0;
        this.setData({ loading: false, denied });
        if (!denied) util.toast(res.errMsg || '加载失败');
        return;
      }
      // 预处理展示字段
      const users = (res.users || []).map(u => Object.assign({}, u, {
        roleText: ROLE_TEXT[u.role] || (u.role || '学生'),
        createTimeText: util.formatTime(u.createTime ? new Date(u.createTime) : null),
        lastLoginText: util.formatRelativeTime(u.lastLoginTime ? new Date(u.lastLoginTime) : null) || '-'
      }));
      this.setData({ loading: false, denied: false, users, total: res.total || users.length });
      this.applyFilter();
    });
  },

  // 搜索
  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },
  onSearch() {
    this.loadUsers(); // 关键字走云函数端模糊查询
  },

  // 筛选（前端本地过滤，已拉全量）
  onRoleFilter(e) {
    this.setData({ roleFilter: e.currentTarget.dataset.key });
    this.applyFilter();
  },
  onGradeFilter(e) {
    this.setData({ gradeFilter: e.currentTarget.dataset.key });
    this.applyFilter();
  },
  applyFilter() {
    const { users, roleFilter, gradeFilter } = this.data;
    const filtered = users.filter(u => {
      if (roleFilter && (u.role || 'student') !== roleFilter) return false;
      if (gradeFilter && u.grade !== gradeFilter) return false;
      return true;
    });
    this.setData({ filtered });
  },

  // 导出 CSV：复制到剪贴板（管理员粘贴到 Excel 即可）
  exportCsv() {
    const list = this.data.filtered;
    if (!list.length) {
      util.toast('当前没有可导出的数据');
      return;
    }
    const header = '昵称,身份,年级,手机号,选科,积分,注册时间,最后登录';
    const rows = list.map(u => [
      u.nickName, u.roleText, u.grade, u.phoneNumber,
      u.subjectCombo || '-', u.points, u.createTimeText, u.lastLoginText
    ].map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(','));
    const csv = '﻿' + header + '\n' + rows.join('\n'); // BOM 头保证 Excel 打开不乱码
    wx.setClipboardData({
      data: csv,
      success: () => {
        wx.showModal({
          title: '导出成功',
          content: '共 ' + list.length + ' 条数据已复制到剪贴板，请粘贴到 Excel 或 WPS 中查看。',
          showCancel: false,
          confirmText: '知道了'
        });
      }
    });
  },

  // 复制单个用户手机号
  copyPhone(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) return;
    wx.setClipboardData({ data: phone });
  },

  // ============ 用户管理：封禁 / 解封 / 删除 ============
  // 统一的云函数调用 + 本地状态刷新
  _manageUser(action, openid, reason, doneText) {
    util.showLoading('处理中...');
    store.adminManageUser(action, openid, reason).then(res => {
      util.hideLoading();
      if (!res.success) {
        util.toast(res.errMsg || '操作失败');
        return;
      }
      util.toast(doneText, 'success');
      // 本地更新列表状态（删除则从列表移除，封禁/解封改状态）
      let users = this.data.users;
      if (action === 'delete') {
        users = users.filter(u => u.openid !== openid);
      } else {
        users = users.map(u => u.openid === openid
          ? Object.assign({}, u, { banned: action === 'ban', banReason: action === 'ban' ? (reason || '管理员封禁') : '' })
          : u);
      }
      this.setData({ users, total: users.length });
      this.applyFilter();
    });
  },

  // 封禁：弹出原因输入框
  onBan(e) {
    const { openid, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '封禁用户',
      content: '确定封禁「' + (name || '该用户') + '」吗？封禁后该用户将无法登录。',
      confirmText: '封禁',
      confirmColor: '#E8890C',
      editable: true,               // 允许输入封禁原因
      placeholderText: '封禁原因（选填）',
      success: (res) => {
        if (!res.confirm) return;
        this._manageUser('ban', openid, res.content, '已封禁');
      }
    });
  },

  // 解封
  onUnban(e) {
    const { openid, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '解封用户',
      content: '确定解封「' + (name || '该用户') + '」吗？解封后该用户可正常登录。',
      confirmText: '解封',
      success: (res) => {
        if (!res.confirm) return;
        this._manageUser('unban', openid, '', '已解封');
      }
    });
  },

  // 删除：二次确认（不可恢复）
  onDelete(e) {
    const { openid, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '⚠️ 删除用户',
      content: '确定删除「' + (name || '该用户') + '」吗？删除后该用户的云端档案将不可恢复！',
      confirmText: '继续删除',
      confirmColor: '#E53935',
      success: (res) => {
        if (!res.confirm) return;
        wx.showModal({
          title: '再次确认',
          content: '删除后无法找回，确定删除吗？',
          confirmText: '确认删除',
          confirmColor: '#E53935',
          success: (res2) => {
            if (!res2.confirm) return;
            this._manageUser('delete', openid, '', '已删除');
          }
        });
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    store.getAdminUserList(this.data.keyword).then(res => {
      wx.stopPullDownRefresh();
      if (res.success) {
        const users = (res.users || []).map(u => Object.assign({}, u, {
          roleText: ROLE_TEXT[u.role] || (u.role || '学生'),
          createTimeText: util.formatTime(u.createTime ? new Date(u.createTime) : null),
          lastLoginText: util.formatRelativeTime(u.lastLoginTime ? new Date(u.lastLoginTime) : null) || '-'
        }));
        this.setData({ users, total: res.total || users.length });
        this.applyFilter();
        util.toast('已刷新', 'success');
      }
    });
  }
});

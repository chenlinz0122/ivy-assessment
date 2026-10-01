// pages/login/index.js - 登录页（基本信息填写 + 手机号一键登录）
// 【规范版】使用微信官方「头像昵称填写」能力（chooseAvatar + input type="nickname"），
// 不使用已废弃的旧版资料授权；登录流程分两步：
//
//   第一步：填写基本信息
//      - 头像：button open-type="chooseAvatar"（用户主动选择，可跳过用默认头像）
//      - 昵称：input type="nickname"（可选微信昵称或自定义）
//      - 身份：学生 / 家长（必选）
//      - 年级：高一 / 高二 / 高三（必选）
//   第二步：勾选《用户隐私保护指引》→ 手机号一键登录
//      button open-type="getPhoneNumber" → e.detail.code → 云函数 getPhoneNumber 换手机号
//      → 云端按 openid 绑定 → 写入基本信息 → 登录成功
//   错误码（1400001 次数用尽 / 1400002 code 非法 / 40004 用户拒绝 / 104、112 隐私未声明）
//      → 按钮下方就近提示 + toast
//   跳转：有 redirect → redirectTo 回来源页；无 redirect → switchTab 首页

const app = getApp();
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');

const GRADE_OPTIONS = ['高一', '高二', '高三'];
const ROLE_OPTIONS = [
  { key: 'student', label: '学生' },
  { key: 'parent', label: '家长' }
];

Page({
  data: {
    // ---- 基本信息表单 ----
    avatarUrl: '',           // 头像（chooseAvatar 返回的临时路径）
    nickName: '',            // 昵称
    gradeIndex: 0,           // 年级选择索引
    gradeOptions: GRADE_OPTIONS,
    role: '',                // 身份：student 学生 / parent 家长（必选）
    roleOptions: ROLE_OPTIONS,
    // ---- 协议与登录 ----
    agreedPrivacy: false,    // 隐私协议是否勾选
    agreedError: false,      // 未勾选时高亮抖动 + 就近提示
    showPrivacyModal: false, // 隐私保护指引弹窗
    phoneLogging: false,     // 手机号一键登录 loading（防重复提交）
    errMsg: '',              // 就近错误提示（按钮下方）
    redirect: ''             // 回跳来源页（带参）
  },

  onLoad(options) {
    this.setData({ redirect: options.redirect || '' });
  },

  onUnload() {
    if (this._agreedErrTimer) clearTimeout(this._agreedErrTimer);
  },

  // ============ 基本信息填写 ============
  // 头像：官方 chooseAvatar 能力（返回临时路径，登录成功后上传云存储）
  onChooseAvatar(e) {
    const avatarUrl = e && e.detail && e.detail.avatarUrl;
    if (avatarUrl) {
      this.setData({ avatarUrl });
    }
  },

  // 昵称：官方 nickname 类型输入框
  onNickNameInput(e) {
    this.setData({ nickName: (e.detail.value || '').trim() });
  },

  onNickNameBlur(e) {
    this.setData({ nickName: (e.detail.value || '').trim() });
  },

  // 年级选择
  onGradeChange(e) {
    this.setData({ gradeIndex: Number(e.detail.value) });
  },

  // 身份选择：学生 / 家长
  onRoleSelect(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ role });
  },

  // 校验基本信息是否填写完整（登录前调用）
  checkProfile() {
    if (!this.data.nickName) {
      util.toast('请先填写昵称');
      return false;
    }
    if (!this.data.role) {
      util.toast('请选择您的身份（学生/家长）');
      return false;
    }
    return true;
  },

  // ============ 协议 ============
  togglePrivacy() {
    if (!this.data.agreedPrivacy) {
      this.setData({ showPrivacyModal: true });
    } else {
      this.setData({ agreedPrivacy: false });
    }
  },
  openPrivacyModal() { this.setData({ showPrivacyModal: true, agreedError: false }); },
  closePrivacyModal() { this.setData({ showPrivacyModal: false }); },
  stopProp() {},
  agreePrivacy() {
    this.setData({ showPrivacyModal: false, agreedPrivacy: true, agreedError: false });
  },
  disagreePrivacy() {
    this.setData({ showPrivacyModal: false });
    util.toast('需同意隐私协议才能登录');
  },

  // 协议拦截：未勾选时高亮协议区并提示，返回 false 表示拦截
  checkAgreed() {
    if (this.data.agreedPrivacy) return true;
    this.setData({ agreedError: true });
    util.toast('请先勾选同意《用户隐私保护指引》');
    if (this._agreedErrTimer) clearTimeout(this._agreedErrTimer);
    this._agreedErrTimer = setTimeout(() => this.setData({ agreedError: false }), 3000);
    return false;
  },

  // ============ 手机号一键登录 ============
  // 流程：先校验基本信息与协议 → button open-type="getPhoneNumber" → e.detail.code（新版手机号能力）
  // → 云函数 getPhoneNumber 换手机号并在云端按 openid 绑定 → 登录成功
  onGetPhoneNumber(e) {
    if (!this.checkProfile()) return;
    if (!this.checkAgreed()) return;
    const detail = e && e.detail;
    // 新版只下发 code；encryptedData/iv 旧版已被微信停止下发
    if (!detail || !detail.code) {
      this.setData({ phoneLogging: false });
      util.toast('已取消手机号授权，请重新点击登录');
      return;
    }
    if (this.data.phoneLogging) return; // 防重复提交
    this.setData({ phoneLogging: true, errMsg: '' });
    util.showLoading('登录中...');
    wx.cloud.callFunction({
      name: 'getPhoneNumber',
      data: { code: detail.code }
    }).then(res => {
      const r = res && res.result;
      util.hideLoading();
      this.setData({ phoneLogging: false });
      if (r && r.success && r.phoneNumber) {
        this.loginSuccess({
          openid: r.openid || '',
          phoneNumber: r.phoneNumber,
          nickName: this.data.nickName,
          avatarUrl: this.data.avatarUrl,   // chooseAvatar 临时路径，loginSuccess 内上传云存储
          grade: GRADE_OPTIONS[this.data.gradeIndex],
          role: this.data.role
        });
      } else {
        // 云函数返回明确错误码（1400001 次数用尽 / 1400002 code 非法 等）就近提示
        const msg = this.errnoText(r);
        this.setData({ errMsg: msg });
        util.toast(msg);
        // 1400001 次数用尽属于需要管理员介入的配置问题 → 通知管理员
        if (r && (r.errno === 1400001 || r.errno === 112)) {
          store.notifyAdmin('login_fail', { reason: msg });
        }
      }
    }).catch(err => {
      util.hideLoading();
      this.setData({ phoneLogging: false });
      const msg = (err.errMsg || err.message || '');
      const isNotFound = msg.indexOf('FUNCTION_NOT_FOUND') >= 0 || msg.indexOf('-501000') >= 0;
      const tip = isNotFound
        ? '云函数未部署，请先部署 getPhoneNumber 云函数'
        : '手机号获取失败，请稍后重试';
      this.setData({ errMsg: tip });
      util.toast(tip);
      // 云函数未部署属于管理员需要立即处理的故障 → 通知管理员
      if (isNotFound) {
        store.notifyAdmin('login_fail', { reason: 'getPhoneNumber 云函数未部署或部署失败' });
      }
    });
  },

  // 错误码 → 可读文案（对照 getPhoneNumber 云函数返回）
  errnoText(r) {
    const map = {
      1400001: '手机号组件次数已达上限（需在 MP 后台购买资源包）',
      1400002: '手机号授权码已失效，请重新点击授权',
      40004: '您取消了手机号授权',
      104: '请先在微信中同意隐私协议后再授权手机号',
      112: '隐私接口未声明（MP 后台 → 设置 → 服务内容声明 → 手机号）'
    };
    const errno = r && r.errno;
    return (errno && map[errno]) ? map[errno] : ((r && r.errMsg) || '操作失败，请稍后重试');
  },

  // ============ 登录成功：保存登录态（含基本信息）→ 跳转 ============
  // userInfo: { openid, phoneNumber, nickName, avatarUrl, grade, role }
  loginSuccess(userInfo) {
    // chooseAvatar 返回的是临时路径，先上传云存储换永久 fileID，失败则降级用临时路径
    const avatarTmp = userInfo.avatarUrl || '';
    const doSave = (avatarFinal) => {
      userInfo.avatarUrl = avatarFinal || '';
      this.saveUserAndRedirect(userInfo);
    };
    if (avatarTmp && avatarTmp.indexOf('cloud://') !== 0) {
      util.showLoading('保存资料中...');
      store.uploadAvatarCloud(userInfo.openid || '', avatarTmp)
        .then(fileID => { util.hideLoading(); doSave(fileID || avatarTmp); })
        .catch(() => { util.hideLoading(); doSave(avatarTmp); });
    } else {
      doSave(avatarTmp);
    }
  },

  // 写入本地用户体系 + 同步云端 + 跳转
  saveUserAndRedirect(userInfo) {
    const grade = userInfo.grade || '高一';
    const role = userInfo.role || 'student';

    // 写入本地用户体系（测评/社区/积分依赖 store.getCurrentUser）
    let localUser = userInfo.phoneNumber ? store.findUserByPhone(userInfo.phoneNumber) : null;
    const isNewUser = !localUser; // 是否新注册（用于管理员通知）
    if (localUser) {
      // 老用户：更新本次填写的资料
      localUser.openid = userInfo.openid || localUser.openid;
      localUser.nickName = userInfo.nickName || localUser.nickName;
      localUser.grade = grade;
      localUser.role = role;
      if (userInfo.avatarUrl) {
        localUser.avatarUrl = userInfo.avatarUrl;
        localUser.avatar = userInfo.avatarUrl;
      }
      localUser.lastLoginTime = new Date().toISOString();
      store.saveCurrentUser(localUser);
    } else {
      // 新用户：按填写的基本信息建档
      localUser = store.createUser({
        openid: userInfo.openid || '',
        phoneNumber: userInfo.phoneNumber || '',
        phone: userInfo.phoneNumber || '',
        nickName: userInfo.nickName || '常青藤同学',
        avatarUrl: userInfo.avatarUrl || '',
        avatar: userInfo.avatarUrl || '',
        grade: grade,
        role: role
      });
    }
    app.setUserInfo(localUser);

    // 同步云数据库（供后台管理员查看年级/身份/手机号等）
    store.createOrUpdateUserCloud({
      openid: localUser.openid || '',
      phoneNumber: localUser.phoneNumber || '',
      nickName: localUser.nickName || '',
      avatarUrl: localUser.avatarUrl || '',
      grade: localUser.grade || '高一',
      role: localUser.role || 'student',
      subjectCombo: localUser.subjectCombo || ''
    }).then(cloudUser => {
      if (cloudUser && isNewUser) {
        // 新用户注册成功 → 通知管理员
        store.notifyAdmin('register', {
          nickName: localUser.nickName,
          grade: localUser.grade,
          role: localUser.role,
          phoneNumber: localUser.phoneNumber
        });
      } else if (!cloudUser) {
        // 云同步返回 null（云函数异常/未部署）→ 通知管理员排查
        store.notifyAdmin('sync_fail', {
          nickName: localUser.nickName,
          phoneNumber: localUser.phoneNumber,
          reason: '云端写入返回空，请检查 getPhoneNumber 云函数与数据库权限'
        });
      }
    }).catch(err => {
      console.warn('[云同步] 失败', err);
      store.notifyAdmin('sync_fail', {
        nickName: localUser.nickName,
        phoneNumber: localUser.phoneNumber,
        reason: err.message || String(err)
      });
    });

    util.toast('登录成功', 'success');
    // 跳转策略：有 redirect → redirectTo 回来源页（如测评拦截后的答题页）；
    // 无 redirect → switchTab 首页（tabBar 页必须用 switchTab，redirectTo 会失败）
    const redirect = this.data.redirect;
    setTimeout(() => {
      if (redirect) {
        wx.redirectTo({
          url: decodeURIComponent(redirect),
          fail: () => wx.switchTab({ url: '/pages/index/index' })
        });
      } else {
        wx.switchTab({ url: '/pages/index/index' });
      }
    }, 400);
  },

  // 暂不登录
  skipLogin() {
    if (this.data.redirect) {
      wx.redirectTo({
        url: decodeURIComponent(this.data.redirect),
        fail: () => wx.switchTab({ url: '/pages/index/index' })
      });
    } else {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  // 转发分享
  onShareAppMessage() {
    return {
      title: '常青藤在线测评 · 高中生升学规划测评',
      path: '/pages/index/index'
    };
  }

});

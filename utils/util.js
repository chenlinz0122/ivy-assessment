// utils/util.js - 通用工具函数
// 参考微信小程序开源项目库 (zxxuan0525/wechat-weapp) 中的优秀组件

// 格式化日期 yyyy-mm-dd hh:mm
function formatTime(date) {
  date = date || new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

// 格式化日期 yyyy-mm-dd
function formatDate(date) {
  date = date || new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 生成唯一ID
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

// 显示提示
function toast(title, icon) {
  wx.showToast({
    title: title || '',
    icon: icon || 'none',
    duration: 2000
  });
}

// 显示加载
function showLoading(title) {
  wx.showLoading({ title: title || '加载中', mask: true });
}

function hideLoading() {
  wx.hideLoading();
}

// 根据积分计算等级
function getLevel(points) {
  if (points >= 200) return { level: 5, name: '升学大师', icon: '🏆' };
  if (points >= 120) return { level: 4, name: '升学达人', icon: '💎' };
  if (points >= 60) return { level: 3, name: '规划师', icon: '🌟' };
  if (points >= 20) return { level: 2, name: '探索者', icon: '🌱' };
  return { level: 1, name: '新生', icon: '🍃' };
}

// 数字千分位
function toThousands(num) {
  return (num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 防抖
function debounce(fn, wait) {
  let timer = null;
  return function () {
    const ctx = this, args = arguments;
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(ctx, args), wait || 300);
  };
}

// ============ 图片预加载工具 (参考 wxapp-img-loader) ============
// 预加载一组图片，全部加载完成后执行回调
function preloadImages(urls, callback) {
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    if (callback) callback();
    return;
  }
  
  let loadedCount = 0;
  const total = urls.length;
  
  urls.forEach(url => {
    const img = wx.createImage();
    img.onload = function() {
      loadedCount++;
      if (loadedCount === total && callback) {
        callback();
      }
    };
    img.onerror = function() {
      loadedCount++;
      if (loadedCount === total && callback) {
        callback();
      }
    };
    img.src = url;
  });
}

// ============ 滚动加载工具 (参考 WeiXinProject 上拉加载) ============
// 生成分页参数
function getPaginationParams(pageSize, currentPage) {
  return {
    pageSize: pageSize || 10,
    pageNum: currentPage || 1,
    offset: (pageSize || 10) * ((currentPage || 1) - 1)
  };
}

// 判断是否还有更多数据
function hasMoreData(currentPage, totalCount, pageSize) {
  if (!totalCount || !pageSize) return false;
  return currentPage * pageSize < totalCount;
}

// 简单的节流函数
function throttle(fn, wait) {
  let lastTime = 0;
  return function () {
    const now = Date.now();
    const ctx = this;
    const args = arguments;
    if (now - lastTime >= wait) {
      lastTime = now;
      fn.apply(ctx, args);
    }
  };
}

// ============ 富文本安全处理工具 ============
// 简单的HTML标签过滤（防止XSS）
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// 提取内容摘要（截取指定长度）
function getSummary(html, maxLength) {
  const text = stripHtml(html);
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// 格式化相对时间（几分钟前、几小时前、几天前）
function formatRelativeTime(date) {
  if (!date) return '';
  const now = new Date();
  const target = new Date(date);
  const diff = now - target;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return formatDate(target);
}

module.exports = {
  formatTime,
  formatDate,
  genId,
  toast,
  showLoading,
  hideLoading,
  getLevel,
  toThousands,
  debounce,
  preloadImages,
  getPaginationParams,
  hasMoreData,
  throttle,
  stripHtml,
  getSummary,
  formatRelativeTime
};

// utils/notificationCenter.js - 轻量通知/广播中心（参考 WxNotificationCenter 实现）
// 用于跨页面事件订阅发布，例如登录状态变更、积分变更等。

const observers = {};

function hasKey(key) {
  return Object.prototype.hasOwnProperty.call(observers, key);
}

module.exports = {
  /**
   * 订阅事件
   * @param {string} name 事件名，如 'loginChanged'
   * @param {Function} callback 回调 (data) => {}
   * @returns {Function} 取消订阅函数
   */
  subscribe(name, callback) {
    if (!hasKey(name)) observers[name] = [];
    const list = observers[name];
    if (list.indexOf(callback) < 0) list.push(callback);
    return function unsubscribe() {
      const idx = list.indexOf(callback);
      if (idx >= 0) list.splice(idx, 1);
    };
  },

  /**
   * 发布事件（广播）
   * @param {string} name 事件名
   * @param {*} data 传递给订阅者的数据
   */
  publish(name, data) {
    if (!hasKey(name)) return;
    // 拷贝一份，避免回调中增删订阅影响本次遍历
    observers[name].slice().forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.warn('[notificationCenter] observer error for "' + name + '"', e);
      }
    });
  },

  /**
   * 移除某个事件（通常不需要手动调用）
   */
  remove(name) {
    if (hasKey(name)) delete observers[name];
  },

  // 预定义事件名，避免魔法字符串
  EVENTS: {
    LOGIN_CHANGED: 'loginChanged',   // 登录/退出登录（data: userInfo 或 null）
    POINTS_CHANGED: 'pointsChanged', // 积分变更
    POST_CHANGED: 'postChanged'      // 帖子增删改
  }
};
// components/progress-bar/progress-bar.js
Component({
  properties: {
    current: { type: Number, value: 0 },
    total: { type: Number, value: 100 }
  },
  data: {
    percent: 0
  },
  observers: {
    'current,total': function (current, total) {
      const percent = total > 0 ? Math.round(current / total * 100) : 0;
      this.setData({ percent });
    }
  }
});

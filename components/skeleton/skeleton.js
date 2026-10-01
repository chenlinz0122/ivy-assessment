// components/skeleton/skeleton.js - 加载骨架屏组件
// 用法示例：
// <skeleton
//   show-header="{{true}}"
//   show-body="{{true}}"
//   body-count="3"
//   body-layouts='["line","line","para"]'
//   show-grid="{{true}}"
//   grid-cols="2"
//   grid-count="4"
//   sk-padding="24rpx"
// ></skeleton>

Component({
  properties: {
    showHeader: { type: Boolean, value: false },
    showBody: { type: Boolean, value: false },
    showGrid: { type: Boolean, value: false },
    bodyCount: { type: Number, value: 3 },
    bodyLayouts: { type: String, value: '["line","line","para"]' },
    gridCols: { type: Number, value: 2 },
    gridCount: { type: Number, value: 4 },
    skPadding: { type: String, value: '24rpx' }
  },
  data: {
    bodyItems: []
  },
  ready() {
    let layouts = [];
    try { layouts = JSON.parse(this.data.bodyLayouts || '[]'); } catch (e) { layouts = []; }
    if (!layouts || layouts.length === 0) layouts = ['line', 'line', 'para'];
    const items = [];
    for (let i = 0; i < this.data.bodyCount; i++) {
      items.push({ layout: layouts[i % layouts.length], width: '80%' });
    }
    this.setData({ bodyItems: items });
  }
});
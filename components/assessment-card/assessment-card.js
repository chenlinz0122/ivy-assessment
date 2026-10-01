// components/assessment-card/assessment-card.js
Component({
  properties: {
    // 测评数据对象
    item: {
      type: Object,
      value: {}
    }
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { id: this.data.item.id });
    }
  }
});

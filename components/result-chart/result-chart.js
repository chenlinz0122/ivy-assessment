// components/result-chart/result-chart.js
// 支持 bar（柱状）/ radar（雷达）/ gauge（仪表盘）/ pie（饼图）四种图表，纯原生实现无依赖
// 参考 wx-charts / wxapp-charts 项目的实现思路

Component({
  properties: {
    chart: { type: Object, value: null } // { type, title, data:[{label,value}], value, level, colors? }
  },
  data: {
    barData: [],       // 处理后的柱状图数据（含百分比）
    pieData: [],       // 处理后的饼图数据
    showBarAnim: false, // 柱状图动画显示标志
    chartLoaded: false // 图表是否加载完成
  },

  lifetimes: {
    attached() {
      this.processChart(this.data.chart);
      if (this.data.chart && this.data.chart.type === 'radar') {
        setTimeout(() => this.drawRadar(), 100);
      }
    }
  },

  observers: {
    'chart': function (chart) {
      this.processChart(chart);
      if (chart && chart.type === 'radar') {
        setTimeout(() => this.drawRadar(), 100);
      }
    }
  },

  methods: {
    // 处理图表数据，根据类型计算百分比或比例
    processChart(chart) {
      if (!chart) {
        this.setData({ barData: [], pieData: [], chartLoaded: false });
        return;
      }
      this.setData({ chartLoaded: true });

      if (chart.type === 'bar') {
        if (!chart.data || chart.data.length === 0) {
          this.setData({ barData: [] });
          return;
        }
        const max = Math.max(...chart.data.map(d => d.value), 1);
        const barData = chart.data.map((d, idx) => ({
          label: d.label,
          value: d.value,
          percent: Math.round(d.value / max * 100),
          color: (chart.colors && chart.colors[idx]) || this.getBarColor(idx, chart.data.length)
        }));
        this.setData({ barData, showBarAnim: false }, () => {
          setTimeout(() => this.setData({ showBarAnim: true }), 100);
        });
      } else if (chart.type === 'pie') {
        if (!chart.data || chart.data.length === 0) {
          this.setData({ pieData: [] });
          return;
        }
        const total = chart.data.reduce((sum, d) => sum + d.value, 0);
        const colors = chart.colors || ['#2E8B57', '#3CB371', '#66CDAA', '#48D1CC', '#40E0D0', '#7FFFD4', '#00FA9A', '#00CED1'];
        const pieData = chart.data.map((d, idx) => ({
          ...d,
          percent: total > 0 ? Math.round(d.value / total * 100) : 0,
          color: colors[idx % colors.length]
        }));
        this.setData({ pieData });
      } else if (chart.type === 'radar') {
        setTimeout(() => this.drawRadar(), 150);
      }
    },

    // 绘制雷达图（canvas 2d）- 改进版：使用createSelectorQuery在数据就绪时同步绘制
    drawRadar() {
      const chart = this.data.chart;
      if (!chart || !chart.data || chart.data.length < 3) return;

      const query = this.createSelectorQuery();
      query.select('#radarCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio || 2;
        const width = res[0].width;
        const height = res[0].height;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(width, height) / 2 - 50;
        const sides = chart.data.length;
        const maxVal = Math.max(...chart.data.map(d => d.value), 1);
        const colors = chart.colors || ['#2E8B57', '#3CB371', '#66CDAA', '#48D1CC', '#40E0D0', '#7FFFD4', '#00FA9A', '#00CED1'];

        // 清空画布
        ctx.clearRect(0, 0, width, height);

        // 画网格（4层同心多边形）
        for (let layer = 1; layer <= 4; layer++) {
          const r = radius * layer / 4;
          ctx.beginPath();
          for (let i = 0; i < sides; i++) {
            const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = '#D8E6DC';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // 画轴线（从中心到每个顶点）
        for (let i = 0; i < sides; i++) {
          const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
          ctx.strokeStyle = '#D8E6DC';
          ctx.stroke();
        }

        // 画数据多边形（使用渐变填充）
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
          const val = chart.data[i].value / maxVal * radius;
          const x = cx + val * Math.cos(angle);
          const y = cy + val * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(46, 139, 87, 0.35)');
        gradient.addColorStop(1, 'rgba(46, 139, 87, 0.10)');
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = '#2E8B57';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 画数据点（带外圈高光）
        for (let i = 0; i < sides; i++) {
          const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
          const val = chart.data[i].value / maxVal * radius;
          const x = cx + val * Math.cos(angle);
          const y = cy + val * Math.sin(angle);
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = colors[i % colors.length];
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        }

        // 画标签（带背景色）
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < sides; i++) {
          const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
          const lx = cx + (radius + 28) * Math.cos(angle);
          const ly = cy + (radius + 28) * Math.sin(angle);
          const metrics = ctx.measureText(chart.data[i].label);
          const textWidth = metrics.width;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(lx - textWidth / 2 - 4, ly - 8, textWidth + 8, 16);
          ctx.strokeStyle = '#E8EDE9';
          ctx.strokeRect(lx - textWidth / 2 - 4, ly - 8, textWidth + 8, 16);
          ctx.fillStyle = '#2C3E2D';
          ctx.fillText(chart.data[i].label, lx, ly);
        }

        // 画中心圆点
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#2E8B57';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      });
    },

    // 获取柱状图颜色（根据索引生成不同色调的绿色系）
    getBarColor(index, total) {
      if (total <= 1) return '#2E8B57';
      const colors = ['#2E8B57', '#3CB371', '#66CDAA', '#48D1CC', '#40E0D0', '#7FFFD4', '#00FA9A', '#00CED1'];
      return colors[index % colors.length];
    }
  }
});

// components/chart/chart.js - 轻量图表组件（柱状图 / 雷达图 / 饼图 / 折线图）

Component({
  options: { multipleSlots: true },

  properties: {
    type: { type: String, value: 'bar' },
    title: { type: String, value: '' },
    data: { type: Array, value: [] },
    radarData: { type: Object, value: {} },
    color: { type: String, value: '#2E8B57' },
    maxValue: { type: Number, value: 100 },
    showValue: { type: Boolean, value: true },
    animate: { type: Boolean, value: true }
  },

  data: {
    canvasSize: 200,
    barItems: [],
    radarPoints: [],
    radarPolyPoints: [],
    pieSegments: []
  },

  ready() { this.draw(); },

  methods: {
    draw() {
      const type = this.properties.type;
      if (type === 'bar' || type === 'line') this.drawBar();
      else if (type === 'radar') this.drawRadar();
      else if (type === 'pie') this.drawPie();
    },

    drawBar() {
      const data = this.properties.data;
      if (!data || data.length === 0) { this.setData({ barItems: [] }); return; }
      const max = this.properties.maxValue || Math.max(...data.map(d => d.value), 1);
      const items = data.map((d, i) => ({
        label: d.label,
        value: d.value,
        pct: Math.min((d.value / max) * 100, 100),
        color: this.hslColor(i, data.length)
      }));
      this.setData({ barItems: items });
    },

    drawRadar() {
      const rd = this.properties.radarData;
      const keys = Object.keys(rd || {});
      if (keys.length === 0) return;
      const n = keys.length;
      const max = this.properties.maxValue || Math.max(...keys.map(k => rd[k]), 1);
      const size = this.data.canvasSize;
      const cx = size / 2, cy = size / 2, radius = size * 0.45;
      const points = [];
      keys.forEach((k, i) => {
        const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
        const r = (rd[k] / max) * radius;
        points.push({
          label: k, value: rd[k],
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
          color: this.hslColor(i, n)
        });
      });
      const polyPoints = points.map(p => p.x + ',' + p.y).join(' ');
      this.setData({ radarPoints: points, radarPolyPoints: polyPoints, radarMax: max });
      this._drawRadarCanvas(cx, cy, radius, points, polyPoints, n);
    },

    _drawRadarCanvas(cx, cy, radius, points, polyPoints, n) {
      const query = this.createSelectorQuery();
      query.select('.chart-canvas').fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0]) return;
        const ctx = res[0].context;
        ctx.clearRect(0, 0, res[0].width, res[0].height);
        [0.25, 0.5, 0.75].forEach(factor => {
          const r = radius * factor;
          const pts = [];
          for (let i = 0; i < n; i++) {
            const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
            pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
          }
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.closePath();
          ctx.strokeStyle = '#E8EDE9';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
        points.forEach(p => {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = '#E8EDE9';
          ctx.stroke();
        });
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < n; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(46,139,87,0.15)';
        ctx.fill();
        ctx.strokeStyle = '#2E8B57';
        ctx.lineWidth = 2;
        ctx.stroke();
        points.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          const lx = p.x + (p.x - cx > 0 ? 8 : -8);
          const anchor = p.x - cx > 0 ? 'left' : 'right';
          ctx.fillStyle = '#2C3E2D';
          ctx.font = '12px sans-serif';
          ctx.textAlign = anchor;
          ctx.textBaseline = 'middle';
          ctx.fillText(p.label + ' ' + p.value, lx, p.y);
        });
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#2E8B57';
        ctx.fill();
      });
    },

    drawPie() {
      const data = this.properties.data;
      if (!data || data.length === 0) { this.setData({ pieSegments: [] }); return; }
      const total = data.reduce((s, d) => s + d.value, 0) || 1;
      let startAngle = 0;
      const segments = data.map((d, i) => {
        const slice = (d.value / total) * 360;
        const seg = {
          label: d.label, value: d.value,
          pct: ((d.value / total) * 100).toFixed(1),
          start: startAngle, end: startAngle + slice,
          color: this.hslColor(i, data.length)
        };
        startAngle += slice;
        return seg;
      });
      this.setData({ pieSegments: segments });
      this._drawPieCanvas(segments);
    },

    _drawPieCanvas(segments) {
      const query = this.createSelectorQuery();
      query.select('.chart-canvas').fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0]) return;
        const ctx = res[0].context;
        ctx.clearRect(0, 0, res[0].width, res[0].height);
        const cx = res[0].width / 2, cy = res[0].height / 2, radius = Math.min(cx, cy) * 0.75;
        segments.forEach(seg => {
          const startRad = (seg.start - 90) * Math.PI / 180;
          const endRad = (seg.end - 90) * Math.PI / 180;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, radius, startRad, endRad, false);
          ctx.closePath();
          ctx.fillStyle = seg.color;
          ctx.fill();
        });
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      });
    },

    hslColor(index, total) {
      const base = this.properties.color || '#2E8B57';
      const r = parseInt(base.slice(1, 3), 16);
      const g = parseInt(base.slice(3, 5), 16);
      const b = parseInt(base.slice(5, 7), 16);
      const shift = (index / (total || 1)) * 60 - 30;
      const nr = Math.min(255, Math.max(0, r + shift * 1.5));
      const ng = Math.min(255, Math.max(0, g + shift * 0.5));
      const nb = Math.min(255, Math.max(0, b - shift * 0.5));
      const R = Math.round(nr), G = Math.round(ng), B = Math.round(nb);
      return 'rgb(' + R + ',' + G + ',' + B + ')';
    }
  }
});

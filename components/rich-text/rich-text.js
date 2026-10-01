// components/rich-text/rich-text.js - 轻量富文本解析组件（参考 wxParse 精简版）
// 输入：html 字符串。输出：原生 rich-text 组件可用的 nodes 数组。

Component({
  properties: {
    html: { type: String, value: '' }
  },
  data: {
    nodes: []
  },
  observers: {
    html() {
      this.parse();
    }
  },
  lifetimes: {
    attached() {
      this.parse();
    }
  },
  methods: {
    parse() {
      const html = (this.data.html || '').trim();
      if (!html) {
        this.setData({ nodes: [] });
        return;
      }
      try {
        const nodes = this.buildNodes(html);
        this.setData({ nodes });
      } catch (e) {
        console.warn('rich-text parse error', e);
        this.setData({ nodes: [{ type: 'text', text: html }] });
      }
    },
    // 解析为微信原生 rich-text 节点格式：
    // 文本节点 { type:'text', text }；元素节点 { name, attrs, children }
    buildNodes(html) {
      const selfClosing = ['br', 'hr', 'img', 'input', 'image'];
      const root = { name: 'div', attrs: {}, children: [] };
      const stack = [root];
      const pattern = /<[^>]+>|[^<]+/g;
      const openTag = /^<([a-zA-Z0-9]+)\s*([^>]*?)(\/?)>$/;
      const closeTag = /^<\/([a-zA-Z0-9]+)>$/;
      let m;

      while ((m = pattern.exec(html)) !== null) {
        const token = m[0];
        const top = stack[stack.length - 1];
        if (token.charAt(0) !== '<') {
          // 文本节点
          top.children.push({ type: 'text', text: token });
          continue;
        }
        const close = token.match(closeTag);
        if (close) {
          const name = close[1].toLowerCase();
          // 回退到最近的同名开标签
          for (let i = stack.length - 1; i > 0; i--) {
            if (stack[i].name === name) {
              stack.length = i;
              break;
            }
          }
          continue;
        }
        const open = token.match(openTag);
        if (open) {
          const name = open[1].toLowerCase();
          const attrs = this.parseAttrs(open[2]);
          const isSelfClose = open[3] === '/' || selfClosing.indexOf(name) >= 0;
          // img → 内置 image 不被 rich-text 支持，统一转成原生 img 节点（rich-text 受支持）
          const node = { name: name === 'image' ? 'img' : name, attrs, children: [] };
          if (isSelfClose) {
            top.children.push(node);
          } else {
            top.children.push(node);
            stack.push(node);
          }
        }
        // 未知标签（如 <!DOCTYPE>、注释）直接忽略
      }
      return root.children;
    },
    parseAttrs(str) {
      const attrs = {};
      if (!str) return attrs;
      const pairs = str.match(/([a-zA-Z-]+)\s*=\s*"([^"]*)"/g) || [];
      for (const p of pairs) {
        const idx = p.indexOf('=');
        const name = p.slice(0, idx).trim();
        const val = p.slice(idx + 1).replace(/^"/, '').replace(/"$/, '');
        // rich-text 不支持事件类属性，过滤保安全
        if (name.indexOf('on') === 0) continue;
        attrs[name] = val;
      }
      return attrs;
    }
  }
});
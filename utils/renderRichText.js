// utils/renderRichText.js - 简单的富文本解析器（参考 wxParse 精简版）
// 支持基础 HTML 标签解析，用于社区帖子内容展示

function renderRichText(html) {
  if (!html) return '';
  
  let content = html
    // 处理换行
    .replace(/\n/g, '<br/>')
    // 处理段落
    .replace(/<p>/g, '<view class="rt-paragraph">')
    .replace(/<\/p>/g, '</view>')
    // 处理粗体
    .replace(/<b[^>]*>/g, '<text class="rt-bold">')
    .replace(/<\/b>/g, '</text>')
    .replace(/<strong>/g, '<text class="rt-bold">')
    .replace(/<\/strong>/g, '</text>')
    // 处理斜体
    .replace(/<i[^>]*>/g, '<text class="rt-italic">')
    .replace(/<\/i>/g, '</text>')
    .replace(/<em>/g, '<text class="rt-italic">')
    .replace(/<\/em>/g, '</text>')
    // 处理下划线
    .replace(/<u[^>]*>/g, '<text class="rt-underline">')
    .replace(/<\/u>/g, '</text>')
    // 处理链接
    .replace(/<a\s+href="([^"]+)"[^>]*>/g, '<text class="rt-link" data-href="\\1">')
    .replace(/<\/a>/g, '</text>')
    // 处理图片
    .replace(/<img\s+src="([^"]+)"[^>]*>/g, '<image class="rt-image" src="\\1" mode="aspectFit"/>')
    // 处理换行标签
    .replace(/<br\s*\/?>/gi, '<br/>')
    // 处理无序列表
    .replace(/<ul[^>]*>/g, '<view class="rt-list rt-list-ul">')
    .replace(/<\/ul>/g, '</view>')
    .replace(/<li[^>]*>/g, '<view class="rt-list-item">')
    .replace(/<\/li>/g, '</view>')
    // 处理有序列表
    .replace(/<ol[^>]*>/g, '<view class="rt-list rt-list-ol">')
    .replace(/<\/ol>/g, '</view>')
    // 处理标题
    .replace(/<h1[^>]*>/g, '<view class="rt-title rt-title-h1">')
    .replace(/<\/h1>/g, '</view>')
    .replace(/<h2[^>]*>/g, '<view class="rt-title rt-title-h2">')
    .replace(/<\/h2>/g, '</view>')
    .replace(/<h3[^>]*>/g, '<view class="rt-title rt-title-h3">')
    .replace(/<\/h3>/g, '</view>')
    // 清理未关闭的标签
    .replace(/<[^>]+>/g, '');
  
  return content;
}

// 转义特殊字符
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 将富文本转换为 WXML 可用的字符串（用于 wxParse 风格的数组格式）
function parseRichTextToNodes(html) {
  if (!html) return [];
  
  const nodes = [];
  const parser = new DOMParser();
  
  try {
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;
    
    function traverse(element) {
      const node = {
        name: element.tagName ? element.tagName.toLowerCase() : 'text',
        attrs: {},
        children: [],
        text: ''
      };
      
      // 处理属性
      if (element.attributes) {
        for (let attr of element.attributes) {
          node.attrs[attr.name] = attr.value;
        }
      }
      
      // 处理子节点
      for (let child of element.childNodes) {
        if (child.nodeType === 3) { // 文本节点
          node.text = child.textContent;
        } else if (child.nodeType === 1) { // 元素节点
          node.children.push(traverse(child));
        }
      }
      
      return node;
    }
    
    for (let child of body.childNodes) {
      nodes.push(traverse(child));
    }
  } catch (e) {
    console.warn('富文本解析失败，使用简单解析', e);
    nodes.push({
      name: 'text',
      text: html
    });
  }
  
  return nodes;
}

module.exports = {
  renderRichText,
  escapeHtml,
  parseRichTextToNodes
};
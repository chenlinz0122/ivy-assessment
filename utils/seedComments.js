// utils/seedComments.js - 虚假评论生成工具
// 为所有帖子生成高中生风格的真实评论，确保评论数与评论列表一致
const store = require('./store.js');

// 高中生风格昵称池
const nicknames = [
  '追光少年', '爱吃草莓的小何', '物理渣渣', '浙大等我', '匿名的小王',
  '熬夜冠军', '数学困难户', '化学小天才', '英语课代表', '历史爱好者',
  '地理小白', '生物课代表', '政治达人', '技术小能手', '语文小能手',
  '高三冲刺中', '高二摸鱼中', '高一新生', '南波万', '努力学习的小李',
  '咸鱼翻身中', '目标清北', '佛系高三党', '理科苦手', '文科之光',
  '小张同学', '爱睡觉的猫', '柠檬不萌', '星辰大海', '冲鸭冲鸭'
];

// 随机头像颜色池（用于评论头像背景）
const avatarColors = [
  '#FF9800', '#4CAF50', '#2196F3', '#9C27B0', '#F44336',
  '#00BCD4', '#8BC34A', '#FF5722', '#3F51B5', '#E91E63',
  '#009688', '#CDDC39', '#FFC107', '#795548', '#607D8B',
  '#26A69A', '#EC407A', '#5C6BC0', '#FFA726', '#66BB6A'
];

// 通用评论内容池（像真实高中生互动）
const commentTexts = [
  '同感！我也是这样想的😭',
  '加油，你可以的！',
  '我也选了物化生，太难了但坚持住',
  '谢谢分享，很有用！',
  '我跟你一样，一起努力吧',
  '我们学校也是这种情况……',
  '哇，好厉害！向你学习',
  '抱抱，别太焦虑~',
  '学长学姐说选科要趁早，共勉',
  '这个组合专业覆盖率确实高',
  '我也是这么选的，感觉很适合',
  '加油冲！目标同一所大学',
  '太真实了，泪目',
  '感谢楼主分享经验',
  '我也想学这个专业，有机会交流下',
  '坚持就是胜利，加油！',
  '同款困惑，蹲一个解答',
  '可以可以，学到了',
  '抱团取暖，一起进步',
  '别给自己太大压力，健康第一',
  '楼主太强了，佩服佩服',
  '我也在纠结，看完有帮助',
  '一起打卡，互相监督！',
  '这个分析很到位，收藏了',
  '加油加油，未来可期✨'
];

// 按话题分类定制的评论内容
const categoryComments = {
  select: [
    '选科真的要慎重，我当初也纠结好久',
    '物化生组合确实硬核，加油！',
    '历史组合也挺好的，别灰心',
    '选科要看兴趣+优势，不能只看分数',
    '计算机大部分要物理，建议选物理',
    '7选3真的太难选了，感同身受'
  ],
  mbti: [
    '我也是ENFP！终于找到组织了',
    'INTJ路过，确实适合理科',
    'MBTI还是有点参考价值的',
    '人格类型不能完全决定选科啦',
    '同款人格，握爪',
    '测完MBTI感觉更了解自己了'
  ],
  holland: [
    '我的霍兰德代码也是R开头的',
    '兴趣测评挺准的，推荐试试',
    'RIA很适合设计类方向',
    '兴趣代码对选专业很有帮助',
    '霍兰德测评帮我理清了方向'
  ],
  study: [
    '一起打卡！今天完成了化学卷',
    '太强了，向你学习',
    '6点起床真的厉害，我做不到😭',
    '坚持30天，你一定可以的',
    '打卡打卡，今天背了50个单词',
    '高三党共勉，冲！'
  ],
  treehole: [
    '抱抱，别太焦虑~',
    '模拟考不代表高考，加油',
    '压力大的话可以找老师聊聊',
    '你也已经很努力了，别自责',
    '我也是这样过来的，会好起来的',
    '偶尔放松一下不是罪，加油'
  ],
  major: [
    '心理学真的很有意思，坚持兴趣！',
    '家人意见可以参考但要听自己内心',
    '心理学就业其实还可以的',
    '喜欢就坚持，加油！',
    '专业选择还是要看兴趣',
    '我也想学心理学，一起交流'
  ]
};

// 按测评报告类型定制的评论内容
const reportComments = {
  holland: ['霍兰德测评确实挺准的', '我的兴趣代码也偏研究型', '兴趣派分析很到位'],
  subject: ['学科优势雷达图很直观', '物化地组合专业覆盖率高', '选科避弱选强是明智的'],
  mbti: ['MBTI对学习方式建议挺有用', 'INTJ学霸人格！', '人格测评有参考价值'],
  bigFive: ['大五人格分析很全面', '性格测评帮我认识自己'],
  learningStyle: ['学习风格测评推荐试试', '找到适合自己的学习方式很重要'],
  majorMatch: ['专业匹配测评很实用', '专业方向推荐挺靠谱'],
  stress: ['压力自评很有必要', '关注心理健康，点赞'],
  multiIntelligence: ['多元智能理论很有启发', '智能测评帮我发现优势']
};

// 随机取一个元素
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 随机整数 [min, max]
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 取昵称首字（用于头像显示）
function getInitial(name) {
  if (!name) return '?';
  // 取第一个字符（兼容中英文）
  return name.charAt(0);
}

// 为单个帖子生成一条虚假评论
function buildComment(post, index, now) {
  const isAnon = Math.random() < 0.15;
  const nick = isAnon ? '匿名同学' : pick(nicknames);
  const color = pick(avatarColors);

  // 根据帖子类型选择评论内容
  let content;
  if (post.postType === 'topic' && categoryComments[post.category]) {
    content = Math.random() < 0.6 ? pick(categoryComments[post.category]) : pick(commentTexts);
  } else if (post.postType === 'report' && reportComments[post.assessType]) {
    content = Math.random() < 0.6 ? pick(reportComments[post.assessType]) : pick(commentTexts);
  } else {
    content = pick(commentTexts);
  }

  // 评论时间随机分布在过去3天内
  const THREE_DAYS = 3 * 24 * 3600 * 1000;
  const offset = randInt(0, THREE_DAYS);
  const createdAt = new Date(now - offset).toISOString();

  return {
    _id: 'fc_' + post._id + '_' + index + '_' + randInt(1000, 9999),
    postId: post._id,
    uid: 'fake_' + randInt(1000, 9999),
    nickName: nick,
    avatar: '',                 // 不使用图片头像
    avatarColor: color,         // 随机颜色背景
    initial: getInitial(nick),  // 昵称首字
    anonymous: isAnon,
    content,
    createdAt
  };
}

// 为所有帖子生成虚假评论（幂等：已有评论的帖子只同步评论数）
function ensureCommentsForAllPosts() {
  const posts = store.getPosts() || [];
  const now = Date.now();

  posts.forEach(post => {
    const existing = store.getComments(post._id);
    if (existing.length > 0) {
      // 已有评论，同步评论数（修复历史脏数据：如种子帖预设的 comments:18）
      store.updatePost(post._id, { comments: existing.length });
      return;
    }
    // 无评论：先重置评论数为 0（修复历史脏数据），再生成 2-5 条
    store.updatePost(post._id, { comments: 0 });
    const count = randInt(2, 5);
    for (let i = 0; i < count; i++) {
      const comment = buildComment(post, i, now);
      store.addComment(comment); // addComment 会自动给帖子 comments +1
    }
  });
}

module.exports = {
  ensureCommentsForAllPosts,
  buildComment,
  nicknames,
  avatarColors,
  commentTexts
};

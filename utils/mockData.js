// utils/mockData.js - 测评模拟数据与计分逻辑（专业版）
// 题库参考：霍兰德SDS、MBTI 93题、大五人格NEO、VARK学习风格、SAS焦虑自评量表
// 后续可替换为云数据库查询

// 测评分类
const categories = [
  { key: 'all', name: '全部' },
  { key: 'select', name: '选科决策' },
  { key: 'self', name: '自我认知' },
  { key: 'plan', name: '升学规划' },
  { key: 'mind', name: '心理状态' }
];

// 测评列表元数据
const assessments = [
  // ====== 选科决策 ======
  {
    id: 'holland',
    name: '霍兰德职业兴趣测评',
    category: '选科决策',
    duration: '约10分钟',
    participants: 12856,
    icon: '🧭',
    color: '#3CB371',
    desc: '基于霍兰德RIASEC职业兴趣理论，60道情景题测量你的六种兴趣类型，推荐浙江高考"7选3"选科组合与大学专业方向。',
    reportItems: ['兴趣代码', '选科组合推荐', '专业方向', '职业参考']
  },
  {
    id: 'subject',
    name: '学科优势评估',
    category: '选科决策',
    duration: '约6分钟',
    participants: 9842,
    icon: '📊',
    color: '#2E8B57',
    desc: '面向浙江高考"3+3"模式，对语数英+物化生政史地技共10门学科进行能力与兴趣双向评估，生成学科优势雷达图，推荐最优"7选3"选考组合。',
    reportItems: ['十学科优势雷达图', '选科组合TOP5', '专业覆盖率', '选科避坑建议']
  },
  {
    id: 'multiIntelligence',
    name: '多元智能测评',
    category: '选科决策',
    duration: '约8分钟',
    participants: 7631,
    icon: '🧩',
    color: '#66CDAA',
    desc: '基于加德纳多元智能理论，测量八大智能优势，揭示你的天赋所在，关联选科与专业方向。',
    reportItems: ['智能优势排序', '智能与选科关联', '专业方向建议']
  },
  // ====== 自我认知 ======
  {
    id: 'mbti',
    name: 'MBTI职业人格测试',
    category: '自我认知',
    duration: '约15分钟',
    participants: 18920,
    icon: '🎯',
    color: '#20B2AA',
    desc: '通过四个维度48道题测量你的人格类型，给出性格画像、适合的学习方式与专业推荐。',
    reportItems: ['16型人格类型', '性格画像', '适合学习方式', '推荐专业']
  },
  {
    id: 'bigFive',
    name: '大五人格测试',
    category: '自我认知',
    duration: '约10分钟',
    participants: 6543,
    icon: '🌟',
    color: '#48D1CC',
    desc: '从开放性、尽责性、外向性、宜人性、神经质五个维度40道题，全面解析你的性格。',
    reportItems: ['五维度得分图', '性格优劣势', '学习习惯建议']
  },
  {
    id: 'learningStyle',
    name: '学习风格诊断',
    category: '自我认知',
    duration: '约5分钟',
    participants: 8721,
    icon: '📚',
    color: '#5F9EA0',
    desc: '基于VARK模型判断你的学习风格类型（视觉/听觉/读写/动觉），给出专属学习方法与时间管理策略。',
    reportItems: ['学习风格类型', '专属学习方法', '时间管理策略']
  },
  // ====== 升学规划 ======
  {
    id: 'majorMatch',
    name: '大学专业匹配测评',
    category: '升学规划',
    duration: '约10分钟',
    participants: 11203,
    icon: '🎓',
    color: '#2E8B57',
    desc: '测量你与12大学科门类的匹配度，推荐最适合你的大学专业TOP5。',
    reportItems: ['推荐专业TOP5', '对应院校参考', '课程简介', '就业方向']
  },
  // ====== 心理状态 ======
  {
    id: 'stress',
    name: '学习压力与焦虑自评',
    category: '心理状态',
    duration: '约5分钟',
    participants: 9432,
    icon: '💚',
    color: '#90EE90',
    desc: '采用Zung焦虑自评量表（SAS）20题，评估近期压力水平与考试焦虑程度，给出个性化减压建议。',
    reportItems: ['压力等级', '减压建议', '预警提示']
  }
];

// ============ 题库 ============
// 1. 霍兰德职业兴趣测评（60题，每型10题，符合/不符合二选一）
// dim: R现实型/I研究型/A艺术型/S社会型/E企业型/C常规型
const hollandQuestions = [
  // R 现实型（1-10）
  { id:1, title:'我喜欢动手操作、拆装物品', options:[{text:'符合',dim:'R'},{text:'不符合'}] },
  { id:2, title:'我擅长体力劳动、实操类工作', options:[{text:'符合',dim:'R'},{text:'不符合'}] },
  { id:3, title:'我更喜欢和物品、工具打交道，而非与人沟通', options:[{text:'符合',dim:'R'},{text:'不符合'}] },
  { id:4, title:'我动手能力强，喜欢机械、器械相关事物', options:[{text:'符合',dim:'R'},{text:'不符合'}] },
  { id:5, title:'我愿意从事户外、实操、技术类工作', options:[{text:'符合',dim:'R'},{text:'不符合'}] },
  { id:6, title:'我擅长修理简单家电、工具', options:[{text:'符合',dim:'R'},{text:'不符合'}] },
  { id:7, title:'我喜欢体育运动、体力活动', options:[{text:'符合',dim:'R'},{text:'不符合'}] },
  { id:8, title:'我愿意学习各类实操技术、手艺技能', options:[{text:'符合',dim:'R'},{text:'不符合'}] },
  { id:9, title:'我擅长观察实物结构、空间构造', options:[{text:'符合',dim:'R'},{text:'不符合'}] },
  { id:10, title:'我对机械、建筑、汽修、设备操作感兴趣', options:[{text:'符合',dim:'R'},{text:'不符合'}] },
  // I 研究型（11-20）
  { id:11, title:'我喜欢钻研问题、探究事物原理', options:[{text:'符合',dim:'I'},{text:'不符合'}] },
  { id:12, title:'我热爱阅读科普、学术、理论类资料', options:[{text:'符合',dim:'I'},{text:'不符合'}] },
  { id:13, title:'我擅长独立思考、逻辑推理', options:[{text:'符合',dim:'I'},{text:'不符合'}] },
  { id:14, title:'我对数学、物理、科学实验感兴趣', options:[{text:'符合',dim:'I'},{text:'不符合'}] },
  { id:15, title:'我喜欢分析数据、总结规律', options:[{text:'符合',dim:'I'},{text:'不符合'}] },
  { id:16, title:'我乐于解决复杂的难题、抽象问题', options:[{text:'符合',dim:'I'},{text:'不符合'}] },
  { id:17, title:'我享受学习新知识、探索未知领域', options:[{text:'符合',dim:'I'},{text:'不符合'}] },
  { id:18, title:'我做事理性、客观、注重证据', options:[{text:'符合',dim:'I'},{text:'不符合'}] },
  { id:19, title:'我耐心强，能长期专注研究一件事', options:[{text:'符合',dim:'I'},{text:'不符合'}] },
  { id:20, title:'我对科研、数据分析、技术研发感兴趣', options:[{text:'符合',dim:'I'},{text:'不符合'}] },
  // A 艺术型（21-30）
  { id:21, title:'我想象力丰富、思维灵活', options:[{text:'符合',dim:'A'},{text:'不符合'}] },
  { id:22, title:'我喜欢音乐、美术、文学、影视等艺术内容', options:[{text:'符合',dim:'A'},{text:'不符合'}] },
  { id:23, title:'我擅长创意构思、脑洞创作', options:[{text:'符合',dim:'A'},{text:'不符合'}] },
  { id:24, title:'我不喜欢刻板、一成不变的工作', options:[{text:'符合',dim:'A'},{text:'不符合'}] },
  { id:25, title:'我喜欢自由、灵活、有创造性的环境', options:[{text:'符合',dim:'A'},{text:'不符合'}] },
  { id:26, title:'我擅长文字创作、文案、表达类工作', options:[{text:'符合',dim:'A'},{text:'不符合'}] },
  { id:27, title:'我对审美、穿搭、设计、美学敏感', options:[{text:'符合',dim:'A'},{text:'不符合'}] },
  { id:28, title:'我喜欢记录生活、创作作品', options:[{text:'符合',dim:'A'},{text:'不符合'}] },
  { id:29, title:'我情感细腻、感知力强', options:[{text:'符合',dim:'A'},{text:'不符合'}] },
  { id:30, title:'我热爱绘画、摄影、剪辑、艺术创作', options:[{text:'符合',dim:'A'},{text:'不符合'}] },
  // S 社会型（31-40）
  { id:31, title:'我喜欢与人沟通、乐于帮助他人', options:[{text:'符合',dim:'S'},{text:'不符合'}] },
  { id:32, title:'我擅长倾听、开导、安抚别人情绪', options:[{text:'符合',dim:'S'},{text:'不符合'}] },
  { id:33, title:'我喜欢团队协作、集体活动', options:[{text:'符合',dim:'S'},{text:'不符合'}] },
  { id:34, title:'我愿意教学、培训、辅导、带新人', options:[{text:'符合',dim:'S'},{text:'不符合'}] },
  { id:35, title:'我关心他人感受、乐于助人、有责任感', options:[{text:'符合',dim:'S'},{text:'不符合'}] },
  { id:36, title:'我喜欢服务类、支持类、关怀类工作', options:[{text:'符合',dim:'S'},{text:'不符合'}] },
  { id:37, title:'我擅长人际协调、化解矛盾', options:[{text:'符合',dim:'S'},{text:'不符合'}] },
  { id:38, title:'我喜欢公益、志愿、社区、教育、心理相关工作', options:[{text:'符合',dim:'S'},{text:'不符合'}] },
  { id:39, title:'我耐心好，愿意长期陪伴、引导他人', options:[{text:'符合',dim:'S'},{text:'不符合'}] },
  { id:40, title:'我对教师、心理咨询、社工、医护岗位感兴趣', options:[{text:'符合',dim:'S'},{text:'不符合'}] },
  // E 企业型（41-50）
  { id:41, title:'我喜欢当负责人、主导事情、做决策', options:[{text:'符合',dim:'E'},{text:'不符合'}] },
  { id:42, title:'我擅长说服、谈判、推销、影响他人', options:[{text:'符合',dim:'E'},{text:'不符合'}] },
  { id:43, title:'我被挑战、竞争、目标所驱动', options:[{text:'符合',dim:'E'},{text:'不符合'}] },
  { id:44, title:'我喜欢组织活动、带领团队达成目标', options:[{text:'符合',dim:'E'},{text:'不符合'}] },
  { id:45, title:'我做事果断、敢于承担风险', options:[{text:'符合',dim:'E'},{text:'不符合'}] },
  { id:46, title:'我擅长表达、演讲、宣传', options:[{text:'符合',dim:'E'},{text:'不符合'}] },
  { id:47, title:'我关注效率、效益、结果导向', options:[{text:'符合',dim:'E'},{text:'不符合'}] },
  { id:48, title:'我喜欢管理、策划、运营类工作', options:[{text:'符合',dim:'E'},{text:'不符合'}] },
  { id:49, title:'我愿意承担领导责任、推动变革', options:[{text:'符合',dim:'E'},{text:'不符合'}] },
  { id:50, title:'我对企业管理、市场营销、创业感兴趣', options:[{text:'符合',dim:'E'},{text:'不符合'}] },
  // C 常规型（51-60）
  { id:51, title:'我喜欢按部就班、井井有条地做事', options:[{text:'符合',dim:'C'},{text:'不符合'}] },
  { id:52, title:'我做事细致、注重细节与准确', options:[{text:'符合',dim:'C'},{text:'不符合'}] },
  { id:53, title:'我擅长整理资料、归档、记录数据', options:[{text:'符合',dim:'C'},{text:'不符合'}] },
  { id:54, title:'我喜欢有明确规则和流程的工作', options:[{text:'符合',dim:'C'},{text:'不符合'}] },
  { id:55, title:'我愿意处理文书、表格、数据录入', options:[{text:'符合',dim:'C'},{text:'不符合'}] },
  { id:56, title:'我做事有条理，喜欢提前安排好计划', options:[{text:'符合',dim:'C'},{text:'不符合'}] },
  { id:57, title:'我注重规范、标准、程序', options:[{text:'符合',dim:'C'},{text:'不符合'}] },
  { id:58, title:'我擅长核对、校验、把关细节', options:[{text:'符合',dim:'C'},{text:'不符合'}] },
  { id:59, title:'我喜欢稳定、可预期的工作环境', options:[{text:'符合',dim:'C'},{text:'不符合'}] },
  { id:60, title:'我对会计、统计、行政、信息管理感兴趣', options:[{text:'符合',dim:'C'},{text:'不符合'}] }
];

// 2. 学科优势评估（十大学科，能力自评+兴趣打分各1题，共20题）
// 浙江高考"3+3"模式：语数英必考 + 从物化生政史地技7门中选3门作为选考
const subjectList = ['语文','数学','英语','物理','化学','生物','政治','历史','地理','技术'];
// 选考科目（7选3）
const electiveSubjects = ['物理','化学','生物','政治','历史','地理','技术'];
const subjectQuestions = [];
subjectList.forEach((subj, i) => {
  const base = i * 2;
  // 能力自评题
  subjectQuestions.push({
    id: base + 1,
    title: `「${subj}」你的学习能力如何？`,
    type: 'subject',
    subject: subj,
    field: 'ability',
    options: [
      {text:'很弱', score:1},
      {text:'较弱', score:2},
      {text:'一般', score:3},
      {text:'较强', score:4},
      {text:'很强', score:5}
    ]
  });
  // 兴趣打分题
  subjectQuestions.push({
    id: base + 2,
    title: `「${subj}」你的兴趣程度如何？`,
    type: 'subject',
    subject: subj,
    field: 'interest',
    options: [
      {text:'没兴趣', score:1},
      {text:'不太感兴趣', score:2},
      {text:'一般', score:3},
      {text:'较有兴趣', score:4},
      {text:'很有兴趣', score:5}
    ]
  });
});

// 3. 多元智能测评（8智能×4题=32题）
// 语言/逻辑数理/视觉空间/音乐/人际/内省/自然观察/身体动觉
const multiIntelligenceQuestions = [
  // 语言智能
  { id:1, title:'我很容易用词语准确表达自己的想法', options:[{text:'很符合',dim:'语言'},{text:'较符合',dim:'语言',half:true},{text:'不符合',dim:'逻辑数理'}] },
  { id:2, title:'写作文或演讲对我来说不难', options:[{text:'很符合',dim:'语言'},{text:'较符合',dim:'语言',half:true},{text:'不符合',dim:'音乐'}] },
  { id:3, title:'我记词语、背诵课文比别人快', options:[{text:'很符合',dim:'语言'},{text:'较符合',dim:'语言',half:true},{text:'不符合',dim:'逻辑数理'}] },
  { id:4, title:'我喜欢阅读，并享受文字带来的乐趣', options:[{text:'很符合',dim:'语言'},{text:'较符合',dim:'语言',half:true},{text:'不符合',dim:'自然观察'}] },
  // 逻辑数理
  { id:5, title:'我喜欢数字、推理和解谜', options:[{text:'很符合',dim:'逻辑数理'},{text:'较符合',dim:'逻辑数理',half:true},{text:'不符合',dim:'语言'}] },
  { id:6, title:'我能很快找到问题的逻辑漏洞', options:[{text:'很符合',dim:'逻辑数理'},{text:'较符合',dim:'逻辑数理',half:true},{text:'不符合',dim:'人际'}] },
  { id:7, title:'我擅长数学计算和归纳规律', options:[{text:'很符合',dim:'逻辑数理'},{text:'较符合',dim:'逻辑数理',half:true},{text:'不符合',dim:'音乐'}] },
  { id:8, title:'面对复杂问题，我喜欢一步步分析推导', options:[{text:'很符合',dim:'逻辑数理'},{text:'较符合',dim:'逻辑数理',half:true},{text:'不符合',dim:'身体动觉'}] },
  // 视觉空间
  { id:9, title:'我看地图、想象立体图形很轻松', options:[{text:'很符合',dim:'视觉空间'},{text:'较符合',dim:'视觉空间',half:true},{text:'不符合',dim:'语言'}] },
  { id:10, title:'我擅长画画、设计或拼图', options:[{text:'很符合',dim:'视觉空间'},{text:'较符合',dim:'视觉空间',half:true},{text:'不符合',dim:'逻辑数理'}] },
  { id:11, title:'我脑海中对空间、方位有清晰画面', options:[{text:'很符合',dim:'视觉空间'},{text:'较符合',dim:'视觉空间',half:true},{text:'不符合',dim:'音乐'}] },
  { id:12, title:'我注意到颜色、线条、构图等视觉细节', options:[{text:'很符合',dim:'视觉空间'},{text:'较符合',dim:'视觉空间',half:true},{text:'不符合',dim:'内省'}] },
  // 音乐
  { id:13, title:'我对节奏和旋律很敏感', options:[{text:'很符合',dim:'音乐'},{text:'较符合',dim:'音乐',half:true},{text:'不符合',dim:'逻辑数理'}] },
  { id:14, title:'我容易记住一首歌的曲调和歌词', options:[{text:'很符合',dim:'音乐'},{text:'较符合',dim:'音乐',half:true},{text:'不符合',dim:'视觉空间'}] },
  { id:15, title:'我听到音乐时会自然打节拍或跟唱', options:[{text:'很符合',dim:'音乐'},{text:'较符合',dim:'音乐',half:true},{text:'不符合',dim:'逻辑数理'}] },
  { id:16, title:'我会演奏乐器或想学一门乐器', options:[{text:'很符合',dim:'音乐'},{text:'较符合',dim:'音乐',half:true},{text:'不符合',dim:'自然观察'}] },
  // 人际
  { id:17, title:'我善于理解他人情绪并与人合作', options:[{text:'很符合',dim:'人际'},{text:'较符合',dim:'人际',half:true},{text:'不符合',dim:'内省'}] },
  { id:18, title:'我能敏锐察觉别人情绪变化', options:[{text:'很符合',dim:'人际'},{text:'较符合',dim:'人际',half:true},{text:'不符合',dim:'逻辑数理'}] },
  { id:19, title:'我在群体中常充当协调者角色', options:[{text:'很符合',dim:'人际'},{text:'较符合',dim:'人际',half:true},{text:'不符合',dim:'内省'}] },
  { id:20, title:'同学愿意向我倾诉烦恼', options:[{text:'很符合',dim:'人际'},{text:'较符合',dim:'人际',half:true},{text:'不符合',dim:'视觉空间'}] },
  // 内省
  { id:21, title:'我经常反思自己的优缺点', options:[{text:'很符合',dim:'内省'},{text:'较符合',dim:'内省',half:true},{text:'不符合',dim:'人际'}] },
  { id:22, title:'我清楚自己的目标和努力方向', options:[{text:'很符合',dim:'内省'},{text:'较符合',dim:'内省',half:true},{text:'不符合',dim:'音乐'}] },
  { id:23, title:'我擅长独处并自我调节情绪', options:[{text:'很符合',dim:'内省'},{text:'较符合',dim:'内省',half:true},{text:'不符合',dim:'人际'}] },
  { id:24, title:'我对自己的学习状态有清醒认知', options:[{text:'很符合',dim:'内省'},{text:'较符合',dim:'内省',half:true},{text:'不符合',dim:'身体动觉'}] },
  // 自然观察
  { id:25, title:'我喜欢观察动植物和自然现象', options:[{text:'很符合',dim:'自然观察'},{text:'较符合',dim:'自然观察',half:true},{text:'不符合',dim:'逻辑数理'}] },
  { id:26, title:'我能分辨不同种类植物或动物的特征', options:[{text:'很符合',dim:'自然观察'},{text:'较符合',dim:'自然观察',half:true},{text:'不符合',dim:'音乐'}] },
  { id:27, title:'我对天气、季节变化很敏感', options:[{text:'很符合',dim:'自然观察'},{text:'较符合',dim:'自然观察',half:true},{text:'不符合',dim:'语言'}] },
  { id:28, title:'我喜欢户外探索、采集标本', options:[{text:'很符合',dim:'自然观察'},{text:'较符合',dim:'自然观察',half:true},{text:'不符合',dim:'视觉空间'}] },
  // 身体动觉
  { id:29, title:'我身体协调性好，喜欢运动或动手', options:[{text:'很符合',dim:'身体动觉'},{text:'较符合',dim:'身体动觉',half:true},{text:'不符合',dim:'视觉空间'}] },
  { id:30, title:'我擅长通过身体动作模仿学习', options:[{text:'很符合',dim:'身体动觉'},{text:'较符合',dim:'身体动觉',half:true},{text:'不符合',dim:'语言'}] },
  { id:31, title:'我手工制作、实验操作很灵巧', options:[{text:'很符合',dim:'身体动觉'},{text:'较符合',dim:'身体动觉',half:true},{text:'不符合',dim:'逻辑数理'}] },
  { id:32, title:'长时间静坐学习让我感到疲惫', options:[{text:'很符合',dim:'身体动觉'},{text:'较符合',dim:'身体动觉',half:true},{text:'不符合',dim:'内省'}] }
];

// 4. MBTI职业人格测试（48题，四维度各12题：E/I、S/N、T/F、J/P）
const mbtiQuestions = [
  // E/I 维度（1-12）
  { id:1, title:'你通常', options:[{text:'与人容易混熟',dim:'E'},{text:'比较沉静或矜持',dim:'I'}] },
  { id:2, title:'你喜欢花很多的时间', options:[{text:'和别人在一起',dim:'E'},{text:'一个人独处',dim:'I'}] },
  { id:3, title:'与很多人一起会', options:[{text:'令你活力倍增',dim:'E'},{text:'常常令你心力交瘁',dim:'I'}] },
  { id:4, title:'在社交聚会中，你', options:[{text:'常常乐在其中',dim:'E'},{text:'有时感到郁闷',dim:'I'}] },
  { id:5, title:'在一大群人当中，通常是', options:[{text:'你介绍大家认识',dim:'E'},{text:'别人介绍你',dim:'I'}] },
  { id:6, title:'你是否', options:[{text:'容易让人了解',dim:'E'},{text:'难于让人了解',dim:'I'}] },
  { id:7, title:'大多数人会说你是一个', options:[{text:'非常坦率开放的人',dim:'E'},{text:'重视自我隐私的人',dim:'I'}] },
  { id:8, title:'你认为别人一般', options:[{text:'用很短的时间便认识你',dim:'E'},{text:'要花很长时间才认识你',dim:'I'}] },
  { id:9, title:'你比较', options:[{text:'健谈',dim:'E'},{text:'矜持',dim:'I'}] },
  { id:10, title:'哪个词更合你心意', options:[{text:'热情',dim:'E'},{text:'文静',dim:'I'}] },
  { id:11, title:'哪个词更合你心意', options:[{text:'爱合群',dim:'E'},{text:'文静',dim:'I'}] },
  { id:12, title:'哪个词更合你心意', options:[{text:'朋友众多',dim:'E'},{text:'朋友不多',dim:'I'}] },
  // S/N 维度（13-24）
  { id:13, title:'假如你是一位老师，你会选教', options:[{text:'以事实为主的课程',dim:'S'},{text:'涉及理论的课程',dim:'N'}] },
  { id:14, title:'一般来说，你和哪些人比较合得来', options:[{text:'现实的人',dim:'S'},{text:'富于想象力的人',dim:'N'}] },
  { id:15, title:'你会跟哪些人做朋友', options:[{text:'脚踏实地的',dim:'S'},{text:'常提出新主意的',dim:'N'}] },
  { id:16, title:'哪些人会更吸引你', options:[{text:'实事求是、具丰富常识的人',dim:'S'},{text:'思想敏捷及非常聪颖的人',dim:'N'}] },
  { id:17, title:'你宁愿被人认为是', options:[{text:'实事求是的人',dim:'S'},{text:'机灵的人',dim:'N'}] },
  { id:18, title:'哪个词更合你心意', options:[{text:'具体',dim:'S'},{text:'抽象',dim:'N'}] },
  { id:19, title:'哪个词更合你心意', options:[{text:'事实',dim:'S'},{text:'意念',dim:'N'}] },
  { id:20, title:'哪个词更合你心意', options:[{text:'实况',dim:'S'},{text:'意念',dim:'N'}] },
  { id:21, title:'哪个词更合你心意', options:[{text:'事实',dim:'S'},{text:'理论',dim:'N'}] },
  { id:22, title:'哪个词更合你心意', options:[{text:'以事论事',dim:'S'},{text:'富想象的',dim:'N'}] },
  { id:23, title:'哪个词更合你心意', options:[{text:'建造',dim:'S'},{text:'发明',dim:'N'}] },
  { id:24, title:'哪个词更合你心意', options:[{text:'务实的',dim:'S'},{text:'理论的',dim:'N'}] },
  // T/F 维度（25-36）
  { id:25, title:'你是否经常让', options:[{text:'你的理智主宰你的情感',dim:'T'},{text:'你的情感支配你的理智',dim:'F'}] },
  { id:26, title:'你倾向', options:[{text:'重视逻辑多于感情',dim:'T'},{text:'重视感情多于逻辑',dim:'F'}] },
  { id:27, title:'哪个词更合你心意', options:[{text:'公正',dim:'T'},{text:'敏感',dim:'F'}] },
  { id:28, title:'哪个词更合你心意', options:[{text:'坚定',dim:'T'},{text:'温柔',dim:'F'}] },
  { id:29, title:'哪个词更合你心意', options:[{text:'思考',dim:'T'},{text:'感受',dim:'F'}] },
  { id:30, title:'哪个词更合你心意', options:[{text:'令人信服',dim:'T'},{text:'感人的',dim:'F'}] },
  { id:31, title:'哪个词更合你心意', options:[{text:'合逻辑',dim:'T'},{text:'富同情',dim:'F'}] },
  { id:32, title:'哪个词更合你心意', options:[{text:'分析力强',dim:'T'},{text:'多愁善感',dim:'F'}] },
  { id:33, title:'哪个词更合你心意', options:[{text:'客观的',dim:'T'},{text:'亲切的',dim:'F'}] },
  { id:34, title:'哪个词更合你心意', options:[{text:'利益',dim:'T'},{text:'祝福',dim:'F'}] },
  { id:35, title:'哪个词更合你心意', options:[{text:'具远见',dim:'T'},{text:'同情怜悯',dim:'F'}] },
  { id:36, title:'哪个词更合你心意', options:[{text:'合情合理',dim:'T'},{text:'令人着迷',dim:'F'}] },
  // J/P 维度（37-48）
  { id:37, title:'当你要外出一整天，你会', options:[{text:'计划你要做什么和在什么时候做',dim:'J'},{text:'说去就去',dim:'P'}] },
  { id:38, title:'你认为自己是一个', options:[{text:'较为有条理的人',dim:'J'},{text:'较为随兴所至的人',dim:'P'}] },
  { id:39, title:'处理许多事情上，你会喜欢', options:[{text:'按照计划行事',dim:'J'},{text:'凭兴所至行事',dim:'P'}] },
  { id:40, title:'按照程序表做事', options:[{text:'合你心意',dim:'J'},{text:'令你感到束缚',dim:'P'}] },
  { id:41, title:'当你有一份特别的任务，你会喜欢', options:[{text:'开始前小心组织计划',dim:'J'},{text:'边做边找须做什么',dim:'P'}] },
  { id:42, title:'在大多数情况下，你会选择', options:[{text:'按程序表做事',dim:'J'},{text:'顺其自然',dim:'P'}] },
  { id:43, title:'你比较喜欢', options:[{text:'很早就作计划',dim:'J'},{text:'坐观事情发展才作计划',dim:'P'}] },
  { id:44, title:'你比较喜欢', options:[{text:'很早便把约会安排妥当',dim:'J'},{text:'无拘无束，看当时有什么好玩',dim:'P'}] },
  { id:45, title:'计划旅程时，你较喜欢', options:[{text:'事先知道大部分日子做什么',dim:'J'},{text:'大部分时间跟当天感觉行事',dim:'P'}] },
  { id:46, title:'哪个词更合你心意', options:[{text:'有系统',dim:'J'},{text:'即兴',dim:'P'}] },
  { id:47, title:'哪个词更合你心意', options:[{text:'有条不紊',dim:'J'},{text:'不拘小节',dim:'P'}] },
  { id:48, title:'哪个词更合你心意', options:[{text:'预先安排的',dim:'J'},{text:'无计划的',dim:'P'}] }
];

// 5. 大五人格测试（40题，五维度各8题，5级李克特量表）
// O开放性/C尽责性/E外向性/A宜人/N神经质
const bigFiveQuestions = [
  // O 开放性（1-8）
  { id:1, title:'我对新观念和新体验充满好奇', options:[{text:'非常同意',dim:'O',score:5},{text:'同意',dim:'O',score:4},{text:'中立',dim:'O',score:3},{text:'不同意',dim:'O',score:2},{text:'非常不同意',dim:'O',score:1}] },
  { id:2, title:'我喜欢思考抽象问题', options:[{text:'非常同意',dim:'O',score:5},{text:'同意',dim:'O',score:4},{text:'中立',dim:'O',score:3},{text:'不同意',dim:'O',score:2},{text:'非常不同意',dim:'O',score:1}] },
  { id:3, title:'我富有想象力和创造力', options:[{text:'非常同意',dim:'O',score:5},{text:'同意',dim:'O',score:4},{text:'中立',dim:'O',score:3},{text:'不同意',dim:'O',score:2},{text:'非常不同意',dim:'O',score:1}] },
  { id:4, title:'我对艺术、文学、音乐有浓厚兴趣', options:[{text:'非常同意',dim:'O',score:5},{text:'同意',dim:'O',score:4},{text:'中立',dim:'O',score:3},{text:'不同意',dim:'O',score:2},{text:'非常不同意',dim:'O',score:1}] },
  { id:5, title:'我喜欢尝试不同的解决问题方法', options:[{text:'非常同意',dim:'O',score:5},{text:'同意',dim:'O',score:4},{text:'中立',dim:'O',score:3},{text:'不同意',dim:'O',score:2},{text:'非常不同意',dim:'O',score:1}] },
  { id:6, title:'我重视非传统的观点和想法', options:[{text:'非常同意',dim:'O',score:5},{text:'同意',dim:'O',score:4},{text:'中立',dim:'O',score:3},{text:'不同意',dim:'O',score:2},{text:'非常不同意',dim:'O',score:1}] },
  { id:7, title:'我倾向于挑战权威和既有观念', options:[{text:'非常同意',dim:'O',score:5},{text:'同意',dim:'O',score:4},{text:'中立',dim:'O',score:3},{text:'不同意',dim:'O',score:2},{text:'非常不同意',dim:'O',score:1}] },
  { id:8, title:'我对哲学、思辨类话题感兴趣', options:[{text:'非常同意',dim:'O',score:5},{text:'同意',dim:'O',score:4},{text:'中立',dim:'O',score:3},{text:'不同意',dim:'O',score:2},{text:'非常不同意',dim:'O',score:1}] },
  // C 尽责性（9-16）
  { id:9, title:'我做事有条理，注重计划', options:[{text:'非常同意',dim:'C',score:5},{text:'同意',dim:'C',score:4},{text:'中立',dim:'C',score:3},{text:'不同意',dim:'C',score:2},{text:'非常不同意',dim:'C',score:1}] },
  { id:10, title:'我能坚持完成困难任务', options:[{text:'非常同意',dim:'C',score:5},{text:'同意',dim:'C',score:4},{text:'中立',dim:'C',score:3},{text:'不同意',dim:'C',score:2},{text:'非常不同意',dim:'C',score:1}] },
  { id:11, title:'我按时完成作业和任务', options:[{text:'非常同意',dim:'C',score:5},{text:'同意',dim:'C',score:4},{text:'中立',dim:'C',score:3},{text:'不同意',dim:'C',score:2},{text:'非常不同意',dim:'C',score:1}] },
  { id:12, title:'我注重细节，力求准确', options:[{text:'非常同意',dim:'C',score:5},{text:'同意',dim:'C',score:4},{text:'中立',dim:'C',score:3},{text:'不同意',dim:'C',score:2},{text:'非常不同意',dim:'C',score:1}] },
  { id:13, title:'我为目标制定清晰的步骤', options:[{text:'非常同意',dim:'C',score:5},{text:'同意',dim:'C',score:4},{text:'中立',dim:'C',score:3},{text:'不同意',dim:'C',score:2},{text:'非常不同意',dim:'C',score:1}] },
  { id:14, title:'我做事有始有终，不半途而废', options:[{text:'非常同意',dim:'C',score:5},{text:'同意',dim:'C',score:4},{text:'中立',dim:'C',score:3},{text:'不同意',dim:'C',score:2},{text:'非常不同意',dim:'C',score:1}] },
  { id:15, title:'我能很好地管理自己的时间', options:[{text:'非常同意',dim:'C',score:5},{text:'同意',dim:'C',score:4},{text:'中立',dim:'C',score:3},{text:'不同意',dim:'C',score:2},{text:'非常不同意',dim:'C',score:1}] },
  { id:16, title:'面对诱惑我也能专注于学习', options:[{text:'非常同意',dim:'C',score:5},{text:'同意',dim:'C',score:4},{text:'中立',dim:'C',score:3},{text:'不同意',dim:'C',score:2},{text:'非常不同意',dim:'C',score:1}] },
  // E 外向性（17-24）
  { id:17, title:'我喜欢与人交往，容易热络', options:[{text:'非常同意',dim:'E',score:5},{text:'同意',dim:'E',score:4},{text:'中立',dim:'E',score:3},{text:'不同意',dim:'E',score:2},{text:'非常不同意',dim:'E',score:1}] },
  { id:18, title:'我是群体中的活跃分子', options:[{text:'非常同意',dim:'E',score:5},{text:'同意',dim:'E',score:4},{text:'中立',dim:'E',score:3},{text:'不同意',dim:'E',score:2},{text:'非常不同意',dim:'E',score:1}] },
  { id:19, title:'我乐于在众人面前发言', options:[{text:'非常同意',dim:'E',score:5},{text:'同意',dim:'E',score:4},{text:'中立',dim:'E',score:3},{text:'不同意',dim:'E',score:2},{text:'非常不同意',dim:'E',score:1}] },
  { id:20, title:'我从社交活动中获得能量', options:[{text:'非常同意',dim:'E',score:5},{text:'同意',dim:'E',score:4},{text:'中立',dim:'E',score:3},{text:'不同意',dim:'E',score:2},{text:'非常不同意',dim:'E',score:1}] },
  { id:21, title:'我主动发起 conversations 和活动', options:[{text:'非常同意',dim:'E',score:5},{text:'同意',dim:'E',score:4},{text:'中立',dim:'E',score:3},{text:'不同意',dim:'E',score:2},{text:'非常不同意',dim:'E',score:1}] },
  { id:22, title:'我性格开朗，情绪外露', options:[{text:'非常同意',dim:'E',score:5},{text:'同意',dim:'E',score:4},{text:'中立',dim:'E',score:3},{text:'不同意',dim:'E',score:2},{text:'非常不同意',dim:'E',score:1}] },
  { id:23, title:'我喜欢热闹的场合胜过独处', options:[{text:'非常同意',dim:'E',score:5},{text:'同意',dim:'E',score:4},{text:'中立',dim:'E',score:3},{text:'不同意',dim:'E',score:2},{text:'非常不同意',dim:'E',score:1}] },
  { id:24, title:'我说话做事节奏较快', options:[{text:'非常同意',dim:'E',score:5},{text:'同意',dim:'E',score:4},{text:'中立',dim:'E',score:3},{text:'不同意',dim:'E',score:2},{text:'非常不同意',dim:'E',score:1}] },
  // A 宜人性（25-32）
  { id:25, title:'我乐于帮助他人、体谅他人', options:[{text:'非常同意',dim:'A',score:5},{text:'同意',dim:'A',score:4},{text:'中立',dim:'A',score:3},{text:'不同意',dim:'A',score:2},{text:'非常不同意',dim:'A',score:1}] },
  { id:26, title:'我很少与人发生冲突', options:[{text:'非常同意',dim:'A',score:5},{text:'同意',dim:'A',score:4},{text:'中立',dim:'A',score:3},{text:'不同意',dim:'A',score:2},{text:'非常不同意',dim:'A',score:1}] },
  { id:27, title:'我信任他人的善意', options:[{text:'非常同意',dim:'A',score:5},{text:'同意',dim:'A',score:4},{text:'中立',dim:'A',score:3},{text:'不同意',dim:'A',score:2},{text:'非常不同意',dim:'A',score:1}] },
  { id:28, title:'我愿意为了团队和谐做出让步', options:[{text:'非常同意',dim:'A',score:5},{text:'同意',dim:'A',score:4},{text:'中立',dim:'A',score:3},{text:'不同意',dim:'A',score:2},{text:'非常不同意',dim:'A',score:1}] },
  { id:29, title:'我善于察觉并照顾他人情绪', options:[{text:'非常同意',dim:'A',score:5},{text:'同意',dim:'A',score:4},{text:'中立',dim:'A',score:3},{text:'不同意',dim:'A',score:2},{text:'非常不同意',dim:'A',score:1}] },
  { id:30, title:'我待人温和、有耐心', options:[{text:'非常同意',dim:'A',score:5},{text:'同意',dim:'A',score:4},{text:'中立',dim:'A',score:3},{text:'不同意',dim:'A',score:2},{text:'非常不同意',dim:'A',score:1}] },
  { id:31, title:'我宁愿合作也不愿竞争', options:[{text:'非常同意',dim:'A',score:5},{text:'同意',dim:'A',score:4},{text:'中立',dim:'A',score:3},{text:'不同意',dim:'A',score:2},{text:'非常不同意',dim:'A',score:1}] },
  { id:32, title:'我对别人的困难容易产生同情', options:[{text:'非常同意',dim:'A',score:5},{text:'同意',dim:'A',score:4},{text:'中立',dim:'A',score:3},{text:'不同意',dim:'A',score:2},{text:'非常不同意',dim:'A',score:1}] },
  // N 神经质（33-40）
  { id:33, title:'我经常感到焦虑或情绪波动', options:[{text:'非常同意',dim:'N',score:5},{text:'同意',dim:'N',score:4},{text:'中立',dim:'N',score:3},{text:'不同意',dim:'N',score:2},{text:'非常不同意',dim:'N',score:1}] },
  { id:34, title:'遇到挫折我容易情绪低落', options:[{text:'非常同意',dim:'N',score:5},{text:'同意',dim:'N',score:4},{text:'中立',dim:'N',score:3},{text:'不同意',dim:'N',score:2},{text:'非常不同意',dim:'N',score:1}] },
  { id:35, title:'我常为小事忧心忡忡', options:[{text:'非常同意',dim:'N',score:5},{text:'同意',dim:'N',score:4},{text:'中立',dim:'N',score:3},{text:'不同意',dim:'N',score:2},{text:'非常不同意',dim:'N',score:1}] },
  { id:36, title:'我情绪起伏较大', options:[{text:'非常同意',dim:'N',score:5},{text:'同意',dim:'N',score:4},{text:'中立',dim:'N',score:3},{text:'不同意',dim:'N',score:2},{text:'非常不同意',dim:'N',score:1}] },
  { id:37, title:'面对压力我容易紧张失眠', options:[{text:'非常同意',dim:'N',score:5},{text:'同意',dim:'N',score:4},{text:'中立',dim:'N',score:3},{text:'不同意',dim:'N',score:2},{text:'非常不同意',dim:'N',score:1}] },
  { id:38, title:'我对他人评价很敏感', options:[{text:'非常同意',dim:'N',score:5},{text:'同意',dim:'N',score:4},{text:'中立',dim:'N',score:3},{text:'不同意',dim:'N',score:2},{text:'非常不同意',dim:'N',score:1}] },
  { id:39, title:'我常感到不安或莫名的担忧', options:[{text:'非常同意',dim:'N',score:5},{text:'同意',dim:'N',score:4},{text:'中立',dim:'N',score:3},{text:'不同意',dim:'N',score:2},{text:'非常不同意',dim:'N',score:1}] },
  { id:40, title:'考试前我会非常紧张', options:[{text:'非常同意',dim:'N',score:5},{text:'同意',dim:'N',score:4},{text:'中立',dim:'N',score:3},{text:'不同意',dim:'N',score:2},{text:'非常不同意',dim:'N',score:1}] }
];

// 6. 学习风格诊断（VARK模型16题）
// V视觉/A听觉/R读写/K动觉
const learningStyleQuestions = [
  { id:1, title:'学习新知识时我最容易记住', options:[{text:'图表、图示和演示',dim:'V'},{text:'老师的口头讲解',dim:'A'},{text:'课本和讲义文字',dim:'R'},{text:'动手实践和操作',dim:'K'}] },
  { id:2, title:'复习时我倾向于', options:[{text:'画思维导图和图表',dim:'V'},{text:'大声朗读或讨论',dim:'A'},{text:'整理书面笔记',dim:'R'},{text:'做实验或演练',dim:'K'}] },
  { id:3, title:'我最喜欢的课堂是', options:[{text:'PPT、视频丰富的',dim:'V'},{text:'讨论和讲授结合的',dim:'A'},{text:'阅读为主的',dim:'R'},{text:'活动多的',dim:'K'}] },
  { id:4, title:'记住一条路线我靠', options:[{text:'脑海中的地图和地标',dim:'V'},{text:'别人口头指路的描述',dim:'A'},{text:'路牌和文字说明',dim:'R'},{text:'亲自走一遍的体验',dim:'K'}] },
  { id:5, title:'解题时我喜欢', options:[{text:'画图分析',dim:'V'},{text:'口头讲解思路',dim:'A'},{text:'写出详细步骤',dim:'R'},{text:'用实物演示',dim:'K'}] },
  { id:6, title:'我对哪种教学资源最感冒', options:[{text:'动画和视频演示',dim:'V'},{text:'有声讲解和播客',dim:'A'},{text:'详尽的文字教材',dim:'R'},{text:'互动实验和模拟',dim:'K'}] },
  { id:7, title:'考试前我会', options:[{text:'看图和笔记复习',dim:'V'},{text:'听录音或与人讨论',dim:'A'},{text:'刷题和看书',dim:'R'},{text:'模拟操作和演练',dim:'K'}] },
  { id:8, title:'最能集中注意力的方式', options:[{text:'观看视觉内容',dim:'V'},{text:'听课和讨论',dim:'A'},{text:'安静阅读',dim:'R'},{text:'动手实践',dim:'K'}] },
  { id:9, title:'我擅长记住', options:[{text:'面孔和画面',dim:'V'},{text:'名字和声音',dim:'A'},{text:'文字和定义',dim:'R'},{text:'动作和操作流程',dim:'K'}] },
  { id:10, title:'做笔记时我倾向于', options:[{text:'用颜色和符号标记',dim:'V'},{text:'录下讲解回放',dim:'A'},{text:'逐条记录文字',dim:'R'},{text:'画流程图或边做边记',dim:'K'}] },
  { id:11, title:'我理解一个概念最快的方式', options:[{text:'看一张示意图',dim:'V'},{text:'听别人讲解',dim:'A'},{text:'阅读定义和说明',dim:'R'},{text:'亲手试一遍',dim:'K'}] },
  { id:12, title:'选择课外辅导时我偏好', options:[{text:'视频课程',dim:'V'},{text:'音频课程',dim:'A'},{text:'纸质教辅',dim:'R'},{text:'线下实践班',dim:'K'}] },
  { id:13, title:'我记单词最好的方法', options:[{text:'看图片联想',dim:'V'},{text:'听发音跟读',dim:'A'},{text:'抄写和默写',dim:'R'},{text:'边走边背或表演',dim:'K'}] },
  { id:14, title:'我向别人解释问题时', options:[{text:'画图说明',dim:'V'},{text:'口头讲述',dim:'A'},{text:'写下来',dim:'R'},{text:'用动作比划',dim:'K'}] },
  { id:15, title:'面对一份说明书我倾向于', options:[{text:'看图示',dim:'V'},{text:'请人讲解',dim:'A'},{text:'阅读文字',dim:'R'},{text:'直接动手试',dim:'K'}] },
  { id:16, title:'我对学习环境的要求', options:[{text:'视觉上整洁有序',dim:'V'},{text:'安静或有适当背景音',dim:'A'},{text:'光线好适合阅读',dim:'R'},{text:'有操作和活动空间',dim:'K'}] }
];

// 7. 大学专业匹配（12学科门类×2题=24题）
const majorList = ['哲学','经济学','法学','教育学','文学','历史学','理学','工学','农学','医学','管理学','艺术学'];
const majorMatchQuestions = [
  { id:1, title:'你更愿意探讨', options:[{text:'人生意义与价值',dim:'哲学'},{text:'市场与财富运行',dim:'经济学'},{text:'规则与正义',dim:'法学'},{text:'知识与人的成长',dim:'教育学'}] },
  { id:2, title:'你更擅长的思维方式', options:[{text:'思辨与论证',dim:'哲学'},{text:'逻辑推理与计算',dim:'经济学'},{text:'条文与案例分析',dim:'法学'},{text:'启发与引导',dim:'教育学'}] },
  { id:3, title:'你更喜欢的活动', options:[{text:'写作与表达',dim:'文学'},{text:'追溯和研究过去',dim:'历史学'},{text:'实验探究',dim:'理学'},{text:'发明和制造',dim:'工学'}] },
  { id:4, title:'你感兴趣的对象', options:[{text:'语言文字和故事',dim:'文学'},{text:'历史事件与文明',dim:'历史学'},{text:'自然规律',dim:'理学'},{text:'技术装置',dim:'工学'}] },
  { id:5, title:'你更关注', options:[{text:'自然与农业生产',dim:'农学'},{text:'生命健康与救治',dim:'医学'},{text:'组织与效率',dim:'管理学'},{text:'审美与创作',dim:'艺术学'}] },
  { id:6, title:'你希望未来', options:[{text:'发展绿色农业',dim:'农学'},{text:'守护生命健康',dim:'医学'},{text:'经营和管理组织',dim:'管理学'},{text:'设计美好事物',dim:'艺术学'}] },
  { id:7, title:'理想的工作场所', options:[{text:'研究院所',dim:'理学'},{text:'工程现场',dim:'工学'},{text:'医院诊所',dim:'医学'},{text:'企业公司',dim:'经济学'}] },
  { id:8, title:'你更感兴趣的社会议题', options:[{text:'教育公平',dim:'教育学'},{text:'法治建设',dim:'法学'},{text:'科技创新',dim:'工学'},{text:'文化传承',dim:'历史学'}] },
  { id:9, title:'你喜欢的课外读物', options:[{text:'哲学随笔',dim:'哲学'},{text:'小说诗歌',dim:'文学'},{text:'科普杂志',dim:'理学'},{text:'艺术画册',dim:'艺术学'}] },
  { id:10, title:'你擅长处理', options:[{text:'抽象概念',dim:'哲学'},{text:'数据与市场',dim:'经济学'},{text:'组织与人',dim:'管理学'},{text:'审美与形式',dim:'艺术学'}] },
  { id:11, title:'你认为成功靠', options:[{text:'深刻的洞察',dim:'哲学'},{text:'精准的判断',dim:'经济学'},{text:'严谨的规则',dim:'法学'},{text:'持续的创新',dim:'工学'}] },
  { id:12, title:'面对一个新事物你会', options:[{text:'思考其本质',dim:'哲学'},{text:'评估其价值',dim:'经济学'},{text:'研究其原理',dim:'理学'},{text:'动手试用',dim:'工学'}] },
  { id:13, title:'你欣赏的品质', options:[{text:'智慧与深度',dim:'哲学'},{text:'表达能力',dim:'文学'},{text:'钻研精神',dim:'历史学'},{text:'动手能力',dim:'工学'}] },
  { id:14, title:'你更愿意服务', options:[{text:'求知者',dim:'教育学'},{text:'患者',dim:'医学'},{text:'组织成员',dim:'管理学'},{text:'大众审美',dim:'艺术学'}] },
  { id:15, title:'你感兴趣的研究对象', options:[{text:'作物与生态',dim:'农学'},{text:'人体与疾病',dim:'医学'},{text:'市场与企业',dim:'经济学'},{text:'形式与美感',dim:'艺术学'}] },
  { id:16, title:'你喜欢的学科', options:[{text:'政治/历史',dim:'法学'},{text:'语文/英语',dim:'文学'},{text:'物理/化学',dim:'工学'},{text:'生物/地理',dim:'农学'}] },
  { id:17, title:'你做事时更看重', options:[{text:'意义与价值',dim:'哲学'},{text:'效率与收益',dim:'经济学'},{text:'公平与程序',dim:'法学'},{text:'美感与创意',dim:'艺术学'}] },
  { id:18, title:'你更愿意成为', options:[{text:'思想者',dim:'哲学'},{text:'企业家',dim:'经济学'},{text:'法律工作者',dim:'法学'},{text:'教育者',dim:'教育学'}] },
  { id:19, title:'你被吸引的场景', options:[{text:'图书馆古籍室',dim:'历史学'},{text:'实验室',dim:'理学'},{text:'手术室',dim:'医学'},{text:'工作室',dim:'艺术学'}] },
  { id:20, title:'你擅长沟通的方式', options:[{text:'书面写作',dim:'文学'},{text:'数据图表',dim:'经济学'},{text:'说服谈判',dim:'管理学'},{text:'作品展示',dim:'艺术学'}] },
  { id:21, title:'你对哪种课题最感兴趣', options:[{text:'存在与认知',dim:'哲学'},{text:'文明演进',dim:'历史学'},{text:'自然现象',dim:'理学'},{text:'技术革新',dim:'工学'}] },
  { id:22, title:'你希望工作的节奏', options:[{text:'深思熟虑型',dim:'哲学'},{text:'快速决策型',dim:'经济学'},{text:'严谨规范型',dim:'法学'},{text:'灵活创造型',dim:'艺术学'}] },
  { id:23, title:'你欣赏的人物', options:[{text:'思想家',dim:'哲学'},{text:'科学家',dim:'理学'},{text:'工程师',dim:'工学'},{text:'艺术家',dim:'艺术学'}] },
  { id:24, title:'你未来的愿景', options:[{text:'推动思想进步',dim:'哲学'},{text:'促进经济发展',dim:'经济学'},{text:'维护社会公正',dim:'法学'},{text:'美化人类生活',dim:'艺术学'}] }
];

// 8. 学习压力与焦虑自评（Zung SAS量表20题，4级，含反向计分）
// 反向题（5,9,13,17,19）选项分值已反转，直接累计即可
const stressQuestions = [
  { id:1, title:'我觉得比平常容易紧张和着急', options:[{text:'没有或很少',score:1},{text:'小部分时间',score:2},{text:'相当多时间',score:3},{text:'绝大部分时间',score:4}] },
  { id:2, title:'我无缘无故地感到害怕', options:[{text:'没有或很少',score:1},{text:'小部分时间',score:2},{text:'相当多时间',score:3},{text:'绝大部分时间',score:4}] },
  { id:3, title:'我容易心里烦乱或觉得惊恐', options:[{text:'没有或很少',score:1},{text:'小部分时间',score:2},{text:'相当多时间',score:3},{text:'绝大部分时间',score:4}] },
  { id:4, title:'我觉得我可能将要发疯', options:[{text:'没有或很少',score:1},{text:'小部分时间',score:2},{text:'相当多时间',score:3},{text:'绝大部分时间',score:4}] },
  // 反向题5
  { id:5, title:'我觉得一切都很好，也不会发生什么不幸', options:[{text:'没有或很少',score:4},{text:'小部分时间',score:3},{text:'相当多时间',score:2},{text:'绝大部分时间',score:1}] },
  { id:6, title:'我手脚发抖打颤', options:[{text:'没有或很少',score:1},{text:'小部分时间',score:2},{text:'相当多时间',score:3},{text:'绝大部分时间',score:4}] },
  { id:7, title:'我因为头疼、颈痛和背痛而苦恼', options:[{text:'没有或很少',score:1},{text:'小部分时间',score:2},{text:'相当多时间',score:3},{text:'绝大部分时间',score:4}] },
  { id:8, title:'我感到容易衰弱和疲乏', options:[{text:'没有或很少',score:1},{text:'小部分时间',score:2},{text:'相当多时间',score:3},{text:'绝大部分时间',score:4}] },
  // 反向题9
  { id:9, title:'我觉得心平气和，并且容易安静坐着', options:[{text:'没有或很少',score:4},{text:'小部分时间',score:3},{text:'相当多时间',score:2},{text:'绝大部分时间',score:1}] },
  { id:10, title:'我觉得心跳得很快', options:[{text:'没有或很少',score:1},{text:'小部分时间',score:2},{text:'相当多时间',score:3},{text:'绝大部分时间',score:4}] },
  { id:11, title:'我因为一阵阵头晕而苦恼', options:[{text:'没有或很少',score:1},{text:'小部分时间',score:2},{text:'相当多时间',score:3},{text:'绝大部分时间',score:4}] },
  { id:12, title:'我有晕倒发作或觉得要晕倒似的', options:[{text:'没有或很少',score:1},{text:'小部分时间',score:2},{text:'相当多时间',score:3},{text:'绝大部分时间',score:4}] },
  // 反向题13
  { id:13, title:'我呼气、吸气都感到很容易', options:[{text:'没有或很少',score:4},{text:'小部分时间',score:3},{text:'相当多时间',score:2},{text:'绝大部分时间',score:1}] },
  { id:14, title:'我手脚麻木和刺痛', options:[{text:'没有或很少',score:1},{text:'小部分时间',score:2},{text:'相当多时间',score:3},{text:'绝大部分时间',score:4}] },
  { id:15, title:'我因为胃痛和消化不良而苦恼', options:[{text:'没有或很少',score:1},{text:'小部分时间',score:2},{text:'相当多时间',score:3},{text:'绝大部分时间',score:4}] },
  { id:16, title:'我常常要小便', options:[{text:'没有或很少',score:1},{text:'小部分时间',score:2},{text:'相当多时间',score:3},{text:'绝大部分时间',score:4}] },
  // 反向题17
  { id:17, title:'我的手脚常常是干燥温暖的', options:[{text:'没有或很少',score:4},{text:'小部分时间',score:3},{text:'相当多时间',score:2},{text:'绝大部分时间',score:1}] },
  { id:18, title:'我脸红发热', options:[{text:'没有或很少',score:1},{text:'小部分时间',score:2},{text:'相当多时间',score:3},{text:'绝大部分时间',score:4}] },
  // 反向题19
  { id:19, title:'我容易入睡，并且一夜睡得很好', options:[{text:'没有或很少',score:4},{text:'小部分时间',score:3},{text:'相当多时间',score:2},{text:'绝大部分时间',score:1}] },
  { id:20, title:'我做恶梦', options:[{text:'没有或很少',score:1},{text:'小部分时间',score:2},{text:'相当多时间',score:3},{text:'绝大部分时间',score:4}] }
];

// 题库映射
const questionBank = {
  holland: hollandQuestions,
  subject: subjectQuestions,
  multiIntelligence: multiIntelligenceQuestions,
  mbti: mbtiQuestions,
  bigFive: bigFiveQuestions,
  learningStyle: learningStyleQuestions,
  majorMatch: majorMatchQuestions,
  stress: stressQuestions
};

// ============ 计分与报告生成 ============

// 通用：维度累计计分（跳过无 dim/subject 的选项，如霍兰德"不符合"）
function tallyDims(answers, questions) {
  const dims = {};
  answers.forEach((optIdx, qIdx) => {
    const q = questions[qIdx];
    const opt = q.options[optIdx];
    if (!opt) return;
    const key = opt.dim || opt.subject;
    if (!key) return; // 无维度不计分（如霍兰德"不符合"）
    const val = opt.half ? 0.5 : (opt.score || 1);
    dims[key] = (dims[key] || 0) + val;
  });
  return dims;
}

// 霍兰德报告
function buildHollandReport(answers) {
  const dims = tallyDims(answers, hollandQuestions);
  const labels = { R:'现实型', I:'研究型', A:'艺术型', S:'社会型', E:'企业型', C:'常规型' };
  // 确保六型都有值
  ['R','I','A','S','E','C'].forEach(k => { if (dims[k] === undefined) dims[k] = 0; });
  const sorted = Object.entries(dims).sort((a,b) => b[1]-a[1]);
  const code = sorted.slice(0,3).map(s => s[0]).join('');
  const topDims = sorted.map(([k,v]) => ({ dim: k, label: labels[k]||k, value: v }));
  // 浙江"7选3"选科组合推荐（从物化生政史地技中选3门）
  const comboMap = {
    R: '物理+化学+技术', I: '物理+化学+生物', A: '历史+政治+地理',
    S: '历史+生物+政治', E: '物理+地理+政治', C: '物理+化学+政治'
  };
  const majorMap = {
    R: ['机械工程','土木工程','自动化','电子信息'],
    I: ['计算机科学','生物科学','数学','物理学'],
    A: ['设计学','汉语言文学','新闻传播','广播电视'],
    S: ['教育学','心理学','社会工作','护理学'],
    E: ['工商管理','法学','市场营销','金融学'],
    C: ['会计学','统计学','信息管理','财务管理']
  };
  const careerMap = {
    R: '工程师 / 建筑师 / 技术专家 / 飞行员',
    I: '科研人员 / 数据分析师 / 医生 / 程序员',
    A: '设计师 / 作家 / 媒体人 / 艺术工作者',
    S: '教师 / 心理咨询师 / 社工 / 医护人员',
    E: '管理者 / 创业者 / 律师 / 销售总监',
    C: '财务 / 审计 / 行政 / 数据管理'
  };
  const typeDesc = {
    R: '你务实、动手能力强，喜欢与工具、机械、物体打交道，擅长实操和技术类工作。',
    I: '你理性、好奇、善分析，喜欢钻研问题、探究原理，擅长科研和数据分析。',
    A: '你富有想象力和创造力，情感细腻，喜欢自由灵活、有创意的环境。',
    S: '你友善、善解人意，乐于助人和沟通，擅长教育和关怀类工作。',
    E: '你果断、有领导力，喜欢主导和影响他人，擅长管理和说服。',
    C: '你细致、有条理，注重规则和细节，擅长文书、数据和管理流程。'
  };
  const colors6 = ['#2E8B57', '#3CB371', '#66CDAA', '#48D1CC', '#40E0D0', '#7FFFD4'];
  return {
    code,
    topDims,
    charts: [
      { type: 'bar', title: 'RIASEC六型兴趣分布', data: topDims.map(d => ({ label: d.dim, value: d.value })) },
      { type: 'pie', title: '兴趣类型占比', data: topDims.map(d => ({ label: d.label, value: d.value })), colors: colors6 }
    ],
    sections: [
      { title: '你的兴趣代码', content: `你的霍兰德兴趣代码为 ${code}，对应：${code.split('').map(c=>labels[c]).join('、')}。\n${code.split('').map(c=>typeDesc[c]).join('\n')}` },
      { title: '推荐"7选3"选科组合', content: `基于你的主导兴趣类型 ${code[0]}（${labels[code[0]]}），推荐浙江高考选科组合：${comboMap[code[0]]}。\n备选组合可根据目标专业要求灵活调整。` },
      { title: '对应大学专业方向', content: majorMap[code[0]].map(m=>'· '+m).join('\n') },
      { title: '未来职业参考', content: careerMap[code[0]] }
    ]
  };
}

// 学科优势报告（浙江"3+3"模式，7选3）
function buildSubjectReport(answers) {
  // 解析20题答案：每学科2题（能力+兴趣），答案索引 = 学科序号*2 + field(0能力/1兴趣)
  const result = {};
  subjectList.forEach((subj, i) => {
    const abilityOpt = subjectQuestions[i * 2].options[answers[i * 2]];
    const interestOpt = subjectQuestions[i * 2 + 1].options[answers[i * 2 + 1]];
    const ability = abilityOpt ? abilityOpt.score : 0;
    const interest = interestOpt ? interestOpt.score : 0;
    result[subj] = { ability, interest, total: ability + interest };
  });
  // 全10科排序（含语数英，用于自我认知）
  const sortedAll = Object.entries(result).sort((a,b) => b[1].total - a[1].total);

  // 仅从7门选考科目中推荐组合
  const electiveResult = {};
  electiveSubjects.forEach(s => { electiveResult[s] = result[s]; });
  const sortedElectives = Object.entries(electiveResult).sort((a,b) => b[1].total - a[1].total);

  // 取选考科目得分前5名，生成 C(5,3)=10 种组合，按总分排序取TOP5
  const top5Electives = sortedElectives.slice(0, 5).map(s => s[0]);
  const combos = [];
  for (let i = 0; i < top5Electives.length; i++) {
    for (let j = i + 1; j < top5Electives.length; j++) {
      for (let k = j + 1; k < top5Electives.length; k++) {
        const subs = [top5Electives[i], top5Electives[j], top5Electives[k]];
        const score = subs.reduce((sum, s) => sum + electiveResult[s].total, 0);
        combos.push({ subs, score, key: subs.join('+') });
      }
    }
  }
  combos.sort((a, b) => b.score - a.score);
  const top5Combos = combos.slice(0, 5);

  // 浙江高考7选3专业覆盖率估算（基于各组合含物理/化学的情况）
  const coverageMap = {
    // 物理化学+X（最高覆盖率）
    '物理+化学+生物': '约 96.5%',
    '物理+化学+政治': '约 96.8%',
    '物理+化学+历史': '约 96.2%',
    '物理+化学+地理': '约 95.5%',
    '物理+化学+技术': '约 95.0%',
    // 物理+X+Y（不含化学）
    '物理+生物+政治': '约 85.2%',
    '物理+生物+历史': '约 82.1%',
    '物理+生物+地理': '约 87.3%',
    '物理+生物+技术': '约 83.5%',
    '物理+政治+历史': '约 83.8%',
    '物理+政治+地理': '约 86.0%',
    '物理+政治+技术': '约 84.2%',
    '物理+历史+地理': '约 81.5%',
    '物理+历史+技术': '约 80.3%',
    '物理+地理+技术': '约 82.0%',
    // 化学+X+Y（不含物理）
    '化学+生物+政治': '约 76.2%',
    '化学+生物+历史': '约 74.5%',
    '化学+生物+地理': '约 77.0%',
    '化学+生物+技术': '约 75.3%',
    '化学+政治+历史': '约 74.0%',
    '化学+政治+地理': '约 76.5%',
    '化学+政治+技术': '约 75.0%',
    '化学+历史+地理': '约 72.8%',
    '化学+历史+技术': '约 71.5%',
    '化学+地理+技术': '约 73.2%',
    // 生物+X+Y（不含理化）
    '生物+政治+历史': '约 58.5%',
    '生物+政治+地理': '约 60.2%',
    '生物+政治+技术': '约 57.3%',
    '生物+历史+地理': '约 55.0%',
    '生物+历史+技术': '约 53.2%',
    '生物+地理+技术': '约 56.5%',
    // 政史地技类（不含理化生）
    '政治+历史+地理': '约 52.0%',
    '政治+历史+技术': '约 51.2%',
    '政治+地理+技术': '约 54.0%',
    '历史+地理+技术': '约 50.5%'
  };

  function getCoverage(key) {
    return coverageMap[key] || '约 50-80%（建议查询浙江省教育考试院最新招生目录）';
  }

  return {
    top5Combos: top5Combos.map(c => ({ combo: c.key, coverage: getCoverage(c.key), score: c.score })),
    charts: [{ type: 'radar', title: '十学科优势雷达图（语数英+7选考）', data: subjectList.map(s => ({ label: s, value: result[s].total })) }],
    sections: [
      { title: '学科优势排序', content: sortedAll.map((s,i)=>`${i+1}. ${s[0]}（综合 ${s[1].total} 分｜能力${s[1].ability} 兴趣${s[1].interest}）`).join('\n') },
      { title: '推荐"7选3"选科组合 TOP5', content: top5Combos.map((c, i) => `${i+1}. ${c.key}（综合分 ${c.score}）`).join('\n') },
      { title: '组合对应专业覆盖率（浙江省估算）', content: top5Combos.map((c, i) => `${i+1}. ${c.key}：专业覆盖率 ${getCoverage(c.key)}`).join('\n') },
      { title: '选科避坑建议', content: '· 浙江高考为"3+3"模式，语数英必考，从物化生政史地技7门中选3门作为选考\n· 含物理的组合专业覆盖率最高（80%+），适合理工科方向\n· 含物理+化学的组合覆盖率可达95%+，医学、工科首选\n· 纯文科组合（政史地类）覆盖率约50%，适合明确走文科方向的同学\n· 技术科目在浙江特色明显，适合对信息技术、工程感兴趣的同学\n· 结合赋分制规则，选择自己排名靠前的科目更易得高分\n· 不要盲目跟风，适合自己的才是最好的' }
    ]
  };
}

// 多元智能报告
function buildMultiIntelligenceReport(answers) {
  const dims = tallyDims(answers, multiIntelligenceQuestions);
  const allIntelligence = ['语言','逻辑数理','视觉空间','音乐','人际','内省','自然观察','身体动觉'];
  allIntelligence.forEach(k => { if (dims[k] === undefined) dims[k] = 0; });
  const sorted = Object.entries(dims).sort((a,b)=>b[1]-a[1]);
  const top = sorted[0][0];
  const advise = {
    '语言': '适合文科方向，浙江7选3推荐含历史/政治，专业如汉语言文学、新闻传播、法学、外语',
    '逻辑数理': '适合理科方向，浙江7选3推荐含物理/化学，专业如计算机、数学、统计、经济学',
    '视觉空间': '适合工科与艺术方向，推荐选科含地理/物理，专业如建筑学、设计学、城乡规划',
    '音乐': '适合艺术特长发展，专业如音乐学、艺术教育、录音艺术',
    '人际': '适合管理与教育方向，专业如教育学、人力资源管理、法学、社会工作',
    '内省': '适合研究与心理方向，专业如心理学、哲学、基础医学、科研',
    '自然观察': '适合生命科学方向，推荐选科含生物，专业如生物科学、农学、林学、医学',
    '身体动觉': '适合体育与实操方向，专业如体育学、机械工程、康复治疗、表演'
  };
  const desc = {
    '语言': '善于运用文字和语言表达，对词汇、语法敏感，擅长阅读和写作。',
    '逻辑数理': '善于逻辑推理和数字运算，对因果关系敏感，擅长分析和解题。',
    '视觉空间': '善于感知和构建视觉图像，对色彩、空间敏感，擅长设计和想象。',
    '音乐': '善于感知节奏、音高和旋律，对声音敏感，擅长音乐表达。',
    '人际': '善于理解他人情绪和意图，擅长沟通、协作和领导。',
    '内省': '善于自我觉察和反思，清楚自己的情绪、目标和优势。',
    '自然观察': '善于辨认和分类自然界事物，对动植物和环境敏感。',
    '身体动觉': '善于运用身体表达和操作，协调性好，擅长运动和动手。'
  };
  return {
    top,
    sorted: sorted.map(([k,v])=>({label:k,value:v})),
    charts: [{ type:'bar', title:'八大智能分布', data: sorted.map(([k,v])=>({label:k,value:v})) }],
    sections: [
      { title:'智能优势排序', content: sorted.map((s,i)=>`${i+1}. ${s[0]}（${s[1]} 分）—— ${desc[s[0]]}`).join('\n') },
      { title:'智能与选科/专业关联建议', content: `你的主导智能是「${top}」。${advise[top]}` }
    ]
  };
}

// MBTI报告
function buildMbtiReport(answers) {
  const dims = tallyDims(answers, mbtiQuestions);
  ['E','I','S','N','T','F','J','P'].forEach(k => { if (dims[k] === undefined) dims[k] = 0; });
  const type =
    (dims.E >= dims.I ? 'E' : 'I') +
    (dims.S >= dims.N ? 'S' : 'N') +
    (dims.T >= dims.F ? 'T' : 'F') +
    (dims.J >= dims.P ? 'J' : 'P');
  const profile = {
    INTJ:'建筑师——独立、有远见，擅长战略规划与逻辑分析，是果断的完美主义者',
    INTP:'逻辑学家——理性好奇，喜欢探究原理，善于发现隐藏的规律',
    ENTJ:'指挥官——果断有领导力，目标导向，善于制定长期战略',
    ENTP:'辩论家——机敏创新，喜欢挑战常规，善于发现可能性',
    INFJ:'提倡者——理想主义，洞察人心，安静而坚定地追求意义',
    INFP:'调停者——真诚富有同理心，追求内心和谐与自我实现',
    ENFJ:'主人公——热情有感染力，善于引导和激励他人成长',
    ENFP:'竞选者——热情有创意，充满好奇心，看到生活的可能',
    ISTJ:'物流师——严谨负责，重视秩序与传统，是可靠的执行者',
    ISFJ:'守卫者——细心体贴，默默奉献，重视稳定与和谐',
    ESTJ:'总经理——务实高效，组织能力强，善于管理和执行',
    ESFJ:'执政官——热心友善，重视人际关系与传统价值',
    ISTP:'鉴赏家——冷静灵活，擅长动手实操，善于解决实际问题',
    ISFP:'探险家——安静敏感，热爱自由与美，活在当下',
    ESTP:'企业家——行动派，敢于冒险，善于把握机会',
    ESFP:'表演者——活泼热情，享受当下，善于活跃气氛'
  };
  const majorMap = {
    INTJ:['计算机科学','经济学','法学','建筑学'], INTP:['数学','物理学','哲学','计算机'], ENTJ:['工商管理','金融学','法学','工程管理'], ENTP:['市场营销','新闻传播','法学','广告学'],
    INFJ:['心理学','教育学','社会工作','汉语言文学'], INFP:['汉语言文学','心理学','艺术设计','戏剧影视'], ENFJ:['教育学','人力资源管理','新闻学','公共事业管理'], ENFP:['广告学','心理学','旅游管理','新闻传播'],
    ISTJ:['会计学','统计学','工程管理','审计学'], ISFJ:['护理学','教育学','会计学','图书档案'], ESTJ:['工商管理','法学','行政管理','物流管理'], ESFJ:['学前教育','护理学','社会工作','旅游管理'],
    ISTP:['机械工程','计算机科学','自动化','电子信息'], ISFP:['美术学','音乐学','园林','服装设计'], ESTP:['体育学','市场营销','旅游管理','国际贸易'], ESFP:['表演','播音主持','旅游管理','幼儿教育']
  };
  const learnMap = {
    E:'小组讨论与互动式学习', I:'独立阅读与深度思考',
    S:'循序渐进、注重实例与细节', N:'整体框架与联想迁移',
    T:'逻辑推演与原理探究', F:'结合情感与实际意义、合作学习',
    J:'结构化计划与清单管理', P:'灵活弹性、按兴趣推进'
  };
  return {
    type,
    profile: profile[type] || '独特的人格类型',
    charts: [{ type:'bar', title:'四维度偏好强度', data:[
      {label:'E外向',value:dims.E},{label:'I内向',value:dims.I},
      {label:'S实感',value:dims.S},{label:'N直觉',value:dims.N},
      {label:'T思考',value:dims.T},{label:'F情感',value:dims.F},
      {label:'J判断',value:dims.J},{label:'P感知',value:dims.P}
    ]}],
    sections: [
      { title:'你的人格类型', content:`${type} —— ${profile[type]||''}` },
      { title:'性格画像', content:profile[type]||'' },
      { title:'适合的学习方式', content:`结合你的类型 ${type}：\n· ${learnMap[type[0]]}\n· ${learnMap[type[1]]}\n· ${learnMap[type[2]]}\n· ${learnMap[type[3]]}` },
      { title:'推荐大学专业', content:(majorMap[type]||[]).map(m=>'· '+m).join('\n') }
    ]
  };
}

// 大五人格报告
function buildBigFiveReport(answers) {
  const dims = tallyDims(answers, bigFiveQuestions);
  const labels = { O:'开放性', C:'尽责性', E:'外向性', A:'宜人性', N:'神经质' };
  ['O','C','E','A','N'].forEach(k => { if (dims[k] === undefined) dims[k] = 0; });
  const advise = {
    O: dims.O>=28 ? '富有想象力和创造力，喜欢新观念和新体验，适合探索新领域' : '务实稳重，注重传统和经验，擅长在熟悉领域深耕',
    C: dims.C>=28 ? '自律有条理，目标感强，执行力出色' : '较灵活随性，需加强计划性和时间管理',
    E: dims.E>=28 ? '热情外向，善于社交，从人际中获得能量' : '安静内敛，偏好深度交流和独处',
    A: dims.A>=28 ? '友善合作，体谅他人，人际关系融洽' : '独立直接，坚持己见，竞争意识强',
    N: dims.N>=28 ? '情绪较敏感，易焦虑波动，需注意情绪调适' : '情绪稳定，抗压能力较好，心态平和'
  };
  const maxScore = 40; // 每维度8题×5分
  return {
    charts: [{ type:'radar', title:'大五人格维度得分', data:['O','C','E','A','N'].map(k=>({label:labels[k],value:dims[k]})) }],
    sections: [
      { title:'五维度得分', content:['O','C','E','A','N'].map(k=>`${labels[k]}：${dims[k]}/${maxScore} 分`).join('\n') },
      { title:'性格优劣势', content:['O','C','E','A','N'].map(k=>`· ${labels[k]}：${advise[k]}`).join('\n') },
      { title:'学习习惯建议', content: dims.C>=28 ? '保持良好的计划性和自律，注意劳逸结合，避免完美主义带来的压力' : '建议制定每日学习清单，使用番茄工作法（25分钟专注+5分钟休息）提升专注，并设定阶段性小目标' + (dims.N>=28 ? '\n情绪敏感时及时暂停，进行深呼吸或散步调节' : '') }
    ]
  };
}

// 学习风格报告
function buildLearningStyleReport(answers) {
  const dims = tallyDims(answers, learningStyleQuestions);
  ['V','A','R','K'].forEach(k => { if (dims[k] === undefined) dims[k] = 0; });
  const labels = { V:'视觉型', A:'听觉型', R:'读写型', K:'动觉型' };
  const sorted = Object.entries(dims).sort((a,b)=>b[1]-a[1]);
  const top = sorted[0][0];
  const method = {
    V:'· 多用图表、思维导图、颜色标记\n· 观看教学视频和动画演示\n· 把文字转化为图像记忆\n· 用不同颜色整理笔记',
    A:'· 录音回放，反复听讲\n· 参与讨论，把知识讲给别人听\n· 朗读背诵，配合节奏记忆\n· 在安静或轻音乐环境中学习',
    R:'· 整理结构化笔记，精读课本\n· 做书面练习和错题本\n· 把知识转化为文字总结\n· 列清单和提纲辅助记忆',
    K:'· 动手实验和操作演练\n· 角色扮演和情景模拟\n· 边走边背，分段切换活动\n· 用实物或模型辅助理解'
  };
  const time = {
    V:'25分钟专注 + 彩色整理，用视觉材料强化',
    A:'听讲与讨论交替，每20分钟切换输入方式',
    R:'安静环境持续阅读45分钟，再做书面练习',
    K:'分段操作，每20分钟切换活动，避免久坐'
  };
  return {
    top, styleName: labels[top],
    charts: [{ type:'bar', title:'学习风格分布', data: sorted.map(([k,v])=>({label:labels[k],value:v})) }],
    sections: [
      { title:'你的学习风格类型', content:`${labels[top]} —— 你最适合通过${top==='V'?'视觉':top==='A'?'听觉':top==='R'?'读写':'动觉'}方式获取和巩固知识` },
      { title:'专属学习方法', content:method[top] },
      { title:'时间管理策略', content:time[top] }
    ]
  };
}

// 专业匹配报告
function buildMajorMatchReport(answers) {
  const dims = tallyDims(answers, majorMatchQuestions);
  majorList.forEach(k => { if (dims[k] === undefined) dims[k] = 0; });
  const sorted = Object.entries(dims).sort((a,b)=>b[1]-a[1]);
  const top5 = sorted.slice(0,5).map(([k,v])=>({ major:k, value:v }));
  const intro = {
    '哲学':'研究思维、存在与价值的学科，培养思辨与批判能力',
    '经济学':'研究资源配置与市场运行，含金融、国贸、财政等',
    '法学':'研究法律与社会规范，培养法律思维与实务能力',
    '教育学':'研究教育理论与实践，含师范、心理、教育技术',
    '文学':'研究语言文字与文学作品，含中文、外语、新闻',
    '历史学':'研究人类社会变迁，含考古、世界史、文物保护',
    '理学':'研究自然规律的基础学科，含数理化生天地',
    '工学':'应用科学解决工程问题，含机械、电子、计算机等',
    '农学':'研究农业与生命科学，含农学、林学、动医',
    '医学':'研究人体健康与疾病防治，含临床、口腔、药学',
    '管理学':'研究组织管理与决策，含工管、会计、信管',
    '艺术学':'研究艺术创作与审美，含美术、音乐、设计'
  };
  const career = {
    '哲学':'高校教师 / 研究员 / 公务员 / 编辑',
    '经济学':'金融分析师 / 银行 / 咨询 / 企业管理',
    '法学':'律师 / 法官 / 检察官 / 企业法务',
    '教育学':'教师 / 教研员 / 培训师 / 教育管理',
    '文学':'媒体编辑 / 出版 / 文案策划 / 翻译',
    '历史学':'文博 / 研究 / 教育 / 文化传媒',
    '理学':'科研人员 / 高校教师 / 高新技术研发',
    '工学':'工程师 / 研发 / 技术管理 / 产品',
    '农学':'农林科研 / 环保 / 食品 / 园艺',
    '医学':'医生 / 科研 / 医药 / 公共卫生',
    '管理学':'管理咨询 / 人力资源 / 运营 / 财务',
    '艺术学':'设计师 / 创作者 / 文化传媒 / 艺术教育'
  };
  return {
    top5,
    charts: [{ type:'bar', title:'12学科门类匹配度', data: sorted.map(([k,v])=>({label:k,value:v})) }],
    sections: [
      { title:'推荐专业 TOP5', content: top5.map((m,i)=>`${i+1}. ${m.major}（匹配度 ${m.value}）`).join('\n') },
      { title:'对应院校参考', content: top5.map(m=>`· ${m.major}：综合类 / 理工类 / 师范类 / 行业特色高校多有开设，建议结合学科评估排名选择`).join('\n') },
      { title:'专业课程简介', content: top5.map(m=>`${m.major}：${intro[m.major]||''}`).join('\n') },
      { title:'就业方向', content: top5.map(m=>`${m.major} → ${career[m.major]||''}`).join('\n') }
    ]
  };
}

// 压力报告（SAS标准分=粗分×1.25）
function buildStressReport(answers) {
  const total = answers.reduce((sum, optIdx, qIdx) => {
    const opt = stressQuestions[qIdx].options[optIdx];
    return sum + (opt ? opt.score : 0);
  }, 0);
  const max = stressQuestions.length * 4; // 80
  const stdScore = Math.round(total * 1.25); // 标准分
  let level, advice, warning='';
  if (stdScore < 50) {
    level = '正常范围（轻度压力）';
    advice = '· 保持规律作息与适度运动\n· 维持良好的社交与休闲\n· 继续保持当前的学习节奏\n· 学会劳逸结合，给自己放松时间';
  } else if (stdScore < 60) {
    level = '轻度焦虑';
    advice = '· 拆解学习任务，制定可达成的小目标\n· 练习深呼吸、正念冥想放松\n· 保证充足睡眠，避免熬夜\n· 主动向老师、家长或朋友倾诉';
  } else if (stdScore < 70) {
    level = '中度焦虑';
    advice = '· 调整学习节奏，给自己喘息空间\n· 每天进行30分钟户外运动释放压力\n· 减少咖啡因和糖分摄入\n· 学习放松技巧：渐进式肌肉放松\n· 建议与学校心理老师沟通';
    warning = '你的焦虑水平处于中度，建议主动寻求学校心理老师或专业心理咨询师的支持，学习压力管理技巧。';
  } else {
    level = '重度焦虑';
    advice = '· 立即调整学习强度，优先保证身心健康\n· 进行规律的有氧运动释放压力\n· 与信任的家人、老师深入沟通\n· 建立规律的睡眠和饮食';
    warning = '你的焦虑水平较高，请尽快联系学校心理老师、家长，或拨打心理援助热线（全国心理援助热线：400-161-9995 / 北京心理危机研究与干预中心：010-82951332）寻求专业支持。你不必独自面对。';
  }
  const pct = Math.round(total / max * 100);
  return {
    total, max, stdScore, pct, level,
    charts: [{ type:'gauge', title:'焦虑指数', value: pct, level }],
    sections: [
      { title:'压力等级', content:`${level}\n粗分 ${total}/${max}，标准分 ${stdScore}（SAS中国常模分界值 50 分）` },
      { title:'个性化减压建议', content:advice },
      ...(warning ? [{ title:'预警提示', content:warning, type:'warning' }] : [])
    ]
  };
}

// 报告生成总入口
function buildReport(assessId, answers) {
  const map = {
    holland: buildHollandReport,
    subject: buildSubjectReport,
    multiIntelligence: buildMultiIntelligenceReport,
    mbti: buildMbtiReport,
    bigFive: buildBigFiveReport,
    learningStyle: buildLearningStyleReport,
    majorMatch: buildMajorMatchReport,
    stress: buildStressReport
  };
  const fn = map[assessId];
  return fn ? fn(answers) : { sections: [{ title:'暂无报告', content:'' }] };
}

// 获取测评元数据
function getAssessById(id) {
  return assessments.find(a => a.id === id);
}

module.exports = {
  categories,
  assessments,
  questionBank,
  buildReport,
  getAssessById
};

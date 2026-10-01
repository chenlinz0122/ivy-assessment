# 常青藤在线测评

高中生升学规划测评微信小程序，提供多维度测评、社区交流、每日签到与成长档案等功能，帮助学生探索自我、规划未来。

## 功能概览

| 模块 | 说明 |
|------|------|
| 首页 | 品牌轮播、数据统计面板、八大测评分类入口、连续签到打卡 |
| 测评 | 8 套专业量表，逐题作答 + 滑入动画，完成后生成图表报告 |
| 社区 | 广场动态流（报告分享 + 话题讨论），支持匿名发帖、图片上传 |
| 签到 | 日历视图，每日打卡，连续天数统计 |
| 我的 | 个人资料编辑、头像上传、等级徽章、测评记录、成长档案导出 |
| 管理后台 | 用户列表、搜索筛选、封禁/解封/删除、CSV 导出、新用户订阅通知 |

## 测评量表

项目内置 8 套测评，覆盖升学规划核心维度：

| 量表 | 题数 | 维度 |
|------|------|------|
| 霍兰德职业兴趣 | 60 | 6 维度（R/I/A/S/E/C） |
| 选科评估 | 20 | 10 学科（浙江方案覆盖） |
| 多元智能 | 32 | 8 智能 |
| MBTI 性格 | 48 | 4 维度（E-I/S-N/T-F/J-P） |
| 大五人格 | 40 | 5 维度（O/C/E/A/N） |
| 学习风格 | 16 | 4 风格 |
| 专业匹配 | 24 | 12 学科门类 |
| 压力自评 | 20 | 含反向计分 |

## 项目结构

```
├── app.js                    # 全局逻辑：云开发初始化、登录态管理、隐私协议、版本更新
├── app.json                  # 页面路由、TabBar（首页/社区/我的）、窗口配置
├── app.wxss                  # 全局样式：CSS 变量、卡片、按钮、工具类
├── sitemap.json              # 小程序索引配置
│
├── pages/                    # ── 页面 ──
│   ├── index/                #    首页：轮播 + 数据面板 + 分类入口
│   ├── assess/               #    测评模块
│   │   ├── list              #      量表列表（分类筛选 + 骨架屏）
│   │   ├── detail            #      量表介绍（描述 + 开始按钮）
│   │   ├── answer            #      逐题作答（自动翻页 + 进度条）
│   │   └── result            #      报告展示（图表 + 分享加分）
│   ├── community/            #    社区模块
│   │   ├── index             #      广场（动态流 + 筛选排序 + 发帖）
│   │   ├── topic             #      话题分类（6 个讨论区）
│   │   ├── topicDetail       #      帖子详情（评论 + 图片预览）
│   │   └── reportDetail      #      报告分享详情
│   ├── checkin/              #    签到日历
│   ├── user/                 #    个人中心
│   │   ├── index             #      资料编辑 + 功能入口 + 隐藏管理入口
│   │   ├── records           #      测评记录列表
│   │   ├── badges            #      积分徽章 + 排行榜
│   │   └── archive           #      成长档案（Canvas 导出长图）
│   ├── login/                #    两步登录（资料填写 → 手机号授权）
│   ├── admin/                #    管理后台（用户管理 + CSV 导出）
│   └── privacy/              #    隐私政策页
│
├── components/               # ── 组件 ──
│   ├── assessment-card/      #    测评卡片
│   ├── chart/                #    图表（柱状/雷达/饼图/折线，Canvas 2D）
│   ├── result-chart/         #    报告专用图表（渐变雷达 + 动画柱状）
│   ├── progress-bar/         #    进度条
│   ├── rich-text/            #    富文本解析器（HTML → 原生 nodes）
│   └── skeleton/             #    骨架屏加载
│
├── cloudfunctions/           # ── 云函数 ──
│   ├── update-session-with-login/   # wx.login → code2Session 会话建立
│   ├── getPhoneNumber/              # 新版手机号快速验证
│   ├── update-user-info/            # 用户资料写入
│   ├── update-user-encrypted-data/  # 旧版加密数据解密（兼容）
│   ├── get-user-info/               # 按 openid 查询用户
│   ├── delete-user-info/            # 账号注销（清除用户+记录+积分）
│   ├── notify-admin/                # 新用户注册通知管理员（订阅消息）
│   ├── admin-manage-user/           # 管理员操作：封禁/解封/删除
│   ├── get-admin-user-list/         # 管理员查询用户列表
│   └── sms-code/                    # 短信验证码（含频率限制）
│
└── utils/                    # ── 工具层 ──
    ├── store.js              #    数据层：本地 7 表 CRUD + 云数据库操作 + 徽章计算
    ├── auth.js               #    认证工具：登录/资料更新/手机号绑定/注销
    ├── mockData.js           #    测评数据库：8 套量表题库 + 报告生成算法
    ├── notificationCenter.js #    发布-订阅事件总线
    ├── renderRichText.js     #    HTML → WXML 转换
    ├── seedComments.js       #    社区种子评论数据
    ├── config.js             #    AppID / AppSecret 配置（需自行填写）
    └── util.js               #    通用工具：时间格式化/ID生成/防抖节流/等级计算
```

## 技术要点

- **框架**：微信小程序原生开发，微信云开发（云数据库 + 云函数 + 云存储）
- **主题**：海绿色系（`#2E8B57`），CSS 变量统一管理
- **数据层**：本地 `wx.setStorageSync` 7 张表 + 云端数据库双写，离线可用
- **图表**：Canvas 2D 自绘雷达图 / 柱状图 / 饼图，无第三方依赖
- **登录**：两步流程 — 先填资料，再授权手机号；支持云端恢复登录态
- **隐私合规**：接入微信官方隐私弹窗，隐私政策页完整覆盖
- **安全**：管理员操作通过手机号白名单校验，敏感配置仅存云函数环境变量

## 快速开始

### 1. 克隆项目

```bash
git clone git@github.com:chenlinz0122/ivy-assessment.git
```

### 2. 微信开发者工具导入

打开 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)，选择「导入项目」，目录选择 `ivy-assessment`，填入你的小程序 AppID。

### 3. 配置密钥

编辑 `utils/config.js` 和 `cloudfunctions/update-session-with-login/config.js`（参考 `config-sample.js`），填入 AppID 和 AppSecret：

```js
module.exports = {
  appId: '你的AppID',
  secret: '你的AppSecret'
};
```

也可在云函数控制台设置环境变量 `appId` / `secret`，优先级高于配置文件。

### 4. 初始化云开发

在开发者工具中点击「云开发」，创建云环境，然后将 `app.js` 中的 `cloudEnv` 替换为你的环境 ID。

### 5. 部署云函数

右键 `cloudfunctions` 下每个函数文件夹 → 「上传并部署：云端安装依赖」。

### 6. 配置管理员

在云函数 `notify-admin` 和 `get-admin-user-list` 中设置环境变量 `ADMIN_PHONES`，填入管理员手机号（逗号分隔）。

## 目录说明

| 目录 / 文件 | 用途 |
|-------------|------|
| `pages/` | 17 个页面，覆盖全部用户交互 |
| `components/` | 6 个可复用组件 |
| `cloudfunctions/` | 10 个云函数 |
| `utils/` | 8 个工具模块 |
| `_archive/` | 已弃用的旧版登录代码（不参与打包） |
| `docs/` | 项目文档与管理手册 |

## License

本项目仅供学习与内部使用。

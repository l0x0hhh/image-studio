# MUSE — AI 图像创作工作台

基于 React、TypeScript 和 Motion 的 BYOK（Bring Your Own Key）图像创作工具。每位访客填写自己的 Base URL 和 API Key，直接连接自己的 OpenAI 兼容中转站。

## 技术栈

- React 19、Vite、TypeScript
- Radix UI、Motion、Lucide Icons
- 原生 CSS：深色/浅色主题、液态玻璃、响应式布局
- GitHub + Netlify 静态自动部署

## 密钥与隐私

- MUSE 不需要站主配置真实密钥，也没有共享上游密钥。
- 用户的请求从浏览器直接发送到用户自己填写的中转站，不经过 MUSE 服务器。
- API Key 默认只保存在 `sessionStorage`，关闭标签页后清除。
- 用户主动勾选“记住 Key”后，才保存到该浏览器的 `localStorage`。
- Base URL、主题和模型偏好属于非敏感配置，可保存在本地。
- 真实 Key 不进入前端源码、GitHub 或 Netlify 环境变量。

中转站必须允许网页来源的 CORS 请求。如果某个中转站不允许浏览器跨域，需要由该中转站开启 CORS，或由其运营者提供受控代理。

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

生产构建与预览：

```bash
npm run build
npm run preview
```

## Netlify 部署

项目已包含 `netlify.toml`，关联 GitHub 仓库后会自动使用：

```text
Build command: npm run build
Publish directory: dist
```

不需要配置任何 API Key 环境变量。每次 `git push` 后，Netlify 会自动构建和发布。

## 功能

- 文生图与多参考图创作
- 用户自定义 Base URL、API Key 和模型
- `/models` 模型拉取、搜索与本地缓存
- 调用用户自己的文本模型动态优化提示词
- 画面比例、数量、质量和随机种子
- 深色/浅色主题与偏好保存
- Motion 弹簧动画、液态玻璃效果
- 作品预览、收藏、下载和本次会话记录

## 目录结构

```text
src/
├── components/
│   ├── Gallery.tsx           # 作品画廊、收藏、下载和预览
│   ├── ModelPicker.tsx       # 可搜索模型菜单
│   ├── PromptComposer.tsx    # 提示词、参考图和生成操作
│   ├── SettingsDialog.tsx    # 用户接口配置弹窗
│   └── SettingsPanel.tsx     # 生成参数面板
├── hooks/useLocalStorage.ts  # 非敏感偏好持久化
├── lib/api.ts                # 用户中转站直连客户端
├── App.tsx                   # 页面与状态组合
├── main.tsx                  # React 入口
└── styles.css                # 双主题、液态玻璃与响应式样式
```

生成作品默认只保留在当前页面会话中，请及时下载。公共电脑上不要选择“记住 Key”。

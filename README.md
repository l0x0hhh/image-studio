# MUSE — AI 图像创作工作台

一个无需构建、直接在浏览器运行的中转站图片模型前端。

当前已预置并实测以下配置：

- Base URL：`https://test.token.xhalo.com.cn/v1`
- 模型：`qwen-image-3.0`
- 16:9 尺寸：`1664x928`
- 接口允许浏览器跨域访问，可直接从网页生成
- 示例结果：`qwen-product-illustration-20261101-010510.png`

首次打开后，只需在 **API 设置** 中填写自己的 Key 并保存。密钥没有写入项目源码。

## 启动

直接双击 `index.html`，或在当前目录启动静态服务：

```bash
python -m http.server 8080
```

然后访问 <http://localhost:8080>。

## 接口适配

在页面右上角打开 **API 设置**，填写中转站地址、Key 和模型 ID。

### OpenAI Images API

- 协议选择：`OpenAI Images API`
- Base URL：通常填写 `https://你的中转站/v1`
- 文生图请求：`POST /v1/images/generations`
- 参考图请求：`POST /v1/images/edits`
- 支持返回 `data[].url` 或 `data[].b64_json`

### Chat Completions 图像模型

- 协议选择：`Chat Completions（图像模型）`
- 请求：`POST /v1/chat/completions`
- 参考图以 OpenAI 多模态 `image_url` 格式发送
- 可识别 `message.images`、多模态 content、Markdown 图片链接、Base64 等常见返回形式

Base URL 也可以直接填写完整的 `/images/generations`、`/images/edits` 或 `/chat/completions` 地址。模型特有的参数可在“高级请求参数”中通过 JSON 添加。

## 功能

- 文生图与多参考图创作
- 从中转站 `/models` 一键拉取、搜索并缓存可用模型，也支持手动输入模型 ID
- 独立模型下拉列表，默认显示全部生图模型，可切换查看全部模型
- 深色 / 浅色主题切换，自动保存主题偏好
- 自定义比例、数量、质量、随机种子
- 图片预览、下载、收藏和本次会话生成记录
- API 连接测试（通过 `/models`，不消耗图片生成额度）
- 配置保存在浏览器 `localStorage`
- 桌面端与移动端响应式布局

## 文件说明

```text
image-studio/
├── index.html                         # 页面结构
├── styles.css                        # 样式、响应式布局和双主题
├── app.js                            # 模型拉取、图片生成与交互逻辑
├── qwen-product-illustration-*.png    # 首页示例图片
├── netlify.toml                      # Netlify 静态部署配置
├── .gitignore                        # Git 忽略规则
└── README.md                         # 使用说明
```

## 部署到 Netlify

1. 将 `image-studio` 目录初始化为 Git 仓库并推送到 GitHub。
2. 在 Netlify 选择 **Add new project → Import an existing project → GitHub**。
3. 选择对应仓库和 `main` 分支。
4. 项目已包含 `netlify.toml`，无需填写构建命令，发布目录为项目根目录。
5. 后续执行 `git push`，Netlify 会自动部署更新。

API Key 只保存在访问者的浏览器中，不需要、也不应写入 GitHub 仓库或前端源码。

## 注意

1. 浏览器会直接请求中转站，因此中转站需要允许当前网页来源的 CORS 请求。
2. API Key 仅保存在当前浏览器，但公共电脑上仍不建议保存密钥。
3. 当前作品列表保存在页面会话中，刷新页面后不会保留；请及时下载需要保存的图片。
4. 精选灵感使用 Unsplash 示例图片，首次加载需要网络。

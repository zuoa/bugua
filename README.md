# 卜卦 H5

一个可部署到 Cloudflare Workers 的移动端卜卦页面，支持：

- 梅花易数时间起卦
- 六爻三枚硬币起卦
- 本地 `localStorage` 历史记录
- 本地规则解卦
- 可选 DeepSeek 深度解读

## 本地启动

1. 安装依赖：`npm install`
2. 本地运行：`npm run dev`

## 部署

1. 登录 Cloudflare：`npx wrangler login`
2. 发布：`npm run deploy`

## 深度解读配置

未配置时，页面会使用前端内置的积极向上解读。

如果要启用 `/api/interpret`：

1. 设置密钥：`npx wrangler secret put DEEPSEEK_API_KEY`
2. 可选变量：

```toml
[vars]
DEEPSEEK_BASE_URL = "https://api.deepseek.com/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"
```

## 规则口径

- 梅花易数：采用常见“时间起卦”法，按农历月日、地支年数、地支时数取数。
- 六爻：采用常见“三枚硬币六次成卦”法，正面记阳、反面记阴。

页面中已明确显示此口径，用于文化体验与自我整理，不替代现实决策。

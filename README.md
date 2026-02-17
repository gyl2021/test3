# 微信小程序：N8N 对话示例

这是一个最小可用的微信小程序源码，支持：

- 使用 **n8n webhook（POST）** 调用后端工作流
- 对话框聊天模式
- 展示 n8n 返回的引用文件信息（文件名 / 来源 / 摘要）
- 采用宏定义/数组方式维护 Webhook URL 与 Header Auth（不在页面输入）

## 目录结构

```text
.
├── app.js
├── app.json
├── app.wxss
├── pages/
│   └── chat/
│       ├── chat.js
│       ├── chat.json
│       ├── chat.wxml
│       └── chat.wxss
└── utils/
    └── n8n.js
```

## 手动配置（宏定义/数组）

编辑 `utils/n8n.js`：

```js
const N8N_WEBHOOK_URL = 'https://your-n8n-domain/webhook/xxx';
const N8N_AUTH_MODE = 'bearer'; // none | bearer | x-api-key | custom
const N8N_AUTH_TOKEN = 'your-token';

// 当 N8N_AUTH_MODE='custom' 时使用：
const N8N_AUTH_HEADERS = [
  ['X-API-KEY', 'your-api-key']
  // ['Authorization', 'Bearer xxx']
];
```

说明：
- `N8N_WEBHOOK_URL`：n8n webhook 地址。  
- `N8N_AUTH_MODE`：鉴权模式。  
- `N8N_AUTH_TOKEN`：`bearer/x-api-key` 模式下的 token。  
- `N8N_AUTH_HEADERS`：自定义 Header 数组，每项是 `[headerName, headerValue]`。

> 页面中已取消 Webhook 和认证输入框，你可直接在宏定义里手动维护。

## 常见 403 排查

若提示 `n8n 请求失败，HTTP 403`：

1. 检查 `N8N_WEBHOOK_URL` 是否对应正确工作流（测试/生产 URL 不同）。
2. 检查 `N8N_AUTH_MODE` 与 n8n 端鉴权配置是否一致：
   - Header Auth 常见是 `X-API-KEY`
   - 或 `Authorization: Bearer <token>`
3. 确认小程序后台已把 n8n 域名加到 **request 合法域名**。
4. 查看小程序返回的完整错误（本项目会附带服务端 message/error 字段）。

## n8n 返回格式建议

前端会兼容以下字段：

- 回复文本：`reply` / `answer` / `text` / `output`
- 引用文件：`files` / `references` / `citations`

示例：

```json
{
  "reply": "已根据你的问题检索知识库，答案如下...",
  "files": [
    {
      "name": "产品手册.pdf",
      "source": "https://example.com/manual.pdf",
      "snippet": "第 3 章提到..."
    }
  ]
}
```

## 使用说明

1. 在微信开发者工具中导入本目录。
2. 在 `utils/n8n.js` 中填写 `N8N_WEBHOOK_URL` 和鉴权宏定义。
3. 输入消息并发送。

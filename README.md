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

const N8N_AUTH_HEADERS = [
  ['X-API-KEY', 'your-api-key']
  // ['Authorization', 'Bearer xxx']
];
```

说明：
- `N8N_WEBHOOK_URL`：n8n webhook 地址。  
- `N8N_AUTH_HEADERS`：Header 认证数组，每项是 `[headerName, headerValue]`。  
- 内部会自动将数组转换为请求头对象。

> 页面中已取消 Webhook 和认证输入框，你可直接在宏定义里手动维护。

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
2. 在 `utils/n8n.js` 中填写 `N8N_WEBHOOK_URL` 与 `N8N_AUTH_HEADERS`。
3. 输入消息并发送。

> 注意：需在小程序后台将 n8n 域名配置到 request 合法域名中。

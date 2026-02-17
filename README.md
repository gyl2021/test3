# 微信小程序：N8N 对话示例

这是一个最小可用的微信小程序源码，支持：

- 使用 **n8n webhook（POST）** 调用后端工作流
- 使用 **Header Auth**（可自定义 Header 名称和值）
- 对话框聊天模式
- 展示 n8n 返回的引用文件信息（文件名 / 来源 / 摘要）

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
2. 填写 `Webhook URL`。
3. 填写 Header Auth：
   - Header 名称：如 `X-API-KEY` 或 `Authorization`
   - Header 值：对应的密钥或 `Bearer xxx`
4. 输入消息并发送。

> 注意：需在小程序后台将 n8n 域名配置到 request 合法域名中。

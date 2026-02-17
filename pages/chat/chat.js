const { callN8NWebhook } = require('../../utils/n8n');

Page({
  data: {
    webhookUrl: '',
    authHeaderName: 'X-API-KEY',
    authHeaderValue: '',
    inputMessage: '',
    loading: false,
    messages: [
      {
        role: 'assistant',
        content: '你好，我是 N8N 对话助手。请先配置 Webhook 与 Header Auth，然后开始聊天。',
        files: []
      }
    ]
  },

  onWebhookInput(e) {
    this.setData({ webhookUrl: e.detail.value.trim() });
  },

  onHeaderNameInput(e) {
    this.setData({ authHeaderName: e.detail.value.trim() });
  },

  onHeaderValueInput(e) {
    this.setData({ authHeaderValue: e.detail.value.trim() });
  },

  onMessageInput(e) {
    this.setData({ inputMessage: e.detail.value });
  },

  async onSend() {
    const { webhookUrl, authHeaderName, authHeaderValue, inputMessage, messages, loading } = this.data;

    if (loading) return;

    const message = inputMessage.trim();
    if (!message) {
      wx.showToast({ title: '请输入消息', icon: 'none' });
      return;
    }

    const userMessage = { role: 'user', content: message, files: [] };
    const nextMessages = [...messages, userMessage];

    this.setData({
      messages: nextMessages,
      inputMessage: '',
      loading: true
    });

    try {
      const history = nextMessages.map((item) => ({ role: item.role, content: item.content }));
      const result = await callN8NWebhook({
        webhookUrl,
        authHeaderName,
        authHeaderValue,
        message,
        history
      });

      this.setData({
        messages: [
          ...nextMessages,
          {
            role: 'assistant',
            content: result.reply,
            files: result.files
          }
        ]
      });
    } catch (error) {
      this.setData({
        messages: [
          ...nextMessages,
          {
            role: 'assistant',
            content: `请求失败：${error.message}`,
            files: []
          }
        ]
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});

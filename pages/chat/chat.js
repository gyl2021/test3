const { callN8NWebhook } = require('../../utils/n8n');

Page({
  data: {
    inputMessage: '',
    loading: false,
    messages: [
      {
        role: 'assistant',
        content: '你好，我是 N8N 对话助手。Webhook 与认证请在 utils/n8n.js 中手动配置，然后开始聊天。',
        files: []
      }
    ]
  },

  onMessageInput(e) {
    this.setData({ inputMessage: e.detail.value });
  },

  async onSend() {
    const { inputMessage, messages, loading } = this.data;

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

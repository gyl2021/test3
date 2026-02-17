const DEFAULT_TIMEOUT = 30000;

/**
 * 调用 n8n webhook（POST + Header Auth）
 * @param {Object} params
 * @param {string} params.webhookUrl n8n webhook 地址
 * @param {string} params.authHeaderName Header 名称，例如 X-API-KEY 或 Authorization
 * @param {string} params.authHeaderValue Header 值
 * @param {string} params.message 用户消息
 * @param {Array} params.history 对话历史
 */
function callN8NWebhook({ webhookUrl, authHeaderName, authHeaderValue, message, history = [] }) {
  return new Promise((resolve, reject) => {
    if (!webhookUrl) {
      reject(new Error('请先填写 n8n Webhook URL'));
      return;
    }

    if (!authHeaderName || !authHeaderValue) {
      reject(new Error('请填写 Header Auth 的名称和值'));
      return;
    }

    wx.request({
      url: webhookUrl,
      method: 'POST',
      timeout: DEFAULT_TIMEOUT,
      header: {
        'content-type': 'application/json',
        [authHeaderName]: authHeaderValue
      },
      data: {
        message,
        history,
        timestamp: Date.now()
      },
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`n8n 请求失败，HTTP ${res.statusCode}`));
          return;
        }

        const parsed = normalizeResponse(res.data);
        resolve(parsed);
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'));
      }
    });
  });
}

/**
 * 标准化 n8n 返回结果
 * 支持常见字段：reply/answer/text + files/references
 */
function normalizeResponse(payload) {
  const data = Array.isArray(payload) ? payload[0] || {} : payload || {};

  const reply =
    data.reply ||
    data.answer ||
    data.text ||
    data.output ||
    'n8n 已收到消息，但未返回 reply/answer/text 字段。';

  const filesRaw = data.files || data.references || data.citations || [];
  const files = Array.isArray(filesRaw)
    ? filesRaw.map((item, index) => ({
        name: item.name || item.fileName || `引用文件 ${index + 1}`,
        source: item.source || item.url || item.path || '',
        snippet: item.snippet || item.content || ''
      }))
    : [];

  return { reply, files };
}

module.exports = {
  callN8NWebhook
};

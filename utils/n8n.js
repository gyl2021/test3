const DEFAULT_TIMEOUT = 30000;

/**
 * n8n Webhook 宏定义（手动配置）
 */
const N8N_WEBHOOK_URL = '';

/**
 * Header Auth 宏定义（手动配置）
 * 结构为 [key, value] 的二维数组，便于统一维护。
 * 例如：
 * const N8N_AUTH_HEADERS = [
 *   ['X-API-KEY', 'your-api-key'],
 *   ['Authorization', 'Bearer xxx']
 * ];
 */
const N8N_AUTH_HEADERS = [];

function buildAuthHeaders() {
  return N8N_AUTH_HEADERS.reduce((headers, pair) => {
    if (!Array.isArray(pair) || pair.length < 2) return headers;

    const [key, value] = pair;
    if (!key || value === undefined || value === null || value === '') return headers;

    headers[key] = String(value);
    return headers;
  }, {});
}

/**
 * 调用 n8n webhook（POST + Header Auth）
 * @param {Object} params
 * @param {string} params.message 用户消息
 * @param {Array} params.history 对话历史
 */
function callN8NWebhook({ message, history = [] }) {
  return new Promise((resolve, reject) => {
    if (!N8N_WEBHOOK_URL) {
      reject(new Error('请先在 utils/n8n.js 中配置 N8N_WEBHOOK_URL'));
      return;
    }

    const authHeaders = buildAuthHeaders();

    wx.request({
      url: N8N_WEBHOOK_URL,
      method: 'POST',
      timeout: DEFAULT_TIMEOUT,
      header: {
        'content-type': 'application/json',
        ...authHeaders
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
  callN8NWebhook,
  N8N_WEBHOOK_URL,
  N8N_AUTH_HEADERS
};

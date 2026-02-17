const DEFAULT_TIMEOUT = 30000;

/**
 * n8n Webhook 宏定义（手动配置）
 */
const N8N_WEBHOOK_URL = '';

/**
 * n8n Header Auth 模式：
 * - 'none'        不加鉴权头
 * - 'bearer'      自动拼接 Authorization: Bearer <token>
 * - 'x-api-key'   自动拼接 X-API-KEY: <token>
 * - 'custom'      使用 N8N_AUTH_HEADERS 数组
 */
const N8N_AUTH_MODE = 'none';

/**
 * 当 N8N_AUTH_MODE 为 bearer/x-api-key 时使用。
 */
const N8N_AUTH_TOKEN = '';

/**
 * 自定义 Header Auth 宏定义（手动配置）
 * 结构为 [key, value] 的二维数组。
 */
const N8N_AUTH_HEADERS = [];

function buildAuthHeaders() {
  if (N8N_AUTH_MODE === 'bearer') {
    return N8N_AUTH_TOKEN ? { Authorization: `Bearer ${N8N_AUTH_TOKEN}` } : {};
  }

  if (N8N_AUTH_MODE === 'x-api-key') {
    return N8N_AUTH_TOKEN ? { 'X-API-KEY': N8N_AUTH_TOKEN } : {};
  }

  if (N8N_AUTH_MODE !== 'custom') {
    return {};
  }

  return N8N_AUTH_HEADERS.reduce((headers, pair) => {
    if (!Array.isArray(pair) || pair.length < 2) return headers;

    const [key, value] = pair;
    if (!key || value === undefined || value === null || value === '') return headers;

    headers[key] = String(value);
    return headers;
  }, {});
}

function formatError(statusCode, payload) {
  const detail = extractErrorDetail(payload);
  return detail ? `n8n 请求失败，HTTP ${statusCode}：${detail}` : `n8n 请求失败，HTTP ${statusCode}`;
}

function extractErrorDetail(payload) {
  if (!payload) return '';

  if (typeof payload === 'string') return payload;

  if (Array.isArray(payload)) {
    return payload.map((item) => extractErrorDetail(item)).filter(Boolean).join('; ');
  }

  if (typeof payload === 'object') {
    return (
      payload.message ||
      payload.error ||
      payload.reason ||
      payload.description ||
      ''
    );
  }

  return '';
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
          reject(new Error(formatError(res.statusCode, res.data)));
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
  N8N_AUTH_MODE,
  N8N_AUTH_TOKEN,
  N8N_AUTH_HEADERS
};

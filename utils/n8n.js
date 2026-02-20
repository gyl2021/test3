const DEFAULT_TIMEOUT = 30000;

/**
 * n8n Webhook 宏定义（手动配置）
 */
const N8N_WEBHOOK_URL = '';

/**
 * n8n Header Auth 模式：
 * - 'none'                 不加鉴权头（若配置了 N8N_AUTH_HEADERS 会自动按 custom 处理）
 * - 'bearer'               Authorization: Bearer <token>
 * - 'authorization-raw'    Authorization: <token原文>
 * - 'x-api-key'            X-API-KEY: <token>
 * - 'custom'               使用 N8N_AUTH_HEADERS
 */
const N8N_AUTH_MODE = 'none';

/**
 * 当 N8N_AUTH_MODE 为 bearer/authorization-raw/x-api-key 时使用。
 * 注意：如果已包含 "Bearer " 前缀，bearer 模式不会重复拼接。
 */
const N8N_AUTH_TOKEN = '';

/**
 * 自定义 Header Auth 宏定义（手动配置）
 * 支持三种写法：
 * 1) 二维数组：[['Authorizationdata', 'xxx'], ['X-API-KEY', 'yyy']]
 * 2) 单条数组：['Authorizationdata', 'xxx']
 * 3) 对象：{ Authorizationdata: 'xxx' }
 */
const N8N_AUTH_HEADERS = [];

function withBearerPrefix(token) {
  const value = String(token || '').trim();
  if (!value) return '';
  return /^Bearer\s+/i.test(value) ? value : `Bearer ${value}`;
}

function normalizeCustomAuthHeaders(rawHeaders) {
  if (!rawHeaders) return {};

  if (Array.isArray(rawHeaders) && rawHeaders.length >= 2 && !Array.isArray(rawHeaders[0])) {
    const [key, value] = rawHeaders;
    if (!key || value === undefined || value === null || value === '') return {};
    return { [String(key)]: String(value) };
  }

  if (Array.isArray(rawHeaders)) {
    return rawHeaders.reduce((headers, pair) => {
      if (!Array.isArray(pair) || pair.length < 2) return headers;
      const [key, value] = pair;
      if (!key || value === undefined || value === null || value === '') return headers;
      headers[String(key)] = String(value);
      return headers;
    }, {});
  }

  if (typeof rawHeaders === 'object') {
    return Object.keys(rawHeaders).reduce((headers, key) => {
      const value = rawHeaders[key];
      if (value === undefined || value === null || value === '') return headers;
      headers[String(key)] = String(value);
      return headers;
    }, {});
  }

  return {};
}

function resolveAuthMode() {
  if (N8N_AUTH_MODE !== 'none') return N8N_AUTH_MODE;
  const customHeaders = normalizeCustomAuthHeaders(N8N_AUTH_HEADERS);
  return Object.keys(customHeaders).length > 0 ? 'custom' : 'none';
}

function buildAuthHeaders() {
  const mode = resolveAuthMode();

  if (mode === 'bearer') {
    const authValue = withBearerPrefix(N8N_AUTH_TOKEN);
    return authValue ? { Authorization: authValue } : {};
  }

  if (mode === 'authorization-raw') {
    return N8N_AUTH_TOKEN ? { Authorization: String(N8N_AUTH_TOKEN).trim() } : {};
  }

  if (mode === 'x-api-key') {
    return N8N_AUTH_TOKEN ? { 'X-API-KEY': String(N8N_AUTH_TOKEN).trim() } : {};
  }

  if (mode === 'custom') {
    return normalizeCustomAuthHeaders(N8N_AUTH_HEADERS);
  }

  return {};
}

function formatError(statusCode, payload) {
  const detail = extractErrorDetail(payload);
  const normalizedDetail = normalizeServerMessage(detail);
  const authDebugText = getAuthorizationDebugText();
  return normalizedDetail
    ? `n8n 请求失败，HTTP ${statusCode}：${normalizedDetail}${authDebugText}`
    : `n8n 请求失败，HTTP ${statusCode}${authDebugText}`;
}

function pickAuthorizationData(headers) {
  return (
    headers.Authorization ||
    headers.authorization ||
    headers.Authorizationdata ||
    headers.authorizationdata ||
    ''
  );
}

function getAuthorizationDebugText() {
  const authHeaders = buildAuthHeaders();
  const authorizationData = pickAuthorizationData(authHeaders);
  const authHeadersJson = JSON.stringify(authHeaders);

  if (!authorizationData) {
    return `；Authorizationdata：<empty>；AuthHeaders：${authHeadersJson}`;
  }

  return `；Authorizationdata：${authorizationData}；AuthHeaders：${authHeadersJson}`;
}

function normalizeServerMessage(message) {
  const text = String(message || '').trim();
  if (!text) return '';

  if (/Authorizationdata\s+is\s+wrong!?/i.test(text)) {
    return 'Authorization data is wrong!（请检查 Header 名和 Token 内容是否与服务端完全一致）';
  }

  return text;
}

function extractErrorDetail(payload) {
  if (!payload) return '';

  if (typeof payload === 'string') return payload;

  if (Array.isArray(payload)) {
    return payload.map((item) => extractErrorDetail(item)).filter(Boolean).join('; ');
  }

  if (typeof payload === 'object') {
    return payload.message || payload.error || payload.reason || payload.description || '';
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
          console.warn('n8n 请求鉴权调试信息：', {
            statusCode: res.statusCode,
            resolvedAuthMode: resolveAuthMode(),
            authHeaders
          });
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

const path = require('node:path');

// XMCL currently passes `throwOnError` to undici.request even though recent
// Undici releases reject that option. Keep XMCL's expected semantics while
// staying on a patched Undici release: drain an HTTP error response and throw.
function patchUndiciRequest(packageName) {
  let undici;
  try {
    const packageEntry = require.resolve(packageName);
    const packageRoot = path.resolve(path.dirname(packageEntry), '..');
    const undiciEntry = require.resolve('undici', { paths: [packageRoot] });
    undici = require(undiciEntry);
  } catch {
    return;
  }

  if (!undici?.request || undici.request.__lumenThrowOnErrorCompat) return;
  const originalRequest = undici.request;
  const compatibleRequest = async (url, options = {}) => {
    if (typeof options === 'function') return originalRequest(url, options);
    const { throwOnError = false, ...requestOptions } = options || {};
    const response = await originalRequest(url, requestOptions);
    if (throwOnError && response.statusCode >= 400) {
      await response.body?.dump?.().catch(() => {});
      const error = new Error(`HTTP ${response.statusCode} while requesting ${String(url)}`);
      error.statusCode = response.statusCode;
      throw error;
    }
    return response;
  };
  compatibleRequest.__lumenThrowOnErrorCompat = true;
  undici.request = compatibleRequest;
}

module.exports = patchUndiciRequest;

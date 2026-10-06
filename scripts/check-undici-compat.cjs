const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const patchUndiciRequest = require('../electron/undici-compat.cjs');

async function main() {
  patchUndiciRequest('@xmcl/installer');

  const installerEntry = require.resolve('@xmcl/installer');
  const installerRoot = path.resolve(path.dirname(installerEntry), '..');
  const undiciEntry = require.resolve('undici', { paths: [installerRoot] });
  const { request } = require(undiciEntry);
  assert.equal(request.__lumenThrowOnErrorCompat, true, 'XMCL Undici request should be patched');

  const server = http.createServer((_request, response) => {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('not found');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const address = server.address();
    await assert.rejects(
      request(`http://127.0.0.1:${address.port}/missing`, { throwOnError: true }),
      (error) => error.statusCode === 404,
    );
    console.log('XMCL Undici compatibility check passed.');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import http from 'node:http';
import zlib from 'node:zlib';

const TARGET_HOST = '127.0.0.1';
const TARGET_PORT = 3000;
const PROXY_PORT = 3001;

let particlesEnabled = true;

const TARGET_STRING = 'function i(){let{mode:e,lightMode:n,reducedMotion:i}=(0,o.useMode)(),a=n||i||"light"===e||"reduced"===e,l=(0,r.useRef)(null);return((0,r.useEffect)(()=>{if(a)return;let e=l';
const REPLACEMENT_STRING = 'function i(){return null;let{mode:e,lightMode:n,reducedMotion:i}=(0,o.useMode)(),a=n||i||"light"===e||"reduced"===e,l=(0,r.useRef)(null);return((0,r.useEffect)(()=>{if(a)return;let e=l';

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/__proxy_control') {
    const p = url.searchParams.get('particles');
    if (p !== null) {
      particlesEnabled = p === '1' || p === 'true';
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ particlesEnabled }));
    return;
  }

  const isTargetChunk = url.pathname.includes('0ty___o_-32x2.js');

  const proxyReq = http.request(
    {
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${TARGET_HOST}:${TARGET_PORT}`,
        // Disable compression for target chunk if we need to modify it
        ...(isTargetChunk && !particlesEnabled ? { 'accept-encoding': 'identity' } : {}),
      },
    },
    (proxyRes) => {
      if (isTargetChunk && !particlesEnabled) {
        const chunks = [];
        proxyRes.on('data', (c) => chunks.push(c));
        proxyRes.on('end', () => {
          let body = Buffer.concat(chunks);
          const encoding = proxyRes.headers['content-encoding'];
          if (encoding === 'gzip') {
            body = zlib.gunzipSync(body);
          } else if (encoding === 'br') {
            body = zlib.brotliDecompressSync(body);
          }

          let str = body.toString('utf8');
          if (str.includes(TARGET_STRING)) {
            str = str.replace(TARGET_STRING, REPLACEMENT_STRING);
          }

          const responseHeaders = { ...proxyRes.headers };
          delete responseHeaders['content-encoding'];
          delete responseHeaders['content-length'];
          responseHeaders['cache-control'] = 'no-store, no-cache, must-revalidate';

          res.writeHead(proxyRes.statusCode, responseHeaders);
          res.end(str);
        });
      } else {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    }
  );

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end(`Proxy error: ${err.message}`);
  });

  req.pipe(proxyReq);
});

server.listen(PROXY_PORT, '127.0.0.1', () => {
  console.log(`[Proxy] Listening on http://127.0.0.1:${PROXY_PORT} -> forwarding to http://${TARGET_HOST}:${TARGET_PORT}`);
});


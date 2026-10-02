// Gateway local que imita a URL única do Supabase: /auth/v1 -> GoTrue, /rest/v1 -> PostgREST.
const http = require('http');
const rotas = [['/auth/v1', 9999], ['/rest/v1', 3000]];
http.createServer((req, res) => {
  const cors = {
    'access-control-allow-origin': req.headers.origin || '*',
    'access-control-allow-headers': req.headers['access-control-request-headers'] || '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-expose-headers': 'content-range, x-supabase-api-version',
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const r = rotas.find(([p]) => req.url.startsWith(p));
  if (!r) { res.writeHead(404, cors); return res.end(); }
  const headers = { ...req.headers, host: 'localhost' };
  const prox = http.request({ host: '127.0.0.1', port: r[1], path: req.url.slice(r[0].length) || '/', method: req.method, headers }, (p) => {
    res.writeHead(p.statusCode, { ...p.headers, ...cors });
    p.pipe(res);
  });
  prox.on('error', (e) => { res.writeHead(502, cors); res.end(String(e)); });
  req.pipe(prox);
}).listen(8000);

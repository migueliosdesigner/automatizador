import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const root = new URL(process.argv[2] === 'dist' ? '../dist/' : '../public/', import.meta.url);
const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/manifest+json' };
const port = Number(process.env.PORT || 4173);

createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const headers = Object.fromEntries(config.headers[0].headers.map(({ key, value }) => [key, value]));
  delete headers['Strict-Transport-Security'];
  const stream = /^\/(?:en\/)?stream-deck(?:\/index\.html|\/)?$/.test(path);
  const policy = config.headers[stream ? 2 : path === "/" ? 3 : 1];
  Object.assign(headers, Object.fromEntries(policy.headers.map(({ key, value }) => [key, value])));
  if (/^\/assets\/.*\.(?:svg|png|webp|ico)$/.test(path)) headers['Cache-Control'] = config.headers[4].headers[0].value;

  async function showError(status) {
    const content = await readFile(new URL(status + '.html', root)).catch(() => 'Erro ' + status);
    response.writeHead(status, { ...headers, 'Content-Type': types['.html'], 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : content);
  }

  const directory = /^\/(?:[a-z0-9-]+\/)*[a-z0-9-]+$/.test(path);
  if (!directory && !/^\/(?:[a-z0-9-]+\/)*(?:[a-z0-9-]+\.[a-z]+)?$/.test(path)) {
    return showError(404);
  }
  const file = directory ? path + '/index.html' : path.endsWith('/') ? path + 'index.html' : path;
  try {
    const data = await readFile(new URL('.' + file, root));
    if (directory) {
      response.writeHead(308, { ...headers, Location: path + '/' }).end();
      return;
    }
    response.writeHead(200, { ...headers, 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch (error) {
    await showError(error.code === 'ENOENT' ? 404 : 500);
  }
}).listen(port, '127.0.0.1', () => console.log('Local: http://127.0.0.1:' + port + '/'));

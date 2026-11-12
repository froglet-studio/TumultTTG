#!/usr/bin/env node
/**
 * Tiny dev server: rebuilds the single-file game on every request.
 *
 *   node tools/dev-server.mjs [port]     then open http://localhost:5173
 *                                        (http://localhost:5173/?playtest for the playtest build)
 *
 * Edit anything under src/, refresh the browser. No dependencies, no watcher.
 */
import http from 'node:http';
import { build } from './build.mjs';

const port = Number(process.argv[2]) || 5173;
http
  .createServer((req, res) => {
    if (req.url !== '/' && !req.url.startsWith('/?')) {
      res.writeHead(404).end('not found');
      return;
    }
    try {
      const { html } = build({ playtest: /[?&]playtest\b/.test(req.url) });
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(html);
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end(String(err.stack || err));
    }
  })
  // localhost only: this is a development convenience, not something to expose on the network
  .listen(port, '127.0.0.1', () => console.log(`Tumult dev server → http://localhost:${port}  (rebuilds on refresh)`));

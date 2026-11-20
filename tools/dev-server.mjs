#!/usr/bin/env node
/**
 * Tiny dev server: rebuilds the game on every page load.
 *
 *   node tools/dev-server.mjs [port]         then open http://localhost:5173
 *                                            (http://localhost:5173/?playtest for the playtest build)
 *   node tools/dev-server.mjs --web [port]   the web version (dist/web, split into cacheable files),
 *                                            served as GitHub Pages would serve it, service worker included
 *
 * Edit anything under src/, refresh the browser. No dependencies, no watcher.
 */
import http from 'node:http';
import { build, buildWeb } from './build.mjs';

const web = process.argv.includes('--web');
const port = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a))) || 5173;
const TYPES = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  png: 'image/png',
  woff2: 'font/woff2',
};

let files = null; // the web version, rebuilt whenever the page itself is requested
const serveWeb = (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
  if (path === 'index.html' || !files) files = buildWeb({ playtest: /[?&]playtest\b/.test(req.url) }).files;
  const body = files.get(path);
  if (body == null) return res.writeHead(404).end('not found');
  const type = TYPES[path.split('.').pop()] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }).end(body);
};

http
  .createServer((req, res) => {
    try {
      if (web) return serveWeb(req, res);
      if (req.url !== '/' && !req.url.startsWith('/?')) {
        res.writeHead(404).end('not found');
        return;
      }
      const { html } = build({ playtest: /[?&]playtest\b/.test(req.url) });
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(html);
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end(String(err.stack || err));
    }
  })
  // localhost only: this is a development convenience, not something to expose on the network
  .listen(port, '127.0.0.1', () =>
    console.log(`Tumult dev server${web ? ' (web version)' : ''} → http://localhost:${port}  (rebuilds on refresh)`),
  );

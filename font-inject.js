/**
 * font-inject.js — استضافة خط Tajawal ذاتياً + حقن تلقائي في كل صفحات HTML
 * ─────────────────────────────────────────────────────────────────────────
 * الغرض: إلغاء الاعتماد على Google Fonts CDN (fonts.googleapis.com /
 * fonts.gstatic.com). عند تعذر وصول المتصفح لهما (شبكات معينة، متصفح
 * تيليجرام المدمج، حجب DNS) تنهار الخطوط إلى خط النظام الاحتياطي ويختلف
 * المظهر عن المرجع. هذه الوحدة تضمن تحميل Tajawal من نفس نطاق الموقع دائماً.
 *
 * التكامل (سطران فقط في server.js — قبل أي route أو express.static):
 *    const fontInject = require('./font-inject');
 *    app.use(fontInject());
 *  ملاحظة: يجب أن يكون هذا الملف والمجلد fonts/ و selfhost-fonts.css
 *  في نفس مجلد ملفات HTML (جذر المشروع بجانب server.js).
 *
 * التغطية (5 طبقات — أي نمط تقديم صفحات يُغطى):
 *   1) /selfhost-fonts.css و /fonts/tajawal-*.woff2 — خدمة مباشرة.
 *   2) أي مسار ينتهي بـ .html — قراءة من مجلد الوحدة وحقن فوري
 *      (يلي express.static لو الملف غير موجود هنا).
 *   3) res.send / res.render — تغليف مع فحص Content-Type.
 *   4) res.sendFile / res.sendfile — تغليف (مسارات sendFile اليدوية).
 *   5) res.write/res.end مع تخزين مؤقت لاستجابات text/html فقط —
 *      يغطي express.static الذي يمرر عبر stream مباشرة.
 *
 * الضمانات:
 *   - ملفات HTML على القرص تبقى مطابقة حرفياً للمرجع (الحقن وقت الاستجابة).
 *   - كل شيء داخل try/catch — أي خلل يتجاوز بصمت ولا يكسر التطبيق.
 *   - الحقن خامد الإعادة (idempotent) — لا تكرار مهما تداخلت الطبقات.
 *   - لا تخزين HTML في الذاكرة (يُقرأ حياً) — تعديلات الملفات فورية.
 *   - تجاوز استجابات 206/304 وغير 200، والمضغوطة (gzip/br)، و HEAD السليمة.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MODULE_DIR = __dirname;
const FONTS_DIR = path.join(MODULE_DIR, 'fonts');
const CSS_FILE = path.join(MODULE_DIR, 'selfhost-fonts.css');
const INJECT_TAG = '<link rel="stylesheet" href="/selfhost-fonts.css">';

/* ─────────── ذاكرة تخزين: للخطوط فقط (immutable) — HTML تُقرأ حية ─────────── */
const fontCache = new Map();
function readFont(file) {
  if (fontCache.has(file)) return fontCache.get(file);
  try {
    const data = fs.readFileSync(file);
    if (fontCache.size < 50) fontCache.set(file, data);
    return data;
  } catch (e) {
    return null;
  }
}
function readLive(file) {
  try { return fs.readFileSync(file); } catch (e) { return null; }
}

const MIME = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.css': 'text/css; charset=utf-8',
};

/* ─────────── حقن وسم الخط في HTML — آمن للإعادة ─────────── */
function injectFontLink(html) {
  try {
    if (typeof html !== 'string' || !html) return html;
    if (html.includes('selfhost-fonts.css')) return html; // محقَن مسبقاً
    if (!/<head[^>]*>/i.test(html)) return html;
    return html.replace(/<head([^>]*)>/i, (m, attrs) => `<head${attrs}>` + INJECT_TAG);
  } catch (e) {
    return html;
  }
}
function injectBuffer(buf) {
  try {
    return Buffer.from(injectFontLink(buf.toString('utf8')), 'utf8');
  } catch (e) {
    return buf;
  }
}

/* ─────────── خدمة ملفات الخطوط و CSS ─────────── */
function serveAsset(res, file, cacheHeader, useCache) {
  const data = useCache ? readFont(file) : readLive(file);
  if (!data) { res.statusCode = 404; return res.end('Not Found'); }
  const ext = path.extname(file).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', cacheHeader);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Length', data.length);
  res.end(data);
}

/* ─────────── الوسيط الرئيسي ─────────── */
module.exports = function fontInject() {
  return function fontInjectMiddleware(req, res, next) {
    const url0 = (req.url || '').split('?')[0];

    /* ── الطبقة 1: الخطوط و CSS ── */
    try {
      if (url0 === '/selfhost-fonts.css') {
        return serveAsset(res, CSS_FILE, 'public, max-age=300', false);
      }
      const mf = url0.match(/^\/fonts\/((?:tajawal-\d{3}-(?:arabic|latin)|cairo-(?:arabic|latin|latin-ext))\.woff2)$/);
      if (mf) {
        const safe = path.basename(mf[1]); // يمنع path traversal
        return serveAsset(res, path.join(FONTS_DIR, safe), 'public, max-age=31536000, immutable', true);
      }
    } catch (e) { /* تجاهل وأكمل */ }

    /* ── الطبقة 2: أي طلب .html مباشرة من مجلد الوحدة ── */
    try {
      if (/\.html$/i.test(url0) && req.method === 'GET') {
        const data = readLive(path.join(MODULE_DIR, path.basename(url0)));
        if (data) {
          res.setHeader('Content-Type', 'text/html; charset=UTF-8');
          res.setHeader('Cache-Control', 'public, max-age=0');
          return res.end(injectBuffer(data));
        }
        // الملف ليس هنا → أكمل إلى static والتغطيات الأدنى
      }
    } catch (e) { /* تجاهل وأكمل */ }

    /* ── الطبقات 3/4/5: تغليف دوال الاستجابة ── */
    try {
      const isInjectableRes = () => {
        try {
          if (res.statusCode !== 200) return false; // تجاوز 304/206/redirects
          const enc = String(res.getHeader('Content-Encoding') || '');
          if (enc && /gzip|br|deflate/i.test(enc)) return false; // مضغوطة
          const ct = String(res.getHeader('Content-Type') || '');
          return /text\/html/i.test(ct);
        } catch (e) { return false; }
      };

      /* الطبقة 3: res.send — يغطي res.render وأغلب المسارات اليدوية */
      const origSend = res.send;
      res.send = function (body) {
        try {
          if (isInjectableRes()) {
            if (typeof body === 'string') body = injectFontLink(body);
            else if (Buffer.isBuffer(body)) body = injectBuffer(body);
          }
        } catch (e) { /* تجاهل */ }
        return origSend.call(this, body);
      };

      /* الطبقة 4: res.sendFile / res.sendfile — المسارات الملفية اليدوية */
      const wrapSendFile = (orig) => function (file, ...args) {
        try {
          const p = path.resolve(String(file));
          if (p.toLowerCase().endsWith('.html')) {
            const data = readLive(p);
            if (data) {
              res.setHeader('Content-Type', 'text/html; charset=UTF-8');
              return origSend.call(this, injectBuffer(data));
            }
          }
        } catch (e) { /* تجاهل واستخدم الأصلي */ }
        return orig.call(this, file, ...args);
      };
      if (typeof res.sendFile === 'function') res.sendFile = wrapSendFile(res.sendFile);
      if (typeof res.sendfile === 'function') res.sendfile = wrapSendFile(res.sendfile);

      /* الطبقة 5: res.write/res.end مع تجميع — يغطي express.static
         الذي يمرر الملفات عبر stream مباشرة دون res.send/sendFile */
      const origWrite = res.write.bind(res);
      const origEnd = res.end.bind(res);
      let buffering = false;
      let decided = false;
      let chunks = [];

      const decide = () => {
        if (decided) return;
        decided = true;
        buffering = isInjectableRes();
      };

      res.write = function (chunk, ...args) {
        try {
          decide();
          if (buffering && chunk) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            return true;
          }
        } catch (e) { /* تجاهل */ }
        return origWrite(chunk, ...args);
      };

      res.end = function (chunk, ...args) {
        try {
          decide();
          if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          if (buffering) {
            const full = Buffer.concat(chunks).toString('utf8');
            chunks = [];
            res.removeHeader('Content-Length'); // الطول تغيّر بعد الحقن
            origWrite(injectBuffer(Buffer.from(full)));
            return origEnd();
          }
        } catch (e) { /* تجاهل */ }
        return origEnd(chunk, ...args);
      };
    } catch (e) { /* تجاهل — الحقن اختياري وليس حرجاً */ }

    next();
  };
};

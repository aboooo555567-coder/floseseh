const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
process.env.NTBA_FIX_319 = 1;
const TelegramBot = require('node-telegram-bot-api');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

const crypto = require('crypto');
const fsSync = require('fs');
const https = require('https');
let currentAdminToken = process.env.ADMIN_TEST_TOKEN || null;

// Self-contained embedded fonts (Noto Sans Arabic / Tajawal / Tinos / Arimo as base64 woff2).
// Fonts = بنيات الخطوط من commit 94c2194 (عربي Noto Sans Arabic، أرقام/إنجليزي Tinos-Times).
// Replaces the old Google Fonts @import which could fail/be slow on Render,
// causing PDFs to print with a fallback font (wrong look). Loading these at
// startup makes PDF rendering deterministic and offline-safe.
let EMBEDDED_FONTS_CSS = "";
let FONT_MODE = 'system-fallback';
try {
    EMBEDDED_FONTS_CSS = fsSync.readFileSync(path.join(__dirname, 'fonts', 'fonts-embedded.css'), 'utf8');
    FONT_MODE = 'embedded';
    console.log('[fonts] embedded fonts CSS loaded (' + Math.round(EMBEDDED_FONTS_CSS.length / 1024) + ' KB)');
} catch (e) {
    // Graceful degradation: NO external @import fallback. A hanging Google Fonts
    // request would block page rendering (networkidle0) and break printing entirely.
    // With zero external resources, PDF rendering is fully deterministic.
    EMBEDDED_FONTS_CSS = "";
    console.warn('[fonts] fonts-embedded.css missing — PDFs will use system fonts:', e.message);
}

// --- PDF render queue (serialization) --------------------------------------------
// Render Free (512MB) cannot run multiple concurrent Chrome instances reliably;
// concurrent prints thrash memory and time out. Serialize renders and cap queue.
let pdfRenderChain = Promise.resolve();
let pdfQueueLength = 0;
const PDF_QUEUE_MAX = 5;
const enqueuePdfRender = (task) => {
    if (pdfQueueLength >= PDF_QUEUE_MAX) {
        return Promise.reject(new Error('الخادم مشغول حالياً بطباعة تقارير أخرى، يرجى المحاولة بعد لحظات'));
    }
    pdfQueueLength++;
    const run = pdfRenderChain.then(task);
    pdfRenderChain = run.catch(() => {});
    run.finally(() => { pdfQueueLength = Math.max(0, pdfQueueLength - 1); });
    return run;
};

// Resolve a usable Chrome/Chromium executable across environments (Render, Docker, local).
// Order: explicit env override -> system Chrome/Chromium -> Puppeteer cache (.cache/puppeteer).
// Prevents 'Could not find Chrome' launch failures in production PDF printing.
const resolveChromeExecutablePath = () => {
    try {
        if (process.env.PUPPETEER_EXECUTABLE_PATH && fsSync.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
            return process.env.PUPPETEER_EXECUTABLE_PATH;
        }
        const systemCandidates = [
            '/usr/bin/google-chrome-stable',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/snap/bin/chromium'
        ];
        for (const p of systemCandidates) {
            if (fsSync.existsSync(p)) return p;
        }
        const cacheDir = process.env.PUPPETEER_CACHE_DIR || path.join(__dirname, '.cache', 'puppeteer');
        const chromeRoot = path.join(cacheDir, 'chrome');
        if (fsSync.existsSync(chromeRoot)) {
            const versions = fsSync.readdirSync(chromeRoot).filter(d => d.startsWith('linux-')).sort().reverse();
            for (const v of versions) {
                for (const bin of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
                    const candidate = path.join(chromeRoot, v, bin);
                    if (fsSync.existsSync(candidate)) return candidate;
                }
            }
        }
    } catch (e) {
        console.warn('resolveChromeExecutablePath notice:', e.message);
    }
    return undefined; // fall back to Puppeteer's own resolution
};

// Configuration
// SECURITY NOTE: never hardcode tokens here. TELEGRAM_BOT_TOKEN must be provided via environment variables.
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const PORT = process.env.PORT || 3000;
const WEB_APP_URL = process.env.RENDER_EXTERNAL_URL || process.env.WEB_APP_URL || 'https://floseseh.onrender.com';
const WEB_APP_URL_CACHED = WEB_APP_URL + '?v=52';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'ppppokl';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '7853478744';
// لوحة الإدارة (أزرار الإشعارات تنقل المالك مباشرة لشحن نقاط المشترك)
const ADMIN_PANEL_URL = `${WEB_APP_URL}/index.html?screen=admin`;
const RECHARGE_WHATSAPP = '+967738473371';
const RECHARGE_BANK_ACCOUNT = '3053743187';
// كتالوج الباقات — المصدر الوحيد للحقيقة (المتجر/الإشعارات/الشحن السريع)
const PKG_CATALOG = {
    'Points 5':    { points: 5,   days: 0,  price: 5,   label: 'حزمة البداية (5 نقاط)' },
    'Points 10':   { points: 10,  days: 0,  price: 10,  label: 'حزمة 10 نقاط' },
    'Points 20':   { points: 20,  days: 0,  price: 15,  label: 'حزمة 20 نقطة' },
    'Basic':       { points: 30,  days: 0,  price: 20,  label: 'حزمة النقاط الأساسية (30 نقطة)' },
    'Points 50':   { points: 50,  days: 0,  price: 30,  label: 'حزمة 50 نقطة' },
    'Recommended': { points: 100, days: 0,  price: 50,  label: 'حزمة النقاط الموصى بها (100 نقطة)' },
    'Advanced':    { points: 200, days: 0,  price: 80,  label: 'حزمة النقاط المتقدمة (200 نقطة)' },
    'Month 1':     { points: 0,   days: 30, price: 100, label: 'خطة 30 يوم لامحدودة' }
};

// Single source of truth for admin authorization (owner = sole controller).
// Owner is identified by numeric Telegram Chat ID first, username is a secondary convenience.
const isBotAdmin = (chatId, username = null) => {
    if (!chatId) return false;
    if (String(chatId) === String(ADMIN_CHAT_ID)) return true;
    if (username && typeof username === 'string' && username.toLowerCase() === String(ADMIN_USERNAME).toLowerCase()) return true;
    return false;
};
const OWNER_CONTACT = `https://t.me/${ADMIN_USERNAME}`;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '-1002184109677';

// Database Mutex Lock for safe concurrent reads & writes
let dbMutex = Promise.resolve();
const withDbLock = (fn) => {
    const next = dbMutex.then(() => fn()).catch(err => {
        console.error('dbMutex error:', err);
        throw err;
    });
    dbMutex = next.catch(() => {});
    return next;
};

// Transaction logging helper
const logTransaction = (data, { admin_chat_id = ADMIN_CHAT_ID, target_chat_id, operation, amount = null, previous_value = null, new_value = null, details = '' }) => {
    if (!data.transactions) data.transactions = [];
    const entry = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        timestamp: new Date().toISOString(),
        admin_chat_id: String(admin_chat_id || ADMIN_CHAT_ID),
        target_chat_id: String(target_chat_id || ''),
        operation: String(operation),
        amount: amount !== null ? Number(amount) : null,
        previous_value: previous_value !== null ? String(previous_value) : null,
        new_value: new_value !== null ? String(new_value) : null,
        details: String(details || '')
    };
    data.transactions.unshift(entry);
    if (data.transactions.length > 1000) {
        data.transactions = data.transactions.slice(0, 1000);
    }
    return entry;
};

const app = express();

// استضافة خط Tajawal ذاتياً + حقنه في كل صفحات HTML (إلغاء الاعتماد على Google Fonts CDN)
const fontInject = require('./font-inject');
app.use(fontInject());

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));
app.use('/assets', express.static(path.join(__dirname, 'الشعارات')));
app.use('/logos', express.static(path.join(__dirname, 'الشعارات')));

// Local database path
const defaultSubscriptionsPath = path.join(__dirname, 'subscriptions.json');
const subscriptionsPath = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'subscriptions.json') : defaultSubscriptionsPath;

// Helper to compute remaining subscription days
const getDaysRemaining = (expiresAt) => {
    if (!expiresAt) return 0;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
};

// Normalize subscriber object
const normalizeSubscription = (user) => {
    if (!user) return null;
    const now = new Date();
    
    // Normalize points
    user.points = Number(user.points != null ? user.points : (user.balance_points != null ? user.balance_points : 0));
    user.balance_points = user.points;
    
    // Status normalization
    if (!user.status) {
        user.status = 'active';
    }
    
    // Migration helper: if they have subscriptionDays > 0 but no expires date
    if (user.subscriptionDays > 0 && !user.subscriptionExpires && !user.subscription_end_date) {
        const expires = new Date(now.getTime() + user.subscriptionDays * 24 * 60 * 60 * 1000);
        user.subscriptionExpires = expires.toISOString();
        user.subscription_end_date = expires.toISOString();
    }
    if (user.subscriptionExpires && !user.subscription_end_date) {
        user.subscription_end_date = user.subscriptionExpires;
    }
    if (!user.subscription_start_date) {
        user.subscription_start_date = user.updatedAt || new Date().toISOString();
    }
    
    const endStr = user.subscription_end_date || user.subscriptionExpires;
    user.daysRemaining = getDaysRemaining(endStr);
    user.subscriptionDays = user.daysRemaining;
    
    const startObj = new Date(user.subscription_start_date);
    user.daysUsed = isNaN(startObj.getTime()) ? 0 : Math.max(0, Math.floor((now.getTime() - startObj.getTime()) / (86400000)));
    
    user.plan = user.plan || (user.subscriptionDays > 0 ? 'unlimited' : (user.report_payment_source === 'none' ? 'none' : 'points'));
    user.report_payment_source = user.report_payment_source || (user.plan === 'unlimited' ? 'unlimited' : (user.plan === 'none' ? 'none' : 'points'));
    user.reportsCount = Array.isArray(user.reports) ? user.reports.length : 0;

    return user;
};

// آلية الدفع عند الإصدار (نفس آلية الكود المصدري مع تحكم الإدارة):
// - الأدمن عندما يشحن نقاطاً لمستخدم يصبح مصدر الدفع «نقاط» → كل إصدار تقرير جديد يخصم 5 نقاط
// - عندما يجدد أياماً يصبح المصدر «غير محدود» → يغطيها الاشتراك النشط
// - وإذا انتهت أيام اشتراك «غير محدود» وبقي رصيد نقاط → تُستهلك النقاط (سلوك المصدر الأصلي)
const REPORT_COST_POINTS = 5;
const resolvePaySource = (uSub) => {
    normalizeSubscription(uSub);
    const src = uSub.report_payment_source || (uSub.subscriptionDays > 0 ? 'unlimited' : 'points');
    if (src === 'unlimited' && (uSub.subscriptionDays || 0) <= 0 && (uSub.points || 0) >= REPORT_COST_POINTS) {
        return 'points';
    }
    return src;
};

// Read local subscriptions.json
const loadLocalSubscriptions = async () => {
    try {
        const data = await fs.readFile(subscriptionsPath, 'utf-8');
        const parsed = JSON.parse(data);
        if (!parsed.subscriptions) parsed.subscriptions = {};
        if (!parsed.transactions) parsed.transactions = [];
        return parsed;
    } catch (e) {
        if (process.env.DATA_DIR && subscriptionsPath !== defaultSubscriptionsPath) {
            try {
                const data = await fs.readFile(defaultSubscriptionsPath, 'utf-8');
                const parsed = JSON.parse(data);
                if (!parsed.subscriptions) parsed.subscriptions = {};
                if (!parsed.transactions) parsed.transactions = [];
                await fs.writeFile(subscriptionsPath, JSON.stringify(parsed, null, 2), 'utf-8');
                return parsed;
            } catch (err2) {}
        }
        return { subscriptions: {}, transactions: [] };
    }
};

// Write local subscriptions.json
const saveLocalSubscriptions = async (data) => {
    try {
        if (!data.subscriptions) data.subscriptions = {};
        if (!data.transactions) data.transactions = [];
        await fs.writeFile(subscriptionsPath, JSON.stringify(data, null, 2), 'utf-8');
        scheduleGithubSync('subscriptions');
    } catch (e) {
        console.error('Error writing local subscriptions.json:', e.message);
    }
};

// ==================================================================================
// حماية البيانات الدائمة — Permanent Data Preservation
// 1) مزامنة تلقائية مع GitHub: أي تغيير في البيانات يُرفع للمستودع خلال ثوانٍ،
//    لذلك لا تُفقد البيانات عند إضافة ميزات جديدة (إعادة نشر Render) أو إعادة تشغيل.
// 2) أرشيف تقارير دائم (reports_archive.json): كل تقرير صادر يُحفظ في أرشيف منفصل
//    لا يمسّه أي إجراء للأدمن (إضافة نقاط، حذف مستخدمين، تغيير حالات...)، وأي تقرير
//    مفقود يُعاد تلقائياً لحساب صاحبه عند فتح التطبيق (auto-heal).
// ==================================================================================
const reportsArchiveDefaultPath = path.join(__dirname, 'reports_archive.json');
const reportsArchivePath = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'reports_archive.json') : reportsArchiveDefaultPath;

const GITHUB_SYNC_ENABLED = process.env.GITHUB_SYNC_DISABLED !== '1';
// Token resolution — SECURITY: لا يوجد أي توكن داخل المستودع (أُزيل من الشجرة والتاريخ):
// 1) متغيرات البيئة على Render: GITHUB_SYNC_TOKEN أو GITHUB_TOKEN (الطريقة الدائمة الموصى بها)
// 2) ملف github_sync.token محلي بجانب الخادم (مستثنى عبر .gitignore — لا يُرفع أبداً)
// 3) أمر /settoken من البوت (للمالك فقط) يضبط التوكن حياً دون إعادة نشر
// للتوافق: الملف المحلي قد يكون Base64 أو نصاً صريحاً.
let githubSyncToken = (process.env.GITHUB_SYNC_TOKEN || process.env.GITHUB_TOKEN || (() => {
    try {
        let t = fsSync.readFileSync(path.join(__dirname, 'github_sync.token'), 'utf-8').trim();
        if (t && !/^(ghp_|github_pat_|gho_|ghs_)/.test(t)) {
            try { t = Buffer.from(t, 'base64').toString('utf-8').trim(); } catch (e) {}
        }
        return t;
    } catch (e) { return ''; }
})());
const GITHUB_REPO = 'aboooo555567-coder/floseseh';
const GITHUB_BRANCH = 'main';

const githubApiRequest = (method, apiPath, body) => new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
        hostname: 'api.github.com',
        path: apiPath,
        method: method,
        headers: {
            'User-Agent': 'floseseh-data-sync',
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${githubSyncToken}`,
            ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {})
        }
    }, (res) => {
        let chunks = '';
        res.on('data', (c) => chunks += c);
        res.on('end', () => {
            try {
                const parsed = chunks ? JSON.parse(chunks) : {};
                if (res.statusCode >= 200 && res.statusCode < 300) return resolve(parsed);
                const err = new Error(parsed.message || `GitHub API ${res.statusCode}`);
                err.status = res.statusCode;
                return reject(err);
            } catch (e) { return reject(e); }
        });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('GitHub API timeout')));
    if (payload) req.write(payload);
    req.end();
});

const githubGetFile = async (repoPath) => {
    const res = await githubApiRequest('GET', `/repos/${GITHUB_REPO}/contents/${repoPath}?ref=${GITHUB_BRANCH}`);
    if (!res || res.type !== 'file' || res.content == null) return null;
    return Buffer.from(res.content, 'base64').toString('utf-8');
};

const githubPutFile = async (repoPath, contentUtf8) => {
    let sha = null;
    try {
        const existing = await githubApiRequest('GET', `/repos/${GITHUB_REPO}/contents/${repoPath}?ref=${GITHUB_BRANCH}`);
        if (existing && existing.type === 'file') sha = existing.sha;
    } catch (e) {
        if (e.status !== 404) throw e;
    }
    return githubApiRequest('PUT', `/repos/${GITHUB_REPO}/contents/${repoPath}`, {
        message: `data-sync: حفظ البيانات (${repoPath})`,
        content: Buffer.from(contentUtf8, 'utf-8').toString('base64'),
        branch: GITHUB_BRANCH,
        ...(sha ? { sha } : {})
    });
};

// Debounced sync: دمج التعديلات المتتالية في رفعة واحدة (لا ازدحام على GitHub API)
const githubSyncState = { dirty: new Set(), timer: null, syncing: false };
const scheduleGithubSync = (fileKey) => {
    if (!GITHUB_SYNC_ENABLED || !githubSyncToken) return;
    githubSyncState.dirty.add(fileKey);
    if (githubSyncState.timer) return;
    githubSyncState.timer = setTimeout(flushGithubSync, 15000);
};
const flushGithubSync = async () => {
    if (githubSyncState.syncing) {
        // عملية رفع جارية — أعد المحاولة بعد قليل
        githubSyncState.timer = setTimeout(flushGithubSync, 5000);
        return;
    }
    clearTimeout(githubSyncState.timer);
    githubSyncState.timer = null;
    if (!githubSyncState.dirty.size) return;
    githubSyncState.syncing = true;
    const files = [...githubSyncState.dirty];
    try {
        for (const key of files) {
            githubSyncState.dirty.delete(key);
            const localPath = key === 'subscriptions' ? subscriptionsPath : reportsArchivePath;
            const repoPath = key === 'subscriptions' ? 'subscriptions.json' : 'reports_archive.json';
            try {
                const content = await fs.readFile(localPath, 'utf-8');
                await githubPutFile(repoPath, content);
                console.log(`☁️ [data-sync] ${repoPath} synced to GitHub`);
            } catch (e) {
                githubSyncState.dirty.add(key); // فشل — أعد المحاولة في الرفعة القادمة
                console.warn(`[data-sync] ${repoPath} sync failed:`, e.message);
            }
        }
    } finally {
        githubSyncState.syncing = false;
        if (githubSyncState.dirty.size && !githubSyncState.timer) {
            githubSyncState.timer = setTimeout(flushGithubSync, 15000);
        }
    }
};

// بذرة ذكية عند الإقلاع: الملف المحلي (/tmp بعد إعادة نشر) ← ثم أحدث نسخة من GitHub ← ثم نسخة المستودع
const seedDataFile = async (localPath, repoFileName) => {
    try { await fs.access(localPath); return 'local'; } catch (e) {}
    if (GITHUB_SYNC_ENABLED && githubSyncToken) {
        try {
            const content = await githubGetFile(repoFileName);
            if (content && content.trim()) {
                await fs.writeFile(localPath, content, 'utf-8');
                console.log(`✓ Seeded ${repoFileName} from GitHub (latest data)`);
                return 'github';
            }
        } catch (e) {
            console.warn(`[data-sync] Seed ${repoFileName} from GitHub unavailable:`, e.message);
        }
    }
    try {
        const content = await fs.readFile(path.join(__dirname, repoFileName), 'utf-8');
        await fs.writeFile(localPath, content, 'utf-8');
        console.log(`✓ Seeded ${repoFileName} from deployed repo copy`);
        return 'repo';
    } catch (e) { return 'empty'; }
};

// ===== الأرشيف الدائم للتقارير =====
const readArchiveAnySource = async () => {
    for (const p of [reportsArchivePath, reportsArchiveDefaultPath]) {
        try {
            const parsed = JSON.parse(await fs.readFile(p, 'utf-8'));
            if (!parsed.reports) parsed.reports = {};
            return parsed;
        } catch (e) {}
    }
    return { reports: {} };
};
const loadReportsArchive = readArchiveAnySource;
const saveReportsArchive = async (data) => {
    if (!data.reports) data.reports = {};
    data.updatedAt = new Date().toISOString();
    await fs.writeFile(reportsArchivePath, JSON.stringify(data, null, 2), 'utf-8');
    scheduleGithubSync('reports');
};
// حفظ التقرير في الأرشيف الدائم (مرة عند كل إصدار رسمي) — لا يحذفه أي إجراء أدمن
const archiveReport = async (chatIdStr, report) => {
    try {
        if (!report || !report.id) return;
        const archive = await readArchiveAnySource();
        if (!archive.reports[chatIdStr]) archive.reports[chatIdStr] = {};
        archive.reports[chatIdStr][String(report.id)] = JSON.parse(JSON.stringify(report));
        await saveReportsArchive(archive);
    } catch (e) { console.error('archiveReport error:', e.message); }
};
// حذف من الأرشيف فقط بمحذف المستخدم نفسه (عمداً) — إجراءات الأدمن لا تستدعي هذه الدالة أبداً
const unarchiveReport = async (chatIdStr, reportId) => {
    try {
        const archive = await readArchiveAnySource();
        if (archive.reports[chatIdStr] && archive.reports[chatIdStr][String(reportId)]) {
            delete archive.reports[chatIdStr][String(reportId)];
            await saveReportsArchive(archive);
        }
    } catch (e) { console.error('unarchiveReport error:', e.message); }
};
// الاستعادة التلقائية: أي تقرير موجود في الأرشيف ومفقود من سجل المستخدم يُعاد فوراً
const restoreReportsFromArchive = async (chatIdStr, userSub) => {
    try {
        const archive = await readArchiveAnySource();
        const archived = archive.reports[chatIdStr];
        if (!archived) return 0;
        if (!Array.isArray(userSub.reports)) userSub.reports = [];
        const haveIds = new Set(userSub.reports.map((r) => (r && r.id != null) ? String(r.id) : null).filter(Boolean));
        let restored = 0;
        for (const [rid, rep] of Object.entries(archived)) {
            if (!haveIds.has(String(rid))) {
                userSub.reports.push(JSON.parse(JSON.stringify(rep)));
                restored++;
            }
        }
        if (restored > 0) {
            userSub.reportsCount = userSub.reports.length;
            console.log(`♻️ [data-preserve] Restored ${restored} report(s) for ${chatIdStr} from permanent archive`);
        }
        return restored;
    } catch (e) { console.error('restoreReportsFromArchive error:', e.message); return 0; }
};

// Auto-bootstrap Owner Account (ADMIN_CHAT_ID -> 7853478744 / @ppppokl) with 10,000 points and 365-day active unlimited
const bootstrapOwnerAccount = async () => {
    return withDbLock(async () => {
        const data = await loadLocalSubscriptions();
        const ownerId = String(ADMIN_CHAT_ID);
        const ownerUsername = String(ADMIN_USERNAME).replace(/^@/, '').toLowerCase();
        const now = new Date();
        const start = new Date('2026-09-15T00:00:00.000Z');
        const end = new Date('2027-09-15T23:59:59.999Z');
        
        let owner = data.subscriptions[ownerId];
        let needsSave = false;
        
        if (!owner) {
            owner = {
                username: ownerUsername,
                name: 'المالك',
                status: 'active',
                plan: 'unlimited',
                report_payment_source: 'unlimited',
                points: 10000,
                balance_points: 10000,
                subscriptionDays: 365,
                subscription_start_date: start.toISOString(),
                subscription_end_date: end.toISOString(),
                subscriptionExpires: end.toISOString(),
                reports: [],
                referredBy: null,
                referralsCount: 0,
                referralPoints: 0,
                updatedAt: now.toISOString()
            };
            data.subscriptions[ownerId] = owner;
            needsSave = true;
            logTransaction(data, {
                admin_chat_id: ownerId,
                target_chat_id: ownerId,
                operation: 'owner_bootstrap_create',
                amount: 10000,
                new_value: '10000 points, 365 days, active, unlimited',
                details: 'Owner account created with 10,000 points and 365 days active unlimited'
            });
        } else {
            // مهم: لا نسترجع النقاط تلقائياً ولا نفرض مصدر الدفع عند كل إقلاع —
            // الخصم عند الإصدار يجب أن يبقى حقيقياً ودائماً (طلبات المستخدم).
            // نعبّئ الحقول فقط عندما تكون مفقودة تماماً.
            if (owner.points == null) {
                owner.points = 10000;
                owner.balance_points = 10000;
                needsSave = true;
                logTransaction(data, {
                    admin_chat_id: ownerId,
                    target_chat_id: ownerId,
                    operation: 'add_points',
                    amount: 10000,
                    new_value: 10000,
                    details: 'Owner points initialized (were missing)'
                });
            }
            if (owner.status !== 'active') {
                owner.status = 'active';
                needsSave = true;
            }
            if (!owner.report_payment_source) {
                owner.report_payment_source = 'unlimited';
                needsSave = true;
            }
            if (!owner.subscription_end_date) {
                owner.subscription_start_date = start.toISOString();
                owner.subscription_end_date = end.toISOString();
                owner.subscriptionExpires = end.toISOString();
                owner.subscriptionDays = 365;
                needsSave = true;
            }
            owner.username = ownerUsername;
            owner.name = owner.name || 'المالك';
            owner.updatedAt = now.toISOString();
        }
        
        // Migrate any legacy pending_* account for the owner username (generic cleanup)
        const pendingKey = 'pending_' + ownerUsername;
        if (data.subscriptions[pendingKey]) {
            if (data.subscriptions[pendingKey].reports && data.subscriptions[pendingKey].reports.length > 0) {
                owner.reports = [...(owner.reports || []), ...data.subscriptions[pendingKey].reports];
            }
            delete data.subscriptions[pendingKey];
            needsSave = true;
        }
        
        if (needsSave) {
            await saveLocalSubscriptions(data);
            console.log(`✅ Owner account ${ownerId} (@${ownerUsername}) bootstrapped: 10,000 points, 365 days, active, unlimited`);
        }
    });
};

// ==================================================================================
// نموذج منح المالك (طلب المالك):
// «اجعل كل المشتركين نقاطهم صفر واشتركتهم بدون ولا يستطيعون اصدار الا بعد منحهم
//  نقاط او اشتراك حسب ما احدد لهم انا المالك»
// - تصفير شامل «مرة واحدة فقط»: كل المشتركين (عدا حساب المالك نفسه) نقاطهم = 0
//   واشتراكهم = «بدون» (لا أيام، بلا انتهاء، plan/paySrc = none).
// - علم ownerGrantModel في subscriptions.json يمنع تكرار التصفير عند الإقلاعات
//   التالية حتى لا تُمحى النقاط التي منحها المالك فعلاً بعد التصفير.
// - التقارير المرفوعة لا تُمس إطلاقاً (نظام الحفظ الدائم).
// ==================================================================================
const enforceOwnerGrantModel = async () => {
    return withDbLock(async () => {
        const data = await loadLocalSubscriptions();
        if (data.ownerGrantModel === true) return; // تم التصفير سابقاً — لا نلمس منح المالك
        const ownerId = String(ADMIN_CHAT_ID);
        const now = new Date().toISOString();
        let resetCount = 0;
        for (const [cid, user] of Object.entries(data.subscriptions)) {
            if (cid === ownerId) continue; // حساب المالك نفسه خارج التصفير
            const before = `${user.points || 0}pts/${user.subscriptionDays || 0}d/${user.report_payment_source || '-'}`;
            user.points = 0;
            user.balance_points = 0;
            user.subscriptionDays = 0;
            user.subscriptionExpires = null;
            user.subscription_end_date = null;
            user.plan = 'none';
            user.report_payment_source = 'none';
            user.updatedAt = now;
            resetCount++;
            logTransaction(data, {
                admin_chat_id: 'system',
                target_chat_id: cid,
                operation: 'owner_grant_reset',
                previous_value: before,
                new_value: '0 نقطة / بدون اشتراك',
                details: 'تصفير شامل لمرة واحدة: كل المشتركين يبدأون بدون نقاط وبدون اشتراك حتى يمنحهم المالك نقاطاً أو اشتراكاً'
            });
            console.log(`🔄 [owner-grant-model] Reset ${cid} (was ${before}) → 0 points, بدون اشتراك`);
        }
        data.ownerGrantModel = true;
        data.ownerGrantModelAt = now;
        await saveLocalSubscriptions(data);
        console.log(`✅ [owner-grant-model] One-time reset done: ${resetCount} subscriber(s) → 0 points / بدون اشتراك (لا يشمل المالك ${ownerId})`);
    });
};

// ==================================================================================
// استرجاع المشتركين كـ«فعالين» برصيد صفر (طلب المالك):
// «استرجع المستخدمين وخلي حالتهم فعالين كلهم ولاكن اجعل نقاطهم صفرا وانا بضيفلهم نقاط»
// - ترحيل «مرة واحدة فقط» (علم activeZeroModel): كل مشترك حالته «بدون» (none)
//   يُستعاد إلى حساب فعّال: status=active + plan=points + مصدر الدفع «نقاط».
// - النقاط تبقى كما هي (صفراً) — لا يُصدر أي تقرير حتى يشحن المالك نقاطاً،
//   وعندها تظهر له نافذة «رصيد غير كافٍ → طلب الاشتراك / تجريبي» آلية المصدر.
// - منح المالك السابق (نقاط مشحونة فعلاً) لا يُمس إطلاقاً.
// - التقارير المرفوعة لا تُمس إطلاقاً (نظام الحفظ الدائم).
// ==================================================================================
const restoreActiveSubscribers = async () => {
    return withDbLock(async () => {
        const data = await loadLocalSubscriptions();
        if (data.activeZeroModel === true) return; // تم الاسترجاع سابقاً — لا نلمس منح المالك
        const ownerId = String(ADMIN_CHAT_ID);
        const now = new Date().toISOString();
        let restored = 0;
        for (const [cid, user] of Object.entries(data.subscriptions)) {
            if (cid === ownerId) continue; // حساب المالك خارج الترخيل
            if (user.report_payment_source !== 'none' && user.plan !== 'none') continue; // له منح فعلي — يُترك
            const before = `${user.points || 0}pts/${user.plan || '-'}/${user.report_payment_source || '-'}`;
            user.status = 'active';
            user.plan = 'points';
            user.report_payment_source = 'points';
            user.updatedAt = now;
            restored++;
            logTransaction(data, {
                admin_chat_id: 'system',
                target_chat_id: cid,
                operation: 'restore_active_status',
                previous_value: before,
                new_value: `${user.points || 0} نقطة / فعال / مصدر نقاط`,
                details: 'استرجاع المشتركين: الحالة «فعال» للجميع مع رصيد صفر — الإصدار بعد شحن المالك للنقاط'
            });
            console.log(`🟢 [restore-active] ${cid} (was ${before}) → فعال / مصدر نقاط / ${user.points || 0} نقطة`);
        }
        data.activeZeroModel = true;
        data.activeZeroModelAt = now;
        await saveLocalSubscriptions(data);
        console.log(`✅ [restore-active] Done: ${restored} subscriber(s) → فعال برصيد صفر (الإصدار بعد شحن المالك)`);
    });
};

// Find user subscription by Chat ID or Telegram Username
const findSubscription = async (chatId, username, referrerId = null, meta = null) => {
    const metaName = meta ? [meta.first_name, meta.last_name].filter(Boolean).join(' ').trim() : '';
    const data = await loadLocalSubscriptions();
    const chatIdStr = chatId.toString();
    const cleanedUsername = username ? username.replace(/^@/, '').toLowerCase() : null;
    
    let userSub = null;
    let foundChatId = chatIdStr;
    
    // 1. Search by Username
    if (cleanedUsername) {
        for (const [cid, sub] of Object.entries(data.subscriptions)) {
            if (sub.username && sub.username.toLowerCase() === cleanedUsername) {
                userSub = sub;
                foundChatId = cid;
                break;
            }
        }
    }
    
    // 2. Search by Chat ID
    if (!userSub && data.subscriptions[chatIdStr]) {
        userSub = data.subscriptions[chatIdStr];
    }
    
    // 3. Normalize subscription or create new
    if (userSub) {
        userSub = normalizeSubscription(userSub);
        if (cleanedUsername && userSub.username !== cleanedUsername) {
            userSub.username = cleanedUsername;
        }
        // تحديث اسم المستخدم من تيليجرام (يظهر في لوحة الإدارة وإشعارات المالك)
        if (metaName && userSub.name !== metaName) {
            userSub.name = metaName;
        }
        
        // Data preservation: أعِد أي تقرير موجود بالأرشيف الدائم ومفقود من السجل (auto-heal)
        await restoreReportsFromArchive(chatIdStr, userSub);
        
        // If we matched a pending Username subscription, migrate it to the active Chat ID
        if (foundChatId !== chatIdStr) {
            const existingActive = data.subscriptions[chatIdStr];
            if (existingActive) {
                existingActive.points = (existingActive.points || 0) + (userSub.points || 0);
                if (userSub.subscriptionDays > (existingActive.subscriptionDays || 0)) {
                    existingActive.subscriptionDays = userSub.subscriptionDays;
                    existingActive.subscriptionExpires = userSub.subscriptionExpires;
                }
                if (userSub.username) existingActive.username = userSub.username;
                
                // CRUCIAL: Preserve existing reports!
                if (!existingActive.reports) existingActive.reports = [];
                if (userSub.reports && userSub.reports.length > 0) {
                    existingActive.reports = [...existingActive.reports, ...userSub.reports];
                }
                
                data.subscriptions[chatIdStr] = existingActive;
                userSub = existingActive; // update the local reference
            } else {
                data.subscriptions[chatIdStr] = userSub;
            }
            delete data.subscriptions[foundChatId];
        }
        
        data.subscriptions[chatIdStr].updatedAt = new Date().toISOString();
        await saveLocalSubscriptions(data);
    } else {
        // نموذج المالك المحدّث: المستخدم الجديد يبدأ «فعالاً» برصيد صفر نقاط،
        // ولا يستطيع الإصدار حتى يشحن له المالك نقاطاً (عندها تظهر نافذة الرصيد/التجريبي).
        userSub = {
            points: 0,
            balance_points: 0,
            subscriptionDays: 0,
            subscriptionExpires: null,
            subscription_end_date: null,
            status: 'active',
            plan: 'points',
            report_payment_source: 'points',
            username: cleanedUsername,
            name: metaName || null,
            reports: [],
            referredBy: referrerId ? referrerId.toString() : null,
            referralsCount: 0,
            referralPoints: 0,
            updatedAt: new Date().toISOString()
        };
        
        // If referred by someone, increment their referralsCount
        if (referrerId) {
            const rId = referrerId.toString();
            if (data.subscriptions[rId]) {
                data.subscriptions[rId].referralsCount = (data.subscriptions[rId].referralsCount || 0) + 1;
                data.subscriptions[rId].updatedAt = now.toISOString();
            }
        }
        
        data.subscriptions[chatIdStr] = userSub;
        
        // Data preservation: حتى لو حُذف سجل المستخدم كلياً، تقاريره المرفوعة تعود من الأرشيف الدائم
        await restoreReportsFromArchive(chatIdStr, userSub);
        
        await saveLocalSubscriptions(data);

        // إشعار فوري للمالك: مستخدم جديد دخل التطبيق (طلب المالك: «يظهر لي اشعار بدخوله»)
        if (chatIdStr !== String(ADMIN_CHAT_ID)) {
            const shownName = metaName || (cleanedUsername ? '@' + cleanedUsername : 'بدون اسم');
            const kb = [[
                { text: '🪙 شحن 5 نقاط', callback_data: `qpkg:${chatIdStr}:Points 5` },
                { text: '🪙 شحن 10 نقاط', callback_data: `qpkg:${chatIdStr}:Points 10` }
            ]];
            const row2 = [];
            if (cleanedUsername) row2.push({ text: '💬 مراسلة المستخدم', url: `https://t.me/${cleanedUsername}` });
            row2.push({ text: '🛠 لوحة الإدارة', web_app: { url: ADMIN_PANEL_URL } });
            kb.push(row2);
            notifyOwner(
`👋 مستخدم جديد دخل التطبيق!
━━━━━━━━━━━━━━━━━━━━━━
• الاسم: ${shownName}
• المعرف: ${cleanedUsername ? '@' + cleanedUsername : 'لا يوجد'}
• ID: ${chatIdStr}
• الرصيد الحالي: 0 نقطة
━━━━━━━━━━━━━━━━━━━━━━
بعد تأكد الدفع يمكنك شحنه مباشرة من الأزرار 👇`, kb);
        }
    }
    
    return { chatId: chatIdStr, ...userSub };
};

// Add or renew subscription for Username
const addSubscriptionByUsername = async (username, days) => {
    const data = await loadLocalSubscriptions();
    const cleaned = username.replace(/^@/, '').toLowerCase();
    
    let foundChatId = null;
    let userSub = null;
    
    for (const [cid, sub] of Object.entries(data.subscriptions)) {
        if (sub.username && sub.username.toLowerCase() === cleaned) {
            userSub = sub;
            foundChatId = cid;
            break;
        }
    }
    
    const now = new Date();
    let baseDate = now;
    
    if (userSub) {
        userSub = normalizeSubscription(userSub);
        if (userSub.subscriptionExpires) {
            const currentExpires = new Date(userSub.subscriptionExpires);
            if (currentExpires > now) {
                baseDate = currentExpires;
            }
        }
    } else {
        userSub = {
            points: 0,
            subscriptionDays: 0,
            subscriptionExpires: null,
            username: cleaned,
            reports: [],
            referredBy: null,
            referralsCount: 0,
            referralPoints: 0,
            updatedAt: now.toISOString()
        };
        foundChatId = `pending_${cleaned}`;
    }
    
    const expires = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    userSub.subscriptionExpires = expires.toISOString();
    userSub.subscriptionDays = getDaysRemaining(userSub.subscriptionExpires);
    userSub.updatedAt = now.toISOString();
    
    // Referral rewards!
    if (userSub.referredBy && !userSub.referralAwarded) {
        const referrerId = userSub.referredBy.toString();
        if (data.subscriptions[referrerId]) {
            // Determine reward points based on subscription days
            let rewardPoints = 0;
            if (days === 30) rewardPoints = 50;
            else if (days === 90) rewardPoints = 150;
            else if (days === 180) rewardPoints = 300;
            else if (days >= 365) rewardPoints = 600;
            
            if (rewardPoints > 0) {
                data.subscriptions[referrerId].referralPoints = (data.subscriptions[referrerId].referralPoints || 0) + rewardPoints;
                data.subscriptions[referrerId].points = (data.subscriptions[referrerId].points || 0) + rewardPoints;
                data.subscriptions[referrerId].updatedAt = now.toISOString();
                userSub.referralAwarded = true; // prevent multiple awards from the same user's first activation
                
                // Notify referrer
                try {
                    await bot.sendMessage(referrerId, `🎁 لقد حصلت على ${rewardPoints} نقطة مجانية كمكافأة لأن المستخدم @${username} الذي قمت بدعوته قام بالاشتراك!`);
                } catch (e) {
                    console.warn('Could not notify referrer:', e.message);
                }
            }
        }
    }
    
    data.subscriptions[foundChatId] = userSub;
    await saveLocalSubscriptions(data);
    
    return { chatId: foundChatId, ...userSub };
};

// Initialize Telegram Bot
// Consider the app to be in production when a proper WEB_APP_URL is provided
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

const isProduction = Boolean(WEB_APP_URL) && WEB_APP_URL.startsWith('https://') && !WEB_APP_URL.includes('localhost');
const bot = new TelegramBot(TOKEN, { 
    polling: !isProduction,
    request: {
        timeout: 30000 // 30 seconds to prevent ConnectTimeoutError crashes
    }
});

bot.on('polling_error', (error) => {
    console.error('Telegram polling error:', error.message);
});

bot.on('webhook_error', (error) => {
    console.error('Telegram webhook error:', error.message);
});

// ===== وضع الاختبار المحلي (توكن وهمي): التقاط رسائل البوت بدل إرسالها لتمكين الاختبار الآلي =====
const TEST_MODE = TOKEN === 'TEST_TOKEN_LOCAL';
const TEST_SENT_MESSAGES = [];
if (TEST_MODE) {
    bot.sendMessage = async (chatId, text, opts) => {
        TEST_SENT_MESSAGES.push({ chatId: String(chatId), text: String(text), opts: opts || null, at: new Date().toISOString() });
        if (TEST_SENT_MESSAGES.length > 300) TEST_SENT_MESSAGES.shift();
        return { message_id: TEST_SENT_MESSAGES.length, chat: { id: Number(chatId) } };
    };
    bot.answerCallbackQuery = async () => true;
    bot.editMessageText = async () => true;
}

// ===== إشعارات المالك (طلب المالك: «يظهر لي اشعار بدخوله/طلبه باقة») =====
const notifyOwner = (text, inlineKeyboard) => {
    try {
        const opts = inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : undefined;
        return bot.sendMessage(String(ADMIN_CHAT_ID), text, opts).catch(e => console.warn('Owner notification failed:', e.message));
    } catch (e) {
        console.warn('Owner notification error:', e.message);
    }
};

// نص تعليمات الشحن — زر «شحن حسابي» + أمر /charge في البوت
const buildRechargeText = (chatId, name) => `💳 لشحن حسابك:
━━━━━━━━━━━━━━━━━━━━━━
1. تواصل مع المسؤول:
   • عبر تيليجرام: @${ADMIN_USERNAME}
   • عبر واتساب: ${RECHARGE_WHATSAPP}
2. أرسل له المعلومات التالية:
- معرفك: ${chatId}
- الاسم: ${name || ''}
- المبلغ المطلوب شحنه
- التحويل عبر الكريمي:
--> رقم الحساب السعودي: ${RECHARGE_BANK_ACCOUNT}
- إثبات الدفع (ارسال صورة التحويل للمسؤول)
━━━━━━━━━━━━━━━━━━━━━━
3. بعد التأكد من الدفع، سيتم شحن حسابك فوراً.
━━━━━━━━━━━━━━━━━━━━━━`;

// منع تكرار إشعار طلب الباقة (نفس المستخدم/نفس الباقة خلال 30 ثانية)
const pkgReqThrottle = new Map();
const pkgReqKeyboard = (targetId, pkgId, uname) => {
    const pkg = PKG_CATALOG[pkgId] || { points: 0, days: 0 };
    const actionLabel = pkg.days > 0 ? `📅 تفعيل ${pkg.days} يوم` : `➕ شحن ${pkg.points} نقاط`;
    const row2 = [];
    if (uname) row2.push({ text: '💬 مراسلة المستخدم', url: `https://t.me/${uname}` });
    row2.push({ text: '🛠 لوحة الإدارة', web_app: { url: ADMIN_PANEL_URL } });
    return [
        [{ text: actionLabel, callback_data: `qpkg:${targetId}:${pkgId}` }],
        row2
    ];
};

// الشحن السريع من أزرار إشعارات المالك — نفس منطق شحن اللوحة + إشعار المشترك
const handleQuickAdd = async (targetChatId, pkgId, sourceLabel = 'زر تيليجرام') => {
    const pkg = PKG_CATALOG[pkgId];
    if (!pkg) return { success: false, error: 'باقة غير معروفة' };
    const key = String(targetChatId || '').trim();
    let result = null;
    await withDbLock(async () => {
        const data = await loadLocalSubscriptions();
        const user = data.subscriptions[key];
        if (!user) { result = { success: false, error: 'المستخدم غير موجود في قاعدة البيانات' }; return; }
        const norm = normalizeSubscription(user);
        const displayName = norm.name || (norm.username ? '@' + norm.username : key);
        if (pkg.points > 0) {
            const prev = norm.points || 0;
            user.points = prev + pkg.points;
            user.balance_points = user.points;
            user.report_payment_source = 'points';
            user.plan = 'points';
            logTransaction(data, {
                target_chat_id: key,
                operation: 'add_points',
                amount: pkg.points,
                previous_value: prev,
                new_value: user.points,
                details: `شحن سريع (${sourceLabel}): ${pkg.label}`
            });
        }
        if (pkg.days > 0) {
            const nowD = new Date();
            let base = nowD;
            const prevEnd = user.subscription_end_date || null;
            if (prevEnd && new Date(prevEnd) > nowD) base = new Date(prevEnd);
            const newEnd = new Date(base.getTime() + pkg.days * 86400000);
            user.subscription_end_date = newEnd.toISOString();
            user.subscriptionExpires = newEnd.toISOString();
            user.subscriptionDays = getDaysRemaining(newEnd.toISOString());
            user.status = 'active';
            user.report_payment_source = 'unlimited';
            user.plan = 'unlimited';
            logTransaction(data, {
                target_chat_id: key,
                operation: 'subscription_renew',
                amount: pkg.days,
                previous_value: prevEnd,
                new_value: newEnd.toISOString(),
                details: `تفعيل سريع (${sourceLabel}): ${pkg.label}`
            });
        }
        user.updatedAt = new Date().toISOString();
        await saveLocalSubscriptions(data);

        // إشعار المشترك بالمنحة فوراً
        let grantMsg = null;
        if (pkg.points > 0) {
            grantMsg = `🎁 قام المالك بمنحك ${pkg.points} نقطة!\n\n🌑 رصيدك الآن: ${user.points} نقطة\n• تكلفة التقرير الواحد: 5 نقاط\n\nافتح التطبيق — ستجد رصيدك محدّثاً عند «رصيدك».`;
        } else if (pkg.days > 0) {
            grantMsg = `📅 قام المالك بتفعيل اشتراكك لمدة ${pkg.days} يوم!\n\nافتح التطبيق — ستجد رصيدك محدّثاً.`;
        }
        if (grantMsg) bot.sendMessage(key, grantMsg).catch(e => console.warn('Quick-add user notice failed:', e.message));

        result = {
            success: true,
            message: pkg.points > 0
                ? `✅ تم شحن ${pkg.points} نقطة للمستخدم ${displayName} (ID: ${key}) — الرصيد الجديد: ${user.points} نقطة`
                : `✅ تم تفعيل ${pkg.days} يوم للمستخدم ${displayName} (ID: ${key})`
        };
    });
    return result || { success: false, error: 'خطأ غير متوقع' };
};

// معالج زر «شحن سريع» في إشعارات المالك (للمالك فقط)
const processQuickAddCallback = async (query) => {
    const ownerChatId = query.message.chat.id.toString();
    const parts = String(query.data || '').split(':');
    const targetId = parts[1];
    const pkgId = parts.slice(2).join(':');
    if (String(query.from?.id) !== String(ADMIN_CHAT_ID)) {
        await bot.answerCallbackQuery(query.id, { text: 'هذا الإجراء متاح للمالك فقط', show_alert: true }).catch(() => {});
        return;
    }
    await bot.answerCallbackQuery(query.id).catch(() => {});
    const result = await handleQuickAdd(targetId, pkgId, 'زر تيليجرام (إشعار المالك)');
    await bot.sendMessage(ownerChatId, result.success ? result.message : `❌ ${result.error}`).catch(() => {});
};

// Helper: Send User Status Message
const sendMyStatusMessage = async (chatId, username) => {
    const user = await findSubscription(chatId, username);
    const daysLeft = user.subscriptionDays || 0;
    const statusText = daysLeft > 0 ? `فعال (${daysLeft} يوم متبقي)` : 'غير فعال (0 يوم)';
    const subStatusIcon = daysLeft > 0 ? '✅' : '❌';

    const statusMsg = `📊 حالة حسابك في منصة صحة:

${subStatusIcon} حالة الاشتراك: ${statusText}
⏳ الأيام المتبقية: ${daysLeft} يوم

🌑 رصيد النقاط: ${user.points || 0} نقطة
• تكلفة إنشاء التقرير: 5 نقاط

💡 يمكنك استخدام النقاط لإنشاء التقارير دون الحاجة لاشتراك شهري، أو الاشتراك بالباقة اللامحدودة!`;

    await bot.sendMessage(chatId, statusMsg);
};

// Start Command Handler
const handleStartCommand = async (msg) => {
    const chatId = msg.chat.id.toString();
    const username = msg.from?.username;
    const displayName = msg.from?.first_name || (username ? `${username}` : 'مستخدم');

    const text = msg.text || '';
    const refMatch = text.match(/\/start\s+ref_(\d+)/i);
    let referrerId = null;
    if (refMatch) {
        referrerId = refMatch[1];
    }

    const user = await findSubscription(chatId, username || displayName, referrerId);

    // Force update Chat Menu Button (Open button) to Render URL on every /start
    configureChatMenuButton(chatId).catch(err => console.warn('Menu button configure notice:', err.message));

    // Message 1: Quick Access Reply Keyboard Configuration with direct WebApp button
    await bot.sendMessage(chatId, `⚡ تم تفعيل قائمة الوصول السريع أسفل الشاشة!`, {
        reply_markup: {
            keyboard: [
                [{ text: '🛒 متجر الباقات' }, { text: '🔗 كسب نقاط (الإحالات)' }],
                [{ text: '💳 شحن حسابي' }, { text: '📊 حالة حسابي' }]
            ],
            resize_keyboard: true
        }
    });

    // Message 2: Dynamic status welcome message with full inline keyboard & direct links
    const daysLeft = user.subscriptionDays || 0;
    const statusIcon = daysLeft > 0 ? '✅' : '❌';
    const statusText = daysLeft > 0 ? `فعال - متبقي ${daysLeft} يوم` : `غير فعال - متبقي 0 يوم`;
    
    let adminNotice = '';
    if (user.isNewlyMigrated) {
        adminNotice = '🎉 <b>تم تفعيل اشتراكك يدوياً من قبل الإدارة!</b> 🥳\n\n';
        // Clean up flag so it doesn't stay in memory forever
        delete user.isNewlyMigrated;
        // Optionally save to remove the flag from disk if it got saved
        const data = await loadLocalSubscriptions();
        if (data.subscriptions[chatId]) {
            delete data.subscriptions[chatId].isNewlyMigrated;
            await saveLocalSubscriptions(data);
        }
    }
    
    const welcomeText = `${adminNotice}👋 أهلاً بعودتك ${displayName}!

${statusIcon} اشتراكك ${statusText}
🌑 رصيدك الحالي من النقاط: ${user.points || 0} نقطة
• تكلفة التقرير الواحد: 5 نقاط.

💡 يمكنك الاشتراك بالباقة الشهرية لإنشاء غير محدود، أو شحن النقاط للشراء بالتقرير!

اضغط على الأزرار أدناه لفتح التطبيق أو التصفح ⚡`;

    await bot.sendMessage(chatId, welcomeText, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Open', web_app: { url: WEB_APP_URL_CACHED } }],
                [{ text: 'دعوة صديق 🎁', callback_data: 'referrals' }],
                [{ text: 'باقات الاشتراك 💎', callback_data: 'packages' }],
                [{ text: '💳 شحن حسابي (طريقة الدفع)', callback_data: 'recharge_info' }],
                [{ text: 'حالة حسابي 📊', callback_data: 'mystatus' }]
            ]
        }
    });
};

bot.onText(/^\/start(\/verify)?(@\w+)?(\s.*)?$/i, handleStartCommand);

// /help command
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id.toString();
    await bot.sendMessage(chatId, `مرحباً!\nاستخدم /start للبدء.\nإذا كنت مسؤولاً، يمكنك استخدام /addsub @username <days> لتفعيل الاشتراك.`);
});

// /charge command — نص تعليمات الشحن (طلب المالك: زر «شحن حسابي» يظهر التعليمات)
bot.onText(/^\/(charge|شحن)/i, async (msg) => {
    const chatId = msg.chat.id.toString();
    const nm = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ');
    await bot.sendMessage(chatId, buildRechargeText(chatId, nm));
});

// /buy command
bot.onText(/\/buy/, async (msg) => {
    const chatId = msg.chat.id.toString();
    await sendPackagesMessage(chatId);
});

// Command /myid to display numeric Chat ID
bot.onText(/\/myid/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const isOwner = isBotAdmin(chatId, msg.from?.username);
    const ownerNote = isOwner ? '\n\n👑 أنت المالك/المشرف المعتمد للنظام.' : '';
    await bot.sendMessage(chatId, `🆔 الـ Numeric Chat ID الخاص بك هو:\n<code>${chatId}</code>${ownerNote}`, { parse_mode: 'HTML' });
});

// /admin command
bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const isAuthorized = isBotAdmin(chatId, msg.from?.username);
    if (!isAuthorized) {
        await bot.sendMessage(chatId, 'عذراً، هذه القائمة للمسؤول فقط.');
        return;
    }
    
    currentAdminToken = crypto.randomBytes(16).toString('hex');
    const adminUrl = `${WEB_APP_URL}/index.html?screen=admin&token=${currentAdminToken}`;
    
    const inquiryUrl = `${WEB_APP_URL}/inquiry`;
    const inlineKeyboard = [
        [{ text: 'Open', web_app: { url: adminUrl } }],
        [{ text: 'Open', web_app: { url: inquiryUrl } }]
    ];
    
    await bot.sendMessage(chatId, 'مرحباً بك يا مدير النظام! اضغط على الزر أدناه لفتح لوحة تحكم المشتركين:', {
        reply_markup: {
            inline_keyboard: inlineKeyboard
        }
    });
});

// /settoken command — تحديث توكن مزامنة GitHub حياً (للمالك فقط — التوكن لا يُخزَّن في المستودع)
bot.onText(/^\/settoken(?:\s+(\S+))?/i, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    if (String(chatId) !== String(ADMIN_CHAT_ID)) {
        await bot.sendMessage(chatId, 'عذراً، هذا الأمر للمالك فقط.');
        return;
    }
    const raw = (match && match[1] ? match[1] : '').trim();
    if (!raw) {
        await bot.sendMessage(chatId, '🔐 الاستخدام: /settoken <التوكن>\nأرسل التوكن بعد الأمر مباشرة (ghp_... أو نسخة Base64 منه).');
        return;
    }
    let tok = raw;
    if (!/^(ghp_|github_pat_|gho_|ghs_)/.test(tok)) {
        try { tok = Buffer.from(tok, 'base64').toString('utf-8').trim(); } catch (e) {}
    }
    if (!/^(ghp_|github_pat_|gho_|ghs_)[A-Za-z0-9_-]{20,}$/.test(tok)) {
        await bot.sendMessage(chatId, '❌ التوكن غير صالح (يجب أن يبدأ بـ ghp_ أو github_pat_). لم يتغير أي شيء.');
        return;
    }
    githubSyncToken = tok;
    try {
        fsSync.writeFileSync(path.join(__dirname, 'github_sync.token'), Buffer.from(tok, 'utf-8').toString('base64'), 'utf-8');
    } catch (e) {}
    scheduleGithubSync('subscriptions');
    const masked = tok.slice(0, 6) + '…' + tok.slice(-4);
    await bot.sendMessage(chatId, `✅ تم تحديث توكن المزامنة (${masked}) — المزامنة استؤنفت وسيتم رفع أي بيانات معلقة خلال دقائق.\n💡 للاستمرارية الدائمة أضف GITHUB_SYNC_TOKEN في متغيرات البيئة على Render.\n🗑 يُفضّل حذف رسالة التوكن من هذه المحادثة بعد الإرسال.`);
    console.log(`[data-sync] Token updated via /settoken (${masked})`);
});

// Admin commands to add subscriptions
bot.onText(/\/addsub\s+@?(\w+)\s+(\d+)/i, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    
    if (!isBotAdmin(chatId, msg.from?.username)) {
        await bot.sendMessage(chatId, 'ليس لديك صلاحية المسؤول لتنفيذ هذا الأمر.');
        return;
    }

    const targetUsername = match[1];
    const days = parseInt(match[2], 10);
    if (!targetUsername || isNaN(days) || days <= 0) {
        await bot.sendMessage(chatId, 'يرجى استخدام الصيغة الصحيحة: /addsub @username 30');
        return;
    }

    const result = await addSubscriptionByUsername(targetUsername, days);
    await bot.sendMessage(chatId, `✅ تم تفعيل الاشتراك بنجاح للمستخدم @${targetUsername} لمدة ${days} يوم.`);
    
    if (result.chatId && !result.chatId.startsWith('pending_')) {
        try {
            await bot.sendMessage(result.chatId, `🎉 تم تفعيل اشتراكك لامحدود لمدة ${days} يوم من قبل الإدارة!\nيمكنك الآن استخراج تقارير بلا حدود طوال فترة الاشتراك.\nافتح التطبيق عبر قائمة البوت.`);
        } catch (e) {
            console.warn('Could not send notification to user:', e.message);
        }
    }
});


// Admin command to add points (owner only)
// Supports both targets: /addpoints @username 50  OR  /addpoints 123456789 50
bot.onText(/\/addpoints\s+@?(\w+)\s+(\d+)/i, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    
    if (!isBotAdmin(chatId, msg.from?.username)) {
        await bot.sendMessage(chatId, 'ليس لديك صلاحية المسؤول لتنفيذ هذا الأمر.');
        return;
    }

    const targetUsername = match[1];
    const pointsToAdd = parseInt(match[2], 10);
    if (!targetUsername || isNaN(pointsToAdd) || pointsToAdd <= 0) {
        await bot.sendMessage(chatId, 'يرجى استخدام الصيغة الصحيحة:\n/addpoints @username 50\nأو بالـ Chat ID:\n/addpoints 123456789 50');
        return;
    }

    try {
        const data = await loadLocalSubscriptions();
        const cleaned = targetUsername.toLowerCase();
        const isNumericTarget = /^\d+$/.test(cleaned);
        
        let foundChatId = null;
        if (isNumericTarget && data.subscriptions[cleaned]) {
            foundChatId = cleaned;
        } else {
            for (const [cid, sub] of Object.entries(data.subscriptions)) {
                if (sub.username && sub.username.toLowerCase() === cleaned) {
                    foundChatId = cid;
                    break;
                }
            }
        }
        
        if (!foundChatId) {
            // Numeric target not found: create a real account under the given Chat ID so the user gets the points when they start the bot.
            // Username target not found: create a pending account resolved on the user's next /start.
            foundChatId = isNumericTarget ? cleaned : ('pending_' + cleaned);
            data.subscriptions[foundChatId] = {
                points: 0,
                subscriptionDays: 0,
                subscriptionExpires: null,
                username: isNumericTarget ? null : cleaned,
                reports: [],
                updatedAt: new Date().toISOString()
            };
        }
        
        const user = data.subscriptions[foundChatId];
        const prevPoints = user.points || 0;
        user.points = prevPoints + pointsToAdd;
        user.balance_points = user.points;
        // شحن النقاط يجعل مصدر الدفع «نقاط» — كل إصدار تقرير جديد سيخصم 5 نقاط
        user.report_payment_source = 'points';
        user.plan = 'points';
        user.updatedAt = new Date().toISOString();
        
        logTransaction(data, {
            admin_chat_id: chatId,
            target_chat_id: foundChatId,
            operation: 'add_points',
            amount: pointsToAdd,
            previous_value: prevPoints,
            new_value: user.points,
            details: `شحن نقاط عبر أمر تيليجرام (/addpoints) للمستخدم ${targetUsername}`
        });
        
        await saveLocalSubscriptions(data);
        
        await bot.sendMessage(chatId, `✅ تم إضافة ${pointsToAdd} نقطة بنجاح للمستخدم @${targetUsername}. الرصيد الجديد: ${user.points} نقطة.`);
        
        if (!foundChatId.startsWith('pending_')) {
            try {
                await bot.sendMessage(foundChatId, `🎉 تم شحن رصيدك بـ ${pointsToAdd} نقطة من قبل الإدارة! 
رصيدك الحالي أصبح ${user.points} نقطة.
يمكنك استخراج التقارير الآن.`);
            } catch (e) {
                console.warn('Could not notify user of added points:', e.message);
            }
        }
    } catch(err) {
        await bot.sendMessage(chatId, '❌ حدث خطأ أثناء إضافة النقاط: ' + err.message);
    }
});


// /mysub command
bot.onText(/\/mysub/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const username = msg.from?.username || msg.from?.first_name || 'مستخدم';
    const user = await findSubscription(chatId, username);
    const status = user.subscriptionDays > 0 ? `اشتراكك نشط، متبقي ${user.subscriptionDays} يوم.` : 'اشتراكك غير نشط أو انتهى. الرجاء التواصل لتفعيل الاشتراك.';
    await bot.sendMessage(chatId, status);
});

// Bottom Keyboard & Message Handlers
bot.on('message', async (msg) => {
    if (!msg.text) return;
    if (/^\/start/i.test(msg.text)) return; // Already handled
    if (/^\/mysub/i.test(msg.text)) return; // Already handled
    if (/^\/admin/i.test(msg.text)) return; // Already handled
    if (/^\/addsub/i.test(msg.text)) return; // Already handled
    if (/^\/help/i.test(msg.text)) return; // Already handled
    if (/^\/buy/i.test(msg.text)) return; // Already handled
    if (/^\/(charge|شحن)/i.test(msg.text)) return; // Already handled
    if (/^\/settoken/i.test(msg.text)) return; // Already handled (owner only)
    
    const chatId = msg.chat.id.toString();
    const username = msg.from?.username || msg.from?.first_name || 'مستخدم';
    
    if (msg.text === '📊 حالة حسابي') {
        await sendMyStatusMessage(chatId, username);
        return;
    }
    
    if (msg.text === '🔗 كسب نقاط (الإحالات)') {
        await sendReferralMessage(chatId, username);
        return;
    }
    
    if (msg.text === '🛒 متجر الباقات') {
        await sendPackagesMessage(chatId);
        return;
    }
    
    if (msg.text === '💳 شحن حسابي') {
        const nm = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ');
        await bot.sendMessage(chatId, buildRechargeText(chatId, nm));
        return;
    }
    
    console.log(`Telegram bot message received: "${msg.text}" from ${msg.from?.username || msg.from?.first_name}`);
});

bot.on('photo', async (msg) => {
    const chatId = msg.chat.id.toString();
    const photo = msg.photo[msg.photo.length - 1]; // get highest resolution
    const fileId = photo.file_id;
    
    const inlineKeyboard = {
        inline_keyboard: [
            [{ text: "تعيين كشعار وزارة الصحة (MoH)", callback_data: `setlogo_moh_${fileId}` }],
            [{ text: "تعيين كشعار المستشفى", callback_data: `setlogo_hosp_${fileId}` }],
            [{ text: "إلغاء", callback_data: "cancel_logo" }]
        ]
    };
    
    await bot.sendMessage(chatId, "ماذا تريد أن تفعل بهذه الصورة؟", { reply_markup: inlineKeyboard });
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id.toString();
    const data = query.data;
    
    if (data === "cancel_logo") {
        await bot.deleteMessage(chatId, query.message.message_id);
        return;
    }
    
    if (data.startsWith('setlogo_')) {
        const parts = data.split('_');
        const type = parts[1]; // moh or hosp
        const fileId = parts.slice(2).join('_');
        
        try {
            const fileLink = await bot.getFileLink(fileId);
            
            const subs = await loadLocalSubscriptions();
            if (!subs.subscriptions[chatId]) {
                subs.subscriptions[chatId] = { points: 0, subscriptionDays: 0, reports: [] };
            }
            
            if (type === 'moh') {
                subs.subscriptions[chatId].mohLogo = fileLink;
                await bot.answerCallbackQuery(query.id, { text: "تم تعيين شعار وزارة الصحة بنجاح ✅" });
            } else if (type === 'hosp') {
                subs.subscriptions[chatId].hospitalLogo = fileLink;
                await bot.answerCallbackQuery(query.id, { text: "تم تعيين شعار المستشفى بنجاح ✅" });
            }
            
            await saveLocalSubscriptions(subs);
            await bot.deleteMessage(chatId, query.message.message_id);
            await bot.sendMessage(chatId, "تم حفظ الشعار في حسابك بنجاح! سيتم استخدامه في التقارير القادمة. ✅\nيرجى إعادة فتح التطبيق لتحديث الشعارات.");
        } catch (e) {
            console.error(e);
            await bot.answerCallbackQuery(query.id, { text: "حدث خطأ أثناء حفظ الشعار ❌" });
        }
    }
});


// Admin command to cancel subscription
bot.onText(/\/cancelsub\s+@?(\w+)/i, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    
    if (!isBotAdmin(chatId, msg.from?.username)) return;

    const targetUsername = match[1].toLowerCase();
    try {
        const data = await loadLocalSubscriptions();
        let foundChatId = null;
        for (const [cid, sub] of Object.entries(data.subscriptions)) {
            if (sub.username && sub.username.toLowerCase() === targetUsername) {
                foundChatId = cid;
                break;
            }
        }
        
        if (!foundChatId) {
            await bot.sendMessage(chatId, '❌ المستخدم غير موجود في قاعدة البيانات.');
            return;
        }
        
        const user = data.subscriptions[foundChatId];
        user.subscriptionDays = 0;
        user.subscriptionExpires = null;
        user.updatedAt = new Date().toISOString();
        await saveLocalSubscriptions(data);
        
        await bot.sendMessage(chatId, `✅ تم إلغاء الاشتراك اللامحدود للمستخدم @${targetUsername} بنجاح.`);
        if (!foundChatId.startsWith('pending_')) {
            try {
                await bot.sendMessage(foundChatId, `⚠️ تم إلغاء اشتراكك اللامحدود من قبل الإدارة. يرجى تجديد الاشتراك للتمكن من استخراج التقارير.`);
            } catch(e){}
        }
    } catch(err) {
        await bot.sendMessage(chatId, '❌ خطأ: ' + err.message);
    }
});

// Admin command to remove points (owner only)
// Supports: /removepoints @username [amount]  OR  /removepoints 123456789 [amount]
// Without an amount the balance is zeroed; with an amount only that amount is deducted.
bot.onText(/\/removepoints\s+@?(\w+)(?:\s+(\d+))?/i, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    
    if (!isBotAdmin(chatId, msg.from?.username)) return;

    const targetUsername = match[1].toLowerCase();
    const amountToRemove = match[2] ? parseInt(match[2], 10) : null;
    try {
        const data = await loadLocalSubscriptions();
        const isNumericTarget = /^\d+$/.test(targetUsername);
        let foundChatId = null;
        if (isNumericTarget && data.subscriptions[targetUsername]) {
            foundChatId = targetUsername;
        } else {
            for (const [cid, sub] of Object.entries(data.subscriptions)) {
                if (sub.username && sub.username.toLowerCase() === targetUsername) {
                    foundChatId = cid;
                    break;
                }
            }
        }
        
        if (!foundChatId) {
            await bot.sendMessage(chatId, '❌ المستخدم غير موجود في قاعدة البيانات.');
            return;
        }
        
        const user = data.subscriptions[foundChatId];
        const prevPoints = user.points || 0;
        const newPoints = (amountToRemove !== null) ? Math.max(0, prevPoints - amountToRemove) : 0;
        user.points = newPoints;
        user.balance_points = newPoints;
        user.updatedAt = new Date().toISOString();
        
        logTransaction(data, {
            admin_chat_id: chatId,
            target_chat_id: foundChatId,
            operation: 'remove_points',
            amount: amountToRemove !== null ? (prevPoints - newPoints) : prevPoints,
            previous_value: prevPoints,
            new_value: newPoints,
            details: `سحب نقاط عبر أمر تيليجرام (/removepoints) للمستخدم ${targetUsername}`
        });
        
        await saveLocalSubscriptions(data);
        
        const targetLabel = isNumericTarget ? targetUsername : '@' + targetUsername;
        await bot.sendMessage(chatId, `✅ تم سحب ${prevPoints - newPoints} نقطة من المستخدم ${targetLabel}. الرصيد الجديد: ${newPoints} نقطة.`);
        if (!foundChatId.startsWith('pending_')) {
            try {
                await bot.sendMessage(foundChatId, `⚠️ تم سحب نقاطك من قبل الإدارة. رصيدك الحالي: ${newPoints} نقطة.`);
            } catch(e){}
        }
    } catch(err) {
        await bot.sendMessage(chatId, '❌ خطأ: ' + err.message);
    }
});

// Admin command to list subscribers
bot.onText(/\/subscribers/i, async (msg) => {
    const chatId = msg.chat.id.toString();
    
    if (!isBotAdmin(chatId, msg.from?.username)) return;

    try {
        const data = await loadLocalSubscriptions();
        let message = '📋 **قائمة المشتركين الفعالين:**\n\n';
        let count = 0;
        
        for (const [cid, sub] of Object.entries(data.subscriptions)) {
            const norm = normalizeSubscription(sub);
            if (norm.subscriptionDays > 0 || (norm.points && norm.points > 0)) {
                count++;
                message += `👤 @${norm.username || 'مجهول'} (${cid})\n`;
                if (norm.subscriptionDays > 0) message += ` └ 🗓 اشتراك: ${norm.subscriptionDays} يوم\n`;
                if (norm.points > 0) message += ` └ 🪙 نقاط: ${norm.points} نقطة\n`;
                message += '\n';
            }
        }
        
        if (count === 0) {
            message += 'لا يوجد مشتركين فعالين حالياً.';
        } else {
            message += `إجمالي الفعالين: ${count}`;
        }
        
        // If message is too long, split it or just send it (Telegram limit is 4096)
        if (message.length > 4000) {
            message = message.substring(0, 4000) + '... (مقطوع)';
        }
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch(err) {
        await bot.sendMessage(chatId, '❌ خطأ: ' + err.message);
    }
});


// Helper: Send Referral Statistics & Link
const sendReferralMessage = async (chatId, username) => {
    const user = await findSubscription(chatId, username);
    const botInfo = await bot.getMe();
    const botUsername = botInfo.username || 'sehaaaabot';
    const referralLink = `https://t.me/${botUsername}?start=ref_${chatId}`;

    // Calculate actual referrals
    const data = await loadLocalSubscriptions();
    let referralsCount = 0;
    for (const sub of Object.values(data.subscriptions)) {
        if (sub.referredBy === chatId) {
            referralsCount++;
        }
    }

    const referralMsg = `🔗 نظام الإحالات والمكافآت (Referral System)

شارك رابط إحالتك الفريد مع أصدقائك، واربح نقاطاً إضافية لإنشاء التقارير في كل مرة يقومون فيها بالاشتراك!

🔗 رابط إحالتك الخاص بك:
${referralLink}

📊 إحصائيات إحالتك:
• عدد الأشخاص المسجلين من خلالك: ${referralsCount} شخص
• رصيدك الحالي من نقاط الإحالة: ${user.referralPoints || 0} نقطة

🎁 كيف تربح النقاط؟
عندما يقوم شخص قمت بإحالته بأي عملية شراء، ستحصل أنت على المكافآت التالية تلقائياً في كل مرة يشتري فيها:
• خطة Month 1 (100.0 ريال) -> تربح 50 نقطة (10 تقارير مجاناً)
• خطة Months 3 (300.0 ريال) -> تربح 150 نقطة (30 تقرير مجاناً)
• خطة Months 6 (500.0 ريال) -> تربح 300 نقطة (60 تقرير مجاناً)
• خطة Year 1 (800.0 ريال) -> تربح 600 نقطة (120 تقرير مجاناً)
• خطة حزمة النقاط الأساسية (30 نقطة) (20.0 ريال) -> تربح 10 نقاط (2 تقرير مجاناً)
• خطة حزمة النقاط الموصى بها (100 نقطة) (50.0 ريال) -> تربح 25 نقطة (5 تقارير مجاناً)
• خطة حزمة النقاط المتقدمة (200 نقطة) (80.0 ريال) -> تربح 50 نقطة (10 تقارير مجاناً)

💡 ملاحظة: لا توجد صلاحية لانتهاء النقاط، ويمكنك استخدامها في أي وقت!`;

    await bot.sendMessage(chatId, referralMsg, {
        reply_markup: {
            inline_keyboard: [[
                { text: 'Open', web_app: { url: WEB_APP_URL_CACHED } }
            ]]
        }
    });
};

// Helper: Send Packages Store Menu
const sendPackagesMessage = async (chatId) => {
    const packagesMsg = `🛒 متجر الباقات والاشتراكات لإنشاء التقارير

شحن وتفعيل الباقات يتم يدوياً عبر الدعم الفني بشكل سهل وآمن وسريع.

⭐ حزم النقاط (بدون صلاحية انتهاء):
• حزمة البداية (5 نقاط): 5 نقاط -> السعر: 5.0 ريال سعودي
• حزمة 10 نقاط: 10 نقاط -> السعر: 10.0 ريال سعودي
• حزمة 20 نقطة: 20 نقطة -> السعر: 15.0 ريال سعودي
• حزمة النقاط الأساسية (30 نقطة): 30 نقطة -> السعر: 20.0 ريال سعودي
• حزمة 50 نقطة: 50 نقطة -> السعر: 30.0 ريال سعودي
• حزمة النقاط الموصى بها (100 نقطة): 100 نقطة -> السعر: 50.0 ريال سعودي
• حزمة النقاط المتقدمة (200 نقطة): 200 نقطة -> السعر: 80.0 ريال سعودي

📅 الاشتراكات اللامحدودة (غير محدودة التقارير):
• خطة 30 يوم -> السعر: 100.0 ريال سعودي
• خطة 90 يوم -> السعر: 300.0 ريال سعودي
• خطة 180 يوم -> السعر: 500.0 ريال سعودي
• خطة 365 يوم -> السعر: 800.0 ريال سعودي

👇 اضغط على الباقة التي تريدها للتواصل وتفعيلها فوراً:`;

    const ownerLink = `https://t.me/${ADMIN_USERNAME}`;
    const inlineKeyboard = [
        [{ text: '📅 خطة 30 يوم (100.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: خطة 30 يوم (100 ريال) لحسابي.')}` }],
        [{ text: '📅 خطة 90 يوم (300.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: خطة 90 يوم (300 ريال) لحسابي.')}` }],
        [{ text: '📅 خطة 180 يوم (500.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: خطة 180 يوم (500 ريال) لحسابي.')}` }],
        [{ text: '📅 خطة 365 يوم (800.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: خطة 365 يوم (800 ريال) لحسابي.')}` }],
        [{ text: '⭐ حزمة البداية (5 نقاط) (5.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: حزمة البداية 5 نقاط (5 ريال) لحسابي.')}` }],
        [{ text: '⭐ حزمة 10 نقاط (10.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: حزمة 10 نقاط (10 ريال) لحسابي.')}` }],
        [{ text: '⭐ حزمة 20 نقطة (15.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: حزمة 20 نقطة (15 ريال) لحسابي.')}` }],
        [{ text: '⭐ حزمة النقاط الأساسية (30 نقطة) (20.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: حزمة النقاط الأساسية 30 نقطة (20 ريال) لحسابي.')}` }],
        [{ text: '⭐ حزمة 50 نقطة (30.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: حزمة 50 نقطة (30 ريال) لحسابي.')}` }],
        [{ text: '⭐ حزمة النقاط الموصى بها (100 نقطة) (50.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: حزمة النقاط الموصى بها 100 نقطة (50 ريال) لحسابي.')}` }],
        [{ text: '⭐ حزمة النقاط المتقدمة (200 نقطة) (80.0 ريال) ↗️', url: `${ownerLink}?text=${encodeURIComponent('مرحباً، أود تفعيل باقة: حزمة النقاط المتقدمة 200 نقطة (80 ريال) لحسابي.')}` }]
    ];

    await bot.sendMessage(chatId, packagesMsg, {
        reply_markup: {
            inline_keyboard: inlineKeyboard
        }
    });
};

// Callback Query Handler for Inline Buttons
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id.toString();
    const username = query.from?.username || query.from?.first_name || 'مستخدم';
    
    if (query.data === 'referrals') {
        await sendReferralMessage(chatId, username);
        await bot.answerCallbackQuery(query.id);
    } else if (query.data === 'packages') {
        await sendPackagesMessage(chatId);
        await bot.answerCallbackQuery(query.id);
    } else if (query.data === 'mystatus') {
        await sendMyStatusMessage(chatId, username);
        await bot.answerCallbackQuery(query.id);
    } else if (query.data === 'recharge_info') {
        // زر «شحن حسابي» — نص تعليمات الشحن معبأ بمعرف واسم الضاغط
        const nm = [query.from?.first_name, query.from?.last_name].filter(Boolean).join(' ');
        await bot.sendMessage(chatId, buildRechargeText(chatId, nm));
        await bot.answerCallbackQuery(query.id);
    } else if (query.data && query.data.startsWith('qpkg:')) {
        // أزرار الشحن السريع في إشعارات المالك (طلب باقة/مستخدم جديد)
        await processQuickAddCallback(query);
    }
});

// API Endpoints

// Admin: Add user securely
app.post('/api/admin/add-user', express.json(), async (req, res) => {
    try {
        const { token, targetUsername, points, days } = req.body;
        if (!currentAdminToken || token !== currentAdminToken) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
        const data = await loadLocalSubscriptions();
        const cleaned = targetUsername.replace(/^@/, '').toLowerCase();
        
        // Find if user already exists
        let foundChatId = null;
        for (const [cid, sub] of Object.entries(data.subscriptions)) {
            if (sub.username && sub.username.toLowerCase() === cleaned) {
                foundChatId = cid;
                break;
            }
        }
        
        if (!foundChatId) {
            foundChatId = `pending_${cleaned}`;
            data.subscriptions[foundChatId] = {
                points: 0,
                subscriptionDays: 0,
                subscriptionExpires: null,
                username: cleaned,
                reports: [],
                updatedAt: new Date().toISOString()
            };
        }
        
        const user = data.subscriptions[foundChatId];
        user.points = (user.points || 0) + (parseInt(points) || 0);
        
        const addedDays = parseInt(days) || 0;
        if (addedDays > 0) {
            const now = new Date();
            let currentExpires = user.subscriptionExpires ? new Date(user.subscriptionExpires) : now;
            if (currentExpires < now) currentExpires = now;
            const newExpires = new Date(currentExpires.getTime() + addedDays * 24 * 60 * 60 * 1000);
            user.subscriptionExpires = newExpires.toISOString();
            user.subscriptionDays = getDaysRemaining(newExpires.toISOString());
        }
        
        // مصدر الدفع يتبع ما شحنه الأدمن (اختيار «نوع الاشتراك» في اللوحة):
        // نقاط → الدفع بالنقاط (خصم 5 لكل تقرير) | أيام → اشتراك غير محدود
        if ((parseInt(points) || 0) > 0 && addedDays === 0) {
            user.report_payment_source = 'points';
            user.plan = 'points';
        } else if (addedDays > 0 && !(parseInt(points) || 0)) {
            user.report_payment_source = 'unlimited';
            user.plan = 'unlimited';
        }
        
        await saveLocalSubscriptions(data);
        
        if (!foundChatId.startsWith('pending_')) {
            try {
                let notifyMsg = '🎉 تم تحديث اشتراكك من قبل الإدارة!\n';
                if (addedDays > 0) notifyMsg += `✅ تم تفعيل اشتراك لامحدود لمدة ${addedDays} يوم.\n`;
                if (parseInt(points) > 0) notifyMsg += `✅ تم إضافة ${points} نقطة لرصيدك.\n`;
                notifyMsg += 'يمكنك الآن الاستمتاع بخدمات البوت.';
                
                // Use a non-blocking message send
                bot.sendMessage(foundChatId, notifyMsg).catch(e => console.warn('Could not send to user from API:', e.message));
            } catch(e) {}
        }

        res.json({ success: true, message: 'تم التفعيل بنجاح!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// 1. Get User State
app.get('/api/user/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const username = req.query.username;
        // بيانات هوية تيليجرام تُمرر من التطبيق (للاسم في الإشعارات ولوحة الإدارة)
        const meta = {
            first_name: req.query.first_name || '',
            last_name: req.query.last_name || ''
        };
        const user = await findSubscription(chatId, username, null, meta);
        res.json({ success: true, user, reports: user.reports || [] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 1.2 Lightweight read-only balance endpoint (للمراقبة الحية للرصيد):
// لا يكتب في قاعدة البيانات إطلاقاً — آمن للاستقصاء المتكرر من التطبيق.
// يخدم طلب المالك: «اي واحد اضيفله نقاط خلي النقاط حقه تظهر له عند الرصيد»
app.get('/api/balance/:chatId', async (req, res) => {
    try {
        const data = await loadLocalSubscriptions();
        const userSub = data.subscriptions[req.params.chatId.toString()];
        if (!userSub) {
            return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
        }
        const u = normalizeSubscription(userSub);
        res.json({
            success: true,
            points: u.points || 0,
            subscriptionDays: u.subscriptionDays || 0,
            daysRemaining: u.daysRemaining || 0,
            report_payment_source: u.report_payment_source || 'none',
            plan: u.plan || 'none',
            status: u.status || 'active'
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 1.4 طلب باقة من التطبيق → إشعار فوري للمالك مع أزرار الشحن السريع (طلب المالك:
// «اذا طلب باقه معينه يظهر لي رساله بلبوت تقلي المستخدم طلب باقه كذا ويظهرو ازرار الاضافه»)
app.post('/api/packages/request', express.json(), async (req, res) => {
    try {
        const { chatId, pkgId, name, username } = req.body || {};
        const pkg = PKG_CATALOG[pkgId];
        const cleanId = String(chatId || '').trim();
        if (!pkg) return res.status(400).json({ success: false, error: 'باقة غير معروفة' });
        if (!cleanId || !/^\d+$/.test(cleanId)) return res.status(400).json({ success: false, error: 'Chat ID غير صالح' });
        if (cleanId === String(ADMIN_CHAT_ID)) return res.json({ success: true, skipped: true });

        // منع التكرار: نفس الطلب خلال 30 ثانية يُتجاهل بهدوء (حماية من الضغط المتكرر)
        const tKey = `${cleanId}:${pkgId}`;
        const now = Date.now();
        const last = pkgReqThrottle.get(tKey) || 0;
        if (now - last < 30000) return res.json({ success: true, throttled: true });
        pkgReqThrottle.set(tKey, now);
        if (pkgReqThrottle.size > 500) {
            for (const [k, v] of pkgReqThrottle) { if (now - v > 300000) pkgReqThrottle.delete(k); }
        }

        // إثراء الرسالة ببيانات المستخدم من قاعدة البيانات
        const data = await loadLocalSubscriptions();
        const u = normalizeSubscription(data.subscriptions[cleanId] || {});
        const displayName = (name || '').trim() || u.name || (u.username ? '@' + u.username : 'بدون اسم');
        const uname = (username || '').trim() || u.username || null;

        notifyOwner(
`🛒 طلب باقة جديدة!
━━━━━━━━━━━━━━━━━━━━━━
• المستخدم: ${displayName}
• المعرف: ${uname ? '@' + uname : 'لا يوجد'}
• ID: ${cleanId}
• الباقة: ${pkg.label}
• السعر: ${pkg.price} ريال سعودي
━━━━━━━━━━━━━━━━━━━━━━
بعد تأكد الدفع اضغط للشحن الفوري 👇`,
            pkgReqKeyboard(cleanId, pkgId, uname)
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// نقاط نهاية الاختبار المحلي فقط (توكن وهمي TEST_TOKEN_LOCAL) — لا تُفعّل في الإنتاج
if (TEST_MODE) {
    app.get('/api/test/notifications', (req, res) => {
        res.json({ success: true, count: TEST_SENT_MESSAGES.length, messages: TEST_SENT_MESSAGES });
    });
    app.post('/api/test/reset-notifications', (req, res) => {
        TEST_SENT_MESSAGES.length = 0;
        res.json({ success: true });
    });
    // محاكاة ضغط المالك على زر الشحن السريع في إشعار تيليجرام
    app.post('/api/test/callback', express.json(), async (req, res) => {
        try {
            const { data, fromId } = req.body || {};
            const fid = parseInt(fromId) || parseInt(ADMIN_CHAT_ID);
            await processQuickAddCallback({
                id: 'testcb-' + Date.now(),
                data,
                from: { id: fid, username: 'test_owner', first_name: 'Owner' },
                message: { chat: { id: fid } }
            });
            res.json({ success: true });
        } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    });
}

// 1.5 Generate PDF / Save Report Draft
app.post('/api/generate', async (req, res) => {
    try {
        const { chatId, report } = req.body;
        if (!chatId || !report) return res.status(400).json({ success: false, error: 'Invalid data' });

        const data = await loadLocalSubscriptions();
        const chatIdStr = chatId.toString();

        if (!data.subscriptions[chatIdStr]) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const userSub = data.subscriptions[chatIdStr];
        const normalized = normalizeSubscription(userSub);

        if (!userSub.reports) {
            userSub.reports = [];
        }

        const index = userSub.reports.findIndex(r => r.id === report.id);
        const isUpdate = (index >= 0);
        
        if (isUpdate) {
            const existingReport = userSub.reports[index];
            if (existingReport.issueDate) {
                const issueDateObj = new Date(existingReport.issueDate);
                const now = new Date();
                if ((now - issueDateObj) > (2 * 24 * 60 * 60 * 1000)) {
                    return res.status(403).json({ success: false, error: 'لا يمكن تعديل التقرير بعد مرور يومين من تاريخ إصداره.' });
                }
            }
        }

        if (!isUpdate) {
            // PAYMENT-SOURCE AWARE GATE (consistent with /api/generate-native-pdf)
            const paySource = resolvePaySource(userSub);
            if (paySource === 'points') {
                if ((userSub.points || 0) < REPORT_COST_POINTS) {
                    return res.status(403).json({ success: false, error: `عذراً، رصيدك غير كافٍ. تحتاج ${REPORT_COST_POINTS} نقاط لإصدار تقرير جديد.` });
                }
                const prevPts = userSub.points || 0;
                userSub.points = prevPts - REPORT_COST_POINTS;
                userSub.balance_points = userSub.points;
                logTransaction(data, {
                    admin_chat_id: 'system',
                    target_chat_id: chatIdStr,
                    operation: 'report_deduction',
                    amount: REPORT_COST_POINTS,
                    previous_value: prevPts,
                    new_value: userSub.points,
                    details: `خصم ${REPORT_COST_POINTS} نقاط لإصدار تقرير ${report.id || ''} (/api/generate)`
                });
            } else if (paySource === 'none' || (userSub.subscriptionDays || 0) <= 0) {
                if (paySource === 'none') {
                    return res.status(403).json({ success: false, error: '❌ لا يوجد اشتراك أو رصيد فعّال على حسابك. يرجى التواصل مع المالك لمنحك نقاطاً أو اشتراكاً.' });
                }
                return res.status(403).json({ success: false, error: '❌ انتهت صلاحية اشتراكك. يرجى التجديد لإصدار التقارير.' });
            }
        }

        if (isUpdate) {
            userSub.reports[index] = report;
        } else {
            userSub.reports.push(report);
        }

        userSub.updatedAt = new Date().toISOString();
        await saveLocalSubscriptions(data);
        res.json({ success: true, report, generatedAt: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin Authentication Middleware / Helper
const verifyAdmin = (req) => {
    // 1. Check initData header, query, or body
    const initData = req.headers['x-telegram-init-data'] || req.query.initData || req.body?.initData;
    if (initData) {
        try {
            const urlParams = new URLSearchParams(initData);
            const hash = urlParams.get('hash');
            urlParams.delete('hash');
            
            const params = [];
            for (const [key, val] of urlParams.entries()) {
                params.push(`${key}=${val}`);
            }
            params.sort();
            const dataCheckString = params.join('\n');
            
            const secretKey = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
            const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
            
            if (calculatedHash === hash) {
                const userObj = JSON.parse(urlParams.get('user') || '{}');
                const uid = String(userObj.id || '');
                // Owner = ADMIN_CHAT_ID only (7853478744 / @ppppokl)
                if (uid === String(ADMIN_CHAT_ID)) {
                    return { authorized: true, adminId: uid };
                }
            }
        } catch (e) {
            console.error('Error validating initData:', e.message);
        }
    }
    
    // 2. Check admin token (generated via /admin bot command, delivered ONLY to the owner's chat)
    const token = req.headers['x-admin-token'] || req.query.token || req.body?.token;
    if (currentAdminToken && token && token === currentAdminToken) {
        return { authorized: true, adminId: ADMIN_CHAT_ID };
    }
    
    return { authorized: false };
};

// -------------------------------------------------------------
// ADMIN WEB APIS
// -------------------------------------------------------------

// Admin Statistics Endpoint
app.get('/api/admin/web/stats', async (req, res) => {
    const auth = verifyAdmin(req);
    if (!auth.authorized) {
        return res.status(401).json({ success: false, error: 'غير مصرح لك بالوصول (Admin Only)' });
    }
    
    try {
        const data = await loadLocalSubscriptions();
        let totalSubscribers = 0;
        let activeSubscribers = 0;
        let suspendedSubscribers = 0;
        let expiredSubscribers = 0;
        let totalReports = 0;
        let totalPoints = 0;
        let pointsSubscribers = 0;
        let unlimitedSubscribers = 0;
        
        for (const [cid, rawUser] of Object.entries(data.subscriptions)) {
            totalSubscribers++;
            const u = normalizeSubscription(rawUser);
            
            if (u.status === 'suspended') {
                suspendedSubscribers++;
            } else if (u.status === 'cancelled' || u.daysRemaining <= 0) {
                expiredSubscribers++;
            } else if (u.status === 'active' && u.daysRemaining > 0) {
                activeSubscribers++;
            }
            
            totalReports += (u.reports ? u.reports.length : 0);
            totalPoints += (u.points || 0);
            
            if (u.report_payment_source === 'unlimited') {
                unlimitedSubscribers++;
            } else {
                pointsSubscribers++;
            }
        }
        
        res.json({
            success: true,
            stats: {
                totalSubscribers,
                activeSubscribers,
                suspendedSubscribers,
                expiredSubscribers,
                totalReports,
                totalPoints,
                pointsSubscribers,
                unlimitedSubscribers
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin Users List Endpoint
app.get('/api/admin/web/users', async (req, res) => {
    const auth = verifyAdmin(req);
    if (!auth.authorized) {
        return res.status(401).json({ success: false, error: 'غير مصرح لك بالوصول (Admin Only)' });
    }
    
    try {
        const data = await loadLocalSubscriptions();
        const users = [];
        for (const [cid, rawUser] of Object.entries(data.subscriptions)) {
            const u = normalizeSubscription(rawUser);
            users.push({
                chatId: cid,
                username: u.username || '',
                name: u.name || (u.username ? `@${u.username}` : `مستخدم ${cid}`),
                status: u.status || 'active',
                plan: u.plan || 'points',
                report_payment_source: u.report_payment_source || 'points',
                points: u.points || 0,
                balance_points: u.points || 0,
                subscriptionDays: u.subscriptionDays || 0,
                subscription_start_date: u.subscription_start_date || '',
                subscription_end_date: u.subscription_end_date || u.subscriptionExpires || '',
                daysUsed: u.daysUsed || 0,
                daysRemaining: u.daysRemaining || 0,
                reportsCount: u.reportsCount || 0,
                updatedAt: u.updatedAt || ''
            });
        }
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin Add Subscriber Endpoint
app.post('/api/admin/web/user/add', async (req, res) => {
    const auth = verifyAdmin(req);
    if (!auth.authorized) {
        return res.status(401).json({ success: false, error: 'غير مصرح لك بالوصول (Admin Only)' });
    }
    
    try {
        const { chatId, username, name, subscriptionDays, plan, balance_points, report_payment_source } = req.body;
        const cleanChatId = String(chatId || '').trim();
        if (!cleanChatId) {
            return res.status(400).json({ success: false, error: 'يجب إدخال الـ Chat ID' });
        }
        
        await withDbLock(async () => {
            const data = await loadLocalSubscriptions();
            if (data.subscriptions[cleanChatId]) {
                return res.status(400).json({ success: false, error: 'المشترك موجود مسبقاً بهذا الـ Chat ID' });
            }
            
            const days = parseInt(subscriptionDays) || 0;
            const pts = parseInt(balance_points) || 0;
            const now = new Date();
            const start = now.toISOString();
            const end = days > 0 ? new Date(now.getTime() + days * 86400000).toISOString() : null;
            
            const cleanUser = username ? String(username).replace(/^@/, '').trim() : '';
            const subType = plan === 'unlimited' ? 'unlimited' : 'points';
            const paySrc = report_payment_source === 'unlimited' ? 'unlimited' : 'points';
            
            const newUser = {
                username: cleanUser,
                name: name || (cleanUser ? `@${cleanUser}` : `مستخدم ${cleanChatId}`),
                status: 'active',
                plan: subType,
                report_payment_source: paySrc,
                points: pts,
                balance_points: pts,
                subscriptionDays: days,
                subscription_start_date: start,
                subscription_end_date: end,
                subscriptionExpires: end,
                reports: [],
                referredBy: null,
                referralsCount: 0,
                referralPoints: 0,
                updatedAt: start
            };
            
            data.subscriptions[cleanChatId] = newUser;
            
            logTransaction(data, {
                admin_chat_id: auth.adminId,
                target_chat_id: cleanChatId,
                operation: 'add_user',
                amount: pts,
                new_value: `${days} days, ${pts} points, ${paySrc}`,
                details: `إضافة مشترك جديد Chat ID: ${cleanChatId}`
            });
            
            await saveLocalSubscriptions(data);
            
            res.json({
                success: true,
                message: 'تم إضافة المشترك بنجاح',
                user: { chatId: cleanChatId, ...normalizeSubscription(newUser) }
            });
        });
    } catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
});

// Admin Update Subscriber Endpoint
app.post('/api/admin/web/user/update', async (req, res) => {
    const auth = verifyAdmin(req);
    if (!auth.authorized) {
        return res.status(401).json({ success: false, error: 'غير مصرح لك بالوصول (Admin Only)' });
    }
    
    try {
        const { chatId, action, amount, days, paymentSource, status } = req.body;
        const cleanChatId = String(chatId || '').trim();
        if (!cleanChatId) {
            return res.status(400).json({ success: false, error: 'Chat ID مطلوب' });
        }
        
        await withDbLock(async () => {
            const data = await loadLocalSubscriptions();
            if (!data.subscriptions[cleanChatId]) {
                return res.status(404).json({ success: false, error: 'المشترك غير موجود في قاعدة البيانات' });
            }
            
            const user = data.subscriptions[cleanChatId];
            normalizeSubscription(user);
            
            let message = 'تم تحديث بيانات المشترك بنجاح';
            
            if (action === 'add_points') {
                const amt = parseInt(amount) || 0;
                if (amt <= 0) return res.status(400).json({ success: false, error: 'عدد النقاط يجب أن يكون أكبر من 0' });
                const prev = user.points || 0;
                user.points = prev + amt;
                user.balance_points = user.points;
                // شحن النقاط يجعل مصدر الدفع «نقاط» — التقرير التالي يخصم 5 نقاط فوراً
                user.report_payment_source = 'points';
                user.plan = 'points';
                logTransaction(data, {
                    admin_chat_id: auth.adminId,
                    target_chat_id: cleanChatId,
                    operation: 'add_points',
                    amount: amt,
                    previous_value: prev,
                    new_value: user.points,
                    details: `إضافة ${amt} نقطة إلى رصيد المشترك (مصدر الدفع: نقاط)`
                });
                message = `تم إضافة ${amt} نقطة بنجاح (الرصيد الجديد: ${user.points}) — مصدر الدفع الآن: 🪙 بالنقاط`;
            } else if (action === 'remove_points') {
                const amt = parseInt(amount) || 0;
                if (amt <= 0) return res.status(400).json({ success: false, error: 'عدد النقاط يجب أن يكون أكبر من 0' });
                const current = user.points || 0;
                if (amt > current) {
                    return res.status(400).json({
                        success: false,
                        error: `رصيد المشترك (${current}) غير كافٍ لخصم ${amt} نقطة`
                    });
                }
                user.points = current - amt;
                user.balance_points = user.points;
                logTransaction(data, {
                    admin_chat_id: auth.adminId,
                    target_chat_id: cleanChatId,
                    operation: 'remove_points',
                    amount: amt,
                    previous_value: current,
                    new_value: user.points,
                    details: `خصم ${amt} نقطة من رصيد المشترك`
                });
                message = `تم خصم ${amt} نقطة بنجاح (الرصيد الجديد: ${user.points})`;
            } else if (action === 'set_payment_source') {
                if (!['points', 'unlimited', 'none'].includes(paymentSource)) {
                    return res.status(400).json({ success: false, error: 'مصدر الدفع غير صالح' });
                }
                const prev = user.report_payment_source || 'points';
                user.report_payment_source = paymentSource;
                if (paymentSource === 'none') user.plan = 'none';
                logTransaction(data, {
                    admin_chat_id: auth.adminId,
                    target_chat_id: cleanChatId,
                    operation: 'payment_source_changed',
                    previous_value: prev,
                    new_value: paymentSource,
                    details: `تغيير مصدر دفع التقارير إلى ${paymentSource === 'unlimited' ? 'غير محدود' : (paymentSource === 'none' ? 'بدون (بانتظار منح المالك)' : 'بالنقاط')}`
                });
                message = `تم تغيير مصدر الدفع إلى: ${paymentSource === 'unlimited' ? '♾️ غير محدود' : (paymentSource === 'none' ? '⚪ بدون (بانتظار منح المالك)' : '🪙 بالنقاط')}`;
            } else if (action === 'set_status') {
                if (!['active', 'suspended'].includes(status)) {
                    return res.status(400).json({ success: false, error: 'حالة غير صالحة' });
                }
                const prev = user.status || 'active';
                user.status = status;
                const op = status === 'active' ? 'subscription_activate' : 'subscription_suspend';
                logTransaction(data, {
                    admin_chat_id: auth.adminId,
                    target_chat_id: cleanChatId,
                    operation: op,
                    previous_value: prev,
                    new_value: status,
                    details: `تغيير حالة المشترك إلى ${status === 'active' ? 'فعال' : 'موقوف'}`
                });
                message = `تم تغيير حالة المشترك إلى: ${status === 'active' ? '🟢 فعال' : '⏸️ موقوف'}`;
            } else if (action === 'renew') {
                const addDays = parseInt(days) || 0;
                if (addDays <= 0) return res.status(400).json({ success: false, error: 'عدد الأيام يجب أن يكون أكبر من 0' });
                const now = new Date();
                let baseDate = now;
                if (user.subscription_end_date && new Date(user.subscription_end_date) > now) {
                    baseDate = new Date(user.subscription_end_date);
                }
                const newEnd = new Date(baseDate.getTime() + addDays * 86400000);
                const prev = user.subscription_end_date;
                user.subscription_end_date = newEnd.toISOString();
                user.subscriptionExpires = newEnd.toISOString();
                user.status = 'active'; // Always reactivate on renewal
                // تجديد الأيام يجعل مصدر الدفع «غير محدود» — يغطيها الاشتراك النشط
                user.report_payment_source = 'unlimited';
                user.plan = 'unlimited';
                logTransaction(data, {
                    admin_chat_id: auth.adminId,
                    target_chat_id: cleanChatId,
                    operation: 'subscription_renew',
                    amount: addDays,
                    previous_value: prev,
                    new_value: newEnd.toISOString(),
                    details: `تجديد الاشتراك لمدة ${addDays} يوم`
                });
                message = `تم تجديد الاشتراك بنجاح لمدة ${addDays} يوم`;
            } else if (action === 'cancel') {
                const prev = user.status;
                user.status = 'cancelled';
                logTransaction(data, {
                    admin_chat_id: auth.adminId,
                    target_chat_id: cleanChatId,
                    operation: 'subscription_cancel',
                    previous_value: prev,
                    new_value: 'cancelled',
                    details: 'إلغاء الاشتراك نهائياً'
                });
                message = 'تم إلغاء الاشتراك بنجاح (سيبقى الحساب بالسجلات)';
            } else {
                return res.status(400).json({ success: false, error: 'إجراء غير معروف' });
            }
            
            user.updatedAt = new Date().toISOString();
            await saveLocalSubscriptions(data);
            
            // إشعار تيليجرام للمشترك عند المنح (نقاط أو تجديد) — طلب المالك:
            // «اي واحد اضيفله نقاط خلي النقاط حقه تظهر له» — تصل فوراً + يظهر الرصيد في التطبيق
            try {
                const normalizedUser = normalizeSubscription(user);
                let grantMsg = null;
                if (action === 'add_points') {
                    grantMsg = `🎁 قام المالك بمنحك ${parseInt(amount) || 0} نقطة!\n\n🌑 رصيدك الآن: ${user.points || 0} نقطة\n• تكلفة التقرير الواحد: 5 نقاط\n\nافتح التطبيق — ستجد رصيدك محدّثاً عند «رصيدك».`;
                } else if (action === 'renew') {
                    grantMsg = `📅 قام المالك بتفعيل اشتراكك لمدة ${parseInt(days) || 0} يوم!\n\n✅ الأيام المتبقية: ${normalizedUser.daysRemaining || 0} يوم\nافتح التطبيق — ستجد رصيدك محدّثاً.`;
                }
                if (grantMsg) {
                    bot.sendMessage(cleanChatId, grantMsg).catch(e => console.warn('Grant notification failed:', e.message));
                }
            } catch (e) { console.warn('Grant notification error:', e.message); }
            
            res.json({
                success: true,
                message,
                user: { chatId: cleanChatId, ...normalizeSubscription(user) }
            });
        });
    } catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
});

// Admin Get Reports for User
app.get('/api/admin/web/user/:id/reports', async (req, res) => {
    const auth = verifyAdmin(req);
    if (!auth.authorized) {
        return res.status(401).json({ success: false, error: 'غير مصرح لك بالوصول (Admin Only)' });
    }
    
    try {
        const data = await loadLocalSubscriptions();
        const user = data.subscriptions[req.params.id];
        if (!user) {
            return res.status(404).json({ success: false, error: 'المشترك غير موجود' });
        }
        res.json({
            success: true,
            reports: Array.isArray(user.reports) ? user.reports : []
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin Get Transaction Logs for User
app.get('/api/admin/web/user/:id/logs', async (req, res) => {
    const auth = verifyAdmin(req);
    if (!auth.authorized) {
        return res.status(401).json({ success: false, error: 'غير مصرح لك بالوصول (Admin Only)' });
    }
    
    try {
        const data = await loadLocalSubscriptions();
        const targetId = String(req.params.id);
        const logs = (data.transactions || []).filter(tx => tx.target_chat_id === targetId || tx.admin_chat_id === targetId);
        res.json({
            success: true,
            logs
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Legacy /api/admin/package compatibility endpoint
app.post('/api/admin/package', async (req, res) => {
    const auth = verifyAdmin(req);
    if (!auth.authorized) {
        return res.status(401).json({ success: false, error: 'غير مصرح لك (Unauthorized)' });
    }
    try {
        const { chatId, points, subscriptionDays } = req.body;
        const cleanChatId = String(chatId || '').trim();
        if (!cleanChatId) return res.status(400).json({ success: false, error: 'Chat ID مطلوب' });
        
        await withDbLock(async () => {
            const data = await loadLocalSubscriptions();
            let user = data.subscriptions[cleanChatId];
            const days = parseInt(subscriptionDays) || 0;
            const pts = parseInt(points) || 0;
            const now = new Date();
            
            if (!user) {
                user = {
                    username: '',
                    name: `مستخدم ${cleanChatId}`,
                    status: 'active',
                    plan: days > 0 ? 'unlimited' : 'points',
                    report_payment_source: days > 0 ? 'unlimited' : 'points',
                    points: pts,
                    balance_points: pts,
                    subscriptionDays: days,
                    subscription_start_date: now.toISOString(),
                    subscription_end_date: days > 0 ? new Date(now.getTime() + days * 86400000).toISOString() : null,
                    subscriptionExpires: days > 0 ? new Date(now.getTime() + days * 86400000).toISOString() : null,
                    reports: [],
                    referredBy: null,
                    referralsCount: 0,
                    referralPoints: 0,
                    updatedAt: now.toISOString()
                };
                data.subscriptions[cleanChatId] = user;
                logTransaction(data, {
                    admin_chat_id: auth.adminId,
                    target_chat_id: cleanChatId,
                    operation: 'add_user',
                    amount: pts,
                    details: 'تمت الإضافة عبر /api/admin/package'
                });
            } else {
                normalizeSubscription(user);
                user.points = (user.points || 0) + pts;
                user.balance_points = user.points;
                if (days > 0) {
                    let base = now;
                    if (user.subscription_end_date && new Date(user.subscription_end_date) > now) {
                        base = new Date(user.subscription_end_date);
                    }
                    const newEnd = new Date(base.getTime() + days * 86400000);
                    user.subscription_end_date = newEnd.toISOString();
                    user.subscriptionExpires = newEnd.toISOString();
                }
                // مصدر الدفع يتبع ما شحنه الأدمن
                if (pts > 0 && days === 0) {
                    user.report_payment_source = 'points';
                    user.plan = 'points';
                } else if (days > 0 && pts === 0) {
                    user.report_payment_source = 'unlimited';
                    user.plan = 'unlimited';
                }
                user.status = 'active';
                user.updatedAt = now.toISOString();
                logTransaction(data, {
                    admin_chat_id: auth.adminId,
                    target_chat_id: cleanChatId,
                    operation: 'update_user',
                    amount: pts,
                    details: 'تحديث الحساب عبر /api/admin/package'
                });
            }
            await saveLocalSubscriptions(data);
            res.json({
                success: true,
                points: user.points,
                subscriptionDays: user.subscriptionDays,
                user: normalizeSubscription(user)
            });
        });
    } catch (err) {
        if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
    }
});

// --- Inquiry Endpoints ---
// مطابقة للمستودع المرجعي alehtiat-almorish: /inquiry يخدم صفحة الاستعلام بنمط منصة صحة (Cairo)
app.get(['/inquiry', '/inquiries/slenquiry', '/slenquiry'], (req, res) => {
    res.sendFile(path.join(__dirname, 'inquiry.html'));
});
app.get('/verify', (req, res) => {
    res.sendFile(path.join(__dirname, 'verify.html'));
});

app.post('/api/inquiry', async (req, res) => {
    try {
        const rawLeaveId = req.body.leaveId || req.body.service_code || req.body.id || req.body.serviceCode || '';
        const rawNationalId = req.body.nationalId || req.body.national_id || req.body.nin || req.body.nid || '';
        
        const cleanDigits = (s) => String(s || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).trim();
        const cleanCode = (s) => cleanDigits(s).toUpperCase().replace(/\s+/g, '');

        const leaveId = cleanCode(rawLeaveId);
        const nationalId = cleanDigits(rawNationalId);

        if (!leaveId || !nationalId) {
            return res.json({ success: false, error: 'الرجاء إدخال رمز الخدمة ورقم الهوية.' });
        }

        const data = await loadLocalSubscriptions();
        
        let foundLeaveIdMatch = false;
        let foundReport = null;
        
        for (const chatId in data.subscriptions) {
            const sub = data.subscriptions[chatId];
            if (sub.reports && Array.isArray(sub.reports)) {
                for (const r of sub.reports) {
                    const rId = cleanCode(r.id || r.leaveId || (r.data && (r.data.id || r.data.leaveId || r.data.service_code)));
                    if (rId === leaveId) {
                        foundLeaveIdMatch = true;
                        const rNid = cleanDigits((r.data && (r.data.national_id || r.data.nationalId)) || r.nationalId || r.national_id);
                        if (rNid === nationalId) {
                            foundReport = r;
                            break;
                        }
                    }
                }
            }
            if (foundReport) break;
        }

        if (foundReport) {
            const rData = foundReport.data || {};
            const isCompanion = (foundReport.type === 'companion' || foundReport.type === 'companion_review' || (rData.escort_name_ar && rData.escort_name_ar.trim().length > 0));
            const formatted = {
                id: foundReport.id || leaveId,
                serviceCode: foundReport.id || leaveId,
                nationalId: rData.national_id || nationalId,
                type: foundReport.type || (isCompanion ? 'companion' : 'sickleave'),
                name: rData.patient_name_ar || foundReport.patientName || rData.patient_name_en || '',
                patientName: rData.patient_name_ar || foundReport.patientName || '',
                companionName: rData.escort_name_ar || '',
                relation: rData.relation_ar || '',
                issueDate: rData.issue_date || foundReport.issueDate || '',
                startDate: rData.admission_date || rData.start_date || '',
                endDate: rData.discharge_date || rData.end_date || '',
                duration: String(rData.duration || '1'),
                doctorName: rData.doctor_name_ar || rData.doctor_name || '',
                jobTitle: rData.job_title_ar || rData.position || '',
                hospital: rData.hospital_ar || '',
                data: rData
            };
            res.json({ success: true, report: formatted });
        } else if (foundLeaveIdMatch) {
            res.json({ success: false, error: 'بيانات الاستعلام غير متطابقة (رقم الهوية غير مطابق لرمز الخدمة).' });
        } else {
            res.json({ success: false, error: 'لم يتم العثور على تقرير إجازة بهذا الرمز.' });
        }
    } catch (err) {
        console.error("Inquiry Error:", err);
        res.status(500).json({ 
            success: false, 
            error: 'حدث خطأ مؤقت أثناء الاستعلام، يرجى المحاولة مرة أخرى.', 
            details: err.message 
        });
    }
});

// POST /inquiry/api — مطابق للمستودع المرجعي alehtiat-almorish (routes/inquiry.js)
// الطلب: { service_code, national_id } — الاستجابة: { success, data: {name, issue_date, date_from, date_to, day_count, doctor_name, doctor_specialty} }
app.post('/inquiry/api', async (req, res) => {
    const service_code = (req.body.service_code || '').trim();
    const national_id = (req.body.national_id || '').trim();

    if (!service_code || !national_id) {
        return res.status(400).json({ success: false, message: "يرجى إدخال رمز الخدمة ورقم الهوية." });
    }

    try {
        // إعادة استخدام نفس منطق البحث الموجود في /api/inquiry
        const data = await loadLocalSubscriptions();

        const cleanDigits = (s) => String(s || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).trim();
        const cleanCode = (s) => cleanDigits(s).toUpperCase().replace(/\s+/g, '');

        const leaveId = cleanCode(service_code);
        const nid = cleanDigits(national_id);

        let foundReport = null;
        for (const chatId in data.subscriptions) {
            const sub = data.subscriptions[chatId];
            if (sub.reports && Array.isArray(sub.reports)) {
                for (const r of sub.reports) {
                    const rId = cleanCode(r.id || r.leaveId || (r.data && (r.data.id || r.data.leaveId || r.data.service_code)));
                    if (rId === leaveId) {
                        const rNid = cleanDigits((r.data && (r.data.national_id || r.data.nationalId)) || r.nationalId || r.national_id);
                        if (rNid === nid) { foundReport = r; break; }
                    }
                }
            }
            if (foundReport) break;
        }

        // تنسيق التاريخ DD-MM-YYYY (نفس دالة formatDate في المرجع)
        const formatDate = (date) => {
            if (!date) return '';
            const d = new Date(date);
            if (isNaN(d.getTime())) return date;
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${day}-${month}-${year}`;
        };

        if (foundReport) {
            const rData = foundReport.data || {};
            res.json({
                success: true,
                data: {
                    name: rData.patient_name_ar || foundReport.patientName || '',
                    issue_date: formatDate(rData.issue_date || foundReport.issueDate || ''),
                    date_from: formatDate(rData.admission_date || rData.start_date || ''),
                    date_to: formatDate(rData.discharge_date || rData.end_date || ''),
                    day_count: String(rData.duration || '1'),
                    doctor_name: rData.doctor_name_ar || rData.doctor_name || '',
                    doctor_specialty: rData.job_title_ar || rData.position || ''
                }
            });
        } else {
            res.status(404).json({ success: false, message: "خطأ في الاستعلام" });
        }
    } catch (err) {
        console.error('Inquiry API Error:', err);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء الاتصال بالنظام" });
    }
});

app.post('/api/admin/package', async (req, res) => {
    try {
        const { token, chatId, points, subscriptionDays } = req.body;
        
        // Only the dynamic token issued via the /admin bot command is accepted (owner only)
        if (token !== currentAdminToken) {
            return res.status(401).json({ success: false, error: 'الرمز السري غير صحيح!' });
        }
        
        const data = await loadLocalSubscriptions();
        const chatIdStr = chatId.toString();
        
        if (!data.subscriptions[chatIdStr]) {
            data.subscriptions[chatIdStr] = {
                points: 0,
                subscriptionDays: 0,
                subscriptionExpires: null,
                username: null,
                reports: [],
                updatedAt: new Date().toISOString()
            };
        }
        
        const userSub = data.subscriptions[chatIdStr];
        const normalized = normalizeSubscription(userSub);
        
        if (subscriptionDays > 0) {
            const now = new Date();
            let currentExpires = normalized.subscriptionExpires ? new Date(normalized.subscriptionExpires) : now;
            if (currentExpires < now) currentExpires = now;
            currentExpires.setDate(currentExpires.getDate() + subscriptionDays);
            normalized.subscriptionExpires = currentExpires.toISOString();
            normalized.subscriptionDays = subscriptionDays;
        }
        
        normalized.points = (normalized.points || 0) + (points || 0);
        normalized.updatedAt = new Date().toISOString();
        
        // Write back
        data.subscriptions[chatIdStr] = normalized;
        await saveLocalSubscriptions(data);
        
        res.json({ success: true, points: normalized.points, subscriptionDays: normalized.subscriptionDays });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/user/:chatId/package', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { points, subscriptionDays } = req.body;
        
        const data = await loadLocalSubscriptions();
        const chatIdStr = chatId.toString();
        
        if (!data.subscriptions[chatIdStr]) {
            data.subscriptions[chatIdStr] = {
                points: 0,
                subscriptionDays: 0,
                subscriptionExpires: null,
                username: null,
                reports: [],
                updatedAt: new Date().toISOString()
            };
        }
        
        const userSub = data.subscriptions[chatIdStr];
        const normalized = normalizeSubscription(userSub);
        
        if (subscriptionDays > 0) {
            const now = new Date();
            const baseDate = normalized.subscriptionExpires ? new Date(normalized.subscriptionExpires) : now;
            const start = baseDate > now ? baseDate : now;
            const expires = new Date(start.getTime() + subscriptionDays * 24 * 60 * 60 * 1000);
            normalized.subscriptionExpires = expires.toISOString();
            normalized.subscriptionDays = getDaysRemaining(normalized.subscriptionExpires);
        }
        
        normalized.points = (normalized.points || 0) + (points || 0);
        normalized.updatedAt = new Date().toISOString();
        
        await saveLocalSubscriptions(data);
        res.json({ success: true, points: normalized.points, subscriptionDays: normalized.subscriptionDays });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Save Report
app.post('/api/report/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const reportData = req.body.report;
        const chatIdStr = chatId.toString();
        
        await withDbLock(async () => {
            const data = await loadLocalSubscriptions();
            if (!data.subscriptions[chatIdStr]) {
                return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
            }
            
            const userSub = data.subscriptions[chatIdStr];
            const normalized = normalizeSubscription(userSub);
            
            if (normalized.status === 'suspended') {
                return res.status(403).json({ success: false, error: '❌ حسابك موقوف مؤقتاً. يرجى التواصل مع الإدارة.' });
            }
            if (normalized.status === 'cancelled') {
                return res.status(403).json({ success: false, error: '❌ اشتراكك ملغي. يرجى التواصل مع الإدارة.' });
            }
            
            if (!userSub.reports) {
                userSub.reports = [];
            }
            
            const index = userSub.reports.findIndex(r => r.id === reportData.id);
            const isUpdate = (index >= 0);
            
            if (isUpdate) {
                const existingReport = userSub.reports[index];
                if (existingReport.issueDate) {
                    const issueDateObj = new Date(existingReport.issueDate);
                    const now = new Date();
                    if ((now - issueDateObj) > (2 * 24 * 60 * 60 * 1000)) {
                        return res.status(403).json({ success: false, error: 'لا يمكن تعديل التقرير بعد مرور يومين من تاريخ إصداره.' });
                    }
                }
            }
            
            // PAYMENT-SOURCE AWARE GATE (consistent with /api/generate-native-pdf):
            // - مصدر «نقاط»: كل تقرير جديد يخصم 5 نقاط
            // - مصدر «غير محدود»: يغطيها الاشتراك النشط
            const paySource = resolvePaySource(userSub);
            if (!isUpdate) {
                if (paySource === 'points') {
                    if ((userSub.points || 0) < REPORT_COST_POINTS) {
                        return res.status(403).json({ success: false, error: `عذراً، رصيدك غير كافٍ. تحتاج ${REPORT_COST_POINTS} نقاط لإصدار تقرير جديد.` });
                    }
                    const prevPts = userSub.points || 0;
                    userSub.points = prevPts - REPORT_COST_POINTS;
                    userSub.balance_points = userSub.points;
                    logTransaction(data, {
                        admin_chat_id: 'system',
                        target_chat_id: chatIdStr,
                        operation: 'report_deduction',
                        amount: REPORT_COST_POINTS,
                        previous_value: prevPts,
                        new_value: userSub.points,
                        details: `خصم ${REPORT_COST_POINTS} نقاط لإصدار تقرير ${reportData.id || ''}`
                    });
                } else {
                    if ((userSub.subscriptionDays || 0) <= 0) {
                        if (paySource === 'none') {
                            return res.status(403).json({ success: false, error: '❌ لا يوجد اشتراك أو رصيد فعّال على حسابك. يرجى التواصل مع المالك لمنحك نقاطاً أو اشتراكاً.' });
                        }
                        return res.status(403).json({ success: false, error: '❌ انتهت صلاحية اشتراكك. يرجى التجديد لإصدار التقارير.' });
                    }
                    logTransaction(data, {
                        admin_chat_id: 'system',
                        target_chat_id: chatIdStr,
                        operation: 'report_created',
                        amount: 0,
                        new_value: 'unlimited',
                        details: `إصدار تقرير ${reportData.id || ''} (اشتراك غير محدود)`
                    });
                }
            }
            
            if (isUpdate) {
                userSub.reports[index] = reportData;
            } else {
                userSub.reports.push(reportData);
            }
            
            userSub.updatedAt = new Date().toISOString();
            await saveLocalSubscriptions(data);
            
            // Data preservation: نسخة دائمة من التقرير في الأرشيف المحمي (لا تُحذف بإجراءات الأدمن)
            await archiveReport(chatIdStr, reportData);
            
            res.json({ success: true, points: userSub.points });
        });
    } catch (err) {
        if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
    }
});

// 4. Delete Report (حذف المستخدم لتقريره عمداً — يُحذف من السجل ومن الأرشيف معاً)
app.delete('/api/report/:chatId/:id', async (req, res) => {
    try {
        const { chatId, id } = req.params;
        const data = await loadLocalSubscriptions();
        const chatIdStr = chatId.toString();
        
        if (data.subscriptions[chatIdStr] && data.subscriptions[chatIdStr].reports) {
            data.subscriptions[chatIdStr].reports = data.subscriptions[chatIdStr].reports.filter(r => r.id !== id);
            await unarchiveReport(chatIdStr, id);
            data.subscriptions[chatIdStr].updatedAt = new Date().toISOString();
            await saveLocalSubscriptions(data);
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Report not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const appLogs = [];
function addLog(msg) {
    appLogs.push(`[${new Date().toISOString()}] ${msg}`);
    if (appLogs.length > 50) appLogs.shift();
    console.log(msg);
}

// 5. Send PDF via Telegram
app.post('/api/send-pdf', async (req, res) => {
    try {
        const { chatId, pdfBase64, filename, reportId } = req.body;
        addLog(`send-pdf called for chatId: ${chatId}, pdf length: ${pdfBase64 ? pdfBase64.length : 0}`);
        
        if (!chatId || !pdfBase64) {
            addLog('Missing chatId or pdfBase64');
            return res.status(400).json({ success: false, error: 'Missing chatId or pdf content' });
        }

        const pdfBuffer = Buffer.from(pdfBase64.split('base64,')[1], 'base64');
        addLog(`Buffer created, size: ${pdfBuffer.length} bytes`);
        
        // Send document via Telegram Bot
        const message = await bot.sendDocument(chatId, pdfBuffer, {
            caption: '📄 تقرير الإجازة المرضية الخاص بك'
        }, {
            filename: filename || 'sickLeaves.pdf',
            contentType: 'application/pdf'
        });
        
        addLog(`Telegram sent doc successfully. fileId: ${message.document?.file_id}`);

        const fileId = message.document?.file_id;
        
        if (fileId && reportId) {
            const data = await loadLocalSubscriptions();
            const userSub = data.subscriptions[chatId.toString()];
            if (userSub && userSub.reports) {
                const report = userSub.reports.find(r => r.id === reportId);
                if (report) {
                    report.fileId = fileId;
                    userSub.updatedAt = new Date().toISOString();
                    await saveLocalSubscriptions(data);
                }
            }
            
            // Forward to channel for backup if channel ID is defined
            if (CHANNEL_ID) {
                try {
                    await bot.sendDocument(CHANNEL_ID, fileId);
                } catch (err) {
                    addLog('Could not forward to Telegram Channel: ' + err.message);
                }
            }
        }

        res.json({ success: true, fileId });
    } catch (err) {
        addLog(`Error sending PDF: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 6. Generate Native PDF via Puppeteer
app.post('/api/generate-native-pdf', async (req, res) => {
    let browser = null;
    try {
        const { chatId, reportData, filename, reportId, trial } = req.body;
        addLog(`generate-native-pdf called for chatId: ${chatId}`);
        
        if (!chatId || !reportData) {
            return res.status(400).json({ success: false, error: 'Missing chatId or reportData' });
        }
        
        // --- STRICT BLOCKING LOGIC ---
        const data = await loadLocalSubscriptions();
        const chatIdStr = chatId.toString();
        if (!data.subscriptions[chatIdStr]) {
            return res.status(403).json({ success: false, error: '❌ حسابك غير موجود. يرجى تفعيل الاشتراك من البوت.' });
        }
        const userSub = data.subscriptions[chatIdStr];
        const normalized = normalizeSubscription(userSub);
        
        if (normalized.status === 'suspended') {
            return res.status(403).json({ success: false, error: '❌ تم إيقاف حسابك مؤقتاً. يرجى التواصل مع الإدارة.' });
        }
        if (normalized.status === 'cancelled') {
            return res.status(403).json({ success: false, error: '❌ تم إلغاء اشتراكك. يرجى التواصل مع الإدارة لإعادة التفعيل.' });
        }
        
        // Determine if it's an update
        let isUpdate = false;
        if (userSub.reports && reportId) {
            isUpdate = userSub.reports.some(r => r.id === reportId || r.id === reportData.id);
        }
        
        // PAYMENT-SOURCE AWARE GATE (آلية المصدر مع تحكم الإدارة):
        // - مصدر «نقاط»: كل تقرير جديد يكلّف 5 نقاط — لا يُصدر بدون رصيد كافٍ
        // - مصدر «غير محدود»: يغطيها الاشتراك النشط (الأيام المتبقية > 0)
        // - trial=true: عينة مجانية مائية — تتجاوز بوابة الرصيد، مرة واحدة لكل حساب
        const paySrc = resolvePaySource(userSub);
        const isTrial = trial === true || trial === 'true';
        if (!isUpdate) {
            if (isTrial) {
                if (userSub.trialUsed) {
                    return res.status(403).json({ success: false, error: '🧪 لقد استخدمت تجربتك المجانية بالفعل. للحصول على تقارير رسمية يرجى طلب الاشتراك.' });
                }
            } else if (paySrc === 'points') {
                if ((userSub.points || 0) < REPORT_COST_POINTS) {
                    return res.status(403).json({ success: false, error: `❌ عذراً، رصيدك غير كافٍ. تحتاج إلى ${REPORT_COST_POINTS} نقاط لإصدار هذا التقرير.` });
                }
            } else if (paySrc === 'none' || (userSub.subscriptionDays || 0) <= 0) {
                if (paySrc === 'none') {
                    return res.status(403).json({ success: false, error: '❌ لا يوجد اشتراك أو رصيد فعّال على حسابك. يرجى التواصل مع المالك لمنحك نقاطاً أو اشتراكاً.' });
                }
                return res.status(403).json({ success: false, error: '❌ عذراً، انتهت صلاحية اشتراكك. يرجى تجديد الاشتراك أولاً لإصدار التقارير.' });
            }
        }
        // -----------------------------


        // Helper: read local image as base64 data URI
        const imgToBase64 = async (filePath) => {
            try {
                const abs = path.join(__dirname, filePath);
                const buf = await fs.readFile(abs);
                const ext = path.extname(filePath).toLowerCase().replace('.', '');
                const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/png';
                return `data:${mime};base64,${buf.toString('base64')}`;
            } catch {
                return '';
            }
        };

        // Pre-load images as base64
        // شعار صحة بالأزرق الرسمي #306db5 (نفس أزرق خيارات/زر أعلى صفحة الاستعلامات)
        const sehaLogo = await imgToBase64('الشعارات/seha_logo_blue.png') || await imgToBase64('الشعارات/seha_logo_clean.png') || await imgToBase64('الشعارات/Seha.png');
        const ksaCalligraphy = await imgToBase64('الشعارات/ksa_emblem_clean.png') || await imgToBase64('الشعارات/ksa_calligraphy.png');
        const mohLogo = await imgToBase64('الشعارات/moh_logo_clean.png') || await imgToBase64('الشعارات/Saudi_Ministry_of_Health.JPG');
        const nhicLogo = await imgToBase64('الشعارات/dfhZfyJM_400x400 (1).jpg');

        const d = reportData;
        let formattedDurationAr = d.durationAr || '';
        if (formattedDurationAr && !formattedDurationAr.includes('<span dir="ltr">')) {
            formattedDurationAr = formattedDurationAr.replace(/(\d{2,4}-\d{2}-\d{2,4})/g, '<span dir="ltr">$1</span>');
        }
        const isCompanion = !!(d.relationAr || d.relationEn || d.type === 'companion' || d.type === 'companion_review');
        const footerMarginTop = '14px';

        // Generate the inquiry QR code LOCALLY (no external API dependency).
        // The old api.qrserver.com call was slow/unreliable from Render and sometimes
        // produced PDFs without the QR code at all.
        let qrDataUrl = '';
        try {
            const qrTarget = `${WEB_APP_URL}/inquiry?id=${d.leaveId || ''}&nin=${d.nationalId || ''}`;
            qrDataUrl = await QRCode.toDataURL(qrTarget, { width: 144, margin: 0, errorCorrectionLevel: 'M' });
        } catch (qrErr) {
            addLog(`QR generation failed (non-fatal): ${qrErr.message}`);
        }

        // Build self-contained HTML matching Sehaty platform exactly
        const html = `<!DOCTYPE html>
<html lang="ar" dir="ltr">
<head>
<meta charset="UTF-8">
</head>
<body>
<style>
  ${EMBEDDED_FONTS_CSS}
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html { background: #fff !important; }
  body { margin: 0; padding: 0; background: #fff !important; width: 794px; height: 1123px; overflow: hidden; direction: ltr; }
  @page { size: 794px 1123px; margin: 0; }
  table { border-spacing: 0; direction: ltr; }
  tr { height: 40px; }
  /* الخطوط من commit 94c2194: عربي = Noto Sans Arabic | إنجليزي/أرقام = Tinos (Times).
     التنسيق النهائي المعتمد من كود seha-sickleave بطلب المالك:
     حدود الجدول 1.4px solid #cccccc | تسميات #154d79 (12.5px إنجليزي / 13.5px عربي)
     قيم #0d2847 (12.5px) | صف المدة خلفية #1F3864 | ارتفاع الصف 40px | حشو 5px 6px
     تظليل الصفوف الزوجية #f7f7f7 | عرض الجدول 724px left:35px أعمدة 150/212/212/150
     عنوان عربي #1a5b8c حجم 21px + إنجليزي 16.5px بخط Times، موضع العنوان top:153px
     فجوة العنوانين 12px (النموذج: فجوة حبر 14px — كانت 20px زائدة)،
     الفاصل العمودي بين الصورتين: طول طبيعي 191px من أعلى صف الفوتر (النماذج:
     190.9px بالضبط)، مزاح يميناً ليستقر عند x=414.8 (النماذج: 414.83) محاذاً
     خط منتصف الجدول — تموضع مطلق حتى لا يدفع الصف السفلي */
  td { font-family: 'Noto Sans Arabic', 'Tajawal', 'Arial', sans-serif; line-height: 1.2; }
  .label-en { border: 1.4px solid #cccccc; padding: 5px 6px; font-weight: bold; color: #154d79; font-size: 12.5px; width: 150px; text-align: center !important; vertical-align: middle !important; font-family: 'Tinos', 'Times New Roman', serif; }
  .label-ar { border: 1.4px solid #cccccc; padding: 5px 6px; font-weight: bold; color: #154d79; font-size: 13.5px; width: 150px; text-align: center !important; vertical-align: middle !important; font-family: 'Noto Sans Arabic', 'Tajawal', sans-serif; }
  .val { border: 1.4px solid #cccccc; padding: 5px 6px; color: #0d2847; font-weight: normal; font-size: 12.5px; text-align: center !important; vertical-align: middle !important; font-family: 'Tinos', 'Times New Roman', 'Noto Sans Arabic', serif; }
  .val[dir="rtl"] { font-family: 'Tinos', 'Noto Sans Arabic', 'Tajawal', serif; }
  .dur-row td { background-color: #1F3864 !important; color: white; border: 1.4px solid #cccccc; padding: 5px 6px; font-size: 12.5px; text-align: center !important; vertical-align: middle !important; font-family: 'Tinos', 'Noto Sans Arabic', serif; }
  .dur-row td.label-ar { font-family: 'Noto Sans Arabic', 'Tajawal', sans-serif; }
  .dur-label { font-weight: bold; }
  tr:nth-child(even) td { background-color: #f7f7f7; }
</style>
<div style="width:794px;height:1123px;background:#fff;font-family:'Noto Sans Arabic','Tajawal','Arial',sans-serif;position:relative;overflow:hidden;direction:ltr;">
  
  <!-- Header: Seha Logo (left) -->
  <img src="${sehaLogo}" style="position:absolute;top:32px;left:38px;width:155px;height:auto;">

  <!-- Header: Geometric graphic (right) -->
  <svg width="195" height="92" viewBox="0 0 408 192" style="position:absolute;top:22px;right:30px;opacity:0.8;">
    <path d="M 0,0 L 44,28 L 56,109 L 91,2 L 116,59 L 56,109 M 56,109 L 113,124 L 116,59 M 116,59 L 154,1 M 116,59 L 229,44 L 327,96 M 116,59 L 201,74 L 327,96 M 113,124 L 201,74 L 229,44 M 213,1 L 229,44 M 241,1 L 327,96 M 324,1 L 327,96 M 327,96 L 386,1 L 404,190 L 327,96" stroke="#9cb1cd" stroke-width="1.6" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>
  
  <!-- Header: KSA Calligraphy (center) -->
  <img src="${ksaCalligraphy}" style="position:absolute;top:68px;left:50%;transform:translateX(-50%);width:190px;height:auto;">
  
  <!-- Header: Arabic & English Titles -->
  <div style="position:absolute;top:153px;left:0;width:794px;text-align:center;">
    <h1 style="color:#1a5b8c;font-size:21px;font-weight:bold;font-family:'Noto Sans Arabic','Tajawal',sans-serif;margin:0 0 12px 0;line-height:1.2;">${d.titleAr || 'تقرير إجازة مرضية'}</h1>
    <h2 style="color:#2c3e77;font-size:16.5px;font-weight:bold;font-family:'Tinos','Times New Roman',Georgia,serif;margin:0;letter-spacing:0.2px;line-height:1.2;">${d.titleEn || 'Sick Leave Report'}</h2>
  </div>

  <!-- Data Table & Footer Container -->
  <div style="position:absolute;top:228px;left:35px;width:724px;">
  <table style="width:100%;border-collapse:collapse;font-size:12.5px;text-align:center;table-layout:fixed;">
    <tr>
      <td class="label-en" style="width:150px;">Leave ID</td>
      <td class="val" colspan="2" style="width:424px; font-family: 'Tinos', 'Times New Roman', serif; white-space: nowrap;">${d.leaveId || ''}</td>
      <td class="label-ar" style="width:150px;">رمز الإجازة</td>
    </tr>
    <tr class="dur-row">
      <td class="dur-label" style="width:150px;">Leave Duration</td>
      <td style="width:212px;">${d.durationEn || ''}</td>
      <td dir="rtl" style="width:212px;">${formattedDurationAr}</td>
      <td class="dur-label" style="width:150px;">مدة الإجازة</td>
    </tr>
    <tr>
      <td class="label-en">Admission Date</td>
      <td class="val">${d.admissionG || ''}</td>
      <td class="val">${d.admissionH || ''}</td>
      <td class="label-ar">تاريخ الدخول</td>
    </tr>
    <tr>
      <td class="label-en">Discharge Date</td>
      <td class="val">${d.dischargeG || ''}</td>
      <td class="val">${d.dischargeH || ''}</td>
      <td class="label-ar">تاريخ الخروج</td>
    </tr>
    <tr>
      <td class="label-en">Issue Date</td>
      <td class="val" colspan="2">${d.issueDate || ''}</td>
      <td class="label-ar">تاريخ إصدار التقرير</td>
    </tr>
    <tr>
      <td class="label-en">${d.nameLabelEn || 'Name'}</td>
      <td class="val">${d.nameEn || ''}</td>
      <td class="val">${d.nameAr || ''}</td>
      <td class="label-ar">${d.nameLabelAr || 'الاسم'}</td>
    </tr>
    <tr>
      <td class="label-en">National ID / Iqama</td>
      <td class="val" colspan="2" style="font-family: 'Tinos', 'Times New Roman', serif; white-space: nowrap;">${d.nationalId || ''}</td>
      <td class="label-ar">رقم الهوية/الاقامه</td>
    </tr>
    <tr>
      <td class="label-en">Nationality</td>
      <td class="val">${d.nationalityEn || 'Saudi Arabia'}</td>
      <td class="val">${d.nationalityAr || 'السعودية'}</td>
      <td class="label-ar">الجنسية</td>
    </tr>
    ${(d.relationEn || d.relationAr) ? `<tr>
      <td class="label-en">Relation</td>
      <td class="val">${d.relationEn || ''}</td>
      <td class="val">${d.relationAr || ''}</td>
      <td class="label-ar">صلة القرابة</td>
    </tr>` : ''}
    <tr>
      <td class="label-en">Employer</td>
      <td class="val">${d.employerEn || ''}</td>
      <td class="val">${d.employerAr || ''}</td>
      <td class="label-ar">جهة العمل</td>
    </tr>
    <tr>
      <td class="label-en">${d.docLabelEn || 'Practitioner Name'}</td>
      <td class="val">${d.doctorEn || ''}</td>
      <td class="val">${d.doctorAr || ''}</td>
      <td class="label-ar">${d.docLabelAr || 'اسم الممارس'}</td>
    </tr>
    <tr>
      <td class="label-en">Position</td>
      <td class="val">${d.positionEn || ''}</td>
      <td class="val">${d.positionAr || ''}</td>
      <td class="label-ar">المسمى الوظيفى</td>
    </tr>
  </table>

  <!-- ===== FOOTER ===== -->
  <div style="margin-top:${footerMarginTop};">
    
    <!-- Top Footer Row: QR/Text | Divider | MOH/Hospital -->
    <div style="display:flex; justify-content:center; align-items:flex-start; min-height:155px; position:relative;">
      
      <!-- Left: QR Code + Text (QR margin-top: 8px, margin-bottom: 20px -> text starts at 100px) -->
      <div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-right:15px;">
        ${qrDataUrl ? `<img src="${qrDataUrl}" style="width:72px;height:72px;margin-top:8px;margin-bottom:20px;">` : `<img src="https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${encodeURIComponent(`${WEB_APP_URL}/inquiry?id=${d.leaveId}&nin=${d.nationalId}`)}" style="width:72px;height:72px;margin-top:8px;margin-bottom:20px;">`}
        <p style="font-size:10px;font-weight:bold;font-family:'Noto Sans Arabic','Tajawal',sans-serif;text-align:center;margin:0 0 4px 0;line-height:1.4;color:#000;">للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة<br>الرسمي</p>
        <p style="font-size:8px;color:#000;text-align:center;margin:0 0 3px 0;font-weight:bold;font-family:'Tinos','Times New Roman',serif;">To check the report please visit Seha's offical website</p>
        <p style="font-size:9px;text-align:center;margin:0;"><a href="${WEB_APP_URL}/inquiry?id=${d.leaveId}&nin=${d.nationalId}" style="color:#0000EE;text-decoration:underline;">www.seha.sa/#/inquiries/slenquiry</a></p>
      </div>

      <!-- Center 1px spacer: preserves exact flex centering of both cells -->
      <div style="width:1px;"></div>

      <!-- Right: MOH Logo (clean cropped, height: 92px, margin-bottom: 8px -> hospital name starts at 100px) -->
      <div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-left:25px;">
        <img src="${d.hospitalLogoBase64 || mohLogo}" style="height:92px;object-fit:contain;margin-bottom:8px;">
        <h3 style="font-size:11px;font-weight:bold;font-family:'Noto Sans Arabic','Tajawal',sans-serif;margin:0 0 4px 0;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">${d.hospitalAr || ''}</h3>
        <h4 style="font-size:9.5px;font-weight:bold;font-family:'Tinos','Times New Roman',serif;margin:0 0 3px 0;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">${d.hospitalEn || ''}</h4>
        ${d.licenseNumber ? `<p style="font-size:13px;font-weight:bold;color:#000;margin:0;">رقم الترخيص : ${d.licenseNumber}</p>` : ''}
      </div>

      <!-- Vertical divider: natural length 191px from footer-row top,
           at x=397 on the page (left:362 within container at 35) aligning the
           table middle line (35 + 724/2). Absolute => does not push the bottom row. -->
      <div style="position:absolute; top:0; left:362px; width:1px; height:191px; background-color:#dddddd;"></div>

    </div>

    <!-- Bottom Footer Row: Time/Date & NHIC Logo (margin-right: -10px aligns NHIC to exact 30px page edge) -->
    <div style="display:flex; justify-content:space-between; align-items:flex-end; padding: 0; margin-top:6px; margin-right:-10px;">
      
      <!-- Left: Time / Date -->
      <div style="font-weight:bold;font-size:11px;color:#000;font-family:'Tinos','Times New Roman',serif;">
        <p style="margin:0 0 10px 0;">${d.time || ''}</p>
        <p style="margin:0;">${d.dayDate || ''}</p>
      </div>

      <!-- Right: NHIC Logo -->
      <div style="display:flex; flex-direction:column; align-items:center;">
        <div style="width: 75px; height: 55px; overflow: hidden; position: relative; margin-bottom: 2px;">
          <img src="${nhicLogo}" style="width: 75px; height: 75px; position: absolute; top: 0; left: 0; object-fit: cover; object-position: top;">
        </div>
        <h4 style="font-size:11.5px; font-weight:bold; font-family:'Noto Sans Arabic','Tajawal',sans-serif; color:#00A99D; margin:0; line-height:1.2; text-align:center;">المركز الوطني للمعلومات الصحية</h4>
        <h5 style="font-size:7px; font-weight:bold; font-family:'Tinos','Times New Roman',serif; color:#1A365D; margin:2px 0 0 0; line-height:1.2; text-align:center; letter-spacing:0.8px;">NATIONAL HEALTH INFORMATION CENTER</h5>
      </div>
      
    </div>
    
  </div>

  ${isTrial ? `
  <!-- TRIAL WATERMARK: عينة مجانية غير رسمية (نفس نمط add_watermark.js) -->
  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-38deg);z-index:100;pointer-events:none;text-align:center;">
    <div style="font-size:96px;font-weight:bold;color:rgba(255,0,0,0.11);white-space:nowrap;font-family:'Noto Sans Arabic','Tajawal',Arial,sans-serif;line-height:1;">تجريبي</div>
    <div style="font-size:30px;font-weight:bold;color:rgba(255,0,0,0.11);white-space:nowrap;font-family:Arial,sans-serif;letter-spacing:6px;margin-top:8px;">SAMPLE — NOT OFFICIAL</div>
  </div>` : ''}

</div>
</body>
</html>`;

        
        // Serialize renders through the queue (Render Free has 512MB RAM; concurrent
        // Chrome instances thrash memory and time out) and use a two-pass render ladder.
        addLog('Queueing PDF render...');
        const pdfResult = await enqueuePdfRender(async () => {
            const chromePath = resolveChromeExecutablePath();
            if (chromePath) addLog(`Using Chrome executable: ${chromePath}`);
            const b = await puppeteer.launch({
                headless: true,
                timeout: 90000,
                executablePath: chromePath,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none']
            });
            try {
                const renderPass = async (waitUntil, timeout, waitImages) => {
                    const page = await b.newPage();
                    try {
                        await page.setContent(html, { waitUntil, timeout });
                        // CRITICAL for correct fonts: explicitly load the Arabic weights
                        // before printing. Waiting only for DOMContentLoaded can capture the
                        // page while the browser is still using a fallback font.
                        await page.evaluate(async () => {
                            await document.fonts.load('400 12px Tajawal');
                            await document.fonts.load('700 12px Tajawal');
                            await document.fonts.load('400 12px "Noto Sans Arabic"');
                            await document.fonts.load('700 12px "Noto Sans Arabic"');
                            await document.fonts.load('400 12px Tinos');
                            await document.fonts.load('700 12px Tinos');
                            await document.fonts.ready;
                        });
                        if (waitImages) {
                            // Belt & suspenders: make sure every <img> finished decoding
                            // (all are inline data-URIs, so this resolves almost instantly,
                            // but it also covers any future remote logo gracefully).
                            await page.evaluate(async () => {
                                const imgs = Array.from(document.images);
                                await Promise.all(imgs.map(img => (img.complete)
                                    ? Promise.resolve()
                                    : new Promise(res => { img.onload = img.onerror = res; })));
                            });
                            await new Promise(r => setTimeout(r, 150));
                        }
                        addLog(`Generating PDF via Puppeteer (waitUntil=${waitUntil})...`);
                        return await page.pdf({
                            printBackground: true,
                            width: '794px',
                            height: '1123px',
                            pageRanges: '1'
                        });
                    } finally {
                        try { await page.close(); } catch (e) {}
                    }
                };
                try {
                    // Pass 1 (primary): wait for the document and embedded fonts.
                    return await renderPass('load', 60000, true);
                } catch (e1) {
                    // Pass 2 (fallback): full network idle, in case a future resource
                    // is remote and needs the network to settle.
                    addLog(`Render pass 1 failed (${e1.message}); retrying with networkidle0`);
                    return await renderPass('networkidle0', 45000, false);
                }
            } finally {
                // ALWAYS close the browser, even on errors. A leaked Chrome process eats
                // RAM on the Render Free plan (512MB) and eventually crashes the service.
                try { await b.close(); } catch (e) {}
            }
        });
        
        // CRITICAL FIX: Puppeteer > v22 returns a Uint8Array instead of a Buffer.
        // node-telegram-bot-api (via request/form-data) attempts to deeply stringify Uint8Array
        // treating it as a standard object, causing 'Maximum call stack size exceeded' and crashing Node!
        // We MUST convert it back to a standard Node Buffer.
        const pdfBuffer = Buffer.isBuffer(pdfResult) ? pdfResult : Buffer.from(pdfResult);

        addLog('Sending PDF to Telegram...');
        const docCaption = isTrial
            ? '🧪 تقرير تجريبي — غير رسمي ولا يُعتمد. للاطلاع فقط.'
            : (d.titleAr ? `📄 ${d.titleAr} الخاص بك` : '📄 تقرير الإجازة المرضية الخاص بك');
        const docFileName = isTrial
            ? 'Trial_Sample.pdf'
            : (filename || (d.type === 'companion' ? 'Patient_Companion_Report.pdf' : (d.type === 'companion_review' ? 'Companion_Attendance_Certificate.pdf' : 'sickLeaves.pdf')));

        // Local-test hook: with the sentinel test token we skip the actual Telegram
        // upload but keep ALL other logic (report persistence, point deduction) intact.
        let sentFileId = null;
        const isLocalTest = process.env.TELEGRAM_BOT_TOKEN === 'TEST_TOKEN_LOCAL';
        if (isLocalTest) {
            addLog('TEST_TOKEN_LOCAL detected: skipping Telegram send (test mode)');
        } else {
            const message = await bot.sendDocument(chatId, pdfBuffer, {
                caption: docCaption
            }, {
                filename: docFileName,
                contentType: 'application/pdf'
            });
            sentFileId = message.document?.file_id || null;
        }
        
        // Persist report into subscriptions.json so inquiry works immediately,
        // and deduct 5 points SERVER-SIDE for brand-new points-based reports.
        // (Fix: the report is saved here before the client calls /api/report/:chatId,
        // which previously made that call see isUpdate=true and skip the deduction entirely.)
        let finalBalance = null;
        let paySourceUsed = null;
        let daysAfterIssuance = null;
        try {
            await withDbLock(async () => {
                const dbData = await loadLocalSubscriptions();
                const uSub = dbData.subscriptions[chatIdStr];
                if (uSub) {
                    if (isTrial) {
                        // Trial: NO report persistence, NO point deduction — only mark the
                        // one-time free trial as consumed (server-side source of truth).
                        uSub.trialUsed = true;
                        uSub.updatedAt = new Date().toISOString();
                        await saveLocalSubscriptions(dbData);
                        return;
                    }
                    if (!uSub.reports) uSub.reports = [];
                    const currentRepId = reportId || d.leaveId;
                    const rIdx = uSub.reports.findIndex(r => r.id === currentRepId);
                    const repObj = {
                        id: currentRepId,
                        patientName: d.nameAr || d.patient_name_ar || ((d.type === 'companion' || d.type === 'companion_review') ? d.escort_name_ar : ''),
                        type: d.type || 'sick',
                        issueDate: d.issueDate || d.issue_date || new Date().toISOString().slice(0, 10),
                        data: {
                            admission_date: d.startDate || d.admission_date,
                            discharge_date: d.endDate || d.discharge_date,
                            duration: d.duration || '1',
                            issue_date: d.issueDate || d.issue_date,
                            issue_time: d.issueTime || d.issue_time,
                            national_id: d.nationalId || d.national_id,
                            patient_name_ar: d.nameAr || d.patient_name_ar,
                            patient_name_en: d.nameEn || d.patient_name_en,
                            escort_name_ar: d.escort_name_ar || '',
                            escort_name_en: d.escort_name_en || '',
                            relation_ar: d.relation_ar || '',
                            relation_en: d.relation_en || '',
                            doctor_name_ar: d.docNameAr || d.doctor_name_ar,
                            doctor_name_en: d.docNameEn || d.doctor_name_en,
                            job_title_ar: d.positionAr || d.job_title_ar,
                            job_title_en: d.positionEn || d.job_title_en,
                            hospital_ar: d.hospitalAr || d.hospital_ar,
                            hospital_en: d.hospitalEn || d.hospital_en,
                            hospital_type: d.hospitalType || d.hospital_type,
                            license_number: d.licenseNumber || d.license_number
                        }
                    };
                    if (rIdx >= 0) {
                        uSub.reports[rIdx] = repObj;
                    } else {
                        uSub.reports.push(repObj);
                    }

                    // Server-side point deduction for NEW reports (single source of truth).
                    // آلية المصدر: كل تقرير جديد يخصم 5 نقاط عندما يكون مصدر الدفع «نقاط»؛
                    // التعديل خلال نافذة اليومين مجاني. resolvePaySource تقرأ ما شحنه الأدمن فعلياً.
                    normalizeSubscription(uSub);
                    const paySrcNow = resolvePaySource(uSub);
                    paySourceUsed = paySrcNow;
                    if (rIdx < 0 && paySrcNow === 'points') {
                        if ((uSub.points || 0) >= REPORT_COST_POINTS) {
                            const prevPts = uSub.points || 0;
                            uSub.points = prevPts - REPORT_COST_POINTS;
                            uSub.balance_points = uSub.points;
                            logTransaction(dbData, {
                                admin_chat_id: 'system',
                                target_chat_id: chatIdStr,
                                operation: 'report_deduction',
                                amount: REPORT_COST_POINTS,
                                previous_value: prevPts,
                                new_value: uSub.points,
                                details: `خصم ${REPORT_COST_POINTS} نقاط عند إصدار التقرير ${currentRepId} (generate-native-pdf)`
                            });
                        }
                    }
                    finalBalance = (uSub.points != null) ? uSub.points : null;
                    daysAfterIssuance = uSub.subscriptionDays || 0;

                    uSub.updatedAt = new Date().toISOString();
                    await saveLocalSubscriptions(dbData);
                }
            });
        } catch (saveErr) {
            console.error('Error auto-saving report in generate-native-pdf:', saveErr.message);
        }

        // إشعار الرصيد بعد كل إصدار رسمي: كم تبقى له نقاط (أو أيام الاشتراك غير المحدود)
        let notificationText = null;
        if (!isTrial) {
            const title = d.titleAr || 'تقرير';
            if (paySourceUsed === 'points') {
                notificationText = [
                    '🔔 إشعار رصيد',
                    `✅ تم إصدار «${title}» بنجاح.`,
                    `🧾 خُصمت ${REPORT_COST_POINTS} نقاط لإصدار التقرير.`,
                    `🌑 رصيدك المتبقي: ${finalBalance != null ? finalBalance : 0} نقطة.`
                ].join('\n');
            } else {
                notificationText = [
                    '🔔 إشعار',
                    `✅ تم إصدار «${title}» بنجاح.`,
                    `♾️ اشتراك غير محدود — الأيام المتبقية: ${daysAfterIssuance != null ? daysAfterIssuance : 0} يوم.`
                ].join('\n');
            }
            if (!isLocalTest) {
                bot.sendMessage(chatId, notificationText).catch(e => console.warn('Could not send balance notification:', e.message));
            }
        }

        if (isLocalTest) {
            return res.json({
                success: true,
                testMode: true,
                reportId: reportId,
                points: finalBalance,
                paySource: paySourceUsed,
                subscriptionDays: daysAfterIssuance,
                notificationText: notificationText || undefined,
                fileId: null,
                pdfBase64: pdfBuffer.toString('base64'),
                filename: docFileName,
                trial: isTrial || undefined,
                trialUsed: isTrial ? true : undefined
            });
        }

        res.json({ success: true, fileId: sentFileId, reportId: reportId, points: finalBalance, paySource: paySourceUsed, subscriptionDays: daysAfterIssuance, trial: isTrial || undefined, trialUsed: isTrial ? true : undefined });

    } catch (err) {
        // Safety net: never leak a Chrome process on unexpected failures.
        if (browser) {
            try { await browser.close(); } catch (e) {}
        }
        addLog(`Error generating HTML for PDF: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 6.5 Send Client-Generated PDF
app.post('/api/send-generated-pdf', async (req, res) => {
    try {
        const { chatId, pdfBase64, filename, reportId } = req.body;
        if (!chatId || !pdfBase64) return res.status(400).json({ error: 'Missing data' });
        
        const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',').pop() : pdfBase64;
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        
        const message = await bot.sendDocument(chatId, pdfBuffer, {
            caption: '📄 تقرير الإجازة المرضية الخاص بك'
        }, {
            filename: filename || 'sickLeaves.pdf',
            contentType: 'application/pdf'
        });
        
        addLog(`Telegram sent generated doc successfully. fileId: ${message.document?.file_id}`);
        const fileId = message.document?.file_id;
        
        if (fileId && reportId) {
            const data = await loadLocalSubscriptions();
            const userSub = data.subscriptions[chatId.toString()];
            if (userSub && userSub.reports) {
                const report = userSub.reports.find(r => r.id === reportId);
                if (report) {
                    report.fileId = fileId;
                    userSub.updatedAt = new Date().toISOString();
                    await saveLocalSubscriptions(data);
                }
            }
            
            if (typeof CHANNEL_ID !== 'undefined' && CHANNEL_ID) {
                try {
                    await bot.sendDocument(CHANNEL_ID, fileId);
                } catch (err) {
                    addLog('Could not forward to Telegram Channel: ' + err.message);
                }
            }
        }
        
        res.json({ success: true, fileId });
    } catch (err) {
        console.error('Error sending generated PDF:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/logs', (req, res) => {
    if (req.query.msg) {
        addLog(`CLIENT LOG: ${req.query.msg}`);
    }
    res.json(appLogs);
});


// 6. Send Existing PDF via file_id
app.post('/api/send-existing-pdf', async (req, res) => {
    try {
        const { chatId, reportId } = req.body;
        const data = await loadLocalSubscriptions();
        const userSub = data.subscriptions[chatId.toString()];
        if (!userSub || !userSub.reports) {
            return res.status(404).json({ success: false, error: 'User or reports not found' });
        }
        
        const report = userSub.reports.find(r => r.id === reportId);
        if (!report) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }
        
        if (!report.fileId) {
            return res.status(400).json({ success: false, error: 'No PDF generated for this report yet.' });
        }
        
        await bot.sendDocument(chatId, report.fileId);
        res.json({ success: true });
    } catch (err) {
        console.error('Error sending existing PDF:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 7. Public Verify Endpoint
app.get('/api/verify', async (req, res) => {
    try {
        const { id, nid } = req.query;
        const data = await loadLocalSubscriptions();
        
        let foundReport = null;
        for (const user of Object.values(data.subscriptions)) {
            if (user.reports) {
                const report = user.reports.find(r => r.id === id && r.nationalId === nid);
                if (report) {
                    foundReport = report;
                    break;
                }
            }
        }
        
        if (foundReport) {
            res.json({ success: true, report: foundReport });
        } else {
            res.json({ success: false, error: 'Not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Health check endpoint (required by Render healthCheckPath)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', fonts: FONT_MODE, printQueue: pdfQueueLength, githubSync: GITHUB_SYNC_ENABLED && !!githubSyncToken });
});

// Ensure SPA routes always return index.html instead of Not Found
app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith(`/webhook/${TOKEN}`)) {
        return res.status(404).json({ success: false, error: 'Route not found' });
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Set Telegram Chat Menu Button (Open button)
const configureChatMenuButton = async (targetChatId = null) => {
    try {
        const https = require('https');
        const sendReq = (chatIdVal = null) => {
            const bodyObj = {
                menu_button: {
                    type: 'web_app',
                    text: 'Open', web_app: { url: WEB_APP_URL_CACHED }
                }
            };
            if (chatIdVal) {
                bodyObj.chat_id = chatIdVal.toString();
            }
            const payload = JSON.stringify(bodyObj);

            return new Promise((resolve) => {
                const req = https.request({
                    hostname: 'api.telegram.org',
                    path: `/bot${TOKEN}/setChatMenuButton`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload)
                    }
                }, (res) => {
                    let body = '';
                    res.on('data', chunk => body += chunk);
                    res.on('end', () => {
                        try {
                            const parsed = JSON.parse(body);
                            if (parsed.ok) {
                                console.log(`✓ Bot Menu Button "Open" set to: ${WEB_APP_URL}${chatIdVal ? ' for chat ' + chatIdVal : ' (default)'}`);
                            }
                        } catch (e) {}
                        resolve();
                    });
                });
                req.on('error', resolve);
                req.write(payload);
                req.end();
            });
        };

        if (targetChatId) {
            await sendReq(targetChatId);
        }
        await sendReq(null);
    } catch (e) {
        console.warn('Could not set ChatMenuButton:', e.message);
    }
};

// Start Server
const startServer = async () => {
    try {
        // Initialize subscriptions.json + reports_archive.json ( Permanent Data Preservation )
        // First run after each deploy: /tmp is empty on Render → seed the LATEST data from GitHub,
        // else fall back to the copy deployed with the repo — data never resets anymore.
        await seedDataFile(subscriptionsPath, 'subscriptions.json');
        await seedDataFile(reportsArchivePath, 'reports_archive.json');
        try {
            await fs.access(subscriptionsPath);
        } catch (e) {
            await fs.writeFile(subscriptionsPath, JSON.stringify({ subscriptions: {} }, null, 2), 'utf-8');
            console.log('✓ Created local subscriptions.json database');
        }

        // Configure Webhook if in Production (Render)
        if (isProduction) {
            const webhookUrl = `${WEB_APP_URL}/webhook/${TOKEN}`;
            // Resilient webhook setup: a transient Telegram failure must NOT kill the service
            // (health endpoint stays up for Render; webhook is retried automatically).
            const setupWebhook = async () => {
                try {
                    await bot.setWebHook(webhookUrl);
                    console.log(`✓ Webhook set to: ${webhookUrl}`);
                } catch (e) {
                    console.error(`⚠️ setWebHook failed (${e.message}) — retrying in 30s`);
                    setTimeout(setupWebhook, 30000);
                }
            };
            await setupWebhook();
            
            app.post(`/webhook/${TOKEN}`, (req, res) => {
                bot.processUpdate(req.body);
                res.sendStatus(200);
            });
        }

        // Configure Open button with the correct Render URL
        await configureChatMenuButton();

        
        // Ensure Puppeteer Chrome is installed on Render
        if (process.env.NODE_ENV !== 'test') {
            try {
                console.log('Checking and installing Puppeteer Chrome if missing...');
                const { execSync } = require('child_process');
                execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
                console.log('Chrome installation verified.');
            } catch (err) {
                console.error('Failed to ensure Chrome:', err.message);
            }
        }

        return new Promise((resolve) => {
            const srv = app.listen(PORT, () => {
                console.log(`\n=== SEHA Sick Leave App ===`);
                console.log(`✓ Server running at http://localhost:${PORT}`);
                console.log(`✓ WEB_APP_URL = ${WEB_APP_URL}`);
                console.log(`✓ Bot mode: ${isProduction ? 'Webhook (Production/Render)' : 'Polling (Local)'}`);
                console.log(`✓ Database: Local subscriptions.json\n`);
                resolve(srv);
            });
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

// Manual setup endpoint - visit /setup to re-configure webhook & menu button (admin use)
app.get('/setup', async (req, res) => {
    try {
        await configureChatMenuButton();
        if (isProduction) {
            const webhookUrl = `${WEB_APP_URL}/webhook/${TOKEN}`;
            await bot.setWebHook(webhookUrl);
            res.json({
                success: true,
                message: `Webhook and Menu Button configured successfully`,
                webhookUrl,
                webAppUrl: WEB_APP_URL_CACHED
            });
        } else {
            res.json({
                success: true,
                message: 'Menu Button configured (local polling mode)',
                webAppUrl: WEB_APP_URL_CACHED
            });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Start server and bootstrap Owner
const reconcileArchivedReports = async () => {
    return withDbLock(async () => {
        try {
            const archive = await readArchiveAnySource();
            const chatIds = Object.keys(archive.reports || {});
            if (!chatIds.length) return;
            const data = await loadLocalSubscriptions();
            let totalRestored = 0;
            for (const cid of chatIds) {
                const user = data.subscriptions[cid];
                if (!user) continue; // سجل محذوف كلياً → تُستعاد تقاريره تلقائياً عند أول فتح له (findSubscription)
                totalRestored += await restoreReportsFromArchive(cid, user);
            }
            if (totalRestored > 0) {
                await saveLocalSubscriptions(data);
                console.log(`♻️ [data-preserve] Startup reconciliation restored ${totalRestored} report(s) in total`);
            }
        } catch (e) {
            console.error('reconcileArchivedReports error:', e.message);
        }
    });
};

const serverPromise = startServer().then(async (srv) => {
    try {
        await bootstrapOwnerAccount();
    } catch (e) {
        console.error('Owner bootstrap error:', e.message);
    }
    try {
        await enforceOwnerGrantModel();
    } catch (e) {
        console.error('Owner grant model error:', e.message);
    }
    try {
        await restoreActiveSubscribers();
    } catch (e) {
        console.error('Restore active subscribers error:', e.message);
    }
    try {
        await reconcileArchivedReports();
    } catch (e) {
        console.error('Archive reconciliation error:', e.message);
    }
    return srv;
});

module.exports = { app, startServer, serverPromise, bootstrapOwnerAccount, enforceOwnerGrantModel, restoreActiveSubscribers };

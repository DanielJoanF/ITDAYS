/**
 * Vercel Serverless Function — /api/submit-registration
 *
 * Tugasnya HANYA verifikasi keamanan (tidak forward payload ke Google):
 * 1. Cek honeypot field
 * 2. Rate limiting per IP
 * 3. Verifikasi token reCAPTCHA v3 ke Google API
 *
 * Jika semua lolos → return { ok: true }
 * Client kemudian submit payload (dengan file) langsung ke Google Apps Script.
 *
 * Alasan arsitektur ini:
 * File base64 bisa mencapai ~13MB (dua file 5MB), melebihi limit Vercel Free (4.5MB).
 * Dengan memisahkan verifikasi dan pengiriman data, kita menghindari 413 error.
 */

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const MIN_RECAPTCHA_SCORE = 0.5;

// ─── In-memory rate limiter ────────────────────────────────────────────────────
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  if (!record) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) return true;
  record.count++;
  return false;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitStore.entries()) {
    if (now > val.resetAt) rateLimitStore.delete(key);
  }
}, 10 * 60 * 1000);

// ─── Verifikasi reCAPTCHA token ────────────────────────────────────────────────
async function verifyRecaptcha(token) {
  if (!RECAPTCHA_SECRET_KEY) {
    console.error('[SECURITY] RECAPTCHA_SECRET_KEY tidak dikonfigurasi di Vercel env.');
    return { success: false, score: 0, error: 'misconfigured' };
  }
  const params = new URLSearchParams({ secret: RECAPTCHA_SECRET_KEY, response: token });
  try {
    const res = await fetch(`${RECAPTCHA_VERIFY_URL}?${params.toString()}`, { method: 'POST' });
    const data = await res.json();
    return {
      success: data.success,
      score: data.score ?? 0,
      action: data.action,
      errorCodes: data['error-codes'],
    };
  } catch (err) {
    console.error('[SECURITY] Gagal menghubungi reCAPTCHA API:', err);
    return { success: false, score: 0, error: 'network_error' };
  }
}

// ─── Main Handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Bungkus seluruh handler dalam try-catch agar tidak ada 500 yang lolos
  try {
    // CORS
    const allowedOrigins = [
      'https://itdays-usd.com',
      'https://www.itdays-usd.com',
      /^https:\/\/itdays.*\.vercel\.app$/,
    ];
    const origin = req.headers['origin'] || '';
    const isAllowed = allowedOrigins.some((o) =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    if (isAllowed) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method tidak diizinkan.' });

    // ── Rate limiting ──
    const clientIp =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.socket?.remoteAddress ||
      'unknown';

    if (isRateLimited(clientIp)) {
      console.warn(`[RATE LIMIT] IP ${clientIp} melebihi batas.`);
      return res.status(429).json({ error: 'Terlalu banyak percobaan. Silakan tunggu beberapa menit.' });
    }

    // ── Parse body ──
    // req.body sudah di-parse otomatis oleh Vercel untuk Content-Type: application/json
    const body = req.body;
    if (!body || typeof body !== 'object') {
      console.error('[HANDLER] Body tidak valid atau bukan object:', typeof body);
      return res.status(400).json({ error: 'Request body tidak valid.' });
    }

    // Hanya butuh recaptchaToken dan honeypot — tidak ada payload/files di sini
    const { recaptchaToken, honeypot } = body;

    // ── Honeypot check ──
    if (honeypot) {
      console.warn(`[BOT DETECTED] Honeypot terisi dari IP ${clientIp}.`);
      return res.status(200).json({ ok: true }); // Palsu, biar bot tidak tahu
    }

    // ── Validasi token ada ──
    if (!recaptchaToken || typeof recaptchaToken !== 'string' || recaptchaToken.length < 10) {
      console.warn(`[SECURITY] Token tidak valid dari IP ${clientIp}. Token: ${String(recaptchaToken).slice(0, 20)}...`);
      return res.status(400).json({ error: 'Token keamanan tidak ditemukan atau tidak valid.' });
    }

    // ── Verifikasi reCAPTCHA v3 ──
    const captchaResult = await verifyRecaptcha(recaptchaToken);
    console.info(`[RECAPTCHA] IP ${clientIp} — success: ${captchaResult.success}, score: ${captchaResult.score}, errors: ${JSON.stringify(captchaResult.errorCodes)}`);

    if (!captchaResult.success || captchaResult.score < MIN_RECAPTCHA_SCORE) {
      return res.status(403).json({
        error: 'Verifikasi keamanan gagal. Silakan refresh halaman dan coba lagi.',
      });
    }

    // ── Semua lolos ──
    return res.status(200).json({ ok: true });

  } catch (unexpectedErr) {
    // Tangkap semua error tidak terduga agar tidak menjadi 500 yang tidak informatif
    console.error('[HANDLER] Unexpected error:', unexpectedErr?.message, unexpectedErr?.stack);
    return res.status(500).json({ error: 'Terjadi kesalahan server. Silakan coba lagi.' });
  }
}

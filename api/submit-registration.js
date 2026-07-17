/**
 * Vercel Serverless Function — /api/submit-registration
 *
 * Middleware keamanan antara browser dan Google Apps Script:
 * 1. Cek honeypot field (anti-bot sederhana)
 * 2. Verifikasi token reCAPTCHA v3 ke Google API
 * 3. Tolak jika skor < 0.5 (kemungkinan bot)
 * 4. Rate limiting sederhana per IP via header
 * 5. Forward payload ke Google Apps Script jika lolos semua pengecekan
 */

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

// Skor minimum reCAPTCHA yang diterima (0.0 = bot pasti, 1.0 = manusia pasti)
const MIN_RECAPTCHA_SCORE = 0.5;

// ─── In-memory rate limiter (simple, per-process) ─────────────────────────────
// Catatan: Untuk production skala besar, gunakan Upstash Redis.
// Ini sudah cukup untuk event scale ITDAYS.
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 menit
const RATE_LIMIT_MAX_REQUESTS = 5;       // maks 5 submit per IP per menit

function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (now > record.resetAt) {
    // Window sudah reset
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  record.count++;
  return false;
}

// Bersihkan store lama setiap 10 menit untuk mencegah memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitStore.entries()) {
    if (now > val.resetAt) rateLimitStore.delete(key);
  }
}, 10 * 60 * 1000);

// ─── Verifikasi reCAPTCHA token ke Google ─────────────────────────────────────
async function verifyRecaptcha(token) {
  if (!RECAPTCHA_SECRET_KEY) {
    console.error('[SECURITY] RECAPTCHA_SECRET_KEY belum dikonfigurasi di environment.');
    return { success: false, score: 0, error: 'misconfigured' };
  }

  const params = new URLSearchParams({
    secret: RECAPTCHA_SECRET_KEY,
    response: token,
  });

  try {
    const res = await fetch(`${RECAPTCHA_VERIFY_URL}?${params.toString()}`, {
      method: 'POST',
    });
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
  // CORS — hanya izinkan dari domain sendiri
  const allowedOrigins = [
    'https://itdays-usd.com',
    'https://www.itdays-usd.com',
    // Izinkan preview deployment Vercel (untuk testing)
    /^https:\/\/itdays.*\.vercel\.app$/,
  ];

  const origin = req.headers['origin'] || '';
  const isAllowed = allowedOrigins.some((o) =>
    typeof o === 'string' ? o === origin : o.test(origin)
  );

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Hanya terima POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  // ── Cek environment configuration ──
  if (!GOOGLE_SCRIPT_URL) {
    console.error('[CONFIG] GOOGLE_SCRIPT_URL belum dikonfigurasi.');
    return res.status(500).json({ error: 'Server misconfigured.' });
  }

  // ── Rate limiting berdasarkan IP ──
  const clientIp =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown';

  if (isRateLimited(clientIp)) {
    console.warn(`[RATE LIMIT] IP ${clientIp} melebihi batas request.`);
    return res.status(429).json({
      error: 'Terlalu banyak percobaan. Silakan tunggu beberapa menit.',
    });
  }

  // ── Parse body ──
  const body = req.body;

  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Request body tidak valid.' });
  }

  const { recaptchaToken, honeypot, payload } = body;

  // ── Honeypot check (Lapisan 3) ──
  // Field ini disembunyikan dari user biasa. Jika terisi, pasti bot.
  if (honeypot) {
    console.warn(`[BOT DETECTED] Honeypot terisi dari IP ${clientIp}. Request ditolak.`);
    // Return 200 palsu agar bot tidak tahu bahwa dia terdeteksi
    return res.status(200).json({ success: true });
  }

  // ── Validasi token reCAPTCHA wajib ada ──
  if (!recaptchaToken || typeof recaptchaToken !== 'string') {
    return res.status(400).json({ error: 'Token keamanan tidak ditemukan.' });
  }

  // ── Verifikasi reCAPTCHA v3 (Lapisan 2) ──
  const captchaResult = await verifyRecaptcha(recaptchaToken);

  if (!captchaResult.success || captchaResult.score < MIN_RECAPTCHA_SCORE) {
    console.warn(
      `[RECAPTCHA] Ditolak dari IP ${clientIp}. Score: ${captchaResult.score}, ` +
      `Success: ${captchaResult.success}, Errors: ${captchaResult.errorCodes}`
    );
    return res.status(403).json({
      error: 'Verifikasi keamanan gagal. Silakan refresh halaman dan coba lagi.',
    });
  }

  console.info(
    `[RECAPTCHA] Lolos dari IP ${clientIp}. Score: ${captchaResult.score}`
  );

  // ── Validasi payload tidak kosong ──
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Data pendaftaran tidak valid.' });
  }

  // ── Forward ke Google Apps Script ──
  try {
    const formBody = new URLSearchParams();
    formBody.append('payload', JSON.stringify(payload));

    const scriptRes = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
      redirect: 'follow',
    });

    // Google Apps Script redirect ke URL lain setelah sukses — ini normal
    if (scriptRes.ok || scriptRes.redirected) {
      return res.status(200).json({ success: true });
    } else {
      console.error('[GOOGLE SCRIPT] Response tidak OK:', scriptRes.status);
      return res.status(502).json({ error: 'Gagal menyimpan data. Coba lagi.' });
    }
  } catch (err) {
    console.error('[GOOGLE SCRIPT] Fetch error:', err);
    return res.status(502).json({ error: 'Gagal menghubungi server. Coba lagi.' });
  }
}

/* global process */
/**
 * Vercel Serverless Function — /api/submit-registration
 *
 * 1. Verifikasi reCAPTCHA v3 token ke Google API
 * 2. Validasi field formulir pendaftaran
 * 3. Forward data ke Google Apps Script backend
 */

export default async function handler(req, res) {
  // CORS Headers
  const origin = req.headers['origin'] || '';
  const allowedOrigins = ['https://itdays-usd.com', 'https://www.itdays-usd.com'];
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.itdays-usd.com');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method tidak diizinkan.' });
  }

  const { recaptchaToken, honeypot, ...formData } = req.body || {};

  // Honeypot check
  if (honeypot) {
    console.warn('[SECURITY] Honeypot field filled.');
    return res.status(200).json({ success: true, message: 'Pendaftaran berhasil.' });
  }

  // Verify reCAPTCHA token present
  if (!recaptchaToken) {
    return res.status(400).json({ error: 'Token keamanan tidak ditemukan.' });
  }

  const secret = process.env.RECAPTCHA_SECRET || process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error('[SECURITY] Secret key reCAPTCHA tidak terkonfigurasi di Vercel env.');
    return res.status(500).json({ error: 'Konfigurasi server belum lengkap.' });
  }

  // Verify token via Google API
  try {
    const recaptchaRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: recaptchaToken,
      }),
    });

    const recaptchaData = await recaptchaRes.json();
    if (!recaptchaData.success || (recaptchaData.score !== undefined && recaptchaData.score < 0.5)) {
      console.warn('[RECAPTCHA] Verification failed:', recaptchaData);
      return res.status(403).json({ error: 'Verifikasi keamanan gagal. Refresh halaman dan coba lagi.' });
    }

    // Validate required fields if present in body
    const errors = [];
    if (formData.nama !== undefined && !formData.nama?.trim()) errors.push('Nama wajib diisi.');
    if (formData.email !== undefined && !formData.email?.includes('@')) errors.push('Email tidak valid.');
    if (formData.whatsapp !== undefined && !formData.whatsapp?.trim() && !formData.no_hp?.trim()) errors.push('Nomor WhatsApp wajib diisi.');
    if (formData.instansi !== undefined && !formData.instansi?.trim()) errors.push('Instansi wajib diisi.');

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(' ') });
    }

    // Forward to Google Apps Script
    const gasUrl = process.env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxz_I6PqOLzWRvrK-1ECATsDpI8DcyuKu_sbBO8kpMIm_6WndDGNGuMYPTAvy0HdwM/exec';

    const payload = new URLSearchParams();
    payload.append('payload', JSON.stringify({
      ...formData,
      recaptchaToken,
      action: 'registration',
      recaptcha_score: recaptchaData.score ?? 0.9,
    }));

    const gasRes = await fetch(gasUrl, {
      method: 'POST',
      body: payload,
    });

    const gasData = await gasRes.json();
    return res.status(gasData._status || 200).json(gasData);
  } catch (err) {
    console.error('Submit registration error:', err);
    return res.status(502).json({ error: 'Gagal menghubungi server backend.' });
  }
}

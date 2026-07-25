import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getBranchByName } from '../../data/categories';
import Toast from '../Toast/Toast';
import './UploadSection.css';

const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

function executeRecaptcha(action) {
  return new Promise((resolve) => {
    if (!window.grecaptcha || !RECAPTCHA_SITE_KEY) {
      console.warn('[reCAPTCHA] grecaptcha belum siap atau SITE_KEY belum dikonfigurasi.');
      resolve(null);
      return;
    }
    window.grecaptcha.ready(() => {
      window.grecaptcha
        .execute(RECAPTCHA_SITE_KEY, { action })
        .then(resolve)
        .catch((err) => {
          console.error('[reCAPTCHA] Gagal execute:', err);
          resolve(null);
        });
    });
  });
}

export default function UploadSection() {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const initialCabang = searchParams.get('cabang') || '';

  const [inputEmail, setInputEmail] = useState(initialEmail);
  const [participantData, setParticipantData] = useState(null); // { email, nama, cabang, fields }
  
  // Status: 'verify_email' | 'loading' | 'allowed' | 'denied' | 'success' | 'error'
  const [status, setStatus] = useState(initialEmail ? 'loading' : 'verify_email');
  const [reason, setReason] = useState('');
  const [formData, setFormData] = useState({});
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  }, []);

  // Check email eligibility function
  const checkEmailEligibility = useCallback(async (targetEmail, targetCabang = '') => {
    if (!targetEmail || !targetEmail.trim()) {
      showToast('Masukkan alamat email Anda yang terdaftar.', 'error');
      return;
    }

    if (!GOOGLE_SCRIPT_URL) {
      setStatus('error');
      setReason('Konfigurasi URL Backend (VITE_GOOGLE_SCRIPT_URL) belum diatur.');
      return;
    }

    setIsCheckingEmail(true);
    setStatus('loading');

    try {
      let url = `${GOOGLE_SCRIPT_URL}?email=${encodeURIComponent(targetEmail.trim())}`;
      if (targetCabang) {
        url += `&cabang=${encodeURIComponent(targetCabang.trim())}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.allowed) {
        setParticipantData({
          email: data.email || targetEmail,
          nama: data.nama || 'Peserta',
          cabang: data.cabang,
          fields: data.fields || [],
        });
        setStatus('allowed');
      } else {
        setStatus('denied');
        setReason(data.reason || 'Email ini tidak memenuhi syarat upload karya.');
      }
    } catch (err) {
      console.error('[UPLOAD] Fetch error:', err);
      setStatus('error');
      setReason('Gagal menghubungi server backend. Silakan periksa koneksi internet Anda dan coba lagi.');
    } finally {
      setIsCheckingEmail(false);
    }
  }, [showToast]);

  // Initial check if URL has query parameters
  useEffect(() => {
    if (initialEmail) {
      Promise.resolve().then(() => {
        checkEmailEligibility(initialEmail, initialCabang);
      });
    }
  }, [initialEmail, initialCabang, checkEmailEligibility]);

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    checkEmailEligibility(inputEmail);
  };

  const handleInputChange = useCallback((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Determine dynamic fields based on branch config
  const branchConfig = useMemo(() => participantData ? getBranchByName(participantData.cabang) : null, [participantData]);
  const uploadFields = useMemo(() => branchConfig?.uploadFields || [], [branchConfig]);

  const handleSubmitKarya = useCallback(async (e) => {
    e.preventDefault();
    if (!participantData) return;

    // Validate inputs
    for (const f of uploadFields) {
      const value = (formData[f.name] || '').trim();
      if (f.required && !value) {
        showToast(`${f.label} wajib diisi.`, 'error');
        return;
      }
      if (value && f.pattern && !f.pattern.test(value)) {
        showToast(f.patternHint || `${f.label} tidak valid.`, 'error');
        return;
      }
    }

    if (!GOOGLE_SCRIPT_URL) {
      showToast('URL backend belum dikonfigurasi.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const recaptchaToken = await executeRecaptcha('upload_karya');

      const payload = {
        action: 'upload',
        recaptchaToken: recaptchaToken || '',
        email: participantData.email,
        cabang: participantData.cabang,
      };

      for (const f of uploadFields) {
        payload[f.name] = (formData[f.name] || '').trim();
      }

      const formBody = new URLSearchParams();
      formBody.append('payload', JSON.stringify(payload));

      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: formBody,
      });

      setStatus('success');
    } catch (err) {
      console.error('[UPLOAD] Submit error:', err);
      showToast('Gagal mengirim karya. Silakan coba lagi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, uploadFields, participantData, showToast]);

  const handleResetSearch = () => {
    setStatus('verify_email');
    setParticipantData(null);
    setFormData({});
    setReason('');
  };

  return (
    <section className="upload-section">
      <div className="upload-container">

        {/* Header */}
        <div className="upload-header">
          <h1 className="upload-title text-display">UPLOAD<br />KARYA</h1>
          <p className="upload-subtitle">
            {status === 'allowed' && participantData
              ? `Pengunggahan karya lomba ${participantData.cabang} atas nama ${participantData.nama}.`
              : 'Verifikasi akun dan upload karya lomba IT Days.'}
          </p>
        </div>

        {/* Step 1: Input & Verifikasi Email */}
        {status === 'verify_email' && (
          <div className="upload-panel glass-panel">
            <h2 className="upload-step-title">Verifikasi Pendaftaran</h2>
            <p className="upload-step-desc">
              Masukkan alamat email yang Anda gunakan saat mendaftar lomba IT Days.
            </p>

            <form onSubmit={handleVerifySubmit} autoComplete="off">
              <div className="field-group">
                <label className="field-label" htmlFor="verify-email">Email Terdaftar</label>
                <input
                  type="email"
                  id="verify-email"
                  className="main-input"
                  placeholder="contoh: nama@email.com"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  required
                />
              </div>

              <div className="upload-controls">
                <button
                  type="submit"
                  className="upload-btn"
                  disabled={isCheckingEmail}
                >
                  {isCheckingEmail ? 'MEMERIKSA...' : 'VERIFIKASI EMAIL'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading State */}
        {status === 'loading' && (
          <div className="upload-panel glass-panel">
            <div className="upload-loading">
              <div className="upload-spinner" />
              <p>Memeriksa status verifikasi pendaftaran di database...</p>
            </div>
          </div>
        )}

        {/* Denied / Error State */}
        {(status === 'denied' || status === 'error') && (
          <div className="upload-panel glass-panel">
            <div className="upload-error">
              <span className="upload-error-icon">{status === 'error' ? '⚠️' : '🚫'}</span>
              <h2>{status === 'error' ? 'TERJADI KESALAHAN' : 'AKSES DITOLAK'}</h2>
              <p>{reason}</p>
              <div className="upload-error-actions">
                <button type="button" onClick={handleResetSearch} className="upload-retry-btn">
                  COBA EMAIL LAIN
                </button>
                <Link to="/" className="upload-home-link">KEMBALI KE BERANDA</Link>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="upload-panel glass-panel">
            <div className="upload-success">
              <span className="upload-success-icon">✅</span>
              <h2>UPLOAD BERHASIL!</h2>
              <p>
                Karya lomba <strong>{participantData?.cabang}</strong> atas nama <strong>{participantData?.nama}</strong> berhasil diunggah dan tersimpan.
              </p>
              <p className="upload-success-note">
                Terima kasih telah berpartisipasi di IT Days 2026. Pantau informasi selanjutnya di grup WhatsApp!
              </p>
              <Link to="/" className="upload-home-link">KEMBALI KE BERANDA</Link>
            </div>
          </div>
        )}

        {/* Step 2: Form Upload Karya */}
        {status === 'allowed' && participantData && (
          <div className="upload-panel glass-panel">
            <div className="upload-info-badge">
              <span className="badge-cabang">{participantData.cabang.toUpperCase()}</span>
              <span className="badge-user">{participantData.nama} ({participantData.email})</span>
            </div>

            <form onSubmit={handleSubmitKarya} autoComplete="off" noValidate>
              <div className="form-grid">
                {uploadFields.map((f) => (
                  <div className="field-group" key={f.name}>
                    <label className="field-label" htmlFor={`upload-${f.name}`}>{f.label}</label>
                    <input
                      type={f.type}
                      id={`upload-${f.name}`}
                      className="main-input"
                      placeholder={f.placeholder}
                      value={formData[f.name] || ''}
                      onChange={(e) => handleInputChange(f.name, e.target.value)}
                      required={f.required || false}
                    />
                    {f.patternHint && formData[f.name] && f.pattern && !f.pattern.test(formData[f.name]) && (
                      <span className="url-error">{f.patternHint}</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="upload-controls">
                <button
                  type="submit"
                  className="upload-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'MENGIRIM KARYA...' : 'KIRIM KARYA LOMBA'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </section>
  );
}

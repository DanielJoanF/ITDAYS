import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getBranchByName } from '../../data/categories';
import Toast from '../Toast/Toast';
import './UploadSection.css';

const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

export default function UploadSection() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const cabang = searchParams.get('cabang') || '';

  const [status, setStatus] = useState('loading'); // loading | allowed | denied | success | error
  const [reason, setReason] = useState('');
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Get branch config for dynamic upload fields
  const branchConfig = getBranchByName(cabang);
  const uploadFields = branchConfig?.uploadFields || [];

  // Check upload eligibility on mount
  useEffect(() => {
    if (!email || !cabang) {
      setStatus('denied');
      setReason('Parameter email dan cabang tidak ditemukan di URL.');
      return;
    }

    if (!GOOGLE_SCRIPT_URL) {
      setStatus('error');
      setReason('Konfigurasi URL belum diatur.');
      return;
    }

    const checkStatus = async () => {
      try {
        const url = `${GOOGLE_SCRIPT_URL}?email=${encodeURIComponent(email)}&cabang=${encodeURIComponent(cabang)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.allowed) {
          setStatus('allowed');
        } else {
          setStatus('denied');
          setReason(data.reason || 'Tidak diizinkan untuk upload.');
        }
      } catch (err) {
        console.error('[UPLOAD] Fetch error:', err);
        setStatus('error');
        setReason('Gagal menghubungi server. Silakan coba lagi nanti.');
      }
    };

    checkStatus();
  }, [email, cabang]);

  const showToast = useCallback((message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  }, []);

  const handleInputChange = useCallback((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Validate all upload fields
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
      showToast('URL belum dikonfigurasi.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build upload payload
      const payload = {
        action: 'upload',
        email: email,
        cabang: cabang,
      };

      // Add each upload field value
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
      showToast('Gagal mengirim. Silakan coba lagi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, uploadFields, email, cabang, showToast]);

  // ─── render ──────────────────────────────────────────────────

  return (
    <section className="upload-section">
      <div className="upload-container">

        {/* Header */}
        <div className="upload-header">
          <h1 className="upload-title text-display">UPLOAD<br />KARYA</h1>
          <p className="upload-subtitle">
            {status === 'allowed'
              ? `Upload link karya lomba ${cabang} untuk email ${email}.`
              : 'Verifikasi status pendaftaran...'}
          </p>
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <div className="upload-panel glass-panel">
            <div className="upload-loading">
              <div className="upload-spinner" />
              <p>Memeriksa status pendaftaran...</p>
            </div>
          </div>
        )}

        {/* Denied / Error */}
        {(status === 'denied' || status === 'error') && (
          <div className="upload-panel glass-panel">
            <div className="upload-error">
              <span className="upload-error-icon">{status === 'error' ? '⚠️' : '🚫'}</span>
              <h2>{status === 'error' ? 'TERJADI KESALAHAN' : 'AKSES DITOLAK'}</h2>
              <p>{reason}</p>
              <Link to="/" className="upload-home-link">KEMBALI KE BERANDA</Link>
            </div>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="upload-panel glass-panel">
            <div className="upload-success">
              <span className="upload-success-icon">✅</span>
              <h2>UPLOAD BERHASIL</h2>
              <p>
                Karya lomba <strong>{cabang}</strong> berhasil diupload.
                Terima kasih telah berpartisipasi!
              </p>
              <Link to="/" className="upload-home-link">KEMBALI KE BERANDA</Link>
            </div>
          </div>
        )}

        {/* Upload Form */}
        {status === 'allowed' && (
          <div className="upload-panel glass-panel">
            <div className="upload-info-badge">
              {cabang.toUpperCase()} — {email}
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" noValidate>
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
                  {isSubmitting ? 'MENGIRIM...' : 'UPLOAD KARYA'}
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

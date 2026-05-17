import { useState, useCallback } from 'react';
import { CATEGORIES, CATEGORY_KEYS } from '../../data/categories';
import Toast from '../Toast/Toast';
import './RegistrationSection.css';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxmBIGykg2pIZBzoGqN3WeJqX6zBQiEdB9ZqGl51HVIF-XKcZrbN9G1vV_O47soMCLTbg/exec';

export default function RegistrationSection() {
  const [activeCategory, setActiveCategory] = useState(CATEGORY_KEYS[0]);
  const [activeBranch, setActiveBranch] = useState(CATEGORIES[CATEGORY_KEYS[0]].branches[0] || '');
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const categoryData = CATEGORIES[activeCategory];
  const hasBranches = categoryData.branches.length > 0;

  const handleCategoryChange = useCallback((cat) => {
    setActiveCategory(cat);
    const data = CATEGORIES[cat];
    setActiveBranch(data.branches[0] || '');
    setFormData({});
  }, []);

  const handleBranchChange = useCallback((branch) => {
    setActiveBranch(branch);
  }, []);

  const handleInputChange = useCallback((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const showToast = useCallback((message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Validate common fields
    const { nama, email, whatsapp, instansi } = formData;
    if (!nama?.trim() || !email?.trim() || !whatsapp?.trim() || !instansi?.trim()) {
      showToast('Harap isi semua field wajib.', 'error');
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      nama: nama.trim(),
      email: email.trim(),
      whatsapp: whatsapp.trim(),
      instansi: instansi.trim(),
      kategori: activeCategory,
      cabangLomba: activeBranch || '—',
      targetSheet: activeCategory === 'Workshop' ? 'Workshop' : activeBranch,
    };

    // Collect extra fields
    categoryData.extraFields.forEach((f) => {
      payload[f.name] = (formData[f.name] || '').trim();
    });

    if (!GOOGLE_SCRIPT_URL) {
      console.warn('[PENDAFTARAN] GOOGLE_SCRIPT_URL belum diisi. Payload:', payload);
      showToast('URL belum dikonfigurasi. Cek console.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      showToast('Pendaftaran berhasil dikirim!', 'success');
      setFormData({});
    } catch (err) {
      console.error('[PENDAFTARAN] Error:', err);
      showToast('Gagal mengirim. Silakan coba lagi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, activeCategory, activeBranch, categoryData, showToast]);

  // ─── derive info label ─────────────────────────────────────
  const infoLabel = activeCategory === 'Workshop'
    ? 'WORKSHOP'
    : `${activeCategory.toUpperCase()} → ${activeBranch.toUpperCase()}`;

  // ─── render ──────────────────────────────────────────────────
  return (
    <section className="registration-section container" id="pendaftaran">

      {/* Header */}
      <div className="reg-header">
        <h1 className="form-title text-display">DAFTAR<br />SEKARANG</h1>
        <p className="form-subtitle">Pilih kategori, tentukan lomba, dan isi formulir pendaftaranmu.</p>
      </div>

      {/* Tab Navigation */}
      <nav className="reg-tabs" role="tablist">
        {CATEGORY_KEYS.map((cat) => (
          <button
            key={cat}
            className={`reg-tab${activeCategory === cat ? ' active' : ''}`}
            role="tab"
            aria-selected={activeCategory === cat}
            onClick={() => handleCategoryChange(cat)}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </nav>

      {/* Form Panel */}
      <div className="reg-panel glass-panel">

        {/* Branch Chips */}
        {hasBranches && (
          <div className="cabang-selector">
            <label className="field-label text-display">CABANG LOMBA</label>
            <div className="cabang-chips">
              {categoryData.branches.map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`cabang-chip${activeBranch === b ? ' active' : ''}`}
                  onClick={() => handleBranchChange(b)}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} autoComplete="off" noValidate>

          {/* Common Fields */}
          <div className="form-grid">
            <div className="field-group">
              <label className="field-label" htmlFor="nama">Nama Lengkap</label>
              <input
                type="text"
                id="nama"
                className="main-input"
                placeholder="Masukkan nama lengkap"
                value={formData.nama || ''}
                onChange={(e) => handleInputChange('nama', e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                className="main-input"
                placeholder="contoh@email.com"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="whatsapp">Nomor WhatsApp</label>
              <input
                type="tel"
                id="whatsapp"
                className="main-input"
                placeholder="08xxxxxxxxxx"
                value={formData.whatsapp || ''}
                onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="instansi">Asal Instansi / Kampus</label>
              <input
                type="text"
                id="instansi"
                className="main-input"
                placeholder="Universitas / Sekolah"
                value={formData.instansi || ''}
                onChange={(e) => handleInputChange('instansi', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Dynamic Extra Fields */}
          {categoryData.extraFields.length > 0 && (
            <div className="form-grid">
              {categoryData.extraFields.map((f) => (
                <div className="field-group" key={f.name}>
                  <label className="field-label" htmlFor={f.name}>{f.label}</label>
                  <input
                    type={f.type}
                    id={f.name}
                    className="main-input"
                    placeholder={f.placeholder}
                    value={formData[f.name] || ''}
                    onChange={(e) => handleInputChange(f.name, e.target.value)}
                    required={f.required || false}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Submit Section */}
          <div className="form-controls active">
            <span className="selected-info text-display">{infoLabel}</span>
            <button
              type="submit"
              className="submit-btn-minimal"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'LOADING...' : 'DAFTAR'}
            </button>
          </div>

        </form>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </section>
  );
}

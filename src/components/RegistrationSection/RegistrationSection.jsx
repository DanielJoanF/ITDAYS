import { useState, useCallback, useMemo } from 'react';
import { CATEGORIES, CATEGORY_KEYS } from '../../data/categories';
import { validateForm, fileToBase64 } from '../../utils/validation';
import Toast from '../Toast/Toast';
import './RegistrationSection.css';

const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

const COL = {
  TIMESTAMP:    "Timestamp",
  NAMA:         "Nama Lengkap",
  EMAIL:        "Email Aktif",
  NO_HP:        "Nomor WhatsApp",
  INSTANSI:     "Asal Instansi / Sekolah",
  KATEGORI:     "Kategori Lomba",
  CABANG:       "Cabang Lomba",
  NAMA_TIM:     "Nama Tim",
  ANGGOTA:      "Nama Anggota Tim",
  ID_GAME:      "ID Game (Kapten)",
  NICKNAME:     "Nickname In-Game",
  FIGMA_LINK:   "Link Figma Project",
  GITHUB_LINK:  "Link Repository GitHub",
  DRIVE_PPT:    "Link Google Drive (PPT/PDF Presentasi)",
  DRIVE_POSTER: "Link Google Drive (Hasil Poster)",
  KTM:          "Foto KTM / Kartu Tanda Siswa",
  BUKTI_BAYAR:  "Link Bukti Pembayaran",
};

export default function RegistrationSection() {
  const [activeCategory, setActiveCategory] = useState(CATEGORY_KEYS[0]);
  const [activeBranchIdx, setActiveBranchIdx] = useState(0);
  const [formData, setFormData] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [ktmFile, setKtmFile] = useState(null);
  const [paymentFile, setPaymentFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const categoryData = CATEGORIES[activeCategory];
  const activeBranch = categoryData.branches[activeBranchIdx] || categoryData.branches[0];

  // Derive team member slots: leader counts as 1, remaining are member inputs
  const memberSlots = useMemo(() => {
    if (!activeBranch || activeBranch.teamSize.max <= 1) return [];
    const slots = [];
    for (let i = 2; i <= activeBranch.teamSize.max; i++) {
      const isRequired = i <= activeBranch.teamSize.min;
      slots.push({ index: i, required: isRequired });
    }
    return slots;
  }, [activeBranch]);

  // Reset form when category changes
  const handleCategoryChange = useCallback((cat) => {
    setActiveCategory(cat);
    setActiveBranchIdx(0);
    setFormData({});
    setTeamMembers([]);
    setKtmFile(null);
    setPaymentFile(null);
  }, []);

  // Reset dynamic fields when branch changes
  const handleBranchChange = useCallback((idx) => {
    setActiveBranchIdx(idx);
    setFormData((prev) => {
      // Keep common fields, clear extra fields
      const { nama, email, whatsapp, instansi } = prev;
      return { nama, email, whatsapp, instansi };
    });
    setTeamMembers([]);
  }, []);

  const handleInputChange = useCallback((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleMemberChange = useCallback((idx, value) => {
    setTeamMembers((prev) => {
      const updated = [...prev];
      updated[idx] = value;
      return updated;
    });
  }, []);

  const handleFileChange = useCallback((type, file) => {
    if (type === 'ktm') setKtmFile(file);
    else setPaymentFile(file);
  }, []);

  const showToast = useCallback((message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Run validation
    const { valid, errors } = validateForm({
      formData,
      teamMembers,
      branchConfig: activeBranch,
      ktmFile,
      paymentFile,
    });

    if (!valid) {
      showToast(errors[0], 'error');
      return;
    }

    if (!GOOGLE_SCRIPT_URL) {
      console.warn('[PENDAFTARAN] GOOGLE_SCRIPT_URL belum diisi.');
      showToast('URL belum dikonfigurasi. Cek console.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Encode files to base64 objects { name, type, data }
      const [ktmEncoded, paymentEncoded] = await Promise.all([
        fileToBase64(ktmFile),
        fileToBase64(paymentFile),
      ]);

      // Build spreadsheet payload matching the Google Apps Script COL keys exactly
      const payload = {
        [COL.TIMESTAMP]: new Date().toLocaleString("id-ID"),
        [COL.NAMA]: formData.nama.trim(),
        [COL.EMAIL]: formData.email.trim(),
        [COL.NO_HP]: formData.whatsapp.trim(),
        [COL.INSTANSI]: formData.instansi.trim(),
        [COL.KATEGORI]: activeCategory,
        [COL.CABANG]: activeBranch.name,
        [COL.NAMA_TIM]: (formData.nama_tim || '').trim(),
        [COL.ANGGOTA]: teamMembers.filter((m) => m.trim()).join(', '),
        [COL.ID_GAME]: (formData.id_game || '').trim(),
        [COL.NICKNAME]: (formData.nickname || '').trim(),
        [COL.FIGMA_LINK]: (formData.figma_link || '').trim(),
        [COL.GITHUB_LINK]: (formData.github_link || '').trim(),
        [COL.DRIVE_PPT]: (formData.presentation_drive_link || '').trim(),
        [COL.DRIVE_POSTER]: (formData.poster_drive_link || '').trim(),
        [COL.KTM]: ktmEncoded,
        [COL.BUKTI_BAYAR]: paymentEncoded,
      };

      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      showToast('Pendaftaran berhasil dikirim!', 'success');
      setFormData({});
      setTeamMembers([]);
      setKtmFile(null);
      setPaymentFile(null);
    } catch (err) {
      console.error('[PENDAFTARAN] Error:', err);
      showToast('Gagal mengirim. Silakan coba lagi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, teamMembers, activeBranch, ktmFile, paymentFile, activeCategory, showToast]);

  // Info label for footer
  const infoLabel = `${activeCategory.toUpperCase()} → ${activeBranch.name.toUpperCase()}`;

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
        {categoryData.branches.length > 0 && (
          <div className="cabang-selector">
            <label className="field-label text-display">CABANG LOMBA</label>
            <div className="cabang-chips">
              {categoryData.branches.map((b, idx) => (
                <button
                  key={b.name}
                  type="button"
                  className={`cabang-chip${activeBranchIdx === idx ? ' active' : ''}`}
                  onClick={() => handleBranchChange(idx)}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Competition Info Badge */}
        <div className="competition-info-badge">
          <span className="badge-text">
            {activeBranch.teamSize.min === activeBranch.teamSize.max
              ? `${activeBranch.teamSize.min} peserta`
              : `${activeBranch.teamSize.min}–${activeBranch.teamSize.max} peserta`}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} autoComplete="off" noValidate>

          {/* ── Common Fields ────────────────────────────────── */}
          <div className="form-grid">
            <div className="field-group">
              <label className="field-label" htmlFor="nama">Nama Lengkap (Ketua)</label>
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

          {/* ── Dynamic Team Members ─────────────────────────── */}
          {memberSlots.length > 0 && (
            <div className="team-members-section">
              <h3 className="section-heading text-display">
                ANGGOTA TIM
              </h3>
              <p className="section-desc">
                Ketua sudah dihitung sebagai anggota ke-1.
                {activeBranch.teamSize.min !== activeBranch.teamSize.max && (
                  <> Minimal {activeBranch.teamSize.min} peserta, maksimal {activeBranch.teamSize.max} peserta.</>
                )}
              </p>
              <div className="form-grid">
                {memberSlots.map((slot) => (
                  <div className="field-group" key={slot.index}>
                    <label className="field-label" htmlFor={`member-${slot.index}`}>
                      Anggota {slot.index}
                      <span className={`member-badge ${slot.required ? 'required' : 'optional'}`}>
                        {slot.required ? 'WAJIB' : 'OPSIONAL'}
                      </span>
                    </label>
                    <input
                      type="text"
                      id={`member-${slot.index}`}
                      className="main-input"
                      placeholder={`Nama anggota ${slot.index}`}
                      value={teamMembers[slot.index - 2] || ''}
                      onChange={(e) => handleMemberChange(slot.index - 2, e.target.value)}
                      required={slot.required}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Dynamic Extra Fields (links, nama_tim, etc.) ── */}
          {activeBranch.extraFields.length > 0 && (
            <div className="extra-fields-section">
              <h3 className="section-heading text-display">
                DETAIL LOMBA
              </h3>
              <div className="form-grid">
                {activeBranch.extraFields.map((f) => (
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
                    {f.patternHint && formData[f.name] && f.pattern && !f.pattern.test(formData[f.name]) && (
                      <span className="url-error">{f.patternHint}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── File Uploads ──────────────────────────────────── */}
          <div className="file-uploads-section">
            <h3 className="section-heading text-display">
              UPLOAD DOKUMEN
            </h3>
            <p className="section-desc">Format: JPG, PNG, atau PDF. Maksimal 5 MB per file.</p>

            <div className="form-grid">
              {/* KTM Upload */}
              <div className="field-group">
                <label className="field-label" htmlFor="ktm_upload">
                  Upload KTM / Kartu Tanda Siswa
                  <span className="member-badge required">WAJIB</span>
                </label>
                <div className={`file-upload-area ${ktmFile ? 'has-file' : ''}`}>
                  <input
                    type="file"
                    id="ktm_upload"
                    className="file-input"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileChange('ktm', e.target.files[0] || null)}
                  />
                  <div className="file-upload-content">
                    {ktmFile ? (
                      <div className="file-info">
                        <span className="file-name">{ktmFile.name}</span>
                        <span className="file-size">({(ktmFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    ) : (
                      <div className="file-placeholder">
                        <span>Klik atau seret file ke sini</span>
                      </div>
                    )}
                  </div>
                </div>
                {ktmFile && ktmFile.size > 5 * 1024 * 1024 && (
                  <span className="file-error">File melebihi batas 5 MB!</span>
                )}
              </div>

              {/* Payment Proof Upload */}
              <div className="field-group">
                <label className="field-label" htmlFor="payment_upload">
                  Upload Bukti Pembayaran
                  <span className="member-badge required">WAJIB</span>
                </label>
                <div className={`file-upload-area ${paymentFile ? 'has-file' : ''}`}>
                  <input
                    type="file"
                    id="payment_upload"
                    className="file-input"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileChange('payment', e.target.files[0] || null)}
                  />
                  <div className="file-upload-content">
                    {paymentFile ? (
                      <div className="file-info">
                        <span className="file-name">{paymentFile.name}</span>
                        <span className="file-size">({(paymentFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    ) : (
                      <div className="file-placeholder">
                        <span>Klik atau seret file ke sini</span>
                      </div>
                    )}
                  </div>
                </div>
                {paymentFile && paymentFile.size > 5 * 1024 * 1024 && (
                  <span className="file-error">File melebihi batas 5 MB!</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Submit Section ─────────────────────────────────── */}
          <div className="form-controls active">
            <span className="selected-info text-display">{infoLabel}</span>
            <button
              type="submit"
              className="submit-btn-minimal"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'MENGIRIM...' : 'DAFTAR'}
            </button>
          </div>

        </form>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </section>
  );
}

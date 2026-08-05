import { useState, useCallback, useMemo } from 'react';
import { CATEGORIES, CATEGORY_KEYS } from '../../data/categories';
import './RegistrationSection.css';

export default function RegistrationSection() {
  const [activeCategory, setActiveCategory] = useState(CATEGORY_KEYS[0]);
  const [activeBranchIdx, setActiveBranchIdx] = useState(0);

  const categoryData = CATEGORIES[activeCategory];
  const activeBranch = categoryData.branches[activeBranchIdx] || categoryData.branches[0];

  // Reset branch index when category changes
  const handleCategoryChange = useCallback((cat) => {
    setActiveCategory(cat);
    setActiveBranchIdx(0);
  }, []);

  // Derive team size label
  const teamSizeLabel = useMemo(() => {
    const { min, max } = activeBranch.teamSize;
    return min === max ? `${min} peserta` : `${min}–${max} peserta`;
  }, [activeBranch]);

  // Info label for the register button area
  const infoLabel = `${activeCategory.toUpperCase()} → ${activeBranch.name.toUpperCase()} (${activeBranch.price})`;

  // ─── render ──────────────────────────────────────────────────
  return (
    <section className="registration-section container" id="pendaftaran">

      {/* Header */}
      <div className="reg-header">
        <h1 className="form-title text-display">DAFTAR<br />SEKARANG</h1>
        <p className="form-subtitle">Pilih kategori, tentukan lomba, lalu klik tombol daftar untuk mengisi Google Form.</p>
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
                  onClick={() => setActiveBranchIdx(idx)}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Competition Info Badges */}
        <div className="competition-info-container">
          <div className="competition-info-badge">
            <span className="badge-text">{teamSizeLabel}</span>
          </div>
          {activeBranch.price && (
            <div className="competition-info-badge price-badge">
              <span className="badge-text">Biaya Pendaftaran: {activeBranch.price}</span>
            </div>
          )}
        </div>

        {/* Requirements Panel */}
        {activeBranch.requirements && activeBranch.requirements.length > 0 && (
          <div className="requirements-panel">
            <h3 className="requirements-title">
              YANG PERLU DISIAPKAN
            </h3>
            <p className="requirements-desc">
              Siapkan data berikut sebelum mengisi Google Form pendaftaran.
            </p>
            <ul className="requirements-list">
              {activeBranch.requirements.map((item, i) => (
                <li key={i} className="requirements-item">
                  <span className="requirements-bullet" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Register CTA */}
        <div className="form-controls active">
          <span className="selected-info text-display">{infoLabel}</span>
          <a
            key={activeBranch.name}
            href={activeBranch.formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="submit-btn-minimal"
          >
            DAFTAR
          </a>
        </div>

      </div>
    </section>
  );
}

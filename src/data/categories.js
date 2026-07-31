/**
 * Data model untuk kategori lomba IT DAYS.
 *
 * Setiap kategori memiliki:
 *   - branches:    cabang lomba (array of branch configs)
 *   - Each branch has:
 *     - name:        display name
 *     - formUrl:     URL Google Form pendaftaran (buka di tab baru)
 *     - teamSize:    { min, max } — total participants including leader
 *     - requirements: array of string — info ketentuan yang perlu disiapkan
 *     - uploadFields: field link karya (diisi saat upload, setelah verifikasi admin)
 *
 * Field object shape:
 *   { name, label, type, placeholder, required?, pattern?, patternHint? }
 *
 * Workshop has been removed.
 * CTF replaced by UI/UX. Lomba Web replaced by Web Dev.
 * Registration is now handled via external Google Form (formUrl).
 */

export const CATEGORIES = {
  Olahraga: {
    branches: [
      {
        name: 'Badminton',
        formUrl: 'https://forms.gle/6USgu6ZWhbVDokjz5',
        teamSize: { min: 2, max: 2 },
        requirements: [
          'Nama lengkap ketua tim',
          'Nama anggota tim (1 orang)',
          'Nama tim',
          'Email aktif ketua',
          'Nomor WhatsApp aktif',
          'Asal instansi / sekolah',
          'Foto KTM / Kartu Tanda Siswa (JPG/PNG/PDF, maks 5 MB)',
          'Bukti pembayaran (JPG/PNG/PDF, maks 5 MB)',
        ],
        uploadFields: [],
      },
      {
        name: 'Futsal',
        formUrl: 'https://forms.gle/1TTrTLwHEByFrfnk8',
        teamSize: { min: 10, max: 12 },
        requirements: [
          'Nama lengkap ketua tim',
          'Nama seluruh anggota tim (9–11 orang)',
          'Nama tim',
          'Nama official 1 (wajib) & official 2 (opsional)',
          'Email aktif ketua',
          'Nomor WhatsApp aktif',
          'Asal instansi / sekolah',
          'Foto KTM / Kartu Tanda Siswa (JPG/PNG/PDF, maks 5 MB)',
          'Bukti pembayaran (JPG/PNG/PDF, maks 5 MB)',
        ],
        uploadFields: [],
      },
    ],
  },
  Games: {
    branches: [
      {
        name: 'PUBG',
        formUrl: 'https://forms.gle/136LHxpnMRLMAPn19',
        teamSize: { min: 4, max: 5 },
        requirements: [
          'Nama lengkap ketua tim',
          'Nama anggota tim (3–4 orang)',
          'Nama tim',
          'ID Game & Nickname in-game ketua',
          'Email aktif ketua',
          'Nomor WhatsApp aktif',
          'Asal instansi / sekolah',
          'Foto KTM / Kartu Tanda Siswa (JPG/PNG/PDF, maks 5 MB)',
          'Bukti pembayaran (JPG/PNG/PDF, maks 5 MB)',
        ],
        uploadFields: [],
      },
      {
        name: 'ML',
        formUrl: 'https://forms.gle/R7jkqHSR9bbx8Z3bA',
        teamSize: { min: 2, max: 3 },
        requirements: [
          'Nama lengkap ketua tim',
          'Nama anggota tim (1–2 orang)',
          'Nama tim',
          'Email aktif ketua',
          'Nomor WhatsApp aktif',
          'Asal instansi / sekolah',
          'Foto KTM / Kartu Tanda Siswa (JPG/PNG/PDF, maks 5 MB)',
          'Bukti pembayaran (JPG/PNG/PDF, maks 5 MB)',
        ],
        uploadFields: [],
      },
    ],
  },
  Program: {
    branches: [
      {
        name: 'UI/UX',
        formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdaJKURVfRLqhkeMajLEFG-eVpRdU7R4v_voFktiKySv41QsQ/viewform?usp=header',
        teamSize: { min: 2, max: 3 },
        requirements: [
          'Nama lengkap ketua tim',
          'Nama anggota tim (1–2 orang)',
          'Nama tim',
          'Email aktif ketua',
          'Nomor WhatsApp aktif',
          'Asal instansi / sekolah',
          'Foto KTM / Kartu Tanda Siswa (JPG/PNG/PDF, maks 5 MB)',
          'Bukti pembayaran (JPG/PNG/PDF, maks 5 MB)',
          'Link Figma project (diunggah setelah verifikasi admin)',
        ],
        uploadFields: [
          {
            name: 'figma_link',
            label: 'Link Figma Project',
            type: 'url',
            placeholder: 'https://www.figma.com/...',
            required: true,
            pattern: /^https:\/\/(www\.)?figma\.com\//i,
            patternHint: 'Harus berupa link Figma yang valid (https://figma.com/...)',
          },
        ],
      },
      {
        name: 'Web Dev',
        formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScykhUG_QvdOaKpw_gtxTUT3z28waGj329JyB5Wg55FTwMOeg/viewform?usp=header',
        teamSize: { min: 2, max: 3 },
        requirements: [
          'Nama lengkap ketua tim',
          'Nama anggota tim (1–2 orang)',
          'Nama tim',
          'Email aktif ketua',
          'Nomor WhatsApp aktif',
          'Asal instansi / sekolah',
          'Foto KTM / Kartu Tanda Siswa (JPG/PNG/PDF, maks 5 MB)',
          'Bukti pembayaran (JPG/PNG/PDF, maks 5 MB)',
          'Link repository GitHub (diunggah setelah verifikasi admin)',
          'Link Google Drive PPT/PDF presentasi (diunggah setelah verifikasi admin)',
        ],
        uploadFields: [
          {
            name: 'github_link',
            label: 'Link Repository GitHub',
            type: 'url',
            placeholder: 'https://github.com/...',
            required: true,
            pattern: /^https:\/\/(www\.)?github\.com\//i,
            patternHint: 'Harus berupa link GitHub yang valid (https://github.com/...)',
          },
          {
            name: 'presentation_drive_link',
            label: 'Link Google Drive (PPT/PDF Presentasi)',
            type: 'url',
            placeholder: 'https://drive.google.com/...',
            required: true,
            pattern: /^https:\/\/drive\.google\.com\//i,
            patternHint: 'Harus berupa link Google Drive yang valid',
          },
        ],
      },
    ],
  },
  Kesenian: {
    branches: [
      {
        name: 'Poster',
        formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfENesi2Hugh1MiKOs41jxuZuSmdGE0DqIrQ3loqaHXbBSmaA/viewform?usp=header',
        teamSize: { min: 1, max: 1 },
        requirements: [
          'Nama lengkap peserta',
          'Email aktif',
          'Nomor WhatsApp aktif',
          'Asal instansi / sekolah',
          'Foto KTM / Kartu Tanda Siswa (JPG/PNG/PDF, maks 5 MB)',
          'Bukti pembayaran (JPG/PNG/PDF, maks 5 MB)',
          'Link Google Drive hasil poster (diunggah setelah verifikasi admin)',
        ],
        uploadFields: [
          {
            name: 'poster_drive_link',
            label: 'Link Google Drive (Hasil Poster)',
            type: 'url',
            placeholder: 'https://drive.google.com/...',
            required: true,
            pattern: /^https:\/\/drive\.google\.com\//i,
            patternHint: 'Harus berupa link Google Drive yang valid',
          },
        ],
      },
      {
        name: 'Vocal',
        formUrl: 'https://forms.gle/zmJaNzRha7vyAPcZA',
        teamSize: { min: 1, max: 1 },
        requirements: [
          'Nama lengkap peserta',
          'Email aktif',
          'Nomor WhatsApp aktif',
          'Asal instansi / sekolah',
          'Foto KTM / Kartu Tanda Siswa (JPG/PNG/PDF, maks 5 MB)',
          'Bukti pembayaran (JPG/PNG/PDF, maks 5 MB)',
        ],
        uploadFields: [],
      },
    ],
  },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

/**
 * Helper: get branch config by name from any category.
 */
export function getBranchConfig(categoryKey, branchName) {
  const cat = CATEGORIES[categoryKey];
  if (!cat) return null;
  return cat.branches.find((b) => b.name === branchName) || null;
}

/**
 * Helper: find branch config by branch name across all categories.
 */
export function getBranchByName(branchName) {
  for (const cat of Object.values(CATEGORIES)) {
    const branch = cat.branches.find((b) => b.name === branchName);
    if (branch) return branch;
  }
  return null;
}

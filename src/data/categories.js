/**
 * Data model untuk kategori lomba IT DAYS.
 *
 * Setiap kategori memiliki:
 *   - branches:    cabang lomba (array of branch configs)
 *   - Each branch has:
 *     - name:       display name
 *     - teamSize:   { min, max } — total participants including leader
 *     - extraFields:  field tambahan spesifik per cabang (diisi saat registrasi)
 *     - uploadFields: field link karya (diisi saat upload, setelah verifikasi admin)
 *
 * Field object shape:
 *   { name, label, type, placeholder, required?, pattern?, patternHint? }
 *
 * Workshop has been removed.
 * CTF replaced by UI/UX. Lomba Web replaced by Web Dev.
 */

export const CATEGORIES = {
  Olahraga: {
    branches: [
      {
        name: 'Badminton',
        teamSize: { min: 2, max: 2 },
        extraFields: [
          { name: 'nama_tim', label: 'Nama Tim', type: 'text', placeholder: 'Nama tim kamu', required: true },
        ],
        uploadFields: [],
      },
      {
        name: 'Futsal',
        teamSize: { min: 8, max: 10 },
        extraFields: [
          { name: 'nama_tim', label: 'Nama Tim', type: 'text', placeholder: 'Nama tim kamu', required: true },
        ],
        uploadFields: [],
      },
    ],
  },
  Games: {
    branches: [
      {
        name: 'Mobile Legends',
        teamSize: { min: 7, max: 7 },
        extraFields: [
          { name: 'nama_tim', label: 'Nama Tim', type: 'text', placeholder: 'Nama tim kamu', required: true },
          { name: 'id_game', label: 'ID Game (Kapten)', type: 'text', placeholder: 'ID#Server', required: true },
          { name: 'nickname', label: 'Nickname In-Game', type: 'text', placeholder: 'Nickname kapten', required: true },
        ],
        uploadFields: [],
      },
      {
        name: 'PUBG',
        teamSize: { min: 5, max: 5 },
        extraFields: [
          { name: 'nama_tim', label: 'Nama Tim', type: 'text', placeholder: 'Nama tim kamu', required: true },
          { name: 'id_game', label: 'ID Game (Kapten)', type: 'text', placeholder: 'ID#Server', required: true },
          { name: 'nickname', label: 'Nickname In-Game', type: 'text', placeholder: 'Nickname kapten', required: true },
        ],
        uploadFields: [],
      },
    ],
  },
  Program: {
    branches: [
      {
        name: 'UI/UX',
        teamSize: { min: 1, max: 1 },
        extraFields: [],
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
        teamSize: { min: 2, max: 3 },
        extraFields: [
          { name: 'nama_tim', label: 'Nama Tim', type: 'text', placeholder: 'Nama tim kamu', required: true },
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
        teamSize: { min: 1, max: 1 },
        extraFields: [],
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
        teamSize: { min: 1, max: 1 },
        extraFields: [],
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

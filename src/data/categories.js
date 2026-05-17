/**
 * Data model untuk kategori lomba & workshop IT DAYS.
 *
 * Setiap kategori memiliki:
 *   - branches:    cabang lomba (array string)
 *   - extraFields: field tambahan spesifik per kategori
 *
 * Field object shape:
 *   { name, label, type, placeholder, required? }
 */

export const CATEGORIES = {
  Olahraga: {
    branches: ['Bulu Tangkis', 'Futsal'],
    extraFields: [
      { name: 'nama_tim', label: 'Nama Tim', type: 'text', placeholder: 'Nama tim kamu', required: true },
      { name: 'jumlah_anggota', label: 'Jumlah Anggota', type: 'number', placeholder: 'Contoh: 5', required: true },
    ],
  },
  Kesenian: {
    branches: ['Lomba Vokal', 'Poster'],
    extraFields: [
      { name: 'link_portofolio', label: 'Link Portofolio (opsional)', type: 'url', placeholder: 'https://...' },
    ],
  },
  Program: {
    branches: ['Lomba Web', 'CTF'],
    extraFields: [
      { name: 'nama_tim', label: 'Nama Tim', type: 'text', placeholder: 'Nama tim kamu', required: true },
      { name: 'link_repo', label: 'Link Repository', type: 'url', placeholder: 'https://github.com/...' },
      { name: 'bahasa_pemrograman', label: 'Bahasa Pemrograman Utama', type: 'text', placeholder: 'Contoh: Python, JavaScript' },
    ],
  },
  Games: {
    branches: ['Mobile Legends', 'PUBG'],
    extraFields: [
      { name: 'nama_tim', label: 'Nama Tim', type: 'text', placeholder: 'Nama tim kamu', required: true },
      { name: 'id_game', label: 'ID Game (Kapten)', type: 'text', placeholder: 'ID#Server', required: true },
      { name: 'nickname', label: 'Nickname In-Game', type: 'text', placeholder: 'Nickname kapten', required: true },
    ],
  },
  Workshop: {
    branches: [],
    extraFields: [],
  },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

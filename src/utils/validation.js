/**
 * Validation utilities for the ITDAYS registration form.
 *
 * Validates: required fields, email format, team member count,
 * URL patterns, file type & size.
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

/**
 * Validate the entire registration form.
 *
 * @param {Object} params
 * @param {Object} params.formData        — key/value from all inputs
 * @param {Array}  params.teamMembers     — array of member name strings
 * @param {Object} params.branchConfig    — { name, teamSize: {min,max}, extraFields }
 * @param {File|null} params.ktmFile      — KTM upload file
 * @param {File|null} params.paymentFile  — payment proof file
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateForm({ formData, teamMembers, branchConfig, ktmFile, paymentFile }) {
  const errors = [];

  // ─── Required common fields ──────────────────────────────────
  if (!formData.nama?.trim()) errors.push('Nama Lengkap wajib diisi.');
  if (!formData.email?.trim()) errors.push('Email wajib diisi.');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
    errors.push('Format email tidak valid.');
  }
  if (!formData.whatsapp?.trim()) errors.push('Nomor WhatsApp wajib diisi.');
  if (!formData.instansi?.trim()) errors.push('Asal Instansi wajib diisi.');

  // ─── Team size validation ────────────────────────────────────
  if (branchConfig) {
    const { min, max } = branchConfig.teamSize;
    // totalMembers = leader (1) + filled team member slots
    const filledMembers = teamMembers.filter((m) => m.trim() !== '');
    const totalParticipants = 1 + filledMembers.length;

    if (min === max) {
      if (totalParticipants !== min) {
        errors.push(`${branchConfig.name} membutuhkan tepat ${min} peserta (ketua + ${min - 1} anggota).`);
      }
    } else {
      if (totalParticipants < min || totalParticipants > max) {
        errors.push(
          `${branchConfig.name} membutuhkan ${min}–${max} peserta (ketua + ${min - 1}–${max - 1} anggota).`
        );
      }
    }

    // ─── Extra fields validation ────────────────────────────────
    branchConfig.extraFields.forEach((f) => {
      const value = (formData[f.name] || '').trim();

      if (f.required && !value) {
        errors.push(`${f.label} wajib diisi.`);
      }

      if (value && f.pattern && !f.pattern.test(value)) {
        errors.push(f.patternHint || `${f.label} tidak valid.`);
      }
    });
  }

  // ─── File validations ─────────────────────────────────────────
  const validateFile = (file, label) => {
    if (!file) {
      errors.push(`${label} wajib diunggah.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${label}: ukuran file melebihi 5 MB.`);
    }
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_FILE_TYPES.includes(file.type)) {
      errors.push(`${label}: format file harus JPG, PNG, atau PDF.`);
    }
  };

  validateFile(ktmFile, 'Upload KTM / Kartu Tanda Siswa');
  validateFile(paymentFile, 'Upload Bukti Pembayaran');

  return { valid: errors.length === 0, errors };
}

/**
 * Convert a File to a base64 data string for JSON transport.
 * @param {File} file
 * @returns {Promise<{name: string, type: string, data: string}>}
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        name: file.name,
        type: file.type,
        data: reader.result.split(',')[1], // strip "data:...;base64,"
      });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

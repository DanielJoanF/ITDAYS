// ================================================================
//  IT DAYS 2026 — Google Apps Script Backend (v5.0 - Combined Full Features & Strict Security)
//  - Fully Secured: reCAPTCHA v3 Server-Side Verification + Rate Limiting + Field Validation
//  - Multi-sheet synchronization (Data Peserta <-> Cabang Lomba)
//  - Header-based Cell Mapping (Aman meskipun urutan kolom di sheet berubah)
//  - Direct Drive File Upload (KTM & Bukti Pembayaran)
//  - Instant Email Notification (GmailApp dengan HTML Template + Link WA + Link Upload)
//  - Eligibility API (doGet) untuk halaman Upload Karya
// ================================================================

// ----------------------------------------------------------------
//  KONFIGURASI
// ----------------------------------------------------------------

const CONFIG = {
  EVENT_NAME:      "IT Days 2026",
  EVENT_ORGANIZER: "Panitia IT Days 2026",
  PANITIA_EMAIL:   "usditdays@gmail.com",
  REPLY_TO:        "usditdays@gmail.com",
  WEBSITE_URL:     "https://itdays-usd.com",

  // Dynamic getters for Script Properties
  recaptchaSecret: () => PropertiesService.getScriptProperties().getProperty('RECAPTCHA_SECRET'),
  sheetId: () => PropertiesService.getScriptProperties().getProperty('SHEET_ID') || SpreadsheetApp.getActiveSpreadsheet().getId(),
  maxRequestsPerMin: 10,
  minRecaptchaScore: 0.5,

  WA_LINKS: {
    "Badminton":      "https://chat.whatsapp.com/Kgz5aV5fNMc5cX2IvnZGn4",
    "Futsal":         "https://chat.whatsapp.com/Hy4Qy7z2h2wAHPcK1M9Yh2",
    "Mobile Legends": "https://chat.whatsapp.com/L6k7zFFv3Rn4PfOTsK0GjX",
    "PUBG":           "https://chat.whatsapp.com/Ckq6qzC194GL7f3ZAoU7Ix",
    "UI/UX":          "https://chat.whatsapp.com/HmESEQFcdd9KmYk1UhnXK8",
    "Web Dev":        "https://chat.whatsapp.com/Ld3uYPNjmlQJRR7SuahYxl",
    "Poster":         "https://chat.whatsapp.com/CgtsvtXtfFj3Bpfb55lmEk",
    "Vocal":          "https://chat.whatsapp.com/ITQ2LQcTlEt2tRvVJARlZe",
  },
};

const DRIVE_FOLDER_ID = ""; // Opsional: ID Folder Google Drive (kosong = Root Drive)

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
  OFFICIAL_1:   "Official 1",
  OFFICIAL_2:   "Official 2",
};

const BASE_COLS = ["No", "Timestamp", "Nama", "Email", "No. WA", "Instansi"];
const END_COLS  = ["KTM", "Bukti Bayar", "Status", "Email Terkirim", "Status Upload"];

const LOMBA_SHEETS = {
  "Badminton": {
    sheetName: "Badminton",
    extraCols: ["Nama Tim", "Anggota (2 Orang)"],
    fillExtra: (d) => ({ "Nama Tim": d.namaTim, "Anggota (2 Orang)": d.anggota }),
    uploadCols: [],
  },
  "Futsal": {
    sheetName: "Futsal",
    extraCols: ["Nama Tim", "Anggota (10-12 Orang)", "Official 1", "Official 2"],
    fillExtra: (d) => ({ "Nama Tim": d.namaTim, "Anggota (10-12 Orang)": d.anggota, "Official 1": d.official1, "Official 2": d.official2 }),
    uploadCols: [],
  },
  "Mobile Legends": {
    sheetName: "Mobile Legends",
    extraCols: ["Nama Tim", "Anggota (5-7 Orang)", "ID Game Kapten", "Nickname Kapten"],
    fillExtra: (d) => ({ "Nama Tim": d.namaTim, "Anggota (5-7 Orang)": d.anggota, "ID Game Kapten": d.idGame, "Nickname Kapten": d.nickname }),
    uploadCols: [],
  },
  "PUBG": {
    sheetName: "PUBG",
    extraCols: ["Nama Tim", "Anggota (4-5 Orang)", "ID Game Kapten", "Nickname Kapten"],
    fillExtra: (d) => ({ "Nama Tim": d.namaTim, "Anggota (4-5 Orang)": d.anggota, "ID Game Kapten": d.idGame, "Nickname Kapten": d.nickname }),
    uploadCols: [],
  },
  "UI/UX": {
    sheetName: "UI/UX",
    extraCols: ["Nama Tim", "Anggota (2-3 Orang)"],
    fillExtra: (d) => ({ "Nama Tim": d.namaTim, "Anggota (2-3 Orang)": d.anggota }),
    uploadCols: ["Link Figma"],
  },
  "Web Dev": {
    sheetName: "Web Dev",
    extraCols: ["Nama Tim", "Anggota (2-3 Orang)"],
    fillExtra: (d) => ({ "Nama Tim": d.namaTim, "Anggota (2-3 Orang)": d.anggota }),
    uploadCols: ["Link GitHub", "Link Drive PPT"],
  },
  "Poster": {
    sheetName: "Poster",
    extraCols: [],
    fillExtra: (d) => ({}),
    uploadCols: ["Link Drive Poster"],
  },
  "Vocal": {
    sheetName: "Vocal",
    extraCols: [],
    fillExtra: (d) => ({}),
    uploadCols: [],
  },
};

const REKAP_HEADERS = [
  "No", "Timestamp", "Nama", "Email", "No. WA", "Instansi",
  "Kategori", "Cabang", "Nama Tim", "Anggota",
  "ID Game", "Nickname", "Official 1", "Official 2",
  "Link Figma", "Link GitHub", "Link Drive PPT", "Link Drive Poster",
  "KTM", "Bukti Bayar", "Status", "Email Terkirim", "Status Upload"
];

const LOG_HEADERS = [
  "Timestamp Log", "Nama", "Email", "Cabang",
  "Baris Sheet Lomba", "Status Email", "Keterangan",
];

function isStatusVerified(status) {
  if (!status) return false;
  const s = status.toString().trim().toLowerCase();
  return s === "terdaftar" || s === "terbayar" || s === "terverifikasi" || s === "verified" || s === "lunas";
}

// ----------------------------------------------------------------
//  KEAMANAN & VALIDASI SERVER-SIDE
// ----------------------------------------------------------------

/**
 * Verification of reCAPTCHA v3 Token
 */
function verifyRecaptcha(token) {
  if (!token) {
    return { success: false, score: 0, error: 'Token missing' };
  }

  const secret = CONFIG.recaptchaSecret();
  if (!secret) {
    console.warn('RECAPTCHA_SECRET not configured in Script Properties');
    return { success: false, score: 0, error: 'Server secret missing' };
  }

  try {
    const response = UrlFetchApp.fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'post',
      payload: {
        secret: secret,
        response: token,
      },
      muteHttpExceptions: true,
    });

    const result = JSON.parse(response.getContentText());

    if (!result.success) {
      console.warn('reCAPTCHA verify failed:', result['error-codes']);
      return { success: false, score: 0, errors: result['error-codes'] };
    }

    if (result.score < CONFIG.minRecaptchaScore) {
      console.warn('reCAPTCHA score too low:', result.score);
      return { success: false, score: result.score };
    }

    return { success: true, score: result.score };
  } catch (err) {
    console.error('reCAPTCHA API error:', err);
    return { success: false, score: 0, error: err.message };
  }
}

/**
 * Rate limiting per IP (script-wide via LockService)
 */
function checkRateLimit() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(2000)) return false;

  try {
    const props = PropertiesService.getScriptProperties();
    const now = Date.now();
    const windowMs = 60000;
    const maxReq = CONFIG.maxRequestsPerMin;
    const key = 'rate_limit_timestamps';

    const timestamps = JSON.parse(props.getProperty(key) || '[]');
    const recent = timestamps.filter(ts => now - ts < windowMs);

    if (recent.length >= maxReq) return false;

    recent.push(now);
    props.setProperty(key, JSON.stringify(recent));
    return true;
  } finally {
    lock.releaseLock();
  }
}

// ----------------------------------------------------------------
//  SMART HEADER-BASED WRITER
// ----------------------------------------------------------------

function writeRowDataByHeaders(sheet, rowIndex, dataMap) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const linkLabels = {
    "KTM": "Lihat KTM",
    "Bukti Bayar": "Lihat Bukti",
    "Link Figma": "Buka Figma",
    "Link GitHub": "Buka GitHub",
    "Link Drive PPT": "Buka Drive",
    "Link Drive Poster": "Buka Drive",
  };

  for (const [colName, val] of Object.entries(dataMap)) {
    if (val === undefined) continue;
    const colIdx = headers.indexOf(colName);
    if (colIdx >= 0) {
      const cell = sheet.getRange(rowIndex, colIdx + 1);
      const strVal = (val || "").toString().trim();
      if (strVal && strVal.indexOf("http") === 0) {
        const label = linkLabels[colName] || "Buka Link";
        cell.setFormula(`=HYPERLINK("${strVal}","${label}")`);
      } else {
        cell.setValue(strVal);
      }
    }
  }
}

// ----------------------------------------------------------------
//  HTTP POST HANDLER
// ----------------------------------------------------------------

function doPost(e) {
  try {
    let data;
    if (e.parameter && e.parameter.payload) {
      data = JSON.parse(e.parameter.payload);
    } else if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      return sendJson(400, { error: "Tidak ada data payload yang diterima." });
    }

    const action = data.action || 'registration';

    // 1. Rate Limiting Check
    if (!checkRateLimit()) {
      return sendJson(429, { error: "Terlalu banyak permintaan. Silakan tunggu beberapa menit." });
    }

    // 2. reCAPTCHA Verification
    const recaptchaResult = verifyRecaptcha(data.recaptchaToken || '');
    if (!recaptchaResult.success) {
      return sendJson(403, { error: "Verifikasi keamanan gagal. Refresh halaman dan coba lagi." });
    }

    // 3. Dispatch action
    if (action === "upload") {
      return handleUploadKarya(data);
    }

    return handleRegistrationSubmit(data);

  } catch (err) {
    console.error("doPost error:", err);
    return sendJson(500, { error: "Terjadi kesalahan server: " + err.message });
  }
}

/**
 * Handle Registration Action
 */
function handleRegistrationSubmit(data) {
  const errors = [];

  const nama = data.nama || data[COL.NAMA] || '';
  const email = data.email || data[COL.EMAIL] || '';
  const noHp = data.no_hp || data.whatsapp || data[COL.NO_HP] || '';
  const instansi = data.instansi || data[COL.INSTANSI] || '';
  const kategori = data.kategori || data[COL.KATEGORI] || '';
  const cabang = data.cabang || data[COL.CABANG] || '';

  const ktmInput = data.ktm_b64 || data[COL.KTM] || '';
  const paymentInput = data.payment_b64 || data[COL.BUKTI_BAYAR] || '';

  // Server-side validation rules
  if (!nama || nama.trim().length < 2) {
    errors.push('Nama lengkap wajib diisi (min 2 karakter).');
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Email tidak valid.');
  }
  if (!noHp || noHp.trim().length < 8) {
    errors.push('Nomor WhatsApp tidak valid (min 8 digit).');
  }
  if (!instansi || instansi.trim().length < 2) {
    errors.push('Asal instansi wajib diisi.');
  }
  if (!kategori) {
    errors.push('Kategori lomba wajib dipilih.');
  }
  if (!cabang) {
    errors.push('Cabang lomba wajib dipilih.');
  }

  // Duplicate email check
  if (email && isEmailRegistered(email)) {
    errors.push('Email ini sudah terdaftar di lomba IT Days.');
  }

  if (errors.length > 0) {
    return sendJson(400, { error: errors.join(' ') });
  }

  // File processing (Drive upload)
  let folder = DRIVE_FOLDER_ID ? DriveApp.getFolderById(DRIVE_FOLDER_ID) : DriveApp.getRootFolder();

  function uploadFile(fileData, filePrefix) {
    if (fileData && typeof fileData === 'object' && fileData.data) {
      const decodedData = Utilities.base64Decode(fileData.data);
      const blob = Utilities.newBlob(decodedData, fileData.type || 'image/jpeg', `${filePrefix}_${nama}_${Date.now()}`);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return file.getUrl();
    }
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      const parts = fileData.split(',');
      const meta = parts[0];
      const base64Str = parts[1];
      const mime = meta.split(':')[1].split(';')[0];
      const decodedData = Utilities.base64Decode(base64Str);
      const blob = Utilities.newBlob(decodedData, mime, `${filePrefix}_${nama}_${Date.now()}`);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return file.getUrl();
    }
    return fileData || "";
  }

  data[COL.KTM] = uploadFile(ktmInput, 'KTM');
  data[COL.BUKTI_BAYAR] = uploadFile(paymentInput, 'Bayar');

  const namedValues = {};
  for (const key in data) {
    namedValues[key] = [data[key]];
  }

  onFormSubmit({ namedValues: namedValues });

  return sendJson(200, { success: true, message: "Pendaftaran berhasil disimpan." });
}

/**
 * Handle Upload Action (Upload Karya)
 */
function handleUploadKarya(data) {
  const errors = [];
  const email = (data.email || '').trim();
  const cabang = (data.cabang || '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Email tidak valid.');
  }
  if (!cabang) {
    errors.push('Cabang lomba tidak ditemukan.');
  }

  const figmaLink = data.figma_link || data['Link Figma Project'] || data['Link Figma'] || '';
  const githubLink = data.github_link || data['Link Repository GitHub'] || data['Link GitHub'] || '';
  const posterLink = data.poster_drive_link || data.poster_link || data['Link Google Drive (Hasil Poster)'] || data['Link Drive Poster'] || '';

  if (cabang === 'UI/UX' && (!figmaLink || !figmaLink.startsWith('https://figma.com/'))) {
    errors.push('Link Figma tidak valid.');
  }
  if (cabang === 'Web Dev' && (!githubLink || !githubLink.startsWith('https://github.com/'))) {
    errors.push('Link GitHub tidak valid.');
  }
  if (cabang === 'Poster' && (!posterLink || !posterLink.startsWith('https://drive.google.com/'))) {
    errors.push('Link Google Drive tidak valid.');
  }

  if (errors.length > 0) {
    return sendJson(400, { error: errors.join(' ') });
  }

  const ss = SpreadsheetApp.openById(CONFIG.sheetId());

  // Update in Rekap
  const rekapSheet = ss.getSheetByName("Data Peserta");
  let updatedInRekap = false;
  if (rekapSheet && rekapSheet.getLastRow() > 1) {
    const rHeaders = rekapSheet.getRange(1, 1, 1, rekapSheet.getLastColumn()).getValues()[0];
    const emailIdx = rHeaders.indexOf("Email");
    if (emailIdx >= 0) {
      const rData = rekapSheet.getRange(2, 1, rekapSheet.getLastRow() - 1, rekapSheet.getLastColumn()).getValues();
      for (let i = 0; i < rData.length; i++) {
        if ((rData[i][emailIdx] || '').toString().trim().toLowerCase() === email.toLowerCase()) {
          const r = i + 2;
          const map = { "Status Upload": "SUDAH" };
          if (figmaLink) map["Link Figma"] = figmaLink;
          if (githubLink) map["Link GitHub"] = githubLink;
          if (posterLink) map["Link Drive Poster"] = posterLink;
          writeRowDataByHeaders(rekapSheet, r, map);
          updatedInRekap = true;
          break;
        }
      }
    }
  }

  // Update in Branch Sheet
  const cfg = LOMBA_SHEETS[cabang];
  if (cfg) {
    const cSheet = ss.getSheetByName(cfg.sheetName);
    if (cSheet && cSheet.getLastRow() > 1) {
      const cHeaders = cSheet.getRange(1, 1, 1, cSheet.getLastColumn()).getValues()[0];
      const cEmailIdx = cHeaders.indexOf("Email");
      if (cEmailIdx >= 0) {
        const cData = cSheet.getRange(2, 1, cSheet.getLastRow() - 1, cSheet.getLastColumn()).getValues();
        for (let j = 0; j < cData.length; j++) {
          if ((cData[j][cEmailIdx] || '').toString().trim().toLowerCase() === email.toLowerCase()) {
            const r = j + 2;
            const map = { "Status Upload": "SUDAH" };
            if (figmaLink) map["Link Figma"] = figmaLink;
            if (githubLink) map["Link GitHub"] = githubLink;
            if (posterLink) map["Link Drive Poster"] = posterLink;
            writeRowDataByHeaders(cSheet, r, map);
            break;
          }
        }
      }
    }
  }

  return sendJson(200, { success: true, message: "Karya berhasil diunggah." });
}

// ----------------------------------------------------------------
//  REGISTRASI FORM SUBMIT & MULTI-SHEET SYNC
// ----------------------------------------------------------------

function onFormSubmit(e) {
  try {
    const d = extractFormData(e.namedValues);
    const ss = SpreadsheetApp.openById(CONFIG.sheetId());

    const cfg = LOMBA_SHEETS[d.cabang];
    let lombaRow = "-";
    if (cfg) {
      const lombaSheet = getOrCreateLombaSheet(ss, cfg);
      lombaRow = appendToLombaSheet(lombaSheet, cfg, d);
    }

    const rekapSheet = getOrCreateSheet(ss, "Data Peserta", REKAP_HEADERS);
    appendToRekap(rekapSheet, d);

    // Instant Email Dispatch
    const waLink = CONFIG.WA_LINKS[d.cabang] || null;
    const hasUpload = cfg && cfg.uploadCols && cfg.uploadCols.length > 0;
    const baseUrl = CONFIG.WEBSITE_URL || "https://itdays-usd.com";
    const uploadLink = hasUpload
      ? baseUrl.replace(/\/+$/, "") + "/upload?email=" + encodeURIComponent(d.email) + "&cabang=" + encodeURIComponent(d.cabang)
      : null;

    const emailResult = sendVerifikasiEmail(d, waLink, uploadLink);
    const emailStatusText = emailResult.success ? "Terkirim" : "Gagal: " + emailResult.reason;

    syncRowStatus(ss, d.email, "Terdaftar", emailStatusText);

    const logSheet = getOrCreateSheet(ss, "Log Email", LOG_HEADERS);
    appendLog(logSheet, d, lombaRow, emailResult);

  } catch (err) {
    console.error("ERROR onFormSubmit:", err);
  }
}

function extractFormData(responses) {
  function get(key) {
    const val = responses[key];
    return val ? val[0].toString().trim() : "";
  }
  return {
    timestamp:   get(COL.TIMESTAMP) || new Date().toLocaleString("id-ID"),
    nama:        get(COL.NAMA) || get("nama"),
    email:       get(COL.EMAIL) || get("email"),
    noHp:        get(COL.NO_HP) || get("whatsapp") || get("no_hp"),
    instansi:    get(COL.INSTANSI) || get("instansi"),
    kategori:    get(COL.KATEGORI) || get("kategori"),
    cabang:      get(COL.CABANG) || get("cabang"),
    namaTim:     get(COL.NAMA_TIM) || get("nama_tim"),
    anggota:     get(COL.ANGGOTA) || get("anggota"),
    idGame:      get(COL.ID_GAME) || get("id_game"),
    nickname:    get(COL.NICKNAME) || get("nickname"),
    official1:   get(COL.OFFICIAL_1) || get("official_1"),
    official2:   get(COL.OFFICIAL_2) || get("official_2"),
    figmaLink:   get(COL.FIGMA_LINK) || get("figma_link"),
    githubLink:  get(COL.GITHUB_LINK) || get("github_link"),
    drivePpt:    get(COL.DRIVE_PPT),
    drivePoster: get(COL.DRIVE_POSTER) || get("poster_drive_link"),
    ktm:         get(COL.KTM) || get("ktm_b64"),
    buktiByar:   get(COL.BUKTI_BAYAR) || get("payment_b64"),
  };
}

function getOrCreateLombaSheet(ss, cfg) {
  const headers = [...BASE_COLS, ...cfg.extraCols, ...(cfg.uploadCols || []), ...END_COLS];
  return getOrCreateSheet(ss, cfg.sheetName, headers);
}

function appendToLombaSheet(sheet, cfg, d) {
  const nextRow = Math.max(sheet.getLastRow() + 1, 2);
  const no = nextRow - 1;
  const hasUpload = cfg.uploadCols && cfg.uploadCols.length > 0;

  const dataMap = {
    "No": no,
    "Timestamp": d.timestamp,
    "Nama": d.nama,
    "Email": d.email,
    "No. WA": d.noHp,
    "Instansi": d.instansi,
    ...cfg.fillExtra(d),
    "KTM": d.ktm,
    "Bukti Bayar": d.buktiByar,
    "Status": "Terdaftar",
    "Email Terkirim": "Menunggu",
    "Status Upload": hasUpload ? "BELUM" : "-",
  };

  (cfg.uploadCols || []).forEach(c => dataMap[c] = "");

  writeRowDataByHeaders(sheet, nextRow, dataMap);
  formatDataRow(sheet, nextRow, sheet.getLastColumn());

  return nextRow;
}

function appendToRekap(sheet, d) {
  const nextRow = Math.max(sheet.getLastRow() + 1, 2);
  const no = nextRow - 1;
  const cfg = LOMBA_SHEETS[d.cabang];
  const hasUpload = cfg && cfg.uploadCols && cfg.uploadCols.length > 0;

  const dataMap = {
    "No": no,
    "Timestamp": d.timestamp,
    "Nama": d.nama,
    "Email": d.email,
    "No. WA": d.noHp,
    "Instansi": d.instansi,
    "Kategori": d.kategori,
    "Cabang": d.cabang,
    "Nama Tim": d.namaTim,
    "Anggota": d.anggota,
    "ID Game": d.idGame,
    "Nickname": d.nickname,
    "Official 1": d.official1,
    "Official 2": d.official2,
    "Link Figma": d.figmaLink,
    "Link GitHub": d.githubLink,
    "Link Drive PPT": d.drivePpt,
    "Link Drive Poster": d.drivePoster,
    "KTM": d.ktm,
    "Bukti Bayar": d.buktiByar,
    "Status": "Terdaftar",
    "Email Terkirim": "Menunggu",
    "Status Upload": hasUpload ? "BELUM" : "-",
  };

  writeRowDataByHeaders(sheet, nextRow, dataMap);
  formatDataRow(sheet, nextRow, REKAP_HEADERS.length);
}

function syncRowStatus(ss, email, newStatus, newEmailStatus) {
  if (!email) return;
  const sheets = ss.getSheets();
  sheets.forEach(sh => {
    if (sh.getName() === "Log Email" || sh.getLastRow() <= 1) return;
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const emailIdx = headers.indexOf("Email");
    if (emailIdx >= 0) {
      const data = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
      for (let i = 0; i < data.length; i++) {
        const rowEmail = (data[i][emailIdx] || "").toString().trim().toLowerCase();
        if (rowEmail === email.toLowerCase()) {
          const r = i + 2;
          const updateMap = {};
          if (newStatus) updateMap["Status"] = newStatus;
          if (newEmailStatus) updateMap["Email Terkirim"] = newEmailStatus;
          writeRowDataByHeaders(sh, r, updateMap);
          break;
        }
      }
    }
  });
}

function isEmailRegistered(email) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.sheetId());
    const sheet = ss.getSheetByName("Data Peserta") || ss.getActiveSheet();
    if (sheet.getLastRow() <= 1) return false;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const emailIdx = headers.indexOf("Email");
    if (emailIdx < 0) return false;
    const emails = sheet.getRange(2, emailIdx + 1, sheet.getLastRow() - 1, 1).getValues().flat();
    return emails.some(e => e.toString().toLowerCase() === email.toLowerCase());
  } catch (e) {
    return false;
  }
}

// ----------------------------------------------------------------
//  EMAIL SERVICE
// ----------------------------------------------------------------

function sendVerifikasiEmail(d, waLink, uploadLink) {
  if (!d.email) return { success: false, reason: "Email kosong" };
  const subject = "Pendaftaran Dikonfirmasi - " + CONFIG.EVENT_NAME + " (" + d.cabang + ")";
  try {
    GmailApp.sendEmail(d.email, subject, buildVerifikasiPlainEmail(d, waLink, uploadLink), {
      htmlBody: buildVerifikasiHtmlEmail(d, waLink, uploadLink),
      name: CONFIG.EVENT_ORGANIZER,
      replyTo: CONFIG.REPLY_TO,
      cc: CONFIG.PANITIA_EMAIL,
    });
    return { success: true, reason: "Terkirim" };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

function buildVerifikasiHtmlEmail(d, waLink, uploadLink) {
  const waSection = waLink
    ? '<div style="margin:24px 0;text-align:center;">' +
      '<p style="color:#555;font-size:14px;margin:0 0 12px;">' +
      'Bergabunglah ke grup WhatsApp lomba <strong>' + d.cabang + '</strong> untuk informasi lebih lanjut:' +
      '</p>' +
      '<a href="' + waLink + '" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">' +
      'Gabung Grup WhatsApp ' + d.cabang + '</a></div>'
    : '';

  const uploadSection = uploadLink
    ? '<div style="margin:24px 0;text-align:center;background:#f8fafc;padding:20px;border-radius:8px;border:1px dashed #0f3460;">' +
      '<p style="color:#1a1a2e;font-size:15px;font-weight:600;margin:0 0 8px;">Upload Karya Lomba ' + d.cabang + '</p>' +
      '<p style="color:#555;font-size:13px;margin:0 0 16px;">Status pendaftaranmu telah dikonfirmasi. Silakan unggah karya lomba kamu melalui menu upload di website:</p>' +
      '<a href="' + uploadLink + '" style="display:inline-block;background:#0f3460;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">' +
      'Buka Halaman Upload Karya</a>' +
      '<p style="color:#888;font-size:12px;margin:12px 0 0;">Gunakan email terdaftar (<strong>' + d.email + '</strong>) saat melakukan upload.</p></div>'
    : '';

  return '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#f0f2f5;font-family:\'Segoe UI\',Arial,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:32px 0;"><tr><td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">' +
    '<tr><td style="background:linear-gradient(135deg,#1a1a2e,#0f3460);border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">' +
    '<h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">' + CONFIG.EVENT_NAME + '</h1>' +
    '<p style="margin:8px 0 0;color:#a0b4cc;font-size:14px;">' + CONFIG.EVENT_ORGANIZER + '</p>' +
    '</td></tr>' +
    '<tr><td style="background:#22c55e;padding:14px 40px;text-align:center;">' +
    '<p style="margin:0;color:#ffffff;font-size:15px;font-weight:600;">Pendaftaran & Pembayaran Dikonfirmasi ✓</p>' +
    '</td></tr>' +
    '<tr><td style="background:#ffffff;padding:36px 40px;border-radius:0 0 12px 12px;">' +
    '<p style="margin:0 0 6px;color:#1a1a2e;font-size:16px;">Halo, <strong>' + d.nama + '</strong>!</p>' +
    '<p style="margin:0 0 24px;color:#555555;font-size:14px;line-height:1.7;">Pendaftaran untuk lomba <strong>' + d.cabang + '</strong> telah berhasil dikonfirmasi oleh panitia.</p>' +
    waSection + uploadSection +
    '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-top:24px;">' +
    '<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#92400e;">Catatan Penting</p>' +
    '<ul style="margin:0;padding-left:18px;color:#78350f;font-size:13px;line-height:1.9;">' +
    '<li>Simpan email ini sebagai bukti konfirmasi pendaftaran resmi.</li>' +
    '<li>Pantau informasi lomba melalui grup WhatsApp.</li>' +
    (uploadLink ? '<li>Unggah karya lomba melalui menu upload di website menggunakan email ini.</li>' : '') +
    '<li>Pertanyaan? Hubungi <a href="mailto:' + CONFIG.PANITIA_EMAIL + '" style="color:#0f3460;">' + CONFIG.PANITIA_EMAIL + '</a></li>' +
    '</ul></div>' +
    '<p style="margin:28px 0 0;color:#aaaaaa;font-size:12px;text-align:center;border-top:1px solid #f0f0f0;padding-top:20px;">Email ini dikirim otomatis oleh sistem ' + CONFIG.EVENT_NAME + '.</p>' +
    '</td></tr></table></td></tr></table></body></html>';
}

function buildVerifikasiPlainEmail(d, waLink, uploadLink) {
  let t = "Halo " + d.nama + ",\n\n";
  t += "Pendaftaran untuk lomba " + d.cabang + " di " + CONFIG.EVENT_NAME + " telah berhasil dikonfirmasi oleh panitia.\n\n";
  if (waLink) t += "Link Grup WhatsApp " + d.cabang + ":\n" + waLink + "\n\n";
  if (uploadLink) t += "Halaman Upload Karya:\n" + uploadLink + "\nGunakan email: " + d.email + "\n\n";
  t += "Salam,\n" + CONFIG.EVENT_ORGANIZER;
  return t;
}

// ----------------------------------------------------------------
//  API CEK KELAYAKAN EMAIL (doGet)
// ----------------------------------------------------------------

function doGet(e) {
  try {
    const email = (e.parameter.email || "").trim().toLowerCase();
    const cabangParam = (e.parameter.cabang || "").trim();

    if (!email) {
      return jsonResponse({ allowed: false, reason: "Masukkan alamat email Anda yang terdaftar." });
    }

    const ss = SpreadsheetApp.openById(CONFIG.sheetId());

    var rekapSheet = ss.getSheetByName("Data Peserta");
    var foundRow = null;

    if (rekapSheet && rekapSheet.getLastRow() > 1) {
      var rHeaders = rekapSheet.getRange(1, 1, 1, rekapSheet.getLastColumn()).getValues()[0];
      var emailIdx = rHeaders.indexOf("Email");
      var cabangIdx = rHeaders.indexOf("Cabang");
      var statusIdx = rHeaders.indexOf("Status");
      var uploadStatusIdx = rHeaders.indexOf("Status Upload");
      var namaIdx = rHeaders.indexOf("Nama");

      if (emailIdx >= 0) {
        var rData = rekapSheet.getRange(2, 1, rekapSheet.getLastRow() - 1, rekapSheet.getLastColumn()).getValues();
        for (var i = 0; i < rData.length; i++) {
          var rowEmail = (rData[i][emailIdx] || "").toString().trim().toLowerCase();
          var rowCabang = cabangIdx >= 0 ? (rData[i][cabangIdx] || "").toString().trim() : "";

          if (rowEmail === email && (!cabangParam || rowCabang.toLowerCase() === cabangParam.toLowerCase())) {
            var status = statusIdx >= 0 ? (rData[i][statusIdx] || "").toString().trim() : "";
            var uploadStatus = uploadStatusIdx >= 0 ? (rData[i][uploadStatusIdx] || "").toString().trim() : "";
            var nama = namaIdx >= 0 ? (rData[i][namaIdx] || "").toString().trim() : "";

            foundRow = {
              email: email,
              cabang: rowCabang,
              nama: nama,
              status: status,
              uploadStatus: uploadStatus
            };
            break;
          }
        }
      }
    }

    if (!foundRow) {
      for (var bName in LOMBA_SHEETS) {
        if (cabangParam && bName.toLowerCase() !== cabangParam.toLowerCase()) continue;
        var cSheet = ss.getSheetByName(bName);
        if (cSheet && cSheet.getLastRow() > 1) {
          var cHeaders = cSheet.getRange(1, 1, 1, cSheet.getLastColumn()).getValues()[0];
          var cEmailIdx = cHeaders.indexOf("Email");
          var cStatusIdx = cHeaders.indexOf("Status");
          var cUploadStatusIdx = cHeaders.indexOf("Status Upload");
          var cNamaIdx = cHeaders.indexOf("Nama");

          if (cEmailIdx >= 0) {
            var cData = cSheet.getRange(2, 1, cSheet.getLastRow() - 1, cSheet.getLastColumn()).getValues();
            for (var j = 0; j < cData.length; j++) {
              var eVal = (cData[j][cEmailIdx] || "").toString().trim().toLowerCase();
              if (eVal === email) {
                foundRow = {
                  email: email,
                  cabang: bName,
                  nama: cNamaIdx >= 0 ? (cData[j][cNamaIdx] || "").toString().trim() : "",
                  status: cStatusIdx >= 0 ? (cData[j][cStatusIdx] || "").toString().trim() : "",
                  uploadStatus: cUploadStatusIdx >= 0 ? (cData[j][cUploadStatusIdx] || "").toString().trim() : ""
                };
                break;
              }
            }
          }
        }
        if (foundRow) break;
      }
    }

    if (!foundRow) {
      return jsonResponse({ allowed: false, reason: "Email '" + email + "' belum terdaftar di lomba IT Days." });
    }

    var cfg = LOMBA_SHEETS[foundRow.cabang];
    if (!cfg || !cfg.uploadCols || cfg.uploadCols.length === 0) {
      return jsonResponse({ allowed: false, reason: "Cabang lomba '" + foundRow.cabang + "' tidak memerlukan upload karya." });
    }

    if (foundRow.uploadStatus === "SUDAH") {
      return jsonResponse({ allowed: false, reason: "Anda sudah berhasil melakukan upload karya untuk cabang " + foundRow.cabang + "." });
    }

    return jsonResponse({
      allowed: true,
      email: foundRow.email,
      nama: foundRow.nama,
      cabang: foundRow.cabang,
      fields: cfg.uploadCols
    });

  } catch (err) {
    return jsonResponse({ allowed: false, reason: "Terjadi kesalahan server: " + err.message });
  }
}

// ----------------------------------------------------------------
//  HELPER & UTILITIES
// ----------------------------------------------------------------

function sendJson(code, data) {
  data._status = code;
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaderRow(sheet, headers.length);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function formatHeaderRow(sheet, colCount) {
  const range = sheet.getRange(1, 1, 1, colCount);
  range.setBackground("#1a1a2e")
       .setFontColor("#ffffff")
       .setFontWeight("bold")
       .setHorizontalAlignment("center");
}

function formatDataRow(sheet, row, colCount) {
  const range = sheet.getRange(row, 1, 1, colCount);
  range.setFontFamily("Segoe UI");
  range.setFontSize(10);
  if (row % 2 === 0) {
    range.setBackground("#f8fafc");
  }
}

function appendLog(sheet, d, lombaRow, emailResult) {
  const nextRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(nextRow, 1, 1, LOG_HEADERS.length).setValues([[
    new Date().toLocaleString("id-ID"),
    d.nama,
    d.email,
    d.cabang,
    lombaRow,
    emailResult.success ? "Terkirim" : "Gagal",
    emailResult.reason || "-",
  ]]);
}

// ----------------------------------------------------------------
//  ADMIN MENU & TRIGGER HELPERS
// ----------------------------------------------------------------

function setupSemuaSheets() {
  const ss = SpreadsheetApp.openById(CONFIG.sheetId());
  getOrCreateSheet(ss, "Data Peserta", REKAP_HEADERS);
  getOrCreateSheet(ss, "Log Email", LOG_HEADERS);
  Object.values(LOMBA_SHEETS).forEach(cfg => getOrCreateLombaSheet(ss, cfg));

  SpreadsheetApp.getUi().alert("Setup Semua Sheet Selesai!");
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("IT Days Admin")
    .addItem("Setup Semua Sheet", "setupSemuaSheets")
    .addToUi();
}

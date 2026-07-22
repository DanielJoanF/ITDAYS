// ================================================================
//  IT DAYS — Google Apps Script (v3.1 - Fixed & Synchronized)
//  - Data masuk ke sheet per cabang lomba & Data Peserta (Rekap)
//  - Verifikasi Admin: "Terdaftar" / "Terbayar" / "Terverifikasi" / "Lunas"
//  - Pengiriman Email Verifikasi + Link WhatsApp + Link /upload
//  - Sinkronisasi otomatis dua arah antar-sheet & update status upload
// ================================================================

// ----------------------------------------------------------------
//  KONFIGURASI — sesuaikan bagian ini
// ----------------------------------------------------------------

const CONFIG = {
  EVENT_NAME:      "IT Days 2026",
  EVENT_ORGANIZER: "Panitia IT Days 2026",
  PANITIA_EMAIL:   "usditdays@gmail.com",
  REPLY_TO:        "usditdays@gmail.com",
  WEBSITE_URL:     "https://itdays-usd.com", // Base URL website untuk link /upload

  // Link grup WhatsApp per cabang — ganti dengan link asli
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

// Folder ID di Google Drive untuk menyimpan file upload (opsional)
// Biarkan kosong untuk menyimpan di Root Google Drive
const DRIVE_FOLDER_ID = "";

// ----------------------------------------------------------------
//  NAMA KOLOM GOOGLE FORM / PAYLOAD
// ----------------------------------------------------------------

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

// ----------------------------------------------------------------
//  KOLOM SHEET
// ----------------------------------------------------------------

// Kolom dasar di semua sheet cabang
const BASE_COLS = ["No", "Timestamp", "Nama", "Email", "No. WA", "Instansi"];
const END_COLS  = ["KTM", "Bukti Bayar", "Status", "Email Terkirim", "Status Upload"];

// Definisi sheet dan kolom tambahan per cabang
const LOMBA_SHEETS = {
  "Badminton": {
    sheetName: "Badminton",
    extraCols: ["Nama Tim", "Anggota (2 Orang)"],
    fillExtra: (d) => [d.namaTim, d.anggota],
    uploadCols: [],
  },
  "Futsal": {
    sheetName: "Futsal",
    extraCols: ["Nama Tim", "Anggota (10-12 Orang)", "Official 1", "Official 2"],
    fillExtra: (d) => [d.namaTim, d.anggota, d.official1, d.official2],
    uploadCols: [],
  },
  "Mobile Legends": {
    sheetName: "Mobile Legends",
    extraCols: ["Nama Tim", "Anggota (5-7 Orang)", "ID Game Kapten", "Nickname Kapten"],
    fillExtra: (d) => [d.namaTim, d.anggota, d.idGame, d.nickname],
    uploadCols: [],
  },
  "PUBG": {
    sheetName: "PUBG",
    extraCols: ["Nama Tim", "Anggota (4-5 Orang)", "ID Game Kapten", "Nickname Kapten"],
    fillExtra: (d) => [d.namaTim, d.anggota, d.idGame, d.nickname],
    uploadCols: [],
  },
  "UI/UX": {
    sheetName: "UI/UX",
    extraCols: ["Nama Tim", "Anggota (2-3 Orang)"],
    fillExtra: (d) => [d.namaTim, d.anggota],
    uploadCols: ["Link Figma"],
  },
  "Web Dev": {
    sheetName: "Web Dev",
    extraCols: ["Nama Tim", "Anggota (2-3 Orang)"],
    fillExtra: (d) => [d.namaTim, d.anggota],
    uploadCols: ["Link GitHub", "Link Drive PPT"],
  },
  "Poster": {
    sheetName: "Poster",
    extraCols: [],
    fillExtra: (d) => [],
    uploadCols: ["Link Drive Poster"],
  },
  "Vocal": {
    sheetName: "Vocal",
    extraCols: [],
    fillExtra: (d) => [],
    uploadCols: [],
  },
};

// Header sheet rekap semua peserta (Data Peserta) - Ter-synchronize dengan END_COLS
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

// Helper: Memeriksa apakah status verifikasi admin tergolong Lolos / Terdaftar / Terbayar
function isStatusVerified(status) {
  if (!status) return false;
  const s = status.toString().trim().toLowerCase();
  return s === "terdaftar" || s === "terbayar" || s === "terverifikasi" || s === "verified" || s === "lunas";
}

// ----------------------------------------------------------------
//  HTTP POST HANDLER (UNTUK AJAX FRONTEND)
// ----------------------------------------------------------------

function doPost(e) {
  try {
    let data;
    if (e.parameter && e.parameter.payload) {
      data = JSON.parse(e.parameter.payload);
    } else if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      throw new Error("Tidak ada data yang diterima (parameter maupun postData kosong).");
    }

    let folder;
    if (DRIVE_FOLDER_ID) {
      folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    } else {
      folder = DriveApp.getRootFolder();
    }

    function uploadFile(fileData) {
      if (fileData && typeof fileData === 'object' && fileData.data) {
        const decodedData = Utilities.base64Decode(fileData.data);
        const blob = Utilities.newBlob(decodedData, fileData.type, fileData.name);
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return file.getUrl();
      }
      return fileData || "";
    }

    // ── Percabangan action: upload karya ──
    if (data.action === "upload") {
      return handleUploadKarya(data);
    }

    // Upload KTM & Bukti bayar
    data[COL.KTM] = uploadFile(data[COL.KTM]);
    data[COL.BUKTI_BAYAR] = uploadFile(data[COL.BUKTI_BAYAR]);
    
    const namedValues = {};
    for (const key in data) {
      namedValues[key] = [data[key]];
    }
    
    onFormSubmit({ namedValues: namedValues });
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    Logger.log("ERROR di doPost: " + err.message);
    try {
      GmailApp.sendEmail(
        CONFIG.PANITIA_EMAIL,
        "[ERROR] IT Days - Gagal memproses POST request",
        "Error: " + err.message + "\n\nStack:\n" + err.stack
      );
    } catch (mailErr) {}
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ----------------------------------------------------------------
//  TRIGGER UTAMA SAAT FORM SUBMIT / REGISTRASI
// ----------------------------------------------------------------

function onFormSubmit(e) {
  try {
    const d = extractFormData(e.namedValues);

    // 1. Tulis ke sheet lomba yang sesuai
    const cfg = LOMBA_SHEETS[d.cabang];
    let lombaRow = "-";
    if (cfg) {
      const lombaSheet = getOrCreateLombaSheet(cfg);
      lombaRow = appendToLombaSheet(lombaSheet, cfg, d);
    }

    // 2. Tulis ke rekap semua peserta (Data Peserta)
    const rekapSheet = getOrCreateSheet("Data Peserta", REKAP_HEADERS);
    appendToRekap(rekapSheet, d);

    // 3. Catat log (email belum dikirim — menunggu verifikasi admin)
    const emailResult = { success: true, reason: "Menunggu verifikasi admin" };
    const logSheet = getOrCreateSheet("Log Email", LOG_HEADERS);
    appendLog(logSheet, d, lombaRow, emailResult);

  } catch (err) {
    Logger.log("ERROR onFormSubmit: " + err.message);
    GmailApp.sendEmail(
      CONFIG.PANITIA_EMAIL,
      "[ERROR] IT Days - Gagal proses pendaftaran",
      "Error: " + err.message + "\n\nStack:\n" + err.stack
    );
  }
}

// ----------------------------------------------------------------
//  EKSTRAK DATA DARI FORM / PAYLOAD
// ----------------------------------------------------------------

function extractFormData(responses) {
  function get(key) {
    const val = responses[key];
    return val ? val[0].trim() : "";
  }
  return {
    timestamp:   get(COL.TIMESTAMP) || new Date().toLocaleString("id-ID"),
    nama:        get(COL.NAMA),
    email:       get(COL.EMAIL),
    noHp:        get(COL.NO_HP),
    instansi:    get(COL.INSTANSI),
    kategori:    get(COL.KATEGORI),
    cabang:      get(COL.CABANG),
    namaTim:     get(COL.NAMA_TIM),
    anggota:     get(COL.ANGGOTA),
    idGame:      get(COL.ID_GAME),
    nickname:    get(COL.NICKNAME),
    official1:   get(COL.OFFICIAL_1),
    official2:   get(COL.OFFICIAL_2),
    figmaLink:   get(COL.FIGMA_LINK),
    githubLink:  get(COL.GITHUB_LINK),
    drivePpt:    get(COL.DRIVE_PPT),
    drivePoster: get(COL.DRIVE_POSTER),
    ktm:         get(COL.KTM),
    buktiByar:   get(COL.BUKTI_BAYAR),
  };
}

// ----------------------------------------------------------------
//  TULIS KE SHEET LOMBA
// ----------------------------------------------------------------

function getOrCreateLombaSheet(cfg) {
  const headers = [...BASE_COLS, ...cfg.extraCols, ...(cfg.uploadCols || []), ...END_COLS];
  return getOrCreateSheet(cfg.sheetName, headers);
}

function appendToLombaSheet(sheet, cfg, d) {
  const lastRow = sheet.getLastRow();
  const no = lastRow; // baris 1 = header

  const hasUpload = cfg.uploadCols && cfg.uploadCols.length > 0;
  const row = [
    no,
    d.timestamp,
    d.nama,
    d.email,
    d.noHp,
    d.instansi,
    ...cfg.fillExtra(d),
    ...(cfg.uploadCols || []).map(() => ""),
    d.ktm,
    d.buktiByar,
    "Menunggu Verifikasi",
    "Menunggu",
    hasUpload ? "BELUM" : "-",
  ];

  sheet.appendRow(row);
  const newRow = sheet.getLastRow();
  formatDataRow(sheet, newRow, row.length);
  setSheetHyperlinks(sheet, newRow, cfg, d);

  return newRow;
}

function setSheetHyperlinks(sheet, row, cfg, d) {
  const totalCols = [...BASE_COLS, ...cfg.extraCols, ...(cfg.uploadCols || []), ...END_COLS].length;
  const headers = sheet.getRange(1, 1, 1, totalCols).getValues()[0];

  function setLink(colName, url, label) {
    const idx = headers.indexOf(colName);
    if (idx >= 0 && url && url.indexOf("http") === 0) {
      sheet.getRange(row, idx + 1).setFormula(`=HYPERLINK("${url}","${label}")`);
    }
  }

  setLink("Link Figma",        d.figmaLink,   "Buka Figma");
  setLink("Link GitHub",       d.githubLink,  "Buka GitHub");
  setLink("Link Drive PPT",    d.drivePpt,    "Buka Drive");
  setLink("Link Drive Poster", d.drivePoster, "Buka Drive");
  setLink("KTM",               d.ktm,         "Lihat KTM");
  setLink("Bukti Bayar",       d.buktiByar,   "Lihat Bukti");
}

// ----------------------------------------------------------------
//  TULIS KE SHEET REKAP (Data Peserta)
// ----------------------------------------------------------------

function appendToRekap(sheet, d) {
  const lastRow = sheet.getLastRow();
  const cfg = LOMBA_SHEETS[d.cabang];
  const hasUpload = cfg && cfg.uploadCols && cfg.uploadCols.length > 0;

  sheet.appendRow([
    lastRow,
    d.timestamp, d.nama, d.email, d.noHp, d.instansi,
    d.kategori, d.cabang, d.namaTim, d.anggota,
    d.idGame, d.nickname, d.official1, d.official2,
    d.figmaLink, d.githubLink,
    d.drivePpt, d.drivePoster,
    d.ktm, d.buktiByar,
    "Menunggu Verifikasi", "Menunggu",
    hasUpload ? "BELUM" : "-"
  ]);
  const newRow = sheet.getLastRow();
  formatDataRow(sheet, newRow, REKAP_HEADERS.length);
}

// ----------------------------------------------------------------
//  SINKRONISASI STATUS & EMAIL DUA ARAH (Data Peserta <-> Sheet Cabang)
// ----------------------------------------------------------------

function syncRowStatus(ss, email, newStatus, newEmailStatus) {
  if (!email) return;
  const sheets = ss.getSheets();
  sheets.forEach(sh => {
    const sheetName = sh.getName();
    if (sheetName === "Log Email") return;
    if (sh.getLastRow() <= 1) return;

    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const emailIdx = headers.indexOf("Email");
    const statusIdx = headers.indexOf("Status");
    const emailSentIdx = headers.indexOf("Email Terkirim");

    if (emailIdx >= 0) {
      const data = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
      for (let i = 0; i < data.length; i++) {
        const rowEmail = (data[i][emailIdx] || "").toString().trim().toLowerCase();
        if (rowEmail === email.toLowerCase()) {
          const r = i + 2;
          if (statusIdx >= 0 && newStatus) {
            sh.getRange(r, statusIdx + 1).setValue(newStatus);
          }
          if (emailSentIdx >= 0 && newEmailStatus) {
            sh.getRange(r, emailSentIdx + 1).setValue(newEmailStatus);
          }
          break;
        }
      }
    }
  });
}

// ----------------------------------------------------------------
//  TRIGGER onEdit — KIRIM EMAIL SETELAH ADMIN VERIFIKASI STATUS
// ----------------------------------------------------------------

function onEdit(e) {
  try {
    if (!e || !e.source || !e.range) return;
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusColIdx = headers.indexOf("Status");

    // Hanya proses jika kolom "Status" yang diubah
    if (statusColIdx < 0 || range.getColumn() !== statusColIdx + 1) return;
    
    const newStatusValue = range.getValue();
    if (!isStatusVerified(newStatusValue)) return;

    const row = range.getRow();
    if (row <= 1) return; // skip header

    const emailSentColIdx = headers.indexOf("Email Terkirim");
    if (emailSentColIdx >= 0 && sheet.getRange(row, emailSentColIdx + 1).getValue() === "Terkirim") {
      // Sudah pernah terkirim, tidak kirim ulang secara otomatis
      return;
    }

    // Ambil data dari baris
    const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    const email = (values[headers.indexOf("Email")] || "").toString().trim();
    const nama = (values[headers.indexOf("Nama")] || "").toString().trim();
    
    // Tentukan cabang (jika di sheet Data Peserta, ambil dari kolom Cabang)
    let cabang = sheet.getName();
    const cabangColIdx = headers.indexOf("Cabang");
    if (cabangColIdx >= 0 && values[cabangColIdx]) {
      cabang = values[cabangColIdx].toString().trim();
    }

    if (!email || !cabang) return;

    // Cek konfigurasi cabang & fitur upload
    const cfg = LOMBA_SHEETS[cabang];
    const hasUpload = cfg && cfg.uploadCols && cfg.uploadCols.length > 0;
    const waLink = CONFIG.WA_LINKS[cabang] || null;

    const baseUrl = CONFIG.WEBSITE_URL || "https://itdays-usd.com";
    const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
    const uploadLink = hasUpload
      ? cleanBaseUrl + "/upload?email=" + encodeURIComponent(email) + "&cabang=" + encodeURIComponent(cabang)
      : null;

    // Kirim email verifikasi (lengkap dengan WA & link /upload)
    const result = sendVerifikasiEmail({ nama: nama, email: email, cabang: cabang }, waLink, uploadLink);

    const emailStatusText = result.success ? "Terkirim" : "Gagal: " + result.reason;
    
    // Update status di sheet saat ini & sinkronkan ke sheet lain
    syncRowStatus(e.source, email, newStatusValue, emailStatusText);

    // Catat ke Log Email
    const logSheet = getOrCreateSheet("Log Email", LOG_HEADERS);
    appendLog(logSheet, { nama: nama, email: email, cabang: cabang }, row, result);

  } catch (err) {
    Logger.log("ERROR onEdit: " + err.message);
  }
}

// ----------------------------------------------------------------
//  KIRIM EMAIL VERIFIKASI (SETELAH ADMIN VERIFIKASI STATUS)
// ----------------------------------------------------------------

function sendVerifikasiEmail(d, waLink, uploadLink) {
  if (!d.email) return { success: false, reason: "Email kosong" };

  const subject = "Pendaftaran Dikonfirmasi - " + CONFIG.EVENT_NAME + " (" + d.cabang + ")";

  try {
    const htmlBody = buildVerifikasiHtmlEmail(d, waLink, uploadLink);
    const plainBody = buildVerifikasiPlainEmail(d, waLink, uploadLink);

    GmailApp.sendEmail(d.email, subject, plainBody, {
      htmlBody: htmlBody,
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
      '<a href="' + waLink + '"' +
      ' style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;' +
      'padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">' +
      'Gabung Grup WhatsApp ' + d.cabang +
      '</a></div>'
    : '';

  const uploadSection = uploadLink
    ? '<div style="margin:24px 0;text-align:center;background:#f8fafc;padding:20px;border-radius:8px;border:1px dashed #0f3460;">' +
      '<p style="color:#1a1a2e;font-size:15px;font-weight:600;margin:0 0 8px;">' +
      'Upload Karya Lomba ' + d.cabang +
      '</p>' +
      '<p style="color:#555;font-size:13px;margin:0 0 16px;">' +
      'Status pendaftaranmu telah dikonfirmasi. Silakan unggah karya lomba kamu melalui tombol berikut:' +
      '</p>' +
      '<a href="' + uploadLink + '"' +
      ' style="display:inline-block;background:#0f3460;color:#ffffff;text-decoration:none;' +
      'padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">' +
      'Upload Karya Sekarang' +
      '</a>' +
      '<p style="color:#888;font-size:12px;margin:12px 0 0;word-break:break-all;">' +
      'atau gunakan link: <a href="' + uploadLink + '" style="color:#0f3460;">' + uploadLink + '</a>' +
      '</p></div>'
    : '';

  return '<!DOCTYPE html>' +
    '<html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
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
    '<p style="margin:0 0 24px;color:#555555;font-size:14px;line-height:1.7;">' +
    'Pendaftaran dan pembayaran untuk lomba <strong>' + d.cabang + '</strong> di <strong>' + CONFIG.EVENT_NAME + '</strong> telah berhasil dikonfirmasi oleh panitia.' +
    '</p>' +
    waSection +
    uploadSection +
    '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-top:24px;">' +
    '<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#92400e;">Catatan Penting</p>' +
    '<ul style="margin:0;padding-left:18px;color:#78350f;font-size:13px;line-height:1.9;">' +
    '<li>Simpan email ini sebagai bukti konfirmasi pendaftaran resmi.</li>' +
    '<li>Pantau informasi dan pengumuman lomba melalui grup WhatsApp.</li>' +
    (uploadLink ? '<li>Segera upload karya lomba melalui tombol / link upload di atas sebelum tenggat waktu.</li>' : '') +
    '<li>Ada pertanyaan? Hubungi panitia via email <a href="mailto:' + CONFIG.PANITIA_EMAIL + '" style="color:#0f3460;">' + CONFIG.PANITIA_EMAIL + '</a></li>' +
    '</ul></div>' +
    '<p style="margin:28px 0 0;color:#aaaaaa;font-size:12px;text-align:center;border-top:1px solid #f0f0f0;padding-top:20px;">' +
    'Email ini dikirim secara otomatis oleh sistem ' + CONFIG.EVENT_NAME + '.' +
    '</p></td></tr></table></td></tr></table></body></html>';
}

function buildVerifikasiPlainEmail(d, waLink, uploadLink) {
  var t = "Halo " + d.nama + ",\n\n";
  t += "Pendaftaran dan pembayaran untuk lomba " + d.cabang + " di " + CONFIG.EVENT_NAME + " telah berhasil dikonfirmasi oleh panitia.\n\n";
  if (waLink) t += "Link Grup WhatsApp " + d.cabang + ":\n" + waLink + "\n\n";
  if (uploadLink) t += "Link Upload Karya:\n" + uploadLink + "\n\n";
  t += "Simpan email ini sebagai bukti konfirmasi resmi.\n";
  t += "Pertanyaan? Hubungi: " + CONFIG.REPLY_TO + "\n\n";
  t += "Salam,\n" + CONFIG.EVENT_ORGANIZER;
  return t;
}

// ----------------------------------------------------------------
//  EMAIL KONFIRMASI PENDAFTARAN AWAL (KIRIM ULANG MANUAL)
// ----------------------------------------------------------------

function sendKonfirmasiEmail(d) {
  if (!d.email) return { success: false, reason: "Email kosong" };
  const waLink = CONFIG.WA_LINKS[d.cabang] || null;
  const subject = `Konfirmasi Pendaftaran ${CONFIG.EVENT_NAME} - ${d.cabang}`;

  try {
    GmailApp.sendEmail(d.email, subject, buildPlainEmail(d, waLink), {
      htmlBody: buildHtmlEmail(d, waLink),
      name:     CONFIG.EVENT_ORGANIZER,
      replyTo:  CONFIG.REPLY_TO,
      cc:       CONFIG.PANITIA_EMAIL,
    });
    return { success: true, reason: "Terkirim" };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

function buildHtmlEmail(d, waLink) {
  const summaryRows = buildSummaryRows(d);
  const waSection = waLink
    ? `<div style="margin:24px 0;text-align:center;">
        <p style="color:#555;font-size:14px;margin:0 0 12px;">
          Bergabunglah ke grup WhatsApp lomba <strong>${d.cabang}</strong> untuk informasi lebih lanjut:
        </p>
        <a href="${waLink}"
           style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;
                  padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">
          Gabung Grup WhatsApp ${d.cabang}
        </a>
       </div>`
    : `<p style="color:#888;font-size:13px;text-align:center;">
         Link grup WhatsApp akan segera dikirimkan oleh panitia.
       </p>`;

  return `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:linear-gradient(135deg,#1a1a2e,#0f3460);border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">${CONFIG.EVENT_NAME}</h1>
    <p style="margin:8px 0 0;color:#a0b4cc;font-size:14px;">${CONFIG.EVENT_ORGANIZER}</p>
  </td></tr>
  <tr><td style="background:#22c55e;padding:14px 40px;text-align:center;">
    <p style="margin:0;color:#ffffff;font-size:15px;font-weight:600;">Pendaftaran Berhasil Diterima</p>
  </td></tr>
  <tr><td style="background:#ffffff;padding:36px 40px;border-radius:0 0 12px 12px;">
    <p style="margin:0 0 6px;color:#1a1a2e;font-size:16px;">Halo, <strong>${d.nama}</strong>!</p>
    <p style="margin:0 0 24px;color:#555555;font-size:14px;line-height:1.7;">
      Terima kasih telah mendaftar di <strong>${CONFIG.EVENT_NAME}</strong>.
      Berikut ringkasan data pendaftaranmu:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8ecf0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background:#f8fafc;">
        <td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e8ecf0;">
          Detail Pendaftaran
        </td>
      </tr>
      ${summaryRows}
    </table>
    ${waSection}
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-top:24px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#92400e;">Catatan Penting</p>
      <ul style="margin:0;padding-left:18px;color:#78350f;font-size:13px;line-height:1.9;">
        <li>Simpan email ini sebagai bukti pendaftaran.</li>
        <li>Pantau informasi lomba melalui grup WhatsApp.</li>
        <li>Pertanyaan? Hubungi panitia di <a href="mailto:${CONFIG.PANITIA_EMAIL}" style="color:#0f3460;">${CONFIG.PANITIA_EMAIL}</a></li>
      </ul>
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildSummaryRows(d) {
  const rows = [];
  function row(label, value, highlight) {
    if (!value) return;
    const bg = highlight ? "background:#f0f9ff;" : "";
    rows.push(`
      <tr>
        <td style="padding:10px 16px;font-size:13px;color:#6b7280;width:38%;border-bottom:1px solid #f3f4f6;${bg}">${label}</td>
        <td style="padding:10px 16px;font-size:13px;color:#1a1a2e;font-weight:500;border-bottom:1px solid #f3f4f6;${bg}">${value}</td>
      </tr>`);
  }
  function linkRow(label, url, linkText) {
    if (!url) return;
    rows.push(`
      <tr>
        <td style="padding:10px 16px;font-size:13px;color:#6b7280;width:38%;border-bottom:1px solid #f3f4f6;">${label}</td>
        <td style="padding:10px 16px;font-size:13px;border-bottom:1px solid #f3f4f6;">
          <a href="${url}" style="color:#0f3460;font-weight:500;">${linkText}</a>
        </td>
      </tr>`);
  }

  row("Tanggal Daftar", d.timestamp);
  row("Nama Lengkap",   d.nama,      true);
  row("Email",          d.email);
  row("No. WhatsApp",   d.noHp);
  row("Instansi",       d.instansi);
  row("Kategori",       d.kategori,  true);
  row("Cabang Lomba",   d.cabang,    true);

  if (d.namaTim)   row("Nama Tim",        d.namaTim, true);
  if (d.anggota)   row("Anggota Tim",     d.anggota.split(",").map(s => s.trim()).join("<br>"));
  if (d.idGame)    row("ID Game Kapten",  d.idGame);
  if (d.nickname)  row("Nickname Kapten", d.nickname);
  if (d.official1) row("Official 1",     d.official1);
  if (d.official2) row("Official 2",     d.official2);

  linkRow("Link Figma",         d.figmaLink,   "Lihat Project Figma");
  linkRow("Link GitHub",        d.githubLink,  "Lihat Repository");
  linkRow("Link Drive PPT",     d.drivePpt,    "Lihat File Presentasi");
  linkRow("Link Drive Poster",  d.drivePoster, "Lihat Poster");
  linkRow("Foto KTM",           d.ktm,         "Lihat KTM");
  linkRow("Bukti Pembayaran",   d.buktiByar,   "Lihat Bukti Bayar");

  return rows.join("");
}

function buildPlainEmail(d, waLink) {
  let t = `Halo ${d.nama},\n\n`;
  t += `Terima kasih telah mendaftar di ${CONFIG.EVENT_NAME}.\n\n`;
  t += `=== DETAIL PENDAFTARAN ===\n`;
  t += `Nama      : ${d.nama}\n`;
  t += `Email     : ${d.email}\n`;
  t += `No. WA    : ${d.noHp}\n`;
  t += `Instansi  : ${d.instansi}\n`;
  t += `Kategori  : ${d.kategori}\n`;
  t += `Cabang    : ${d.cabang}\n`;
  if (d.namaTim)    t += `Nama Tim  : ${d.namaTim}\n`;
  if (d.anggota)    t += `Anggota   : ${d.anggota}\n`;
  if (d.idGame)     t += `ID Game   : ${d.idGame}\n`;
  if (d.nickname)   t += `Nickname  : ${d.nickname}\n`;
  if (d.official1)  t += `Official 1: ${d.official1}\n`;
  if (d.official2)  t += `Official 2: ${d.official2}\n`;
  if (d.figmaLink)  t += `Figma     : ${d.figmaLink}\n`;
  if (d.githubLink) t += `GitHub    : ${d.githubLink}\n`;
  if (d.drivePpt)   t += `Drive PPT : ${d.drivePpt}\n`;
  if (d.drivePoster)t += `Poster    : ${d.drivePoster}\n`;
  if (d.ktm)        t += `Foto KTM  : ${d.ktm}\n`;
  if (d.buktiByar)  t += `Bukti     : ${d.buktiByar}\n`;
  t += `=========================\n\n`;
  if (waLink) t += `Link Grup WhatsApp ${d.cabang}:\n${waLink}\n\n`;
  t += `Simpan email ini sebagai bukti pendaftaran.\n`;
  t += `Pertanyaan? Hubungi: ${CONFIG.REPLY_TO}\n\n`;
  t += `Salam,\n${CONFIG.EVENT_ORGANIZER}`;
  return t;
}

// ----------------------------------------------------------------
//  doGet — API CEK STATUS ELIGIBILITY UPLOAD FOR FRONTEND REACT
// ----------------------------------------------------------------

function doGet(e) {
  try {
    var email = (e.parameter.email || "").trim();
    var cabang = (e.parameter.cabang || "").trim();

    if (!email || !cabang) {
      return jsonResponse({ allowed: false, reason: "Parameter email dan cabang wajib diisi." });
    }

    var cfg = LOMBA_SHEETS[cabang];
    if (!cfg) {
      return jsonResponse({ allowed: false, reason: "Cabang '" + cabang + "' tidak ditemukan." });
    }

    if (!cfg.uploadCols || cfg.uploadCols.length === 0) {
      return jsonResponse({ allowed: false, reason: "Cabang '" + cabang + "' tidak memiliki fitur upload karya." });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(cfg.sheetName);
    if (!sheet || sheet.getLastRow() <= 1) {
      return jsonResponse({ allowed: false, reason: "Data peserta tidak ditemukan." });
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var emailColIdx = headers.indexOf("Email");
    var statusColIdx = headers.indexOf("Status");
    var uploadStatusColIdx = headers.indexOf("Status Upload");

    if (emailColIdx < 0 || statusColIdx < 0 || uploadStatusColIdx < 0) {
      return jsonResponse({ allowed: false, reason: "Struktur sheet tidak valid." });
    }

    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    for (var i = 0; i < data.length; i++) {
      var rowEmail = (data[i][emailColIdx] || "").toString().trim().toLowerCase();
      if (rowEmail === email.toLowerCase()) {
        var status = (data[i][statusColIdx] || "").toString().trim();
        var uploadStatus = (data[i][uploadStatusColIdx] || "").toString().trim();

        if (!isStatusVerified(status)) {
          return jsonResponse({ allowed: false, reason: "Status pendaftaran belum dikonfirmasi oleh admin (Status saat ini: '" + (status || "Menunggu Verifikasi") + "')." });
        }
        if (uploadStatus === "SUDAH") {
          return jsonResponse({ allowed: false, reason: "Karya sudah pernah diupload sebelumnya." });
        }
        // allowed
        return jsonResponse({ allowed: true, fields: cfg.uploadCols });
      }
    }

    return jsonResponse({ allowed: false, reason: "Email tidak ditemukan pada cabang " + cabang + "." });
  } catch (err) {
    return jsonResponse({ allowed: false, reason: "Error: " + err.message });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ----------------------------------------------------------------
//  HANDLE UPLOAD KARYA (dari doPost action=upload)
// ----------------------------------------------------------------

function handleUploadKarya(data) {
  var email = (data.email || "").trim();
  var cabang = (data.cabang || "").trim();

  if (!email || !cabang) {
    return jsonResponse({ success: false, error: "Parameter email dan cabang wajib diisi." });
  }

  var cfg = LOMBA_SHEETS[cabang];
  if (!cfg || !cfg.uploadCols || cfg.uploadCols.length === 0) {
    return jsonResponse({ success: false, error: "Cabang tidak ditemukan atau tidak memiliki fitur upload." });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(cfg.sheetName);
  if (!sheet || sheet.getLastRow() <= 1) {
    return jsonResponse({ success: false, error: "Data peserta tidak ditemukan." });
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var emailColIdx = headers.indexOf("Email");
  var statusColIdx = headers.indexOf("Status");
  var uploadStatusColIdx = headers.indexOf("Status Upload");

  if (emailColIdx < 0 || statusColIdx < 0 || uploadStatusColIdx < 0) {
    return jsonResponse({ success: false, error: "Struktur sheet tidak valid." });
  }

  var allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  var targetRow = -1;

  for (var i = 0; i < allData.length; i++) {
    var rowEmail = (allData[i][emailColIdx] || "").toString().trim().toLowerCase();
    if (rowEmail === email.toLowerCase()) {
      var status = (allData[i][statusColIdx] || "").toString().trim();
      var uploadStatus = (allData[i][uploadStatusColIdx] || "").toString().trim();

      if (!isStatusVerified(status)) {
        return jsonResponse({ success: false, error: "Status pendaftaran belum dikonfirmasi." });
      }
      if (uploadStatus === "SUDAH") {
        return jsonResponse({ success: false, error: "Karya sudah pernah diupload." });
      }
      targetRow = i + 2;
      break;
    }
  }

  if (targetRow < 0) {
    return jsonResponse({ success: false, error: "Email tidak ditemukan di cabang " + cabang + "." });
  }

  // Mapping dari nama kolom sheet ke properti payload React
  var colMapping = {
    "Link Figma": "figma_link",
    "Link GitHub": "github_link",
    "Link Drive PPT": "presentation_drive_link",
    "Link Drive Poster": "poster_drive_link",
  };

  var linkLabels = {
    "Link Figma": "Buka Figma",
    "Link GitHub": "Buka GitHub",
    "Link Drive PPT": "Buka Drive",
    "Link Drive Poster": "Buka Drive",
  };

  // 1. Update di Sheet Cabang
  for (var c = 0; c < cfg.uploadCols.length; c++) {
    var colName = cfg.uploadCols[c];
    var colIdx = headers.indexOf(colName);
    if (colIdx >= 0) {
      var propName = colMapping[colName] || colName;
      var value = (data[propName] || data[colName] || "").toString().trim();
      sheet.getRange(targetRow, colIdx + 1).setValue(value);
      if (value && value.indexOf("http") === 0) {
        sheet.getRange(targetRow, colIdx + 1).setFormula('=HYPERLINK("' + value + '","' + (linkLabels[colName] || "Buka Link") + '")');
      }
    }
  }

  sheet.getRange(targetRow, uploadStatusColIdx + 1).setValue("SUDAH");

  // 2. Update di Sheet Data Peserta (Rekap) agar sinkron
  var rekapSheet = ss.getSheetByName("Data Peserta");
  if (rekapSheet && rekapSheet.getLastRow() > 1) {
    var rekapHeaders = rekapSheet.getRange(1, 1, 1, rekapSheet.getLastColumn()).getValues()[0];
    var rEmailIdx = rekapHeaders.indexOf("Email");
    var rUploadStatusIdx = rekapHeaders.indexOf("Status Upload");

    if (rEmailIdx >= 0) {
      var rekapData = rekapSheet.getRange(2, 1, rekapSheet.getLastRow() - 1, rekapSheet.getLastColumn()).getValues();
      for (var r = 0; r < rekapData.length; r++) {
        var rEmail = (rekapData[r][rEmailIdx] || "").toString().trim().toLowerCase();
        if (rEmail === email.toLowerCase()) {
          var targetRekapRow = r + 2;
          for (var k = 0; k < cfg.uploadCols.length; k++) {
            var cName = cfg.uploadCols[k];
            var rColIdx = rekapHeaders.indexOf(cName);
            if (rColIdx >= 0) {
              var pName = colMapping[cName] || cName;
              var val = (data[pName] || data[cName] || "").toString().trim();
              rekapSheet.getRange(targetRekapRow, rColIdx + 1).setValue(val);
              if (val && val.indexOf("http") === 0) {
                rekapSheet.getRange(targetRekapRow, rColIdx + 1).setFormula('=HYPERLINK("' + val + '","' + (linkLabels[cName] || "Buka Link") + '")');
              }
            }
          }
          if (rUploadStatusIdx >= 0) {
            rekapSheet.getRange(targetRekapRow, rUploadStatusIdx + 1).setValue("SUDAH");
          }
          break;
        }
      }
    }
  }

  return jsonResponse({ success: true });
}

// ----------------------------------------------------------------
//  LOGGING
// ----------------------------------------------------------------

function appendLog(logSheet, d, lombaRow, emailResult) {
  logSheet.appendRow([
    new Date().toLocaleString("id-ID"),
    d.nama || "-", d.email || "-", d.cabang || "-", lombaRow || "-",
    emailResult.success ? "Berhasil" : "Gagal",
    emailResult.reason || "-",
  ]);
}

// ----------------------------------------------------------------
//  HELPER: BUAT / AMBIL SHEET DENGAN STYLING
// ----------------------------------------------------------------

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  if (sheet.getLastRow() === 0) {
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setValues([headers]);
    range.setBackground("#1a1a2e");
    range.setFontColor("#ffffff");
    range.setFontWeight("bold");
    range.setFontSize(11);
    sheet.setFrozenRows(1);
    sheet.setRowHeight(1, 36);
    headers.forEach((_, i) => sheet.setColumnWidth(i + 1, 160));
  }

  return sheet;
}

function formatDataRow(sheet, row, totalCols) {
  sheet.getRange(row, 1, 1, totalCols).setVerticalAlignment("middle");
  if (row % 2 === 0) {
    sheet.getRange(row, 1, 1, totalCols).setBackground("#F8F9FA");
  }
}

// ----------------------------------------------------------------
//  FUNGSI MANUAL (MENU ADMIN SPREADSHEET)
// ----------------------------------------------------------------

function setupSemuaSheets() {
  getOrCreateSheet("Data Peserta", REKAP_HEADERS);
  getOrCreateSheet("Log Email",    LOG_HEADERS);
  Object.values(LOMBA_SHEETS).forEach(cfg => getOrCreateLombaSheet(cfg));

  SpreadsheetApp.getUi().alert(
    "Setup Selesai!\n\n" +
    "Sheet yang dibuat & divalidasi:\n" +
    "- Data Peserta (Rekap)\n" +
    "- Log Email\n" +
    "- Badminton, Futsal, Mobile Legends, PUBG, UI/UX, Web Dev, Poster, Vocal"
  );
}

function testKirimEmail() {
  const d = {
    nama: "Peserta Test",
    email: CONFIG.PANITIA_EMAIL,
    cabang: "UI/UX",
  };
  const waLink = CONFIG.WA_LINKS[d.cabang];
  const baseUrl = CONFIG.WEBSITE_URL || "https://itdays-usd.com";
  const uploadLink = baseUrl.replace(/\/+$/, "") + "/upload?email=" + encodeURIComponent(d.email) + "&cabang=" + encodeURIComponent(d.cabang);

  const result = sendVerifikasiEmail(d, waLink, uploadLink);
  SpreadsheetApp.getUi().alert(
    result.success
      ? "Email test verifikasi berhasil dikirim ke: " + d.email
      : "Gagal kirim email: " + result.reason
  );
}

function kirimUlangEmail() {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const sheet  = ss.getActiveSheet();
  const row    = sheet.getActiveRange().getRow();

  if (row <= 1) {
    SpreadsheetApp.getUi().alert("Pilih baris data peserta terlebih dahulu.");
    return;
  }

  const totalCols = sheet.getLastColumn();
  const headers   = sheet.getRange(1, 1, 1, totalCols).getValues()[0];
  const values    = sheet.getRange(row, 1, 1, totalCols).getValues()[0];

  function get(colName) {
    const idx = headers.indexOf(colName);
    return idx >= 0 ? (values[idx] || "").toString().trim() : "";
  }

  let cabang = sheet.getName();
  const cabangColIdx = headers.indexOf("Cabang");
  if (cabangColIdx >= 0 && values[cabangColIdx]) {
    cabang = values[cabangColIdx].toString().trim();
  }

  const email = get("Email");
  const nama = get("Nama");
  const status = get("Status");

  if (!email) {
    SpreadsheetApp.getUi().alert("Email peserta di baris ini kosong.");
    return;
  }

  const cfg = LOMBA_SHEETS[cabang];
  const hasUpload = cfg && cfg.uploadCols && cfg.uploadCols.length > 0;
  const waLink = CONFIG.WA_LINKS[cabang] || null;

  const baseUrl = CONFIG.WEBSITE_URL || "https://itdays-usd.com";
  const uploadLink = hasUpload
    ? baseUrl.replace(/\/+$/, "") + "/upload?email=" + encodeURIComponent(email) + "&cabang=" + encodeURIComponent(cabang)
    : null;

  let result;
  if (isStatusVerified(status)) {
    result = sendVerifikasiEmail({ nama: nama, email: email, cabang: cabang }, waLink, uploadLink);
  } else {
    result = sendKonfirmasiEmail({
      timestamp: get("Timestamp"),
      nama: nama,
      email: email,
      noHp: get("No. WA"),
      instansi: get("Instansi"),
      kategori: get("Kategori"),
      cabang: cabang,
      namaTim: get("Nama Tim"),
      anggota: get("Anggota"),
      idGame: get("ID Game Kapten"),
      nickname: get("Nickname Kapten"),
      official1: get("Official 1"),
      official2: get("Official 2"),
      figmaLink: get("Link Figma"),
      githubLink: get("Link GitHub"),
      drivePpt: get("Link Drive PPT"),
      drivePoster: get("Link Drive Poster"),
      ktm: get("KTM"),
      buktiByar: get("Bukti Bayar"),
    });
  }

  const emailStatusText = result.success ? "Terkirim" : "Gagal: " + result.reason;
  syncRowStatus(ss, email, null, emailStatusText);

  SpreadsheetApp.getUi().alert(
    result.success
      ? "Email berhasil dikirim ulang ke: " + email
      : "Gagal: " + result.reason
  );
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("IT Days Admin")
    .addItem("Setup Semua Sheet", "setupSemuaSheets")
    .addSeparator()
    .addItem("Test Kirim Email Verifikasi", "testKirimEmail")
    .addItem("Kirim Ulang Email (baris terpilih)", "kirimUlangEmail")
    .addToUi();
}

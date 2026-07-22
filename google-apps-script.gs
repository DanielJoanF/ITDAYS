// ================================================================
//  IT DAYS — Google Apps Script (v3.2 - Fully Synchronized & Installed Trigger)
//  - Multi-sheet synchronization (Data Peserta <-> Cabang Lomba)
//  - Header-based Cell Mapping (Aman meskipun urutan kolom di sheet berubah)
//  - Verifikasi Admin ("Terdaftar", "Terbayar", "Terverifikasi", "Lunas")
//  - Verifikasi Email langsung di /upload (tanpa query params URL)
//  - Installed Trigger untuk mengatasi permission error GmailApp.sendEmail
// ================================================================

// ----------------------------------------------------------------
//  KONFIGURASI
// ----------------------------------------------------------------

const CONFIG = {
  EVENT_NAME:      "IT Days 2026",
  EVENT_ORGANIZER: "Panitia IT Days 2026",
  PANITIA_EMAIL:   "usditdays@gmail.com",
  REPLY_TO:        "usditdays@gmail.com",
  WEBSITE_URL:     "https://itdays-usd.com", // Base URL website untuk link /upload

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

const DRIVE_FOLDER_ID = "";

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
//  SMART HEADER-BASED WRITER
// ----------------------------------------------------------------

/**
 * Menulis / meng-update data ke baris sheet berdasarkan NAMA KOLOM HEADER
 * Mencegah data tertukar meskipun urutan kolom di Google Sheet bergeser.
 */
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
      throw new Error("Tidak ada data yang diterima.");
    }

    let folder = DRIVE_FOLDER_ID ? DriveApp.getFolderById(DRIVE_FOLDER_ID) : DriveApp.getRootFolder();

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

    if (data.action === "upload") {
      return handleUploadKarya(data);
    }

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
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ----------------------------------------------------------------
//  REGISTRASI FORM SUBMIT
// ----------------------------------------------------------------

function onFormSubmit(e) {
  try {
    const d = extractFormData(e.namedValues);

    const cfg = LOMBA_SHEETS[d.cabang];
    let lombaRow = "-";
    if (cfg) {
      const lombaSheet = getOrCreateLombaSheet(cfg);
      lombaRow = appendToLombaSheet(lombaSheet, cfg, d);
    }

    const rekapSheet = getOrCreateSheet("Data Peserta", REKAP_HEADERS);
    appendToRekap(rekapSheet, d);

    const emailResult = { success: true, reason: "Menunggu verifikasi admin" };
    const logSheet = getOrCreateSheet("Log Email", LOG_HEADERS);
    appendLog(logSheet, d, lombaRow, emailResult);

  } catch (err) {
    Logger.log("ERROR onFormSubmit: " + err.message);
  }
}

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

function getOrCreateLombaSheet(cfg) {
  const headers = [...BASE_COLS, ...cfg.extraCols, ...(cfg.uploadCols || []), ...END_COLS];
  return getOrCreateSheet(cfg.sheetName, headers);
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
    "Status": "Menunggu Verifikasi",
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
    "Status": "Menunggu Verifikasi",
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

// ----------------------------------------------------------------
//  TRIGGER INSTALLED ON EDIT (MENANGANI GMAIL PERMISSIONS)
// ----------------------------------------------------------------

/**
 * Trigger terpasang yang memiliki izin penuh untuk menjalankan GmailApp.sendEmail
 */
function installedOnEdit(e) {
  handleEditEvent(e);
}

/**
 * Simple Trigger fallback (apabila belum di-install sebagai Installed Trigger)
 */
function onEdit(e) {
  handleEditEvent(e);
}

function handleEditEvent(e) {
  try {
    if (!e || !e.source || !e.range) return;
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusColIdx = headers.indexOf("Status");

    if (statusColIdx < 0 || range.getColumn() !== statusColIdx + 1) return;

    const newStatusValue = range.getValue();
    if (!isStatusVerified(newStatusValue)) return;

    const row = range.getRow();
    if (row <= 1) return;

    const emailSentColIdx = headers.indexOf("Email Terkirim");
    if (emailSentColIdx >= 0 && sheet.getRange(row, emailSentColIdx + 1).getValue() === "Terkirim") {
      return; // Sudah pernah terkirim
    }

    const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    const email = (values[headers.indexOf("Email")] || "").toString().trim();
    const nama = (values[headers.indexOf("Nama")] || "").toString().trim();

    let cabang = sheet.getName();
    const cabangColIdx = headers.indexOf("Cabang");
    if (cabangColIdx >= 0 && values[cabangColIdx]) {
      cabang = values[cabangColIdx].toString().trim();
    }

    if (!email || !cabang) return;

    const cfg = LOMBA_SHEETS[cabang];
    const hasUpload = cfg && cfg.uploadCols && cfg.uploadCols.length > 0;
    const waLink = CONFIG.WA_LINKS[cabang] || null;

    const baseUrl = CONFIG.WEBSITE_URL || "https://itdays-usd.com";
    const uploadLink = hasUpload
      ? baseUrl.replace(/\/+$/, "") + "/upload"
      : null;

    const result = sendVerifikasiEmail({ nama: nama, email: email, cabang: cabang }, waLink, uploadLink);
    const emailStatusText = result.success ? "Terkirim" : "Gagal: " + result.reason;

    syncRowStatus(e.source, email, newStatusValue, emailStatusText);

    const logSheet = getOrCreateSheet("Log Email", LOG_HEADERS);
    appendLog(logSheet, { nama: nama, email: email, cabang: cabang }, row, result);

  } catch (err) {
    Logger.log("ERROR handleEditEvent: " + err.message);
  }
}

function installOnEditTrigger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === "installedOnEdit") {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger("installedOnEdit")
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  SpreadsheetApp.getUi().alert(
    "✅ Trigger Email Otomatis Berhasil Dipasang!\n\n" +
    "Sekarang setiap kali Admin mengubah kolom 'Status' menjadi 'Terdaftar' / 'Terbayar', " +
    "email verifikasi akan dikirimkan secara otomatis tanpa masalah perizinan (permissions)."
  );
}

// ----------------------------------------------------------------
//  EMAIL TEMPLATES
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
  var t = "Halo " + d.nama + ",\n\n";
  t += "Pendaftaran untuk lomba " + d.cabang + " di " + CONFIG.EVENT_NAME + " telah berhasil dikonfirmasi oleh panitia.\n\n";
  if (waLink) t += "Link Grup WhatsApp " + d.cabang + ":\n" + waLink + "\n\n";
  if (uploadLink) t += "Halaman Upload Karya:\n" + uploadLink + "\nGunakan email: " + d.email + "\n\n";
  t += "Salam,\n" + CONFIG.EVENT_ORGANIZER;
  return t;
}

// ----------------------------------------------------------------
//  API CEK VERIFIKASI EMAIL (doGet)
// ----------------------------------------------------------------

/**
 * doGet mendukung:
 * 1. Pengecekan via email saja (pilihan baru) -> mencari peserta di seluruh sheet/rekap.
 * 2. Pengecekan via email & cabang.
 */
function doGet(e) {
  try {
    var email = (e.parameter.email || "").trim().toLowerCase();
    var cabangParam = (e.parameter.cabang || "").trim();

    if (!email) {
      return jsonResponse({ allowed: false, reason: "Masukkan alamat email Anda yang terdaftar." });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Cari data di Data Peserta (Rekap) terlebih dahulu
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

          // Jika cabangParam diisi, cocokkan cabang juga. Jika tidak, ambil baris pertama email match.
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

    // Jika tidak ada di rekap, cari di sheet-sheet cabang secara langsung
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

    if (!isStatusVerified(foundRow.status)) {
      return jsonResponse({ allowed: false, reason: "Pendaftaran atas email ini belum terverifikasi admin. Status saat ini: '" + (foundRow.status || "Menunggu Verifikasi") + "'." });
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

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ----------------------------------------------------------------
//  HANDLE UPLOAD KARYA (doPost action=upload)
// ----------------------------------------------------------------

function handleUploadKarya(data) {
  var email = (data.email || "").trim().toLowerCase();
  var cabang = (data.cabang || "").trim();

  if (!email) {
    return jsonResponse({ success: false, error: "Parameter email wajib diisi." });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var targetCabang = cabang;

  // Jika cabang tidak dikirim oleh frontend, cari cabang peserta berdasarkan email di Data Peserta
  if (!targetCabang) {
    var rekapSheet = ss.getSheetByName("Data Peserta");
    if (rekapSheet && rekapSheet.getLastRow() > 1) {
      var rHeaders = rekapSheet.getRange(1, 1, 1, rekapSheet.getLastColumn()).getValues()[0];
      var rEmailIdx = rHeaders.indexOf("Email");
      var rCabangIdx = rHeaders.indexOf("Cabang");
      if (rEmailIdx >= 0 && rCabangIdx >= 0) {
        var rData = rekapSheet.getRange(2, 1, rekapSheet.getLastRow() - 1, rekapSheet.getLastColumn()).getValues();
        for (var i = 0; i < rData.length; i++) {
          if ((rData[i][rEmailIdx] || "").toString().trim().toLowerCase() === email) {
            targetCabang = (rData[i][rCabangIdx] || "").toString().trim();
            break;
          }
        }
      }
    }
  }

  var cfg = LOMBA_SHEETS[targetCabang];
  if (!cfg || !cfg.uploadCols || cfg.uploadCols.length === 0) {
    return jsonResponse({ success: false, error: "Cabang lomba tidak ditemukan atau tidak memerlukan upload." });
  }

  var cSheet = ss.getSheetByName(cfg.sheetName);
  if (!cSheet || cSheet.getLastRow() <= 1) {
    return jsonResponse({ success: false, error: "Data cabang tidak ditemukan." });
  }

  var cHeaders = cSheet.getRange(1, 1, 1, cSheet.getLastColumn()).getValues()[0];
  var cEmailIdx = cHeaders.indexOf("Email");
  var cStatusIdx = cHeaders.indexOf("Status");
  var cUploadStatusIdx = cHeaders.indexOf("Status Upload");

  var targetRow = -1;
  var cData = cSheet.getRange(2, 1, cSheet.getLastRow() - 1, cSheet.getLastColumn()).getValues();

  for (var k = 0; k < cData.length; k++) {
    if ((cData[k][cEmailIdx] || "").toString().trim().toLowerCase() === email) {
      var st = cStatusIdx >= 0 ? (cData[k][cStatusIdx] || "").toString().trim() : "";
      var upSt = cUploadStatusIdx >= 0 ? (cData[k][cUploadStatusIdx] || "").toString().trim() : "";

      if (!isStatusVerified(st)) {
        return jsonResponse({ success: false, error: "Pendaftaran belum dikonfirmasi." });
      }
      if (upSt === "SUDAH") {
        return jsonResponse({ success: false, error: "Karya sudah pernah diupload sebelumnya." });
      }
      targetRow = k + 2;
      break;
    }
  }

  if (targetRow < 0) {
    return jsonResponse({ success: false, error: "Peserta tidak ditemukan di cabang " + targetCabang + "." });
  }

  var colMapping = {
    "Link Figma": "figma_link",
    "Link GitHub": "github_link",
    "Link Drive PPT": "presentation_drive_link",
    "Link Drive Poster": "poster_drive_link",
  };

  var updateMap = {
    "Status Upload": "SUDAH"
  };

  for (var c = 0; c < cfg.uploadCols.length; c++) {
    var cName = cfg.uploadCols[c];
    var propName = colMapping[cName] || cName;
    var val = (data[propName] || data[cName] || "").toString().trim();
    updateMap[cName] = val;
  }

  // Update Sheet Cabang
  writeRowDataByHeaders(cSheet, targetRow, updateMap);

  // Update Sheet Data Peserta (Rekap)
  var rSheet = ss.getSheetByName("Data Peserta");
  if (rSheet && rSheet.getLastRow() > 1) {
    var rHeaders = rSheet.getRange(1, 1, 1, rSheet.getLastColumn()).getValues()[0];
    var rEmailIdx = rHeaders.indexOf("Email");
    if (rEmailIdx >= 0) {
      var rData = rSheet.getRange(2, 1, rSheet.getLastRow() - 1, rSheet.getLastColumn()).getValues();
      for (var r = 0; r < rData.length; r++) {
        if ((rData[r][rEmailIdx] || "").toString().trim().toLowerCase() === email) {
          writeRowDataByHeaders(rSheet, r + 2, updateMap);
          break;
        }
      }
    }
  }

  return jsonResponse({ success: true });
}

function appendLog(logSheet, d, lombaRow, emailResult) {
  logSheet.appendRow([
    new Date().toLocaleString("id-ID"),
    d.nama || "-", d.email || "-", d.cabang || "-", lombaRow || "-",
    emailResult.success ? "Berhasil" : "Gagal",
    emailResult.reason || "-",
  ]);
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  // Jika header kosong atau belum ada
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
  } else {
    // Pastikan baris 1 header diperbarui jika ada kolom baru
    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    headers.forEach(h => {
      if (currentHeaders.indexOf(h) < 0) {
        const newColIdx = currentHeaders.length + 1;
        sheet.getRange(1, newColIdx).setValue(h);
        sheet.getRange(1, newColIdx).setBackground("#1a1a2e").setFontColor("#ffffff").setFontWeight("bold");
        currentHeaders.push(h);
      }
    });
  }

  return sheet;
}

function formatDataRow(sheet, row, totalCols) {
  sheet.getRange(row, 1, 1, Math.max(totalCols, 1)).setVerticalAlignment("middle");
  if (row % 2 === 0) {
    sheet.getRange(row, 1, 1, Math.max(totalCols, 1)).setBackground("#F8F9FA");
  }
}

// ----------------------------------------------------------------
//  SETUP & MENU ADMIN
// ----------------------------------------------------------------

function setupSemuaSheets() {
  getOrCreateSheet("Data Peserta", REKAP_HEADERS);
  getOrCreateSheet("Log Email",    LOG_HEADERS);
  Object.values(LOMBA_SHEETS).forEach(cfg => getOrCreateLombaSheet(cfg));

  // Perbaiki semua baris 1 header agar rapi dan sinkron
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rekapSheet = ss.getSheetByName("Data Peserta");
  if (rekapSheet) {
    const range = rekapSheet.getRange(1, 1, 1, REKAP_HEADERS.length);
    range.setValues([REKAP_HEADERS]);
    range.setBackground("#1a1a2e").setFontColor("#ffffff").setFontWeight("bold");
  }

  SpreadsheetApp.getUi().alert(
    "✅ Setup & Perapihan Sheet Selesai!\n\n" +
    "Semua header tabel telah disinkronkan:\n" +
    "- Data Peserta (Rekap)\n" +
    "- Log Email\n" +
    "- Sheet Lomba: Badminton, Futsal, ML, PUBG, UI/UX, Web Dev, Poster, Vocal"
  );
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("IT Days Admin")
    .addItem("1. Setup & Rapikan Semua Sheet", "setupSemuaSheets")
    .addItem("2. Install Trigger Email Otomatis", "installOnEditTrigger")
    .addToUi();
}

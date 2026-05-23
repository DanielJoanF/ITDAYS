// ================================================================
//  IT DAYS — Google Apps Script (v3)
//  - Data masuk ke sheet per cabang lomba
//  - Email konfirmasi otomatis ke pendaftar
//  - Kolom KTM/Kartu Tanda Siswa ditambahkan kembali
// ================================================================

// ----------------------------------------------------------------
//  KONFIGURASI — sesuaikan bagian ini
// ----------------------------------------------------------------

const CONFIG = {
  EVENT_NAME:      "IT Days 2025",
  EVENT_ORGANIZER: "Panitia IT Days 2025",
  PANITIA_EMAIL:   "panitia.itdays@gmail.com",
  REPLY_TO:        "panitia.itdays@gmail.com",

  // Link grup WhatsApp per cabang — ganti dengan link asli
  WA_LINKS: {
    "Badminton":      "https://chat.whatsapp.com/GANTI_BADMINTON",
    "Futsal":         "https://chat.whatsapp.com/GANTI_FUTSAL",
    "Mobile Legends": "https://chat.whatsapp.com/GANTI_ML",
    "PUBG":           "https://chat.whatsapp.com/GANTI_PUBG",
    "UI/UX":          "https://chat.whatsapp.com/GANTI_UIUX",
    "Web Dev":        "https://chat.whatsapp.com/GANTI_WEBDEV",
    "Poster":         "https://chat.whatsapp.com/GANTI_POSTER",
    "Vocal":          "https://chat.whatsapp.com/GANTI_VOKAL",
  },
};

// Folder ID di Google Drive untuk menyimpan file upload (opsional)
// Biarkan kosong untuk menyimpan di Root Google Drive
const DRIVE_FOLDER_ID = "";

// ----------------------------------------------------------------
//  NAMA KOLOM GOOGLE FORM
//  Harus sama persis dengan judul pertanyaan di form.
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
  KTM:          "Foto KTM / Kartu Tanda Siswa",   // tipe File Upload di Form
  BUKTI_BAYAR:  "Link Bukti Pembayaran",
};

// ----------------------------------------------------------------
//  KOLOM SHEET
// ----------------------------------------------------------------

// Kolom yang selalu ada di semua sheet lomba
const BASE_COLS = ["No", "Timestamp", "Nama", "Email", "No. WA", "Instansi"];
const END_COLS  = ["KTM", "Bukti Bayar", "Status", "Email Terkirim"];

// Definisi sheet dan kolom tambahan per cabang
const LOMBA_SHEETS = {
  "Badminton": {
    sheetName: "Badminton",
    extraCols: ["Nama Tim", "Anggota (2 Orang)"],
    fillExtra: (d) => [d.namaTim, d.anggota],
  },
  "Futsal": {
    sheetName: "Futsal",
    extraCols: ["Nama Tim", "Anggota (8-10 Orang)"],
    fillExtra: (d) => [d.namaTim, d.anggota],
  },
  "Mobile Legends": {
    sheetName: "Mobile Legends",
    extraCols: ["Nama Tim", "Anggota (7 Orang)", "ID Game Kapten", "Nickname Kapten"],
    fillExtra: (d) => [d.namaTim, d.anggota, d.idGame, d.nickname],
  },
  "PUBG": {
    sheetName: "PUBG",
    extraCols: ["Nama Tim", "Anggota (5 Orang)", "ID Game Kapten", "Nickname Kapten"],
    fillExtra: (d) => [d.namaTim, d.anggota, d.idGame, d.nickname],
  },
  "UI/UX": {
    sheetName: "UI/UX",
    extraCols: ["Link Figma"],
    fillExtra: (d) => [d.figmaLink],
  },
  "Web Dev": {
    sheetName: "Web Dev",
    extraCols: ["Nama Tim", "Anggota (2-3 Orang)", "Link GitHub", "Link Drive PPT"],
    fillExtra: (d) => [d.namaTim, d.anggota, d.githubLink, d.drivePpt],
  },
  "Poster": {
    sheetName: "Poster",
    extraCols: ["Link Drive Poster"],
    fillExtra: (d) => [d.drivePoster],
  },
  "Vocal": {
    sheetName: "Vocal",
    extraCols: [],
    fillExtra: (d) => [],
  },
};

// Header sheet rekap semua peserta
const REKAP_HEADERS = [
  "No", "Timestamp", "Nama", "Email", "No. WA", "Instansi",
  "Kategori", "Cabang", "Nama Tim", "Anggota",
  "ID Game", "Nickname", "Link Figma", "Link GitHub",
  "Link Drive PPT", "Link Drive Poster",
  "KTM", "Bukti Bayar", "Status", "Email Terkirim",
];

const LOG_HEADERS = [
  "Timestamp Log", "Nama", "Email", "Cabang",
  "Baris Sheet Lomba", "Status Email", "Keterangan",
];

// ================================================================
//  HTTP POST HANDLER (UNTUK AJAX FRONTEND)
// ================================================================

function doPost(e) {
  try {
    // Coba baca dari e.parameter.payload (dikirim via URLSearchParams/FormData)
    // Ini kompatibel dengan browser mode: 'no-cors'
    let data;
    if (e.parameter && e.parameter.payload) {
      data = JSON.parse(e.parameter.payload);
    } else if (e.postData && e.postData.contents) {
      // Fallback: JSON body langsung (untuk testing via Postman/curl)
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

    // Helper untuk upload file base64 ke Google Drive
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

    // Upload KTM jika dikirim sebagai base64 object
    data[COL.KTM] = uploadFile(data[COL.KTM]);
    
    // Upload bukti pembayaran jika dikirim sebagai base64 object
    data[COL.BUKTI_BAYAR] = uploadFile(data[COL.BUKTI_BAYAR]);
    
    // Buat format e.namedValues yang diharapkan oleh onFormSubmit
    const namedValues = {};
    for (const key in data) {
      namedValues[key] = [data[key]];
    }
    
    onFormSubmit({ namedValues: namedValues });
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      
  } catch (err) {
    Logger.log("ERROR di doPost: " + err.message);
    
    try {
      GmailApp.sendEmail(
        CONFIG.PANITIA_EMAIL,
        "[ERROR] IT Days - Gagal memproses POST request",
        "Error: " + err.message + "\n\nStack:\n" + err.stack
      );
    } catch (mailErr) {
      Logger.log("Gagal mengirim email error: " + mailErr.message);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
  }
}

// ================================================================
//  TRIGGER UTAMA
// ================================================================

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

    // 2. Tulis ke rekap semua peserta
    const rekapSheet = getOrCreateSheet("Data Peserta", REKAP_HEADERS);
    appendToRekap(rekapSheet, d);

    // 3. Kirim email konfirmasi
    const emailResult = sendKonfirmasiEmail(d);

    // 4. Catat log
    const logSheet = getOrCreateSheet("Log Email", LOG_HEADERS);
    appendLog(logSheet, d, lombaRow, emailResult);

    // 5. Update kolom "Email Terkirim" di sheet lomba
    if (cfg && lombaRow !== "-") {
      updateEmailStatus(cfg.sheetName, lombaRow, emailResult.success);
    }

  } catch (err) {
    Logger.log("ERROR onFormSubmit: " + err.message);
    GmailApp.sendEmail(
      CONFIG.PANITIA_EMAIL,
      "[ERROR] IT Days - Gagal proses pendaftaran",
      "Error: " + err.message + "\n\nStack:\n" + err.stack
    );
  }
}

// ================================================================
//  EKSTRAK DATA DARI FORM
// ================================================================

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
    figmaLink:   get(COL.FIGMA_LINK),
    githubLink:  get(COL.GITHUB_LINK),
    drivePpt:    get(COL.DRIVE_PPT),
    drivePoster: get(COL.DRIVE_POSTER),
    ktm:         get(COL.KTM),
    buktiByar:   get(COL.BUKTI_BAYAR),
  };
}

// ================================================================
//  TULIS KE SHEET LOMBA
// ================================================================

function getOrCreateLombaSheet(cfg) {
  const headers = [...BASE_COLS, ...cfg.extraCols, ...END_COLS];
  return getOrCreateSheet(cfg.sheetName, headers);
}

function appendToLombaSheet(sheet, cfg, d) {
  const lastRow = sheet.getLastRow();
  const no = lastRow; // baris 1 = header, peserta ke-1 = baris 2 = no 1

  const row = [
    no,
    d.timestamp,
    d.nama,
    d.email,
    d.noHp,
    d.instansi,
    ...cfg.fillExtra(d),
    d.ktm,
    d.buktiByar,
    "Terdaftar",
    "Menunggu",
  ];

  sheet.appendRow(row);
  const newRow = sheet.getLastRow();
  formatDataRow(sheet, newRow, row.length);
  setSheetHyperlinks(sheet, newRow, cfg, d);

  return newRow;
}

function setSheetHyperlinks(sheet, row, cfg, d) {
  const totalCols = [...BASE_COLS, ...cfg.extraCols, ...END_COLS].length;
  const headers = sheet.getRange(1, 1, 1, totalCols).getValues()[0];

  function setLink(colName, url, label) {
    const idx = headers.indexOf(colName);
    if (idx >= 0 && url) {
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

// ================================================================
//  TULIS KE REKAP
// ================================================================

function appendToRekap(sheet, d) {
  const lastRow = sheet.getLastRow();
  sheet.appendRow([
    lastRow,
    d.timestamp, d.nama, d.email, d.noHp, d.instansi,
    d.kategori, d.cabang, d.namaTim, d.anggota,
    d.idGame, d.nickname, d.figmaLink, d.githubLink,
    d.drivePpt, d.drivePoster,
    d.ktm, d.buktiByar,
    "Terdaftar", "Menunggu",
  ]);
}

// ================================================================
//  UPDATE STATUS EMAIL DI SHEET LOMBA
// ================================================================

function updateEmailStatus(sheetName, rowNum, success) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col = headers.indexOf("Email Terkirim") + 1;
  if (col > 0) {
    sheet.getRange(rowNum, col).setValue(success ? "Terkirim" : "Gagal");
  }
}

// ================================================================
//  KIRIM EMAIL KONFIRMASI
// ================================================================

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

// ----------------------------------------------------------------
//  Template HTML email
// ----------------------------------------------------------------

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

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1a1a2e,#0f3460);
                 border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">${CONFIG.EVENT_NAME}</h1>
    <p style="margin:8px 0 0;color:#a0b4cc;font-size:14px;">${CONFIG.EVENT_ORGANIZER}</p>
  </td></tr>

  <!-- Status banner -->
  <tr><td style="background:#22c55e;padding:14px 40px;text-align:center;">
    <p style="margin:0;color:#ffffff;font-size:15px;font-weight:600;">Pendaftaran Berhasil Diterima</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#ffffff;padding:36px 40px;border-radius:0 0 12px 12px;">
    <p style="margin:0 0 6px;color:#1a1a2e;font-size:16px;">Halo, <strong>${d.nama}</strong>!</p>
    <p style="margin:0 0 24px;color:#555555;font-size:14px;line-height:1.7;">
      Terima kasih telah mendaftar di <strong>${CONFIG.EVENT_NAME}</strong>.
      Berikut ringkasan data pendaftaranmu:
    </p>

    <!-- Tabel summary -->
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #e8ecf0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background:#f8fafc;">
        <td colspan="2"
            style="padding:12px 16px;font-size:12px;font-weight:700;color:#1a1a2e;
                   text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e8ecf0;">
          Detail Pendaftaran
        </td>
      </tr>
      ${summaryRows}
    </table>

    ${waSection}

    <!-- Catatan penting -->
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-top:24px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#92400e;">Catatan Penting</p>
      <ul style="margin:0;padding-left:18px;color:#78350f;font-size:13px;line-height:1.9;">
        <li>Simpan email ini sebagai bukti pendaftaran.</li>
        <li>Pantau informasi lomba melalui grup WhatsApp.</li>
        <li>Pastikan bukti pembayaran dan foto KTM sudah terkirim dengan benar.</li>
        <li>Pertanyaan? Hubungi panitia di
            <a href="mailto:${CONFIG.PANITIA_EMAIL}" style="color:#0f3460;">${CONFIG.PANITIA_EMAIL}</a>
        </li>
      </ul>
    </div>

    <p style="margin:28px 0 0;color:#aaaaaa;font-size:12px;text-align:center;
              border-top:1px solid #f0f0f0;padding-top:20px;">
      Email ini dikirim secara otomatis. Jangan membalas email ini langsung.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ----------------------------------------------------------------
//  Baris tabel summary (dinamis, hanya tampil jika ada nilainya)
// ----------------------------------------------------------------

function buildSummaryRows(d) {
  const rows = [];

  function row(label, value, highlight) {
    if (!value) return;
    const bg = highlight ? "background:#f0f9ff;" : "";
    rows.push(`
      <tr>
        <td style="padding:10px 16px;font-size:13px;color:#6b7280;width:38%;
                   border-bottom:1px solid #f3f4f6;${bg}">${label}</td>
        <td style="padding:10px 16px;font-size:13px;color:#1a1a2e;font-weight:500;
                   border-bottom:1px solid #f3f4f6;${bg}">${value}</td>
      </tr>`);
  }

  function linkRow(label, url, linkText) {
    if (!url) return;
    rows.push(`
      <tr>
        <td style="padding:10px 16px;font-size:13px;color:#6b7280;width:38%;
                   border-bottom:1px solid #f3f4f6;">${label}</td>
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

  if (d.namaTim)  row("Nama Tim",        d.namaTim, true);
  if (d.anggota)  row("Anggota Tim",     d.anggota.split(",").map(s => s.trim()).join("<br>"));
  if (d.idGame)   row("ID Game Kapten",  d.idGame);
  if (d.nickname) row("Nickname Kapten", d.nickname);

  linkRow("Link Figma",         d.figmaLink,   "Lihat Project Figma");
  linkRow("Link GitHub",        d.githubLink,  "Lihat Repository");
  linkRow("Link Drive PPT",     d.drivePpt,    "Lihat File Presentasi");
  linkRow("Link Drive Poster",  d.drivePoster, "Lihat Poster");
  linkRow("Foto KTM",           d.ktm,         "Lihat KTM");
  linkRow("Bukti Pembayaran",   d.buktiByar,   "Lihat Bukti Bayar");

  return rows.join("");
}

// ----------------------------------------------------------------
//  Plain text fallback
// ----------------------------------------------------------------

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

// ================================================================
//  LOG
// ================================================================

function appendLog(logSheet, d, lombaRow, emailResult) {
  logSheet.appendRow([
    new Date().toLocaleString("id-ID"),
    d.nama, d.email, d.cabang, lombaRow,
    emailResult.success ? "Berhasil" : "Gagal",
    emailResult.reason,
  ]);
}

// ================================================================
//  HELPER: BUAT / AMBIL SHEET
// ================================================================

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

// ================================================================
//  FUNGSI MANUAL (dijalankan dari menu)
// ================================================================

/**
 * Buat semua sheet dengan header yang benar.
 * Jalankan sekali setelah script dipasang.
 */
function setupSemuaSheets() {
  getOrCreateSheet("Data Peserta", REKAP_HEADERS);
  getOrCreateSheet("Log Email",    LOG_HEADERS);
  Object.values(LOMBA_SHEETS).forEach(cfg => getOrCreateLombaSheet(cfg));

  SpreadsheetApp.getUi().alert(
    "Setup selesai.\n\n" +
    "Sheet yang dibuat:\n" +
    "- Data Peserta\n" +
    "- Log Email\n" +
    "- Badminton\n" +
    "- Futsal\n" +
    "- Mobile Legends\n" +
    "- PUBG\n" +
    "- UI/UX\n" +
    "- Web Dev\n" +
    "- Poster\n" +
    "- Vocal"
  );
}

/**
 * Kirim email percobaan tanpa perlu submit form.
 * Ganti email di bawah ke emailmu sendiri, lalu Run fungsi ini.
 */
function testKirimEmail() {
  const d = {
    timestamp:   new Date().toLocaleString("id-ID"),
    nama:        "Budi Santoso",
    email:       "GANTI_KE_EMAILMU@gmail.com",
    noHp:        "081234567890",
    instansi:    "Universitas Diponegoro",
    kategori:    "Program",
    cabang:      "UI/UX",
    namaTim:     "",
    anggota:     "",
    idGame:      "",
    nickname:    "",
    figmaLink:   "https://www.figma.com/file/contoh",
    githubLink:  "",
    drivePpt:    "",
    drivePoster: "",
    ktm:         "https://drive.google.com/file/contoh-ktm",
    buktiByar:   "https://drive.google.com/file/contoh-bukti",
  };

  const result = sendKonfirmasiEmail(d);
  SpreadsheetApp.getUi().alert(
    result.success
      ? "Email test berhasil dikirim ke: " + d.email
      : "Gagal kirim email: " + result.reason
  );
}

/**
 * Kirim ulang email ke peserta di baris yang sedang dipilih.
 * Bisa digunakan dari sheet lomba mana saja.
 */
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

  // Cabang diambil dari nama sheet
  const cabangMap = {
    "Badminton": "Badminton", "Futsal": "Futsal",
    "Mobile Legends": "Mobile Legends", "PUBG": "PUBG",
    "UI/UX": "UI/UX", "Web Dev": "Web Dev",
    "Poster": "Poster", "Vocal": "Vocal",
  };

  const d = {
    timestamp:   get("Timestamp"),
    nama:        get("Nama"),
    email:       get("Email"),
    noHp:        get("No. WA"),
    instansi:    get("Instansi"),
    kategori:    get("Kategori") || "",
    cabang:      cabangMap[sheet.getName()] || sheet.getName(),
    namaTim:     get("Nama Tim"),
    anggota:     get("Anggota (2 Orang)") || get("Anggota (5 Orang)") ||
                 get("Anggota (7 Orang)") || get("Anggota (8-10 Orang)") ||
                 get("Anggota (2-3 Orang)"),
    idGame:      get("ID Game Kapten"),
    nickname:    get("Nickname Kapten"),
    figmaLink:   get("Link Figma"),
    githubLink:  get("Link GitHub"),
    drivePpt:    get("Link Drive PPT"),
    drivePoster: get("Link Drive Poster"),
    ktm:         get("KTM"),
    buktiByar:   get("Bukti Bayar"),
  };

  if (!d.email) {
    SpreadsheetApp.getUi().alert("Email peserta di baris ini kosong.");
    return;
  }

  const result = sendKonfirmasiEmail(d);

  const emailCol = headers.indexOf("Email Terkirim") + 1;
  if (emailCol > 0) {
    sheet.getRange(row, emailCol).setValue(result.success ? "Terkirim" : "Gagal");
  }

  SpreadsheetApp.getUi().alert(
    result.success
      ? "Email berhasil dikirim ulang ke: " + d.email
      : "Gagal: " + result.reason
  );
}

// ----------------------------------------------------------------
//  Custom menu di Spreadsheet
// ----------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("IT Days Admin")
    .addItem("Setup Semua Sheet", "setupSemuaSheets")
    .addSeparator()
    .addItem("Test Kirim Email (UI/UX)", "testKirimEmail")
    .addItem("Kirim Ulang Email (baris terpilih)", "kirimUlangEmail")
    .addToUi();
}

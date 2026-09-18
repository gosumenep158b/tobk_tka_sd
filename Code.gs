/**
 * ============================================================
 *  PENDAFTARAN TOBK TKA KELAS 6 SD SE-KAB. SUMENEP 2026
 *  Backend Google Apps Script
 *  BIMBEL GO SUMENEP
 * ============================================================
 *
 * Deploy:
 * 1. Buka https://script.google.com -> New Project
 * 2. Ganti isi Code.gs dengan file ini, tambahkan Index.html (versi Apps Script)
 * 3. Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Salin "Web app URL" -> gunakan sebagai APPS_SCRIPT_URL di config.js (versi Vercel)
 *
 * Spreadsheet dibuat otomatis pada eksekusi pertama (tidak perlu dibuat manual).
 */

// ================== KONFIGURASI ==================
const SPREADSHEET_NAME = 'Database Pendaftaran TOBK TKA SD 6 - Sumenep 2026';
const SHEET_NAME = 'Pendaftaran';
const EVENT_CODE = 'TOBK2026';
const WA_GROUP_LINK = 'https://chat.whatsapp.com/J5BcvbSeSVc2iPLq2jsYNY?s=sh&p=a&mlu=4&ilr=4';

const SEKOLAH_LIST = [
  'SDN Pajagalan I',
  'SDN Pajagalan II',
  'SDN Kolor II',
  'SDN Pandian IV',
  'SDIT Al Hidayah',
  'SDI Lukmanul Hakim',
  'SDN Pangarangan I',
  'SDN Pangarangan V',
  'SDK Sang Timur',
  'SDIT Al Wathoniyah',
  'SDI Nurul Bayan'
];

const HEADERS = [
  'Timestamp',
  'No. Pendaftaran',
  'Nama Lengkap Siswa',
  'Tanggal Lahir',
  'Asal Sekolah',
  'No. HP Siswa',
  'No. HP Orang Tua',
  'Pekerjaan Orang Tua',
  'Persetujuan Data'
];

// ================== ENTRY POINTS ==================

/**
 * Melayani halaman form (dipakai jika Index.html di-deploy langsung sebagai Web App).
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Pendaftaran TOBK TKA SD 6 - Sumenep 2026')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Endpoint JSON untuk versi Vercel (fetch POST).
 * Menerima body text/plain berisi JSON agar tidak memicu CORS preflight.
 */
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ success: false, message: 'Data tidak valid (format JSON salah).' });
  }

  const result = processRegistration(data);
  return jsonResponse(result);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================== DIPANGGIL DARI google.script.run (versi Index.html Apps Script) ==================

/**
 * Dipanggil oleh client (google.script.run) pada versi form native Apps Script.
 */
function submitPendaftaran(data) {
  return processRegistration(data);
}

/**
 * Mengirim daftar sekolah + link grup WA ke client saat halaman dimuat.
 */
function getFormConfig() {
  return {
    sekolahList: SEKOLAH_LIST,
    waGroupLink: WA_GROUP_LINK
  };
}

// ================== LOGIKA UTAMA ==================

function processRegistration(data) {
  const validation = validateData(data);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = getOrCreateSheet();
    const noPendaftaran = generateNoPendaftaran(sheet);
    const timestamp = new Date();

    sheet.appendRow([
      timestamp,
      noPendaftaran,
      data.namaLengkap.trim(),
      data.tanggalLahir,
      data.asalSekolah,
      data.noHpSiswa.trim(),
      data.noHpOrtu.trim(),
      data.pekerjaanOrtu.trim(),
      data.persetujuan === true ? 'Ya' : 'Tidak'
    ]);

    return {
      success: true,
      message: 'Pendaftaran berhasil!',
      noPendaftaran: noPendaftaran,
      waGroupLink: WA_GROUP_LINK
    };
  } catch (err) {
    return { success: false, message: 'Terjadi kesalahan server: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

function validateData(data) {
  if (!data) return { valid: false, message: 'Data pendaftaran kosong.' };

  // 1. Nama Lengkap
  if (!data.namaLengkap || data.namaLengkap.trim().length < 3) {
    return { valid: false, message: 'Nama lengkap wajib diisi (minimal 3 karakter).' };
  }
  if (!/^[a-zA-Z\s.'\-]+$/.test(data.namaLengkap.trim())) {
    return { valid: false, message: 'Nama lengkap hanya boleh berisi huruf dan spasi.' };
  }

  // 2. Tanggal Lahir (tahun maksimal 2014)
  if (!data.tanggalLahir) {
    return { valid: false, message: 'Tanggal lahir wajib diisi.' };
  }
  const tglLahir = new Date(data.tanggalLahir);
  if (isNaN(tglLahir.getTime())) {
    return { valid: false, message: 'Format tanggal lahir tidak valid.' };
  }
  if (tglLahir.getFullYear() > 2014) {
    return { valid: false, message: 'Tahun kelahiran maksimal 2014 (sesuai ketentuan TOBK TKA SD Kelas 6).' };
  }

  // 3. Asal Sekolah
  if (!data.asalSekolah || SEKOLAH_LIST.indexOf(data.asalSekolah) === -1) {
    return { valid: false, message: 'Silakan pilih asal sekolah dari daftar yang tersedia.' };
  }

  // 4. No HP Siswa
  const hpRegex = /^0[0-9]{8,14}$/;
  if (!data.noHpSiswa || !hpRegex.test(data.noHpSiswa.trim())) {
    return { valid: false, message: 'No. HP Siswa harus diawali angka 0, hanya angka, tanpa spasi/karakter lain (9-15 digit).' };
  }

  // 5. No HP Orang Tua
  if (!data.noHpOrtu || !hpRegex.test(data.noHpOrtu.trim())) {
    return { valid: false, message: 'No. HP Orang Tua harus diawali angka 0, hanya angka, tanpa spasi/karakter lain (9-15 digit).' };
  }

  // 6. Pekerjaan Orang Tua
  if (!data.pekerjaanOrtu || data.pekerjaanOrtu.trim().length < 2) {
    return { valid: false, message: 'Pekerjaan orang tua wajib diisi.' };
  }

  // 7. Persetujuan
  if (data.persetujuan !== true) {
    return { valid: false, message: 'Anda harus menyetujui pernyataan kebenaran data.' };
  }

  return { valid: true };
}

// ================== SPREADSHEET HELPERS ==================

function getOrCreateSheet() {
  const ss = getOrCreateSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#C62828');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, HEADERS.length);

    // Hapus sheet default kosong "Sheet1" jika masih ada dan bukan sheet ini
    const defaultSheet = ss.getSheetByName('Sheet1');
    if (defaultSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }
  }
  return sheet;
}

function getOrCreateSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('SPREADSHEET_ID');

  if (savedId) {
    try {
      return SpreadsheetApp.openById(savedId);
    } catch (err) {
      // File terhapus / tidak dapat diakses -> buat baru
    }
  }

  const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  if (files.hasNext()) {
    const file = files.next();
    const ss = SpreadsheetApp.open(file);
    props.setProperty('SPREADSHEET_ID', ss.getId());
    return ss;
  }

  const ss = SpreadsheetApp.create(SPREADSHEET_NAME);
  props.setProperty('SPREADSHEET_ID', ss.getId());
  return ss;
}

function generateNoPendaftaran(sheet) {
  const lastRow = sheet.getLastRow();
  const count = lastRow > 1 ? lastRow - 1 : 0;
  const nextNumber = count + 1;
  const padded = ('0000' + nextNumber).slice(-4);
  return EVENT_CODE + '-' + padded;
}

/**
 * Jalankan fungsi ini sekali secara manual dari editor Apps Script
 * untuk membuat spreadsheet & sheet lebih awal (opsional).
 */
function setupSpreadsheet() {
  const sheet = getOrCreateSheet();
  Logger.log('Spreadsheet siap: ' + getOrCreateSpreadsheet().getUrl());
  return sheet.getParent().getUrl();
}

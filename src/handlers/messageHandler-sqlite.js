const expenseService = require('../services/expenseService-sqlite');
const MessageFormatter = require('../utils/messageFormatter');
const moment = require('moment');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const stringSimilarity = require('string-similarity');

// Daftar produk/kata kunci umum (bisa diperluas)
const knownItems = [
  'Bread Butter Pudding', 'Cream Brullie', 'Choco Croissant', 'Bark Of Chocolat',
  'Le Mineral', 'Aqua', 'Chitato', 'Frisian Flag', 'Ice Cream Aice', 'Kacang',
  'Cherry', 'Coca Cola', 'Sprite', 'Teh Botol', 'Indomie', 'SilverQueen',
  // Tambahkan produk lain sesuai kebutuhan
];

function correctItemName(name) {
  const { bestMatch } = stringSimilarity.findBestMatch(name, knownItems);
  return bestMatch.rating > 0.7 ? bestMatch.target : name;
}

const DATASET_PATH = path.join(__dirname, '../../database/struk_dataset.json');
function logStrukDataset({ ocr_text, parsed_items, total, user, image_file }) {
  let dataset = [];
  try {
    if (fs.existsSync(DATASET_PATH)) {
      dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));
    }
  } catch (e) { dataset = []; }
  dataset.push({
    ocr_text,
    parsed_items,
    total,
    user,
    image_file,
    user_confirmed: null,
    timestamp: new Date().toISOString()
  });
  fs.writeFileSync(DATASET_PATH, JSON.stringify(dataset, null, 2));
}

function updateLastStrukConfirmation(user, confirmed) {
  let dataset = [];
  try {
    if (fs.existsSync(DATASET_PATH)) {
      dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));
    }
  } catch (e) { dataset = []; }
  // Cari entry terakhir dari user ini yang belum dikonfirmasi
  for (let i = dataset.length - 1; i >= 0; i--) {
    if (dataset[i].user === user && dataset[i].user_confirmed === null) {
      dataset[i].user_confirmed = confirmed;
      break;
    }
  }
  fs.writeFileSync(DATASET_PATH, JSON.stringify(dataset, null, 2));
}

const CORRECTIONS_PATH = path.join(__dirname, '../../database/struk_corrections.json');
function logStrukCorrection({ ocr_text, parsed_items, correction, user }) {
  let dataset = [];
  try {
    if (fs.existsSync(CORRECTIONS_PATH)) {
      dataset = JSON.parse(fs.readFileSync(CORRECTIONS_PATH, 'utf8'));
    }
  } catch (e) { dataset = []; }
  dataset.push({
    ocr_text,
    parsed_items,
    corrections: [correction],
    timestamp: new Date().toISOString(),
    user
  });
  fs.writeFileSync(CORRECTIONS_PATH, JSON.stringify(dataset, null, 2));
}

class MessageHandler {
  constructor(client) {
    this.client = client;
    this.pendingOcr = {};
    this.pendingResetExpense = {};
  }

  async handleMessage(message) {
    try {
      const content = message.body ? message.body.toLowerCase().trim() : '';
      const phoneNumber = message.from;
      // Peringatan jika tambah item di luar sesi OCR (letakkan di awal)
      if (!this.pendingOcr[phoneNumber] && /^tambah item /i.test(content)) {
        await this.sendMessage(phoneNumber, '❌ Perintah "tambah item" hanya bisa digunakan saat koreksi hasil struk OCR. Untuk menambah pengeluaran manual, gunakan format: [jumlah] [deskripsi]');
        return;
      }

      // Handle image with OCR
      if (message.hasMedia) {
        await this.handleImageMessage(message, phoneNumber);
        return;
      }

      // Handle OCR confirmation & koreksi
      if (this.pendingOcr[phoneNumber]) {
        // Koreksi item: koreksi [nomor item] [nama baru] [jumlah baru]
        if (/^koreksi \d+ /i.test(content)) {
          const match = message.body.match(/^koreksi (\d+) (.+) (\d+)$/i);
          if (match) {
            const idx = parseInt(match[1], 10) - 1;
            const newName = match[2].trim();
            const newAmount = parseInt(match[3].replace(/[^\d]/g, ''), 10);
            if (this.pendingOcr[phoneNumber].items[idx]) {
              // Log koreksi
              logStrukCorrection({
                ocr_text: this.pendingOcr[phoneNumber].raw,
                parsed_items: this.pendingOcr[phoneNumber].items.map(x => ({ ...x })),
                correction: {
                  item_index: idx,
                  before: { ...this.pendingOcr[phoneNumber].items[idx] },
                  after: { name: newName, amount: newAmount }
                },
                user: phoneNumber
              });
              this.pendingOcr[phoneNumber].items[idx].name = newName;
              this.pendingOcr[phoneNumber].items[idx].amount = newAmount;
              await this.sendMessage(phoneNumber, '✅ Item berhasil dikoreksi. Berikut hasil terbaru:');
              await this.sendOcrResult(phoneNumber);
            } else {
              await this.sendMessage(phoneNumber, '❌ Nomor item tidak ditemukan.');
            }
          } else {
            await this.sendMessage(phoneNumber, '❌ Format koreksi salah. Contoh: koreksi 1 Teh Botol 12000');
          }
          return;
        }
        // Tambah item: tambah item [nama] [jumlah]
        if (/^tambah item /i.test(content)) {
          const match = message.body.match(/^tambah item (.+) (\d+)$/i);
          if (match) {
            const newName = match[1].trim();
            const newAmount = parseInt(match[2].replace(/[^\d]/g, ''), 10);
            if (newName.length >= 3 && newAmount >= 2) {
              this.pendingOcr[phoneNumber].items.push({ name: newName, amount: newAmount });
              await this.sendMessage(phoneNumber, '✅ Item berhasil ditambahkan. Berikut hasil terbaru:');
              await this.sendOcrResult(phoneNumber);
            } else {
              await this.sendMessage(phoneNumber, '❌ Nama item minimal 3 karakter dan jumlah minimal 2.');
            }
          } else {
            await this.sendMessage(phoneNumber, '❌ Format tambah item salah. Contoh: tambah item Aqua 5000');
          }
          return;
        }
        // Hapus item: hapus item [nomor item]
        if (/^hapus item \d+$/i.test(content)) {
          const match = message.body.match(/^hapus item (\d+)/i);
          if (match) {
            const idx = parseInt(match[1], 10) - 1;
            if (this.pendingOcr[phoneNumber].items[idx]) {
              this.pendingOcr[phoneNumber].items.splice(idx, 1);
              await this.sendMessage(phoneNumber, '✅ Item berhasil dihapus. Berikut hasil terbaru:');
              await this.sendOcrResult(phoneNumber);
            } else {
              await this.sendMessage(phoneNumber, '❌ Nomor item tidak ditemukan.');
            }
          }
          return;
        }
        // Konfirmasi seperti biasa
        if (content === 'ya' || content === 'yes') {
          await this.confirmOcrExpense(phoneNumber, message);
          return;
        } else if (content === 'tidak' || content === 'no') {
          delete this.pendingOcr[phoneNumber];
          await this.sendMessage(phoneNumber, '❌ Pengeluaran dari struk dibatalkan.');
          return;
        }
      }

      // Handle reset pengeluaran
      if (content === 'reset pengeluaran') {
        this.pendingResetExpense[phoneNumber] = true;
        await this.sendMessage(phoneNumber, '⚠️ Anda yakin ingin menghapus SEMUA pengeluaran? Balas: ya untuk konfirmasi, atau tidak untuk membatalkan. *Aksi ini tidak bisa dibatalkan!*');
        return;
      }
      if (this.pendingResetExpense[phoneNumber]) {
        if (content === 'ya') {
          delete this.pendingResetExpense[phoneNumber];
          await this.handleResetAllExpense(phoneNumber);
        } else {
          delete this.pendingResetExpense[phoneNumber];
          await this.sendMessage(phoneNumber, '❌ Reset pengeluaran dibatalkan. Tidak ada data yang dihapus.');
        }
        return;
      }

      console.log(`📱 Message from ${phoneNumber}: ${content}`);

      // Handle saldo commands
      if (content.startsWith('saldo tambah ')) {
        await this.handleAddSaldo(phoneNumber, content);
      } else if (content.startsWith('saldo kurangi ')) {
        await this.handleReduceSaldo(phoneNumber, content);
      } else if (content === 'saldo reset') {
        await this.handleResetSaldo(phoneNumber);
      } else if (content === 'saldo' || content === 'cek saldo') {
        await this.handleGetSaldo(phoneNumber);
      } else if (content === 'menu' || content === 'help' || content === 'bantuan') {
        await this.sendMessage(phoneNumber, MessageFormatter.getWelcomeMessage());
      } else if (/^\d+[\d.,]* /.test(content)) {
        // Jika pesan diawali angka, langsung proses sebagai tambah pengeluaran
        await this.handleAddExpense(phoneNumber, content);
      } else if (content.startsWith('tambah ')) {
        // Jika setelah 'tambah' bukan angka, error
        const afterTambah = content.slice(7).trim();
        if (!/^\d+[\d.,]*/.test(afterTambah)) {
          await this.sendMessage(phoneNumber, '❌ Jumlah harus berupa angka positif');
        } else {
          await this.handleAddExpense(phoneNumber, content);
        }
      } else if (content.startsWith('laporan ')) {
        await this.handleGetReport(phoneNumber, content);
      } else if (content === 'kategori') {
        await this.handleGetCategories(phoneNumber);
      } else if (content.startsWith('hapus ')) {
        await this.handleDeleteExpense(phoneNumber, content);
      } else if (content === 'ping') {
        await this.sendMessage(phoneNumber, '🏓 Pong! Bot berjalan dengan baik.');
      } else {
        await this.sendMessage(phoneNumber, MessageFormatter.getWelcomeMessage());
      }
    } catch (error) {
      console.error('Error handling message:', error);
      await this.sendMessage(message.from, MessageFormatter.getErrorMessage('Terjadi kesalahan sistem'));
    }
  }

  async handleAddSaldo(phoneNumber, content) {
    try {
      const parts = content.split(' ');
      if (parts.length !== 3) {
        await this.sendMessage(phoneNumber, '❌ Format salah. Gunakan: `saldo tambah [jumlah]`');
        return;
      }
      // Ambil hanya digit
      const cleanAmount = parts[2].replace(/[^\d]/g, '');
      const amount = parseFloat(cleanAmount);
      if (isNaN(amount) || amount <= 0) {
        await this.sendMessage(phoneNumber, '❌ Jumlah harus berupa angka positif');
        return;
      }
      const result = await expenseService.addSaldo(phoneNumber, amount);
      await this.sendMessage(phoneNumber, result.message);
    } catch (error) {
      console.error('Error adding saldo:', error);
      await this.sendMessage(phoneNumber, 'Gagal menambah saldo');
    }
  }

  async handleReduceSaldo(phoneNumber, content) {
    try {
      const parts = content.split(' ');
      if (parts.length !== 3) {
        await this.sendMessage(phoneNumber, '❌ Format salah. Gunakan: `saldo kurangi [jumlah]`');
        return;
      }
      // Ambil hanya digit
      const cleanAmount = parts[2].replace(/[^\d]/g, '');
      const amount = parseFloat(cleanAmount);
      if (isNaN(amount) || amount <= 0) {
        await this.sendMessage(phoneNumber, '❌ Jumlah harus berupa angka positif');
        return;
      }
      const result = await expenseService.reduceSaldo(phoneNumber, amount);
      await this.sendMessage(phoneNumber, result.message);
      // Tambahkan info saldo terbaru jika berhasil
      if (result.success) {
        const saldoResult = await expenseService.getSaldo(phoneNumber);
        if (saldoResult.success) {
          await this.sendMessage(phoneNumber, require('../utils/messageFormatter').getSaldoMessage(saldoResult.saldo));
        }
      }
    } catch (error) {
      console.error('Error reducing saldo:', error);
      await this.sendMessage(phoneNumber, 'Gagal mengurangi saldo');
    }
  }

  async handleGetSaldo(phoneNumber) {
    try {
      const result = await expenseService.getSaldo(phoneNumber);
      if (result.success) {
        await this.sendMessage(phoneNumber, MessageFormatter.getSaldoMessage(result.saldo));
      } else {
        await this.sendMessage(phoneNumber, result.message);
      }
    } catch (error) {
      console.error('Error getting saldo:', error);
      await this.sendMessage(phoneNumber, 'Gagal mengambil saldo');
    }
  }

  async handleAddExpense(phoneNumber, content) {
    try {
      // Format baru: "[jumlah] [deskripsi]"
      const parts = content.trim().split(' ');
      if (parts.length < 2) {
        await this.sendMessage(phoneNumber, '❌ Format salah. Gunakan: `[jumlah] [deskripsi]` (contoh: `50000 makan siang`)');
        return;
      }
      // Ambil hanya digit dari nominal
      const cleanAmount = parts[0].replace(/[^\d]/g, '');
      const amount = parseFloat(cleanAmount);
      if (isNaN(amount) || amount <= 0) {
        await this.sendMessage(phoneNumber, '❌ Jumlah harus berupa angka positif');
        return;
      }
      // Deskripsi adalah sisanya
      let description = parts.slice(1).join(' ');
      let category = null;
      // Cek kategori jika ada (format: kategori:[nama])
      const categoryMatch = description.match(/kategori:([\w &]+)/i);
      if (categoryMatch) {
        category = categoryMatch[1].trim();
        description = description.replace(/kategori:[\w &]+/i, '').trim();
      }
      if (!description.trim()) {
        await this.sendMessage(phoneNumber, '❌ Deskripsi tidak boleh kosong');
        return;
      }
      const result = await expenseService.addExpense(phoneNumber, amount, description, category);
      // Ambil saldo terbaru
      const saldoResult = await expenseService.getSaldo(phoneNumber);
      // Format pesan konfirmasi
      let message = '';
      if (result.success) {
        const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
        const formattedSaldo = saldoResult.success ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(saldoResult.saldo) : '-';
        const now = require('moment')().format('DD/MM/YYYY HH:mm');
        message = `✅ *Pengeluaran Berhasil Ditambahkan*

` +
          `💰 Jumlah: ${formattedAmount}
` +
          `📝 Deskripsi: ${description}
` +
          (result.autoCategory || category ? `🏷️ Kategori: ${result.autoCategory || category}\n` : '') +
          `🕒 Waktu: ${now}
` +
          `💰 Sisa Saldo: ${formattedSaldo}`;
      } else {
        message = require('../utils/messageFormatter').getErrorMessage(result.message);
      }
      await this.sendMessage(phoneNumber, message);
    } catch (error) {
      console.error('Error adding expense:', error);
      await this.sendMessage(phoneNumber, require('../utils/messageFormatter').getErrorMessage('Gagal menambahkan pengeluaran'));
    }
  }

  async handleGetReport(phoneNumber, content) {
    try {
      const parts = content.split(' ');
      let startDate = null;
      let endDate = null;
      let period = '';

      if (parts[1] === 'hari' && parts[2] === 'ini') {
        startDate = moment().format('YYYY-MM-DD');
        endDate = moment().format('YYYY-MM-DD');
        period = 'Hari Ini';
      } else if (parts[1] === 'minggu' && parts[2] === 'ini') {
        startDate = moment().startOf('week').format('YYYY-MM-DD');
        endDate = moment().endOf('week').format('YYYY-MM-DD');
        period = 'Minggu Ini';
      } else if (parts[1] === 'bulan' && parts[2] === 'ini') {
        startDate = moment().startOf('month').format('YYYY-MM-DD');
        endDate = moment().endOf('month').format('YYYY-MM-DD');
        period = 'Bulan Ini';
      } else if (parts[1].match(/^\d{4}-\d{2}$/)) {
        // Format: laporan 2024-01
        const [year, month] = parts[1].split('-');
        startDate = moment(`${year}-${month}-01`).format('YYYY-MM-DD');
        endDate = moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
        period = `${moment(parts[1]).format('MMMM YYYY')}`;
      } else {
        await this.sendMessage(phoneNumber, '❌ Format laporan tidak valid. Contoh: `laporan hari ini`, `laporan bulan ini`, `laporan 2024-01`');
        return;
      }

      const result = await expenseService.getUserExpenses(phoneNumber, startDate, endDate);
      
      if (result.success) {
        const message = MessageFormatter.getExpenseListMessage(result.expenses, period);
        await this.sendMessage(phoneNumber, message);
      } else {
        await this.sendMessage(phoneNumber, MessageFormatter.getErrorMessage(result.message));
      }
    } catch (error) {
      console.error('Error getting report:', error);
      await this.sendMessage(phoneNumber, MessageFormatter.getErrorMessage('Gagal mengambil laporan'));
    }
  }

  async handleGetCategories(phoneNumber) {
    try {
      const result = await expenseService.getCategories();
      
      if (result.success) {
        const message = MessageFormatter.getCategoriesMessage(result.categories);
        await this.sendMessage(phoneNumber, message);
      } else {
        await this.sendMessage(phoneNumber, MessageFormatter.getErrorMessage(result.message));
      }
    } catch (error) {
      console.error('Error getting categories:', error);
      await this.sendMessage(phoneNumber, MessageFormatter.getErrorMessage('Gagal mengambil kategori'));
    }
  }

  async handleDeleteExpense(phoneNumber, content) {
    try {
      const parts = content.split(' ');
      if (parts.length !== 2) {
        await this.sendMessage(phoneNumber, '❌ Format salah. Gunakan: `hapus [id]`');
        return;
      }

      const expenseId = parseInt(parts[1]);
      if (isNaN(expenseId) || expenseId <= 0) {
        await this.sendMessage(phoneNumber, '❌ ID pengeluaran harus berupa angka positif');
        return;
      }

      const result = await expenseService.deleteExpense(phoneNumber, expenseId);
      await this.sendMessage(phoneNumber, result.message);
    } catch (error) {
      console.error('Error deleting expense:', error);
      await this.sendMessage(phoneNumber, MessageFormatter.getErrorMessage('Gagal menghapus pengeluaran'));
    }
  }

  async sendMessage(phoneNumber, message) {
    try {
      await this.client.sendMessage(phoneNumber, message);
      console.log(`✅ Message sent to ${phoneNumber}`);
    } catch (error) {
      console.error(`❌ Failed to send message to ${phoneNumber}:`, error);
    }
  }

  // Method to send monthly report to all users
  async sendMonthlyReportToAllUsers() {
    try {
      const { runQuery } = require('../config/database-sqlite');
      
      // Get all users
      const users = await runQuery('SELECT phone_number FROM users');

      if (users.length === 0) {
        console.log('No users found for monthly report');
        return;
      }

      const currentDate = moment();
      const year = currentDate.year();
      const month = currentDate.month() + 1; // moment months are 0-indexed

      console.log(`📊 Sending monthly reports for ${month}/${year} to ${users.length} users`);

      for (const user of users) {
        try {
          const summaryResult = await expenseService.getMonthlySummary(user.phone_number, year, month);
          
          if (summaryResult.success) {
            const message = MessageFormatter.getMonthlyReportMessage(user.phone_number, summaryResult.summary);
            await this.sendMessage(user.phone_number, message);
            console.log(`✅ Monthly report sent to ${user.phone_number}`);
          } else {
            console.log(`❌ Failed to generate summary for ${user.phone_number}: ${summaryResult.message}`);
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Error sending monthly report to ${user.phone_number}:`, error);
        }
      }

      console.log('📊 Monthly report sending completed');
    } catch (error) {
      console.error('❌ Error in sendMonthlyReportToAllUsers:', error);
    }
  }

  async handleImageMessage(message, phoneNumber) {
    try {
      const media = await message.downloadMedia();
      if (!media) {
        await this.sendMessage(phoneNumber, '❌ Gagal mengunduh gambar.');
        return;
      }
      // Save image temporarily
      const buffer = Buffer.from(media.data, 'base64');
      const tempPath = path.join(__dirname, '../../database/ocr_temp_' + Date.now() + '.jpg');
      fs.writeFileSync(tempPath, buffer);
      // Preprocessing: grayscale + threshold
      const preprocessedPath = tempPath.replace('.jpg', '_pre.jpg');
      await sharp(tempPath)
        .grayscale()
        .threshold(180)
        .toFile(preprocessedPath);
      try {
        fs.unlinkSync(tempPath); // Hapus file asli
      } catch (e) {
        console.error('Gagal menghapus file temp:', tempPath, e.message);
      }
      await this.sendMessage(phoneNumber, '⏳ Membaca struk, mohon tunggu...');
      // Run OCR pada gambar hasil preprocessing
      const { data: { text } } = await Tesseract.recognize(preprocessedPath, ['ind', 'eng']);
      try {
        fs.unlinkSync(preprocessedPath);
      } catch (e) {
        console.error('Gagal menghapus file preprocessed:', preprocessedPath, e.message);
      }
      // Parse OCR result
      const parsed = this.parseReceiptText(text);
      // Log dataset (tambahkan info user & file gambar)
      logStrukDataset({ ocr_text: text, parsed_items: parsed.items, total: parsed.total, user: phoneNumber, image_file: preprocessedPath });
      if (!parsed || (!parsed.items.length && !parsed.total)) {
        await this.sendMessage(phoneNumber, '❌ Tidak dapat membaca struk dengan jelas. Berikut hasil mentah OCR:\n' + text);
        return;
      }
      // Simpan state konfirmasi
      this.pendingOcr[phoneNumber] = parsed;
      // Kirim hasil ke user
      await this.sendOcrResult(phoneNumber);
    } catch (error) {
      console.error('Error OCR:', error);
      await this.sendMessage(phoneNumber, '❌ Gagal membaca struk.');
    }
  }

  parseReceiptText(text) {
    // Preprocessing: normalisasi spasi, hapus karakter aneh
    let cleanText = text.replace(/[|_]/g, '').replace(/\t/g, ' ').replace(/ +/g, ' ');
    const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    // Filter: hanya baris dengan minimal 3 angka (qty, harga satuan, subtotal) dan tidak mengandung simbol aneh
    const filteredLines = lines.filter(line => {
      if (/[<%@#\$\^\*\/=]/.test(line)) return false;
      const numCount = (line.match(/[\d.,]+/g) || []).length;
      return numCount >= 3;
    });
    const items = [];
    let total = null;
    const nonItemKeywords = [
      'ppn', 'tunai', 'kembalian', 'kembali', 'kasir', 'total item', 'total disc', 'total belanja', 'total', 'kritik', 'saran', 'tanggal', 'jam', 'v.', 'no.', 'kode', 'ossn', 'trx', 'dpp', 'npwp', 'kartu', 'cash', 'change', 'payment', 'customer', 'pelanggan', 'saldo', 'member', 'poin', 'voucher', 'struk', 'nota', 'faktur', 'invoice', 'ref', 'shift', 'operator', 'counter', 'promo', 'diskon', 'promo', 'harga jual', 'subtotal', 'jumlah', 'hemat', 'sms', 'layanan', 'konsumen', 'alamat', 'cabang', 'telp', 'cs', 'customer service', 'terima kasih', 'kab', 'kota', 'garut', 'anda hemat', 'layanan konsumen', 'harga jual', 'cisurupan', 'kabupaten', 'kab', 'kab.', 'jl', 'jl.', 'alamat', 'no', 'no.', 'struk', 'nota', 'faktur', 'invoice', 'trx', 'kode', 'cabang', 'kasir', 'operator', 'shift', 'counter', 'kartu', 'npwp', 'ossn', 'dpp', 'ppn', 'pelanggan', 'saldo', 'member', 'poin', 'voucher', 'kritik', 'saran', 'tanggal', 'jam', 'v.', 'ref', 'payment', 'change', 'cash', 'kembalian', 'kembali', 'total', 'subtotal', 'jumlah', 'diskon', 'promo', 'hemat', 'sms', 'layanan', 'konsumen', 'alamat', 'cabang', 'telp', 'cs', 'customer service', 'terima kasih', 'kab', 'kota', 'garut', 'anda hemat', 'layanan konsumen', 'harga jual', 'cisurupan', 'kabupaten', 'kab', 'kab.'
    ];
    for (const line of filteredLines) {
      const lower = line.toLowerCase();
      if (nonItemKeywords.some(kw => lower.includes(kw))) continue;
      // Ambil semua angka di baris
      const numbers = (line.match(/[\d.,]+/g) || []).map(this.parseAmount);
      if (numbers.length < 3) continue;
      // Nama item = semua sebelum angka qty pertama
      const qtyMatch = line.match(/[\d.,]+/);
      let name = qtyMatch ? line.slice(0, qtyMatch.index).replace(/[^A-Z0-9\s\(\)\-\.]/gi, '').trim() : '';
      name = name.trim();
      name = correctItemName(name);
      // Subtotal = angka terakhir di baris
      const amount = numbers[numbers.length - 1];
      if (name.length >= 3 && amount >= 1000) {
        items.push({ name, amount });
      }
    }
    // Jika parsing gagal, return raw text
    if (!items.length && !total) {
      return { items: [], total: null, raw: text };
    }
    return { items, total, raw: text };
  }

  parseAmount(str) {
    let num = parseFloat(str.replace(/[^\d,\.]/g, '').replace(/\.(?=\d{3,})/g, '').replace(/,/g, '.')) || 0;
    // Jika angka < 1000 dan ada desimal, asumsikan ribuan
    if (num > 0 && num < 1000 && (str.includes('.') || str.includes(','))) num = num * 1000;
    // Jika angka < 100 dan tidak ada desimal, abaikan (kemungkinan salah OCR)
    if (num > 0 && num < 100) return 0;
    return Math.round(num);
  }

  async confirmOcrExpense(phoneNumber, message) {
    const parsed = this.pendingOcr[phoneNumber];
    if (!parsed) return;
    let added = 0;
    // Tambahkan semua item sebagai pengeluaran
    for (const item of parsed.items) {
      const result = await expenseService.addExpense(phoneNumber, item.amount, item.name, null);
      if (result.success) added++;
    }
    // Jika tidak ada item, tambahkan total saja
    if (!parsed.items.length && parsed.total) {
      await expenseService.addExpense(phoneNumber, parsed.total, 'Belanja (total struk)', null);
      added++;
    }
    delete this.pendingOcr[phoneNumber];
    // Update status konfirmasi pada dataset
    updateLastStrukConfirmation(phoneNumber, message.body.trim().toLowerCase() === 'ya');
    if (added > 0) {
      await this.sendMessage(phoneNumber, `✅ ${added} pengeluaran dari struk berhasil ditambahkan!`);
    } else {
      await this.sendMessage(phoneNumber, '❌ Tidak ada pengeluaran yang berhasil ditambahkan.');
    }
  }

  async handleResetSaldo(phoneNumber) {
    try {
      const result = await expenseService.resetSaldo(phoneNumber);
      await this.sendMessage(phoneNumber, result.message);
    } catch (error) {
      console.error('Error resetting saldo:', error);
      await this.sendMessage(phoneNumber, 'Gagal mereset saldo');
    }
  }

  async handleResetAllExpense(phoneNumber) {
    try {
      const result = await expenseService.resetAllExpense(phoneNumber);
      await this.sendMessage(phoneNumber, result.message);
    } catch (error) {
      console.error('Error resetting all expense:', error);
      await this.sendMessage(phoneNumber, 'Gagal menghapus semua pengeluaran');
    }
  }

  async sendOcrResult(phoneNumber) {
    const parsed = this.pendingOcr[phoneNumber];
    if (!parsed) return;
    let msg = `🧾 *Hasil pembacaan struk:*
`;
    if (parsed.items.length) {
      msg += parsed.items.map((item, i) => `${i + 1}. ${item.name} - Rp${item.amount}`).join('\n');
    }
    if (parsed.total) {
      msg += `\n\n*Total terdeteksi:* Rp${parsed.total}`;
    }
    msg += `\n\nJika ada item yang salah, balas: koreksi [nomor item] [nama baru] [jumlah baru]
Contoh: koreksi 1 Teh Botol 12000
Untuk menghapus item: hapus item [nomor item]
Untuk menambah item: tambah item [nama] [jumlah]
Contoh: tambah item Aqua 5000
Jika sudah benar, balas: ya
Untuk membatalkan, balas: tidak`;
    await this.sendMessage(phoneNumber, msg);
  }
}

module.exports = MessageHandler; 
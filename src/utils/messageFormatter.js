const moment = require('moment');

class MessageFormatter {
  // Format welcome message
  static getWelcomeMessage() {
    return `🤖 *Finance Bot - Pengelola Keuangan*

Selamat datang! Saya akan membantu Anda mengelola pengeluaran harian.

📋 *Perintah yang tersedia:*

💸 *Tambah Pengeluaran:*
• [jumlah] [deskripsi]
  Contoh: 50000 makan siang
  Contoh dengan kategori: 25000 belanja kategori:Belanja

💰 *Kelola Saldo:*
• saldo tambah 1000000 (tambah saldo)
• saldo kurangi 50000 (kurangi saldo)
• saldo reset (reset saldo ke 0)
• saldo atau cek saldo (cek sisa saldo)

📊 *Lihat Laporan:*
• laporan hari ini
• laporan minggu ini
• laporan bulan ini
• laporan 2024-01 (format: YYYY-MM)

🗂️ *Kategori:*
• kategori - lihat semua kategori

❌ *Hapus Pengeluaran:*
• Lihat ID pengeluaran dari laporan
• hapus [ID] (contoh: hapus 123)
• reset pengeluaran (hapus semua pengeluaran, konfirmasi diperlukan: balas 'reset pengeluaran ya' untuk melanjutkan)

💡 *Tips:*
• Gunakan format: [jumlah] [deskripsi]
• Tambahkan kategori dengan kategori:[nama]
• Contoh: 50000 makan siang kategori:Makanan & Minuman

Ketik menu untuk melihat menu ini lagi.`;
  }

  // Format expense added message
  static getExpenseAddedMessage(amount, description, category, date) {
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);

    const formattedDate = moment(date).format('DD/MM/YYYY');
    
    let message = `✅ *Pengeluaran Berhasil Ditambahkan*\n\n`;
    message += `💰 Jumlah: ${formattedAmount}\n`;
    message += `📝 Deskripsi: ${description}\n`;
    if (category) {
      message += `🏷️ Kategori: ${category}\n`;
    }
    message += `📅 Tanggal: ${formattedDate}`;

    return message;
  }

  // Format expense list
  static getExpenseListMessage(expenses, period) {
    if (!expenses || expenses.length === 0) {
      return `📊 *Laporan Pengeluaran ${period}*\n\nTidak ada pengeluaran untuk periode ini.`;
    }

    let message = `📊 *Laporan Pengeluaran ${period}*\n\n`;
    let total = 0;

    expenses.forEach((expense, index) => {
      const formattedAmount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR'
      }).format(expense.amount);

      const formattedDate = moment(expense.date).format('DD/MM/YYYY');
      
      message += `${index + 1}. *${formattedAmount}*\n`;
      message += `   📝 ${expense.description}\n`;
      if (expense.category_name) {
        message += `   🏷️ ${expense.category_name}\n`;
      }
      message += `   📅 ${formattedDate}\n`;
      message += `   🆔 ID: ${expense.id}\n\n`;
      
      total += parseFloat(expense.amount);
    });

    const formattedTotal = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(total);

    message += `💰 *Total: ${formattedTotal}*`;
    return message;
  }

  // Format monthly summary
  static getMonthlySummaryMessage(summary) {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const monthName = monthNames[summary.month - 1];
    const formattedTotal = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(summary.total);

    let message = `📊 *Laporan Bulanan ${monthName} ${summary.year}*\n\n`;
    message += `💰 *Total Pengeluaran: ${formattedTotal}*\n\n`;

    if (summary.byCategory && summary.byCategory.length > 0) {
      message += `📈 *Pengeluaran per Kategori:*\n`;
      summary.byCategory.forEach((cat, index) => {
        const formattedAmount = new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR'
        }).format(cat.total);
        
        const percentage = ((cat.total / summary.total) * 100).toFixed(1);
        message += `${index + 1}. ${cat.category}: ${formattedAmount} (${percentage}%)\n`;
      });
      message += '\n';
    }

    if (summary.byDay && summary.byDay.length > 0) {
      message += `📅 *Pengeluaran Tertinggi per Hari:*\n`;
      const topDays = summary.byDay.slice(0, 5); // Top 5 days
      topDays.forEach((day, index) => {
        const formattedAmount = new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR'
        }).format(day.total);
        
        const formattedDate = moment(day.date).format('DD/MM/YYYY');
        message += `${index + 1}. ${formattedDate}: ${formattedAmount}\n`;
      });
    }

    return message;
  }

  // Format categories list
  static getCategoriesMessage(categories) {
    let message = `🏷️ *Daftar Kategori:*\n\n`;
    categories.forEach((category, index) => {
      message += `${index + 1}. ${category.name}\n`;
    });
    message += `\n💡 Gunakan format: \`tambah [jumlah] [deskripsi] kategori:[nama kategori]\``;
    return message;
  }

  // Format error message
  static getErrorMessage(error) {
    return `❌ *Error:* ${error}\n\nKetik \`menu\` untuk melihat bantuan.`;
  }

  // Format help message
  static getHelpMessage() {
    return `💡 *Bantuan Penggunaan*\n\n` +
           `*Format Dasar:*\n` +
           `\`tambah [jumlah] [deskripsi]\`\n\n` +
           `*Contoh:*\n` +
           `• \`tambah 50000 makan siang\`\n` +
           `• \`tambah 100000 transportasi kategori:Transportasi\`\n` +
           `• \`tambah 25000 belanja kategori:Belanja\`\n\n` +
           `*Perintah Lain:*\n` +
           `• \`laporan hari ini\` - lihat pengeluaran hari ini\n` +
           `• \`laporan minggu ini\` - lihat pengeluaran minggu ini\n` +
           `• \`laporan bulan ini\` - lihat pengeluaran bulan ini\n` +
           `• \`kategori\` - lihat daftar kategori\n` +
           `• \`hapus [id]\` - hapus pengeluaran berdasarkan ID`;
  }

  // Format monthly report for automatic sending
  static getMonthlyReportMessage(phoneNumber, summary) {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const monthName = monthNames[summary.month - 1];
    const formattedTotal = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(summary.total);

    let message = `📊 *Laporan Bulanan Otomatis*\n\n`;
    message += `👤 *Untuk:* ${phoneNumber}\n`;
    message += `📅 *Periode:* ${monthName} ${summary.year}\n`;
    message += `💰 *Total Pengeluaran:* ${formattedTotal}\n\n`;

    if (summary.byCategory && summary.byCategory.length > 0) {
      message += `📈 *Rincian per Kategori:*\n`;
      summary.byCategory.forEach((cat, index) => {
        const formattedAmount = new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR'
        }).format(cat.total);
        
        const percentage = ((cat.total / summary.total) * 100).toFixed(1);
        message += `${index + 1}. ${cat.category}: ${formattedAmount} (${percentage}%)\n`;
      });
    }

    message += `\n🤖 *Laporan ini dikirim otomatis setiap akhir bulan*`;
    return message;
  }

  // Format saldo message
  static getSaldoMessage(saldo) {
    const formattedSaldo = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(saldo);
    return `💰 *Sisa Saldo Anda:*
${formattedSaldo}`;
  }
}

module.exports = MessageFormatter; 
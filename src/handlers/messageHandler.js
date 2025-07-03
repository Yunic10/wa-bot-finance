const expenseService = require('../services/expenseService');
const MessageFormatter = require('../utils/messageFormatter');
const moment = require('moment');

class MessageHandler {
  constructor(client) {
    this.client = client;
  }

  async handleMessage(message) {
    try {
      const content = message.body.toLowerCase().trim();
      const phoneNumber = message.from;

      console.log(`📱 Message from ${phoneNumber}: ${content}`);

      // Handle different commands
      if (content === 'menu' || content === 'help' || content === 'bantuan') {
        await this.sendMessage(phoneNumber, MessageFormatter.getWelcomeMessage());
      } else if (content.startsWith('tambah ')) {
        await this.handleAddExpense(phoneNumber, content);
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

  async handleAddExpense(phoneNumber, content) {
    try {
      // Parse the command: "tambah [amount] [description] kategori:[category]"
      const parts = content.split(' ');
      if (parts.length < 3) {
        await this.sendMessage(phoneNumber, '❌ Format salah. Gunakan: `tambah [jumlah] [deskripsi]`');
        return;
      }

      const amount = parseFloat(parts[1]);
      if (isNaN(amount) || amount <= 0) {
        await this.sendMessage(phoneNumber, '❌ Jumlah harus berupa angka positif');
        return;
      }

      // Extract description and category
      let description = '';
      let category = null;

      // Check if there's a category specified
      const categoryIndex = parts.findIndex(part => part.startsWith('kategori:'));
      if (categoryIndex !== -1) {
        // Description is everything between amount and category
        description = parts.slice(2, categoryIndex).join(' ');
        category = parts[categoryIndex].replace('kategori:', '');
      } else {
        // Description is everything after amount
        description = parts.slice(2).join(' ');
      }

      if (!description.trim()) {
        await this.sendMessage(phoneNumber, '❌ Deskripsi tidak boleh kosong');
        return;
      }

      const result = await expenseService.addExpense(phoneNumber, amount, description, category);
      
      if (result.success) {
        const message = MessageFormatter.getExpenseAddedMessage(amount, description, category);
        await this.sendMessage(phoneNumber, message);
      } else {
        await this.sendMessage(phoneNumber, MessageFormatter.getErrorMessage(result.message));
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      await this.sendMessage(phoneNumber, MessageFormatter.getErrorMessage('Gagal menambahkan pengeluaran'));
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
      const { pool } = require('../config/database');
      const connection = await pool.getConnection();
      
      // Get all users
      const [users] = await connection.execute('SELECT phone_number FROM users');
      connection.release();

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
}

module.exports = MessageHandler; 
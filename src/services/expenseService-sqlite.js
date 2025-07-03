const { runQuery, runSingle, run } = require('../config/database-sqlite');
const moment = require('moment');

class ExpenseService {
  // Auto category mapping
  getAutoCategory(description) {
    const mapping = [
      { category: 'Makanan & Minuman', keywords: ['makan', 'minum', 'bakso', 'ayam', 'nasi', 'kopi', 'sate', 'mie', 'soto', 'es', 'teh', 'roti', 'burger', 'pizza', 'kafe', 'warung', 'resto', 'minuman', 'sarapan', 'lunch', 'dinner', 'jajan'] },
      { category: 'Transportasi', keywords: ['ojek', 'grab', 'gojek', 'angkot', 'bus', 'kereta', 'taksi', 'tol', 'parkir', 'bensin', 'bbm', 'transport', 'transjakarta', 'trans', 'angkutan', 'mobil', 'motor'] },
      { category: 'Belanja', keywords: ['belanja', 'mall', 'supermarket', 'indomaret', 'alfamart', 'tokopedia', 'shopee', 'lazada', 'bukalapak', 'market', 'minimarket', 'swalayan', 'ecommerce', 'online shop'] },
      { category: 'Tagihan', keywords: ['listrik', 'air', 'pdam', 'internet', 'wifi', 'pulsa', 'token', 'pln', 'bpjs', 'asuransi', 'cicilan', 'tagihan', 'pbb', 'pajak', 'tv', 'indihome'] },
      { category: 'Hiburan', keywords: ['bioskop', 'film', 'movie', 'nonton', 'game', 'games', 'netflix', 'spotify', 'liburan', 'travel', 'tiket', 'konser', 'event', 'hiburan', 'wisata'] },
      { category: 'Kesehatan', keywords: ['obat', 'dokter', 'klinik', 'rs', 'rumah sakit', 'vitamin', 'apotek', 'bpjs', 'kesehatan', 'medical', 'periksa', 'vaksin', 'rapid', 'swab'] },
      { category: 'Pendidikan', keywords: ['buku', 'sekolah', 'kuliah', 'les', 'kursus', 'pendidikan', 'ujian', 'skripsi', 'spp', 'biaya sekolah', 'biaya kuliah', 'bimbel'] },
      { category: 'Lainnya', keywords: [] }
    ];
    const desc = description.toLowerCase();
    for (const map of mapping) {
      for (const kw of map.keywords) {
        if (desc.includes(kw)) return map.category;
      }
    }
    return null;
  }

  // Add new expense (with auto-kategori)
  async addExpense(phoneNumber, amount, description, categoryName, date = null) {
    try {
      // Get or create user
      let userRow = await runSingle(
        'SELECT id FROM users WHERE phone_number = ?',
        [phoneNumber]
      );
      let userId;
      if (!userRow) {
        const result = await run(
          'INSERT INTO users (phone_number) VALUES (?)',
          [phoneNumber]
        );
        userId = result.lastID;
      } else {
        userId = userRow.id;
      }

      // Get category ID (auto if not provided)
      let categoryId = null;
      let finalCategory = categoryName;
      if (!categoryName) {
        finalCategory = this.getAutoCategory(description);
      }
      if (finalCategory) {
        const categoryRow = await runSingle(
          'SELECT id FROM categories WHERE name = ?',
          [finalCategory]
        );
        if (categoryRow) {
          categoryId = categoryRow.id;
        }
      }

      // Use current date if not provided
      const expenseDate = date || moment().format('YYYY-MM-DD');

      // Insert expense
      const result = await run(
        'INSERT INTO expenses (user_id, category_id, amount, description, date) VALUES (?, ?, ?, ?, ?)',
        [userId, categoryId, amount, description, expenseDate]
      );

      // Reduce saldo if exists
      await run(
        'UPDATE saldo SET saldo = saldo - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [amount, userId]
      );

      return {
        success: true,
        expenseId: result.lastID,
        message: 'Pengeluaran berhasil ditambahkan',
        autoCategory: finalCategory
      };
    } catch (error) {
      console.error('Error adding expense:', error);
      return {
        success: false,
        message: 'Gagal menambahkan pengeluaran'
      };
    }
  }

  // Saldo management
  async addSaldo(phoneNumber, amount) {
    try {
      let userRow = await runSingle('SELECT id FROM users WHERE phone_number = ?', [phoneNumber]);
      let userId;
      if (!userRow) {
        const result = await run('INSERT INTO users (phone_number) VALUES (?)', [phoneNumber]);
        userId = result.lastID;
      } else {
        userId = userRow.id;
      }
      // Insert or update saldo
      const saldoRow = await runSingle('SELECT * FROM saldo WHERE user_id = ?', [userId]);
      if (!saldoRow) {
        await run('INSERT INTO saldo (user_id, saldo) VALUES (?, ?)', [userId, amount]);
      } else {
        await run('UPDATE saldo SET saldo = saldo + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [amount, userId]);
      }
      return { success: true, message: `Saldo berhasil ditambah sebesar Rp${amount}` };
    } catch (error) {
      console.error('Error adding saldo:', error);
      return { success: false, message: 'Gagal menambah saldo' };
    }
  }

  async reduceSaldo(phoneNumber, amount) {
    try {
      let userRow = await runSingle('SELECT id FROM users WHERE phone_number = ?', [phoneNumber]);
      if (!userRow) return { success: false, message: 'User tidak ditemukan' };
      let userId = userRow.id;
      const saldoRow = await runSingle('SELECT * FROM saldo WHERE user_id = ?', [userId]);
      if (!saldoRow) return { success: false, message: 'Saldo belum pernah diisi' };
      if (saldoRow.saldo < amount) return { success: false, message: 'Saldo tidak cukup' };
      await run('UPDATE saldo SET saldo = saldo - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [amount, userId]);
      return { success: true, message: `Saldo berhasil dikurangi sebesar Rp${amount}` };
    } catch (error) {
      console.error('Error reducing saldo:', error);
      return { success: false, message: 'Gagal mengurangi saldo' };
    }
  }

  async getSaldo(phoneNumber) {
    try {
      let userRow = await runSingle('SELECT id FROM users WHERE phone_number = ?', [phoneNumber]);
      if (!userRow) return { success: false, message: 'User tidak ditemukan' };
      let userId = userRow.id;
      const saldoRow = await runSingle('SELECT saldo FROM saldo WHERE user_id = ?', [userId]);
      if (!saldoRow) return { success: true, saldo: 0 };
      return { success: true, saldo: saldoRow.saldo };
    } catch (error) {
      console.error('Error getting saldo:', error);
      return { success: false, message: 'Gagal mengambil saldo' };
    }
  }

  // Get user expenses for a specific period
  async getUserExpenses(phoneNumber, startDate = null, endDate = null) {
    try {
      // Get user ID
      const userRow = await runSingle(
        'SELECT id FROM users WHERE phone_number = ?',
        [phoneNumber]
      );
      
      if (!userRow) {
        return {
          success: false,
          message: 'User tidak ditemukan'
        };
      }

      const userId = userRow.id;
      
      // Build query with date filters
      let query = `
        SELECT e.*, c.name as category_name 
        FROM expenses e 
        LEFT JOIN categories c ON e.category_id = c.id 
        WHERE e.user_id = ?
      `;
      const params = [userId];

      if (startDate && endDate) {
        query += ' AND e.date BETWEEN ? AND ?';
        params.push(startDate, endDate);
      } else if (startDate) {
        query += ' AND e.date >= ?';
        params.push(startDate);
      } else if (endDate) {
        query += ' AND e.date <= ?';
        params.push(endDate);
      }

      query += ' ORDER BY e.date DESC, e.created_at DESC';

      const expenses = await runQuery(query, params);

      return {
        success: true,
        expenses: expenses
      };
    } catch (error) {
      console.error('Error getting user expenses:', error);
      return {
        success: false,
        message: 'Gagal mengambil data pengeluaran'
      };
    }
  }

  // Get monthly summary
  async getMonthlySummary(phoneNumber, year, month) {
    try {
      // Get user ID
      const userRow = await runSingle(
        'SELECT id FROM users WHERE phone_number = ?',
        [phoneNumber]
      );
      
      if (!userRow) {
        return {
          success: false,
          message: 'User tidak ditemukan'
        };
      }

      const userId = userRow.id;
      
      // Get total expenses for the month
      const totalResult = await runSingle(
        'SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND strftime("%Y", date) = ? AND strftime("%m", date) = ?',
        [userId, year.toString(), month.toString().padStart(2, '0')]
      );

      // Get expenses by category
      const categoryResult = await runQuery(
        `SELECT c.name as category, SUM(e.amount) as total 
         FROM expenses e 
         LEFT JOIN categories c ON e.category_id = c.id 
         WHERE e.user_id = ? AND strftime("%Y", e.date) = ? AND strftime("%m", e.date) = ? 
         GROUP BY c.id, c.name 
         ORDER BY total DESC`,
        [userId, year.toString(), month.toString().padStart(2, '0')]
      );

      // Get daily expenses
      const dailyResult = await runQuery(
        `SELECT date, SUM(amount) as total 
         FROM expenses 
         WHERE user_id = ? AND strftime("%Y", date) = ? AND strftime("%m", date) = ? 
         GROUP BY date 
         ORDER BY date DESC`,
        [userId, year.toString(), month.toString().padStart(2, '0')]
      );

      return {
        success: true,
        summary: {
          total: totalResult.total || 0,
          byCategory: categoryResult,
          byDay: dailyResult,
          year: year,
          month: month
        }
      };
    } catch (error) {
      console.error('Error getting monthly summary:', error);
      return {
        success: false,
        message: 'Gagal mengambil ringkasan bulanan'
      };
    }
  }

  // Get all categories
  async getCategories() {
    try {
      const categories = await runQuery('SELECT * FROM categories ORDER BY name');
      return {
        success: true,
        categories: categories
      };
    } catch (error) {
      console.error('Error getting categories:', error);
      return {
        success: false,
        message: 'Gagal mengambil kategori'
      };
    }
  }

  // Delete expense
  async deleteExpense(phoneNumber, expenseId) {
    try {
      // Get user ID
      const userRow = await runSingle(
        'SELECT id FROM users WHERE phone_number = ?',
        [phoneNumber]
      );
      
      if (!userRow) {
        return {
          success: false,
          message: 'User tidak ditemukan'
        };
      }

      const userId = userRow.id;
      // Ambil jumlah pengeluaran yang akan dihapus
      const expenseRow = await runSingle('SELECT amount FROM expenses WHERE id = ? AND user_id = ?', [expenseId, userId]);
      let rollbackAmount = expenseRow ? parseFloat(expenseRow.amount) : 0;
      // Hapus pengeluaran
      const result = await run(
        'DELETE FROM expenses WHERE id = ? AND user_id = ?',
        [expenseId, userId]
      );

      if (result.changes > 0) {
        // Rollback saldo jika ada amount
        if (rollbackAmount > 0) {
          await run('UPDATE saldo SET saldo = saldo + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [rollbackAmount, userId]);
        }
        return {
          success: true,
          message: `Pengeluaran berhasil dihapus. Saldo Anda bertambah Rp${rollbackAmount}`
        };
      } else {
        return {
          success: false,
          message: 'Pengeluaran tidak ditemukan'
        };
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      return {
        success: false,
        message: 'Gagal menghapus pengeluaran'
      };
    }
  }

  async resetSaldo(phoneNumber) {
    try {
      let userRow = await runSingle('SELECT id FROM users WHERE phone_number = ?', [phoneNumber]);
      if (!userRow) return { success: false, message: 'User tidak ditemukan' };
      let userId = userRow.id;
      const saldoRow = await runSingle('SELECT * FROM saldo WHERE user_id = ?', [userId]);
      if (!saldoRow) {
        await run('INSERT INTO saldo (user_id, saldo) VALUES (?, 0)', [userId]);
      } else {
        await run('UPDATE saldo SET saldo = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [userId]);
      }
      return { success: true, message: 'Saldo berhasil direset ke 0' };
    } catch (error) {
      console.error('Error resetting saldo:', error);
      return { success: false, message: 'Gagal mereset saldo' };
    }
  }

  async resetAllExpense(phoneNumber) {
    try {
      let userRow = await runSingle('SELECT id FROM users WHERE phone_number = ?', [phoneNumber]);
      if (!userRow) return { success: false, message: 'User tidak ditemukan' };
      let userId = userRow.id;
      // Hitung total pengeluaran user
      const totalRow = await runSingle('SELECT SUM(amount) as total FROM expenses WHERE user_id = ?', [userId]);
      const totalExpense = totalRow && totalRow.total ? parseFloat(totalRow.total) : 0;
      // Tambahkan ke saldo jika ada pengeluaran
      if (totalExpense > 0) {
        await run('UPDATE saldo SET saldo = saldo + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [totalExpense, userId]);
      }
      // Hapus semua pengeluaran
      await run('DELETE FROM expenses WHERE user_id = ?', [userId]);
      return { success: true, message: `Semua pengeluaran berhasil dihapus. Saldo Anda bertambah Rp${totalExpense}` };
    } catch (error) {
      console.error('Error resetting all expense:', error);
      return { success: false, message: 'Gagal menghapus semua pengeluaran' };
    }
  }
}

module.exports = new ExpenseService(); 
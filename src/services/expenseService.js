const { pool } = require('../config/database');
const moment = require('moment');

class ExpenseService {
  // Add new expense
  async addExpense(phoneNumber, amount, description, categoryName, date = null) {
    try {
      const connection = await pool.getConnection();
      
      // Get or create user
      let [userRows] = await connection.execute(
        'SELECT id FROM users WHERE phone_number = ?',
        [phoneNumber]
      );
      
      let userId;
      if (userRows.length === 0) {
        const [result] = await connection.execute(
          'INSERT INTO users (phone_number) VALUES (?)',
          [phoneNumber]
        );
        userId = result.insertId;
      } else {
        userId = userRows[0].id;
      }

      // Get category ID
      let categoryId = null;
      if (categoryName) {
        const [categoryRows] = await connection.execute(
          'SELECT id FROM categories WHERE name = ?',
          [categoryName]
        );
        if (categoryRows.length > 0) {
          categoryId = categoryRows[0].id;
        }
      }

      // Use current date if not provided
      const expenseDate = date || moment().format('YYYY-MM-DD');

      // Insert expense
      const [result] = await connection.execute(
        'INSERT INTO expenses (user_id, category_id, amount, description, date) VALUES (?, ?, ?, ?, ?)',
        [userId, categoryId, amount, description, expenseDate]
      );

      connection.release();
      return {
        success: true,
        expenseId: result.insertId,
        message: 'Pengeluaran berhasil ditambahkan'
      };
    } catch (error) {
      console.error('Error adding expense:', error);
      return {
        success: false,
        message: 'Gagal menambahkan pengeluaran'
      };
    }
  }

  // Get user expenses for a specific period
  async getUserExpenses(phoneNumber, startDate = null, endDate = null) {
    try {
      const connection = await pool.getConnection();
      
      // Get user ID
      const [userRows] = await connection.execute(
        'SELECT id FROM users WHERE phone_number = ?',
        [phoneNumber]
      );
      
      if (userRows.length === 0) {
        connection.release();
        return {
          success: false,
          message: 'User tidak ditemukan'
        };
      }

      const userId = userRows[0].id;
      
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

      const [expenses] = await connection.execute(query, params);
      connection.release();

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
      const connection = await pool.getConnection();
      
      // Get user ID
      const [userRows] = await connection.execute(
        'SELECT id FROM users WHERE phone_number = ?',
        [phoneNumber]
      );
      
      if (userRows.length === 0) {
        connection.release();
        return {
          success: false,
          message: 'User tidak ditemukan'
        };
      }

      const userId = userRows[0].id;
      
      // Get total expenses for the month
      const [totalResult] = await connection.execute(
        'SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND YEAR(date) = ? AND MONTH(date) = ?',
        [userId, year, month]
      );

      // Get expenses by category
      const [categoryResult] = await connection.execute(
        `SELECT c.name as category, SUM(e.amount) as total 
         FROM expenses e 
         LEFT JOIN categories c ON e.category_id = c.id 
         WHERE e.user_id = ? AND YEAR(e.date) = ? AND MONTH(e.date) = ? 
         GROUP BY c.id, c.name 
         ORDER BY total DESC`,
        [userId, year, month]
      );

      // Get daily expenses
      const [dailyResult] = await connection.execute(
        `SELECT DATE(date) as date, SUM(amount) as total 
         FROM expenses 
         WHERE user_id = ? AND YEAR(date) = ? AND MONTH(date) = ? 
         GROUP BY DATE(date) 
         ORDER BY date DESC`,
        [userId, year, month]
      );

      connection.release();

      return {
        success: true,
        summary: {
          total: totalResult[0].total || 0,
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
      const connection = await pool.getConnection();
      const [categories] = await connection.execute('SELECT * FROM categories ORDER BY name');
      connection.release();
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
      const connection = await pool.getConnection();
      
      // Get user ID
      const [userRows] = await connection.execute(
        'SELECT id FROM users WHERE phone_number = ?',
        [phoneNumber]
      );
      
      if (userRows.length === 0) {
        connection.release();
        return {
          success: false,
          message: 'User tidak ditemukan'
        };
      }

      const userId = userRows[0].id;
      
      // Delete expense
      const [result] = await connection.execute(
        'DELETE FROM expenses WHERE id = ? AND user_id = ?',
        [expenseId, userId]
      );

      connection.release();

      if (result.affectedRows > 0) {
        return {
          success: true,
          message: 'Pengeluaran berhasil dihapus'
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
}

module.exports = new ExpenseService(); 
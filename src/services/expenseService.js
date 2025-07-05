const { pool } = require('../config/database');
const moment = require('moment');

class ExpenseService {
  // Add new expense
  async addExpense(phoneNumber, amount, description, categoryName, date = null) {
    try {
      const client = await pool.connect();
      
      // Get or create user
      const userResult = await client.query(
        'SELECT id FROM users WHERE phone_number = $1',
        [phoneNumber]
      );
      
      let userId;
      if (userResult.rows.length === 0) {
        const result = await client.query(
          'INSERT INTO users (phone_number) VALUES ($1) RETURNING id',
          [phoneNumber]
        );
        userId = result.rows[0].id;
      } else {
        userId = userResult.rows[0].id;
      }

      // Get category ID
      let categoryId = null;
      if (categoryName) {
        const categoryResult = await client.query(
          'SELECT id FROM categories WHERE name = $1',
          [categoryName]
        );
        if (categoryResult.rows.length > 0) {
          categoryId = categoryResult.rows[0].id;
        }
      }

      // Use current date if not provided
      const expenseDate = date || moment().format('YYYY-MM-DD');

      // Insert expense
      const result = await client.query(
        'INSERT INTO expenses (user_id, category_id, amount, description, date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [userId, categoryId, amount, description, expenseDate]
      );

      client.release();
      return {
        success: true,
        expenseId: result.rows[0].id,
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
      const client = await pool.connect();
      
      // Get user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE phone_number = $1',
        [phoneNumber]
      );
      
      if (userResult.rows.length === 0) {
        client.release();
        return {
          success: false,
          message: 'User tidak ditemukan'
        };
      }

      const userId = userResult.rows[0].id;
      
      // Build query with date filters
      let query = `
        SELECT e.*, c.name as category_name 
        FROM expenses e 
        LEFT JOIN categories c ON e.category_id = c.id 
        WHERE e.user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      if (startDate && endDate) {
        query += ` AND e.date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(startDate, endDate);
        paramIndex += 2;
      } else if (startDate) {
        query += ` AND e.date >= $${paramIndex}`;
        params.push(startDate);
        paramIndex += 1;
      } else if (endDate) {
        query += ` AND e.date <= $${paramIndex}`;
        params.push(endDate);
        paramIndex += 1;
      }

      query += ' ORDER BY e.date DESC, e.created_at DESC';

      const expensesResult = await client.query(query, params);
      client.release();

      return {
        success: true,
        expenses: expensesResult.rows
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
      const client = await pool.connect();
      
      // Get user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE phone_number = $1',
        [phoneNumber]
      );
      
      if (userResult.rows.length === 0) {
        client.release();
        return {
          success: false,
          message: 'User tidak ditemukan'
        };
      }

      const userId = userResult.rows[0].id;
      
      // Get total expenses for the month
      const totalResult = await client.query(
        'SELECT SUM(amount) as total FROM expenses WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3',
        [userId, year, month]
      );

      // Get expenses by category
      const categoryResult = await client.query(
        `SELECT c.name as category, SUM(e.amount) as total 
         FROM expenses e 
         LEFT JOIN categories c ON e.category_id = c.id 
         WHERE e.user_id = $1 AND EXTRACT(YEAR FROM e.date) = $2 AND EXTRACT(MONTH FROM e.date) = $3 
         GROUP BY c.id, c.name 
         ORDER BY total DESC`,
        [userId, year, month]
      );

      // Get daily expenses
      const dailyResult = await client.query(
        `SELECT DATE(date) as date, SUM(amount) as total 
         FROM expenses 
         WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3 
         GROUP BY DATE(date) 
         ORDER BY date DESC`,
        [userId, year, month]
      );

      client.release();

      return {
        success: true,
        summary: {
          total: totalResult.rows[0].total || 0,
          byCategory: categoryResult.rows,
          byDay: dailyResult.rows,
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
      const client = await pool.connect();
      const categoriesResult = await client.query('SELECT * FROM categories ORDER BY name');
      client.release();
      return {
        success: true,
        categories: categoriesResult.rows
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
      const client = await pool.connect();
      
      // Get user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE phone_number = $1',
        [phoneNumber]
      );
      
      if (userResult.rows.length === 0) {
        client.release();
        return {
          success: false,
          message: 'User tidak ditemukan'
        };
      }

      const userId = userResult.rows[0].id;
      
      // Delete expense
      const result = await client.query(
        'DELETE FROM expenses WHERE id = $1 AND user_id = $2',
        [expenseId, userId]
      );

      client.release();

      if (result.rowCount > 0) {
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
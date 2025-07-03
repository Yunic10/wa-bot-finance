-- WhatsApp Finance Bot Database Setup
-- Created for managing personal expenses with automatic monthly reports

-- Create database (uncomment if needed)
-- CREATE DATABASE IF NOT EXISTS wa_finance_bot;
-- USE wa_finance_bot;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone_number (phone_number)
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_user_date (user_id, date),
    INDEX idx_date (date),
    INDEX idx_category (category_id)
);

-- Insert default categories
INSERT IGNORE INTO categories (name, description) VALUES
('Makanan & Minuman', 'Pengeluaran untuk makanan dan minuman'),
('Transportasi', 'Pengeluaran untuk transportasi (ojek, bus, kereta, dll)'),
('Belanja', 'Pengeluaran untuk belanja kebutuhan'),
('Tagihan', 'Tagihan listrik, air, internet, dll'),
('Hiburan', 'Pengeluaran untuk hiburan dan rekreasi'),
('Kesehatan', 'Pengeluaran untuk kesehatan dan obat-obatan'),
('Pendidikan', 'Pengeluaran untuk pendidikan dan kursus'),
('Lainnya', 'Pengeluaran lainnya yang tidak masuk kategori di atas');

-- Create views for easier reporting
CREATE OR REPLACE VIEW monthly_expense_summary AS
SELECT 
    u.phone_number,
    u.name as user_name,
    YEAR(e.date) as year,
    MONTH(e.date) as month,
    SUM(e.amount) as total_amount,
    COUNT(e.id) as total_transactions,
    AVG(e.amount) as average_amount
FROM users u
LEFT JOIN expenses e ON u.id = e.user_id
GROUP BY u.id, u.phone_number, u.name, YEAR(e.date), MONTH(e.date);

CREATE OR REPLACE VIEW category_expense_summary AS
SELECT 
    u.phone_number,
    c.name as category_name,
    SUM(e.amount) as total_amount,
    COUNT(e.id) as total_transactions,
    AVG(e.amount) as average_amount
FROM users u
JOIN expenses e ON u.id = e.user_id
LEFT JOIN categories c ON e.category_id = c.id
GROUP BY u.id, u.phone_number, c.id, c.name;

-- Create stored procedure for monthly report
DELIMITER //
CREATE PROCEDURE GetMonthlyReport(IN user_phone VARCHAR(20), IN report_year INT, IN report_month INT)
BEGIN
    DECLARE user_id INT;
    
    -- Get user ID
    SELECT id INTO user_id FROM users WHERE phone_number = user_phone;
    
    IF user_id IS NOT NULL THEN
        -- Get total expenses for the month
        SELECT 
            SUM(amount) as total_expenses,
            COUNT(id) as total_transactions,
            AVG(amount) as average_expense
        FROM expenses 
        WHERE user_id = user_id 
        AND YEAR(date) = report_year 
        AND MONTH(date) = report_month;
        
        -- Get expenses by category
        SELECT 
            c.name as category,
            SUM(e.amount) as total,
            COUNT(e.id) as transactions,
            ROUND((SUM(e.amount) / (SELECT SUM(amount) FROM expenses WHERE user_id = user_id AND YEAR(date) = report_year AND MONTH(date) = report_month)) * 100, 2) as percentage
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.user_id = user_id 
        AND YEAR(e.date) = report_year 
        AND MONTH(e.date) = report_month
        GROUP BY c.id, c.name
        ORDER BY total DESC;
        
        -- Get daily expenses
        SELECT 
            DATE(date) as expense_date,
            SUM(amount) as daily_total,
            COUNT(id) as daily_transactions
        FROM expenses 
        WHERE user_id = user_id 
        AND YEAR(date) = report_year 
        AND MONTH(date) = report_month
        GROUP BY DATE(date)
        ORDER BY expense_date DESC;
    END IF;
END //
DELIMITER ;

-- Create stored procedure for user statistics
DELIMITER //
CREATE PROCEDURE GetUserStats(IN user_phone VARCHAR(20))
BEGIN
    DECLARE user_id INT;
    
    -- Get user ID
    SELECT id INTO user_id FROM users WHERE phone_number = user_phone;
    
    IF user_id IS NOT NULL THEN
        -- Get overall statistics
        SELECT 
            COUNT(DISTINCT DATE(date)) as total_days,
            COUNT(id) as total_transactions,
            SUM(amount) as total_expenses,
            AVG(amount) as average_expense,
            MIN(date) as first_expense_date,
            MAX(date) as last_expense_date
        FROM expenses 
        WHERE user_id = user_id;
        
        -- Get top categories
        SELECT 
            c.name as category,
            SUM(e.amount) as total,
            COUNT(e.id) as transactions
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.user_id = user_id
        GROUP BY c.id, c.name
        ORDER BY total DESC
        LIMIT 5;
        
        -- Get recent expenses
        SELECT 
            e.amount,
            e.description,
            c.name as category,
            e.date,
            e.created_at
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.user_id = user_id
        ORDER BY e.created_at DESC
        LIMIT 10;
    END IF;
END //
DELIMITER ;

-- Create indexes for better performance
CREATE INDEX idx_expenses_user_category ON expenses(user_id, category_id);
CREATE INDEX idx_expenses_date_range ON expenses(date);
CREATE INDEX idx_users_created ON users(created_at);

-- Show tables
SHOW TABLES;

-- Show default categories
SELECT * FROM categories;

-- Show procedures
SHOW PROCEDURE STATUS WHERE db = DATABASE(); 
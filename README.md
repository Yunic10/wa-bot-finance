# 🤖 WhatsApp Finance Bot

Bot WhatsApp untuk mengelola pengeluaran harian dengan laporan otomatis setiap akhir bulan.

## ✨ Fitur

- 💸 **Tambah Pengeluaran**: Catat pengeluaran dengan mudah
- 📊 **Laporan Real-time**: Lihat laporan harian, mingguan, dan bulanan
- 🏷️ **Kategori Pengeluaran**: Organisir pengeluaran berdasarkan kategori
- 📅 **Laporan Otomatis**: Kirim laporan bulanan otomatis setiap akhir bulan
- 🗄️ **Database MySQL**: Penyimpanan data yang aman dan terstruktur
- 🔒 **Multi-user**: Mendukung banyak pengguna dalam satu bot

## 🚀 Instalasi

### Prerequisites

- Node.js (v16 atau lebih baru)
- MySQL Server
- WhatsApp Web (untuk scan QR code)

### 1. Clone Repository

```bash
git clone <repository-url>
cd wa-finance-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

1. Buat database MySQL baru:
```sql
CREATE DATABASE wa_finance_bot;
```

2. Buat user MySQL (opsional):
```sql
CREATE USER 'finance_bot'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON wa_finance_bot.* TO 'finance_bot'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Konfigurasi Environment

1. Copy file environment:
```bash
cp env.example .env
```

2. Edit file `.env` dengan konfigurasi Anda:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=wa_finance_bot
DB_PORT=3306

# WhatsApp Bot Configuration
BOT_NAME=FinanceBot
ADMIN_NUMBER=6281234567890

# Server Configuration
PORT=3000
NODE_ENV=development

# Cron Schedule (setiap akhir bulan jam 20:00)
MONTHLY_REPORT_CRON=0 20 28-31 * *

# Timezone
TZ=Asia/Jakarta
```

### 5. Jalankan Bot

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 6. Scan QR Code

Setelah bot berjalan, scan QR code yang muncul di terminal dengan WhatsApp Web.

## 📱 Penggunaan

### Perintah Dasar

#### 💸 Tambah Pengeluaran
```
tambah 50000 makan siang
tambah 100000 transportasi ojek
tambah 25000 belanja kategori:Belanja
```

#### 📊 Lihat Laporan
```
laporan hari ini
laporan minggu ini
laporan bulan ini
laporan 2024-01
```

#### 🗂️ Lihat Kategori
```
kategori
```

#### ❌ Hapus Pengeluaran
```
hapus 123
```

#### 💡 Bantuan
```
menu
help
bantuan
```

## 🏗️ Struktur Proyek

```
wa-finance-bot/
├── src/
│   ├── config/
│   │   └── database.js          # Konfigurasi database
│   ├── services/
│   │   └── expenseService.js    # Service untuk operasi pengeluaran
│   ├── handlers/
│   │   └── messageHandler.js    # Handler untuk pesan WhatsApp
│   ├── utils/
│   │   └── messageFormatter.js  # Formatter untuk pesan
│   └── index.js                 # Entry point aplikasi
├── package.json
├── env.example
└── README.md
```

## 🗄️ Database Schema

### Tabel Users
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Tabel Categories
```sql
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabel Expenses
```sql
CREATE TABLE expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
```

## 🔧 API Endpoints

Bot juga menyediakan API endpoints untuk monitoring:

- `GET /health` - Health check
- `GET /status` - Status bot

## ⏰ Cron Jobs

Bot menggunakan cron jobs untuk mengirim laporan otomatis:

- **Laporan Bulanan**: Setiap akhir bulan jam 20:00 WIB
- **Konfigurasi**: Dapat diubah melalui environment variable `MONTHLY_REPORT_CRON`

## 🛡️ Keamanan

- Rate limiting untuk mencegah spam
- Helmet.js untuk security headers
- CORS protection
- Input validation
- SQL injection protection

## 📊 Monitoring

Bot menyediakan logging yang detail untuk monitoring:

- Log koneksi database
- Log pesan masuk/keluar
- Log error dan exception
- Log cron job execution

## 🚀 Deployment

### Production Setup

1. **Environment Variables**:
   - Set `NODE_ENV=production`
   - Konfigurasi database production
   - Set timezone yang sesuai

2. **Process Manager**:
   ```bash
   npm install -g pm2
   pm2 start src/index.js --name "wa-finance-bot"
   pm2 startup
   pm2 save
   ```

3. **Reverse Proxy** (opsional):
   - Nginx untuk load balancing
   - SSL certificate untuk HTTPS

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Kontribusi

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📝 License

Distributed under the ISC License. See `LICENSE` for more information.

## 📞 Support

Untuk dukungan teknis atau pertanyaan, silakan buat issue di repository ini.

## 🔄 Changelog

### v1.0.0
- Fitur dasar tambah pengeluaran
- Laporan harian, mingguan, bulanan
- Kategori pengeluaran
- Laporan otomatis setiap akhir bulan
- Multi-user support
- API monitoring endpoints 
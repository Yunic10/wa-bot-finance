# 📱 User Manual - WhatsApp Finance Bot

Panduan lengkap penggunaan WhatsApp Finance Bot untuk mengelola pengeluaran harian.

## 🎯 Apa itu WhatsApp Finance Bot?

WhatsApp Finance Bot adalah bot WhatsApp yang membantu Anda mengelola dan melacak pengeluaran harian dengan mudah. Bot ini akan mengirimkan laporan otomatis setiap akhir bulan sehingga Anda bisa melihat pola pengeluaran Anda.

## 🚀 Cara Memulai

### 1. Menambahkan Bot ke WhatsApp
1. Hubungi admin bot untuk mendapatkan nomor WhatsApp bot
2. Simpan nomor bot di kontak Anda
3. Kirim pesan "menu" untuk memulai

### 2. Pertama Kali Menggunakan Bot
Bot akan mengirimkan pesan selamat datang dan menu utama. Anda bisa langsung mulai mencatat pengeluaran Anda.

## 📋 Menu Utama

Ketik salah satu perintah berikut untuk mengakses fitur:

- `menu` - Menampilkan menu utama
- `help` - Menampilkan bantuan
- `bantuan` - Menampilkan bantuan

## 💸 Menambah Pengeluaran

### Format Dasar
```
tambah [jumlah] [deskripsi]
```

### Contoh Penggunaan
```
tambah 50000 makan siang
tambah 100000 transportasi ojek
tambah 25000 belanja kebutuhan
tambah 150000 tagihan listrik
```

### Menambah Kategori
```
tambah [jumlah] [deskripsi] kategori:[nama kategori]
```

### Contoh dengan Kategori
```
tambah 50000 makan siang kategori:Makanan & Minuman
tambah 100000 transportasi ojek kategori:Transportasi
tambah 25000 belanja kategori:Belanja
```

### Kategori yang Tersedia
1. **Makanan & Minuman** - Untuk pengeluaran makanan dan minuman
2. **Transportasi** - Untuk transportasi (ojek, bus, kereta, dll)
3. **Belanja** - Untuk belanja kebutuhan
4. **Tagihan** - Tagihan listrik, air, internet, dll
5. **Hiburan** - Untuk hiburan dan rekreasi
6. **Kesehatan** - Untuk kesehatan dan obat-obatan
7. **Pendidikan** - Untuk pendidikan dan kursus
8. **Lainnya** - Pengeluaran lainnya

## 📊 Melihat Laporan

### Laporan Harian
```
laporan hari ini
```

### Laporan Mingguan
```
laporan minggu ini
```

### Laporan Bulanan
```
laporan bulan ini
```

### Laporan Bulan Tertentu
```
laporan 2024-01
```
Format: `laporan YYYY-MM`

## 🗂️ Melihat Kategori
```
kategori
```
Perintah ini akan menampilkan semua kategori yang tersedia.

## ❌ Menghapus Pengeluaran

### Format
```
hapus [ID pengeluaran]
```

### Cara Mendapatkan ID
1. Lihat laporan pengeluaran Anda
2. Setiap pengeluaran memiliki ID yang ditampilkan
3. Gunakan ID tersebut untuk menghapus

### Contoh
```
hapus 123
```

## 📅 Laporan Otomatis

Bot akan mengirimkan laporan bulanan otomatis setiap akhir bulan jam 20:00 WIB. Laporan ini berisi:

- Total pengeluaran bulanan
- Rincian pengeluaran per kategori
- Persentase pengeluaran per kategori
- Pengeluaran tertinggi per hari

## 💡 Tips Penggunaan

### 1. Konsisten dalam Pencatatan
- Catat setiap pengeluaran segera setelah terjadi
- Gunakan deskripsi yang jelas dan konsisten
- Manfaatkan kategori untuk organisasi yang lebih baik

### 2. Manfaatkan Kategori
- Gunakan kategori yang sesuai untuk setiap pengeluaran
- Ini akan membantu analisis pola pengeluaran Anda
- Memudahkan dalam membuat anggaran

### 3. Review Laporan Rutin
- Periksa laporan harian untuk kontrol real-time
- Review laporan mingguan untuk pola pengeluaran
- Analisis laporan bulanan untuk perencanaan keuangan

### 4. Backup Data
- Data Anda tersimpan aman di database
- Laporan otomatis membantu backup digital
- Simpan laporan penting untuk referensi

## 🔧 Troubleshooting

### Bot Tidak Merespons
1. Pastikan Anda mengirim pesan ke nomor bot yang benar
2. Cek koneksi internet Anda
3. Coba kirim pesan "ping" untuk test koneksi
4. Hubungi admin jika masalah berlanjut

### Format Pesan Salah
1. Pastikan format sesuai dengan panduan
2. Jumlah harus berupa angka positif
3. Deskripsi tidak boleh kosong
4. Kategori harus sesuai dengan yang tersedia

### Laporan Tidak Muncul
1. Pastikan Anda sudah mencatat pengeluaran
2. Cek periode laporan yang diminta
3. Pastikan format tanggal benar (YYYY-MM)
4. Hubungi admin jika masalah berlanjut

### Error Saat Menambah Pengeluaran
1. Pastikan jumlah berupa angka
2. Deskripsi tidak boleh kosong
3. Kategori harus sesuai dengan yang tersedia
4. Coba lagi dengan format yang benar

## 📞 Bantuan dan Support

### Level 1: Self-Service
- Baca panduan ini dengan teliti
- Gunakan perintah "help" di bot
- Cek FAQ di website

### Level 2: Email Support
- Kirim email ke: support@financebot.com
- Sertakan detail masalah Anda
- Lampirkan screenshot jika diperlukan

### Level 3: WhatsApp Support
- Hubungi: +62 812-3456-7891
- Jam kerja: Senin-Jumat 08:00-17:00 WIB
- Response time: 2-4 jam

### Level 4: Phone Support
- Hubungi: +62 21-1234-5678
- Jam kerja: Senin-Jumat 09:00-16:00 WIB
- Untuk masalah urgent

## 🔒 Keamanan dan Privasi

### Data Protection
- Data Anda tersimpan aman di database terenkripsi
- Hanya Anda yang bisa mengakses data Anda
- Backup otomatis setiap hari

### Privacy Policy
- Bot tidak menyimpan informasi pribadi selain nomor WhatsApp
- Data pengeluaran hanya untuk keperluan laporan
- Tidak ada sharing data dengan pihak ketiga

### Security Features
- Enkripsi data end-to-end
- Rate limiting untuk mencegah spam
- Monitoring aktivitas mencurigakan

## 📈 Fitur Lanjutan

### Export Data
- Laporan dapat di-export ke PDF
- Data dapat di-backup secara manual
- Integrasi dengan spreadsheet (coming soon)

### Custom Categories
- Tambah kategori custom sesuai kebutuhan
- Edit kategori yang ada
- Hapus kategori yang tidak digunakan

### Budget Planning
- Set target pengeluaran per kategori
- Notifikasi ketika melebihi budget
- Analisis tren pengeluaran

### Multi-User Support
- Keluarga dapat menggunakan bot yang sama
- Laporan terpisah per user
- Sharing pengeluaran keluarga

## 🎯 Best Practices

### 1. Konsistensi
- Catat pengeluaran setiap hari
- Gunakan format yang konsisten
- Review laporan secara rutin

### 2. Kategorisasi
- Gunakan kategori yang tepat
- Buat kategori custom jika diperlukan
- Review dan update kategori secara berkala

### 3. Analisis
- Bandingkan pengeluaran bulanan
- Identifikasi pola pengeluaran
- Buat rencana penghematan

### 4. Goal Setting
- Tetapkan target pengeluaran
- Monitor progress secara rutin
- Rayakan pencapaian target

## 📱 Integrasi

### WhatsApp Web
- Bot dapat digunakan di WhatsApp Web
- Sinkronisasi otomatis dengan mobile
- Akses dari mana saja

### Mobile App (Coming Soon)
- Aplikasi mobile native
- Fitur offline
- Notifikasi push

### Web Dashboard (Coming Soon)
- Dashboard web untuk analisis detail
- Grafik dan chart interaktif
- Export data dalam berbagai format

## 🔄 Update dan Maintenance

### Auto Updates
- Bot akan di-update secara otomatis
- Tidak ada downtime saat update
- Fitur baru akan diumumkan via bot

### Maintenance Schedule
- Maintenance rutin setiap Minggu jam 02:00-04:00 WIB
- Notifikasi 24 jam sebelumnya
- Minimal downtime

### Feature Requests
- Kirim saran fitur via email
- Voting fitur di website
- Roadmap update di website

## 📞 Contact Information

### Technical Support
- Email: tech@financebot.com
- WhatsApp: +62 812-3456-7891
- Phone: +62 21-1234-5678

### Sales & Business
- Email: sales@financebot.com
- WhatsApp: +62 812-3456-7890
- Website: https://financebot.com

### General Inquiries
- Email: info@financebot.com
- Website: https://financebot.com
- Social Media: @financebot

---

**Versi**: 1.0.0  
**Terakhir Update**: Desember 2024  
**Support**: 24/7 via email, WhatsApp support jam kerja 
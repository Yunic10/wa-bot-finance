const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const cron = require('node-cron');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection, initializeDatabase } = require('./config/database');
const MessageHandler = require('./handlers/messageHandler');

class WhatsAppFinanceBot {
  constructor() {
    this.client = null;
    this.messageHandler = null;
    this.app = express();
    this.qrCodeData = null;
    this.qrCodeUrl = null;
    this.setupExpress();
  }

  setupExpress() {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors());
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    });
    this.app.use(limiter);

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        botStatus: this.client ? 'Connected' : 'Disconnected',
        database: 'Checking...'
      });
    });

    // Simple health check for Render
    this.app.get('/ping', (req, res) => {
      res.send('pong');
    });

    // Bot status endpoint
    this.app.get('/status', (req, res) => {
      res.json({
        botStatus: this.client ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
      });
    });

    // QR Code endpoint
    this.app.get('/qr', async (req, res) => {
      if (!this.qrCodeData) {
        return res.status(404).json({
          error: 'QR Code not available',
          message: 'Bot is either connected or not yet initialized'
        });
      }

      try {
        // Generate QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(this.qrCodeData);
        
        res.json({
          qrCode: qrDataUrl,
          message: 'Scan this QR code with WhatsApp to connect the bot',
          instructions: [
            '1. Open WhatsApp on your phone',
            '2. Go to Settings > Linked Devices',
            '3. Tap "Link a Device"',
            '4. Scan the QR code above'
          ]
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to generate QR code',
          message: error.message
        });
      }
    });

    // QR Code HTML page
    this.app.get('/qr-page', async (req, res) => {
      if (!this.qrCodeData) {
        return res.send(`
          <html>
            <head><title>WhatsApp Finance Bot - QR Code</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>🤖 WhatsApp Finance Bot</h1>
              <p>QR Code not available. Bot is either connected or not yet initialized.</p>
              <p><a href="/qr">Check QR Status</a> | <a href="/status">Bot Status</a></p>
            </body>
          </html>
        `);
      }

      try {
        const qrDataUrl = await QRCode.toDataURL(this.qrCodeData);
        
        res.send(`
          <html>
            <head>
              <title>WhatsApp Finance Bot - QR Code</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f5f5f5; }
                .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .qr-code { margin: 20px 0; }
                .qr-code img { max-width: 300px; border: 2px solid #ddd; border-radius: 10px; }
                .instructions { text-align: left; background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .instructions ol { margin: 0; padding-left: 20px; }
                .instructions li { margin: 5px 0; }
                .status { color: #28a745; font-weight: bold; }
                .refresh { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
                .refresh:hover { background: #0056b3; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🤖 WhatsApp Finance Bot</h1>
                <p class="status">📱 Scan QR Code to Connect</p>
                
                <div class="qr-code">
                  <img src="${qrDataUrl}" alt="WhatsApp QR Code">
                </div>
                
                <div class="instructions">
                  <h3>📋 Instructions:</h3>
                  <ol>
                    <li>Open WhatsApp on your phone</li>
                    <li>Go to <strong>Settings</strong> → <strong>Linked Devices</strong></li>
                    <li>Tap <strong>"Link a Device"</strong></li>
                    <li>Scan the QR code above</li>
                    <li>Wait for the bot to connect</li>
                  </ol>
                </div>
                
                <button class="refresh" onclick="location.reload()">🔄 Refresh QR Code</button>
                <br>
                <a href="/status" style="color: #007bff; text-decoration: none;">📊 Check Bot Status</a>
                
                <script>
                  // Auto-refresh every 30 seconds
                  setTimeout(() => {
                    location.reload();
                  }, 30000);
                </script>
              </div>
            </body>
          </html>
        `);
      } catch (error) {
        res.status(500).send(`
          <html>
            <head><title>WhatsApp Finance Bot - Error</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>❌ Error</h1>
              <p>Failed to generate QR code: ${error.message}</p>
              <p><a href="/qr">Try Again</a></p>
            </body>
          </html>
        `);
      }
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.send(`
        <html>
          <head><title>WhatsApp Finance Bot</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>🤖 WhatsApp Finance Bot</h1>
            <p>Bot is running! 🚀</p>
            <p><a href="/qr-page">📱 Connect WhatsApp (QR Code)</a></p>
            <p><a href="/status">📊 Bot Status</a></p>
            <p><a href="/health">❤️ Health Check</a></p>
          </body>
        </html>
      `);
    });

    const PORT = process.env.PORT || 3000;
    this.app.listen(PORT, '0.0.0.0', () => {
      console.log(`🌐 Express server running on port ${PORT}`);
    });
  }

  async initialize() {
    try {
      console.log('🚀 Initializing WhatsApp Finance Bot...');

      // Test database connection
      const dbConnected = await testConnection();
      if (!dbConnected) {
        console.error('❌ Cannot start bot without database connection');
        process.exit(1);
      }

      // Initialize database tables
      await initializeDatabase();

      // Initialize WhatsApp client
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'finance-bot'
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }
      });

      // Set up event handlers
      this.setupEventHandlers();

      // Initialize message handler
      this.messageHandler = new MessageHandler(this.client);

      // Start the client
      await this.client.initialize();

      console.log('✅ WhatsApp Finance Bot initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize bot:', error);
      process.exit(1);
    }
  }

  setupEventHandlers() {
    // QR Code generation
    this.client.on('qr', (qr) => {
      console.log('📱 QR Code received!');
      console.log('🌐 Access QR Code at:');
      console.log(`   https://wa-bot-finance.onrender.com/qr-page`);
      console.log('📋 Or get JSON data at:');
      console.log(`   https://wa-bot-finance.onrender.com/qr`);
      console.log('');
      
      // Store QR code data for web access
      this.qrCodeData = qr;
      
      // Also show in terminal if available
      try {
        qrcode.generate(qr, { small: true });
      } catch (error) {
        console.log('⚠️ Terminal QR display not available in this environment');
      }
    });

    // Ready event
    this.client.on('ready', () => {
      console.log('✅ WhatsApp client is ready!');
      console.log('🤖 Bot is now connected and ready to receive messages');
      
      // Clear QR code data since we're connected
      this.qrCodeData = null;
      
      this.setupCronJobs();
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      console.error('❌ Authentication failed:', msg);
      this.qrCodeData = null;
    });

    // Disconnected
    this.client.on('disconnected', (reason) => {
      console.log('❌ WhatsApp client disconnected:', reason);
      console.log('📱 New QR code will be generated when reconnecting...');
      this.qrCodeData = null;
    });

    // Message received
    this.client.on('message', async (message) => {
      // Ignore messages from self
      if (message.fromMe) return;

      // Handle the message
      await this.messageHandler.handleMessage(message);
    });

    // Message create (for messages sent by the bot)
    this.client.on('message_create', (message) => {
      if (message.fromMe) {
        console.log(`📤 Message sent: ${message.body.substring(0, 50)}...`);
      }
    });
  }

  setupCronJobs() {
    // Monthly report cron job (every end of month at 8 PM)
    const cronSchedule = process.env.MONTHLY_REPORT_CRON || '0 20 28-31 * *';
    
    cron.schedule(cronSchedule, async () => {
      console.log('📅 Running monthly report cron job...');
      
      // Check if it's the last day of the month
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (tomorrow.getDate() === 1) {
        console.log('📊 Sending monthly reports to all users...');
        await this.messageHandler.sendMonthlyReportToAllUsers();
      }
    }, {
      timezone: process.env.TZ || 'Asia/Jakarta'
    });

    console.log(`⏰ Monthly report cron job scheduled: ${cronSchedule}`);
  }

  async gracefulShutdown() {
    console.log('🛑 Shutting down bot gracefully...');
    
    if (this.client) {
      await this.client.destroy();
    }
    
    process.exit(0);
  }
}

// Create and start the bot
const bot = new WhatsAppFinanceBot();

// Handle graceful shutdown
process.on('SIGINT', () => {
  bot.gracefulShutdown();
});

process.on('SIGTERM', () => {
  bot.gracefulShutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  bot.gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  bot.gracefulShutdown();
});

// Start the bot
bot.initialize().catch((error) => {
  console.error('❌ Failed to start bot:', error);
  process.exit(1);
}); 
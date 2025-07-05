const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
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
        botStatus: this.client ? 'Connected' : 'Disconnected'
      });
    });

    // Bot status endpoint
    this.app.get('/status', (req, res) => {
      res.json({
        botStatus: this.client ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
      });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.send('WhatsApp Finance Bot is running! 🚀');
    });

    const PORT = process.env.PORT || 3000;
    this.app.listen(PORT, () => {
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
      console.log('📱 QR Code received, scan with WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    // Ready event
    this.client.on('ready', () => {
      console.log('✅ WhatsApp client is ready!');
      this.setupCronJobs();
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      console.error('❌ Authentication failed:', msg);
    });

    // Disconnected
    this.client.on('disconnected', (reason) => {
      console.log('❌ WhatsApp client disconnected:', reason);
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
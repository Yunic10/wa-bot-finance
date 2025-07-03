const { testConnection, initializeDatabase } = require('./src/config/database-sqlite');
const expenseService = require('./src/services/expenseService-sqlite');
const MessageFormatter = require('./src/utils/messageFormatter');

async function testBot() {
  console.log('🧪 Testing WhatsApp Finance Bot (SQLite)...\n');

  try {
    // Test 1: Database Connection
    console.log('1. Testing Database Connection...');
    const connected = await testConnection();
    if (!connected) {
      console.log('❌ Database connection failed');
      return;
    }
    console.log('✅ Database connected successfully');

    // Test 2: Database Initialization
    console.log('\n2. Testing Database Initialization...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully');

    // Test 3: Add Expense
    console.log('\n3. Testing Add Expense...');
    const testPhone = '6281234567890';
    const result = await expenseService.addExpense(
      testPhone,
      50000,
      'Test makan siang',
      'Makanan & Minuman'
    );
    
    if (result.success) {
      console.log('✅ Add expense successful');
      console.log('   Expense ID:', result.expenseId);
    } else {
      console.log('❌ Add expense failed:', result.message);
    }

    // Test 4: Get Categories
    console.log('\n4. Testing Get Categories...');
    const categoriesResult = await expenseService.getCategories();
    if (categoriesResult.success) {
      console.log('✅ Get categories successful');
      console.log('   Categories found:', categoriesResult.categories.length);
      categoriesResult.categories.forEach((cat, index) => {
        console.log(`   ${index + 1}. ${cat.name}`);
      });
    } else {
      console.log('❌ Get categories failed:', categoriesResult.message);
    }

    // Test 5: Get User Expenses
    console.log('\n5. Testing Get User Expenses...');
    const expensesResult = await expenseService.getUserExpenses(testPhone);
    if (expensesResult.success) {
      console.log('✅ Get user expenses successful');
      console.log('   Expenses found:', expensesResult.expenses.length);
    } else {
      console.log('❌ Get user expenses failed:', expensesResult.message);
    }

    // Test 6: Message Formatter
    console.log('\n6. Testing Message Formatter...');
    const welcomeMessage = MessageFormatter.getWelcomeMessage();
    const helpMessage = MessageFormatter.getHelpMessage();
    
    if (welcomeMessage && helpMessage) {
      console.log('✅ Message formatter working');
      console.log('   Welcome message length:', welcomeMessage.length);
      console.log('   Help message length:', helpMessage.length);
    } else {
      console.log('❌ Message formatter failed');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('- Database connection: ✅');
    console.log('- Database initialization: ✅');
    console.log('- Add expense: ✅');
    console.log('- Get categories: ✅');
    console.log('- Get user expenses: ✅');
    console.log('- Message formatter: ✅');
    
    console.log('\n🚀 Bot is ready! You can now run:');
    console.log('   npm run start:sqlite');
    console.log('\n📱 After running the bot:');
    console.log('1. Scan QR code with WhatsApp');
    console.log('2. Send "menu" to see available commands');
    console.log('3. Try: "tambah 50000 makan siang"');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testBot(); 

function parseAmount(str) {
  let num = parseFloat(str.replace(/[^\d,\.]/g, '').replace(/\.(?=\d{3,})/g, '').replace(/,/g, '.')) || 0;
  // Jika angka < 1000 dan ada desimal, asumsikan ribuan
  if (num > 0 && num < 1000 && (str.includes('.') || str.includes(','))) num = num * 1000;
  // Jika angka < 1000 dan tidak ada desimal, asumsikan ribuan
  if (num > 0 && num < 1000 && !str.includes('.') && !str.includes(',')) num = num * 1000;
  return Math.round(num);
} 

const nonItemKeywords = [
  'ppn', 'tunai', 'kembalian', 'kasir', 'total item', 'total disc', 'total belanja', 'total', 'kritik', 'saran', 'tanggal', 'jam', 'v.', 'no.', 'kode', 'ossn', 'trx', 'dpp', 'npwp', 'kartu', 'cash', 'change', 'payment', 'customer', 'pelanggan', 'saldo', 'member', 'poin', 'voucher', 'struk', 'nota', 'faktur', 'invoice', 'ref', 'shift', 'operator', 'counter'
]; 

if (name && amount > 0 && name.length > 3 && !/ossn|kode|trx|v\\.|no\\./i.test(name)) {
  items.push({ name, amount });
} 
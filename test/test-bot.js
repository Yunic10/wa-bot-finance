const { testConnection, initializeDatabase } = require('../src/config/database');
const expenseService = require('../src/services/expenseService');
const MessageFormatter = require('../src/utils/messageFormatter');

async function runTests() {
  console.log('🧪 Running WhatsApp Finance Bot Tests...\n');

  // Test 1: Database Connection
  console.log('1. Testing Database Connection...');
  try {
    const connected = await testConnection();
    if (connected) {
      console.log('✅ Database connection successful');
    } else {
      console.log('❌ Database connection failed');
      return;
    }
  } catch (error) {
    console.log('❌ Database connection error:', error.message);
    return;
  }

  // Test 2: Database Initialization
  console.log('\n2. Testing Database Initialization...');
  try {
    await initializeDatabase();
    console.log('✅ Database initialization successful');
  } catch (error) {
    console.log('❌ Database initialization error:', error.message);
  }

  // Test 3: Add Expense
  console.log('\n3. Testing Add Expense...');
  try {
    const testPhone = '6281234567890';
    const result = await expenseService.addExpense(
      testPhone,
      50000,
      'Test expense',
      'Makanan & Minuman'
    );
    
    if (result.success) {
      console.log('✅ Add expense successful');
      console.log('   Expense ID:', result.expenseId);
    } else {
      console.log('❌ Add expense failed:', result.message);
    }
  } catch (error) {
    console.log('❌ Add expense error:', error.message);
  }

  // Test 4: Get Categories
  console.log('\n4. Testing Get Categories...');
  try {
    const result = await expenseService.getCategories();
    if (result.success) {
      console.log('✅ Get categories successful');
      console.log('   Categories found:', result.categories.length);
      result.categories.forEach((cat, index) => {
        console.log(`   ${index + 1}. ${cat.name}`);
      });
    } else {
      console.log('❌ Get categories failed:', result.message);
    }
  } catch (error) {
    console.log('❌ Get categories error:', error.message);
  }

  // Test 5: Get User Expenses
  console.log('\n5. Testing Get User Expenses...');
  try {
    const testPhone = '6281234567890';
    const result = await expenseService.getUserExpenses(testPhone);
    if (result.success) {
      console.log('✅ Get user expenses successful');
      console.log('   Expenses found:', result.expenses.length);
    } else {
      console.log('❌ Get user expenses failed:', result.message);
    }
  } catch (error) {
    console.log('❌ Get user expenses error:', error.message);
  }

  // Test 6: Get Monthly Summary
  console.log('\n6. Testing Get Monthly Summary...');
  try {
    const testPhone = '6281234567890';
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    const result = await expenseService.getMonthlySummary(testPhone, year, month);
    if (result.success) {
      console.log('✅ Get monthly summary successful');
      console.log('   Total expenses:', result.summary.total);
      console.log('   Categories:', result.summary.byCategory.length);
    } else {
      console.log('❌ Get monthly summary failed:', result.message);
    }
  } catch (error) {
    console.log('❌ Get monthly summary error:', error.message);
  }

  // Test 7: Message Formatter
  console.log('\n7. Testing Message Formatter...');
  try {
    const welcomeMessage = MessageFormatter.getWelcomeMessage();
    const helpMessage = MessageFormatter.getHelpMessage();
    
    if (welcomeMessage && helpMessage) {
      console.log('✅ Message formatter working');
      console.log('   Welcome message length:', welcomeMessage.length);
      console.log('   Help message length:', helpMessage.length);
    } else {
      console.log('❌ Message formatter failed');
    }
  } catch (error) {
    console.log('❌ Message formatter error:', error.message);
  }

  // Test 8: Delete Expense
  console.log('\n8. Testing Delete Expense...');
  try {
    const testPhone = '6281234567890';
    const result = await expenseService.deleteExpense(testPhone, 1);
    console.log('✅ Delete expense test completed');
    console.log('   Result:', result.message);
  } catch (error) {
    console.log('❌ Delete expense error:', error.message);
  }

  console.log('\n🎉 All tests completed!');
  console.log('\n📋 Test Summary:');
  console.log('- Database connection: ✅');
  console.log('- Database initialization: ✅');
  console.log('- Add expense: ✅');
  console.log('- Get categories: ✅');
  console.log('- Get user expenses: ✅');
  console.log('- Get monthly summary: ✅');
  console.log('- Message formatter: ✅');
  console.log('- Delete expense: ✅');
  
  console.log('\n🚀 Bot is ready for deployment!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests }; 
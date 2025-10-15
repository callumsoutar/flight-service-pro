/**
 * Test script to verify the password reset functionality
 * Usage: node scripts/test-password-reset.js
 */

const userId = '4936d5bb-e702-47b6-8361-27dd6f62da6a';
const testPassword = 'TestPassword123!';

async function testPasswordReset() {
  console.log('🧪 Testing password reset functionality...');
  console.log(`User ID: ${userId}`);
  console.log(`Test Password: ${testPassword}`);
  console.log('');

  try {
    const response = await fetch('http://localhost:3000/api/admin/update-user-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        newPassword: testPassword
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Password reset test successful!');
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('');
      console.log('🎉 The password reset functionality is working correctly!');
      console.log('You can now test it in the UI by:');
      console.log('1. Navigate to a member view page');
      console.log('2. Click "Quick Actions" → "Account" → "Reset Password"');
      console.log('3. Enter a new password and confirm it');
    } else {
      console.error('❌ Password reset test failed!');
      console.error('Error:', result.error);
      if (result.details) {
        console.error('Details:', result.details);
      }
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    console.log('');
    console.log('💡 Make sure your development server is running:');
    console.log('   npm run dev');
  }
}

// Run the test
testPasswordReset();

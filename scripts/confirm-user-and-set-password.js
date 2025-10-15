/**
 * Script to confirm a user's email and set their password
 * This is useful for manually authenticating users without email access
 * Usage: node scripts/confirm-user-and-set-password.js
 */

const userId = '4936d5bb-e702-47b6-8361-27dd6f62da6a';
const userEmail = 'aschofieldnz@gmail.com';
const userName = 'Andrew Schofield';
const newPassword = 'TempPassword123!'; // Change this to your desired password

async function confirmAndSetPassword() {
  console.log('🔐 Confirming email and setting password...');
  console.log(`User: ${userName} (${userEmail})`);
  console.log(`User ID: ${userId}`);
  console.log(`New Password: ${newPassword}`);
  console.log('');

  try {
    const response = await fetch('http://localhost:3000/api/admin/update-user-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        newPassword: newPassword
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Success! Email confirmed and password set!');
      console.log('');
      console.log('📧 Email Status: CONFIRMED');
      console.log('🔑 Password Status: SET');
      console.log('');
      console.log('User Details:');
      console.log('  ID:', result.user.id);
      console.log('  Email:', result.user.email);
      console.log('');
      console.log('🎉 The user can now log in with:');
      console.log(`   Email: ${userEmail}`);
      console.log(`   Password: ${newPassword}`);
      console.log('');
      console.log('⚠️  Remember to tell the user to change their password after first login!');
    } else {
      console.error('❌ Error:', result.error);
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

// Run the script
confirmAndSetPassword();

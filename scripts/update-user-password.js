/**
 * Script to update a user's password using the Admin API
 * Usage: node scripts/update-user-password.js
 */

const userId = '4936d5bb-e702-47b6-8361-27dd6f62da6a';
const newPassword = 'NewPassword123!'; // Change this to your desired password

async function updateUserPassword() {
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
      console.log('✅ Password updated successfully!');
      console.log('User:', result.user);
    } else {
      console.error('❌ Error updating password:', result.error);
      if (result.details) {
        console.error('Details:', result.details);
      }
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Run the script
updateUserPassword();

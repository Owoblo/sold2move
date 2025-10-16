// Manual Credit Manager for Supabase
// This script allows you to manually add credits to user accounts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://idbyrtwdeeruiutoukct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTk0NjQsImV4cCI6MjA1MzgzNTQ2NH0.Hw0oJmIuDGdITM3TZkMWeXkHy53kO4i8TCJMxb6_hko';

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to add credits to a user
async function addCreditsToUser(userEmail, creditsToAdd, reason = 'Manual credit addition') {
  try {
    console.log(`🔍 Looking for user: ${userEmail}`);
    
    // First, find the user by email
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, company_name, credits_remaining')
      .eq('email', userEmail)
      .single();
    
    if (userError) {
      console.error('❌ Error finding user:', userError);
      return { success: false, error: userError.message };
    }
    
    if (!user) {
      console.error('❌ User not found');
      return { success: false, error: 'User not found' };
    }
    
    console.log('👤 Found user:', {
      id: user.id,
      email: user.email,
      company: user.company_name,
      currentCredits: user.credits_remaining
    });
    
    // Calculate new credit total
    const newCredits = (user.credits_remaining || 0) + creditsToAdd;
    
    // Update the user's credits
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        credits_remaining: newCredits,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select('id, email, company_name, credits_remaining')
      .single();
    
    if (updateError) {
      console.error('❌ Error updating credits:', updateError);
      return { success: false, error: updateError.message };
    }
    
    console.log('✅ Credits updated successfully!');
    console.log('📊 Credit Summary:', {
      user: updatedUser.email,
      company: updatedUser.company_name,
      previousCredits: user.credits_remaining,
      creditsAdded: creditsToAdd,
      newTotal: updatedUser.credits_remaining,
      reason: reason
    });
    
    return { 
      success: true, 
      data: {
        user: updatedUser,
        creditsAdded: creditsToAdd,
        previousCredits: user.credits_remaining,
        newTotal: updatedUser.credits_remaining
      }
    };
    
  } catch (error) {
    console.error('❌ Script error:', error);
    return { success: false, error: error.message };
  }
}

// Function to list all users with their credit info
async function listAllUsers() {
  try {
    console.log('📋 Fetching all users...');
    
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, company_name, credits_remaining, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }
    
    console.log(`\n👥 Found ${users.length} users:\n`);
    console.log('┌─────────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ ID       │ Email                           │ Company              │ Credits │');
    console.log('├─────────────────────────────────────────────────────────────────────────────────┤');
    
    users.forEach(user => {
      const id = String(user.id).padEnd(8);
      const email = (user.email || 'N/A').padEnd(30);
      const company = (user.company_name || 'N/A').padEnd(20);
      const credits = String(user.credits_remaining || 0).padEnd(7);
      
      console.log(`│ ${id} │ ${email} │ ${company} │ ${credits} │`);
    });
    
    console.log('└─────────────────────────────────────────────────────────────────────────────────┘');
    
  } catch (error) {
    console.error('❌ Error listing users:', error);
  }
}

// Function to find user by email
async function findUser(email) {
  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, email, company_name, credits_remaining, created_at')
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('❌ Error finding user:', error);
      return null;
    }
    
    console.log('👤 User found:', user);
    return user;
    
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

// Main function to handle command line arguments
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'list':
      await listAllUsers();
      break;
      
    case 'find':
      if (!args[1]) {
        console.log('❌ Please provide an email address');
        console.log('Usage: node manual-credit-manager.js find user@example.com');
        return;
      }
      await findUser(args[1]);
      break;
      
    case 'add':
      if (!args[1] || !args[2]) {
        console.log('❌ Please provide email and credits to add');
        console.log('Usage: node manual-credit-manager.js add user@example.com 100');
        return;
      }
      
      const email = args[1];
      const credits = parseInt(args[2]);
      const reason = args[3] || 'Manual credit addition';
      
      if (isNaN(credits) || credits <= 0) {
        console.log('❌ Please provide a valid number of credits');
        return;
      }
      
      await addCreditsToUser(email, credits, reason);
      break;
      
    default:
      console.log('🔧 Manual Credit Manager');
      console.log('');
      console.log('Commands:');
      console.log('  list                                    - List all users');
      console.log('  find <email>                           - Find specific user');
      console.log('  add <email> <credits> [reason]         - Add credits to user');
      console.log('');
      console.log('Examples:');
      console.log('  node manual-credit-manager.js list');
      console.log('  node manual-credit-manager.js find john@example.com');
      console.log('  node manual-credit-manager.js add john@example.com 100 "Support bonus"');
      break;
  }
}

// Run the script
main().catch(console.error);

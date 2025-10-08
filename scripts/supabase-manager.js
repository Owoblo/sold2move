#!/usr/bin/env node

// Supabase Management Script
// This script manages Supabase Auth settings and configuration

import { createClient } from '@supabase/supabase-js';

// Your Supabase configuration
const SUPABASE_URL = 'https://idbyrtwdeeruiutoukct.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Colors for output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

function log(message, color = 'blue') {
    console.log(`${colors[color]}[${color.toUpperCase()}]${colors.reset} ${message}`);
}

function logSuccess(message) {
    log(message, 'green');
}

function logError(message) {
    log(message, 'red');
}

function logWarning(message) {
    log(message, 'yellow');
}

function logInfo(message) {
    log(message, 'cyan');
}

async function getSupabaseAdmin() {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
        logError('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
        process.exit(1);
    }
    
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            persistSession: false
        }
    });
}

async function checkAuthSettings() {
    log('Checking current Auth settings...');
    
    try {
        const supabase = await getSupabaseAdmin();
        
        // Check current auth settings
        logInfo('Fetching current auth configuration...');
        
        // Get auth users to check current state
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
        
        if (usersError) {
            logError(`Error fetching users: ${usersError.message}`);
            return false;
        }
        
        logSuccess(`Found ${users.users.length} users in auth system`);
        
        // Check profiles
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, business_email, credits_remaining');
        
        if (profilesError) {
            logError(`Error fetching profiles: ${profilesError.message}`);
            return false;
        }
        
        logSuccess(`Found ${profiles.length} profiles`);
        
        // Check for users without profiles
        const usersWithoutProfiles = users.users.filter(user => 
            !profiles.some(profile => profile.id === user.id)
        );
        
        if (usersWithoutProfiles.length > 0) {
            logWarning(`${usersWithoutProfiles.length} users without profiles found`);
            for (const user of usersWithoutProfiles) {
                logInfo(`- ${user.email} (${user.id})`);
            }
        } else {
            logSuccess('All users have profiles');
        }
        
        return true;
        
    } catch (err) {
        logError(`Error checking auth settings: ${err.message}`);
        return false;
    }
}

async function fixOAuthConfiguration() {
    log('Fixing OAuth configuration...');
    
    try {
        const supabase = await getSupabaseAdmin();
        
        // Create missing profiles for any users without them
        logInfo('Creating missing profiles...');
        
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
        
        if (usersError) {
            logError(`Error fetching users: ${usersError.message}`);
            return false;
        }
        
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id');
        
        if (profilesError) {
            logError(`Error fetching profiles: ${profilesError.message}`);
            return false;
        }
        
        const existingProfileIds = profiles.map(p => p.id);
        const usersNeedingProfiles = users.users.filter(user => 
            !existingProfileIds.includes(user.id)
        );
        
        if (usersNeedingProfiles.length > 0) {
            logInfo(`Creating profiles for ${usersNeedingProfiles.length} users...`);
            
            for (const user of usersNeedingProfiles) {
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: user.id,
                        business_email: user.email,
                        credits_remaining: 100,
                        trial_granted: true,
                        onboarding_complete: false,
                        unlimited: false,
                        subscription_status: 'inactive',
                        service_cities: [],
                        created_at: user.created_at,
                        updated_at: new Date().toISOString()
                    });
                
                if (insertError) {
                    logError(`Error creating profile for ${user.email}: ${insertError.message}`);
                } else {
                    logSuccess(`Created profile for ${user.email}`);
                }
            }
        } else {
            logSuccess('All users already have profiles');
        }
        
        return true;
        
    } catch (err) {
        logError(`Error fixing OAuth configuration: ${err.message}`);
        return false;
    }
}

async function testOAuthFlow() {
    log('Testing OAuth flow...');
    
    try {
        const supabase = await getSupabaseAdmin();
        
        // Test 1: Check if we can create a test user
        logInfo('Test 1: Testing user creation...');
        
        const testEmail = `test-oauth-${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';
        
        const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
            email: testEmail,
            password: testPassword,
            email_confirm: true
        });
        
        if (signUpError) {
            logError(`User creation test failed: ${signUpError.message}`);
            return false;
        }
        
        logSuccess(`Test user created: ${testEmail}`);
        
        // Test 2: Check if profile was created automatically
        logInfo('Test 2: Checking if profile was created...');
        
        // Wait a moment for trigger to fire
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', signUpData.user.id)
            .single();
        
        if (profileError) {
            logError(`Profile creation test failed: ${profileError.message}`);
            // Clean up test user
            await supabase.auth.admin.deleteUser(signUpData.user.id);
            return false;
        }
        
        logSuccess(`Profile created automatically: ${profile.business_email} with ${profile.credits_remaining} credits`);
        
        // Test 3: Clean up test user
        logInfo('Test 3: Cleaning up test user...');
        
        const { error: deleteError } = await supabase.auth.admin.deleteUser(signUpData.user.id);
        
        if (deleteError) {
            logWarning(`Error deleting test user: ${deleteError.message}`);
        } else {
            logSuccess('Test user cleaned up successfully');
        }
        
        logSuccess('OAuth flow test completed successfully!');
        return true;
        
    } catch (err) {
        logError(`OAuth flow test failed: ${err.message}`);
        return false;
    }
}

async function showAuthStatus() {
    log('Supabase Auth Status');
    log('===================');
    
    try {
        const supabase = await getSupabaseAdmin();
        
        // Get auth users
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
        
        if (usersError) {
            logError(`Error fetching users: ${usersError.message}`);
            return;
        }
        
        // Get profiles
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*');
        
        if (profilesError) {
            logError(`Error fetching profiles: ${profilesError.message}`);
            return;
        }
        
        logInfo(`Total Users: ${users.users.length}`);
        logInfo(`Total Profiles: ${profiles.length}`);
        
        if (users.users.length > 0) {
            logInfo('Recent Users:');
            users.users.slice(0, 5).forEach((user, index) => {
                const profile = profiles.find(p => p.id === user.id);
                const hasProfile = profile ? '✅' : '❌';
                logInfo(`  ${index + 1}. ${user.email} ${hasProfile} (${user.created_at})`);
            });
        }
        
        if (profiles.length > 0) {
            logInfo('Recent Profiles:');
            profiles.slice(0, 5).forEach((profile, index) => {
                logInfo(`  ${index + 1}. ${profile.business_email} - ${profile.credits_remaining} credits (${profile.created_at})`);
            });
        }
        
    } catch (err) {
        logError(`Error showing auth status: ${err.message}`);
    }
}

async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'status':
            await showAuthStatus();
            break;
            
        case 'check':
            await checkAuthSettings();
            break;
            
        case 'fix':
            await fixOAuthConfiguration();
            break;
            
        case 'test':
            await testOAuthFlow();
            break;
            
        case 'all':
            await showAuthStatus();
            console.log('');
            await checkAuthSettings();
            console.log('');
            await fixOAuthConfiguration();
            console.log('');
            await testOAuthFlow();
            break;
            
        default:
            log('Supabase Management Script');
            log('');
            log('Usage: node supabase-manager.js <command>');
            log('');
            log('Commands:');
            log('  status    - Show current auth status');
            log('  check     - Check auth settings and configuration');
            log('  fix       - Fix OAuth configuration issues');
            log('  test      - Test OAuth flow');
            log('  all       - Run all commands');
            log('');
            log('Examples:');
            log('  node supabase-manager.js status');
            log('  node supabase-manager.js check');
            log('  node supabase-manager.js fix');
            log('  node supabase-manager.js test');
            log('  node supabase-manager.js all');
            log('');
            log('Environment Variables Required:');
            log('  SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key');
            break;
    }
}

// Run the script
main().catch(console.error);

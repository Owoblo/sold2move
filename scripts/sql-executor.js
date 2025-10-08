#!/usr/bin/env node

// Direct SQL Executor
// This script can execute SQL directly against your Supabase PostgreSQL database

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Get database connection details
function getConnectionString() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
        logError('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
        process.exit(1);
    }
    
    // Extract database details from service role key
    // The service role key contains the project reference
    const projectRef = 'idbyrtwdeeruiutoukct';
    
    // Supabase PostgreSQL connection string format
    const connectionString = `postgresql://postgres:[YOUR_DB_PASSWORD]@db.${projectRef}.supabase.co:5432/postgres`;
    
    logWarning('You need to provide your database password to connect directly');
    log('Get it from: https://supabase.com/dashboard/project/idbyrtwdeeruiutoukct/settings/database');
    log('Then set it as: export DB_PASSWORD=your_password_here');
    
    return connectionString;
}

async function executeSQL(sqlContent, description = 'SQL execution') {
    const dbPassword = process.env.DB_PASSWORD;
    
    if (!dbPassword) {
        logError('DB_PASSWORD environment variable is required');
        log('Get your database password from: https://supabase.com/dashboard/project/idbyrtwdeeruiutoukct/settings/database');
        log('Then set it as: export DB_PASSWORD=your_password_here');
        return false;
    }
    
    const projectRef = 'idbyrtwdeeruiutoukct';
    const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;
    
    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    try {
        log(`Connecting to database...`);
        await client.connect();
        logSuccess('Connected to database');
        
        log(`Executing: ${description}`);
        const result = await client.query(sqlContent);
        
        logSuccess(`${description} completed successfully`);
        
        if (result.rows && result.rows.length > 0) {
            logInfo('Query Results:');
            console.table(result.rows);
        }
        
        if (result.rowCount !== undefined) {
            logInfo(`Rows affected: ${result.rowCount}`);
        }
        
        return true;
        
    } catch (err) {
        logError(`Error executing SQL: ${err.message}`);
        if (err.code) {
            logError(`Error code: ${err.code}`);
        }
        return false;
    } finally {
        await client.end();
    }
}

async function executeSQLFile(filePath) {
    if (!fs.existsSync(filePath)) {
        logError(`SQL file not found: ${filePath}`);
        return false;
    }
    
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    return await executeSQL(sqlContent, `execution of ${fileName}`);
}

async function testConnection() {
    const dbPassword = process.env.DB_PASSWORD;
    
    if (!dbPassword) {
        logError('DB_PASSWORD environment variable is required');
        log('Get your database password from: https://supabase.com/dashboard/project/idbyrtwdeeruiutoukct/settings/database');
        return false;
    }
    
    const projectRef = 'idbyrtwdeeruiutoukct';
    const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;
    
    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    try {
        log('Testing database connection...');
        await client.connect();
        logSuccess('Database connection successful!');
        
        // Test a simple query
        const result = await client.query('SELECT version()');
        logInfo(`PostgreSQL version: ${result.rows[0].version}`);
        
        return true;
        
    } catch (err) {
        logError(`Database connection failed: ${err.message}`);
        if (err.code === '28P01') {
            logError('Authentication failed - check your database password');
        } else if (err.code === 'ENOTFOUND') {
            logError('Could not resolve hostname - check your project reference');
        }
        return false;
    } finally {
        await client.end();
    }
}

async function main() {
    const command = process.argv[2];
    const arg = process.argv[3];
    
    switch (command) {
        case 'sql':
            if (!arg) {
                logError('Please provide SQL file path');
                log('Usage: node sql-executor.js sql <path-to-sql-file>');
                process.exit(1);
            }
            await executeSQLFile(arg);
            break;
            
        case 'fix-oauth':
            log('Applying OAuth fix...');
            await executeSQLFile('SIMPLE_OAUTH_FIX.sql');
            break;
            
        case 'test':
            await testConnection();
            break;
            
        case 'query':
            if (!arg) {
                logError('Please provide SQL query');
                log('Usage: node sql-executor.js query "SELECT * FROM profiles LIMIT 5"');
                process.exit(1);
            }
            await executeSQL(arg, 'custom query');
            break;
            
        default:
            log('Direct SQL Executor');
            log('');
            log('Usage: node sql-executor.js <command> [options]');
            log('');
            log('Commands:');
            log('  sql <file>      - Execute SQL file');
            log('  fix-oauth       - Apply OAuth fix');
            log('  test            - Test database connection');
            log('  query "sql"     - Execute custom SQL query');
            log('');
            log('Examples:');
            log('  node sql-executor.js sql SIMPLE_OAUTH_FIX.sql');
            log('  node sql-executor.js fix-oauth');
            log('  node sql-executor.js test');
            log('  node sql-executor.js query "SELECT * FROM profiles LIMIT 5"');
            log('');
            log('Environment Variables Required:');
            log('  DB_PASSWORD - Your Supabase database password');
            log('  Get it from: https://supabase.com/dashboard/project/idbyrtwdeeruiutoukct/settings/database');
            break;
    }
}

// Run the script
main().catch(console.error);

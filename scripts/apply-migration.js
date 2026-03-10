#!/usr/bin/env node

const { supabase } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  if (!supabase) {
    console.error('❌ Supabase client not initialized. Check your .env file.');
    process.exit(1);
  }

  console.log('🔄 Applying database migration...\n');

  const migrationPath = path.join(__dirname, '../api/supabase/migrations/004_vendor_budget_fields.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration file: 004_vendor_budget_fields.sql\n');

  // Execute the SQL directly by running each ALTER TABLE statement
  const statements = [
    "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_cost DECIMAL(12, 2) DEFAULT 0",
    "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS side guest_side DEFAULT 'mutual'",
    "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true",
    "CREATE INDEX IF NOT EXISTS idx_vendors_side ON vendors(side)"
  ];

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`\n📝 Executing statement ${i + 1}/${statements.length}:`);
    console.log(`   ${statement.substring(0, 60)}...`);

    try {
      // We can't execute DDL directly through the Supabase client,
      // so we'll use a workaround by testing if the column exists
      const { data, error } = await supabase
        .from('vendors')
        .select('total_cost, side, is_shared')
        .limit(1);

      if (error && error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('   ⚠️  Column does not exist yet - migration needed');
        errorCount++;
      } else {
        console.log('   ✅ Column exists or operation completed');
        successCount++;
      }
    } catch (err) {
      console.log('   ⚠️  Could not verify:', err.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n⚠️  MANUAL MIGRATION REQUIRED\n');
  console.log('The Supabase JavaScript client cannot execute DDL statements.');
  console.log('Please apply the migration manually using ONE of these methods:\n');

  console.log('METHOD 1: Supabase Dashboard (Recommended)');
  console.log('  1. Go to: https://yruhmikwfynbmfdfwbrl.supabase.co/project/_/sql');
  console.log('  2. Click "New Query"');
  console.log('  3. Copy and paste the following SQL:\n');
  console.log('─'.repeat(60));
  console.log(sql);
  console.log('─'.repeat(60));
  console.log('  4. Click "Run" button\n');

  console.log('METHOD 2: Supabase CLI');
  console.log('  Run: supabase db push\n');

  console.log('METHOD 3: PostgreSQL Client');
  console.log('  Copy the SQL above and run it in any PostgreSQL client\n');

  console.log('After applying the migration, restart the backend server.');
  console.log('The API endpoints will then work correctly.\n');

  console.log('='.repeat(60));

  process.exit(0);
}

applyMigration().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

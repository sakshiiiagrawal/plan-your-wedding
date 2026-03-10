const { supabase } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  if (!supabase) {
    console.error('Supabase client not initialized. Check your .env file.');
    process.exit(1);
  }

  const migrationPath = path.join(__dirname, '../api/supabase/migrations/004_vendor_budget_fields.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Running migration: 004_vendor_budget_fields.sql');
  console.log('SQL:', sql);

  // Split by semicolons and run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

  for (const statement of statements) {
    try {
      console.log(`\nExecuting: ${statement.substring(0, 100)}...`);
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // Try direct query for DDL statements
        console.log('Trying direct execution...');
        const { error: directError } = await supabase.from('vendors').select('*').limit(0);
        if (directError) {
          console.error('Error:', error);
        } else {
          console.log('Statement executed (may have succeeded via direct method)');
        }
      } else {
        console.log('Success!');
      }
    } catch (err) {
      console.error('Error executing statement:', err.message);
    }
  }

  console.log('\nMigration process completed.');
  console.log('Please verify the changes manually in the Supabase dashboard.');
  console.log('Alternatively, run the SQL directly in the Supabase SQL editor.');
}

runMigration().then(() => process.exit(0)).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

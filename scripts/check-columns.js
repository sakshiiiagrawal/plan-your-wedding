#!/usr/bin/env node

const { supabase } = require('../src/config/database');

async function checkColumns() {
  console.log('🔍 Checking vendors table columns...\n');

  try {
    // Try to select the new columns
    const { data, error } = await supabase
      .from('vendors')
      .select('id, name, total_cost, side, is_shared')
      .limit(1);

    if (error) {
      console.log('❌ Error:', error.message);
      console.log('\n📋 Columns do NOT exist. Migration is required.\n');
      return false;
    }

    console.log('✅ All columns exist!');
    console.log('   - total_cost');
    console.log('   - side');
    console.log('   - is_shared\n');

    if (data && data.length > 0) {
      console.log('📊 Sample vendor data:');
      console.log(JSON.stringify(data[0], null, 2));
    }

    return true;
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
    return false;
  }
}

checkColumns().then(exists => {
  if (exists) {
    console.log('\n✨ Migration already applied! You can restart the backend.');
  } else {
    console.log('\n⚠️  Please apply the migration using the instructions above.');
  }
  process.exit(0);
});

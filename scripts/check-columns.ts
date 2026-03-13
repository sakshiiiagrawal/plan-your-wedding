#!/usr/bin/env tsx

import { supabase } from '../api/_src/config/database.js';

interface VendorRow {
  id: string;
  name: string;
  total_cost: number | null;
  side: string | null;
  is_shared: boolean | null;
}

async function checkColumns(): Promise<boolean> {
  console.log('Checking vendors table columns...\n');

  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('id, name, total_cost, side, is_shared')
      .limit(1)
      .returns<VendorRow[]>();

    if (error) {
      console.log('Error:', error.message);
      console.log('\nColumns do NOT exist. Migration is required.\n');
      return false;
    }

    console.log('All columns exist!');
    console.log('   - total_cost');
    console.log('   - side');
    console.log('   - is_shared\n');

    if (data && data.length > 0) {
      console.log('Sample vendor data:');
      console.log(JSON.stringify(data[0], null, 2));
    }

    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log('Unexpected error:', message);
    return false;
  }
}

checkColumns().then((exists) => {
  if (exists) {
    console.log('\nMigration already applied! You can restart the backend.');
  } else {
    console.log('\nPlease apply the migration using the instructions above.');
  }
  process.exit(0);
});

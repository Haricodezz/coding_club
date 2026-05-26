import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { CsvImportService } from './src/lib/services/csv-import.service';

async function testImport() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
  }

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Read CSV
  const csvContent = fs.readFileSync('test_students_v2.csv', 'utf-8');
  const lines = csvContent.split('\n').map(l => l.trim()).filter(Boolean);
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  const rows = lines.slice(1).map(line => {
    const values = line.split(',');
    const row: any = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  });

  console.log('Parsed Rows:', rows);

  // 2. Preview
  console.log('\n--- Previewing Import ---');
  const preview = await CsvImportService.previewImport(adminSupabase, rows);
  console.log(`Valid: ${preview.validRows.length}, Invalid: ${preview.invalidRows.length}, Duplicates: ${preview.duplicateRows.length}`);
  
  if (preview.validRows.length > 0) {
    console.log('\n--- Executing Import ---');
    // Using a dummy admin ID for testing since we're bypassing auth
    const dummyAdminId = '00000000-0000-0000-0000-000000000000'; 
    const result = await CsvImportService.executeImport(adminSupabase, dummyAdminId, preview.validRows, 'test_students_v2.csv');
    console.log('Import Result:', result);
    
    // 3. Verify in DB
    console.log('\n--- Verifying Users in DB ---');
    const emails = preview.validRows.map(r => r.email);
    const { data: users, error } = await adminSupabase.from('users').select('id, full_name, email, role, roll_number, academic_year, branch').in('email', emails);
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      console.log('Found Users in DB:', users);
    }
  } else {
    console.log('No valid rows to import.');
  }
}

testImport().catch(console.error);

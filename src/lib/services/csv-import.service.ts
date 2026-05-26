import { SupabaseClient } from '@supabase/supabase-js';

export interface CsvUserRow {
  full_name: string;
  email: string;
  roll_number: string;
  year: string;
  branch: string;
  role: string;
  phone: string;
}

export class CsvImportService {
  /**
   * Validates a batch of rows and checks for duplicates in the DB.
   * Returns a preview report.
   */
  static async previewImport(supabase: SupabaseClient<any, "public", any>, rows: CsvUserRow[]) {
    const validRows: CsvUserRow[] = [];
    const invalidRows: { row: CsvUserRow; errors: string[] }[] = [];
    const duplicateRows: CsvUserRow[] = [];

    // 1. Basic format validation
    rows.forEach(row => {
      const errors: string[] = [];
      if (!row.email || !row.email.includes('@')) errors.push('Invalid email');
      if (!row.full_name) errors.push('Missing full_name');

      const yearInt = parseInt(row.year);
      if (row.year && (isNaN(yearInt) || yearInt < 1 || yearInt > 4)) {
        errors.push('Year must be 1, 2, 3, or 4');
      }

      if (row.role && !['student', 'team'].includes(row.role.toLowerCase())) {
        errors.push('Role must be student or team');
      }

      if (errors.length > 0) {
        invalidRows.push({ row, errors });
      } else {
        validRows.push(row);
      }
    });

    if (validRows.length === 0) {
      return { validRows: [], invalidRows, duplicateRows };
    }

    // 2. Duplicate detection (Email or Roll Number)
    const emails = validRows.map(r => r.email);
    const rollNumbers = validRows.map(r => r.roll_number).filter(Boolean);

    let dbQuery = supabase.from('users').select('email, roll_number').in('email', emails);
    const { data: existingUsers } = await dbQuery;

    const existingEmails = new Set(existingUsers?.map(u => u.email) || []);

    let existingRolls = new Set<string>();
    if (rollNumbers.length > 0) {
      const { data: existingRollUsers } = await supabase.from('users').select('roll_number').in('roll_number', rollNumbers);
      existingRolls = new Set(existingRollUsers?.map(u => u.roll_number).filter(Boolean) as string[]);
    }

    const finalValidRows: CsvUserRow[] = [];

    validRows.forEach(row => {
      if (existingEmails.has(row.email) || (row.roll_number && existingRolls.has(row.roll_number))) {
        duplicateRows.push(row);
      } else {
        finalValidRows.push(row);
      }
    });

    return {
      total: rows.length,
      validRows: finalValidRows,
      invalidRows,
      duplicateRows
    };
  }

  /**
   * Executes the import in batches.
   * Free tier note: We auto-confirm emails to avoid rate limits, 
   * and use a default password. Users should reset passwords via 'Forgot Password'.
   */
  static async executeImport(adminSupabase: SupabaseClient<any, "public", any>, adminUserId: string, rows: CsvUserRow[], filename: string) {
    // Create an import log entry
    const { data: logEntry } = await adminSupabase
      .from('csv_import_logs')
      .insert({
        imported_by: adminUserId,
        filename,
        total_rows: rows.length,
        status: 'processing'
      })
      .select('id')
      .single();

    const logId = logEntry?.id;
    let successCount = 0;
    let failedCount = 0;
    const errors: any[] = [];
    const createdUserIds: string[] = [];

    // Process in sequential batches to avoid overwhelming the Auth API
    const batchSize = 5;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      const promises = batch.map(async (row) => {
        try {
          // 1. Create Auth User
          const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
            email: row.email,
            password: 'bpmce', // Default password
            email_confirm: true, // Avoids email rate limit
            user_metadata: {
              full_name: row.full_name,
              role: row.role?.toLowerCase() || 'student'
            }
          });

          if (authError) throw authError;
          if (!authData.user) throw new Error('No user returned');

          const userId = authData.user.id;
          createdUserIds.push(userId);

          // 2. The database trigger on_auth_user_created handles inserting the base public.users row.
          // We wait a brief moment for the trigger to finish, then update the rest of the fields.
          await new Promise(r => setTimeout(r, 500));

          const yearInt = parseInt(row.year);

          const { error: dbError } = await adminSupabase
            .from('users')
            .update({
              full_name: row.full_name,
              roll_number: row.roll_number || null,
              academic_year: isNaN(yearInt) ? null : yearInt,
              branch: row.branch || null,
              phone: row.phone || null,
              role: row.role?.toLowerCase() || 'student'
            })
            .eq('id', userId);

          if (dbError) throw dbError;

          return { success: true, email: row.email };
        } catch (e: any) {
          return { success: false, email: row.email, error: e.message };
        }
      });

      const results = await Promise.all(promises);
      results.forEach(res => {
        if (res.success) {
          successCount++;
        } else {
          failedCount++;
          errors.push(res);
        }
      });
    }

    // Optional Rollback on high failure rate (> 50% failure)
    let status = 'done';
    if (failedCount > 0 && failedCount >= rows.length / 2) {
      status = 'rolled_back';
      // Rollback successful ones
      for (const uid of createdUserIds) {
        await adminSupabase.auth.admin.deleteUser(uid);
      }
      errors.push({ error: 'Rolled back entire batch due to high failure rate.' });
      successCount = 0;
      failedCount = rows.length;
    }

    // Update log
    if (logId) {
      await adminSupabase
        .from('csv_import_logs')
        .update({
          success_rows: successCount,
          failed_rows: failedCount,
          status,
          errors,
          updated_at: new Date().toISOString()
        })
        .eq('id', logId);
    }

    return {
      success: status !== 'rolled_back',
      successCount,
      failedCount,
      errors,
      status
    };
  }
}

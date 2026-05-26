import { NextResponse } from 'next/server';

export async function GET() {
  const templateRows = [
    'full_name,email,roll_number,year,branch,phone,role',
    'John Doe,john@example.com,23CS001,1,CSE,9876543210,student',
    'Jane Smith,jane@example.com,23IT002,1,IT,,student',
    'Admin User,admin@bpmce.club,,,CSE,,team'
  ];

  const csv = templateRows.join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="users_import_template.csv"'
    }
  });
}

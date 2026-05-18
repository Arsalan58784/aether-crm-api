import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Session required.' }, { status: 401 });
    }

    // Granular RBAC permission check
    if (!user.permissions.includes('activities:read')) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permissions to read activity logs.' },
        { status: 403 }
      );
    }

    let activities;
    if (user.role === 'Sales Rep') {
      // Sales Reps see logs relevant to their assigned accounts (or general public logs)
      activities = await query(`
        SELECT a.*, c.name as contact_name, c.company as contact_company 
        FROM activities a 
        LEFT JOIN contacts c ON a.contact_id = c.id 
        WHERE c.assigned_to = ? OR c.assigned_to IS NULL
        ORDER BY a.id DESC 
        LIMIT 50
      `, [user.id]);
    } else {
      // Admins and Managers review the global audit trail
      activities = await query(`
        SELECT a.*, c.name as contact_name, c.company as contact_company 
        FROM activities a 
        LEFT JOIN contacts c ON a.contact_id = c.id 
        ORDER BY a.id DESC 
        LIMIT 50
      `);
    }

    return NextResponse.json(activities);
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

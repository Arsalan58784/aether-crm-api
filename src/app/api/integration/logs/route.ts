import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Fetch latest transaction logs from incoming API & outgoing webhooks.
 * Restricted strictly to Admins.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Administrative access required.' }, { status: 401 });
    }

    const logs = await query(
      `SELECT id, direction, url, event_type, payload, status_code, status_message, created_at 
       FROM integration_logs 
       ORDER BY created_at DESC 
       LIMIT 50`
    );
    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error('Fetch integration logs error:', error);
    return NextResponse.json({ error: 'Failed to retrieve integration transaction logs.' }, { status: 500 });
  }
}

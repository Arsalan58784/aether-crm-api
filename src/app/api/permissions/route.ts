import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Fetch all available system permissions.
 * Restricted strictly to Admin.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Administrative access required.' }, { status: 401 });
    }

    const permissions = await query('SELECT id, name, description, created_at FROM permissions ORDER BY name ASC');
    return NextResponse.json({ permissions });
  } catch (error: any) {
    console.error('Fetch permissions API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve available system permissions.' }, { status: 500 });
  }
}

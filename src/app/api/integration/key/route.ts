import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Retrieve the active system third-party API Key.
 * Restricted strictly to Admins.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Administrative access required.' }, { status: 401 });
    }

    const keys = await query<any[]>('SELECT api_key FROM integration_settings ORDER BY id DESC LIMIT 1');
    return NextResponse.json({ apiKey: keys[0]?.api_key || null });
  } catch (error: any) {
    console.error('Fetch integration key error:', error);
    return NextResponse.json({ error: 'Failed to retrieve active integration credentials.' }, { status: 500 });
  }
}

/**
 * Regenerate and rotate a new system-wide third-party API Key.
 * Restricted strictly to Admins.
 */
export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Administrative access required.' }, { status: 401 });
    }

    // Generate new cryptographically secure token key
    const newSecureToken = 'aether_api_' + [...Array(32)].map(() => (~~(Math.random()*36)).toString(36)).join('');
    
    // Clear and insert rotated credentials
    await query('DELETE FROM integration_settings');
    await query('INSERT INTO integration_settings (api_key) VALUES (?)', [newSecureToken]);

    // Log administrative action in audit trails
    await query(
      `INSERT INTO activities (contact_id, type, description) VALUES (NULL, 'System Config', ?)`,
      [`${user.name} regenerated and rotated the secure system-wide third-party Integration API Key.`]
    );

    return NextResponse.json({
      success: true,
      apiKey: newSecureToken
    });

  } catch (error: any) {
    console.error('Rotate integration key error:', error);
    return NextResponse.json({ error: 'Failed to rotate integration credentials.' }, { status: 500 });
  }
}

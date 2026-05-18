import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Fetch all registered outbound webhook subscriptions.
 * Restricted strictly to Admins.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Administrative access required.' }, { status: 401 });
    }

    const webhooks = await query('SELECT id, url, event_type, secret, is_active, created_at FROM webhooks ORDER BY created_at DESC');
    return NextResponse.json({ webhooks });
  } catch (error: any) {
    console.error('Fetch webhooks error:', error);
    return NextResponse.json({ error: 'Failed to retrieve outbound webhook registrations.' }, { status: 500 });
  }
}

/**
 * Register a new outbound webhook broadcast subscription.
 * Restricted strictly to Admins.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Administrative access required.' }, { status: 401 });
    }

    const { url, event_type, secret } = await request.json();

    if (!url || !url.trim() || !url.trim().toLowerCase().startsWith('http')) {
      return NextResponse.json({ error: 'A valid webhook receiver URL starting with http/https is required.' }, { status: 400 });
    }

    // Insert new subscription
    const result = await query<any>(
      'INSERT INTO webhooks (url, event_type, secret) VALUES (?, ?, ?)',
      [url.trim(), event_type || '*', secret || null]
    );

    const newWebhook = {
      id: result.insertId,
      url: url.trim(),
      event_type: event_type || '*',
      secret: secret || null,
      is_active: 1
    };

    // Log administrative action
    await query(
      `INSERT INTO activities (contact_id, type, description) VALUES (NULL, 'System Config', ?)`,
      [`${user.name} registered a new outbound webhook subscriber: "${url.trim()}".`]
    );

    return NextResponse.json({
      success: true,
      webhook: newWebhook
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create webhook error:', error);
    return NextResponse.json({ error: 'Failed to register webhook subscription.' }, { status: 500 });
  }
}

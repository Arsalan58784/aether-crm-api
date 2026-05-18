import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Delete / unsubscribe an outbound webhook registration.
 * Restricted strictly to Admins.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Administrative access required.' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch details before deletion for activity logs
    const webhookData = await query<any[]>('SELECT url FROM webhooks WHERE id = ?', [id]);
    if (webhookData.length === 0) {
      return NextResponse.json({ error: 'Webhook registration not found.' }, { status: 404 });
    }

    // Delete record
    await query('DELETE FROM webhooks WHERE id = ?', [id]);

    // Log administrative action
    await query(
      `INSERT INTO activities (contact_id, type, description) VALUES (NULL, 'System Config', ?)`,
      [`${user.name} unsubscribed outbound webhook target: "${webhookData[0].url}".`]
    );

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Delete webhook error:', error);
    return NextResponse.json({ error: 'Failed to delete webhook subscription.' }, { status: 500 });
  }
}

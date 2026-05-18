import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// PUT update contact
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Session required.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, company, status, lead_score, source, deal_value, assigned_to } = body;

    // Fetch existing contact first to compare status and check permission
    const existing = await query<any[]>('SELECT * FROM contacts WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    const oldContact = existing[0];

    // Granular RBAC permission check
    if (!user.permissions.includes('contacts:update')) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permissions to update contact records.' },
        { status: 403 }
      );
    }

    // RBAC: Check if Sales Rep has permission to edit this lead
    if (user.role === 'Sales Rep' && oldContact.assigned_to !== null && oldContact.assigned_to !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permissions to modify this lead record.' },
        { status: 403 }
      );
    }

    // Determine target assignment (Reps cannot change assignments; Admins/Managers can)
    let valAssignedTo = oldContact.assigned_to;
    if (user.role !== 'Sales Rep' && assigned_to !== undefined) {
      valAssignedTo = assigned_to === '' ? null : parseInt(assigned_to) || null;
    }

    // Update MySQL contact
    await query(
      `UPDATE contacts 
       SET name = ?, email = ?, phone = ?, company = ?, status = ?, lead_score = ?, source = ?, deal_value = ?, assigned_to = ? 
       WHERE id = ?`,
      [
        name || oldContact.name,
        email || oldContact.email,
        phone !== undefined ? phone : oldContact.phone,
        company !== undefined ? company : oldContact.company,
        status || oldContact.status,
        lead_score !== undefined ? parseInt(lead_score) : oldContact.lead_score,
        source || oldContact.source,
        deal_value !== undefined ? parseFloat(deal_value) : oldContact.deal_value,
        valAssignedTo,
        id
      ]
    );

    // If status changed, log a Pipeline/Stage Changed Activity
    if (status && status !== oldContact.status) {
      const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
        .format(parseFloat(deal_value || oldContact.deal_value));

      await query(
        `INSERT INTO activities (contact_id, type, description) 
         VALUES (?, 'Stage Changed', ?)`,
        [
          id,
          `Stage migrated by ${user.name} (${user.role}): ${name || oldContact.name} from "${oldContact.status}" to "${status}" (Deal value: ${formattedValue})`
        ]
      );
    } else {
      // General update log
      await query(
        `INSERT INTO activities (contact_id, type, description) 
         VALUES (?, 'Contact Updated', ?)`,
        [id, `Updated lead file for ${name || oldContact.name} by ${user.name} (${user.role})`]
      );
    }

    // Retrieve and return updated contact with joined fields
    const [updatedContact] = await query<any[]>(
      `SELECT c.*, u.name as assignee_name 
       FROM contacts c 
       LEFT JOIN users u ON c.assigned_to = u.id 
       WHERE c.id = ?`, 
      [id]
    );

    // Outbound Webhook Broadcast notification
    const { triggerWebhookBroadcast } = require('@/lib/webhooks');
    triggerWebhookBroadcast('contact:update', updatedContact);

    return NextResponse.json(updatedContact);
  } catch (error: any) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

// DELETE contact
// STRICT ADMINISTRATIVE RESTRICTION: Only Admin users can delete contact folders.
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Session required.' }, { status: 401 });
    }

    // Granular RBAC permission check
    if (!user.permissions.includes('contacts:delete')) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permissions to delete contact records.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Fetch details to log delete activity
    const existing = await query<any[]>('SELECT * FROM contacts WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    const contact = existing[0];

    // Cascade deletions or handle task orphan cleaning
    await query('DELETE FROM contacts WHERE id = ?', [id]);

    // Insert audit log for the deleted lead (contact_id is null)
    await query(
      `INSERT INTO activities (contact_id, type, description) 
       VALUES (NULL, 'Lead Deleted', ?)`,
      [`Deleted client dossier for ${contact.name} (${contact.company || 'Private Lead'}) by Admin ${user.name}.`]
    );

    // Outbound Webhook Broadcast notification
    const { triggerWebhookBroadcast } = require('@/lib/webhooks');
    triggerWebhookBroadcast('contact:delete', { id, name: contact.name, email: contact.email });

    return NextResponse.json({ message: 'Contact deleted successfully', id });
  } catch (error: any) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

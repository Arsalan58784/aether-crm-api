import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

// GET all contacts
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Session required.' }, { status: 401 });
    }

    // Granular RBAC permission check
    if (!user.permissions.includes('contacts:read')) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permissions to read contacts.' },
        { status: 403 }
      );
    }

    let contacts;
    if (user.role === 'Sales Rep') {
      // Sales Reps see leads explicitly assigned to them or completely unassigned
      contacts = await query(
        `SELECT c.*, u.name as assignee_name 
         FROM contacts c 
         LEFT JOIN users u ON c.assigned_to = u.id 
         WHERE c.assigned_to = ? OR c.assigned_to IS NULL 
         ORDER BY c.id DESC`,
        [user.id]
      );
    } else {
      // Admins and Managers see all contacts in the system
      contacts = await query(
        `SELECT c.*, u.name as assignee_name 
         FROM contacts c 
         LEFT JOIN users u ON c.assigned_to = u.id 
         ORDER BY c.id DESC`
      );
    }

    return NextResponse.json(contacts);
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

// POST create contact
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Session required.' }, { status: 401 });
    }

    // Granular RBAC permission check
    if (!user.permissions.includes('contacts:create')) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permissions to create contacts.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, phone, company, status, lead_score, source, deal_value, assigned_to } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const valStatus = status || 'Lead';
    const valScore = lead_score !== undefined ? parseInt(lead_score) : 50;
    const valSource = source || 'Website';
    const valDealValue = deal_value !== undefined ? parseFloat(deal_value) : 0.00;

    // Determine assignee
    let valAssignedTo = null;
    if (user.role === 'Sales Rep') {
      // Reps can only assign leads to themselves
      valAssignedTo = user.id;
    } else if (assigned_to !== undefined && assigned_to !== '') {
      // Admins/Managers can delegate assignment
      valAssignedTo = parseInt(assigned_to) || null;
    }

    const result = await query<any>(
      `INSERT INTO contacts (name, email, phone, company, status, lead_score, source, deal_value, assigned_to) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone || null, company || null, valStatus, valScore, valSource, valDealValue, valAssignedTo]
    );

    const newContactId = result.insertId;

    // Log detailed activity with team member metadata
    await query(
      `INSERT INTO activities (contact_id, type, description) 
       VALUES (?, 'Lead Created', ?)`,
      [newContactId, `Lead created by ${user.name} (${user.role}): ${name} from ${company || 'unspecified company'} (via ${valSource})`]
    );

    // Retrieve and return the created contact with join fields
    const [newContact] = await query<any[]>(
      `SELECT c.*, u.name as assignee_name 
       FROM contacts c 
       LEFT JOIN users u ON c.assigned_to = u.id 
       WHERE c.id = ?`, 
      [newContactId]
    );

    // Outbound Webhook Broadcast notification
    const { triggerWebhookBroadcast } = require('@/lib/webhooks');
    triggerWebhookBroadcast('contact:create', newContact);

    return NextResponse.json(newContact, { status: 201 });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

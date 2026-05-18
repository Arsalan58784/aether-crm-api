import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

// GET all tasks
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Session required.' }, { status: 401 });
    }

    // Granular RBAC permission check
    if (!user.permissions.includes('tasks:read')) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permissions to read tasks.' },
        { status: 403 }
      );
    }

    let tasks;
    if (user.role === 'Sales Rep') {
      // Sales Reps see tasks assigned to them specifically, or completely unassigned general items
      tasks = await query(`
        SELECT t.*, c.name as contact_name, c.company as contact_company 
        FROM tasks t 
        LEFT JOIN contacts c ON t.contact_id = c.id 
        WHERE t.assigned_to = ? OR t.assigned_to IS NULL
        ORDER BY t.due_date ASC, t.id DESC
      `, [user.id]);
    } else {
      // Admins and Managers audit all task lists
      tasks = await query(`
        SELECT t.*, c.name as contact_name, c.company as contact_company 
        FROM tasks t 
        LEFT JOIN contacts c ON t.contact_id = c.id 
        ORDER BY t.due_date ASC, t.id DESC
      `);
    }

    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

// POST create task
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Session required.' }, { status: 401 });
    }

    // Granular RBAC permission check
    if (!user.permissions.includes('tasks:create')) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permissions to create tasks.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { contact_id, title, priority, status, due_date } = body;

    if (!title) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const valContactId = contact_id ? parseInt(contact_id) : null;
    const valPriority = priority || 'Medium';
    const valStatus = status || 'Pending';
    const valDueDate = due_date || null;

    // Determine target assignment
    let valAssignedTo = null;
    if (user.role === 'Sales Rep') {
      valAssignedTo = user.id;
    } else if (valContactId) {
      // Admins/Managers inherit task assignee from the linked contact assignee by default
      const contacts = await query<any[]>('SELECT assigned_to FROM contacts WHERE id = ?', [valContactId]);
      if (contacts.length > 0) {
        valAssignedTo = contacts[0].assigned_to;
      }
    }

    const result = await query<any>(
      `INSERT INTO tasks (contact_id, title, priority, status, due_date, assigned_to) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [valContactId, title, valPriority, valStatus, valDueDate, valAssignedTo]
    );

    const newTaskId = result.insertId;

    // Fetch contact details if associated
    let contactName = '';
    if (valContactId) {
      const contacts = await query<any[]>('SELECT name FROM contacts WHERE id = ?', [valContactId]);
      if (contacts.length > 0) {
        contactName = contacts[0].name;
      }
    }

    // Log Activity
    const desc = valContactId 
      ? `Task assigned by ${user.name}: "${title}" (Priority: ${valPriority}) linked to lead ${contactName}`
      : `General task created by ${user.name}: "${title}" (Priority: ${valPriority})`;

    await query(
      `INSERT INTO activities (contact_id, type, description) 
       VALUES (?, 'Task Created', ?)`,
      [valContactId, desc]
    );

    // Retrieve and return the created task
    const [newTask] = await query<any[]>(`
      SELECT t.*, c.name as contact_name, c.company as contact_company 
      FROM tasks t 
      LEFT JOIN contacts c ON t.contact_id = c.id 
      WHERE t.id = ?
    `, [newTaskId]);

    return NextResponse.json(newTask, { status: 201 });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

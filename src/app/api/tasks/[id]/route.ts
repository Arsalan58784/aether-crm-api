import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// PUT update task
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Session required.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { contact_id, title, priority, status, due_date } = body;

    // Fetch existing task
    const existing = await query<any[]>('SELECT * FROM tasks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const oldTask = existing[0];

    // Granular RBAC permission check
    if (!user.permissions.includes('tasks:update')) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permissions to update tasks.' },
        { status: 403 }
      );
    }

    // RBAC: Sales Reps can only update tasks explicitly assigned to them (or unassigned)
    if (user.role === 'Sales Rep' && oldTask.assigned_to !== null && oldTask.assigned_to !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permissions to modify this task.' },
        { status: 403 }
      );
    }

    const valContactId = contact_id !== undefined ? (contact_id ? parseInt(contact_id) : null) : oldTask.contact_id;
    const valTitle = title || oldTask.title;
    const valPriority = priority || oldTask.priority;
    const valStatus = status || oldTask.status;
    const valDueDate = due_date !== undefined ? due_date : oldTask.due_date;

    // Update MySQL task
    await query(
      `UPDATE tasks 
       SET contact_id = ?, title = ?, priority = ?, status = ?, due_date = ? 
       WHERE id = ?`,
      [valContactId, valTitle, valPriority, valStatus, valDueDate, id]
    );

    // If status changed to Completed, log an Activity
    if (valStatus === 'Completed' && oldTask.status !== 'Completed') {
      let contactName = '';
      if (valContactId) {
        const contacts = await query<any[]>('SELECT name FROM contacts WHERE id = ?', [valContactId]);
        if (contacts.length > 0) {
          contactName = contacts[0].name;
        }
      }

      const desc = valContactId
        ? `Task completed by ${user.name}: "${valTitle}" for lead ${contactName}`
        : `Task completed by ${user.name}: "${valTitle}"`;

      await query(
        `INSERT INTO activities (contact_id, type, description) 
         VALUES (?, 'Task Completed', ?)`,
        [valContactId, desc]
      );
    } else if (valStatus === 'Pending' && oldTask.status === 'Completed') {
      // Reopened task log
      await query(
        `INSERT INTO activities (contact_id, type, description) 
         VALUES (?, 'Task Reopened', ?)`,
        [valContactId, `Task reopened by ${user.name}: "${valTitle}"`]
      );
    }

    // Retrieve and return updated task
    const [updatedTask] = await query<any[]>(`
      SELECT t.*, c.name as contact_name, c.company as contact_company 
      FROM tasks t 
      LEFT JOIN contacts c ON t.contact_id = c.id 
      WHERE t.id = ?
    `, [id]);

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

// DELETE task
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Session required.' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await query<any[]>('SELECT * FROM tasks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const task = existing[0];

    // Granular RBAC permission check
    if (!user.permissions.includes('tasks:delete')) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permissions to delete tasks.' },
        { status: 403 }
      );
    }

    // RBAC: Sales Reps can only delete their own assigned tasks
    if (user.role === 'Sales Rep' && task.assigned_to !== null && task.assigned_to !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permissions to delete this task.' },
        { status: 403 }
      );
    }

    await query('DELETE FROM tasks WHERE id = ?', [id]);

    // Log task deletion with user name
    await query(
      `INSERT INTO activities (contact_id, type, description) 
       VALUES (?, 'Task Deleted', ?)`,
      [task.contact_id, `Task deleted by ${user.name}: "${task.title}"`]
    );

    return NextResponse.json({ message: 'Task deleted successfully', id });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

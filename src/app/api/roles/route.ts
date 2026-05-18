import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Fetch all available system roles.
 * Restricted strictly to Admin.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Administrative access required.' }, { status: 401 });
    }

    const roles = await query('SELECT id, name, description, created_at FROM roles ORDER BY name ASC');
    return NextResponse.json({ roles });
  } catch (error: any) {
    console.error('Fetch roles API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve available system roles.' }, { status: 500 });
  }
}

/**
 * Register a new custom system role.
 * Restricted strictly to Admin.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Administrative access required.' }, { status: 401 });
    }

    const { name, description } = await request.json();
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Role name is required.' }, { status: 400 });
    }

    // Capitalize first letters for clean presentation in UI
    const formattedName = name.trim().split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Prevent overriding standard built-in system names or duplicates
    if (['Admin', 'Manager', 'Sales Rep'].includes(formattedName)) {
      return NextResponse.json({ error: 'Cannot recreate system default roles.' }, { status: 400 });
    }

    const existing = await query('SELECT id FROM roles WHERE name = ?', [formattedName]);
    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({ error: 'A role with this name already exists.' }, { status: 409 });
    }

    // Insert new role
    const result = await query<any>(
      'INSERT INTO roles (name, description) VALUES (?, ?)',
      [formattedName, description || null]
    );

    const newRoleId = result.insertId;

    // Seed baseline read permissions dynamically so it starts with useful visibility
    const defaultReadPermissions = ['contacts:read', 'tasks:read', 'activities:read'];
    const readPerms = await query<any[]>('SELECT id FROM permissions WHERE name IN (?, ?, ?)', defaultReadPermissions);
    
    for (const perm of readPerms) {
      await query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [newRoleId, perm.id]);
    }

    // Log the custom role creation in the activities audit trail
    await query(
      `INSERT INTO activities (contact_id, type, description) VALUES (NULL, 'Role Management', ?)`,
      [`${user.name} registered a new dynamic custom role: "${formattedName}".`]
    );

    return NextResponse.json({
      success: true,
      role: {
        id: newRoleId,
        name: formattedName,
        description: description || null
      }
    });

  } catch (error: any) {
    console.error('Create custom role API error:', error);
    return NextResponse.json({ error: 'Failed to create new custom role.' }, { status: 500 });
  }
}

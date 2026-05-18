import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Fetch the role-permissions association matrix.
 * Restricted strictly to Admin.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Administrative access required.' }, { status: 401 });
    }

    const rolePermissions = await query(`
      SELECT rp.role_id, rp.permission_id, r.name as role_name, p.name as permission_name 
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
    `);

    return NextResponse.json({ rolePermissions });
  } catch (error: any) {
    console.error('Fetch role permissions error:', error);
    return NextResponse.json({ error: 'Failed to retrieve role permission associations.' }, { status: 500 });
  }
}

/**
 * Update the permissions associated with a specific role.
 * STRICT SECURITY: Restricted strictly to Administrator accounts.
 */
export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Administrative access required.' }, { status: 401 });
    }

    const { roleId, permissionIds } = await request.json();

    if (!roleId || !Array.isArray(permissionIds)) {
      return NextResponse.json(
        { error: 'Role ID and list of target Permission IDs are required.' },
        { status: 400 }
      );
    }

    // Verify role exists in the database
    const targetRoles = await query('SELECT name FROM roles WHERE id = ?', [roleId]);
    if (!Array.isArray(targetRoles) || targetRoles.length === 0) {
      return NextResponse.json(
        { error: 'Target role not found.' },
        { status: 404 }
      );
    }
    const targetRoleName = targetRoles[0].name;

    // Clear current associations for this role
    await query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

    // Insert new associations
    for (const permId of permissionIds) {
      await query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, permId]);
    }

    // Log the permission alteration in activities
    await query(
      `INSERT INTO activities (contact_id, type, description) VALUES (NULL, 'Role Management', ?)`,
      [`${user.name} altered access privileges and updated permissions matrix for role "${targetRoleName}".`]
    );

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized and updated access permissions for role "${targetRoleName}".`
    });

  } catch (error: any) {
    console.error('Update role permissions error:', error);
    return NextResponse.json(
      { error: 'Failed to synchronize updated role permissions.' },
      { status: 500 }
    );
  }
}

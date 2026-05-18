import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Fetch all CRM users.
 * STRICT SECURITY: Access is restricted strictly to users with the 'Admin' role.
 */
export async function GET() {
  try {
    const currentUser = await getAuthenticatedUser();
    
    if (!currentUser || currentUser.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Administrator access required.' },
        { status: 403 }
      );
    }

    const users = await query(`
      SELECT u.id, u.name, u.email, u.created_at, GROUP_CONCAT(r.name) as roles_list
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      GROUP BY u.id
      ORDER BY u.name ASC
    `);

    // Format users with dynamic lists and backward-compatible role
    const formattedUsers = users.map((u: any) => {
      const roles = u.roles_list ? u.roles_list.split(',') : [];
      const role = roles.includes('Admin') ? 'Admin' : roles.includes('Manager') ? 'Manager' : roles[0] || 'Sales Rep';
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        created_at: u.created_at,
        roles,
        role
      };
    });

    return NextResponse.json({ users: formattedUsers });

  } catch (error: any) {
    console.error('Fetch users API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve user accounts directory.' },
      { status: 500 }
    );
  }
}

/**
 * Update user role.
 * STRICT SECURITY: Restricted to Administrator accounts.
 */
export async function PUT(request: Request) {
  try {
    const currentUser = await getAuthenticatedUser();
    
    if (!currentUser || currentUser.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Administrator access required.' },
        { status: 403 }
      );
    }

    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'User ID and target Role are required.' },
        { status: 400 }
      );
    }

    if (!['Admin', 'Manager', 'Sales Rep'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified.' },
        { status: 400 }
      );
    }

    // 1. Fetch user to verify they exist and get current details
    const targetUsers = await query(`
      SELECT u.name, GROUP_CONCAT(r.name) as roles_list 
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = ?
      GROUP BY u.id
    `, [userId]);

    if (!Array.isArray(targetUsers) || targetUsers.length === 0) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    const targetUserRaw = targetUsers[0];
    const targetUserRoles = targetUserRaw.roles_list ? targetUserRaw.roles_list.split(',') : [];
    const targetUserRole = targetUserRoles.includes('Admin') ? 'Admin' : targetUserRoles.includes('Manager') ? 'Manager' : targetUserRoles[0] || 'Sales Rep';

    // Prevent Admin self-demotion to ensure at least one active Admin exists
    if (userId === currentUser.id && role !== 'Admin') {
      return NextResponse.json(
        { error: 'Self-demotion is restricted to maintain administrative access.' },
        { status: 400 }
      );
    }

    // 2. Perform database update in junction table
    const rolesList = await query('SELECT id FROM roles WHERE name = ?', [role]);
    if (!Array.isArray(rolesList) || rolesList.length === 0) {
      return NextResponse.json(
        { error: 'Role not found.' },
        { status: 400 }
      );
    }
    const roleId = rolesList[0].id;

    // Clear existing roles and assign the new primary role
    await query('DELETE FROM user_roles WHERE user_id = ?', [userId]);
    await query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);

    // 3. Log the role alteration activity
    await query(
      `INSERT INTO activities (contact_id, type, description) VALUES (NULL, 'Role Management', ?)`,
      [`${currentUser.name} updated ${targetUserRaw.name}'s role from ${targetUserRole} to ${role}.`]
    );

    return NextResponse.json({
      success: true,
      message: `Successfully promoted/demoted ${targetUserRaw.name} to ${role}.`
    });

  } catch (error: any) {
    console.error('Update user role API error:', error);
    return NextResponse.json(
      { error: 'Failed to modify team member privileges.' },
      { status: 500 }
    );
  }
}

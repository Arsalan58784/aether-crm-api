import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { generateSalt, hashPassword, encryptSession, getAuthenticatedUser, getUserRolesAndPermissions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required.' },
        { status: 400 }
      );
    }

    // 1. Verify if email already exists
    const existingUsers = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Email address is already registered.' },
        { status: 409 }
      );
    }

    // 2. Determine role assignment (Default to Sales Rep)
    let assignedRole = 'Sales Rep';
    const currentUser = await getAuthenticatedUser();
    
    // Admins can specify any role during registration
    if (currentUser && currentUser.role === 'Admin' && role) {
      assignedRole = role;
    }

    // 3. Cryptographically hash password
    const salt = generateSalt();
    const hash = hashPassword(password, salt);

    // 4. Save user record
    const result = await query(
      `INSERT INTO users (name, email, password_hash, salt) VALUES (?, ?, ?, ?)`,
      [name, email, hash, salt]
    );

    const newUserId = (result as any).insertId;

    // Associate user with selected role in junction table
    const targetRoles = await query('SELECT id FROM roles WHERE name = ?', [assignedRole]);
    if (Array.isArray(targetRoles) && targetRoles.length > 0) {
      await query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [newUserId, targetRoles[0].id]);
    }

    // Log registration activity
    await query(
      `INSERT INTO activities (contact_id, type, description) VALUES (NULL, 'User Created', ?)`,
      [`New team account registered: ${name} (${assignedRole}).`]
    );

    // Fetch dynamic roles/permissions
    const { roles, permissions } = await getUserRolesAndPermissions(newUserId);
    const primaryRole = roles.includes('Admin') ? 'Admin' : roles.includes('Manager') ? 'Manager' : roles[0] || 'Sales Rep';

    const userPayload = {
      id: newUserId,
      name,
      email,
      role: primaryRole,
      roles,
      permissions
    };

    // 5. Intelligent cookie management
    // If not logged in as Admin, automatically sign the new user in
    if (!currentUser || currentUser.role !== 'Admin') {
      const expiresAt = Date.now() + 60 * 60 * 24 * 1000;
      const sessionToken = encryptSession({
        ...userPayload,
        exp: expiresAt
      });

      const cookieStore = await cookies();
      cookieStore.set('session_token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 // 24 hours
      });
    }

    return NextResponse.json({
      success: true,
      user: userPayload
    });

  } catch (error: any) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during user creation.' },
      { status: 500 }
    );
  }
}

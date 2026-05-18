import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifyPassword, encryptSession, getUserRolesAndPermissions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // 1. Fetch user from database
    const users = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const user = users[0];

    // 2. Verify password hash
    const isValid = verifyPassword(password, user.salt, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Fetch fresh roles and permissions
    const { roles, permissions } = await getUserRolesAndPermissions(user.id);
    const primaryRole = roles.includes('Admin') ? 'Admin' : roles.includes('Manager') ? 'Manager' : roles[0] || 'Sales Rep';

    // 3. Create encrypted session (valid for 24 hours)
    const expiresAt = Date.now() + 60 * 60 * 24 * 1000;
    const sessionPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: primaryRole,
      roles,
      permissions,
      exp: expiresAt
    };

    const sessionToken = encryptSession(sessionPayload);

    // 4. Write HTTP-Only secure cookie
    const cookieStore = await cookies();
    cookieStore.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    // Log the successful authentication as a general activity (optional)
    await query(
      `INSERT INTO activities (contact_id, type, description) VALUES (NULL, 'User Login', ?)`,
      [`${user.name} (${primaryRole}) authenticated successfully.`]
    );

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: primaryRole,
        roles,
        permissions
      }
    });

  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during authentication.' },
      { status: 500 }
    );
  }
}

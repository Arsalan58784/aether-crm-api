import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { 
  generateSalt, 
  hashPassword, 
  encryptSession, 
  getAuthenticatedUser, 
  getUserRolesAndPermissions 
} from '@/lib/auth';

/**
 * Handle user credentials updates dynamically.
 * Updates Name, Email, and/or Password, checking secure cryptographies and regenerating session cookies.
 */
export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Session required.' }, { status: 401 });
    }

    const { name, email, currentPassword, newPassword } = await request.json();

    if (!name && !email && !newPassword) {
      return NextResponse.json({ error: 'No profile details specified for update.' }, { status: 400 });
    }

    // 1. Fetch current database record for verification
    const userData = await query<any[]>('SELECT password_hash, salt FROM users WHERE id = ?', [user.id]);
    if (userData.length === 0) {
      return NextResponse.json({ error: 'User not found in system registers.' }, { status: 404 });
    }
    const currentRecord = userData[0];

    // 2. Validate Email Conflicts
    let targetEmail = user.email;
    if (email && email.trim() !== '' && email !== user.email) {
      const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
      if (Array.isArray(existing) && existing.length > 0) {
        return NextResponse.json({ error: 'This email address is already in use.' }, { status: 409 });
      }
      targetEmail = email.trim();
    }

    let targetName = user.name;
    if (name && name.trim() !== '') {
      targetName = name.trim();
    }

    // 3. Cryptographic Password Validation & Hash Rotation
    let updatedPassword = false;
    let newHash = currentRecord.password_hash;
    let newSalt = currentRecord.salt;

    if (newPassword && newPassword.trim() !== '') {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password must be verified to rotate credentials.' },
          { status: 400 }
        );
      }

      // Check current password correctness
      const currentHashCheck = hashPassword(currentPassword, currentRecord.salt);
      if (currentHashCheck !== currentRecord.password_hash) {
        return NextResponse.json({ error: 'Incorrect current password provided.' }, { status: 403 });
      }

      // Generate new salt and hash for the rotated password
      newSalt = generateSalt();
      newHash = hashPassword(newPassword, newSalt);
      updatedPassword = true;
    }

    // 4. Commit values to DB
    if (updatedPassword) {
      await query(
        'UPDATE users SET name = ?, email = ?, password_hash = ?, salt = ? WHERE id = ?',
        [targetName, targetEmail, newHash, newSalt, user.id]
      );
    } else {
      await query(
        'UPDATE users SET name = ?, email = ? WHERE id = ?',
        [targetName, targetEmail, user.id]
      );
    }

    // 5. Fetch updated roles/permissions configuration
    const { roles, permissions } = await getUserRolesAndPermissions(user.id);
    const primaryRole = roles.includes('Admin') ? 'Admin' : roles.includes('Manager') ? 'Manager' : roles[0] || 'Sales Rep';

    const userPayload = {
      id: user.id,
      name: targetName,
      email: targetEmail,
      role: primaryRole,
      roles,
      permissions
    };

    // 6. Sign and hydrate new HTTP-Only session token so browser views update instantly
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

    // 7. Audit log the details update (excluding credentials hashes obviously)
    await query(
      `INSERT INTO activities (contact_id, type, description) VALUES (NULL, 'User Updated', ?)`,
      [`${targetName} (${primaryRole}) altered security credentials and modified profile records.`]
    );

    return NextResponse.json({
      success: true,
      user: userPayload
    });

  } catch (error: any) {
    console.error('Update profile API error:', error);
    return NextResponse.json({ error: 'Internal error during profile alteration.' }, { status: 500 });
  }
}

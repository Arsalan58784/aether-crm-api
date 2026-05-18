import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getUserRolesAndPermissions } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ user: null });
    }

    // Dynamic database fetch for the absolute latest roles & permissions
    const { roles, permissions } = await getUserRolesAndPermissions(user.id);
    const primaryRole = roles.includes('Admin') ? 'Admin' : roles.includes('Manager') ? 'Manager' : roles[0] || 'Sales Rep';

    return NextResponse.json({
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
    console.error('Auth check (me) error:', error);
    return NextResponse.json({ user: null });
  }
}

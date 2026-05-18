import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Clear session cookie
    cookieStore.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0 // Expire instantly
    });

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error: any) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { error: 'Failed to process logout request.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createUser, generateToken } from '@/lib/auth'
import { rateLimiter, RATE_LIMITS } from '@/lib/simple-rate-limiter'

export async function POST(request: NextRequest) {
  // 🔒 SECURITY: Rate limiting for registration
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimiter(`register_${clientIP}`, RATE_LIMITS.AUTH)) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429 }
    )
  }
  try {
    const { email, password, name } = await request.json()

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Create user
    const user = await createUser(email, password, name)

    // Generate JWT token
    const token = generateToken({
      id: user._id!,
      email: user.email,
      name: user.name,
      plan: user.plan,
      usage: user.usage || {
        scriptsGenerated: 0,
        audioMinutes: 0,
        lastReset: new Date()
      }
    })

    // 🔒 SECURITY: Set HttpOnly cookie server-side
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        usage: user.usage,
        joinedAt: user.joinedAt
      },
      token
    })

    // Set secure HttpOnly cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof Error && error.message === 'User already exists') {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
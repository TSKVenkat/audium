import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, generateToken } from '@/lib/auth'
import { rateLimiter, RATE_LIMITS } from '@/lib/simple-rate-limiter'

export async function POST(request: NextRequest) {
  // 🔒 SECURITY: Rate limiting for authentication
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimiter(`auth_${clientIP}`, RATE_LIMITS.AUTH)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429 }
    )
  }
  try {
    const { email, password } = await request.json()

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Authenticate user
    const user = await authenticateUser(email, password)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

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
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Failed to authenticate' },
      { status: 500 }
    )
  }
}
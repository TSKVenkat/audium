import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { getDatabase, User } from './mongodb'

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Type-safe JWT secret
const SECRET: string = JWT_SECRET;

export interface AuthUser {
  id: string
  email: string
  name: string
  plan: string
  usage: {
    scriptsGenerated: number
    audioMinutes: number
    lastReset: Date
  }
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan
    },
    SECRET,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, SECRET) as AuthUser
    return decoded
  } catch (error) {
    console.error('❌ Token verification failed:', error instanceof Error ? error.message : error)
    return null
  }
}

export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  // Check Authorization header first
  const authHeader = request.headers.get('authorization')
  let token: string | null = null
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else {
    // Check cookies
    const authCookie = request.cookies.get('auth-token')?.value
    if (authCookie) {
      token = authCookie
    }
  }

  if (!token) {
    return null
  }

  return verifyToken(token)
}

export async function createUser(email: string, password: string, name: string): Promise<User> {
  console.log('🔍 Attempting to create user:', email)
  
  try {
    const db = await getDatabase()
    const usersCollection = db.collection<User>('users')

    console.log('🔍 Checking if user already exists...')
    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email })
    if (existingUser) {
      console.log('⚠️ User already exists:', email)
      throw new Error('User already exists')
    }
    
    console.log('✅ User email is available, proceeding with creation...')

    const hashedPassword = await hashPassword(password)
    const now = new Date()

    const newUser: User = {
      email,
      name,
      plan: 'free',
      usage: {
        scriptsGenerated: 0,
        audioMinutes: 0,
        lastReset: now
      },
      joinedAt: now,
      lastLoginAt: now
    }

    console.log('💾 Inserting user into MongoDB...')
    const result = await usersCollection.insertOne({
      ...newUser,
      password: hashedPassword
    } as any)

    console.log('✅ Created user in MongoDB:', email, 'with ID:', result.insertedId.toString())
    return { ...newUser, _id: result.insertedId.toString() }
    
  } catch (error) {
    console.error('❌ Error during user creation:', error)
    
    // Enhanced error reporting for MongoDB issues
    if (error instanceof Error) {
      if (error.message.includes('SSL') || error.message.includes('TLS')) {
        throw new Error('Database connection error: SSL/TLS issue. Please try again.')
      } else if (error.message.includes('timeout')) {
        throw new Error('Database connection timeout. Please check your internet connection and try again.')
      } else if (error.message.includes('User already exists')) {
        throw error // Re-throw user exists error as-is
      }
    }
    
    throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown database error'}`)
  }
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const db = await getDatabase()
  const usersCollection = db.collection('users')

  const user = await usersCollection.findOne({ email })
  if (!user) {
    return null
  }

  const isValid = await verifyPassword(password, user.password)
  if (!isValid) {
    return null
  }

  // Update last login
  await usersCollection.updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: new Date() } }
  )

  // Remove password from returned user
  const { password: _, ...userWithoutPassword } = user
  console.log('✅ Authenticated user from MongoDB:', email)
  return {
    ...userWithoutPassword,
    _id: userWithoutPassword._id.toString()
  } as User
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const db = await getDatabase()
    const usersCollection = db.collection<User>('users')
    
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) } as any)
    if (!user) {
      return null
    }

    // Remove password from returned user and convert _id to string
    const { password: _, ...userWithoutPassword } = user as any
    return {
      ...userWithoutPassword,
      _id: userWithoutPassword._id.toString()
    } as User
  } catch (error) {
    console.error('❌ Error fetching user by ID:', error)
    return null
  }
}

export async function updateUserUsage(userId: string, scriptsGenerated?: number, audioMinutes?: number): Promise<void> {
  const db = await getDatabase()
  const usersCollection = db.collection('users')

  const updateFields: any = {}
  if (scriptsGenerated !== undefined) {
    updateFields['usage.scriptsGenerated'] = scriptsGenerated
  }
  if (audioMinutes !== undefined) {
    updateFields['usage.audioMinutes'] = audioMinutes
  }

  try {
    // Check if userId is a valid ObjectId format (24 character hex string)
    if (ObjectId.isValid(userId)) {
      await usersCollection.updateOne(
        { _id: new ObjectId(userId) } as any,
        { $inc: updateFields }
      )
      console.log('✅ Updated user usage in MongoDB:', { userId, scriptsGenerated, audioMinutes })
    } else {
      // Handle custom string IDs (fallback case)
      await usersCollection.updateOne(
        { _id: userId } as any,
        { $inc: updateFields }
      )
      console.log('✅ Updated user usage in MongoDB with string ID:', { userId, scriptsGenerated, audioMinutes })
    }
  } catch (error) {
    console.error('❌ Error updating user usage:', error)
    throw error
  }
}

export function checkPlanLimits(user: User, requestType: 'script' | 'audio', amount: number = 1): boolean {
  const limits = {
    free: { scripts: 5, audioMinutes: 30 },
    pro: { scripts: 50, audioMinutes: 300 },
    enterprise: { scripts: Infinity, audioMinutes: Infinity }
  }

  const userLimits = limits[user.plan]
  
  if (requestType === 'script') {
    return user.usage.scriptsGenerated + amount <= userLimits.scripts
  } else {
    return user.usage.audioMinutes + amount <= userLimits.audioMinutes
  }
}
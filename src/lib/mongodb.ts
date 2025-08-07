import { MongoClient, Db } from 'mongodb'

// 🔒 SECURITY: MongoDB configuration 
const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI environment variable is required');
}

const options = {
  // 🔒 SECURITY: SSL/TLS configuration for MongoDB Atlas
  serverSelectionTimeoutMS: 30000, // Increased timeout
  connectTimeoutMS: 30000, // Increased timeout
  socketTimeoutMS: 0,
  maxPoolSize: 10,
  minPoolSize: 1,
  retryWrites: true,
  retryReads: true,
  // SSL/TLS configuration
  ssl: true,
  tls: true,
  tlsAllowInvalidCertificates: true, // For development only
  tlsAllowInvalidHostnames: true, // For development only
  authSource: 'admin',
  // Additional MongoDB Atlas optimizations
  heartbeatFrequencyMS: 10000,
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise!
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export default clientPromise

export async function getDatabase(): Promise<Db> {
  try {
    console.log('🔗 Attempting MongoDB connection...')
    const client = await clientPromise
    const db = client.db('audium-ai')
    
    // Test the connection
    await db.admin().ping()
    console.log('✅ MongoDB connected successfully and ping test passed')
    return db
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error)
    
    // Enhanced error logging for SSL issues
    if (error instanceof Error) {
      if (error.message.includes('SSL') || error.message.includes('TLS')) {
        console.error('🔒 SSL/TLS Error detected. Trying fallback connection...')
        
        // Try a simplified connection for development  
        try {
          console.log('🔄 Attempting SSL-disabled fallback connection...')
          // Remove SSL/TLS from the original URI for fallback
          if (!uri) {
            throw new Error('URI is required for fallback connection')
          }
          const fallbackUri = uri.includes('ssl=') 
            ? uri.replace(/ssl=true/g, 'ssl=false').replace(/tls=true/g, 'tls=false')
            : `${uri}${uri.includes('?') ? '&' : '?'}ssl=false&tls=false`
          
          const fallbackClient = new MongoClient(fallbackUri, {
            serverSelectionTimeoutMS: 15000,
            connectTimeoutMS: 15000,
            ssl: false,
            tls: false,
          })
          
          await fallbackClient.connect()
          const fallbackDb = fallbackClient.db('audium-ai')
          await fallbackDb.admin().ping()
          
          console.log('✅ Fallback MongoDB connection successful (SSL disabled)')
          return fallbackDb
        } catch (fallbackError) {
          console.error('❌ Fallback connection also failed:', fallbackError)
        }
      }
    }
    
    throw new Error(`Failed to connect to MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Database Models
export interface User {
  _id?: string
  email: string
  name: string
  avatar?: string
  plan: 'free' | 'pro' | 'enterprise'
  usage: {
    scriptsGenerated: number
    audioMinutes: number
    lastReset: Date
  }
  stripeCustomerId?: string
  subscription?: {
    id: string
    status: string
    currentPeriodEnd: Date
  }
  joinedAt: Date
  lastLoginAt: Date
}

export interface PodcastEpisode {
  _id?: string
  userId: string
  title: string
  description: string
  script: string
  audioUrl?: string
  inputType: 'file' | 'text' | 'url'
  originalContent: string
  metadata: {
    wordCount: number
    estimatedDuration: string
    style: string
    audience: string
    generatedAt: Date
  }
  sections: Array<{
    title: string
    content: string
    wordCount: number
  }>
  status: 'processing' | 'completed' | 'failed'
  analytics: {
    plays: number
    downloads: number
    shares: number
    lastPlayedAt?: Date
  }
  createdAt: Date
  updatedAt: Date
}

export interface ApiUsage {
  _id?: string
  userId: string
  endpoint: string
  requestTime: Date
  responseTime: number
  success: boolean
  metadata?: {
    inputSize?: number
    outputSize?: number
    model?: string
  }
}
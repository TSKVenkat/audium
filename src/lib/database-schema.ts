// 🗄️ AUDIUM DATABASE SCHEMA - Enterprise Grade
// Complete schema definition for MongoDB collections

export interface User {
  _id?: string
  id: string
  email: string
  name: string
  plan: 'free' | 'pro' | 'enterprise'
  usage: {
    scriptsGenerated: number
    audioMinutes: number
    lastReset: Date
  }
  createdAt: Date
  updatedAt: Date
}

export interface Podcast {
  _id?: string
  userId: string
  title: string
  description: string
  script: string
  inputType: 'text' | 'url' | 'file'
  originalContent: string
  metadata: {
    wordCount: number
    estimatedDuration: string
    style: string
    audience: string
    generatedAt: Date
    voice?: string
    provider?: string
  }
  sections: Array<{
    type: 'intro' | 'main' | 'conclusion'
    content: string
    timestamp?: number
  }>
  status: 'draft' | 'generating' | 'completed' | 'failed'
  analytics: {
    plays: number
    downloads: number
    shares: number
    lastPlayedAt?: Date
  }
  audioUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface Analytics {
  _id?: string
  userId: string
  podcastId: string
  action: 'play' | 'download' | 'share' | 'create'
  timestamp: Date
  metadata?: {
    duration?: number
    position?: number
    userAgent?: string
    ip?: string
  }
}

// Database Indexes for Performance
export const DATABASE_INDEXES = {
  users: [
    { email: 1 },
    { id: 1 },
    { createdAt: -1 }
  ],
  podcasts: [
    { userId: 1, createdAt: -1 },
    { userId: 1, status: 1 },
    { 'analytics.plays': -1 },
    { 'analytics.downloads': -1 },
    { createdAt: -1 }
  ],
  analytics: [
    { userId: 1, timestamp: -1 },
    { podcastId: 1, timestamp: -1 },
    { action: 1, timestamp: -1 }
  ]
}

// Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  PODCASTS: 'podcasts', 
  ANALYTICS: 'analytics'
} as const

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS]


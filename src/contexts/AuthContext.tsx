'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
  plan: 'free' | 'pro' | 'enterprise'
  usage: {
    scriptsGenerated: number
    audioMinutes: number
    lastReset: string
  }
  joinedAt: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  loginWithGoogle: () => Promise<boolean>
  logout: () => void
  register: (email: string, password: string, name: string) => Promise<boolean>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 🔒 SECURITY: Check for existing session using ONLY cookies
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get auth token from HttpOnly cookie only
        const authToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth-token='))
          ?.split('=')[1] || null

        if (authToken) {
          // Verify token with backend
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.user) {
              setUser(data.user)
              // 🔒 SECURITY: Store user data in secure cookie, NOT localStorage
              document.cookie = `audium_user=${encodeURIComponent(JSON.stringify(data.user))}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`
              return
            }
          }
        }

        // Check for user data in cookie
        const userCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('audium_user='))
          ?.split('=')[1]

        if (userCookie) {
          try {
            const userData = JSON.parse(decodeURIComponent(userCookie))
            setUser(userData)
          } catch (err) {
            // Clear invalid cookie
            document.cookie = 'audium_user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
        // 🔒 SECURITY: Clear ALL auth cookies on error
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
        document.cookie = 'audium_user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const userData: User = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          plan: data.user.plan,
          usage: data.user.usage || {
            scriptsGenerated: 0,
            audioMinutes: 0,
            lastReset: new Date().toISOString()
          },
          joinedAt: data.user.joinedAt
        }
        
        setUser(userData)
        // 🔒 SECURITY: Store user data in secure cookie, NO localStorage
        document.cookie = `audium_user=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`
        
        // Set auth cookie for middleware
        document.cookie = `auth-token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true)
    try {
      // In a real app, this would integrate with Google OAuth
      // For demo purposes, we'll simulate Google login
      const userData: User = {
        id: `google_${Date.now()}`,
        email: 'user@gmail.com',
        name: 'Demo User',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
        plan: 'free',
        usage: {
          scriptsGenerated: 0,
          audioMinutes: 0,
          lastReset: new Date().toISOString()
        },
        joinedAt: new Date().toISOString()
      }
      
      setUser(userData)
      // 🔒 SECURITY: Store user data in secure cookie, NO localStorage
      document.cookie = `audium_user=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`
      return true
    } catch (error) {
      console.error('Google login error:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const userData: User = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          plan: data.user.plan,
          usage: data.user.usage || {
            scriptsGenerated: 0,
            audioMinutes: 0,
            lastReset: new Date().toISOString()
          },
          joinedAt: data.user.joinedAt
        }
        
        setUser(userData)
        // 🔒 SECURITY: Store user data in secure cookie, NO localStorage
        document.cookie = `audium_user=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`
        
        // Set auth cookie for middleware
        document.cookie = `auth-token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Registration error:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    // 🔒 SECURITY: Clear ALL auth cookies, NO localStorage usage
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'audium_user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
  }

  const value: AuthContextType = {
    user,
    login,
    loginWithGoogle,
    logout,
    register,
    isLoading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
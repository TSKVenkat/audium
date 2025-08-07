'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export function useAuthGuard(redirectTo: string = '/', showToast: boolean = true) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      if (showToast) {
        toast.error('Please sign in to access this feature', {
          icon: '🔒',
          duration: 4000,
        })
      }
      router.push(`${redirectTo}?auth=required`)
    }
  }, [user, isLoading, router, redirectTo, showToast])

  return { user, isLoading, isAuthenticated: !!user }
}

export function withAuthGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: { redirectTo?: string; showToast?: boolean } = {}
) {
  return function AuthGuardedComponent(props: P) {
    const { user, isLoading } = useAuthGuard(options.redirectTo, options.showToast)

    // Show loading state
    if (isLoading) {
      return React.createElement('div', 
        { className: "min-h-screen flex items-center justify-center" },
        React.createElement('div',
          { className: "text-center" },
          React.createElement('div', { 
            className: "w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" 
          }),
          React.createElement('p', { 
            className: "text-foreground/70" 
          }, 'Loading...')
        )
      )
    }

    // Show component only if authenticated
    if (user) {
      return React.createElement(WrappedComponent, props)
    }

    // Return null - middleware will handle redirect
    return null
  }
}
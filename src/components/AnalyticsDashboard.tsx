'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  Headphones, 
  Download, 
  Share2, 
  FileText,
  Clock,
  BarChart3
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

interface AnalyticsData {
  overview: {
    totalEpisodes: number
    totalPlays: number
    totalDownloads: number
    totalShares: number
    totalWords: number
    avgWordsPerEpisode: number
  }
  growth: {
    episodeGrowth: string
    wordGrowth: string
    recentEpisodes: number
    recentWords: number
  }
  distribution: {
    inputTypes: Record<string, number>
  }
  recentActivity: Array<{
    title: string
    createdAt: string
    analytics: {
      plays: number
      downloads: number
    }
    metadata: {
      wordCount: number
    }
  }>
}

export function AnalyticsDashboard() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadAnalytics()
    }
  }, [user])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      
      // 🔒 SECURITY: Get auth token from cookie ONLY, NO localStorage
      const authToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1] || null

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      const response = await fetch('/api/analytics', {
        headers
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Please sign in to view analytics')
          return
        }
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()
      
      if (data.success) {
        setAnalytics(data.analytics)
      } else {
        throw new Error(data.error || 'Failed to load analytics')
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Please sign in to view analytics</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-900/50 border border-gray-700/50 rounded-3xl p-6 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No analytics data available</p>
        <button 
          onClick={loadAnalytics}
          className="mt-4 btn-minimal"
        >
          Refresh
        </button>
      </div>
    )
  }

  // Helper function to safely format numbers
  const safeToLocaleString = (value: number | undefined | null): string => {
    return (value || 0).toLocaleString()
  }

  // Helper function to parse growth percentage from string
  const parseGrowthPercent = (growthStr: string): number => {
    const match = growthStr.match(/([+-]?\d+)%/)
    return match ? parseInt(match[1], 10) : 0
  }

  const stats = [
    {
      label: 'Total Episodes',
      value: analytics.overview.totalEpisodes || 0,
      icon: FileText,
      color: 'purple',
      growth: parseGrowthPercent(analytics.growth.episodeGrowth)
    },
    {
      label: 'Total Plays',
      value: safeToLocaleString(analytics.overview.totalPlays),
      icon: Headphones,
      color: 'blue',
      growth: null
    },
    {
      label: 'Total Downloads',
      value: safeToLocaleString(analytics.overview.totalDownloads),
      icon: Download,
      color: 'green',
      growth: null
    },
    {
      label: 'Total Shares',
      value: safeToLocaleString(analytics.overview.totalShares),
      icon: Share2,
      color: 'orange',
      growth: null
    },
    {
      label: 'Total Words',
      value: safeToLocaleString(analytics.overview.totalWords),
      icon: Clock,
      color: 'indigo',
      growth: parseGrowthPercent(analytics.growth.wordGrowth)
    },
    {
      label: 'Avg Words/Episode',
      value: safeToLocaleString(Math.round(analytics.overview.avgWordsPerEpisode || 0)),
      icon: BarChart3,
      color: 'pink',
      growth: null
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h2>
          <p className="text-gray-400">Track your podcast performance and growth</p>
        </div>
        <button 
          onClick={loadAnalytics}
          className="btn-outline-minimal flex items-center gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 bg-${stat.color}-500/20 rounded-2xl flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
              </div>
              {stat.growth !== null && (
                <div className={`flex items-center gap-1 text-sm ${
                  stat.growth > 0 ? 'text-green-400' : stat.growth < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {stat.growth > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : stat.growth < 0 ? (
                    <TrendingDown className="w-4 h-4" />
                  ) : null}
                  {stat.growth !== 0 && `${Math.abs(stat.growth)}%`}
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Recent Episodes */}
      <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Recent Episodes</h3>
        <div className="space-y-4">
          {(analytics.recentActivity || []).slice(0, 5).map((episode, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-center justify-between p-4 bg-gray-800/50 rounded-2xl"
            >
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-1">{episode.title || 'Untitled Episode'}</h4>
                <p className="text-sm text-gray-400">
                  {new Date(episode.createdAt).toLocaleDateString()} • {episode.metadata?.wordCount || 0} words
                </p>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Headphones className="w-4 h-4" />
                  {episode.analytics?.plays || 0}
                </div>
                <div className="flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  {episode.analytics?.downloads || 0}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {(!analytics.recentActivity || analytics.recentActivity.length === 0) && (
          <div className="text-center py-8 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No episodes found. Create your first podcast to see analytics!</p>
          </div>
        )}
      </div>
    </div>
  )
}
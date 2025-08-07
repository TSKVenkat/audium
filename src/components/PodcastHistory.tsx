'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Download, Trash2, Edit, Clock, FileText, Volume2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

interface PodcastEpisode {
  id: string
  title: string
  description: string
  createdAt: string
  duration: string
  wordCount: number
  inputType: 'file' | 'text' | 'url'
  status: 'processing' | 'completed' | 'failed'
  audioUrl?: string
  scriptPreview: string
}

interface PodcastHistoryProps {
  isOpen?: boolean
  onClose?: () => void
}

export function PodcastHistory({ isOpen, onClose }: PodcastHistoryProps = {}) {
  const { user } = useAuth()
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadEpisodes()
  }, [user])

  const loadEpisodes = async () => {
    if (!user) return
    
    setIsLoading(true)
    
    try {
      // Get auth token from cookie
      const authCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (authCookie) {
        headers['Authorization'] = `Bearer ${authCookie}`
      }

      const response = await fetch('/api/podcasts', {
        headers
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Please sign in to view your podcasts')
          return
        }
        throw new Error('Failed to fetch podcasts')
      }

      const data = await response.json()
      
      if (data.success && data.podcasts) {
        // Transform backend data to frontend format
        const transformedEpisodes: PodcastEpisode[] = data.podcasts.map((podcast: any) => ({
          id: podcast._id || podcast.id,
          title: podcast.title,
          description: podcast.description,
          createdAt: podcast.createdAt,
          duration: podcast.metadata?.estimatedDuration || 'Unknown',
          wordCount: podcast.metadata?.wordCount || 0,
          inputType: podcast.inputType,
          status: podcast.status,
          audioUrl: podcast.audioUrl,
          scriptPreview: podcast.script ? podcast.script.substring(0, 150) + '...' : 'No preview available'
        }))
        
        setEpisodes(transformedEpisodes)
        if (transformedEpisodes.length > 0) {
          toast.success(`Loaded ${transformedEpisodes.length} podcasts`)
        }
      } else {
        setEpisodes([])
      }
    } catch (error) {
      console.error('Error loading podcasts:', error)
      toast.error('Failed to load podcast history')
      setEpisodes([])
    } finally {
      setIsLoading(false)
    }
  }

  const deleteEpisode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this episode?')) return
    
    try {
      // Get auth token from cookie
      const authCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (authCookie) {
        headers['Authorization'] = `Bearer ${authCookie}`
      }

      const response = await fetch(`/api/podcasts/${id}`, {
        method: 'DELETE',
        headers
      })

      if (!response.ok) {
        throw new Error('Failed to delete podcast')
      }

      setEpisodes(episodes.filter(ep => ep.id !== id))
      toast.success('Episode deleted successfully')
    } catch (error) {
      console.error('Error deleting podcast:', error)
      toast.error('Failed to delete episode')
    }
  }

  const getInputTypeIcon = (type: string) => {
    switch (type) {
      case 'file': return FileText
      case 'url': return Volume2
      default: return FileText
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400'
      case 'processing': return 'text-yellow-400'
      case 'failed': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  if (!user) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-12 text-center">
        <Volume2 className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h3 className="text-2xl font-bold text-white mb-2">Sign In Required</h3>
        <p className="text-gray-400">Please sign in to view your podcast history</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 bg-gray-700 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-700 rounded w-32 animate-pulse"></div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-900/50 border border-gray-700/50 rounded-3xl p-6 animate-pulse">
            <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-full"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">My Podcasts</h2>
          <p className="text-gray-400">Manage and listen to your created podcasts</p>
        </div>
        <button 
          onClick={loadEpisodes}
          className="btn-outline-minimal"
          disabled={isLoading}
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-6">
        {episodes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-12 text-center"
          >
            <Volume2 className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-2xl font-bold text-white mb-2">No Podcasts Yet</h3>
            <p className="text-gray-400 mb-6">Create your first podcast to get started</p>
            <button 
              onClick={() => window.location.href = '/process'}
              className="btn-minimal"
            >
              Create Your First Podcast
            </button>
          </motion.div>
        ) : (
          episodes.map((episode, index) => (
            <motion.div
              key={episode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 hover:border-gray-600/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {(() => {
                      const IconComponent = getInputTypeIcon(episode.inputType)
                      return <IconComponent className="w-5 h-5 text-purple-400" />
                    })()}
                    <h3 className="text-xl font-semibold text-white">{episode.title}</h3>
                    <span className={`text-sm font-medium ${getStatusColor(episode.status)}`}>
                      {episode.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-400 mb-4">{episode.description}</p>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {episode.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {episode.wordCount.toLocaleString()} words
                    </div>
                    <div>
                      Created {new Date(episode.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-400 bg-gray-800/50 rounded-lg p-3">
                    <strong>Preview:</strong> {episode.scriptPreview}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-6">
                  {episode.audioUrl && episode.status === 'completed' && (
                    <button
                      onClick={() => {
                        const audio = new Audio(episode.audioUrl)
                        audio.play()
                        toast.success('Playing podcast')
                      }}
                      className="p-2 text-gray-500 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                      title="Play episode"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                  )}
                  
                  {episode.audioUrl && episode.status === 'completed' && (
                    <a
                      href={episode.audioUrl}
                      download
                      className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      title="Download episode"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  )}
                  
                  <button
                    onClick={() => {
                      toast.success('Edit functionality coming soon!')
                    }}
                    className="p-2 text-gray-500 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors"
                    title="Edit episode"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={() => deleteEpisode(episode.id)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Delete episode"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
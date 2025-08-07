'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Header } from '@/components/Header'
import { ScriptEditor } from '@/components/ScriptEditor'
import { AudioPlayer } from '@/components/AudioPlayer'
import { TTSControlPanel } from '@/components/TTSControlPanel'
import { WaveformVisualizerEnhanced } from '@/components/WaveformVisualizerEnhanced'
import { AuthModal } from '@/components/AuthModal'
import { PodcastHistory } from '@/components/PodcastHistory'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { 
  FileText, 
  Volume2, 
  Download, 
  Edit3, 
  Sparkles,
  Clock,
  Radio,
  Share2
} from 'lucide-react'
import toast from 'react-hot-toast'

// Analytics tracking functions
const trackPlayEvent = async (podcastTitle: string) => {
  try {
    const authToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='))
      ?.split('=')[1]

    if (!authToken) return

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        action: 'play',
        podcastTitle,
        timestamp: new Date().toISOString()
      })
    })
  } catch (error) {
    console.error('Failed to track play event:', error)
  }
}

const trackDownloadEvent = async (podcastTitle: string) => {
  try {
    const authToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='))
      ?.split('=')[1]

    if (!authToken) return

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        action: 'download',
        podcastTitle,
        timestamp: new Date().toISOString()
      })
    })
  } catch (error) {
    console.error('Failed to track download event:', error)
  }
}

const trackShareEvent = async (podcastTitle: string) => {
  try {
    const authToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='))
      ?.split('=')[1]

    if (!authToken) return

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        action: 'share',
        podcastTitle,
        timestamp: new Date().toISOString()
      })
    })
  } catch (error) {
    console.error('Failed to track share event:', error)
  }
}

interface PodcastData {
  originalContent: string
  podcast: {
    title: string
    introduction: string
    mainContent: string
    conclusion: string
    keyTakeaways: string[]
    estimatedDuration: string
    sections: Array<{
      title: string
      content: string
      timestamp: string
    }>
  }
}

interface AudioMetadata {
  duration?: number
  format?: string
  size?: number
  provider?: string
  voice?: string
  enhancedAudio?: boolean
  processingTime?: number
  audioQuality?: string
  realistic?: boolean
  voiceModulation?: boolean
  fallbackUsed?: boolean
  originalProvider?: string
  fallbackReason?: string
}

export default function ProcessPage() {
  // 🔒 SECURITY & PERFORMANCE: All hooks MUST be called before any conditional logic
  const { user, isLoading, isAuthenticated } = useAuthGuard()
  const searchParams = useSearchParams()
  const [data, setData] = useState<PodcastData | null>(null)
  const [script, setScript] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(null)
  const [ttsProvider, setTtsProvider] = useState('azure')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // ✅ FIXED: Move useEffect BEFORE conditional returns
  useEffect(() => {
    // Try session-based approach first (new method to avoid 431 errors)
    const sessionKey = searchParams.get('session')
    if (sessionKey) {
      try {
        const sessionData = sessionStorage.getItem(sessionKey)
        if (sessionData) {
          const parsedData = JSON.parse(sessionData)
          setData(parsedData)
          
          // Generate full script from podcast data
          const fullScript = [
            parsedData.podcast.title,
            '',
            parsedData.podcast.introduction,
            '',
            parsedData.podcast.mainContent,
            '',
            parsedData.podcast.conclusion
          ].join('\n')
          
          setScript(fullScript)
          
          // Clean up old session data (keep for 1 hour)
          if (parsedData.timestamp && Date.now() - parsedData.timestamp > 3600000) {
            sessionStorage.removeItem(sessionKey)
          }
        } else {
          toast.error('Session data not found. Please regenerate the podcast.')
        }
      } catch (error) {
        console.error('Error parsing session data:', error)
        toast.error('Error loading podcast data from session')
      }
    } else {
      // Fallback: try old URL parameter method (for backwards compatibility)
      const dataParam = searchParams.get('data')
      if (dataParam) {
        try {
          const parsedData = JSON.parse(decodeURIComponent(dataParam))
          setData(parsedData)
          
          // Generate full script from podcast data
          const fullScript = [
            parsedData.podcast.title,
            '',
            parsedData.podcast.introduction,
            '',
            parsedData.podcast.mainContent,
            '',
            parsedData.podcast.conclusion
          ].join('\n')
          
          setScript(fullScript)
        } catch (error) {
          console.error('Error parsing URL data:', error)
          toast.error('Error loading podcast data')
        }
      }
    }
  }, [searchParams])

  // ✅ FIXED: Move all event handlers BEFORE conditional returns
  const handleAudioGenerated = (url: string, metadata?: AudioMetadata) => {
    setAudioUrl(url)
    if (metadata) {
      setAudioMetadata(metadata)
      setTtsProvider(metadata.provider || 'azure')
      
      // Show success message with provider info
      if (metadata.fallbackUsed) {
        toast.success(`Audio generated with ${metadata.provider} (fallback used)`, {
          duration: 4000,
          icon: '🔄'
        })
      } else {
        toast.success(`Audio generated with ${metadata.provider}`, {
          duration: 3000,
          icon: '🎵'
        })
      }
    }
  }

  const downloadAudio = async () => {
    if (audioUrl) {
      const link = document.createElement('a')
      link.href = audioUrl
      link.download = `audium-podcast-${Date.now()}.mp3`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Audio download started')
      
      // Track download analytics
      if (data?.podcast?.title) {
        await trackDownloadEvent(data.podcast.title)
      }
    }
  }

  const copyScript = () => {
    navigator.clipboard.writeText(script)
    toast.success('Script copied to clipboard')
  }

  const shareAudio = async () => {
    if (navigator.share && audioUrl) {
      try {
        await navigator.share({
          title: 'My Audium Podcast',
          text: 'Check out this podcast I created with Audium!',
          url: audioUrl
        })
        // Track share analytics
        if (data?.podcast?.title) {
          await trackShareEvent(data.podcast.title)
        }
      } catch (error) {
        console.error('Share failed:', error)
      }
    } else {
      copyScript()
      toast.success('Script copied - share the text!')
      // Track share analytics
      if (data?.podcast?.title) {
        await trackShareEvent(data.podcast.title)
      }
    }
  }

  // ✅ CONDITIONAL RENDERING: Now safely after all hooks
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-50/20 dark:to-purple-950/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/70">Verifying access...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, return null (middleware will handle redirect)
  if (!isAuthenticated) {
    return null
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-50/20 dark:to-purple-950/20 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h2 className="text-xl font-semibold text-foreground">Processing your content...</h2>
          <p className="text-foreground/70">
            Please wait while we generate your podcast script
          </p>
        </div>
      </div>
    )
  }

  // ✅ MAIN RENDER: After all hooks and conditional returns
  return (
    <div className="min-h-screen bg-black dark:bg-black bg-gradient-to-br from-gray-900 via-black to-purple-950/20">
      <Header 
        onShowHistory={() => setShowHistory(true)}
        user={user}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Your Podcast Studio
          </h1>
          <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
            Edit your script and generate high-quality audio with AI-powered voice synthesis
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Script Editor */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Script Stats */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Script Details</h2>
              </div>
              
              {data && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-900/30 border border-purple-800/30 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-gray-300">Duration</span>
                    </div>
                    <span className="text-lg font-semibold text-white">
                      {data.podcast.estimatedDuration}
                    </span>
                  </div>
                  <div className="bg-blue-900/30 border border-blue-800/30 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Edit3 className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-gray-300">Words</span>
                    </div>
                    <span className="text-lg font-semibold text-white">
                      {script.split(' ').length.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Script Editor */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Edit3 className="w-6 h-6 text-purple-400" />
                  <h2 className="text-xl font-semibold text-white">Script Editor</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyScript}
                    className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Copy
                  </button>
                  <button
                    onClick={shareAudio}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
              </div>
              
              <ScriptEditor
                script={script}
                onSave={(newScript) => setScript(newScript)}
                onCancel={() => {}}
                value={script}
                onChange={setScript}
                placeholder="Your podcast script will appear here. You can edit it before generating audio."
              />
            </div>
          </motion.div>

          {/* Right Column - Audio Generation */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6"
          >
            {/* TTS Control Panel */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Volume2 className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Voice Generation</h2>
              </div>
              
              <TTSControlPanel
                script={script}
                onAudioGenerated={handleAudioGenerated}
                isGenerating={isGeneratingAudio}
                onGeneratingChange={setIsGeneratingAudio}
              />
            </div>

            {/* Audio Player & Visualization */}
            {audioUrl && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-gray-900 border border-gray-800 rounded-2xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Radio className="w-6 h-6 text-purple-400" />
                    <h2 className="text-xl font-semibold text-white">Your Podcast</h2>
                  </div>
                  <button
                    onClick={downloadAudio}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
                
                <div className="space-y-4">
                  {audioMetadata && (
                    <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">Provider:</span>
                        <span className="font-medium text-white">
                          {audioMetadata.provider} 
                          {audioMetadata.fallbackUsed && ' (Fallback)'}
                        </span>
                      </div>
                      {audioMetadata.duration && (
                        <div className="flex items-center justify-between text-sm mt-2">
                          <span className="text-gray-300">Duration:</span>
                          <span className="font-medium text-white">
                            {Math.round(audioMetadata.duration)}s
                          </span>
                        </div>
                      )}
                      {audioMetadata.processingTime && (
                        <div className="flex items-center justify-between text-sm mt-2">
                          <span className="text-gray-300">Processing Time:</span>
                          <span className="font-medium text-white">
                            {Math.round(audioMetadata.processingTime / 1000)}s
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <WaveformVisualizerEnhanced
                    audioUrl={audioUrl}
                    isPlaying={isAudioPlaying}
                    height={100}
                    color="#8b5cf6"
                    backgroundColor="#374151"
                    onTimeUpdate={(currentTime, duration) => {
                      // Optional: Handle time updates from waveform
                    }}
                  />
                  
                  <AudioPlayer
                    audioUrl={audioUrl}
                    onPlayStateChange={setIsAudioPlaying}
                    onPlay={() => {
                      setIsAudioPlaying(true)
                      // Track analytics
                      if (data?.podcast?.title) {
                        trackPlayEvent(data.podcast.title)
                      }
                    }}
                    onPause={() => setIsAudioPlaying(false)}
                    onEnded={() => setIsAudioPlaying(false)}
                  />
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Podcast History Modal */}
      {showHistory && (
        <PodcastHistory
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}
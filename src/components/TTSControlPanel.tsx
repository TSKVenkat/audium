'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sliders, User, Zap, Settings, Volume2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface TTSOptions {
  voice: string
  style: string
  emotion: string
  stability: number
  similarity: number
  speed: number
  provider: string
  enhanceAudio: boolean
}

interface TTSControlPanelProps {
  script: string
  onAudioGenerated: (audioUrl: string, metadata?: any) => void
  isGenerating: boolean
  onGeneratingChange: (generating: boolean) => void
}

const voices = [
  { id: 'adam', name: 'Adam', gender: 'Male', accent: 'American', description: 'Deep, authoritative' },
  { id: 'bella', name: 'Bella', gender: 'Female', accent: 'American', description: 'Warm, friendly' },
  { id: 'charlie', name: 'Charlie', gender: 'Male', accent: 'British', description: 'Crisp, professional' },
  { id: 'domi', name: 'Domi', gender: 'Female', accent: 'American', description: 'Clear, confident' },
  { id: 'elli', name: 'Elli', gender: 'Female', accent: 'American', description: 'Young, energetic' },
  { id: 'fin', name: 'Fin', gender: 'Male', accent: 'Irish', description: 'Smooth, engaging' },
  { id: 'freya', name: 'Freya', gender: 'Female', accent: 'American', description: 'Sophisticated' },
  { id: 'giovanni', name: 'Giovanni', gender: 'Male', accent: 'American', description: 'Rich, mature' },
  { id: 'josh', name: 'Josh', gender: 'Male', accent: 'American', description: 'Casual, approachable' },
  { id: 'liam', name: 'Liam', gender: 'Male', accent: 'American', description: 'Versatile, natural' },
  { id: 'nicole', name: 'Nicole', gender: 'Female', accent: 'American', description: 'Professional, clear' },
  { id: 'rachel', name: 'Rachel', gender: 'Female', accent: 'American', description: 'Expressive, dynamic' },
  { id: 'sam', name: 'Sam', gender: 'Male', accent: 'American', description: 'Friendly, conversational' }
]

const styles = [
  { id: 'conversational', name: 'Conversational', description: 'Natural, everyday speech' },
  { id: 'narration', name: 'Narration', description: 'Clear storytelling style' },
  { id: 'presentation', name: 'Presentation', description: 'Professional, engaging' },
  { id: 'meditation', name: 'Meditation', description: 'Calm, soothing' }
]

const emotions = [
  { id: 'neutral', name: 'Neutral', description: 'Balanced tone' },
  { id: 'excited', name: 'Excited', description: 'Energetic, enthusiastic' },
  { id: 'calm', name: 'Calm', description: 'Peaceful, relaxed' },
  { id: 'serious', name: 'Serious', description: 'Professional, focused' }
]

export function TTSControlPanel({ script, onAudioGenerated, isGenerating, onGeneratingChange }: TTSControlPanelProps) {
  const [options, setOptions] = useState<TTSOptions>({
    voice: 'adam',
    style: 'conversational',
    emotion: 'neutral',
    stability: 0.8,
    similarity: 0.8,
    speed: 1.0,
    provider: 'auto',
    enhanceAudio: true
  })

  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleGenerate = async () => {
    if (!script.trim()) {
      toast.error('Please provide a script to generate audio')
      return
    }

    try {
      onGeneratingChange(true)
      
      // 🔒 SECURITY: Get auth token from cookie ONLY, NO localStorage
      const authToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1] || null

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          script: script.trim(),
          voice: options.voice,
          speed: options.speed,
          provider: options.provider === 'auto' ? 'azure' : options.provider,
          enhanceAudio: options.enhanceAudio,
          style: options.style,
          emotion: options.emotion,
          voiceStability: options.stability,
          voiceSimilarity: options.similarity
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Audio generation failed')
      }

      const result = await response.json()
      
      if (result.success) {
        onAudioGenerated(result.audioUrl, result.metadata)
        
        if (result.metadata?.fallbackUsed) {
          toast.success(`Audio generated with ${result.metadata.provider} (fallback used)`, {
            duration: 4000,
            icon: '🔄'
          })
        } else {
          toast.success(`Audio generated successfully with ${result.metadata?.provider || 'Azure'}!`, {
            icon: '🎵'
          })
        }
      } else {
        throw new Error('Generation failed')
      }
      
    } catch (error) {
      console.error('TTS generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate audio')
    } finally {
      onGeneratingChange(false)
    }
  }



  const selectedVoice = voices.find(v => v.id === options.voice)
  const selectedStyle = styles.find(s => s.id === options.style)
  const selectedEmotion = emotions.find(e => e.id === options.emotion)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Voice Selection */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" />
            Voice Selection
          </h3>
          <span className="text-sm text-muted-foreground">
            Select voice, then generate
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {voices.map((voice) => (
            <motion.button
              key={voice.id}
              onClick={() => setOptions({ ...options, voice: voice.id })}
              className={`p-3 rounded-xl border-2 transition-all text-left ${
                options.voice === voice.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                  : 'border-border hover:border-purple-300'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="font-medium text-sm">{voice.name}</div>
              <div className="text-xs text-muted-foreground">{voice.gender} • {voice.accent}</div>
              <div className="text-xs text-muted-foreground mt-1">{voice.description}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Style & Emotion */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            Speaking Style
          </h4>
          <div className="space-y-2">
            {styles.map((style) => (
              <motion.button
                key={style.id}
                onClick={() => setOptions({ ...options, style: style.id })}
                className={`w-full p-3 rounded-lg border transition-all text-left ${
                  options.style === style.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    : 'border-border hover:border-blue-300'
                }`}
                whileHover={{ scale: 1.01 }}
              >
                <div className="font-medium text-sm">{style.name}</div>
                <div className="text-xs text-muted-foreground">{style.description}</div>
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-green-600" />
            Emotion
          </h4>
          <div className="space-y-2">
            {emotions.map((emotion) => (
              <motion.button
                key={emotion.id}
                onClick={() => setOptions({ ...options, emotion: emotion.id })}
                className={`w-full p-3 rounded-lg border transition-all text-left ${
                  options.emotion === emotion.id
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                    : 'border-border hover:border-green-300'
                }`}
                whileHover={{ scale: 1.01 }}
              >
                <div className="font-medium text-sm">{emotion.name}</div>
                <div className="text-xs text-muted-foreground">{emotion.description}</div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <div>
        <motion.button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          whileHover={{ scale: 1.02 }}
        >
          <Settings className="w-4 h-4" />
          Advanced Settings
          <motion.div
            animate={{ rotate: showAdvanced ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ▼
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-4 glass-morphism p-4 rounded-xl"
            >
              {/* Sliders */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Voice Stability: {options.stability.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={options.stability}
                    onChange={(e) => setOptions({ ...options, stability: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Voice Similarity: {options.similarity.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={options.similarity}
                    onChange={(e) => setOptions({ ...options, similarity: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Speed: {options.speed.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={options.speed}
                    onChange={(e) => setOptions({ ...options, speed: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Audio Enhancement */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-foreground">Audio Enhancement</h4>
                  <p className="text-xs text-muted-foreground">Apply FFmpeg processing for professional quality</p>
                </div>
                <motion.button
                  onClick={() => setOptions({ ...options, enhanceAudio: !options.enhanceAudio })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    options.enhanceAudio ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                    animate={{ x: options.enhanceAudio ? 24 : 0 }}
                    transition={{ type: "spring", stiffness: 700, damping: 30 }}
                  />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Generate Button */}
      <motion.button
        onClick={handleGenerate}
        disabled={isGenerating || !script.trim()}
        className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all shadow-lg ${
          isGenerating || !script.trim()
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 hover:shadow-xl'
        }`}
        whileHover={!isGenerating && script.trim() ? { scale: 1.02 } : {}}
        whileTap={!isGenerating && script.trim() ? { scale: 0.98 } : {}}
      >
        <div className="flex items-center justify-center gap-3">
          {isGenerating ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Generating Audio...
            </>
          ) : (
            <>
              <Volume2 className="w-6 h-6" />
              Generate Podcast Audio
            </>
          )}
        </div>
      </motion.button>

      {/* Current Selection Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-morphism p-4 rounded-xl border"
      >
        <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-purple-600" />
          Current Selection
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Voice:</span>
            <div className="font-medium">{selectedVoice?.name}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Style:</span>
            <div className="font-medium">{selectedStyle?.name}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Emotion:</span>
            <div className="font-medium">{selectedEmotion?.name}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Quality:</span>
            <div className="font-medium">{options.enhanceAudio ? 'Enhanced' : 'Standard'}</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
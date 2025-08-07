'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'

interface WaveformVisualizerEnhancedProps {
  audioUrl?: string
  isPlaying?: boolean
  onTimeUpdate?: (currentTime: number, duration: number) => void
  height?: number
  color?: string
  backgroundColor?: string
  className?: string
}

export function WaveformVisualizerEnhanced({
  audioUrl,
  isPlaying = false,
  onTimeUpdate,
  height = 80,
  color = '#8b5cf6',
  backgroundColor = '#f3f4f6'
}: WaveformVisualizerEnhancedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  
  const [audioData, setAudioData] = useState<number[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize audio context and analyser
  const initializeAudioContext = useCallback(async () => {
    if (!audioRef.current || isInitialized) return

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaElementSource(audioRef.current)
      
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.8
      
      source.connect(analyser)
      analyser.connect(audioContext.destination)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      sourceRef.current = source
      
      setIsInitialized(true)
    } catch (error) {
      console.error('Failed to initialize audio context:', error)
    }
  }, [isInitialized])

  // Generate static waveform from audio file
  const generateStaticWaveform = useCallback(async (url: string) => {
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      const rawData = audioBuffer.getChannelData(0)
      const samples = 200 // Number of waveform bars
      const blockSize = Math.floor(rawData.length / samples)
      const filteredData = []
      
      for (let i = 0; i < samples; i++) {
        let blockStart = blockSize * i
        let sum = 0
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[blockStart + j])
        }
        filteredData.push(sum / blockSize)
      }
      
      // Normalize the data
      const maxVal = Math.max(...filteredData)
      const normalizedData = filteredData.map(val => (val / maxVal) * height * 0.8)
      
      setAudioData(normalizedData)
      setDuration(audioBuffer.duration)
    } catch (error) {
      console.error('Failed to generate waveform:', error)
      // Generate placeholder waveform
      const placeholderData = Array.from({ length: 200 }, () => 
        Math.random() * height * 0.6 + height * 0.1
      )
      setAudioData(placeholderData)
    }
  }, [height])

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || audioData.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height: canvasHeight } = canvas
    const barWidth = width / audioData.length
    const progress = duration > 0 ? currentTime / duration : 0

    // Clear canvas
    ctx.clearRect(0, 0, width, canvasHeight)

    // Draw waveform bars
    audioData.forEach((amplitude, index) => {
      const barHeight = amplitude
      const x = index * barWidth
      const y = (canvasHeight - barHeight) / 2

      // Determine bar color based on progress
      const barProgress = index / audioData.length
      const isPlayed = barProgress <= progress
      
      ctx.fillStyle = isPlayed ? color : backgroundColor
      ctx.fillRect(x, y, barWidth - 1, barHeight)
    })

    // Draw progress indicator
    if (isPlaying && duration > 0) {
      const progressX = progress * width
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(progressX, 0)
      ctx.lineTo(progressX, canvasHeight)
      ctx.stroke()
    }
  }, [audioData, currentTime, duration, isPlaying, color, backgroundColor])

  // Animation loop for real-time visualization
  const animate = useCallback(() => {
    if (!analyserRef.current || !isPlaying) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserRef.current.getByteFrequencyData(dataArray)

    // Update current time
    if (audioRef.current) {
      const newCurrentTime = audioRef.current.currentTime
      setCurrentTime(newCurrentTime)
      onTimeUpdate?.(newCurrentTime, duration)
    }

    drawWaveform()
    animationFrameRef.current = requestAnimationFrame(animate)
  }, [isPlaying, duration, onTimeUpdate, drawWaveform])

  // Handle audio URL changes
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl
      generateStaticWaveform(audioUrl)
      setCurrentTime(0)
      setIsInitialized(false)
    }
  }, [audioUrl, generateStaticWaveform])

  // Handle playing state changes and continuous animation
  useEffect(() => {
    const startAnimation = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      const animationLoop = () => {
        if (isPlaying && analyserRef.current && audioRef.current) {
          // Update current time
          const newCurrentTime = audioRef.current.currentTime
          setCurrentTime(newCurrentTime)
          onTimeUpdate?.(newCurrentTime, duration)
          
          // Get frequency data for real-time visualization
          const bufferLength = analyserRef.current.frequencyBinCount
          const dataArray = new Uint8Array(bufferLength)
          analyserRef.current.getByteFrequencyData(dataArray)
          
          // Update visualization
          drawWaveform()
          
          // Continue animation
          if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(animationLoop)
          }
        } else {
          // Just update static waveform when not playing
          drawWaveform()
        }
      }
      
      animationLoop()
    }

    if (isPlaying) {
      initializeAudioContext().then(() => {
        // Small delay to ensure audio context is ready
        setTimeout(startAnimation, 100)
      })
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      drawWaveform() // Draw static waveform
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isPlaying, initializeAudioContext, drawWaveform, duration, onTimeUpdate])

  // Draw static waveform when not playing
  useEffect(() => {
    if (!isPlaying) {
      drawWaveform()
    }
  }, [audioData, currentTime, isPlaying, drawWaveform])

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (container) {
        canvas.width = container.clientWidth
        canvas.height = height
        drawWaveform()
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [height, drawWaveform])

  // Handle canvas click for seeking
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioRef.current || !duration) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const clickProgress = x / canvas.width
    const newTime = clickProgress * duration

    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  // Handle audio metadata loaded
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  // Handle audio time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const newCurrentTime = audioRef.current.currentTime
      setCurrentTime(newCurrentTime)
      onTimeUpdate?.(newCurrentTime, duration)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scaleY: 0.5 }}
      animate={{ opacity: 1, scaleY: 1 }}
      className="w-full relative"
    >
      <canvas
        ref={canvasRef}
        className="w-full cursor-pointer rounded-lg"
        style={{ height: `${height}px` }}
        onClick={handleCanvasClick}
      />
      
      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        preload="metadata"
      />
      
      {/* Time indicators */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </motion.div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
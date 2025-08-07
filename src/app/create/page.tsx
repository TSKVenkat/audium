'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Header } from '@/components/Header'
import { FileUpload } from '@/components/FileUpload'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { 
  FileText, 
  Link2, 
  Type,
  Upload,
  Sparkles,
  ArrowRight,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

type InputType = 'file' | 'text' | 'url'

interface PodcastStyle {
  id: string
  name: string
  description: string
  icon: any
}

const podcastStyles: PodcastStyle[] = [
  {
    id: 'conversational',
    name: 'Conversational',
    description: 'Natural, engaging dialogue perfect for interviews and discussions',
    icon: Type
  },
  {
    id: 'educational',
    name: 'Educational',
    description: 'Structured, informative content ideal for learning and tutorials',
    icon: FileText
  },
  {
    id: 'narrative',
    name: 'Narrative',
    description: 'Story-driven format great for documentaries and case studies',
    icon: Sparkles
  }
]

export default function CreatePage() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuthGuard()
  const [inputType, setInputType] = useState<InputType>('file')
  const [selectedStyle, setSelectedStyle] = useState('conversational')
  const [customPrompt, setCustomPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Content states
  const [textContent, setTextContent] = useState('')
  const [urlContent, setUrlContent] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, return null (middleware will handle redirect)
  if (!isAuthenticated) {
    return null
  }

  const handleFileUpload = (files: File[]) => {
    setUploadedFiles(files)
    setInputType('file')
  }

  const generatePodcast = async () => {
    if (!user) {
      toast.error('Please sign in to create podcasts')
      return
    }

    // Validate input
    let content = ''
    let inputSource = ''

    if (inputType === 'file' && uploadedFiles.length > 0) {
      // Process files first - only process first file for now
      const formData = new FormData()
      formData.append('file', uploadedFiles[0])

      try {
        setIsGenerating(true)
        toast('Processing your files...', { icon: '📄' })

        // 🔒 SECURITY: Get auth token from cookies
        const authToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth-token='))
          ?.split('=')[1] || null

        const uploadHeaders: Record<string, string> = {}
        if (authToken) {
          uploadHeaders['Authorization'] = `Bearer ${authToken}`
        }

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: uploadHeaders,
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          throw new Error(errorData.error || 'File processing failed')
        }

        const uploadResult = await uploadResponse.json()
        content = uploadResult.content
        inputSource = uploadedFiles[0].name
        
        console.log('✅ File uploaded successfully:', uploadResult.fileName, `(${uploadResult.contentLength} chars)`)
      } catch (error) {
        console.error('File upload error:', error)
        toast.error('Failed to process files')
        setIsGenerating(false)
        return
      }
    } else if (inputType === 'text' && textContent.trim()) {
      content = textContent.trim()
      inputSource = 'text input'
    } else if (inputType === 'url' && urlContent.trim()) {
      try {
        setIsGenerating(true)
        toast('Scraping website content...', { icon: '🌐' })

        const scrapeResponse = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlContent.trim() })
        })

        if (!scrapeResponse.ok) {
          const errorData = await scrapeResponse.json()
          throw new Error(errorData.error || 'Failed to scrape URL')
        }

        const scrapeResult = await scrapeResponse.json()
        content = scrapeResult.content
        inputSource = urlContent.trim()
      } catch (error) {
        console.error('URL scraping error:', error)
        toast.error('Failed to scrape website content')
        setIsGenerating(false)
        return
      }
    } else {
      toast.error('Please provide content to generate your podcast')
      return
    }

    if (!content || content.length < 100) {
      toast.error('Content too short. Please provide at least 100 characters.')
      setIsGenerating(false)
      return
    }

    // Generate podcast script
    try {
      // Show sequential toast notifications for AI provider attempts
      toast.loading('🚀 Initializing AI providers...', { id: 'ai-progress' })
      
      // Simulate provider attempt sequence with toasts
      setTimeout(() => {
        toast.loading('🤖 Trying Gemini AI (Primary)...', { id: 'ai-progress' })
      }, 500)
      
      setTimeout(() => {
        toast.loading('⚡ Gemini overloaded, trying OpenAI (Backup)...', { id: 'ai-progress' })
      }, 2000)

      // Get auth token from cookie
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

      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content,
          inputType,
          style: selectedStyle,
          customPrompt: customPrompt.trim() || undefined,
          originalSource: inputSource
        })
      })

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json()
        // Dismiss loading toast and show error
        toast.dismiss('ai-progress')
        if (generateResponse.status === 503) {
          toast.error('❌ Service Unavailable: All AI providers are currently overloaded. Please try again later.', { duration: 6000 })
        } else {
          toast.error(`❌ ${errorData.error || 'Failed to generate podcast script'}`, { duration: 5000 })
        }
        throw new Error(errorData.error || 'Failed to generate podcast script')
      }

      const result = await generateResponse.json()
      
      if (result.success && result.podcast) {
        // Dismiss loading toast and show success
        toast.dismiss('ai-progress')
        toast.success('✅ Podcast script generated successfully!', { duration: 4000 })
        
        // Store large data in sessionStorage instead of URL params to avoid 431 error
        const podcastData = {
          originalContent: content,
          podcast: result.podcast,
          inputType,
          style: selectedStyle,
          source: inputSource,
          timestamp: Date.now() // For session management
        }
        
        // Generate unique session key
        const sessionKey = `podcast-data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        // Store in sessionStorage (avoids URL length limits)
        sessionStorage.setItem(sessionKey, JSON.stringify(podcastData))
        
        // Navigate with just the session key
        router.push(`/process?session=${sessionKey}`)
      } else {
        throw new Error('Invalid response from script generation')
      }
    } catch (error) {
      console.error('Script generation error:', error)
      // Dismiss any loading toast and show error
      toast.dismiss('ai-progress')
      if (error instanceof Error && !error.message.includes('Service Unavailable')) {
        toast.error(`❌ ${error.message}`, { duration: 5000 })
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const isReady = () => {
    if (inputType === 'file') return uploadedFiles.length > 0
    if (inputType === 'text') return textContent.trim().length > 0
    if (inputType === 'url') return urlContent.trim().length > 0
    return false
  }

  return (
    <div className="min-h-screen bg-black">
      <Header 
        onAuthClick={() => {}}
        onHistoryClick={() => router.push('/dashboard')}
      />
      
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Create Your Podcast
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Transform any content into an engaging podcast with AI-powered script generation
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Type Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Input Source</h2>
              
              <div className="space-y-3">
                {[
                  { type: 'file' as InputType, icon: Upload, label: 'Upload Files', desc: 'PDF, DOCX, TXT, CSV' },
                  { type: 'text' as InputType, icon: Type, label: 'Paste Text', desc: 'Articles, blogs, notes' },
                  { type: 'url' as InputType, icon: Link2, label: 'Web Scraping', desc: 'Any website URL' }
                ].map(({ type, icon: Icon, label, desc }) => (
                  <button
                    key={type}
                    onClick={() => setInputType(type)}
                    className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 text-left ${
                      inputType === type
                        ? 'border-purple-500 bg-purple-500/10 text-white'
                        : 'border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <div>
                        <div className="font-semibold">{label}</div>
                        <div className="text-sm opacity-70">{desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Podcast Style Selection */}
            <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Podcast Style</h2>
              
              <div className="space-y-3">
                {podcastStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 text-left ${
                      selectedStyle === style.id
                        ? 'border-purple-500 bg-purple-500/10 text-white'
                        : 'border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <style.icon className="w-5 h-5 mt-1" />
                      <div>
                        <div className="font-semibold">{style.name}</div>
                        <div className="text-sm opacity-70">{style.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Content Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 mb-6">
              <h2 className="text-2xl font-bold text-white mb-6">Content Input</h2>
              
              {/* File Upload */}
              {inputType === 'file' && (
                <div className="space-y-6">
                  <div className="border-2 border-dashed border-gray-600 rounded-2xl p-8 text-center hover:border-purple-500 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Upload Your Files</h3>
                    <p className="text-gray-400 mb-4">Support for PDF, DOCX, TXT, CSV, and more</p>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt,.csv,.json"
                      onChange={(e) => handleFileUpload(Array.from(e.target.files || []))}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      Choose Files
                    </label>
                  </div>
                  
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-white">Uploaded Files:</h4>
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl">
                          <FileText className="w-4 h-4 text-purple-400" />
                          <span className="text-white">{file.name}</span>
                          <span className="text-gray-400 text-sm">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Text Input */}
              {inputType === 'text' && (
                <div>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Paste your article, blog post, research paper, or any text content here..."
                    className="w-full h-64 p-4 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-sm text-gray-400">
                      {textContent.length} characters
                    </p>
                    {textContent.length > 1000 && (
                      <div className="flex items-center gap-1 text-green-400 text-sm">
                        <Sparkles className="w-4 h-4" />
                        <span>Great length for a podcast!</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* URL Input */}
              {inputType === 'url' && (
                <div>
                  <input
                    type="url"
                    value={urlContent}
                    onChange={(e) => setUrlContent(e.target.value)}
                    placeholder="https://example.com/article"
                    className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    Enter any website URL to automatically extract and convert the content
                  </p>
                </div>
              )}
            </div>

            {/* Custom Prompt */}
            <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Custom Instructions (Optional)</h3>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Add any specific instructions for your podcast (e.g., 'Focus on practical tips', 'Make it beginner-friendly', 'Add examples')"
                className="w-full h-24 p-4 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Generate Button */}
            <motion.button
              onClick={generatePodcast}
              disabled={!isReady() || isGenerating}
              className={`w-full p-6 rounded-2xl font-semibold text-lg transition-all duration-300 ${
                isReady() && !isGenerating
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transform hover:scale-[1.02]'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
              whileHover={isReady() && !isGenerating ? { scale: 1.02 } : {}}
              whileTap={isReady() && !isGenerating ? { scale: 0.98 } : {}}
            >
              <div className="flex items-center justify-center gap-3">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Generating Your Podcast...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    Generate Podcast Script
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </div>
            </motion.button>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
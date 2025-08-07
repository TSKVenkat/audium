'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, Link, Type, Loader2, Sparkles, Radio } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

type InputType = 'file' | 'text' | 'url'

export function FileUpload() {
  const [inputType, setInputType] = useState<InputType>('file')
  const [textInput, setTextInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      const validTypes = ['text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv', 'application/pdf']
      const maxSize = 10 * 1024 * 1024 // 10MB
      
      if (!validTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.pdf')) {
        toast.error(`${file.name} is not a supported file type. Currently supported: PDF, TXT, DOCX, CSV`)
        return false
      }
      
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large (max 10MB)`)
        return false
      }
      
      return true
    })
    
    setUploadedFiles(prev => [...prev, ...validFiles])
    if (validFiles.length > 0) {
      toast.success(`${validFiles.length} file(s) uploaded successfully`)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf']
    }
  })

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    toast.success('File removed')
  }

  const handleProcess = async () => {
    try {
      setIsProcessing(true)
      
      let content = ''
      let contentType = 'text'
      
      if (inputType === 'file' && uploadedFiles.length > 0) {
        // Process files - only process first file for now
        const formData = new FormData()
        formData.append('file', uploadedFiles[0])
        
        // 🔒 SECURITY: Get auth token for upload
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
          throw new Error(errorData.error || 'Upload failed')
        }
        
        const uploadResult = await uploadResponse.json()
        content = uploadResult.content
        contentType = 'file'
        
      } else if (inputType === 'text' && textInput.trim()) {
        content = textInput.trim()
        contentType = 'text'
        
      } else if (inputType === 'url' && urlInput.trim()) {
        content = urlInput.trim()
        contentType = 'url'
        
      } else {
        toast.error('Please provide some content to process')
        return
      }
      
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

      // Show AI progress notifications
      toast.loading('🚀 Initializing AI providers...', { id: 'ai-progress' })
      setTimeout(() => toast.loading('🤖 Trying Gemini AI...', { id: 'ai-progress' }), 500)
      setTimeout(() => toast.loading('⚡ Gemini busy, trying backup providers...', { id: 'ai-progress' }), 2000)

      // Generate podcast script
      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content,
          type: contentType,
        }),
      })
      
      if (!generateResponse.ok) {
        const errorData = await generateResponse.json()
        // Dismiss loading toast and show error
        toast.dismiss('ai-progress')
        if (generateResponse.status === 503) {
          toast.error('❌ Service Unavailable: All AI providers are currently overloaded. Please try again later.', { duration: 6000 })
        } else {
          toast.error(`❌ ${errorData.error || 'Script generation failed'}`, { duration: 5000 })
        }
        throw new Error(errorData.error || 'Script generation failed')
      }
      
      const result = await generateResponse.json()
      
      // Dismiss loading toast and show success
      toast.dismiss('ai-progress')
      toast.success('✅ Podcast script generated successfully!', { duration: 4000 })
      
      // Store large data in sessionStorage to avoid 431 error
      const podcastData = {
        originalContent: content,
        podcast: result.podcast,
        inputType: contentType,
        timestamp: Date.now()
      }
      
      // Generate unique session key
      const sessionKey = `podcast-data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Store in sessionStorage (avoids URL length limits)
      sessionStorage.setItem(sessionKey, JSON.stringify(podcastData))
      
      // Navigate with just the session key
      window.location.href = `/process?session=${sessionKey}`
      
    } catch (error) {
      console.error('Processing error:', error)
      // Dismiss any loading toast and show error
      toast.dismiss('ai-progress')
      if (error instanceof Error && !error.message.includes('Service Unavailable')) {
        toast.error(`❌ ${error.message}`, { duration: 5000 })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto" id="file-upload">
      {/* Input Type Selector */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        <button
          onClick={() => setInputType('file')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            inputType === 'file'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-purple-50 border border-gray-200'
          }`}
        >
          <File className="w-4 h-4" />
          Upload Files
        </button>
        <button
          onClick={() => setInputType('text')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            inputType === 'text'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-purple-50 border border-gray-200'
          }`}
        >
          <Type className="w-4 h-4" />
          Paste Text
        </button>
        <button
          onClick={() => setInputType('url')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            inputType === 'url'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-purple-50 border border-gray-200'
          }`}
        >
          <Link className="w-4 h-4" />
          Enter URL
        </button>
      </div>

      <AnimatePresence mode="wait">
        {inputType === 'file' && (
          <motion.div
            key="file"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* File Upload Zone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-purple-400 bg-purple-50'
                  : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Upload className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Upload Your Content
              </h3>
              <p className="text-gray-600 mb-4">
                <span className="font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-gray-500">
                PDF, DOCX, CSV, or TXT files (Max 10MB)
              </p>
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-3">Uploaded Files:</h4>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <File className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {inputType === 'text' && (
          <motion.div
            key="text"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Paste Your Content</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Enter any text content you'd like to transform into a podcast
                </p>
              </div>
              <div className="p-6">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Paste your article, blog post, research paper, or any text content here..."
                  className="w-full h-64 p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-gray-500">
                    {textInput.length} characters
                  </p>
                  {textInput.length > 1000 && (
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <Sparkles className="w-4 h-4" />
                      <span>Great length for a podcast!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {inputType === 'url' && (
          <motion.div
            key="url"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Enter URL</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Provide a URL to an article, blog post, or web page
                </p>
              </div>
              <div className="p-6">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-3">
                  We'll extract and process the content from this URL
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate Button */}
      <div className="mt-8 text-center">
        <motion.button
          onClick={handleProcess}
          disabled={isProcessing || (
            inputType === 'file' && uploadedFiles.length === 0 ||
            inputType === 'text' && !textInput.trim() ||
            inputType === 'url' && !urlInput.trim()
          )}
          className={`inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg ${
            isProcessing || (
              inputType === 'file' && uploadedFiles.length === 0 ||
              inputType === 'text' && !textInput.trim() ||
              inputType === 'url' && !urlInput.trim()
            )
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 hover:shadow-xl transform hover:scale-105'
          }`}
          whileHover={!isProcessing ? { scale: 1.05 } : {}}
          whileTap={!isProcessing ? { scale: 0.95 } : {}}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Generating Podcast...
            </>
          ) : (
            <>
              <Radio className="w-6 h-6" />
              Generate Podcast
            </>
          )}
        </motion.button>
        
        {!isProcessing && (
          <p className="text-sm text-gray-500 mt-4">
            This will create an AI-powered podcast script from your content
          </p>
        )}
      </div>
    </div>
  )
}
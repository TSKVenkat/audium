'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Header } from '@/components/Header'
import { AuthModal } from '@/components/AuthModal'
import { PodcastHistory } from '@/components/PodcastHistory'
import { 
  Mic, 
  Sparkles, 
  Zap, 
  Volume2,
  Radio,
  ArrowRight,
  Play,
  User
} from 'lucide-react'

export default function HomePage() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Check if user should see auth modal from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('auth') === 'required') {
      setShowAuthModal(true)
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  return (
    <div className="min-h-screen bg-black">
      <Header 
        onAuthClick={() => setShowAuthModal(true)}
        onHistoryClick={() => setShowHistory(true)}
      />
      
      {/* Hero Section - Minimal & Clean */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 waveform-lines opacity-30" />
        
        <div className="relative max-w-6xl mx-auto px-6 pt-32 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center"
          >
            {/* Minimal Logo */}
            <motion.div 
              className="flex justify-center mb-12"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center float-gentle">
                <Radio className="w-10 h-10 text-black" />
              </div>
            </motion.div>
            
            {/* Hero Title - Massive & Bold */}
            <motion.h1 
              className="text-huge gradient-text mb-8 leading-none"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Audium
            </motion.h1>
            
            {/* Subtitle - Clean & Minimal */}
            <motion.p 
              className="text-xl md:text-2xl text-gray-400 mb-16 max-w-3xl mx-auto font-light leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              Transform any content into professional podcasts with AI-powered script generation 
              and premium voice synthesis.
            </motion.p>

            {/* Audio Visualization - Minimalist */}
            <motion.div 
              className="flex justify-center mb-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <div className="audio-bars">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="audio-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </motion.div>

            {/* CTA Buttons - Minimal & Clean */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-6 justify-center mb-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              <motion.button
                onClick={() => setShowAuthModal(true)}
                className="btn-minimal group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center gap-3">
                  Start Creating
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>
              <motion.button
                onClick={() => setShowAuthModal(true)}
                className="btn-outline-minimal"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Sign In
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Ultra Minimal */}
      <section className="py-32 bg-gray-950">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-display mb-6">
              <span className="gradient-text">Simple.</span>{' '}
              <span className="text-white">Powerful.</span>{' '}
              <span className="gradient-text">Professional.</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto font-light">
              Everything you need to create professional podcasts. Nothing you don't.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                icon: Sparkles,
                title: "AI Script Generation",
                description: "Transform any content into engaging podcast scripts with advanced AI processing and natural language optimization."
              },
              {
                icon: Volume2,
                title: "Premium Voices",
                description: "Choose from 13 realistic voices powered by Azure TTS and ElevenLabs for natural, professional narration."
              },
              {
                icon: Zap,
                title: "Instant Export",
                description: "Generate and download your professional podcast in minutes. High-quality MP3 ready for any platform."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                className="text-center group"
              >
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-white">{feature.title}</h3>
                <p className="text-gray-400 font-light leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sign-Up Section - Minimal Call to Action */}
      <section className="py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-16 relative overflow-hidden"
          >
            <div className="absolute inset-0 waveform-minimal" />
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-8 float-gentle">
                <Play className="w-8 h-8 text-black ml-1" />
              </div>
              
              <h2 className="text-display mb-6 text-white">
                Ready to create your first podcast?
              </h2>
              
              <p className="text-xl text-gray-400 mb-12 font-light max-w-2xl mx-auto">
                Join the revolution of AI-powered content creation. 
                Sign up and transform your ideas into professional podcasts.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <motion.button
                  onClick={() => setShowAuthModal(true)}
                  className="btn-minimal"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Create Account
                </motion.button>
                <motion.button
                  onClick={() => setShowAuthModal(true)}
                  className="btn-ghost-minimal"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Login
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer - Ultra Minimal */}
      <footer className="py-16 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-8 md:mb-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Radio className="w-5 h-5 text-black" />
                </div>
                <span className="text-2xl font-bold gradient-text">Audium</span>
              </div>
              <p className="text-gray-400 mt-2 font-light">AI Podcast Studio</p>
            </div>
            <div className="text-gray-400 text-sm font-light">
              © 2024 Audium. Crafted with precision.
            </div>
          </div>
        </div>
      </footer>

            {/* Modals */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)} 
        />
      )}

      {showHistory && (
        <PodcastHistory />
      )}
    </div>
  )
}
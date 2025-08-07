'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, LogOut, Settings, LayoutDashboard, Radio, Menu, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

import { AuthModal } from './AuthModal'

interface HeaderProps {
  onAuthClick?: () => void
  onHistoryClick?: () => void
  onShowHistory?: () => void
  user?: any
}

export function Header({ onAuthClick, onHistoryClick, onShowHistory, user: userProp }: HeaderProps) {
  const { user, logout } = useAuth()

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const handleGetStarted = () => {
    if (!user) {
      if (onAuthClick) {
        onAuthClick()
      } else {
        setShowAuthModal(true)
      }
    }
  }

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="sticky top-0 z-50 w-full border-b border-gray-700/50 bg-black/80 backdrop-blur-2xl"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Minimal Logo */}
            <motion.div 
              className="flex items-center space-x-4"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Radio className="w-5 h-5 text-black" />
              </div>
              <h1 className="text-2xl font-bold gradient-text">
                Audium
              </h1>
            </motion.div>
            
            {/* Minimal Navigation */}
            <nav className="hidden md:flex items-center space-x-12">
              <a href="#features" className="text-gray-400 hover:text-white transition-colors font-medium">
                Features
              </a>
              <a href="#pricing" className="text-gray-400 hover:text-white transition-colors font-medium">
                Pricing
              </a>
              {user && (
                <button 
                  onClick={onHistoryClick}
                  className="text-gray-400 hover:text-white transition-colors font-medium"
                >
                  History
                </button>
              )}
              <a href="mailto:hello@audium.ai" className="text-gray-400 hover:text-white transition-colors font-medium">
                Contact
              </a>
            </nav>
            
            {/* Minimal Auth & Theme */}
            <div className="hidden md:flex items-center space-x-6">
              {/* Minimal Theme Toggle */}


              {user ? (
                <div className="relative">
                  <motion.button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-3 text-foreground/80 hover:text-foreground transition-colors glass-morphism px-4 py-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <span className="font-medium">{user.name}</span>
                  </motion.button>
                  
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 glass-morphism border shadow-xl py-2 z-50"
                    >
                      <div className="px-4 py-3 border-b border-border/50">
                        <p className="text-sm font-semibold text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-1 text-xs bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full font-medium">
                          {user.plan} Plan
                        </span>
                      </div>
                      <button 
                        onClick={() => window.location.href = '/dashboard'}
                        className="w-full text-left px-4 py-2 text-sm text-foreground/80 hover:bg-secondary/50 flex items-center space-x-3 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Dashboard</span>
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-foreground/80 hover:bg-secondary/50 flex items-center space-x-3 transition-colors">
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>
                      <hr className="my-2 border-border/50" />
                      <button 
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-3 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <>
                  <motion.button 
                    onClick={() => setShowAuthModal(true)}
                    className="text-gray-400 hover:text-white transition-colors font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Sign In
                  </motion.button>
                  <motion.button 
                    onClick={handleGetStarted}
                    className="btn-minimal"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Get Started
                  </motion.button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              
              <motion.button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 text-foreground/80 hover:text-foreground transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </motion.button>
            </div>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-4 py-4 border-t border-border/50 glass-morphism"
            >
              <div className="flex flex-col space-y-4 px-4">
                <a href="#features" className="text-foreground/80 hover:text-foreground transition-colors font-medium">Features</a>
                <a href="#pricing" className="text-foreground/80 hover:text-foreground transition-colors font-medium">Pricing</a>
                {user && (
                  <button 
                    onClick={onHistoryClick}
                    className="text-left text-foreground/80 hover:text-foreground transition-colors font-medium"
                  >
                    History
                  </button>
                )}
                <a href="mailto:hello@audium.ai" className="text-foreground/80 hover:text-foreground transition-colors font-medium">Contact</a>
                
                {user ? (
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center space-x-3 mb-4">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => window.location.href = '/dashboard'}
                      className="w-full text-left py-2 text-foreground/80 hover:text-foreground transition-colors font-medium"
                    >
                      Dashboard
                    </button>
                    <button 
                      onClick={logout}
                      className="w-full text-left py-2 text-red-600 hover:text-red-700 transition-colors font-medium"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-border/50 space-y-3">
                    <button 
                      onClick={() => setShowAuthModal(true)}
                      className="w-full text-left text-foreground/80 hover:text-foreground transition-colors font-medium"
                    >
                      Sign In
                    </button>
                    <button 
                      onClick={handleGetStarted}
                      className="w-full btn-primary text-center"
                    >
                      Get Started
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </motion.header>
      
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      )}
    </>
  )
}
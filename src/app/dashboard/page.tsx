'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Header } from '@/components/Header'
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard'
import { PodcastHistory } from '@/components/PodcastHistory'
import { AuthModal } from '@/components/AuthModal'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { 
  BarChart3, 
  FileText, 
  Plus,
  Settings,
  User
} from 'lucide-react'

const tabs = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'podcasts', label: 'My Podcasts', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings }
]

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuthGuard()
  const [activeTab, setActiveTab] = useState('analytics')
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, return null (middleware will handle redirect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-black">
      <Header 
        onAuthClick={() => setShowAuthModal(true)}
        onHistoryClick={() => setActiveTab('podcasts')}
      />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-gray-400 text-lg">
                Manage your podcasts and track your performance
              </p>
            </div>
            <motion.button
              onClick={() => window.location.href = '/create'}
              className="btn-minimal flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-5 h-5" />
              Create New Podcast
            </motion.button>
          </div>

          {/* User Info Card */}
          <motion.div 
            className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white">{user?.email}</h3>
                <p className="text-gray-400">
                  {user?.plan} Plan • Joined {new Date(user?.joinedAt || '').toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{user?.usage?.scriptsGenerated || 0}</div>
                <div className="text-sm text-gray-400">Scripts Generated</div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div 
          className="flex space-x-1 bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-2 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'podcasts' && <PodcastHistory />}
          {activeTab === 'settings' && (
            <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 text-center">
              <Settings className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-2xl font-bold text-white mb-2">Settings</h3>
              <p className="text-gray-400 mb-6">User settings and preferences coming soon</p>
              <div className="text-sm text-gray-500">
                Current Plan: <span className="text-purple-400 font-semibold">{user?.plan}</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Modals */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)} 
        />
      )}
    </div>
  )
}
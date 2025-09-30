'use client'

import { useState } from 'react'
import axios from 'axios'
import BookshelfDisplay from '@/components/BookshelfDisplay'

export default function Home() {
  const [profileUrl, setProfileUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [selectedUsername, setSelectedUsername] = useState('johnny-saldana')
  const [usernameInput, setUsernameInput] = useState('johnny-saldana')
  const [showImport, setShowImport] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleScrape = async () => {
    if (!profileUrl) {
      setError('Please enter a Goodreads profile URL')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await axios.post('http://localhost:8000/api/v1/scrape', {
        profile_url: profileUrl,
        full_scrape: true
      })

      setResult(response.data)
      // Auto-set the username after successful scrape
      if (response.data.username) {
        setSelectedUsername(response.data.username)
        setUsernameInput(response.data.username)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to scrape profile')
    } finally {
      setLoading(false)
    }
  }

  const handleShowBookshelf = () => {
    if (!usernameInput.trim()) {
      setError('Please enter a username')
      return
    }
    setSelectedUsername(usernameInput.trim())
    setError('')
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setError('')

    try {
      // First get the user's data to find their original profile URL
      const userResponse = await fetch(`http://localhost:8000/api/v1/user/${selectedUsername}`)

      if (!userResponse.ok) {
        throw new Error('User not found')
      }

      const userData = await userResponse.json()

      if (!userData.user?.profile_url) {
        throw new Error('No profile URL found for user')
      }

      // Rescrape using the original profile URL
      const response = await axios.post('http://localhost:8000/api/v1/scrape', {
        profile_url: userData.user.profile_url,
        full_scrape: true
      })

      if (response.data.success) {
        // Force a refresh of the bookshelf display by triggering a re-render
        setSelectedUsername('')
        setTimeout(() => setSelectedUsername('johnny-saldana'), 100)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to refresh profile data')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <main className="relative min-h-screen">
      {/* Full page bookshelf */}
      <BookshelfDisplay
        username={selectedUsername}
        fullPage={true}
      />

      {/* Top bar with title and import button */}
      <div className="fixed top-0 left-0 right-0 z-20 p-4">
        <div className="flex justify-between items-center">
          <div className="text-white flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold drop-shadow-lg">WhatIsJohnnyReading.com</h1>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh profile data"
            >
              <svg
                className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all shadow-lg"
          >
            Import Profile
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-30 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-semibold">Import from Goodreads</h2>
              <button
                onClick={() => setShowImport(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Enter a Goodreads profile URL to import library data
            </p>

            <div className="flex gap-4 mb-4">
              <input
                type="url"
                placeholder="Enter Goodreads profile URL"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                onClick={handleScrape}
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Importing...' : 'Import'}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-lg mb-4">
                {error}
              </div>
            )}

            {result && (
              <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                <p className="font-semibold">Import successful!</p>
                <p>Username: {result.username}</p>
                <p>Books imported: {result.books_count}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t">
              <label className="block text-sm font-medium mb-2">Or switch user:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    setSelectedUsername(usernameInput)
                    setShowImport(false)
                  }}
                  className="px-4 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
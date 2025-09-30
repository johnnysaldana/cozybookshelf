'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiGet } from '@/lib/api'

interface Book {
  id: string
  books: {
    id: string
    title: string
    author: string
    image_url: string
    large_image_url: string
    medium_image_url: string
    small_image_url: string
    average_rating?: number
    publication_year?: number
    pages?: number
    description?: string
    publisher?: string
    format?: string
    series?: string
    series_position?: string
  }
  status: string
  rating?: number
  review?: string
  date_started?: string
  date_finished?: string
  date_added?: string
}

interface UserData {
  username: string
  user: {
    profile_url?: string
  }
  books: Book[]
  currently_reading: Book[]
  read_books: Book[]
}

interface BookDataContextType {
  userData: UserData | null
  loading: boolean
  error: string | null
  loadUserData: (username: string) => Promise<void>
  refreshUserData: () => Promise<void>
  clearData: () => void
}

const BookDataContext = createContext<BookDataContextType | undefined>(undefined)

export function BookDataProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)

  const loadUserData = async (username: string) => {
    if (!username) return

    // If data is already loaded for this user, don't reload
    if (currentUsername === username && userData) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch all user data in one call
      const response = await apiGet(`/api/v1/user/${username}`)
      if (!response.ok) {
        throw new Error('Failed to fetch user data')
      }

      const data = await response.json()

      // Process and cache the data
      const processedData: UserData = {
        username,
        user: data.user || {},
        books: data.books || [],
        currently_reading: data.books?.filter((book: Book) => book.status === 'currently-reading') || [],
        read_books: data.books?.filter((book: Book) => book.status === 'read') || []
      }

      setUserData(processedData)
      setCurrentUsername(username)
    } catch (err) {
      console.error('Error loading user data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load user data')
      setUserData(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshUserData = async () => {
    if (!currentUsername) return

    // Force reload by clearing current data first
    setUserData(null)
    await loadUserData(currentUsername)
  }

  const clearData = () => {
    setUserData(null)
    setCurrentUsername(null)
    setError(null)
  }

  return (
    <BookDataContext.Provider value={{
      userData,
      loading,
      error,
      loadUserData,
      refreshUserData,
      clearData
    }}>
      {children}
    </BookDataContext.Provider>
  )
}

export function useBookData() {
  const context = useContext(BookDataContext)
  if (context === undefined) {
    throw new Error('useBookData must be used within a BookDataProvider')
  }
  return context
}
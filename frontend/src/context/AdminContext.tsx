'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiPost } from '@/lib/api'

interface AdminContextType {
  isAdmin: boolean
  showAdminControls: boolean
  toggleAdminControls: () => void
  checkAdminStatus: () => Promise<void>
  logout: () => void
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdminControls, setShowAdminControls] = useState(false)

  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null
    return null
  }

  const checkAdminStatus = async () => {
    const adminKey = getCookie('admin_key')

    if (!adminKey) {
      setIsAdmin(false)
      setShowAdminControls(false)
      return
    }

    try {
      // Validate the stored key with backend
      const response = await apiPost('/api/v1/auth/validate', {
        api_key: adminKey
      }, true)

      if (response.ok) {
        const data = await response.json()
        setIsAdmin(data.is_admin === true)
        if (!data.is_admin) {
          // Remove invalid cookie
          document.cookie = 'admin_key=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC'
          setShowAdminControls(false)
        }
      } else {
        setIsAdmin(false)
        setShowAdminControls(false)
        // Remove invalid cookie
        document.cookie = 'admin_key=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC'
      }
    } catch (err) {
      setIsAdmin(false)
      setShowAdminControls(false)
    }
  }

  const toggleAdminControls = () => {
    if (isAdmin) {
      setShowAdminControls(prev => !prev)
    }
  }

  const logout = () => {
    document.cookie = 'admin_key=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC'
    setIsAdmin(false)
    setShowAdminControls(false)
  }

  useEffect(() => {
    checkAdminStatus()
  }, [])

  return (
    <AdminContext.Provider value={{
      isAdmin,
      showAdminControls,
      toggleAdminControls,
      checkAdminStatus,
      logout
    }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

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
  }
  status: string
  rating?: number
}

interface BookshelfDisplayProps {
  username?: string
  className?: string
}

export default function BookshelfDisplay({ username, className = '', fullPage = false }: BookshelfDisplayProps & { fullPage?: boolean }) {
  const [currentlyReading, setCurrentlyReading] = useState<Book[]>([])
  const [loading, setLoading] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 })
  const [viewportHeight, setViewportHeight] = useState(600)

  // Fetch currently reading books
  useEffect(() => {
    if (!username) return

    const fetchCurrentlyReading = async () => {
      setLoading(true)
      try {
        const response = await fetch(`http://localhost:8000/api/v1/user/${username}/currently-reading`)
        if (!response.ok) throw new Error('Failed to fetch currently reading books')

        const data = await response.json()
        setCurrentlyReading(data.currently_reading || [])
      } catch (error) {
        console.error('Error fetching currently reading books:', error)
        setCurrentlyReading([])
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentlyReading()
  }, [username])

  // Update container dimensions when image loads or window resizes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerDimensions({ width: rect.width, height: rect.height })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [imageLoaded])

  // Track viewport height and container dimensions
  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight)
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerDimensions({ width: rect.width, height: rect.height })
      }
    }

    // Set initial viewport height
    setViewportHeight(window.innerHeight)

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Force image loading after timeout to prevent books from being stuck
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!imageLoaded) {
        setImageLoaded(true)
      }
    }, 3000) // 3 second timeout

    return () => clearTimeout(timeout)
  }, [imageLoaded])


  // Simple book positioning
  const calculateBookPositions = (): Array<{
    book: Book;
    x: number;
    y: number;
    width: number;
    height: number;
  }> => {
    if (!containerDimensions.width || !containerDimensions.height || currentlyReading.length === 0) {
      return []
    }

    const positions: Array<{
      book: Book;
      x: number;
      y: number;
      width: number;
      height: number;
    }> = []

    const bookAspectRatio = 0.65
    const bookHeight = 80
    const bookWidth = bookHeight * bookAspectRatio

    // Simple percentage-based positioning
    const bookPositions = [
      { x: 50, y: 60 },   // Center
      { x: 30, y: 65 },   // Left  
      { x: 70, y: 55 },   // Right
    ]

    currentlyReading.forEach((book, index) => {
      if (index < bookPositions.length) {
        const position = bookPositions[index]
        const x = (containerDimensions.width * position.x / 100) - (bookWidth / 2)
        const y = (containerDimensions.height * position.y / 100) - (bookHeight / 2)

        positions.push({
          book,
          x: Math.max(0, x),
          y: Math.max(0, y),
          width: bookWidth,
          height: bookHeight,
        })
      }
    })

    return positions
  }

  // Recalculate book positions when dependencies change
  const bookPositions = calculateBookPositions()

  const getBestImageUrl = (book: Book['books']) => {
    // Prioritize higher quality images
    return book.large_image_url || book.medium_image_url || book.image_url || book.small_image_url || '/default-book-cover.png'
  }

  // Fixed height image style that maintains aspect ratio
  const getImageStyle = () => {
    // Original image is 2850x1628, aspect ratio = 2850/1628 ≈ 1.75
    const aspectRatio = 2850 / 1628
    const calculatedWidth = viewportHeight * aspectRatio

    return {
      width: `${calculatedWidth}px`,
      height: `${viewportHeight}px`,
      flexShrink: 0,
      objectFit: 'cover' as const,
    }
  }


  if (!username) {
    return (
      <div className={`relative ${fullPage ? 'fixed inset-0' : ''} ${className}`}>
        <div ref={containerRef} className={fullPage ? 'relative w-full h-full flex items-center justify-center overflow-hidden' : 'relative w-full h-auto flex justify-center overflow-hidden'}>
          <img
            src="/background_upscaled.jpg"
            alt="Cozy Bookshelf"
            className={fullPage ? '' : 'w-full h-auto'}
            style={fullPage ? getImageStyle() : {}}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${fullPage ? 'fixed inset-0' : ''} ${className}`}>
      <div ref={containerRef} className={fullPage ? 'relative w-full h-full bg-black flex items-center justify-center overflow-hidden' : 'relative w-full h-auto flex justify-center overflow-hidden'}>
        {/* Background bookshelf image */}
        <img
          src="/background_upscaled.jpg"
          alt="Cozy Bookshelf"
          className={fullPage ? '' : 'w-full h-auto'}
          style={fullPage ? getImageStyle() : {}}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />

        {/* Overlay books */}
        {!loading && bookPositions.map(({ book, x, y, width, height }, index) => (
          <div
            key={book.id}
            className="absolute transition-transform duration-200 hover:scale-105 hover:z-10 cursor-pointer group"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${width}px`,
              height: `${height}px`,
            }}
            title={`${book.books?.title || 'Unknown'} by ${book.books?.author || 'Unknown'}`}
          >
            <Image
              src={getBestImageUrl(book.books)}
              alt={book.books?.title || 'Book cover'}
              fill
              className="object-cover rounded-sm shadow-md group-hover:shadow-lg transition-shadow duration-200"
              sizes="(max-width: 768px) 60px, 120px"
            />

            {/* Hover overlay with book info */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="text-white text-xs text-center p-1 max-w-full">
                <p className="font-semibold truncate">{book.books?.title || 'Unknown Title'}</p>
                <p className="text-gray-300 truncate">{book.books?.author || 'Unknown Author'}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && imageLoaded && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white bg-opacity-90 rounded-lg p-4 shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">Loading books...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && imageLoaded && currentlyReading.length === 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white bg-opacity-90 rounded-lg p-4 shadow-lg text-center">
            <p className="text-gray-600">No currently reading books found for {username}</p>
          </div>
        )}



        {/* Book count indicator */}
        {!loading && imageLoaded && currentlyReading.length > 0 && (
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
            {currentlyReading.length} currently reading
          </div>
        )}
      </div>
    </div>
  )
}
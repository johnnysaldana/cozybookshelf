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
    // Update again after image loads to ensure proper dimensions
    if (imageLoaded) {
      updateDimensions()
    }

    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [imageLoaded])

  // Force image loading after timeout to prevent books from being stuck
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!imageLoaded) {
        setImageLoaded(true)
      }
    }, 3000) // 3 second timeout

    return () => clearTimeout(timeout)
  }, [imageLoaded])

  // Calculate the actual visible image dimensions
  const getImageDimensions = () => {
    if (!containerDimensions.width || !containerDimensions.height) {
      return { width: 0, height: 0 }
    }

    const originalAspectRatio = 800 / 600

    if (fullPage) {
      const containerAspectRatio = containerDimensions.width / containerDimensions.height

      if (containerAspectRatio > originalAspectRatio) {
        // Container is wider - image will be height-constrained
        const imageHeight = containerDimensions.height
        const imageWidth = imageHeight * originalAspectRatio
        return { width: imageWidth, height: imageHeight }
      } else {
        // Container is narrower - check if we should crop or scale
        const naturalWidth = containerDimensions.height * originalAspectRatio
        const cropPercentage = containerDimensions.width / naturalWidth

        if (cropPercentage < 0.4) {
          // Below 40% visibility - scale to fit width
          const imageWidth = containerDimensions.width
          const imageHeight = imageWidth / originalAspectRatio
          return { width: imageWidth, height: imageHeight }
        } else {
          // Crop the sides - image fills height
          const imageHeight = containerDimensions.height
          const imageWidth = imageHeight * originalAspectRatio
          return { width: imageWidth, height: imageHeight }
        }
      }
    } else {
      // Non-full page mode - image fills width
      const imageWidth = containerDimensions.width
      const imageHeight = imageWidth / originalAspectRatio
      return { width: imageWidth, height: imageHeight }
    }
  }

  // Calculate book positions on the bookstand - image-relative positioning
  const calculateBookPositions = (): Array<{
    book: Book;
    x: number;
    y: number;
    width: number;
    height: number;
  }> => {
    if (!containerDimensions.width || !containerDimensions.height) {
      return []
    }
    
    if (currentlyReading.length === 0) {
      return []
    }

    const positions: Array<{
      book: Book;
      x: number;
      y: number;
      width: number;
      height: number;
    }> = []

    // Get the actual rendered image dimensions
    const imageDims = getImageDimensions()
    if (!imageDims.width || !imageDims.height) {
      return []
    }

    const bookAspectRatio = 0.65 // typical book cover ratio
    const baseBookHeight = 140 // Fixed height relative to original image
    const bookWidth = baseBookHeight * bookAspectRatio

    // Scale books proportionally with the actual rendered image
    const scale = imageDims.width / 800 // 800 is the original image width
    const scaledBookHeight = baseBookHeight * scale
    const scaledBookWidth = bookWidth * scale

    // Fixed positions for books relative to the original image (800x600)
    const bookPositions = [
      { x: 420, y: 413 },   // Middle position (52% of 800, 57% of 600)
      { x: 248, y: 406 },   // Left position (35.4% of 800, 55% of 600)  
      { x: 520, y: 342 },   // Right position (65% of 800, 57% of 600)
    ]

    // Calculate image offset within container
    let imageOffsetX = 0
    let imageOffsetY = 0

    if (fullPage) {
      // Calculate centering offsets
      imageOffsetX = (containerDimensions.width - imageDims.width) / 2
      imageOffsetY = (containerDimensions.height - imageDims.height) / 2
    }

    // Position each book
    currentlyReading.forEach((book, index) => {
      if (index < bookPositions.length) {
        const position = bookPositions[index]
        
        // Scale the position from original image coordinates
        const scaledX = position.x * scale
        const scaledY = position.y * scale
        
        // Calculate absolute pixel positions
        const x = imageOffsetX + scaledX - (scaledBookWidth / 2)
        const y = imageOffsetY + scaledY - (scaledBookHeight / 2)

        positions.push({
          book,
          x: Math.max(0, x), // Ensure positive coordinates
          y: Math.max(0, y),
          width: scaledBookWidth,
          height: scaledBookHeight,
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

  // Calculate image style based on viewport
  const getImageStyle = () => {
    if (!fullPage || !containerDimensions.width) return {}

    const viewportWidth = containerDimensions.width
    const imageAspectRatio = 800 / 600 // Original image aspect ratio
    const viewportHeight = containerDimensions.height

    // Calculate the natural width the image would have at full viewport height
    const naturalImageWidth = viewportHeight * imageAspectRatio

    // If viewport is narrower than the natural image width
    if (viewportWidth < naturalImageWidth) {
      // Calculate how much we're cropping (as a percentage of the full image)
      const cropPercentage = viewportWidth / naturalImageWidth

      // If we're showing less than 40% of the image, start shrinking instead
      if (cropPercentage < 0.4) {
        // Scale down to fit width while maintaining aspect ratio
        return {
          width: '100%',
          height: 'auto',
          objectFit: 'contain' as const,
          objectPosition: 'center'
        }
      } else {
        // Crop the sides (show only center portion)
        return {
          width: 'auto',
          height: '100%',
          objectFit: 'cover' as const,
          objectPosition: 'center'
        }
      }
    }

    // If viewport is wider, just fit to height
    return {
      width: 'auto',
      height: '100%',
      objectFit: 'cover' as const,
      objectPosition: 'center'
    }
  }

  if (!username) {
    return (
      <div className={`relative ${fullPage ? 'fixed inset-0' : ''} ${className}`}>
        <div ref={containerRef} className={fullPage ? 'relative w-full h-full overflow-hidden flex items-center justify-center' : 'relative w-full h-auto'}>
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
      <div ref={containerRef} className={fullPage ? 'relative w-full h-full overflow-hidden flex items-center justify-center' : 'relative w-full h-auto'}>
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
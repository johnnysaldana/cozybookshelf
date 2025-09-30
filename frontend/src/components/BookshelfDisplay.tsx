'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useBookData } from '@/context/BookDataContext'
import { useAdmin } from '@/context/AdminContext'

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

interface BookshelfDisplayProps {
  username?: string
  className?: string
}

export default function BookshelfDisplay({ username, className = '', fullPage = false }: BookshelfDisplayProps & { fullPage?: boolean }) {
  const { userData, loading: contextLoading, loadUserData } = useBookData()
  const { isAdmin, toggleAdminControls } = useAdmin()
  const [imageLoaded, setImageLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 })
  const [viewportHeight, setViewportHeight] = useState(600)
  const [viewportWidth, setViewportWidth] = useState(1200)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [synopsisExpanded, setSynopsisExpanded] = useState(false)

  // Load user data when username changes
  useEffect(() => {
    if (username) {
      loadUserData(username)
    }
  }, [username, loadUserData])

  // Get current books from context
  const currentlyReading = userData?.currently_reading || []
  const readBooks = userData?.read_books || []
  const loading = contextLoading

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

  // Track viewport dimensions and container dimensions
  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight)
      setViewportWidth(window.innerWidth)
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerDimensions({ width: rect.width, height: rect.height })
      }
    }

    // Set initial viewport dimensions
    setViewportHeight(window.innerHeight)
    setViewportWidth(window.innerWidth)

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

  // Handle book click to show detailed modal
  const handleBookClick = (book: Book) => {
    setSynopsisExpanded(false) // Reset synopsis state for new book

    // Find the specific book with all details from cached data
    const detailedBook = userData?.books?.find((b: Book) => b.id === book.id)

    if (detailedBook) {
      setSelectedBook(detailedBook)
    } else {
      setSelectedBook(book) // Fallback to current book data
    }
  }

  // Close modal
  const closeModal = () => {
    setSelectedBook(null)
    setSynopsisExpanded(false)
  }

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedBook) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [selectedBook])

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
    const viewportAspectRatio = viewportWidth / viewportHeight

    // Adjust book size based on mode
    let bookHeight, bookWidth
    if (viewportAspectRatio > 1) {
      // Horizontal mode: keep current size
      bookHeight = viewportHeight * 0.27
      bookWidth = bookHeight * bookAspectRatio
    } else {
      // Vertical mode: smaller books
      bookHeight = viewportHeight * 0.2
      bookWidth = bookHeight * bookAspectRatio
    }

    // Simple percentage-based positioning
    let bookPositions
    if (viewportAspectRatio > 1) {
      // Horizontal mode positions
      bookPositions = [
        { x: 52, y: 77 },   // Center
        { x: 33, y: 76 },   // Left
        { x: 70, y: 55 },   // Right
      ]
    } else {
      // Vertical mode positions (slightly adjusted)
      bookPositions = [
        { x: 51.5, y: 77 },   // Center
        { x: 37.5, y: 75.5 },   // Left
        { x: 70, y: 57 },   // Right
      ]
    }

    // Calculate image dimensions and positioning
    const aspectRatio = 2496 / 1664  // Actual dimensions of background_new.png

    let imageWidth, imageHeight, imageOffsetX, imageOffsetY

    if (viewportAspectRatio > 1) {
      // Horizontal mode: bottom align and cut off top 25%
      const scale = 1.33 // Scale to show only 75% (1/0.75 = 1.33)
      imageWidth = (viewportHeight * aspectRatio) * scale
      imageHeight = viewportHeight * scale

      // Calculate where the image is positioned within the container (centered horizontally, bottom aligned with scale)
      imageOffsetX = (containerDimensions.width - (viewportHeight * aspectRatio)) / 2
      imageOffsetY = 0 // Since we're using transform origin bottom, no Y offset needed
    } else {
      // Vertical/square mode: maintain full height
      imageWidth = viewportHeight * aspectRatio
      imageHeight = viewportHeight

      // Calculate where the image is positioned within the container (centered)
      imageOffsetX = (containerDimensions.width - imageWidth) / 2
      imageOffsetY = 0
    }

    currentlyReading.forEach((book, index) => {
      if (index < bookPositions.length) {
        const position = bookPositions[index]

        let x, y

        if (viewportAspectRatio > 1) {
          // Horizontal mode: adjust for scale and visible portion
          const scale = 1.33
          const unscaledImageWidth = viewportHeight * aspectRatio
          const unscaledImageHeight = viewportHeight

          // Position relative to the unscaled image dimensions
          x = imageOffsetX + (unscaledImageWidth * position.x / 100) - (bookWidth / 2)

          // For Y position, we need to account for the fact that we're only showing the bottom 75%
          // The original Y position is relative to the full image, but we need to map it to the visible 75%
          // Since we're bottom-aligned, position.y of 0% = top of full image (not visible)
          // position.y of 25% = top of visible area, position.y of 100% = bottom of visible area
          const adjustedY = Math.max(0, (position.y - 25) / 0.75) // Map 25-100% range to 0-100%
          y = imageOffsetY + (viewportHeight * adjustedY / 100) - (bookHeight / 2)
        } else {
          // Vertical mode: standard positioning
          x = imageOffsetX + (imageWidth * position.x / 100) - (bookWidth / 2)
          y = imageOffsetY + (imageHeight * position.y / 100) - (bookHeight / 2)
        }

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

  // Calculate page-based spine dimensions
  const calculateSpineDimensions = (pageCount: number | undefined, viewportAspectRatio: number) => {
    const pages = pageCount || 200; // Default to 200 pages if not specified

    // Width calculation based on page count
    const minMultiplier = 0.012;  // For 100 pages or less
    const maxMultiplier = 0.045; // For 700 pages or more
    const minPages = 100;
    const maxPages = 700;

    let widthMultiplier;
    if (pages <= minPages) {
      widthMultiplier = minMultiplier;
    } else if (pages >= maxPages) {
      widthMultiplier = maxMultiplier;
    } else {
      // Linear interpolation between min and max
      const ratio = (pages - minPages) / (maxPages - minPages);
      widthMultiplier = minMultiplier + (maxMultiplier - minMultiplier) * ratio;
    }

    // Height calculation: 0.115 to 0.14 based on page count mod 40
    const heightVariation = (pages % 40) / 1600; // 0 to 0.025 (40/1600 = 0.025)
    const heightMultiplier = 0.115 + heightVariation;

    // Scale for different viewport modes
    let spineWidth, spineHeight;
    if (viewportAspectRatio > 1) {
      // Horizontal mode
      spineWidth = viewportHeight * widthMultiplier;
      spineHeight = viewportHeight * heightMultiplier;
    } else {
      // Vertical mode: scale down proportionally
      spineWidth = viewportHeight * widthMultiplier * 0.7; // Scale down for vertical
      spineHeight = viewportHeight * heightMultiplier * 0.7; // Scale down for vertical
    }

    return { spineWidth, spineHeight };
  };

  // Calculate book spine positions on the bookshelf
  const calculateBookSpinePositions = (): Array<{
    book: Book | 'admin';
    x: number;
    y: number;
    width: number;
    height: number;
  }> => {
    // If admin, need at least container dimensions even if no books
    if (!containerDimensions.width || !containerDimensions.height) {
      return []
    }

    // If not admin and no books, return empty
    if (!isAdmin && readBooks.length === 0) {
      return []
    }

    const positions: Array<{
      book: Book | 'admin';
      x: number;
      y: number;
      width: number;
      height: number;
    }> = []

    // Use the same aspect ratio and viewport calculations as currently reading books
    const aspectRatio = 2496 / 1664  // Actual dimensions of background_new.png
    const viewportAspectRatio = viewportWidth / viewportHeight

    // Define shelf positions as percentages - same coordinate system as currently reading books
    let shelfPositions
    if (viewportAspectRatio > 1) {
      // Horizontal mode shelf positions
      shelfPositions = [
        { y: 51.5, startX: 40, endX: 85 }, // Top visible shelf
        { y: 65, startX: 40, endX: 85 }, // Middle shelf
        { y: 85, startX: 40, endX: 85 }, // Bottom shelf
      ]
    } else {
      // Vertical mode shelf positions (adjust for full image visibility)
      shelfPositions = [
        { y: 51, startX: 42.5, endX: 85 }, // Top shelf
        { y: 50, startX: 42.5, endX: 85 }, // Middle-top shelf
        { y: 65, startX: 42.5, endX: 85 }, // Middle-bottom shelf
        { y: 80, startX: 42.5, endX: 85 }, // Bottom shelf
      ]
    }

    // Calculate image dimensions and positioning (EXACT same logic as currently reading books)
    let imageWidth, imageHeight, imageOffsetX, imageOffsetY

    if (viewportAspectRatio > 1) {
      // Horizontal mode: bottom align and cut off top 25%
      const scale = 1.33 // Scale to show only 75% (1/0.75 = 1.33)
      imageWidth = (viewportHeight * aspectRatio) * scale
      imageHeight = viewportHeight * scale

      // Calculate where the image is positioned within the container (centered horizontally, bottom aligned with scale)
      imageOffsetX = (containerDimensions.width - (viewportHeight * aspectRatio)) / 2
      imageOffsetY = 0 // Since we're using transform origin bottom, no Y offset needed
    } else {
      // Vertical/square mode: maintain full height
      imageWidth = viewportHeight * aspectRatio
      imageHeight = viewportHeight

      // Calculate where the image is positioned within the container (centered)
      imageOffsetX = (containerDimensions.width - imageWidth) / 2
      imageOffsetY = 0
    }

    // Sort books by finished date (oldest to newest) - books without dates go to end
    const sortedReadBooks = [...readBooks].sort((a, b) => {
      const dateA = a.date_finished ? new Date(a.date_finished).getTime() : Infinity
      const dateB = b.date_finished ? new Date(b.date_finished).getTime() : Infinity
      return dateA - dateB
    })

    // Pre-calculate all spine dimensions to handle spacing correctly
    const bookSpineDimensions = sortedReadBooks.map(book => ({
      book,
      ...calculateSpineDimensions(book.books?.pages, viewportAspectRatio)
    }))

    // If admin, add admin book as first spine
    if (isAdmin) {
      const adminSpineWidth = viewportAspectRatio > 1 ? viewportHeight * 0.025 : viewportHeight * 0.025 * 0.7
      const adminSpineHeight = viewportAspectRatio > 1 ? viewportHeight * 0.12 : viewportHeight * 0.12 * 0.7
      bookSpineDimensions.unshift({
        book: 'admin' as any,
        spineWidth: adminSpineWidth,
        spineHeight: adminSpineHeight
      })
    }

    let currentShelfIndex = 0
    let currentXPosition = shelfPositions[0].startX // This tracks the LEFT edge of the next spine

    // Track books per shelf
    let booksOnCurrentShelf = 0

    bookSpineDimensions.forEach((bookData, index) => {
      if (currentShelfIndex >= shelfPositions.length) return // No more shelves

      const { book, spineWidth, spineHeight } = bookData
      const currentShelf = shelfPositions[currentShelfIndex]

      // Calculate reference width for percentage conversions
      const imageReferenceWidth = viewportAspectRatio > 1 ? (viewportHeight * aspectRatio) : imageWidth
      const spineWidthPercentage = (spineWidth / imageReferenceWidth) * 100

      // Check if current book fits on current shelf (left edge + width <= shelf end)
      const spineRightEdge = currentXPosition + spineWidthPercentage

      if (spineRightEdge > currentShelf.endX && booksOnCurrentShelf > 0) {
        // Move to next shelf
        currentShelfIndex++
        if (currentShelfIndex >= shelfPositions.length) return
        currentXPosition = shelfPositions[currentShelfIndex].startX
        booksOnCurrentShelf = 0
      }

      const shelf = shelfPositions[currentShelfIndex]

      // Calculate the center position for this spine (left edge + half width)
      const spineCenterX = currentXPosition + (spineWidthPercentage / 2)

      // Use EXACT same positioning logic as currently reading books
      let x, y

      if (viewportAspectRatio > 1) {
        // Horizontal mode: adjust for scale and visible portion (SAME as currently reading)
        const scale = 1.33
        const unscaledImageWidth = viewportHeight * aspectRatio
        const unscaledImageHeight = viewportHeight

        // Position relative to the unscaled image dimensions
        x = imageOffsetX + (unscaledImageWidth * spineCenterX / 100) - (spineWidth / 2)

        // For Y position, we need to account for the fact that we're only showing the bottom 75%
        // The original Y position is relative to the full image, but we need to map it to the visible 75%
        // Since we're bottom-aligned, position.y of 0% = top of full image (not visible)
        // position.y of 25% = top of visible area, position.y of 100% = bottom of visible area
        const adjustedY = Math.max(0, (shelf.y - 25) / 0.75) // Map 25-100% range to 0-100%
        y = imageOffsetY + (viewportHeight * adjustedY / 100) - spineHeight // Bottom align to shelf
      } else {
        // Vertical mode: bottom align to shelf
        x = imageOffsetX + (imageWidth * spineCenterX / 100) - (spineWidth / 2)
        y = imageOffsetY + (imageHeight * shelf.y / 100) - spineHeight // Bottom align to shelf
      }

      positions.push({
        book,
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: spineWidth,
        height: spineHeight,
      })

      // Move to next position: the left edge of the next spine is the right edge of current spine + tiny spacing
      const tinySpacingPixels = 3 // Small 1px gap between spines
      const tinySpacingPercentage = (tinySpacingPixels / imageReferenceWidth) * 100
      currentXPosition += spineWidthPercentage + tinySpacingPercentage
      booksOnCurrentShelf++
    })

    return positions
  }

  // Recalculate book positions when dependencies change
  const bookPositions = calculateBookPositions()
  const spinePositions = calculateBookSpinePositions()

  const getBestImageUrl = (book: Book['books']) => {
    // Prioritize higher quality images
    return book.large_image_url || book.medium_image_url || book.image_url || book.small_image_url || '/default-book-cover.png'
  }

  const getSmallImageUrl = (book: Book['books']) => {
    // Use small image for book spines
    return book.small_image_url || book.image_url || book.medium_image_url || book.large_image_url || '/default-book-cover.png'
  }

  // Image style - always maintain aspect ratio, allow black bars on sides
  const getImageStyle = () => {
    // Actual image is 2496x1664, aspect ratio = 2496/1664 = 1.5
    const aspectRatio = 2496 / 1664
    const viewportAspectRatio = viewportWidth / viewportHeight

    // If viewport is wider than 1:1, switch to horizontal mode
    if (viewportAspectRatio > 1) {
      // Horizontal mode: bottom align and cut off top 25%
      const calculatedWidth = viewportHeight * aspectRatio

      return {
        width: `${calculatedWidth}px`,
        height: `${viewportHeight}px`,
        flexShrink: 0,
        objectFit: 'cover' as const,
        objectPosition: 'center bottom' as const, // Bottom align to cut off top
        transform: 'scale(1.33)', // Scale to show only 75% (1/0.75 = 1.33)
        transformOrigin: 'center bottom' as const,
      }
    }

    // Vertical/square mode: maintain full height
    const calculatedWidth = viewportHeight * aspectRatio

    return {
      width: `${calculatedWidth}px`,
      height: `${viewportHeight}px`,
      flexShrink: 0,
      objectFit: 'cover' as const,
      objectPosition: 'center' as const,
    }
  }


  if (!username) {
    return (
      <div className={`relative ${fullPage ? 'fixed inset-0' : ''} ${className}`}>
        <div ref={containerRef} className={fullPage ? 'relative w-full h-full flex items-center justify-center overflow-hidden' : 'relative w-full h-auto flex justify-center overflow-hidden'}>
          <img
            src="/background_new.png"
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
          src="/background_new.png"
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
            onClick={() => handleBookClick(book)}
          >
            {/* 3D effect background rectangle */}
            <div
              className="absolute bg-amber-100 rounded-sm"
              style={{
                left: '6px',
                top: '6px',
                width: '100%',
                height: '100%',
                zIndex: 1,
              }}
            />

            <Image
              src={getBestImageUrl(book.books)}
              alt={book.books?.title || 'Book cover'}
              fill
              className="object-cover rounded-sm shadow-lg group-hover:shadow-xl transition-shadow duration-200"
              style={{
                filter: 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4)) drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3))',
                zIndex: 2,
              }}
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

        {/* Book spines on shelves */}
        {!loading && spinePositions.map(({ book, x, y, width, height }, index) => {
          // Handle admin spine
          if (book === 'admin') {
            return (
              <div
                key="admin-spine"
                className="absolute cursor-pointer group transition-transform duration-200 hover:scale-110 hover:z-20"
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                }}
                title="Click to toggle admin panel"
                onClick={toggleAdminControls}
              >
                {/* Black admin spine */}
                <div className="w-full h-full relative overflow-hidden">
                  <div
                    className="w-full h-full rounded-sm relative overflow-hidden bg-gradient-to-r from-gray-900 via-black to-gray-900"
                    style={{
                      boxShadow: `
                        inset 2px 0 4px rgba(255,255,255,0.1),
                        inset -2px 0 4px rgba(0,0,0,0.5),
                        0 2px 6px rgba(0,0,0,0.5),
                        0 1px 3px rgba(0,0,0,0.3)
                      `,
                      border: '1px solid rgba(0,0,0,0.5)',
                    }}
                  >
                    {/* Left edge highlight */}
                    <div
                      className="absolute left-0 top-0 w-1 h-full"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
                      }}
                    />

                    {/* Right edge shadow */}
                    <div
                      className="absolute right-0 top-0 w-1 h-full"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.5) 100%)',
                      }}
                    />

                    {/* Admin icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg
                        className="w-3/4 h-auto text-gray-600 group-hover:text-gray-500 transition-colors"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          // Regular book spine rendering
          return (
            <div
              key={`spine-${book.id}`}
              className="absolute cursor-pointer group transition-transform duration-200 hover:scale-110 hover:z-20"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${height}px`,
              }}
              title={`${book.books?.title || 'Unknown'} by ${book.books?.author || 'Unknown'}`}
              onClick={() => handleBookClick(book)}
            >
            {/* Book spine with 3D effect */}
            <div className="w-full h-full relative overflow-hidden">
              {/* Main spine face */}
              <div
                className="w-full h-full rounded-sm relative overflow-hidden"
                style={{
                  background: `linear-gradient(
                    to right,
                    rgba(0,0,0,0.15) 0%,
                    rgba(0,0,0,0.05) 15%,
                    rgba(255,255,255,0.2) 50%,
                    rgba(0,0,0,0.05) 85%,
                    rgba(0,0,0,0.2) 100%
                  )`,
                  boxShadow: `
                    inset 2px 0 4px rgba(255,255,255,0.3),
                    inset -2px 0 4px rgba(0,0,0,0.2),
                    0 2px 6px rgba(0,0,0,0.3),
                    0 1px 3px rgba(0,0,0,0.2)
                  `,
                  border: '1px solid rgba(0,0,0,0.15)',
                }}
              >
                <Image
                  src={getSmallImageUrl(book.books)}
                  alt={book.books?.title || 'Book spine'}
                  fill
                  className="object-cover rounded-sm"
                  style={{
                    filter: 'blur(1px) brightness(0.9) contrast(1.1)',
                    opacity: 0.8,
                  }}
                  sizes="20px"
                />

                {/* Left edge highlight */}
                <div
                  className="absolute left-0 top-0 w-1 h-full"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.2) 100%)',
                  }}
                />

                {/* Right edge shadow */}
                <div
                  className="absolute right-0 top-0 w-1 h-full"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.25) 100%)',
                  }}
                />

                {/* Top edge highlight */}
                <div
                  className="absolute top-0 left-0 w-full h-0.5"
                  style={{
                    background: 'linear-gradient(to right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.4) 100%)',
                  }}
                />

                {/* Bottom edge shadow */}
                <div
                  className="absolute bottom-0 left-0 w-full h-0.5"
                  style={{
                    background: 'linear-gradient(to right, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.25) 100%)',
                  }}
                />

                {/* Spine text overlay - scales with spine width */}
                {width > 8 && (
                  <div
                    className="absolute inset-0 flex items-center justify-center writing-mode-vertical"
                    style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
                  >
                    <div
                      className="text-white font-bold drop-shadow-md truncate text-center max-h-full"
                      style={{
                        fontFamily: '"Times New Roman", Times, serif',
                        fontSize: `${Math.max(5, Math.min(containerDimensions.width / containerDimensions.height > 1 ? 12 : 8, (containerDimensions.width / containerDimensions.height > 1 ? 18 : 12) - (width * 0.15)))}px`,
                        lineHeight: '1.0',
                        paddingLeft: `${Math.max(0.5, width * 0.02)}px`,
                        paddingRight: `${Math.max(0.5, width * 0.02)}px`
                      }}
                    >
                      {(book.books?.title || '').slice(0, Math.max(1, Math.floor(width * 1.2)))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hover tooltip */}
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-30">
              {book.books?.title || 'Unknown Title'}
            </div>
          </div>
          )
        })}

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



      </div>

      {/* Book Detail Modal - Responsive Notebook Style */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto" onClick={closeModal}>
          <div className={`bg-amber-50 rounded-lg shadow-2xl w-full border-4 border-amber-200 ${
            viewportWidth > viewportHeight ? 'max-w-5xl max-h-[90vh] overflow-hidden' : 'max-w-lg my-4'
          }`}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundImage: viewportWidth > viewportHeight ? `
              linear-gradient(transparent 0px, transparent 19px, #e5e7eb 19px, #e5e7eb 20px, transparent 20px),
              linear-gradient(90deg, transparent 0px, transparent 49px, #dc2626 49px, #dc2626 51px, transparent 51px)
            ` : `linear-gradient(transparent 0px, transparent 19px, #e5e7eb 19px, #e5e7eb 20px, transparent 20px)`,
            backgroundSize: viewportWidth > viewportHeight ? '100% 20px, 100% 100%' : '100% 20px'
          }}>
            <div className="h-full">
                {/* Notebook Header */}
                <div className="flex justify-between items-center p-4 bg-amber-100 border-b border-amber-300">
                  <div className="flex items-center">
                    <span className={`font-semibold text-gray-700 font-mono ${viewportWidth > viewportHeight ? 'text-lg' : 'text-base'}`}>Reading Journal</span>
                  </div>
                  <button
                    onClick={closeModal}
                    className="text-gray-600 hover:text-gray-800 text-2xl font-bold leading-none bg-amber-200 hover:bg-amber-300 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                    aria-label="Close notebook"
                  >
                    ×
                  </button>
                </div>

                {/* Notebook Content - Responsive Layout */}
                <div className={`${viewportWidth > viewportHeight ? 'h-full overflow-hidden flex' : 'flex flex-col'}`} style={{
                  height: viewportWidth > viewportHeight ? 'calc(100% - 65px)' : 'auto'
                }}>
                  {/* Book Summary Section */}
                  <div className={`${viewportWidth > viewportHeight ? 'w-1/2 p-8 pl-16 overflow-y-auto' : 'w-full p-6 px-8'}`} style={{
                    backgroundImage: `linear-gradient(transparent 0px, transparent 19px, #e5e7eb 19px, #e5e7eb 20px, transparent 20px)`,
                    backgroundSize: '100% 20px'
                  }}>
                    <div className="space-y-6">
                      {/* Reading Dates - Top of first section in vertical mode */}
                      {viewportWidth <= viewportHeight && (selectedBook.date_started || selectedBook.date_finished) && (
                        <div className="space-y-2 font-serif text-sm bg-amber-100 p-3 rounded">
                          <h3 className="font-semibold text-gray-700">Reading Timeline</h3>
                          <div className="space-y-1">
                            {selectedBook.date_started && (
                              <div className="flex items-baseline gap-2">
                                <span className="text-gray-600 font-semibold">Started:</span>
                                <span className="text-gray-800">{new Date(selectedBook.date_started).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}</span>
                              </div>
                            )}
                            {selectedBook.date_finished && (
                              <div className="flex items-baseline gap-2">
                                <span className="text-gray-600 font-semibold">Finished:</span>
                                <span className="text-gray-800">{new Date(selectedBook.date_finished).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Book Cover and Title */}
                      <div className="flex gap-4 mb-6">
                        <div className="flex-shrink-0">
                          <div className="relative w-24 h-36 shadow-lg">
                            <Image
                              src={getBestImageUrl(selectedBook.books)}
                              alt={selectedBook.books?.title || 'Book cover'}
                              fill
                              className="object-cover rounded-md"
                              sizes="96px"
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h2 className={`font-bold text-gray-800 mb-1 font-serif leading-5 ${viewportWidth > viewportHeight ? 'text-xl' : 'text-lg'}`}>
                            {selectedBook.books?.title || 'Unknown Title'}
                          </h2>
                          <p className="text-gray-600 font-serif mb-2">
                            by {selectedBook.books?.author || 'Unknown Author'}
                          </p>
                          {selectedBook.books?.series && (
                            <p className="text-sm text-gray-500 font-serif">
                              {selectedBook.books.series}
                              {selectedBook.books.series_position && ` #${selectedBook.books.series_position}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Publication Info */}
                      <div className="space-y-3 font-serif text-sm">
                        <h3 className="font-semibold text-gray-700 underline">Publication Details</h3>

                        {selectedBook.books?.publication_year && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Published:</span>
                            <span className="text-gray-800">{selectedBook.books.publication_year}</span>
                          </div>
                        )}

                        {selectedBook.books?.publisher && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Publisher:</span>
                            <span className="text-gray-800">{selectedBook.books.publisher}</span>
                          </div>
                        )}

                        {selectedBook.books?.pages && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pages:</span>
                            <span className="text-gray-800">{selectedBook.books.pages}</span>
                          </div>
                        )}

                        {selectedBook.books?.format && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Format:</span>
                            <span className="text-gray-800">{selectedBook.books.format}</span>
                          </div>
                        )}
                      </div>

                      {/* Ratings Section - Combined in vertical mode */}
                      {viewportWidth <= viewportHeight ? (
                        <div className="space-y-3 font-serif text-sm">
                          <h3 className="font-semibold text-gray-700 underline">Ratings</h3>
                          <div className="grid grid-cols-2 gap-4">
                            {/* Community Rating */}
                            {selectedBook.books?.average_rating && (
                              <div className="space-y-1">
                                <h4 className="font-semibold text-gray-600 text-xs">Community</h4>
                                <div className="flex items-center gap-1">
                                  <div className="flex text-yellow-400 text-sm">
                                    {[...Array(5)].map((_, i) => (
                                      <span key={i} className={i < Math.round(selectedBook.books!.average_rating!) ? 'text-yellow-400' : 'text-gray-300'}>
                                        ★
                                      </span>
                                    ))}
                                  </div>
                                  <span className="text-gray-600 text-xs">({selectedBook.books.average_rating.toFixed(1)})</span>
                                </div>
                              </div>
                            )}
                            {/* My Rating */}
                            <div className="space-y-1">
                              <h4 className="font-semibold text-gray-600 text-xs">My Rating</h4>
                              <div className="flex items-center gap-1">
                                {selectedBook.rating ? (
                                  <>
                                    <div className="flex text-yellow-400 text-sm">
                                      {[...Array(5)].map((_, i) => (
                                        <span key={i} className={`${i < selectedBook.rating! ? 'text-yellow-400' : 'text-gray-300'}`}>
                                          ★
                                        </span>
                                      ))}
                                    </div>
                                    <span className="text-gray-700 text-xs">({selectedBook.rating})</span>
                                  </>
                                ) : (
                                  <span className="text-gray-500 italic text-xs">Not rated</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Original Community Rating for horizontal mode */
                        selectedBook.books?.average_rating && (
                          <div className="space-y-2 font-serif text-sm">
                            <h3 className="font-semibold text-gray-700 underline">Community Rating</h3>
                            <div className="flex items-center gap-2">
                              <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className={i < Math.round(selectedBook.books!.average_rating!) ? 'text-yellow-400' : 'text-gray-300'}>
                                    ★
                                  </span>
                                ))}
                              </div>
                              <span className="text-gray-600">({selectedBook.books.average_rating.toFixed(2)}/5)</span>
                            </div>
                          </div>
                        )
                      )}

                      {/* Description - Collapsible in vertical mode */}
                      {selectedBook.books?.description && (
                        <div className="space-y-2 font-serif text-sm">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-700 underline">Synopsis</h3>
                            {viewportWidth <= viewportHeight && (
                              <button
                                onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors"
                              >
                                {synopsisExpanded ? 'Hide' : 'Show More'}
                              </button>
                            )}
                          </div>
                          {viewportWidth <= viewportHeight ? (
                            <div className={`text-gray-700 leading-relaxed text-justify transition-all duration-300 ${
                              synopsisExpanded ? 'max-h-none' : 'max-h-20 overflow-hidden'
                            }`}>
                              {selectedBook.books.description}
                              {!synopsisExpanded && selectedBook.books.description.length > 150 && (
                                <div className="absolute bottom-0 right-0 bg-gradient-to-l from-amber-50 to-transparent pl-8 text-blue-600 text-xs">
                                  ...
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-gray-700 leading-relaxed max-h-40 overflow-y-auto text-justify">
                              {selectedBook.books.description}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Center Binding - Only show in horizontal mode */}
                  {viewportWidth > viewportHeight && (
                    <div className="w-1 bg-gradient-to-b from-amber-300 to-amber-400 shadow-inner"></div>
                  )}

                  {/* Horizontal separator for vertical mode */}
                  {viewportWidth <= viewportHeight && (
                    <div className="h-1 bg-gradient-to-r from-amber-300 to-amber-400 shadow-inner mx-6 my-2"></div>
                  )}

                  {/* Personal Journal Section */}
                  <div className={`${viewportWidth > viewportHeight ? 'w-1/2 p-8 pr-16 overflow-y-auto' : 'w-full p-6 px-8'}`} style={{
                    backgroundImage: viewportWidth > viewportHeight ? `
                      linear-gradient(transparent 0px, transparent 19px, #cbd5e1 19px, #cbd5e1 20px, transparent 20px),
                      linear-gradient(90deg, transparent 0px, transparent 29px, #ef4444 29px, #ef4444 30px, transparent 30px)
                    ` : `linear-gradient(transparent 0px, transparent 19px, #cbd5e1 19px, #cbd5e1 20px, transparent 20px)`,
                    backgroundSize: viewportWidth > viewportHeight ? '100% 20px, 100% 100%' : '100% 20px'
                  }}>
                    <div className={`space-y-6 ${viewportWidth > viewportHeight ? 'pl-8' : 'pl-0'}`}>
                      {viewportWidth > viewportHeight && (
                        <div className="mb-6">
                          <h2 className="text-xl font-bold text-gray-800 font-serif mb-2">My Reading Journal</h2>
                          <div className="w-16 h-0.5 bg-gray-400"></div>
                        </div>
                      )}

                      {/* Reading Dates - Only show in horizontal mode */}
                      {viewportWidth > viewportHeight && (
                        <div className="space-y-3 font-serif text-sm">
                          {selectedBook.date_started && (
                            <div className="flex items-baseline gap-2">
                              <span className="text-gray-600 font-semibold">Started:</span>
                              <span className="text-gray-800 font-handwriting">{new Date(selectedBook.date_started).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}</span>
                            </div>
                          )}

                          {selectedBook.date_finished && (
                            <div className="flex items-baseline gap-2">
                              <span className="text-gray-600 font-semibold">Finished:</span>
                              <span className="text-gray-800 font-handwriting">{new Date(selectedBook.date_finished).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* My Rating - Only show in horizontal mode */}
                      {viewportWidth > viewportHeight && (
                        <div className="space-y-2 font-serif text-sm">
                          <h3 className="font-semibold text-gray-700">My Rating</h3>
                          <div className="flex items-center gap-2">
                            {selectedBook.rating ? (
                              <>
                                <div className="flex text-yellow-400">
                                  {[...Array(5)].map((_, i) => (
                                    <span key={i} className={`text-lg ${i < selectedBook.rating! ? 'text-yellow-400' : 'text-gray-300'}`}>
                                      ★
                                    </span>
                                  ))}
                                </div>
                                <span className="text-gray-700 font-handwriting">({selectedBook.rating}/5)</span>
                              </>
                            ) : (
                              <span className="text-gray-500 italic">Not yet rated</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* My Review */}
                      <div className="space-y-3 font-serif text-sm">
                        <h3 className="font-semibold text-gray-700">My Thoughts</h3>
                        <div className="min-h-32">
                          {selectedBook.review ? (
                            <div className="text-gray-700 leading-6 font-handwriting whitespace-pre-wrap">
                              {selectedBook.review}
                            </div>
                          ) : (
                            <div className="text-gray-400 italic">
                              No review written yet...
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Signature area */}
                      <div className="mt-8 pt-4 border-t border-gray-300">
                        <div className="text-right text-gray-500 font-serif text-xs">
                          Reading log entry
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
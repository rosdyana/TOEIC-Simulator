import { useState, useRef, useEffect } from 'react';
import { X, Move } from 'lucide-react';

interface ImageZoomProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ImageZoom({ src, alt, className = '', style }: ImageZoomProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleImageClick = () => {
    setIsZoomed(true);
    setImagePosition({ x: 0, y: 0 });
    setImageScale(1);
  };

  const handleCloseZoom = () => {
    setIsZoomed(false);
    setIsDragging(false);
    setImagePosition({ x: 0, y: 0 });
    setImageScale(1);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseZoom();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Get container and image dimensions to constrain movement
    if (containerRef.current && imageRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const imageRect = imageRef.current.getBoundingClientRect();
      
      const maxX = Math.max(0, (imageRect.width * imageScale - containerRect.width) / 2);
      const maxY = Math.max(0, (imageRect.height * imageScale - containerRect.height) / 2);
      
      setImagePosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(3, imageScale * delta));
    setImageScale(newScale);
  };

  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        if (containerRef.current && imageRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const imageRect = imageRef.current.getBoundingClientRect();
          
          const maxX = Math.max(0, (imageRect.width * imageScale - containerRect.width) / 2);
          const maxY = Math.max(0, (imageRect.height * imageScale - containerRect.height) / 2);
          
          setImagePosition({
            x: Math.max(-maxX, Math.min(maxX, newX)),
            y: Math.max(-maxY, Math.min(maxY, newY))
          });
        }
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, dragStart, imageScale]);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`cursor-pointer transition-transform hover:scale-105 ${className}`}
        style={style}
        onClick={handleImageClick}
      />
      
      {isZoomed && (
        <div
          ref={containerRef}
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 overflow-hidden"
          onClick={handleBackdropClick}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              onClick={handleCloseZoom}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
              aria-label="Close zoom"
            >
              <X className="h-8 w-8" />
            </button>
            
            <div className="absolute top-4 left-4 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded z-10">
              <Move className="h-4 w-4 inline mr-1" />
              Drag to move • Scroll to zoom
            </div>
            
            <img
              ref={imageRef}
              src={src}
              alt={alt}
              className={`max-w-none select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{
                transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
                maxWidth: 'none',
                maxHeight: 'none',
                width: 'auto',
                height: 'auto'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
              draggable={false}
            />
          </div>
        </div>
      )}
    </>
  );
}

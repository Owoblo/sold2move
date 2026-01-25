import React, { useState, useEffect, useMemo } from 'react';
import { Brain, Scan } from 'lucide-react';

/**
 * AI Scanning Overlay - Shows an immersive scanning experience during inventory detection
 *
 * Features:
 * - Cycles through photos being analyzed
 * - Animated scan line sweeping across the image
 * - Detection points appearing as items are "found"
 * - Progress ring with Brain icon
 * - Dynamic status messages
 * - Photo counter
 */
const AIScanningOverlay = ({
  photos = [],
  currentPhotoIndex = 0,
  progress = 0,
  isLight = false
}) => {
  const [detectionPoints, setDetectionPoints] = useState([]);
  const [statusIndex, setStatusIndex] = useState(0);

  const statusMessages = useMemo(() => [
    "Analyzing room layout...",
    "Detecting furniture items...",
    "Measuring dimensions...",
    "Calculating cubic feet...",
    "Identifying room type...",
    "Cataloging items...",
    "Processing details..."
  ], []);

  // Cycle through status messages
  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [statusMessages.length]);

  // Generate random detection points periodically
  useEffect(() => {
    const interval = setInterval(() => {
      // Add a new detection point
      const newPoint = {
        id: Date.now(),
        x: 15 + Math.random() * 70, // 15-85% from left
        y: 15 + Math.random() * 55, // 15-70% from top (avoiding status bar)
      };

      setDetectionPoints((prev) => {
        // Keep max 6 points, remove oldest
        const updated = [...prev, newPoint];
        return updated.slice(-6);
      });
    }, 800);

    return () => clearInterval(interval);
  }, [currentPhotoIndex]); // Reset when photo changes

  // Clear detection points when photo changes
  useEffect(() => {
    setDetectionPoints([]);
  }, [currentPhotoIndex]);

  const currentPhoto = photos[currentPhotoIndex];
  const photoUrl = currentPhoto?.url || currentPhoto;
  const totalPhotos = Math.min(photos.length, 12); // Max 12 photos are analyzed

  // Calculate SVG progress for circular indicator
  const circumference = 2 * Math.PI * 18; // radius = 18
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-full aspect-[4/3] max-w-[1000px] mx-auto rounded-lg overflow-hidden">
      {/* Photo being scanned */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={`Scanning photo ${currentPhotoIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
          style={{ filter: 'brightness(0.85)' }}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ backgroundColor: isLight ? '#f1f5f9' : 'rgba(22, 26, 31, 0.9)' }}
        >
          <Scan className="h-16 w-16 animate-pulse" style={{ color: isLight ? '#059669' : '#00FF88' }} />
        </div>
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

      {/* Scan line animation */}
      <div
        className="absolute left-0 right-0 h-1 animate-scan-line"
        style={{
          background: `linear-gradient(90deg, transparent, ${isLight ? '#059669' : '#00FF88'}, transparent)`,
          boxShadow: `0 0 20px ${isLight ? '#059669' : '#00FF88'}, 0 0 40px ${isLight ? '#059669' : '#00FF88'}50`
        }}
      />

      {/* Detection points */}
      {detectionPoints.map((point) => (
        <div
          key={point.id}
          className="absolute animate-detection-pop"
          style={{
            left: `${point.x}%`,
            top: `${point.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* Outer glow ring */}
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: `${isLight ? '#059669' : '#00FF88'}30`,
              marginLeft: '-6px',
              marginTop: '-6px'
            }}
          />
          {/* Inner dot */}
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: isLight ? '#059669' : '#00FF88',
              boxShadow: `0 0 10px ${isLight ? '#059669' : '#00FF88'}`
            }}
          />
        </div>
      ))}

      {/* Corner brackets (scanning frame effect) */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 rounded-tl-sm" style={{ borderColor: isLight ? '#059669' : '#00FF88' }} />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 rounded-tr-sm" style={{ borderColor: isLight ? '#059669' : '#00FF88' }} />
      <div className="absolute bottom-20 left-4 w-8 h-8 border-l-2 border-b-2 rounded-bl-sm" style={{ borderColor: isLight ? '#059669' : '#00FF88' }} />
      <div className="absolute bottom-20 right-4 w-8 h-8 border-r-2 border-b-2 rounded-br-sm" style={{ borderColor: isLight ? '#059669' : '#00FF88' }} />

      {/* Status panel at bottom */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 pt-8">
        <div className="flex items-center gap-4">
          {/* Progress ring with Brain icon */}
          <div className="relative flex-shrink-0">
            {/* Rotating outer ring */}
            <div
              className="absolute inset-0 rounded-full animate-spin"
              style={{
                width: '48px',
                height: '48px',
                border: `2px dashed ${isLight ? '#059669' : '#00FF88'}40`,
                animationDuration: '3s'
              }}
            />
            {/* Progress circle SVG */}
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
              {/* Background circle */}
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke={isLight ? '#05966920' : '#00FF8820'}
                strokeWidth="3"
              />
              {/* Progress circle */}
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke={isLight ? '#059669' : '#00FF88'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300"
              />
            </svg>
            {/* Brain icon in center */}
            <Brain
              className="absolute inset-0 m-auto h-5 w-5"
              style={{ color: isLight ? '#059669' : '#00FF88' }}
            />
          </div>

          {/* Status text */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm md:text-base">AI Inventory Scan</p>
            <p
              className="text-white/70 text-xs md:text-sm truncate transition-all duration-300"
              key={statusIndex} // Force re-render for animation
            >
              {statusMessages[statusIndex]}
            </p>
          </div>

          {/* Progress percentage and photo counter */}
          <div className="text-right flex-shrink-0">
            <p
              className="font-mono text-lg font-bold"
              style={{ color: isLight ? '#059669' : '#00FF88' }}
            >
              {Math.round(progress)}%
            </p>
            <p className="text-white/60 text-xs">
              Photo {Math.min(currentPhotoIndex + 1, totalPhotos)} of {totalPhotos}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ backgroundColor: isLight ? '#05966920' : '#00FF8820' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor: isLight ? '#059669' : '#00FF88',
              boxShadow: `0 0 10px ${isLight ? '#059669' : '#00FF88'}`
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AIScanningOverlay;

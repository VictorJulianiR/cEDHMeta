import React, { useState, useLayoutEffect } from 'react';

interface CardImagePreviewProps {
  name: string;
  imageUrl: string | null | undefined; // undefined means loading
  position: { x: number; y: number };
}

const PREVIEW_WIDTH = 240;
const PREVIEW_HEIGHT = 336; // Approx 5/7 aspect ratio
const OFFSET = 20;

const CardImagePreview: React.FC<CardImagePreviewProps> = ({ name, imageUrl, position }) => {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    let top = position.y + OFFSET;
    let left = position.x + OFFSET;
    
    // Adjust if it goes off the right edge of the screen
    if (left + PREVIEW_WIDTH > window.innerWidth) {
      left = position.x - PREVIEW_WIDTH - OFFSET;
    }

    // Adjust if it goes off the bottom edge of the screen
    if (top + PREVIEW_HEIGHT > window.innerHeight) {
      top = position.y - PREVIEW_HEIGHT - OFFSET;
    }
    
    // Ensure it doesn't go off top or left
    if (top < 0) top = OFFSET;
    if (left < 0) left = OFFSET;

    setStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${PREVIEW_WIDTH}px`,
      aspectRatio: '5/7',
      zIndex: 1000,
      pointerEvents: 'none',
      transition: 'opacity 0.2s ease-in-out',
      opacity: 1,
      borderRadius: '12px'
    });
  }, [position]);

  return (
    <div style={style} className="bg-ui-surface rounded-xl shadow-2xl shadow-brand-gold/20 flex items-center justify-center ring-1 ring-black/20">
      {imageUrl === undefined && (
        <div className="text-ui-text-secondary animate-pulse p-4 text-center">Loading image...</div>
      )}
      {imageUrl === null && (
        <div className="text-ui-text-muted p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1.586-1.586a2 2 0 00-2.828 0L6 14m6-6l.01.01" />
            </svg>
            Image not found
        </div>
      )}
      {imageUrl && (
        <img src={imageUrl} alt={name} className="w-full h-full object-cover rounded-xl" />
      )}
    </div>
  );
};

export default CardImagePreview;

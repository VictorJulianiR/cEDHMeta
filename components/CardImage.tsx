import React from 'react';

interface CardImageProps {
  src: string | null;
  alt: string;
  label: string;
}

const CardImage: React.FC<CardImageProps> = ({ src, alt, label }) => {
  return (
    <div className="text-center group">
      <h3 className="text-lg font-bold font-heading text-ui-text-primary mb-2">{label}</h3>
      <div className="relative w-full max-w-[240px] h-auto aspect-[5/7] bg-ui-surface rounded-xl shadow-lg flex items-center justify-center mx-auto ring-1 ring-black/20 transition-all duration-300 ease-in-out group-hover:shadow-2xl group-hover:shadow-brand-gold/20 group-hover:scale-105 group-hover:-translate-y-2">
        {src ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover rounded-xl"
            loading="lazy"
          />
        ) : (
          <div className="text-ui-text-muted text-center p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1.586-1.586a2 2 0 00-2.828 0L6 14m6-6l.01.01" />
            </svg>
            Image not found
          </div>
        )}
      </div>
       <p className="text-sm text-ui-text-secondary mt-2 truncate w-full max-w-[240px] mx-auto transition-colors duration-300 group-hover:text-brand-gold" title={alt}>{alt}</p>
    </div>
  );
};

export default CardImage;
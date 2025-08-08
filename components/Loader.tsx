import React from 'react';

const Loader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500 dark:text-slate-400">
      <div className="relative w-24 h-24">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute w-16 h-24 bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-600 rounded-lg shadow-lg"
            style={{
              animation: `card-stack 2s ease-in-out infinite`,
              animationDelay: `${i * 0.15}s`,
              transformOrigin: 'bottom center',
              zIndex: 4 - i,
            }}
          />
        ))}
      </div>
      <p className="mt-8 text-lg font-medium">{message}</p>
      <style>{`
        @keyframes card-stack {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          25% { transform: translateY(-20px) rotate(-5deg) scale(1.05); }
          50% { transform: translateY(10px) rotate(5deg) scale(0.95); opacity: 0.5; }
          75% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1;}
        }
      `}</style>
    </div>
  );
};

export default Loader;
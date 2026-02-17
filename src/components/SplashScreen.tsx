"use client";

export function SplashScreen() {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ 
        backgroundColor: 'var(--background)',
        paddingTop: 'var(--safe-area-top)',
        paddingBottom: 'var(--safe-area-bottom)',
      }}
    >
      <div 
        className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg"
        style={{ backgroundColor: '#09090b' }}
      >
        <svg width="64" height="64" viewBox="0 0 192 192" fill="none">
          <circle cx="96" cy="96" r="60" stroke="#3b82f6" strokeWidth="8" />
          <path 
            d="M70 96 L90 116 L122 76" 
            stroke="#3b82f6" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
      
      <div className="text-center">
        <h1 
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--foreground)' }}
        >
          OpenCode Anywhere
        </h1>
        <p 
          className="text-sm mt-1"
          style={{ color: 'var(--foreground-muted)' }}
        >
          Code from anywhere
        </p>
      </div>
      
      <div className="flex items-center gap-1.5 mt-2">
        <div 
          className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"
          style={{ animationDelay: '0ms' }}
        />
        <div 
          className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"
          style={{ animationDelay: '150ms' }}
        />
        <div 
          className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
}

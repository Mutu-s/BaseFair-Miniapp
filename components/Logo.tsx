import React from 'react'
import Image from 'next/image'

interface LogoProps {
  className?: string
  showText?: boolean
  size?: number
}

const Logo: React.FC<LogoProps> = ({ className = '', showText = true, size = 40 }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Base Logo - Blue Circle with "B" */}
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="20" fill="#0052FF"/>
          <path d="M20.5 8C13.6 8 8 13.6 8 20.5C8 27.4 13.6 33 20.5 33C24.4 33 27.8 31.2 30 28.4V20H21V24H25.5C24.2 26.5 21.5 28.2 18.5 28.2C14.1 28.2 10.5 24.6 10.5 20.2C10.5 15.8 14.1 12.2 18.5 12.2C21 12.2 23.2 13.3 24.7 15L28.2 11.5C25.8 9.1 22.4 7.5 18.5 7.5L20.5 8Z" fill="white"/>
        </svg>
      </div>
      {showText && (
        <span className="text-2xl font-brand font-extrabold bg-gradient-to-r from-[#0052FF] via-[#3377FF] to-[#0052FF] bg-clip-text text-transparent tracking-tight drop-shadow-lg">
          BaseFair
        </span>
      )}
    </div>
  )
}

export default Logo


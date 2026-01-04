import { globalActions } from '@/store/globalSlices'
import Link from 'next/link'
import React from 'react'
import { useDispatch } from 'react-redux'
import { FaShieldAlt, FaLock } from 'react-icons/fa'
import Image from 'next/image'

const Hero: React.FC = () => {
  const dispatch = useDispatch()
  const { setCreateModal } = globalActions

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_50%)] animate-pulse-slow"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.15),transparent_50%)] animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      <main className="relative lg:w-4/5 w-full mx-auto flex flex-col justify-center items-center text-center px-4 py-20 z-10">
        <div className="mb-12 animate-fade-in space-y-6">
          <div className="inline-block mb-4">
            <span className="px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-semibold">
              ✨ Verifiably Fair Gaming
            </span>
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-extrabold mb-4 leading-tight tracking-tight">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-[#0052FF] via-[#3377FF] to-[#0052FF] bg-clip-text text-transparent block mt-2 font-brand drop-shadow-lg">BaseFair</span>
          </h1>

          <p className="text-lg md:text-xl lg:text-2xl text-gray-100 mb-3 max-w-3xl mx-auto font-light tracking-tight leading-relaxed">
            Provable Randomness.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0052FF] to-[#3377FF] font-semibold">Transparent Fairness.</span>{' '}
            Built on Base.
          </p>
          <p className="text-sm md:text-base text-gray-300 max-w-2xl mx-auto font-medium tracking-wide">
            Every game outcome is verifiable on-chain. No trust required.
          </p>
        </div>


        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          <div className="card text-center group hover:scale-105 transition-transform duration-300">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-xl text-primary-500 border border-primary-500/20 shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-shadow">
                <FaShieldAlt size={32} />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2 text-gray-100 tracking-tight">VRF Powered</h3>
            <p className="text-xs md:text-sm text-gray-300 leading-relaxed font-medium">Verifiable randomness for fair gameplay</p>
          </div>
          
          <div className="card text-center group hover:scale-105 transition-transform duration-300">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-br from-secondary-400/20 to-secondary-500/10 rounded-xl text-secondary-400 border border-secondary-400/20 shadow-lg shadow-secondary-500/20 group-hover:shadow-secondary-500/40 transition-shadow">
                <FaLock size={32} />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2 text-gray-100 tracking-tight">Transparent</h3>
            <p className="text-xs md:text-sm text-gray-300 leading-relaxed font-medium">Fully verifiable and auditable</p>
          </div>
          
          <div className="card text-center group hover:scale-105 transition-transform duration-300">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-br from-[#0052FF]/20 to-[#0052FF]/10 rounded-xl border border-[#0052FF]/20 shadow-lg shadow-[#0052FF]/20 group-hover:shadow-[#0052FF]/40 transition-shadow flex items-center justify-center">
                {/* Base Logo */}
                <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="20" fill="#0052FF"/>
                  <path d="M20.5 8C13.6 8 8 13.6 8 20.5C8 27.4 13.6 33 20.5 33C24.4 33 27.8 31.2 30 28.4V20H21V24H25.5C24.2 26.5 21.5 28.2 18.5 28.2C14.1 28.2 10.5 24.6 10.5 20.2C10.5 15.8 14.1 12.2 18.5 12.2C21 12.2 23.2 13.3 24.7 15L28.2 11.5C25.8 9.1 22.4 7.5 18.5 7.5L20.5 8Z" fill="white"/>
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2 text-gray-100 tracking-tight">On Base</h3>
            <p className="text-xs md:text-sm text-gray-300 leading-relaxed font-medium">Fast transactions, low fees</p>
          </div>
        </div>
      </main>
    </section>
  )
}

export default Hero

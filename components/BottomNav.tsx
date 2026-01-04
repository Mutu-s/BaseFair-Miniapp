'use client'

import Link from 'next/link'
import { useRouter } from 'next/router'
import { useFrame } from '@/services/frameProvider'
import { globalActions } from '@/store/globalSlices'
import { useDispatch } from 'react-redux'

const BottomNav = () => {
  const router = useRouter()
  const { isInFrame } = useFrame()
  const dispatch = useDispatch()
  const currentPath = router.pathname

  const navItems = [
    { 
      href: '/', 
      icon: '🏠', 
      label: 'Home',
      isActive: currentPath === '/'
    },
    { 
      href: '/flip-match', 
      icon: '🎮', 
      label: 'FlipMatch',
      isActive: currentPath === '/flip-match' || currentPath.startsWith('/gameplay')
    },
    { 
      href: '#create', 
      icon: '➕', 
      label: 'Create',
      isActive: false,
      isAction: true
    },
    { 
      href: '/casino', 
      icon: '🎰', 
      label: 'Casino',
      isActive: currentPath === '/casino'
    },
    { 
      href: '/games', 
      icon: '👤', 
      label: 'My Games',
      isActive: currentPath === '/games'
    },
  ]

  const handleClick = (item: typeof navItems[0], e: React.MouseEvent) => {
    if (item.isAction) {
      e.preventDefault()
      dispatch(globalActions.setCreateModal('scale-100'))
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-xl border-t border-dark-700/50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.isAction ? '#' : item.href}
            onClick={(e) => handleClick(item, e)}
            className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all duration-200
              ${item.isAction 
                ? 'bg-gradient-to-r from-[#0052FF] to-[#0066FF] text-white scale-110 -mt-4 shadow-lg shadow-[#0052FF]/40 rounded-full w-14 h-14 !py-0'
                : item.isActive 
                  ? 'text-[#0052FF]' 
                  : 'text-gray-400 hover:text-gray-200'
              }
            `}
          >
            <span className={`text-xl ${item.isAction ? 'text-2xl' : ''}`}>{item.icon}</span>
            {!item.isAction && (
              <span className={`text-[10px] mt-0.5 font-medium ${item.isActive ? 'text-[#0052FF]' : ''}`}>
                {item.label}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  )
}

export default BottomNav


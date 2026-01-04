import type { NextApiRequest, NextApiResponse } from 'next'

interface FrameResponse {
  version: string
  image: string
  buttons?: Array<{
    label: string
    action?: 'post' | 'link' | 'mint' | 'tx'
    target?: string
  }>
  post_url?: string
  input?: {
    text?: string
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://basefair.vercel.app'

  if (req.method === 'GET') {
    // Return initial frame
    const frame: FrameResponse = {
      version: 'vNext',
      image: `${baseUrl}/images/og-image.png`,
      buttons: [
        { label: '🎮 Play Now', action: 'link', target: baseUrl },
        { label: '🎰 Casino', action: 'link', target: `${baseUrl}/casino` },
        { label: '💰 Jackpot', action: 'link', target: `${baseUrl}/jackpot` },
      ],
    }

    return res.status(200).json(frame)
  }

  if (req.method === 'POST') {
    try {
      const { untrustedData, trustedData } = req.body

      // Parse button index
      const buttonIndex = untrustedData?.buttonIndex || 1
      const fid = untrustedData?.fid

      // Handle different button actions
      let responseFrame: FrameResponse

      switch (buttonIndex) {
        case 1: // Play Now
          responseFrame = {
            version: 'vNext',
            image: `${baseUrl}/images/og-image.png`,
            buttons: [
              { label: '🎮 FlipMatch', action: 'link', target: `${baseUrl}/games` },
              { label: '🎰 Casino', action: 'link', target: `${baseUrl}/casino` },
              { label: '⬅️ Back', action: 'post' },
            ],
            post_url: `${baseUrl}/api/frame`,
          }
          break

        case 2: // Casino
          responseFrame = {
            version: 'vNext',
            image: `${baseUrl}/images/og-image.png`,
            buttons: [
              { label: '🎲 Dice', action: 'link', target: `${baseUrl}/casino/dice` },
              { label: '🪙 Coin Flip', action: 'link', target: `${baseUrl}/casino/coinflip` },
              { label: '📊 Plinko', action: 'link', target: `${baseUrl}/casino/plinko` },
              { label: '⬅️ Back', action: 'post' },
            ],
            post_url: `${baseUrl}/api/frame`,
          }
          break

        case 3: // Jackpot
          responseFrame = {
            version: 'vNext',
            image: `${baseUrl}/images/og-image.png`,
            buttons: [
              { label: '💰 Join Jackpot', action: 'link', target: `${baseUrl}/jackpot` },
              { label: '⬅️ Back', action: 'post' },
            ],
            post_url: `${baseUrl}/api/frame`,
          }
          break

        default:
          // Default/Back - return to main frame
          responseFrame = {
            version: 'vNext',
            image: `${baseUrl}/images/og-image.png`,
            buttons: [
              { label: '🎮 Play Now', action: 'link', target: baseUrl },
              { label: '🎰 Casino', action: 'link', target: `${baseUrl}/casino` },
              { label: '💰 Jackpot', action: 'link', target: `${baseUrl}/jackpot` },
            ],
          }
      }

      return res.status(200).json(responseFrame)
    } catch (error) {
      console.error('Frame error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' })
}


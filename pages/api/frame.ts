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
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://basefair.vercel.app'

  if (req.method === 'GET') {
    const frame: FrameResponse = {
      version: 'vNext',
      image: `${baseUrl}/images/og-image.png`,
      buttons: [
        { label: '🎴 Play FlipMatch', action: 'link', target: baseUrl },
        { label: '🎮 Browse Games', action: 'link', target: `${baseUrl}/active-games` },
        { label: '🏆 Leaderboard', action: 'link', target: `${baseUrl}/leaderboard` },
      ],
    }

    return res.status(200).json(frame)
  }

  if (req.method === 'POST') {
    try {
      const { untrustedData } = req.body
      const buttonIndex = untrustedData?.buttonIndex || 1

      let responseFrame: FrameResponse

      switch (buttonIndex) {
        case 1: // Play
          responseFrame = {
            version: 'vNext',
            image: `${baseUrl}/images/og-image.png`,
            buttons: [
              { label: '🤖 vs AI', action: 'link', target: baseUrl },
              { label: '👥 Multiplayer', action: 'link', target: `${baseUrl}/active-games` },
              { label: '⬅️ Back', action: 'post' },
            ],
            post_url: `${baseUrl}/api/frame`,
          }
          break

        case 2: // Browse
          responseFrame = {
            version: 'vNext',
            image: `${baseUrl}/images/og-image.png`,
            buttons: [
              { label: '🎮 Join Game', action: 'link', target: `${baseUrl}/active-games` },
              { label: '⬅️ Back', action: 'post' },
            ],
            post_url: `${baseUrl}/api/frame`,
          }
          break

        default:
          responseFrame = {
            version: 'vNext',
            image: `${baseUrl}/images/og-image.png`,
            buttons: [
              { label: '🎴 Play FlipMatch', action: 'link', target: baseUrl },
              { label: '🎮 Browse Games', action: 'link', target: `${baseUrl}/active-games` },
              { label: '🏆 Leaderboard', action: 'link', target: `${baseUrl}/leaderboard` },
            ],
          }
      }

      return res.status(200).json(responseFrame)
    } catch (error) {
      console.error('Frame error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

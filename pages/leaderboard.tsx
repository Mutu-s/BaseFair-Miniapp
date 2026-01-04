import Leaderboard from '@/components/Leaderboard'
import { NextPage } from 'next'
import Head from 'next/head'

const Page: NextPage = () => {
  return (
    <div>
      <Head>
        <title>MonFair | Leaderboard</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="py-12 px-4">
        <div className="lg:w-2/3 w-full mx-auto">
          <Leaderboard />
        </div>
      </div>
    </div>
  )
}

export default Page










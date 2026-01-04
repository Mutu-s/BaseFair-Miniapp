import Analytics from '@/components/Analytics'
import { NextPage } from 'next'
import Head from 'next/head'

const Page: NextPage = () => {
  return (
    <div>
      <Head>
        <title>MonFair | Analytics</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="py-12 px-4">
        <div className="lg:w-2/3 w-full mx-auto">
          <Analytics />
        </div>
      </div>
    </div>
  )
}

export default Page










import { paths } from '@reservoir0x/client-sdk'
import fetcher from 'lib/fetcher'
import setParams from 'lib/params'
import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import useSWRInfinite, { SWRInfiniteKeyLoader } from 'swr/infinite'

type Collections = paths['/collections/v2']['get']['responses']['200']['schema']

export default function useCommunity(
  apiBase: string | undefined,
  collectionId: string
) {
  const { ref, inView } = useInView()

  const url = new URL('/collections/v2', apiBase)

  const communities = useSWRInfinite<Collections>(
    (index, previousPageData) =>
      getKey(url, collectionId, index, previousPageData),
    fetcher,
    {
      revalidateFirstPage: false,
    }
  )

  // Fetch more data when component is visible
  useEffect(() => {
    if (inView) {
      communities.setSize(communities.size + 1)
    }
  }, [inView])

  return { communities, ref }
}

const getKey: (
  url: URL,
  collectionId: string,
  ...base: Parameters<SWRInfiniteKeyLoader>
) => ReturnType<SWRInfiniteKeyLoader> = (
  url: URL,
  collectionId: string,
  index: number,
  previousPageData: Collections
) => {
  // Reached the end
  if (previousPageData && previousPageData?.collections?.length === 0)
    return null

  let query: paths['/collections/v2']['get']['parameters']['query'] = {
    limit: 20,
    offset: index * 20,
    community: collectionId,
    sortBy: '7DayVolume',
  }

  setParams(url, query)

  return url.href
}

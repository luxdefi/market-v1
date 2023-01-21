import { paths } from '@luxmarket/sdk'
import useSWR, { SWRConfiguration } from 'swr'
import useReservoirClient from './useReservoirClient'

type AttributesResponse =
  paths['/collections/{collection}/attributes/all/v2']['get']['responses']['200']['schema']

export default function (
  collection?: string | undefined,
  swrOptions: SWRConfiguration = {}
) {
  const client = useReservoirClient()

  const pathname = `${client?.apiBase}/collections/${collection}/attributes/all/v2`

  const path = collection ? new URL(pathname) : null

  const { data, mutate, error, isValidating } = useSWR<AttributesResponse>(
    path ? [path.href, client?.apiKey, client?.version] : null,
    null,
    {
      revalidateOnMount: true,
      ...swrOptions,
    }
  )
  const collections: AttributesResponse['attributes'] | null =
    data && data.attributes ? data.attributes : null

  return { response: data, data: collections, mutate, error, isValidating }
}

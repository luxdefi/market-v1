import useAttributes from 'hooks/useAttributes'
import useCollection from 'hooks/useCollection'
import useCollectionAttributes from 'hooks/useCollectionAttributes'
import useCollectionStats from 'hooks/useCollectionStats'
import useTokens from 'hooks/useTokens'
import { Execute, paths } from '@reservoir0x/client-sdk/dist/types'
import { buyToken, buyTokenBeta } from '@reservoir0x/client-sdk/dist/actions'
import { formatBN } from 'lib/numbers'
import Head from 'next/head'
import { useRouter } from 'next/router'
import React, { ComponentProps, FC, useEffect, useState } from 'react'
import { useAccount, useConnect, useNetwork, useSigner } from 'wagmi'
import AttributeOfferModal from './AttributeOfferModal'
import AttributesFlex from './AttributesFlex'
import CollectionOfferModal from './CollectionOfferModal'
import ExploreFlex from './ExploreFlex'
import ExploreTokens from './ExploreTokens'
import Hero from './Hero'
import Sidebar from './Sidebar'
import SortMenu from './SortMenu'
import SortMenuExplore from './SortMenuExplore'
import TokensGrid from './TokensGrid'
import ViewMenu from './ViewMenu'
import * as Dialog from '@radix-ui/react-dialog'
import ModalCard from './modal/ModalCard'
import Toast from './Toast'
import { CgSpinner } from 'react-icons/cg'
import { FiRefreshCcw } from 'react-icons/fi'
import { checkWallet } from 'lib/wallet'
import FormatEth from './FormatEth'

const envBannerImage = process.env.NEXT_PUBLIC_BANNER_IMAGE

const RESERVOIR_API_BASE = process.env.NEXT_PUBLIC_RESERVOIR_API_BASE
const PROXY_API_BASE = process.env.NEXT_PUBLIC_PROXY_API_BASE

const metaTitle = process.env.NEXT_PUBLIC_META_TITLE
const metaDescription = process.env.NEXT_PUBLIC_META_DESCRIPTION
const metaImage = process.env.NEXT_PUBLIC_META_OG_IMAGE

type Props = {
  chainId: ChainId
  collectionId: string | undefined
  fallback: {
    tokens: paths['/tokens/v4']['get']['responses']['200']['schema']
    collection: paths['/collection/v1']['get']['responses']['200']['schema']
  }
  openSeaApiKey: string | undefined
  setToast: (data: ComponentProps<typeof Toast>['data']) => any
}

const TokensMain: FC<Props> = ({
  chainId,
  collectionId,
  fallback,
  openSeaApiKey,
  setToast,
}) => {
  const { data: accountData } = useAccount()
  const { connect, connectors } = useConnect()
  const { data: signer } = useSigner()
  const { activeChain } = useNetwork()
  const router = useRouter()
  const [waitingTx, setWaitingTx] = useState<boolean>(false)
  const [steps, setSteps] = useState<Execute['steps']>()
  const [open, setOpen] = useState(false)
  const [refreshLoading, setRefreshLoading] = useState(false)
  const [attribute, setAttribute] = useState<
    AttibuteModalProps['data']['attribute']
  >({
    key: undefined,
    value: undefined,
  })

  const collection = useCollection(fallback.collection, collectionId)

  const stats = useCollectionStats(router, collectionId)

  const { tokens, ref: refTokens } = useTokens(
    collectionId,
    [fallback.tokens],
    router
  )

  const { collectionAttributes, ref: refCollectionAttributes } =
    useCollectionAttributes(router, collectionId)

  const attributes = useAttributes(collectionId)

  useEffect(() => {
    const keys = Object.keys(router.query)
    const attributesSelected = keys.filter(
      (key) =>
        key.startsWith('attributes[') &&
        key.endsWith(']') &&
        router.query[key] !== ''
    )

    // Only enable the attribute modal if one attribute is selected
    if (attributesSelected.length !== 1) {
      setAttribute({
        // Extract the key from the query key: attributes[{key}]
        key: undefined,
        value: undefined,
      })
      return
    }

    setAttribute({
      // Extract the key from the query key: attributes[{key}]
      key: attributesSelected[0].slice(11, -1),
      value: router.query[attributesSelected[0]]?.toString(),
    })
  }, [router.query])

  if (tokens.error) {
    return <div>There was an error</div>
  }

  type ModalProps = ComponentProps<typeof CollectionOfferModal>

  const isOwner =
    collection.data?.collection?.floorAsk?.maker?.toLowerCase() ===
    accountData?.address?.toLowerCase()

  const floor = collection.data?.collection?.floorAsk
  const tokenCount = collection.data?.collection?.tokenCount
  const volume = collection.data?.collection?.volume?.['1day']

  const statsObj = {
    vol24: volume,
    count: tokenCount ? +tokenCount : 0,
    topOffer: collection.data?.collection?.topBid?.value,
    floor: floor?.price,
  }

  const bannerImage =
    envBannerImage || collection?.data?.collection?.metadata?.bannerImageUrl

  const header = {
    banner: bannerImage as string,
    image: collection?.data?.collection?.metadata?.imageUrl as string,
    name: collection?.data?.collection?.name,
  }

  const royalties: ModalProps['royalties'] = {
    bps: collection.data?.collection?.royalties?.bps,
    recipient: collection.data?.collection?.royalties?.recipient,
  }

  const env: ModalProps['env'] = {
    chainId: +chainId as ChainId,
    openSeaApiKey,
  }

  const isInTheWrongNetwork = Boolean(signer && activeChain?.id !== env.chainId)

  const data: ModalProps['data'] = {
    collection: {
      id: collection?.data?.collection?.id,
      // image: collection?.data?.collection?.collection?.image,
      image: '',
      name: collection?.data?.collection?.name,
      tokenCount: stats?.data?.stats?.tokenCount ?? 0,
    },
  }

  type AttibuteModalProps = ComponentProps<typeof AttributeOfferModal>

  const attributeData: AttibuteModalProps['data'] = {
    collection: {
      id: collection.data?.collection?.id,
      image: collection?.data?.collection?.metadata?.imageUrl as string,
      name: collection?.data?.collection?.name,
      tokenCount: stats?.data?.stats?.tokenCount ?? 0,
    },
    attribute,
  }

  const isAttributeModal = !!attribute.key && !!attribute.value

  const hasTokenSetId = !!collection.data?.collection?.tokenSetId

  const handleError: Parameters<typeof buyToken>[0]['handleError'] = (err) => {
    if (err?.type === 'price mismatch') {
      setToast({
        kind: 'error',
        message: 'Price was greater than expected.',
        title: 'Could not buy token',
      })
      return
    }
    if (err?.message === 'Not enough ETH balance') {
      setToast({
        kind: 'error',
        message: 'You have insufficient funds to buy this token.',
        title: 'Not enough ETH balance',
      })
      return
    }
    // Handle user rejection
    if (err?.code === 4001) {
      setOpen(false)
      setSteps(undefined)
      setToast({
        kind: 'error',
        message: 'You have canceled the transaction.',
        title: 'User canceled transaction',
      })
      return
    }
    setToast({
      kind: 'error',
      message: 'The transaction was not completed.',
      title: 'Could not buy token',
    })
  }

  const handleSuccess: Parameters<typeof buyToken>[0]['handleSuccess'] = () =>
    stats?.mutate()

  const execute = async (
    token: string,
    taker: string,
    expectedPrice: number
  ) => {
    await checkWallet(signer, setToast, connect, connectors)
    if (isOwner) {
      setToast({
        kind: 'error',
        message: 'You already own this token.',
        title: 'Failed to buy token',
      })
      return
    }

    setWaitingTx(true)

    await buyTokenBeta({
      expectedPrice,
      query: { token, taker },
      signer,
      apiBase: RESERVOIR_API_BASE,
      setState: setSteps,
      handleSuccess,
      handleError,
    })

    setWaitingTx(false)
  }

  async function refreshCollection(collectionId: string | undefined) {
    function handleError(message?: string) {
      setToast({
        kind: 'error',
        message: message || 'Request to refresh collection was rejected.',
        title: 'Refresh collection failed',
      })

      setRefreshLoading(false)
    }

    try {
      if (!collectionId) throw new Error('No collection ID')

      const data = {
        collection: collectionId,
      }

      const pathname = `${PROXY_API_BASE}/collections/refresh/v1`

      setRefreshLoading(true)

      const res = await fetch(pathname, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const json = await res.json()
        handleError(json?.message)
        return
      }

      setToast({
        kind: 'success',
        message: 'Request to refresh collection was accepted.',
        title: 'Refresh collection',
      })
    } catch (err) {
      handleError()
      console.error(err)
      return
    }

    setRefreshLoading(false)
  }

  const title = metaTitle ? (
    <title>{metaTitle}</title>
  ) : (
    <title>{collection.data?.collection?.name} | Reservoir Market</title>
  )
  const description = metaDescription ? (
    <meta name="description" content={metaDescription} />
  ) : (
    <meta
      name="description"
      content={collection.data?.collection?.metadata?.description as string}
    />
  )
  const image = metaImage ? (
    <>
      <meta name="twitter:image" content={metaImage} />
      <meta name="og:image" content={metaImage} />
    </>
  ) : (
    <>
      <meta name="twitter:image" content={header.banner} />
      <meta property="og:image" content={header.banner} />
    </>
  )

  const token = `${floor?.token?.contract}:${floor?.token?.tokenId}`
  const taker = accountData?.address

  const social = {
    twitterUsername: collection.data?.collection?.metadata?.twitterUsername,
    externalUrl: collection.data?.collection?.metadata?.externalUrl,
    discordUrl: collection.data?.collection?.metadata?.discordUrl,
  }

  const expectedPrice = statsObj.floor

  return (
    <>
      <Head>
        {title}
        {description}
        {image}
      </Head>
      <Hero social={social} stats={statsObj} header={header}>
        <div className="grid w-full gap-4 md:flex">
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger
              disabled={
                floor?.price === null || waitingTx || isInTheWrongNetwork
              }
              onClick={() =>
                token &&
                taker &&
                expectedPrice &&
                execute(token, taker, expectedPrice)
              }
              className="btn-primary-fill w-full dark:ring-primary-900 dark:focus:ring-4"
            >
              {waitingTx ? (
                <CgSpinner className="h-4 w-4 animate-spin" />
              ) : (
                `Buy for ${formatBN(floor?.price, 4)} ETH`
              )}
            </Dialog.Trigger>
            {steps && (
              <Dialog.Portal>
                <Dialog.Overlay>
                  <ModalCard
                    title="Buy token"
                    loading={waitingTx}
                    steps={steps}
                  />
                </Dialog.Overlay>
              </Dialog.Portal>
            )}
          </Dialog.Root>
          {hasTokenSetId &&
            (isAttributeModal ? (
              <AttributeOfferModal
                royalties={royalties}
                signer={signer}
                data={attributeData}
                env={env}
                stats={stats}
                tokens={tokens}
                setToast={setToast}
              />
            ) : (
              <CollectionOfferModal
                royalties={royalties}
                signer={signer}
                data={data}
                env={env}
                stats={stats}
                tokens={tokens}
                setToast={setToast}
              />
            ))}
        </div>
      </Hero>
      <div className="col-span-full grid grid-cols-4 gap-x-4 md:grid-cols-8 lg:grid-cols-12 3xl:grid-cols-16 4xl:grid-cols-21">
        <hr className="col-span-full border-gray-300 dark:border-neutral-600" />
        <Sidebar attributes={attributes} setTokensSize={tokens.setSize} />
        <div className="col-span-full mx-6 mt-4 sm:col-end-[-1] md:col-start-4">
          <div className="mb-10 hidden items-center justify-between md:flex">
            {!!stats?.data?.stats?.tokenCount &&
              stats?.data?.stats?.tokenCount > 0 && (
                <div className="flex items-center gap-6">
                  <div>{stats?.data?.stats?.tokenCount} items</div>

                  <div className="h-9 w-px bg-gray-300 dark:bg-neutral-600"></div>
                  <div>
                    <FormatEth
                      maximumFractionDigits={4}
                      amount={stats?.data?.stats?.market?.floorAsk?.price}
                    />{' '}
                    floor price
                  </div>
                </div>
              )}
            <div className="flex gap-4">
              {router.query?.attribute_key ||
              router.query?.attribute_key === '' ? (
                <>
                  <SortMenuExplore setSize={collectionAttributes.setSize} />
                  <ViewMenu />
                </>
              ) : (
                <SortMenu setSize={tokens.setSize} />
              )}
              <button
                className="btn-primary-outline dark:border-neutral-600 dark:text-white dark:ring-primary-900 dark:focus:ring-4"
                title="Refresh collection"
                disabled={refreshLoading}
                onClick={() => refreshCollection(collectionId)}
              >
                <FiRefreshCcw
                  className={`h-5 w-5 ${
                    refreshLoading ? 'animate-spin-reverse' : ''
                  }`}
                />
              </button>
            </div>
          </div>
          <AttributesFlex />
          <ExploreFlex />
          {router.query?.attribute_key || router.query?.attribute_key === '' ? (
            <ExploreTokens
              attributes={collectionAttributes}
              viewRef={refCollectionAttributes}
            />
          ) : (
            <TokensGrid
              tokenCount={statsObj.count}
              tokens={tokens}
              viewRef={refTokens}
              collectionImage={
                collection.data?.collection?.metadata?.imageUrl as string
              }
            />
          )}
        </div>
      </div>
    </>
  )
}

export default TokensMain

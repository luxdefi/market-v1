import { ComponentProps, FC } from 'react'
import ConnectWallet from './ConnectWallet'
import Link from 'next/link'
import InfoModal from './InfoModal'
import SearchCollections from './SearchCollections'
import { useRouter } from 'next/router'

type Props = {
  title: string | undefined
  image: string | undefined
  isHome: boolean
  collections: ComponentProps<typeof SearchCollections>['fallback']
}

const apiBase = process.env.NEXT_PUBLIC_API_BASE

const Navbar: FC<Props> = ({ title, image, isHome, collections }) => {
  const router = useRouter()
  return (
    <nav className="flex items-center justify-between py-3 px-3 sm:py-4">
      <Link href="/">
        {title ? (
          <a className="flex items-center justify-between gap-3">
            {image && (
              <img
                src={image}
                alt={title}
                className="hidden w-[30px] rounded-full sm:block"
              />
            )}
            {title && <span className="font-semibold">{title}</span>}
          </a>
        ) : (
          <a className="flex items-center gap-1.5">
            <img
              src="/reservoir.svg"
              alt="Reservoir Logo"
              className="h-5 w-5"
            />
            <span className="font-['Obvia'] text-lg">reservoir.market</span>
          </a>
        )}
      </Link>
      {apiBase && router.pathname !== '/' && isHome && (
        <div className="hidden lg:block">
          <SearchCollections apiBase={apiBase} fallback={collections} />
        </div>
      )}
      <div className="flex items-center gap-6">
        <InfoModal />
        <ConnectWallet />
      </div>
    </nav>
  )
}

export default Navbar

// Next Imports
import Link from 'next/link'

// Third-party Imports
import classnames from 'classnames'

type NoResultData = {
  label: string
  href: string
  icon: string
}

const noResultData: NoResultData[] = [
  {
    label: 'Pulse',
    href: '/dashboards',
    icon: 'tabler-trending-up'
  },
  {
    label: 'Spaces',
    href: '/admin/tenants',
    icon: 'tabler-building'
  },
  {
    label: 'Finanzas',
    href: '/finance',
    icon: 'tabler-chart-bar'
  }
]

const NoResult = ({ searchValue, setOpen }: { searchValue: string; setOpen: (value: boolean) => void }) => {
  return (
    <div className='flex items-center justify-center grow flex-wrap plb-14 pli-16 overflow-y-auto overflow-x-hidden bs-full'>
      <div className='flex flex-col items-center'>
        <i className='tabler-file-alert text-[64px] mbe-2.5' />
        <p className='text-lg font-medium leading-[1.55556] mbe-11'>{`Sin resultados para "${searchValue}"`}</p>
        <p className='text-[15px] leading-[1.4667] mbe-4 text-textDisabled'>Prueba buscando</p>
        <ul className='flex flex-col self-start gap-[18px]'>
          {noResultData.map((item, index) => (
            <li key={index} className='flex items-center'>
              <Link
                href={item.href}
                className='flex items-center gap-2 hover:text-primary focus-visible:text-primary focus-visible:outline-0'
                onClick={() => setOpen(false)}
              >
                <i className={classnames(item.icon, 'text-xl shrink-0')} />
                <p className='text-[15px] leading-[1.4667] truncate'>{item.label}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default NoResult

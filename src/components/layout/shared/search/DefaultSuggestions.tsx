// Next Imports
import Link from 'next/link'

// Third-party Imports
import classnames from 'classnames'

type DefaultSuggestionsType = {
  sectionLabel: string
  items: {
    label: string
    href: string
    icon?: string
  }[]
}

const defaultSuggestions: DefaultSuggestionsType[] = [
  {
    sectionLabel: 'Accesos frecuentes',
    items: [
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
        label: 'Usuarios',
        href: '/admin/users',
        icon: 'tabler-users'
      },
      {
        label: 'Equipo',
        href: '/admin/team',
        icon: 'tabler-users-group'
      }
    ]
  },
  {
    sectionLabel: 'Finanzas',
    items: [
      {
        label: 'Dashboard financiero',
        href: '/finance',
        icon: 'tabler-chart-bar'
      },
      {
        label: 'Ingresos',
        href: '/finance/income',
        icon: 'tabler-cash'
      },
      {
        label: 'Egresos',
        href: '/finance/expenses',
        icon: 'tabler-receipt'
      },
      {
        label: 'Clientes',
        href: '/finance/clients',
        icon: 'tabler-address-book'
      }
    ]
  },
  {
    sectionLabel: 'People',
    items: [
      {
        label: 'Nómina',
        href: '/hr/payroll',
        icon: 'tabler-report-money'
      },
      {
        label: 'Personas',
        href: '/hr/people',
        icon: 'tabler-user-heart'
      },
      {
        label: 'Estructura',
        href: '/hr/structure',
        icon: 'tabler-hierarchy-2'
      },
      {
        label: 'Configuración HR',
        href: '/hr/settings',
        icon: 'tabler-settings'
      }
    ]
  },
  {
    sectionLabel: 'Administración',
    items: [
      {
        label: 'Roles y permisos',
        href: '/admin/roles',
        icon: 'tabler-lock'
      },
      {
        label: 'Configuración',
        href: '/admin/settings',
        icon: 'tabler-settings'
      },
      {
        label: 'Control Tower',
        href: '/admin',
        icon: 'tabler-dashboard'
      },
      {
        label: 'Capacidad',
        href: '/admin/capacity',
        icon: 'tabler-chart-dots-3'
      }
    ]
  }
]

const DefaultSuggestions = ({ setOpen }: { setOpen: (value: boolean) => void }) => {
  return (
    <div className='flex grow flex-wrap gap-x-[48px] gap-y-8 plb-14 pli-16 overflow-y-auto overflow-x-hidden bs-full'>
      {defaultSuggestions.map((section, index) => (
        <div
          key={index}
          className='flex flex-col justify-center overflow-x-hidden gap-4 basis-full sm:basis-[calc((100%-3rem)/2)]'
        >
          <p className='text-xs leading-[1.16667] uppercase text-textDisabled tracking-[0.8px]'>
            {section.sectionLabel}
          </p>
          <ul className='flex flex-col gap-4'>
            {section.items.map((item, i) => (
              <li key={i} className='flex'>
                <Link
                  href={item.href}
                  className='flex items-center overflow-x-hidden cursor-pointer gap-2 hover:text-primary focus-visible:text-primary focus-visible:outline-0'
                  onClick={() => setOpen(false)}
                >
                  {item.icon && <i className={classnames(item.icon, 'flex text-xl shrink-0')} />}
                  <p className='text-[15px] leading-[1.4667] truncate'>{item.label}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default DefaultSuggestions

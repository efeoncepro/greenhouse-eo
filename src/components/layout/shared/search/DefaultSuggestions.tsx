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
        href: '/dashboard',
        icon: 'tabler-smart-home'
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
        label: 'Personas',
        href: '/people',
        icon: 'tabler-users-group'
      }
    ]
  },
  {
    sectionLabel: 'Finanzas',
    items: [
      {
        label: 'Resumen',
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
        label: 'Proveedores',
        href: '/finance/suppliers',
        icon: 'tabler-address-book'
      }
    ]
  },
  {
    sectionLabel: 'Equipo',
    items: [
      {
        label: 'Nómina',
        href: '/hr/payroll',
        icon: 'tabler-receipt'
      },
      {
        label: 'Departamentos',
        href: '/hr/departments',
        icon: 'tabler-sitemap'
      },
      {
        label: 'Permisos',
        href: '/hr/leave',
        icon: 'tabler-calendar-event'
      },
      {
        label: 'Asistencia',
        href: '/hr/attendance',
        icon: 'tabler-clock-check'
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
        label: 'Herramientas IA',
        href: '/admin/ai-tools',
        icon: 'tabler-robot'
      },
      {
        label: 'Home',
        href: '/home',
        icon: 'tabler-smart-home'
      },
      {
        label: 'Torre de control',
        href: '/internal/dashboard',
        icon: 'tabler-layout-dashboard'
      },
      {
        label: 'Agencia',
        href: '/agency',
        icon: 'tabler-building'
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

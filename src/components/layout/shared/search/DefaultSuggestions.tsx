// Next Imports
import Link from 'next/link'

// Third-party Imports
import classnames from 'classnames'

import { VIEW_REGISTRY } from '@/lib/admin/view-access-catalog'

type DefaultSuggestionsType = {
  sectionLabel: string
  items: {
    label: string
    href: string
    icon?: string
  }[]
}

const routeByViewCode = new Map(VIEW_REGISTRY.map(view => [view.viewCode, view]))

const buildSuggestion = (viewCode: string, icon: string) => {
  const view = routeByViewCode.get(viewCode)

  if (!view) return null

  return {
    label: view.label,
    href: view.routePath,
    icon
  }
}

const compact = <T,>(items: Array<T | null>): T[] => items.filter((item): item is T => item !== null)

const defaultSuggestions: DefaultSuggestionsType[] = [
  {
    sectionLabel: 'Accesos frecuentes',
    items: compact([
      buildSuggestion('cliente.home', 'tabler-smart-home'),
      buildSuggestion('gestion.agencia', 'tabler-building'),
      buildSuggestion('equipo.personas', 'tabler-users-group'),
      buildSuggestion('administracion.admin_center', 'tabler-layout-dashboard')
    ])
  },
  {
    sectionLabel: 'Finanzas',
    items: compact([
      buildSuggestion('finanzas.resumen', 'tabler-chart-bar'),
      buildSuggestion('finanzas.ingresos', 'tabler-cash'),
      buildSuggestion('finanzas.egresos', 'tabler-receipt'),
      buildSuggestion('finanzas.proveedores', 'tabler-address-book')
    ])
  },
  {
    sectionLabel: 'Equipo',
    items: compact([
      buildSuggestion('equipo.nomina', 'tabler-receipt'),
      buildSuggestion('equipo.jerarquia', 'tabler-hierarchy-2'),
      buildSuggestion('equipo.organigrama', 'tabler-hierarchy-3'),
      buildSuggestion('equipo.departamentos', 'tabler-sitemap'),
      buildSuggestion('equipo.permisos', 'tabler-calendar-event'),
      buildSuggestion('equipo.asistencia', 'tabler-clock-check')
    ])
  },
  {
    sectionLabel: 'Administración',
    items: compact([
      buildSuggestion('administracion.roles', 'tabler-lock'),
      buildSuggestion('ia.herramientas', 'tabler-robot'),
      buildSuggestion('administracion.vistas', 'tabler-eye-cog'),
      buildSuggestion('administracion.usuarios', 'tabler-users'),
      buildSuggestion('administracion.ops_health', 'tabler-activity')
    ])
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

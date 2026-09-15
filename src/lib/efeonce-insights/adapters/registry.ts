/**
 * TASK-1845 — registry de adapters por módulo. Cambiar/añadir un módulo se resuelve aquí:
 * el orquestador (`collect-evidence.ts`) no conoce SEO, AEO ni ICO. Un cuarto adapter (fixture
 * o módulo futuro) se registra sin editar el orquestador ni el Composer.
 */

import type { InsightModule } from '../contracts/request'
import { InsightsInputError } from '../errors'
import type { ModuleReportAdapterV1 } from './contract'

type AdapterFactory = () => Promise<ModuleReportAdapterV1>

const registry = new Map<string, AdapterFactory>()

export const registerInsightAdapter = (module: InsightModule | string, factory: AdapterFactory): void => {
  registry.set(module, factory)
}

export const unregisterInsightAdapter = (module: string): void => {
  registry.delete(module)
}

export const hasInsightAdapter = (module: string): boolean => registry.has(module)

export const resolveInsightAdapter = async (module: string): Promise<ModuleReportAdapterV1> => {
  const factory = registry.get(module)

  if (!factory) throw new InsightsInputError(`Módulo sin adapter registrado: ${module}`, { module })

  return factory()
}

export const listRegisteredInsightModules = (): string[] => [...registry.keys()].sort()

// Registro canónico (lazy: los adapters son server-only y cargan readers pesados a demanda).
registerInsightAdapter('seo', async () => (await import('./seo-adapter')).seoReportAdapter)
registerInsightAdapter('aeo', async () => (await import('./aeo-adapter')).aeoReportAdapter)
registerInsightAdapter('ico', async () => (await import('./ico-adapter')).icoReportAdapter)

'use client'

import { useAutoAnimate } from '@formkit/auto-animate/react'

/**
 * Wrapper canónico de auto-animate para listas mutables del portal.
 * Centraliza timings/easing para que TASK-643 (motion tokens) los reemplace
 * en un solo punto cuando los tokens canónicos existan.
 *
 * Uso:
 *   const [parent] = useListAnimation()
 *   return <tbody ref={parent}>{...}</tbody>
 *
 * Reduced motion: respetado nativamente por @formkit/auto-animate.
 *
 * Ver:
 * - docs/architecture/GREENHOUSE_MOTION_SYSTEM_V1.md (sección 5.4)
 * - TASK-526 (esta task)
 * - TASK-643 (tokens canónicos que esto consumirá)
 */
export const useListAnimation = () =>
  useAutoAnimate({
    // motion: TASK-643 reemplazará por motionDuration.base / motionEasing.exit cuando los tokens existan
    duration: 200,
    easing: 'ease-out'
  })

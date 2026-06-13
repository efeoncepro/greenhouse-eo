'use client'

import GreenhouseBorderBeam from './GreenhouseBorderBeam'
import type { GreenhouseBorderBeamProps } from './greenhouse-border-beam-types'

export type GreenhouseSpectrumBeamProps = Omit<GreenhouseBorderBeamProps, 'effect'>

/**
 * Effect-only primitive for the governed "rainbow border" treatment:
 * animated full-spectrum border + large blurred aura, without owning the button/card.
 */
const GreenhouseSpectrumBeam = (props: GreenhouseSpectrumBeamProps) => <GreenhouseBorderBeam {...props} effect='spectrum' />

export default GreenhouseSpectrumBeam

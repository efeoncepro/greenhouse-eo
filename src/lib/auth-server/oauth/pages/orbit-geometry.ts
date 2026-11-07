/**
 * Geometría de la órbita del panel de Efeonce ID (operador, 2026-11-02; skill `efeonce-graphic-line`).
 *
 * Es la órbita canónica, la misma de Rooms (`efeonce-rooms/src/domain/orbit-geometry.ts`): anillo fino, acento corto
 * arriba a la izquierda (50°, dentro del rango `efeonceGraphicLine.orbit.arcSweepDeg.withSphere` 40–60) con la esfera
 * en la punta, y halo de 1,86 × el radio con las paradas del token. El radio es fijo porque el panel sólo existe en
 * escritorio; la hoja de estilos importa estas constantes para animar el trazo con la misma longitud.
 *
 * Una sola órbita y una sola esfera por pantalla. Nunca mide nada: no hay dato real que medir en estas pantallas.
 */
import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

const { orbit } = efeonceGraphicLine

export const ORBIT_PANEL_RADIUS = 200
export const ORBIT_ARC_START_DEG = -160
export const ORBIT_ARC_SWEEP_DEG = 50
export const ORBIT_RING_OPACITY = orbit.ringOpacity[0]
export const ORBIT_RING_STROKE = orbit.ringStrokePx
export const ORBIT_ARC_STROKE = orbit.arcStrokePx[1]
export const ORBIT_SPHERE_RADIUS = orbit.sphereRadiusPx[1]
export const ORBIT_HALO_RADIUS = Math.round(orbit.haloRadiusRatio * ORBIT_PANEL_RADIUS)
export const ORBIT_HALO_STOPS = orbit.halo

const point = (deg: number) => {
  const rad = (deg * Math.PI) / 180

  return { x: Number((ORBIT_PANEL_RADIUS * Math.cos(rad)).toFixed(1)), y: Number((ORBIT_PANEL_RADIUS * Math.sin(rad)).toFixed(1)) }
}

export const ORBIT_ARC_FROM = point(ORBIT_ARC_START_DEG)
export const ORBIT_ARC_TO = point(ORBIT_ARC_START_DEG + ORBIT_ARC_SWEEP_DEG)
export const ORBIT_ARC_LENGTH = Number(((ORBIT_PANEL_RADIUS * ORBIT_ARC_SWEEP_DEG * Math.PI) / 180).toFixed(1))
export const ORBIT_RING_LENGTH = Number((2 * Math.PI * ORBIT_PANEL_RADIUS).toFixed(1))

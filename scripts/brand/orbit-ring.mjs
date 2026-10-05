/**
 * El anillo de la órbita de las submarcas de Efeonce (SV360, AEO, Insights, Marketing Studio, Factory): una corona
 * rellena con el corte alrededor de la esfera.
 *
 * Terminaciones (operador, 2026-10-05): el corte es un círculo CONCÉNTRICO a la esfera, de radio esfera + aire, así los
 * extremos del anillo quedan cóncavos y el aire entre anillo y esfera es parejo por dentro y por fuera, como el planeta
 * del logo de Efeonce. Antes cada generador cortaba recto (trazo con `butt`) y el aire era más ancho por fuera.
 * ADR: docs/architecture/EFEONCE_FACTORY_MARK_DECISION_V1.md.
 *
 * Coordenadas de fuente (y crece hacia arriba); los ángulos se miden desde las 12 en sentido horario, como en cada
 * generador: un punto a ángulo t es (cx + ρ·sen t, cy + ρ·cos t).
 */
const f = n => Number(n.toFixed(2))

/**
 * @param {{ cx: number, cy: number, r: number, stroke: number, a: number, sphereR: number, knock: number }} o
 *   r = radio de la línea media del anillo; a = ángulo de la esfera en radianes; knock = aire entre anillo y esfera.
 * @returns {string} el `d` de un path relleno.
 */
export function orbitRingPath({ cx, cy, r, stroke, a, sphereR, knock }) {
  const ro = r + stroke / 2
  const ri = r - stroke / 2
  const k = sphereR + knock
  // Semiángulo, visto desde el centro del anillo, donde el círculo de corte cruza el borde de radio rho.
  const half = rho => Math.acos((rho * rho + r * r - k * k) / (2 * rho * r))
  const p = (rho, t) => `${f(cx + rho * Math.sin(t))} ${f(cy + rho * Math.cos(t))}`
  const to = half(ro)
  const ti = half(ri)

  return (
    `M${p(ro, a + to)}A${f(ro)} ${f(ro)} 0 1 0 ${p(ro, a - to)}` +
    `A${k} ${k} 0 0 1 ${p(ri, a - ti)}` +
    `A${f(ri)} ${f(ri)} 0 1 1 ${p(ri, a + ti)}` +
    `A${k} ${k} 0 0 1 ${p(ro, a + to)}Z`
  )
}

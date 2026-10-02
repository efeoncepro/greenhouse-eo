// Lógica pura de `pnpm creative:assets:publish`: qué prefijos del bucket canon hay que listar y qué falta subir.
// Separada del script para poder probarla sin gcloud.
//
// Por qué existe: el publicador listaba sólo `ai-generations/**`, pero el lock de foto también sella referencias que
// vienen de un paquete npm (los Sparks, en `node_modules/@efeoncepro/axis-brand-assets/assets/sparks/`, TASK-1941).
// Esas rutas nunca aparecían en el listado remoto, así que cada corrida las daba por faltantes y `apply` las volvía a
// subir (medido el 2026-10-02: «366 declarados · 184 al día · 182 a subir» justo después de un `apply` exitoso). Se
// listan en vez de excluirse porque `assets:pull` del workbench baja del canon TODO lo que el lock declara, incluidos
// esos archivos: el canon tiene que tenerlos.

/** Primer segmento de cada ruta declarada: los prefijos del bucket que hay que listar para cubrir el lock entero. */
export const prefijosDeLock = rutas => {
  const prefijos = new Set()

  for (const ruta of rutas) {
    const limpia = String(ruta).replaceAll('\\', '/')

    if (!limpia || limpia.startsWith('/') || limpia.split('/').includes('..')) {
      throw new Error(`Ruta inválida en el lock (debe ser relativa al repo, sin «..»): ${ruta}`)
    }

    prefijos.add(limpia.split('/')[0])
  }

  return [...prefijos].sort()
}

/**
 * Compara el lock con el canon.
 * @param {{ declared: Array<[string, { sha256: string }]>, remoteHash: Map<string, string | undefined>, existe: (ruta: string) => boolean }} p
 */
export const planPublicacion = ({ declared, remoteHash, existe }) => {
  const aSubir = []
  const faltanLocal = []
  let alDia = 0

  for (const [ruta, { sha256 }] of declared) {
    if (remoteHash.get(ruta) === sha256) alDia++
    else if (!existe(ruta)) faltanLocal.push(ruta)
    else aSubir.push({ ruta, sha256 })
  }

  return { alDia, aSubir, faltanLocal }
}

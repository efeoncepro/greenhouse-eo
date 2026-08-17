/**
 * Declaración de los `.svg` importados desde paquetes de node_modules.
 *
 * POR QUÉ EXISTE (2026-08-17, CI rojo en `develop`): quien declara `*.svg` es
 * `next/image-types/global`, referenciado desde **`next-env.d.ts`** — un archivo que
 * **genera Next y que está gitignoreado**. En una máquina con `pnpm dev` corrido alguna vez
 * el archivo existe y `tsc` resuelve el import sin chistar; en CI, que hace checkout limpio y
 * corre `typecheck` ANTES de cualquier build, no existe.
 *
 * Resultado: un import de `.svg` **compila local y revienta en CI**, y el error apunta al
 * paquete importado, no a la causa. Pasó con `circle-flags/flags/*.svg` (20 errores `TS2307`).
 *
 * El patrón es DELIBERADAMENTE angosto —sólo `circle-flags`— para no chocar con el `*.svg`
 * global de Next cuando `next-env.d.ts` sí está presente: TypeScript prefiere el patrón más
 * específico, así que ambos conviven. **NUNCA** ampliar esto a `*.svg` a secas: ahí sí habría
 * declaración duplicada, y el arreglo de un entorno rompería el otro.
 */
declare module 'circle-flags/flags/*.svg' {
  const src: string

  export default src
}

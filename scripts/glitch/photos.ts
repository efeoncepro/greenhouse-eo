// El materializador de fotos de Glitch vive en `src/lib/glitch-composition/photos.ts` desde TASK-1921 (lo comparten
// `pnpm glitch:compose` y el `artifact-worker`). Este archivo lo reexporta para los scripts del taller.
export * from '../../src/lib/glitch-composition/photos'

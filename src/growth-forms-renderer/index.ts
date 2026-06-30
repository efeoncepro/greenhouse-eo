/**
 * TASK-1231 — Growth Forms portable renderer · entrypoint del bundle público.
 *
 * Define el custom element `<greenhouse-form>` al cargarse. Es el archivo que esbuild
 * bundlea a `public/growth-forms/renderer-<channel>.js` y que los wrappers de host
 * (WordPress/Astro/Greenhouse preview) enquean/importan. Framework-light: sin React,
 * Next, WordPress globals ni Astro runtime.
 */
export { GreenhouseFormElement, ELEMENT_TAG, defineGreenhouseFormElement } from './element'
export { FormRenderer } from './renderer'
export { RENDERER_VERSION, RENDERER_CONTRACT_VERSION, RENDERER_CHANNELS } from './version'
export type { RenderContract } from './contract'

import { defineGreenhouseFormElement } from './element'

defineGreenhouseFormElement()

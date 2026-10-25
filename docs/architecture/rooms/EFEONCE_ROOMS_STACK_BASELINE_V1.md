# Rooms — política de versiones y baseline técnico V1

Análisis inicial: **2026-10-07**. Refresh e implementación local: **2026-10-25**, §8. Owner: Platform; validación visual: Product/AXIS. [ADR Rooms](EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md) · [Arquitectura](EFEONCE_ROOMS_ARCHITECTURE_V1.md) · [EPIC-052 / R01](../../epics/in-progress/EPIC-052-efeonce-rooms-sales-enablement-platform.md).

**Autoridad:** el operador solicita usar las versiones más recientes de Next.js, ESLint, TypeScript, Tailwind y herramientas asociadas, y documentar el análisis de viabilidad. La política orienta la selección; la matriz es un baseline candidato fechado. Las excepciones y la convivencia de herramientas se validan en R01. La matriz inicial conserva su fecha; §8 registra la instalación y build local posteriores, sin certificar hosting.

## 1. Política de selección y actualización

Rooms selecciona **las últimas versiones estables compatibles**, con versiones exactas y actualizaciones verificadas. Su aplicación independiente permite evolucionar sin heredar el manifest, template Vuexy o configuración de Greenhouse. No se actualizan otros productos como efecto de esta decisión.

- Resolver versiones y revisar notas, advisories, engines y peer dependencies al iniciar R01 y antes de la primera instalación; esta tabla no sustituye esa comprobación futura.
- Fijar dependencias directas y package manager; conservar lockfile e instalación reproducible con `--frozen-lockfile`. No dejar `latest`, `*`, canary, beta o RC como selección flotante del proyecto.
- Evaluar el grafo transitivo y las APIs consumidas, no solo el rango permisivo del paquete superior. No usar `--force`, `--legacy-peer-deps` ni desactivar reglas/tipos para presentar como compatible una combinación sin soporte.
- Preferir Node LTS soportado por el hosting. En hosting gestionado, fijar la major admitida y registrar la versión efectiva de build/runtime; no prometer pin del patch que el proveedor administra.
- Actualizar mediante cambios revisables con instalación limpia, lint, typecheck, build y verificaciones del consumidor. Un paquete estable puede exponer funcionalidades experimentales; se evalúan aparte.
- Toda excepción temporal registra dependencia, incompatibilidad, versión retenida, owner Platform, evidencia y condición de retiro. Reabrir al resolverse el soporte upstream y antes de cada actualización del stack. No se programa ninguna automatización por este documento.

## 2. Matriz observada y candidata

Las versiones de paquetes son los `dist-tags.latest` observados en el registro npm durante el análisis. No son versiones instaladas en Rooms. En producción se revalidan tanto soporte como parches de seguridad.

| Componente | Estable observada | Uso / condición |
|---|---|---|
| Next.js | `16.4.0` | App Router/Turbopack; publicada el 06/10. `eslint-config-next` observado también `16.4.0`; mantener alineación si se adopta |
| React / React DOM | `19.3.0` / `19.3.0` | Versiones alineadas, admitidas por peers de Next; falta prueba con componentes Rooms/AXIS |
| TypeScript | `7.0.2` | Objetivo para typecheck; convivencia con API TS6 descrita abajo |
| ESLint | `10.12.0` | Objetivo; plugins transitivos del preset Next requieren resolver compatibilidad |
| typescript-eslint | `8.71.1` | Admite ESLint 10; peer TypeScript `>=4.8.4 <6.1.0` |
| Tailwind CSS / `@tailwindcss/postcss` | `4.3.3` / `4.3.3` | Adapter del design system La órbita, conservando versiones alineadas |
| PostCSS | `8.5.29` | Candidato del pipeline CSS; verificar grafo resuelto |
| pnpm | `12.10.1` | Candidato de package manager propio; validar CI/hosting y acceso privado a AXIS |
| Node.js | `24.x` LTS como base propuesta | Vercel consultado ofrece 24.x/22.x/20.x; Node 26 era Current y no figuraba en ese listado |
| Motion | `14.0.0` | Candidato cuando la interacción lo requiere; peers React/React DOM incluyen 19 |
| Sharp | `0.35.5` | Candidato del worker; engine Node `>=20.9.0`, binario/plataforma por comprobar |

No se deriva una versión de PostgreSQL, FFmpeg o infraestructura a partir de la palabra «último». Hosting, soporte, imagen del worker y consumo de medios se concretan con sus propias pruebas y presupuesto en R01/R05.

## 3. TypeScript 7 y tooling que necesita TS6

TypeScript 7 es el compilador nativo estable; aún no proporciona la API JavaScript que consume `typescript-eslint`. El rango del parser confirma que sustituir directamente toda dependencia `typescript` por 7 no acredita lint compatible.

Microsoft documenta convivencia mediante aliases: `typescript` apunta a `@typescript/typescript6`, y otro alias apunta al compilador 7. Candidatos exactos de ese patrón:

```json
{
  "devDependencies": {
    "@typescript/native": "npm:typescript@7.0.2",
    "typescript": "npm:@typescript/typescript6@6.0.2"
  }
}
```

Este fragmento explica la ruta a validar, no es un manifest aprobado. `tsc` debe resolver al compilador 7 y las herramientas que importan la API al paquete de compatibilidad 6; comprobar resolución efectiva, versiones, editor, lint y CI. El lockfile debe fijar también las dependencias del wrapper.

El tarball publicado de Next `16.4.0` inspeccionado incluye `experimental.useTypeScriptCli`, junto al camino que resuelve la API JavaScript. Que exista ese camino no prueba su comportamiento en Rooms ni vuelve estable el flag. R01 debe elegir y registrar cómo se comprueban tipos durante `next build` y en el gate independiente de TS7. La convivencia puede conservar TS6 para integraciones; no afirmar que todo el build usa TS7 sin evidencia. No usar `ignoreBuildErrors` como resolución del problema.

Retiro propuesto de la convivencia: API/soporte upstream compatibles, peers actualizados y mismo conjunto de pruebas aprobado sin TS6. No se presupone una fecha de TypeScript 7.1.

## 4. ESLint 10 y preset Next

`eslint-config-next@16.4.0` declara ESLint `>=9.0.0`, pero incorpora dependencias con límites más estrechos. Manifests estables observados:

| Plugin | Versión | Soporte declarado relevante |
|---|---|---|
| `eslint-plugin-react` | `7.37.5` | Rango termina en `^9.7`; no declara ESLint 10 |
| `eslint-plugin-import` | `2.32.0` | Rango llega a `^9`; no declara ESLint 10 |
| `eslint-plugin-jsx-a11y` | `6.10.2` | Rango llega a `^9`; no declara ESLint 10 |
| `eslint-plugin-react-hooks` | `7.1.1` | Incluye `^10.0.0` |

Es una incompatibilidad declarada del conjunto; no se ejecutó una instalación ni se observó un crash en Rooms. El rango abierto del preset no invalida los peers de sus plugins.

**Ruta preferida a investigar en R01:** ESLint 10 con flat config y plugins compatibles, conservando cobertura de Next, React, hooks, imports, accesibilidad JSX y reglas con tipos. Toda sustitución exige comparar reglas y demostrar casos que deben fallar; quitar un plugin no resuelve por sí solo la calidad.

**Fallback propuesto si esa combinación no pasa:** ESLint `9.39.5` de la línea maintenance, retenido de forma explícita y temporal. No está instalado ni aceptado como pin definitivo. Owner Platform; retirar cuando los plugins necesarios soporten 10 o una configuración equivalente y soportada supere el gate. Mantener lint como paso independiente del build.

## 5. AXIS, La órbita y navegadores

La identidad sigue siendo La órbita: Bricolage editorial/Poppins funcional, tokens y componentes distribuidos por AXIS. Tailwind traduce los roles del sistema; actualizar CSS/tooling no cambia la marca ni recolorea piezas cliente.

Los manifests locales inspeccionados de `axis-graphic-line` y `axis-ui-primitives` aceptaban React `>=18`; primitives también React DOM `>=18`. Su devDependency TypeScript 5.9 pertenece a la construcción del paquete y no constituye, por sí sola, una restricción al compilador del consumidor. Esto acredita ausencia de un bloqueo declarado, no compatibilidad ejecutada ni publicación de cada versión local. R01 verifica paquetes privados publicados, exports, declaraciones, React/SSR/hidratación y CSS realmente usados.

Tailwind v4 exige navegadores modernos: la documentación consultada indica Chrome 111, Safari 16.4 y Firefox 128 como base. Funcionalidades CSS más nuevas pueden exigir fallback adicional. La validación de Rooms debe incluir los navegadores corporativos/móviles objetivo, medios, foco, reduced motion y transiciones; una API reciente no se vuelve obligatoria sin verificar soporte.

## 6. Gate de foundation y estado real

R01 debe producir manifest/lockfile revisados, decisión TS7/TS6, configuración ESLint y registro de excepciones. La aceptación exige:

1. Instalación limpia reproducible, sin peers incompatibles ocultados; comprobación de binarios, versiones y acceso a paquetes privados.
2. Lint con cobertura y casos negativos; typecheck sobre código y tipos generados de Next; ambos bloquean fallos reales.
3. Build de producción y arranque; ninguna supresión de errores que convierta un fallo en verde.
4. Primera pantalla real con AXIS/La órbita: fuentes, tokens, SSR/hidratación e interacción; R02 completa aceptación visual.
5. Smoke de API, acceso privado, separación server/client y cache por autoridad; multimedia/presentación se certifican en las unidades dueñas.
6. Configuración de CI/hosting y versión efectiva de Node verificadas al habilitar esos entornos; dependencia de development o éxito local no equivale a despliegue.

**Estado histórico al 07/10:** investigación de documentación, metadatos npm, manifests locales y código publicado de Next. Sin instalación conjunta, pruebas ejecutadas del stack, cambios de dependencias, repo Rooms nuevo o despliegue. Los manuales operativos se elaboran con el runtime; este documento conserva la decisión técnica y su procedimiento de validación previo.

## 7. Fuentes y trazabilidad del análisis

Consulta del 07/10/2026; refrescar al implementar:

- [Next 16.4 y React 19.3](https://nextjs.org/blog/next-16-4); [manifest Next 16.4.0](https://registry.npmjs.org/next/16.4.0), cuyo tarball se inspeccionó en memoria (`dist/server/config-shared.d.ts` y `dist/lib/verify-typescript-setup.js`); [cambio upstream del backend CLI](https://github.com/vercel/next.js/pull/95639).
- [TypeScript 7 y convivencia oficial](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0); [soporte typescript-eslint](https://typescript-eslint.io/users/dependency-versions/); [manifest 8.71.1](https://registry.npmjs.org/typescript-eslint/8.71.1).
- [ESLint releases](https://eslint.org/blog/), [migración v10](https://eslint.org/docs/latest/use/migrate-to-10.0.0), [preset Next 16.4.0](https://registry.npmjs.org/eslint-config-next/16.4.0); manifests de [React](https://registry.npmjs.org/eslint-plugin-react/7.37.5), [imports](https://registry.npmjs.org/eslint-plugin-import/2.32.0), [JSX a11y](https://registry.npmjs.org/eslint-plugin-jsx-a11y/6.10.2) y [hooks](https://registry.npmjs.org/eslint-plugin-react-hooks/7.1.1).
- [Tailwind releases](https://tailwindcss.com/blog), [compatibilidad](https://tailwindcss.com/docs/compatibility), [Tailwind 4.3.3](https://registry.npmjs.org/tailwindcss/4.3.3), [adapter 4.3.3](https://registry.npmjs.org/@tailwindcss/postcss/4.3.3), [PostCSS 8.5.29](https://registry.npmjs.org/postcss/8.5.29), [pnpm 12.10.1](https://registry.npmjs.org/pnpm/12.10.1).
- [Node releases](https://nodejs.org/en/blog/release), [Node admitido por Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Motion 14.0.0](https://registry.npmjs.org/motion/14.0.0), [Sharp 0.35.5](https://registry.npmjs.org/sharp/0.35.5).
- Inspección local de `../axis-design-system/packages/{graphic-line,primitives,tokens,contracts,registry,brand-assets}/package.json`; [contrato de consumo privado](../../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md).


## 8. Consumidor ejecutado 2026-10-25 — TASK-2058/2059

Pins efectivos de `efeonce-rooms/package.json` y lockfile:

| Componente | Pin ejecutado |
|---|---|
| Next / eslint-config-next | 16.4.3 |
| React / React DOM | 19.3.1 |
| Typecheck nativo | @typescript/native alias npm:typescript@7.0.2; tsc7.0.2 verificado |
| API de TypeScript | typescript alias npm:@typescript/typescript6@6.0.2; binario efectivo6.0.3 fijado transitivamente |
| ESLint / typescript-eslint | 9.39.5 / 8.72.0 |
| Tailwind / plugin PostCSS | 4.3.3 / 4.3.3 |
| PostCSS | 8.5.31 |
| pnpm / Node local | 12.15.0 / 24.17.0; engine24.x |
| AXIS tokens / primitives / brand-assets | 0.6.10 / 0.7.15 / 0.4.30 |
| Playwright / axe | 1.64.1 / 4.14.0 |

Se adopta el fallback ESLint9 de §4: ESLint10.13.0 observado, pero react/import/jsx-a11y todavía limitan sus peers a9. Se conserva el preset Next completo, reglas con tipos y gate `--max-warnings=0`. Casos negativos demuestran detección de imagen sin alt, hook condicional y promise flotante. Owner Platform; retirar9 al verificar soporte upstream con los mismos gates, no mediante force ni apagado de plugins.

TS7 hace typecheck independiente después de `next typegen`; Next build y typescript-eslint conservan la API TS6. Sin `ignoreBuildErrors` ni flag experimental. El wrapper6.0.2 resuelve versión efectiva6.0.3: no confundir la versión del wrapper con la del compilador.

Primera instalación limpia379 paquetes, peers estrictos, luego `pnpm install --frozen-lockfile` exitoso. AXIS se descarga del registry privado, no se enlaza al repo hermano; esbuild/unrs-resolver tienen scripts de build explícitamente permitidos. Logo: copias exactas con SHA256 desde brand-assets. Las dependencias históricas de graphic-line permanecen fijadas por su propio paquete, sin override arbitrario.

Lint, negativo, tipos, tests y build local verificados; evidencia visual y matriz de navegador en [auditoría](../../audits/rooms/2026-10-25-first-local-delivery.md). No hay CI, deployment ni certificación de todos los navegadores por este resultado. [Manual reproducible](../../manual-de-uso/rooms/operar-primera-experiencia-local.md).

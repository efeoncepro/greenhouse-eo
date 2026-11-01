# HubSpot Solutions Partner · badges reutilizables

Estas tres variantes son los SVG oficiales entregados por el operador para la
identidad de Efeonce como HubSpot Solutions Partner. Se conservan sin
recolorear, recortar ni redibujar.

Cada variante se llama por el color de **su propia placa**, no por el fondo donde va. Se elige la que
**contrasta con la superficie**: una placa crema sobre papel claro se disuelve (corrección del operador,
2026-10-31, landing de Contacto).

| Superficie | Variante | Asset |
|---|---|---|
| Clara (blanco, papel `#f7f8f6`, crema) | `dark` (placa verde petróleo); `orange` si la pieza pide acento | `badge-dark-spp-hubspot.svg` |
| Oscura (navy, `#001a33`, fotografía oscura) | `light` (placa crema); `orange` si la pieza pide acento | `badge-light-spp-hubspot.svg` |
| Naranja o de acento cálido | `dark` o `light` según luminancia; **nunca** `orange` | — |

`getHubSpotSolutionPartnerBadgeForSurface(surface)` en `src/lib/brand-assets/hubspot-solution-partner.ts`
resuelve esta tabla; úsala en vez de elegir a ojo. `@efeoncepro/axis-brand-assets` publica hoy sólo la
variante crema (`hubspot-solutions-partner-gold-light`): sirve para superficies oscuras, no para papel.

## Contrato de uso

- Mantén la proporción original `431.07 × 428.92`.
- No deformes, recortes ni superpongas texto dentro del badge.
- Elige la variante por contraste de superficie; no uses `dark` sobre una
  superficie verde petróleo ni `orange` sobre un fondo naranja.
- En documentos y PDFs, conserva el SVG original cuando el renderer lo
  soporte. Si el renderer exige raster, deriva un PNG desde este SVG sin
  editar el artwork.
- El nombre fuente original de la variante naranja contiene el typo
  `badge-oragnge-spp-hubspot.svg`; el asset reutilizable se normaliza a
  `badge-orange-spp-hubspot.svg`.

## Procedencia

Fuente suministrada por el operador el 2026-08-11 desde la carpeta de branding
de Efeonce Group:

`OneDrive-EfeonceGroupSpA/Workspace/Efeonce Group/Branding/SVG/`

SHA-256 de los archivos normalizados:

- `dark`: `70b16ca540cda9a72c1ad3347f03a642754a24d21d43c4818c869fe22beb3e10`
- `light`: `9a2edbe399bb81639061161fb4611586c0949bcb7926dcd557645a00c1844382`
- `orange`: `670c46bafc6fccf693ff7277dceb98754e289d88237646fca93cca0458ce7fd1`

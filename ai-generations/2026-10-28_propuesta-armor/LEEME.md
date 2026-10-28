
## Contraportada en línea Voice — 28/10/2026

- No hay contraportada canónica de Voice. El patrón aprobado por línea es BR3h (HubSpot, Assetplan 20/10): la misma
  escena de BR3 con el anillo fino y el arco corto + esfera en el acento de la línea. Recolorear BR3 ya fue rechazado
  allí y volvió a rechazarse acá (primer intento del 28/10, «se nota forzado»).
- `fichas/BR3v.json` = BR3h con el acento Voice (#F83902) → `plates/BR3v.png` (Sunburst high, ≈ USD 0,04 + entrada).
  El bordado de la espalda salió con el isotipo oficial (nave, órbita, esfera, tres ventanas): se publica tal cual.
- Compuesta con `pnpm brand:compose` (`intents/33-contraportada.json`, línea `voice`) en `out/33-contraportada-v2/`.
- Falta: revisión con `cine-reviewer` y aprobación de Julio.

## Contraportada Voice v3 (2026-10-28, tarde)

- Indicación de la sesión de línea gráfica: conservar BR3v, borrar el isotipo suelto de la espalda y componer el logotipo oficial. No recolorear.
- `plates/BR3v-sin-isotipo.png` (ai:inpaint erase) → `pnpm foto:isotipo --marca logotipo --acabado` → `plates/BR3v-sin-isotipo-isotipo-acabado.png` (0 px fuera de la marca; hoja `-comparar.png`).
- `intents/33-contraportada.json` apunta a ese plate; `pnpm brand:compose` → `out/33-contraportada-v3/`.
- Publicada en el canvas de la propuesta (v123, blob f7c54bf9…). Pendiente: la aprobación de Julio; después, avisar a la sesión de línea gráfica para que registre la receta close-proposal Voice.

#!/bin/bash
# Arma el deck de Intermedica: nativas + recetas + láminas reutilizadas aprobadas. Uso: bash build-deck.sh [montos|cliente]
set -e
cd "$(dirname "$0")"
MODE=${1:-cliente}
R=/Users/jreye/Documents/greenhouse-eo/ai-generations
if [ "$MODE" = "montos" ]; then H=native/html-montos; L=laminas-montos; DK=deck-montos; MONTOS=1 node native/propuesta.mjs $H >/dev/null; else H=native/html; L=laminas; DK=deck; node native/propuesta.mjs $H >/dev/null; fi
node native/shot-all.cjs $H $L >/dev/null
rm -rf $DK; mkdir -p $DK
cp out/01-portada/01-deck-cover-proposal.png $DK/01-portada.png
for n in 02-encargo 03-quienes 04-presencia 05-comunicacion 06-oportunidades 07-recorrido 08-equipo 09-ritmo 10-portafolio 11-nucleo; do cp $L/$n.png $DK/$n.png; done
cp $R/2026-10-13_brochure-agencia-medios/laminas/M-medicion.png $DK/12-medicion.png
cp $L/13-recomendado.png $DK/13-recomendado.png
cp $L/14-expansion.png $DK/14-expansion.png
cp $R/2026-10-13_brochure-agencia-medios/laminas/P3-senal.png $DK/15-senal.png
cp out/16-plan/01-deck-decision-plan.png $DK/16-plan.png
for n in 17-tarifa 18-total 19-technogym; do cp $L/$n.png $DK/$n.png; done
cp $R/2026-10-12_brochure-efeonce-360/entrega-casos/caso-sky-p34.png $DK/20-caso-sky.png
cp $R/2026-10-12_brochure-efeonce-360/entrega-casos/caso-berel-p20.png $DK/21-caso-berel.png
cp $R/2026-10-13_brochure-agencia-medios/laminas/X5-partners.png $DK/22-partners.png
cp $L/23-pasos.png $DK/23-pasos.png
cp out/24-contraportada/01-deck-close-proposal.png $DK/24-contraportada.png
ls $DK | wc -l

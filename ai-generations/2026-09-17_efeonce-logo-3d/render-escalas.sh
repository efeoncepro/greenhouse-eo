#!/bin/zsh
# Rinde las cuatro escalas del kit en navy y arma el kit recortado + hoja de revisión de cada una.
COLOR=${1:-navy}
S=/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/d994b408-e939-4b1c-91f7-b836c46abbfb/scratchpad
for e in monumental grande mediana pequena; do
  blender -b --factory-startup --python blender/render_logo.py -- blender/$e-$COLOR.json render/$e-$COLOR > render-$e-$COLOR.log 2>&1
  node blender/postproceso.mjs render/$e-$COLOR kit/$e-$COLOR $S/logo-$e-$COLOR-kit.png
done
echo escalas-listas

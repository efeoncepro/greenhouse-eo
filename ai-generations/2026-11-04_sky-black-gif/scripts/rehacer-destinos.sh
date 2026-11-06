#!/bin/bash
# Rehace desde cero las piezas con foto de destino y las variantes de texto (variantes → rutas → destinos → render → parts → compose).
set -e
cd "$(dirname "$0")"
node variantes.cjs > /dev/null
node rutas.cjs > /dev/null
node destinos.cjs > /dev/null
# Variantes y rutas: textos cambiados por el pedido; se aplica la regla destino ↔ flecha de precio (brecha.cjs).
L=$(ls "src2/KV X HM" | grep -E "HM_PE_RUTA_|HM_PE_KV_DOM_REGIONES|HM_PE_KV_ENCUENTRA|HM_AR_KV_SANTIAGO|HM_AR_KV_LIMA|HM_BR_KV_SANTIAGO|HM_BR_KV_PERU" | tr '\n' ' ')
node brecha.cjs $L
node render.cjs $L > /dev/null 2>&1
node parts.cjs $L > /dev/null 2>&1
node compose.cjs ${L//.svg/} > /dev/null
echo "rehechas: $(echo $L | wc -w)"

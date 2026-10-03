#!/bin/sh
cd /Users/jreye/Documents/greenhouse-eo
E=ai-generations/2026-10-02_elenco-efeonce; J=$E/julio-edad-ab; R=ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas; I=$E/realismo-v3/isabella
g(){ pnpm -s ai:image "$@" --model gpt-image-2.5-sunburst; }
for v in a b; do
  g --image $R/julio-ap-04.png --image $R/julio-ap-08.png --image $R/julio-ap-11.png --prompt-file $J/prompt-A.txt --quality high --size 1152x1440 --out $J/julio-A-$v.png > $J/log-A-$v.txt 2>&1 &
  g --image $R/julio-ap-04.png --image $R/julio-ap-08.png --image $R/julio-ap-11.png --prompt-file $J/prompt-B.txt --quality high --size 1152x1440 --out $J/julio-B-$v.png > $J/log-B-$v.txt 2>&1 &
done
g --image $E/realismo-v3/antonio/antonio-elegida-v3.png --prompt-file $E/realismo-v3/ancla-hd-v2.txt --quality high --size 2048x2560 --out $E/realismo-v3/antonio/antonio-ancla-hd-v2.png > $E/realismo-v3/antonio/ancla-hd-v2.log 2>&1 &
wait
for f in elegida-v3:1024x1280 frente-v3:1024x1024 45-izq-v3:1024x1024 45-der-v3:1024x1024 perfil-izq-v3:1024x1024 perfil-der-v3:1024x1024 cuerpo-v4:1024x1536; do
  n=${f%%:*}; s=${f##*:}
  g --image $I/isabella-$n.png --prompt-file $E/realismo-v3/pecas.txt --quality high --size $s --out $I/isabella-$n-pecas.png > $I/pecas-$n.log 2>&1 &
done
wait
g --image $I/isabella-elegida-v3-pecas.png --prompt-file $E/realismo-v3/ancla-hd-v2.txt --quality high --size 2048x2560 --out $I/isabella-ancla-hd-v2.png > $I/ancla-hd-v2.log 2>&1
ls $J/*.png $I/*pecas.png $I/*hd-v2.png $E/realismo-v3/antonio/*hd-v2.png

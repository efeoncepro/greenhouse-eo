cd /Users/jreye/Documents/greenhouse-eo; G=ai-generations/2026-11-05_sky-blog-lote; F=$G/portadas/fix; E=$G/escenas
gen(){ r=$4; img=""; [ -f "$r" ] && img="--image $r"; gtimeout 900 pnpm -s ai:image --openai-key personal --prompt-file $1 $img --model gpt-image-2.5-sunburst --quality max --size 3840x2160 --format png --timeout 600000 --out $2 >> $F/run4.log 2>&1; echo "$3 exit=$?" >> $F/run4.log; }
gen $F/candelaria-img1.txt $F/candelaria-a.png candelaria-a $G/portadas/refs/candelaria-ref01-wm-2400.jpg &
gen $F/punta-cana-img1.txt $F/punta-cana-a.png punta-cana-a $G/portadas/refs/punta-cana-ref01-ss1249657690-2400.jpg &
wait
gen $F/candelaria-img1.txt $F/candelaria-b.png candelaria-b $G/portadas/refs/candelaria-ref01-wm-2400.jpg &
gen $F/punta-cana-img1.txt $F/punta-cana-b.png punta-cana-b $G/portadas/refs/punta-cana-ref01-ss1249657690-2400.jpg &
wait
gen $E/prompts/carnaval-cajamarca-img3-fix.txt $E/maestros/carnaval-cajamarca-img3-fix-maestro.png carnaval3 $E/refs/carnaval-cajamarca-img3-ref.jpg &
gen $E/prompts/candelaria-img2-fix.txt $E/maestros/candelaria-img2-fix-maestro.png candelaria2 $E/refs/candelaria-img2-ref.jpg &
wait
echo done >> $F/run4.log

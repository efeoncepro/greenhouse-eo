cd /Users/jreye/Documents/greenhouse-eo; G=ai-generations/2026-11-05_sky-blog-lote/portadas
for id in cena-peruana retablo; do for v in a b; do
  r=$G/refs/$id-ref01-wm-2400.jpg; img=""; [ -f "$r" ] && img="--image $r"
  gtimeout 900 pnpm -s ai:image --openai-key personal --prompt-file $G/fix/$id-img1.txt $img --model gpt-image-2.5-sunburst --quality max --size 3840x2160 --format png --timeout 600000 --out $G/fix/$id-$v.png >> $G/fix/run.log 2>&1; echo "$id-$v exit=$?" >> $G/fix/run.log
done; done

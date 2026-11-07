cd /Users/jreye/Documents/greenhouse-eo; G=ai-generations/2026-11-05_sky-blog-lote; F=$G/portadas/fix; E=$G/escenas; P=/Users/jreye/Documents/creative-workbench/projects/sky/blog-lote-2026-11/salidas
OPENAI_API_KEY_PROFILE=personal gtimeout 900 pnpm -s ai:inpaint image --image $P/tacna/img1-maestro.png --mask $F/tacna-mask.png --adapter openai --model gpt-image-2.5-flare --quality high --run $F/tacna --max-usd 1 --yes --prompt "the same man walking away on the stone plaza: his lower legs and his walking shoes complete and standing on the paving, natural leg length, with a soft short shadow under the shoes; same light" >> $F/run3.log 2>&1
OPENAI_API_KEY_PROFILE=personal gtimeout 900 pnpm -s ai:inpaint image --image $P/iquitos/img1-maestro.png --mask $F/iquitos-mask.png --adapter openai --model gpt-image-2.5-flare --quality high --run $F/iquitos --max-usd 1 --yes --prompt "the same calm brown Amazon river water and the same green riverbank, open water with nothing on it in this area; same light" >> $F/run3.log 2>&1
for id in alpaca-img2 cajamarca-img2; do
  r=$E/refs/$id-ref.jpg; img=""; [ -f "$r" ] && img="--image $r"
  gtimeout 900 pnpm -s ai:image --openai-key personal --prompt-file $E/prompts/$id-fix.txt $img --model gpt-image-2.5-sunburst --quality max --size 3840x2160 --format png --timeout 600000 --out $E/maestros/$id-fix-maestro.png >> $F/run3.log 2>&1; echo "$id exit=$?" >> $F/run3.log
done
echo done >> $F/run3.log

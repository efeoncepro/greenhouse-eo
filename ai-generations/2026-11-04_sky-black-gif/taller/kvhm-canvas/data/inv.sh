D=/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-04_sky-black-gif
echo "# Entregables medidos ($D)"
cd "$D"
find . -type f -not -path './scripts/*' -not -name .DS_Store | sort | while read f; do
  case "$f" in
    *.png|*.jpg) wh=$(sips -g pixelWidth -g pixelHeight "$f" 2>/dev/null | awk '/pixel/{print $2}' | paste -sd x -); echo "$f | $wh | $(stat -f %z "$f")B";;
    *.gif|*.mp4) i=$(ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames -show_entries format=duration -of csv=p=0 "$f" | paste -sd ';' -); echo "$f | $i | $(stat -f %z "$f")B";;
    *) echo "$f | otro";;
  esac
done

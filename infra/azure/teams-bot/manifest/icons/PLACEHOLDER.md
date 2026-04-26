# Placeholders for the Greenhouse Teams app icons

Microsoft requires two PNGs (transparent background) in the manifest zip:

| File              | Size     | Background  | Notes                              |
| ----------------- | -------- | ----------- | ---------------------------------- |
| `icon_color.png`  | 192×192  | Transparent | Full-color logo. Used everywhere.  |
| `icon_outline.png`| 32×32    | Transparent | White outline only on transparent. |

The definitive logo will be provided by design (Open Question on the task).

Until then, generate placeholders with:

```bash
# 192x192 PNG with the green chip
magick -size 192x192 xc:transparent -fill '#00B07F' -draw 'circle 96,96 96,16' \
  -fill white -font 'Helvetica-Bold' -pointsize 92 -gravity center -annotate 0 'G' \
  infra/azure/teams-bot/manifest/icons/icon_color.png

# 32x32 outline
magick -size 32x32 xc:transparent -stroke white -strokewidth 2 -fill none \
  -draw 'circle 16,16 16,2' \
  infra/azure/teams-bot/manifest/icons/icon_outline.png
```

Validate the manifest before uploading:
<https://dev.teams.microsoft.com/appvalidation.html>

#!/usr/bin/env bash
#
# Regenerates every launcher icon, the splash art and the store graphics from
# the two source images in `brand/`.
#
#   ./scripts/build-brand.sh
#
# Committed outputs, generated inputs — the same bargain as the sticker
# catalogue. Nobody needs ImageMagick to build the app; you only need it to
# change the artwork, and then this script is the record of *how* the icons
# were made rather than a folder of files nobody dares regenerate.
#
# Needs ImageMagick 7. On nix that is `nix run nixpkgs#imagemagick --`, which
# is what MAGICK defaults to; set it to `magick` if you have it installed.
set -euo pipefail

cd "$(dirname "$0")/.."

MAGICK="${MAGICK:-nix run nixpkgs#imagemagick -- }"

# The one true ground, from `colors.background` in src/ui/theme.ts. The source
# JPEGs sit on approximately this, but only approximately — so the rook is cut
# out and re-composited onto the exact value rather than trusting the render.
PLUM='#221A26'

# The store listing's wordmark and strap. Store copy, so it lives here and not
# in `src/ui/strings.ts` — nothing in the app ever renders either of these.
#
# The strap describes the *method* rather than the audience: six worlds about a
# piece and then six about an idea is genuinely what the catalogue is, and it
# tells a parent this is not a whole game thrown at a child.
WORDMARK='Rooky'
STRAPLINE='Chess, one piece at a time'

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# --- the rook, cut off its background ---------------------------------------
#
# Flood-filled in from all four corners rather than keyed on one colour, so a
# plum-ish pixel *inside* the piece survives. This drops the source's drop
# shadow, which is wanted: a shadow baked into a launcher icon fights whatever
# the launcher draws behind it, and the carving has enough shading of its own.
$MAGICK brand/rook-source.jpg \
  -alpha set -channel RGBA -fuzz 14% \
  -fill none -floodfill +0+0 'srgb(38,28,37)' \
  -fill none -floodfill +2047+0 'srgb(38,28,37)' \
  -fill none -floodfill +0+2047 'srgb(39,29,38)' \
  -fill none -floodfill +2047+2047 'srgb(40,28,38)' \
  +channel "$WORK/cut.png"

# JPEG noise leaves a scatter of stray pixels the flood fill cannot reach, so
# the crop box comes from an opened mask rather than from `-trim`, which would
# otherwise honour a single speck in a corner and crop nothing at all.
BOX=$($MAGICK "$WORK/cut.png" -alpha extract -threshold 50% \
  -morphology Open Disk:3 -format '%@' info:)
$MAGICK "$WORK/cut.png" -crop "$BOX" +repage "$WORK/rook.png"

# --- helpers ----------------------------------------------------------------
#
# The rook is about twice as tall as it is wide, so everything is sized by
# *height*: fitting it to a square by width would leave it tiny.

# Everything the app bundles is quantised to 128 colours. The art is flat
# vector with a handful of soft shading steps, so there is no visible
# difference at 1:1 — and full-colour PNG is badly suited to it: the splash
# alone was 1.7 MB and comes out at 125 kB, on a bundle of about 6 MB.
#
# Store art is left alone: it is never bundled, and Play re-encodes it anyway.
QUANT=(-colors 128 -strip -define png:compression-level=9)

# on_plum <height%> <size> <out>  — rook centred on the brand ground
on_plum() {
  $MAGICK -size "${2}x${2}" "xc:$PLUM" \
    \( "$WORK/rook.png" -resize "x$(( $2 * $1 / 100 ))" \) \
    -gravity center -composite "${QUANT[@]}" "$3"
}

# transparent <height%> <size> <out>  — rook alone, for a layer that composites
transparent() {
  $MAGICK -size "${2}x${2}" xc:none \
    \( "$WORK/rook.png" -resize "x$(( $2 * $1 / 100 ))" \) \
    -gravity center -composite "${QUANT[@]}" "$3"
}

# --- what the app ships -----------------------------------------------------

# iOS and the Play listing want the icon complete, ground and all.
on_plum 66 1024 assets/icon.png

# Android draws the two layers itself. The foreground is held to 58% because a
# launcher may mask the canvas down to its inner ~66% and apply parallax on top
# — anything larger risks losing the crenellations, which are the whole shape.
transparent 58 512 assets/android-icon-foreground.png
$MAGICK -size 512x512 "xc:$PLUM" -strip assets/android-icon-background.png

# Themed icons: a solid white silhouette on transparent, which Android recolours
# to whatever the wallpaper says. Flat by necessity — there is no shading to be
# had in a one-colour shape, and the rook survives that better than most pieces.
#
# `-colorize 100` repaints every pixel and leaves the alpha channel alone, so
# the silhouette is exactly the piece's own outline. Do not reach for
# `-alpha extract` here: that hands back the mask as opaque greyscale, and the
# icon comes out as a black rook in a white box.
$MAGICK -size 432x432 xc:none \
  \( "$WORK/rook.png" -resize x250 -fill white -colorize 100 \) \
  -gravity center -composite -strip assets/android-icon-monochrome.png

# The splash composites this over `backgroundColor`, so it must be transparent
# or it lands as a plum square on plum with a visible seam.
transparent 92 1024 assets/splash-icon.png

on_plum 72 48 assets/favicon.png

# --- the store listing (not bundled) ----------------------------------------

# Store art, full colour — never bundled, and Play re-encodes it.
$MAGICK -size 512x512 "xc:$PLUM" \
  \( "$WORK/rook.png" -resize x338 \) -gravity center -composite -strip brand/icon-play-store.png

# 1024x500 is 2.048:1 and the source is 2.067:1, so a sliver comes off the
# *left* — the empty side. Cropping the right would eat the board.
#
# The wordmark is set here, in the app's own `Fredoka_600SemiBold.ttf`, rather
# than left to an image model: generated lettering is never quite a typeface,
# and this is the one place the store art and the running app can be made
# literally identical. It is drawn at 2x and the whole thing resized down at
# the end, which is cheap supersampling — text rendered straight at 1024 wide
# has visibly harder edges.
#
# Kept well inside the left third. Play overlays its own play button on this
# graphic and crops it differently across surfaces, so anything near an edge is
# something you are choosing to sometimes lose.
# Two weights of the one family, as far apart as it has: the wordmark in the
# same SemiBold the app sets `variant="display"` in, the strap in Light. Fredoka
# is a rounded face and its heavy weights are *very* round — at one weight the
# strap read as a second, smaller headline rather than as a caption. The
# `-kerning` on the strap is what stops a light face at that size looking
# cramped; the wordmark gets none, because tracking a logo apart weakens it.
FREDOKA=node_modules/@expo-google-fonts/fredoka
BOLD="$FREDOKA/600SemiBold/Fredoka_600SemiBold.ttf"
LIGHT="$FREDOKA/300Light/Fredoka_300Light.ttf"

$MAGICK brand/board-source.jpg \
  -gravity east -crop '2949x1440+0+0' +repage \
  -resize 2048x1000! \
  -font "$BOLD" -fill '#F2EDE4' -kerning 0 \
  -pointsize 210 -gravity west -annotate +150-40 "$WORDMARK" \
  -font "$LIGHT" -fill '#B3A99B' -kerning 4 \
  -pointsize 62 -gravity west -annotate +158+92 "$STRAPLINE" \
  -resize 1024x500! -strip brand/feature-graphic.png

echo "brand assets rebuilt"

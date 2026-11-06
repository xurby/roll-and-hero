#!/bin/sh
# Builds the Windows and Linux apps, small enough to keep in the repository
# (GitHub doesn't accept files over 100 MB):
#   releases/RollAndHero-Windows.7z   and   releases/RollAndHero-Linux.tar.xz
# Runs on Linux or macOS (or Git Bash / WSL on Windows).
# Needs: node, tar, xz, python3 with py7zr (pip install py7zr).
set -e
cd "$(dirname "$0")/.."
rm -rf dist
# Git Bash on Windows would turn the '^/dist' style patterns below into Windows paths
# (so nothing gets left out); this tells it to pass them through unchanged.
MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' npx @electron/packager . "Roll & Hero" \
  --platform=win32,linux --arch=x64 --out=dist --overwrite \
  --icon=assets/icon --executable-name=roll-and-hero \
  --app-copyright="Roll & Hero" --asar \
  --win32metadata.ProductName="Roll & Hero" --win32metadata.FileDescription="Roll & Hero" \
  --ignore='^/dist' --ignore='^/releases' --ignore='^/docs' --ignore='^/packaging' --ignore='^/scripts' \
  --ignore='^/\.github' --ignore='^/\.git' --ignore='^/README\.md' --ignore='^/LICENSE' \
  --ignore='^/\.gitignore' --ignore='^/package-lock\.json' >/dev/null
cd dist
mv "Roll & Hero-win32-x64" RollAndHero-Windows
mv "Roll & Hero-linux-x64" RollAndHero-Linux
# keep only English and Spanish UI languages (smaller download)
for d in RollAndHero-Windows RollAndHero-Linux; do
  find "$d/locales" -type f ! -name 'en-US.pak' ! -name 'en-GB.pak' ! -name 'es.pak' ! -name 'es-419.pak' -delete
done
cp ../packaging/linux-launcher.sh RollAndHero-Linux/start-roll-and-hero.sh
chmod +x RollAndHero-Linux/start-roll-and-hero.sh
cp ../packaging/README-windows.txt RollAndHero-Windows/README.txt
cp ../packaging/README-linux.txt RollAndHero-Linux/README.txt
# WebGPU's shader compiler (about 27 MB): the game doesn't use WebGPU
rm -f RollAndHero-Windows/dxcompiler.dll RollAndHero-Windows/dxil.dll
echo "packing (this takes a few minutes)..."
python3 ../scripts/pack7z.py RollAndHero-Windows RollAndHero-Windows.7z
# --owner/--group: the archive doesn't record whose computer built it
tar --owner=0 --group=0 --numeric-owner -cf - RollAndHero-Linux | xz -9e > RollAndHero-Linux.tar.xz
mkdir -p ../releases
cp RollAndHero-Windows.7z RollAndHero-Linux.tar.xz ../releases/
ls -l ../releases
# stop if either file is too big for GitHub (100 MiB)
for f in ../releases/RollAndHero-Windows.7z ../releases/RollAndHero-Linux.tar.xz; do
  if [ "$(wc -c < "$f")" -ge 104857600 ]; then echo "$f is over GitHub's 100 MB limit" >&2; exit 1; fi
done
echo "built: releases/RollAndHero-Windows.7z and releases/RollAndHero-Linux.tar.xz"

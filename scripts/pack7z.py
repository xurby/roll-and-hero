"""Packs a folder into a small .7z (LZMA2, max compression, with the x86 filter for the .exe/.dll files).
Usage: python3 scripts/pack7z.py <folder> <output.7z>     (needs: pip install py7zr)"""
import sys
import py7zr

folder, out = sys.argv[1], sys.argv[2]
filters = [{'id': py7zr.FILTER_X86}, {'id': py7zr.FILTER_LZMA2, 'preset': 9 | py7zr.PRESET_EXTREME}]
with py7zr.SevenZipFile(out, 'w', filters=filters) as z:
    z.writeall(folder, folder)

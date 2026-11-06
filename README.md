# Roll & Hero

A dice-board video game. Roll the die, move your knight across 100 spaces, and every space you land on plays one of **your own videos**. Reach space 100 to win the run.

![Roll & Hero in its 8-bit style](docs/screenshot.png)

## Features

- **Your videos on the board:** numbered folders (`42.mp4` plays on space 42), unnumbered folders sorted by length and/or BPM, and handpicked videos you drag onto exact spaces. Zip files work too.
- **Special videos:** checkpoint videos (1, 25, 50, 75, 100), invasion clips that cut into a round, side quests, a merchant, and reward videos after you win.
- **Cards:** every 25 spaces you pick 1 of 3 power-ups (Fly Swatter, Hand Slipped, Magic Watch, Fast Forward, 9 Sided Dice and more).
- **Map objects:** ladders, chests, merchants, wells, letters (pick 1 of 3 side quests), altars (survive 4 rounds for any card) and side quests, placed randomly or saved in presets. Hover a space to see its videos and what's on it.
- **Heroes:** seven knights with their own powers, from Ruiner's one-time "Ruined!" revive to Royal's 7-sided die. Most have to be unlocked by playing.
- **Modifiers:** speed-ups, slow-downs, bursts and repeating captions.
- **Your look:** an 8-bit style (or the normal one), color presets, board size, and records like Longest Stretch, Marathon and Screen Time.
- **Presets:** save, export and import both menu and game settings.

## Download

The apps are in the [`releases`](releases) folder of this repository (and on the [Releases](../../releases) page):

- **Windows:** [`RollAndHero-Windows.7z`](releases/RollAndHero-Windows.7z). On an up-to-date Windows 11, right-click it → **Extract All**. On Windows 10 (or if that option is missing), open it with [7-Zip](https://www.7-zip.org/). Then run `roll-and-hero.exe` in the extracted folder. Windows may say "Windows protected your PC" because the app isn't signed. Click **More info → Run anyway**.
- **Linux:** [`RollAndHero-Linux.tar.xz`](releases/RollAndHero-Linux.tar.xz). Extract it (`tar -xf RollAndHero-Linux.tar.xz`) and run `./start-roll-and-hero.sh`.

You can also play without installing anything: open `index.html` in Chrome or Edge. Those browsers can remember your video folders between visits.

## Getting started

1. Open the **cog** menu and add your video folders under **Videos and characters**.
2. Choose how the game plays in **Game settings**, or load one of its presets.
3. Press **Roll dice** (or `R`).

Keys: `R` roll · `Z` accept · `X` decline · `1`–`5` items · `Space` I lost (or I win! during a reward video).

The **How to play** button and the **?** buttons in the menus explain everything else.

## Project layout

| Path | What it is |
|---|---|
| `index.html` | The whole game: one self-contained page (HTML, CSS and JavaScript, fonts included) |
| `main.js` | The desktop app's window (Electron) |
| `preload.js` | Lets the page put the window into fullscreen while a video plays |
| `assets/` | App icons |
| `packaging/` | The Linux launcher and the README files that go inside the downloads |
| `releases/` | The built Windows and Linux apps |
| `scripts/build.sh` | Builds both apps into `releases/` |
| `scripts/pack7z.py` | Packs the Windows app into a small `.7z` |
| `.github/workflows/build.yml` | Builds the apps on GitHub and attaches them to releases |

## Development

You'll need [Node.js](https://nodejs.org/) 20 or newer, and Python 3 with `py7zr` (`pip install py7zr`) to build the apps.

```sh
npm install        # once
npm start          # run the desktop app from the source
npm run build      # build releases/RollAndHero-Windows.7z and releases/RollAndHero-Linux.tar.xz
```

`npm run build` runs `scripts/build.sh`, so it needs a shell with `tar` and `xz`: Linux, macOS or WSL. Both apps are built from any of these, and building the Windows app doesn't need Wine. Packing takes a few minutes because it uses the strongest compression.

**Keeping the apps under GitHub's 100 MB limit:** the Windows app is packed as `.7z` and the Linux app as `.tar.xz`, which are much smaller than `.zip` and `.tar.gz`. The Windows app also leaves out WebGPU's shader compiler (`dxcompiler.dll`, `dxil.dll`), which the game doesn't use, and only English and Spanish menus are kept. Electron is pinned to one version, because newer ones can be bigger; the build stops with an error if a file ends up over the limit. Each new build you commit adds about 180 MB to the repository's history, so commit `releases/` only when you publish a new version.

To make changes to the game itself, edit `index.html`. You can test it straight in a browser, with no build step.

## Putting it on GitHub

In PowerShell, from this folder (with [Git](https://git-scm.com/) and the [GitHub CLI](https://cli.github.com/) installed, signed in with `gh auth login`):

```powershell
gh repo create roll-and-hero --public --source . --push
```

That uploads the code and the apps in `releases/`. To also list them on the Releases page, push a version tag (next section).

## Releases

GitHub Actions builds both apps on every push to `main` and keeps them as a downloadable artifact on the workflow run. To publish a release, push a version tag:

```sh
git tag v1.0.0
git push origin v1.0.0
```

The workflow then builds both apps again and attaches `RollAndHero-Windows.7z` and `RollAndHero-Linux.tar.xz` to a GitHub Release for that tag.

## License

[MIT](LICENSE). The fonts embedded in `index.html` (Press Start 2P, Tiny5, Fraunces, IBM Plex Sans and IBM Plex Mono) are under the SIL Open Font License.

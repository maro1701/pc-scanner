# SysProbe — System Health Scanner

A desktop PC health scanner for Windows that reads your real hardware, detects issues, and explains everything in plain English — no jargon, no fake errors, no upsells.


## Download

[⬇️ Download SysProbe for Windows](https://drive.google.com/file/d/1FJzCKqwfRXYaijapcYfxNV6Tdwfzusj1/view?usp=drive_link)

## What It Does

- **Hardware scan** — CPU, RAM, GPU, storage with real-time usage and health scores
- **Overall health score** — one number summarising your system out of 100
- **Windows Defender status** — real-time protection check and definition update date
- **Startup program audit** — lists every program slowing down your boot time
- **Duplicate file detection** — finds duplicate files across Downloads, Documents and Desktop
- **Hidden file detection** — surfaces hidden files and folders in your home directory
- **File manager built in** — reveal, copy, move or delete files without leaving the app
- **Fix-it buttons** — open Task Manager, Disk Cleanup, Windows Settings startup page directly from the app
- **Plain English explanations** — every result explained in simple language with actionable advice

## Tech Stack

- [Electron](https://www.electronjs.org/) — desktop app shell
- [Node.js](https://nodejs.org/) — backend runtime
- [systeminformation](https://systeminformation.io/) — hardware and OS data
- [PowerShell](https://learn.microsoft.com/en-us/powershell/) — Windows Defender and startup program data
- Webpack — bundling

## Architecture

```
main.js        — Node.js process, runs systeminformation and PowerShell commands
preload.js     — secure bridge between Node.js and the renderer
renderer.js    — frontend UI, displays scan results and wires up interactions
index.html     — app shell
index.css      — styles
```

## Run Locally

```bash
git clone https://github.com/maro1701/pc-scanner
cd pc-scanner
npm install
npm start
```

## Build Installer

```bash
npm run make
```

Produces a `.exe` installer in `out/make/squirrel.windows/x64/`





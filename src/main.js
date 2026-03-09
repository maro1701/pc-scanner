const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { exec } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const si = require('systeminformation');

if (require('electron-squirrel-startup')) app.quit();

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

const runPS = (cmd) => new Promise((resolve) => {
  exec(`powershell -NoProfile -Command "${cmd}"`, (err, stdout) => {
    resolve(err ? null : stdout.trim());
  });
});

const getStartupPrograms = async () => {
  const result = await runPS(
    'Get-CimInstance Win32_StartupCommand | Select-Object Name,Command | ConvertTo-Json'
  );
  if (!result) return [];
  try {
    const parsed = JSON.parse(result);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch { return []; }
};

const getDefenderStatus = async () => {
  const result = await runPS(
    'Get-MpComputerStatus | Select-Object AntivirusEnabled,RealTimeProtectionEnabled,AntivirusSignatureLastUpdated,QuickScanAge | ConvertTo-Json'
  );
  if (!result) return null;
  try { return JSON.parse(result); } catch { return null; }
};

const hashFile = (filePath) => new Promise((resolve) => {
  try {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    stream.on('data', d => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', () => resolve(null));
  } catch { resolve(null); }
});

const scanDirectory = async () => {
  const hashes = {};
  const duplicates = [];
  let hiddenCount = 0;

  const walk = (dir) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) { hiddenCount++; continue; }
      if (entry.isDirectory()) {
        const skip = ['node_modules', 'AppData', 'Windows', '$Recycle.Bin'];
        if (!skip.includes(entry.name)) walk(path.join(dir, entry.name));
      }
    }
  };

  const hashDir = async (dir) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          if (stat.size > 1024 && stat.size < 100 * 1024 * 1024) {
            const hash = await hashFile(fullPath);
            if (hash) {
              if (hashes[hash]) {
                duplicates.push({ original: hashes[hash], duplicate: fullPath });
              } else {
                hashes[hash] = fullPath;
              }
            }
          }
        } catch { continue; }
      }
    }
  };

  const homeDir = require('os').homedir();
  walk(homeDir);
  for (const p of [
    path.join(homeDir, 'Downloads'),
    path.join(homeDir, 'Documents'),
    path.join(homeDir, 'Desktop'),
  ]) await hashDir(p);

  return { duplicates: duplicates.length, hidden: hiddenCount };
};

// Fix-it actions
ipcMain.handle('fix-startup', () => {
  exec('start ms-settings:startupapps', { shell: true });
});

ipcMain.handle('fix-ram', () => {
  exec('taskmgr', { shell: true });
});

ipcMain.handle('fix-disk', () => {
  exec('cleanmgr', { shell: true });
});

ipcMain.handle('fix-defender', () => {
  exec('start windowsdefender:', { shell: true });
});

ipcMain.handle('fix-duplicates', () => {
  exec(`explorer "${path.join(require('os').homedir(), 'Downloads')}"`, { shell: true });
});

ipcMain.handle('run-scan', async () => {
  const [cpu, mem, disks, gpu, temp, osInfo, fsSize, startup, defender, fileStats] = await Promise.all([
    si.cpu(), si.mem(), si.diskLayout(), si.graphics(),
    si.cpuTemperature(), si.osInfo(), si.fsSize(),
    getStartupPrograms(), getDefenderStatus(), scanDirectory(),
  ]);

  const ramPercent = Math.round(((mem.total - mem.available) / mem.total) * 100);
  const startupCount = startup.length;
  const ramScore = ramPercent > 90 ? 20 : ramPercent > 80 ? 50 : ramPercent > 60 ? 75 : 100;
  const startupScore = startupCount > 15 ? 30 : startupCount > 8 ? 65 : 100;
  const defenderScore = (defender?.RealTimeProtectionEnabled === true || defender?.RealTimeProtectionEnabled === 'True') ? 100 : 0;
  const cpuScore = 90;
  const diskScore = 90;
  const overallScore = Math.round((ramScore + startupScore + defenderScore + cpuScore + diskScore) / 5) || 0;

  return {
    cpu: { name: `${cpu.manufacturer} ${cpu.brand}`, cores: cpu.cores, speed: cpu.speed },
    ram: {
      total: (mem.total / 1024 / 1024 / 1024).toFixed(1),
      used: ((mem.total - mem.available) / 1024 / 1024 / 1024).toFixed(1),
      percent: ramPercent,
      score: ramScore,
    },
    disk: disks.map(d => ({ name: d.name, size: (d.size / 1024 / 1024 / 1024).toFixed(0), type: d.type })),
    diskUsage: fsSize.filter(f => f.size > 0).map(f => ({
      mount: f.mount,
      used: (f.used / 1024 / 1024 / 1024).toFixed(1),
      total: (f.size / 1024 / 1024 / 1024).toFixed(1),
      percent: Math.round((f.used / f.size) * 100),
    })),
    gpu: gpu.controllers.map(g => ({ model: g.model, vram: g.vram })),
    temp: temp.main,
    startup: {
      count: startupCount,
      programs: startup.slice(0, 8).map(s => s.Name || s.name || 'Unknown'),
      score: startupScore,
    },
    defender: {
      enabled: defender?.AntivirusEnabled ?? false,
      realtime: defender?.RealTimeProtectionEnabled === true || defender?.RealTimeProtectionEnabled === 'True',
      lastUpdated: defender?.AntivirusSignatureLastUpdated ?? null,
      lastScanDays: defender?.QuickScanAge ?? null,
      score: defenderScore,
    },
    files: fileStats,
    os: `${osInfo.distro} ${osInfo.release}`,
    overallScore,
  };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
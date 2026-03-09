import './index.css';

const scanBtn = document.getElementById('scan-btn');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');

const badge = (status) => `<span class="badge ${status}">${status}</span>`;

const scoreColor = (score) =>
  score >= 80 ? 'healthy' : score >= 50 ? 'warning' : 'critical';

const formatDate = (raw) => {
  if (!raw) return 'Unknown';
  try {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? 'Recently updated' : d.toLocaleDateString();
  } catch { return 'Unknown'; }
};

scanBtn.addEventListener('click', async () => {
  scanBtn.disabled = true;
  scanBtn.textContent = 'Scanning...';
  statusEl.textContent = 'Reading your system — this may take 15-20 seconds...';
  resultsEl.innerHTML = '';

  try {
    const d = await window.scanner.runScan();

    scanBtn.textContent = 'Scan Again';
    scanBtn.disabled = false;
    statusEl.textContent = 'Scan complete';

    const ramStatus = d.ram.percent > 80 ? 'critical' : d.ram.percent > 60 ? 'warning' : 'healthy';
    const startupStatus = d.startup.count > 8 ? 'warning' : 'healthy';
    const defenderStatus = d.defender.realtime ? 'healthy' : 'critical';
    const overallStatus = scoreColor(d.overallScore);

    resultsEl.innerHTML = `

      <!-- Overall Score -->
      <div class="card score-card">
        <div class="score-circle ${overallStatus}">
          <span class="score-number">${d.overallScore}</span>
          <span class="score-label">/ 100</span>
        </div>
        <div class="score-info">
          <div class="score-title">Overall System Health</div>
          <div class="score-sub">
            ${d.overallScore >= 80
              ? 'Your system is in good shape.'
              : d.overallScore >= 50
              ? 'Some issues need attention.'
              : 'Your system has serious issues that need fixing.'}
          </div>
        </div>
      </div>

      <!-- CPU -->
      <div class="card">
        <div class="card-header"><span class="label">CPU</span>${badge('healthy')}</div>
        <div class="card-name">${d.cpu.name}</div>
        <div class="card-detail">${d.cpu.cores} cores @ ${d.cpu.speed}GHz</div>
        <div class="card-plain">Your processor is running normally.</div>
      </div>

      <!-- RAM -->
      <div class="card">
        <div class="card-header"><span class="label">RAM</span>${badge(ramStatus)}</div>
        <div class="card-name">${d.ram.used}GB used / ${d.ram.total}GB total</div>
        <div class="card-detail">Memory usage: ${d.ram.percent}%</div>
        <div class="progress-bar"><div class="progress-fill ${ramStatus}" style="width:${d.ram.percent}%"></div></div>
        <div class="card-plain">
          ${d.ram.percent > 80
            ? 'Memory is critically high. Close unused apps or upgrade to 16GB.'
            : d.ram.percent > 60
            ? 'Memory usage is elevated. Consider closing background apps.'
            : 'Memory usage is healthy.'}
        </div>
        ${d.ram.percent > 60 ? `<button class="fix-btn" id="fix-ram">Open Task Manager →</button>` : ''}
      </div>

      <!-- Disk Usage -->
      ${d.diskUsage.map(f => `
        <div class="card">
          <div class="card-header">
            <span class="label">Drive ${f.mount}</span>
            ${badge(f.percent > 90 ? 'critical' : f.percent > 70 ? 'warning' : 'healthy')}
          </div>
          <div class="card-name">${f.used}GB used / ${f.total}GB total</div>
          <div class="card-detail">Storage usage: ${f.percent}%</div>
          <div class="progress-bar"><div class="progress-fill ${f.percent > 90 ? 'critical' : f.percent > 70 ? 'warning' : 'healthy'}" style="width:${f.percent}%"></div></div>
          <div class="card-plain">
            ${f.percent > 90
              ? 'Drive is almost full. Delete files or move data to free up space.'
              : f.percent > 70
              ? 'Drive is getting full. Keep an eye on this.'
              : 'Drive space is healthy.'}
          </div>
          <button class="fix-btn" id="fix-disk">Run Disk Cleanup →</button>
        </div>
      `).join('')}

      <!-- GPU -->
      ${d.gpu.map(g => `
        <div class="card">
          <div class="card-header"><span class="label">GPU</span>${badge('healthy')}</div>
          <div class="card-name">${g.model}</div>
          <div class="card-detail">${g.vram}MB VRAM</div>
          <div class="card-plain">Graphics card detected normally.</div>
        </div>
      `).join('')}

      <!-- Antivirus -->
      <div class="card">
        <div class="card-header"><span class="label">Antivirus</span>${badge(defenderStatus)}</div>
        <div class="card-name">Windows Defender</div>
        <div class="card-detail">
          Real-time protection: ${d.defender.realtime ? 'ON' : 'OFF'} &nbsp;|&nbsp;
          Definitions updated: ${formatDate(d.defender.lastUpdated)}
        </div>
        <div class="card-plain">
          ${d.defender.realtime
            ? d.defender.lastScanDays !== null && d.defender.lastScanDays > 7
              ? `Protection is active but your last scan was ${d.defender.lastScanDays} days ago. Run a scan.`
              : 'Real-time protection is active. Your system is being monitored.'
            : 'Real-time protection is OFF. Your system is exposed. Enable Windows Defender immediately.'}
        </div>
        ${!d.defender.realtime ? `<button class="fix-btn critical-btn" id="fix-defender">Open Windows Security →</button>` : ''}
      </div>

      <!-- Startup Programs -->
      <div class="card">
        <div class="card-header"><span class="label">Startup Programs</span>${badge(startupStatus)}</div>
        <div class="card-name">${d.startup.count} programs launch on startup</div>
        <div class="card-plain">
          ${d.startup.count > 8
            ? 'Too many startup programs are slowing your boot time.'
            : 'Startup load is reasonable.'}
        </div>
        ${d.startup.programs.length > 0 ? `
          <div class="tag-list">
            ${d.startup.programs.map(p => `<span class="tag">${p}</span>`).join('')}
          </div>` : ''}
        <button class="fix-btn" id="fix-startup">Manage Startup Programs →</button>
      </div>

      <!-- Files -->
      <div class="card">
        <div class="card-header"><span class="label">File System</span>${badge(d.files.duplicates > 20 ? 'warning' : 'healthy')}</div>
        <div class="card-name">Scanned Downloads, Documents & Desktop</div>
        <div class="card-detail">
          Duplicate files: ${d.files.duplicates} &nbsp;|&nbsp; Hidden files/folders: ${d.files.hidden}
        </div>
        <div class="card-plain">
          ${d.files.duplicates > 20
            ? `${d.files.duplicates} duplicate files found. Cleaning these up could free significant space.`
            : d.files.duplicates > 0
            ? `${d.files.duplicates} duplicate files found in common folders.`
            : 'No duplicate files detected in scanned folders.'}
        </div>
        ${d.files.duplicates > 0 ? `<button class="fix-btn" id="fix-duplicates">Open Downloads Folder →</button>` : ''}
      </div>

      <!-- OS -->
      <div class="card">
        <div class="card-header"><span class="label">Operating System</span>${badge('healthy')}</div>
        <div class="card-name">${d.os}</div>
        <div class="card-plain">System OS detected successfully.</div>
      </div>
    `;

    // Wire fix-it buttons — must be AFTER resultsEl.innerHTML is set
    document.getElementById('fix-ram')?.addEventListener('click', () => window.scanner.fixRam());
    document.getElementById('fix-startup')?.addEventListener('click', () => window.scanner.fixStartup());
    document.getElementById('fix-disk')?.addEventListener('click', () => window.scanner.fixDisk());
    document.getElementById('fix-defender')?.addEventListener('click', () => window.scanner.fixDefender());
    document.getElementById('fix-duplicates')?.addEventListener('click', () => window.scanner.fixDuplicates());

  } catch (err) {
    statusEl.textContent = 'Scan failed';
    scanBtn.textContent = 'Try Again';
    scanBtn.disabled = false;
    resultsEl.innerHTML = `<div class="error">Error: ${err.message}</div>`;
  }
});
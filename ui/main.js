const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const Store = require('electron-store');
const fs = require('fs');

// Set app name
app.name = 'V.E.R.N.O.N. AI';

// Set base directory
const baseDir = path.join(__dirname, '..');

// Check for llama_manager availability
let llamaManagerAvailable = false;
try {
  const llamaManagerPath = path.join(baseDir, 'core', 'llama_manager.py');
  if (fs.existsSync(llamaManagerPath)) {
    llamaManagerAvailable = true;
    console.log("[*] llama_manager.py found, local model support available");
  }
} catch (e) {
  console.log("[*] llama_manager not available");
}

const store = new Store();
let win;
let splash;
let tray;
let backendProcess = null;

// Function to start the bundled Python backend
function startBackend() {
  if (!app.isPackaged) return; // Only start in packaged mode

  let groqKey = store.get('groqKey');
  let geminiKey = store.get('geminiKey');

  // Fallback to .env in packaged mode if store is empty
  if (!groqKey && !geminiKey) {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const groqMatch = envContent.match(/GROQ_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);
        const geminiMatch = envContent.match(/GOOGLE_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);
        if (groqMatch) groqKey = groqMatch[1];
        if (geminiMatch) geminiKey = geminiMatch[1];
      } catch (e) {
        console.error("Failed to read fallback .env file:", e);
      }
    }
  }

  // If no keys, don't start backend yet, wait for UI to provide them
  if (!groqKey && !geminiKey) {
    console.log("[*] No API keys found. Waiting for First-Time Setup...");
    return;
  }

  const backendPath = path.join(process.resourcesPath, 'assets', 'backend', 'backend.exe');
  
  if (!fs.existsSync(backendPath)) {
    console.error("[!] Bundled backend.exe not found at:", backendPath);
    return;
  }

  console.log("[*] Starting bundled backend...");
  
  const args = [];
  if (groqKey) args.push('--groq', groqKey);
  if (geminiKey) args.push('--gemini', geminiKey);

  backendProcess = spawn(backendPath, args);

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend]: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend Error]: ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`[Backend] exited with code ${code}`);
  });
}

function restartBackend() {
  if (backendProcess) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
      } else {
        backendProcess.kill();
      }
    } catch (err) {
      console.error("Failed to terminate backend:", err);
    }
    backendProcess = null;
    startBackend();
  }
}

let splashShownAt = null;
const MIN_SPLASH_MS = 3200; // matches the boot animation length in splash.html

function createSplash() {
  const splashWin = new BrowserWindow({
    width: 480,
    height: 480,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    center: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  splashWin.loadFile(path.join(__dirname, 'splash.html'));

  // Only reveal once it has actually painted, and log if it fails to load
  splashWin.once('ready-to-show', () => {
    splashShownAt = Date.now();
    splashWin.show();
  });

  splashWin.webContents.on('did-fail-load', (event, code, desc) => {
    console.error('[!] Splash failed to load:', code, desc);
  });

  return splashWin;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    skipTaskbar: false, // Show in taskbar
    title: 'V.E.R.N.O.N. AI', // Set window title
    show: false, // Keep hidden until splash hands off
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  // Enable click-through for transparent areas initially
  win.setIgnoreMouseEvents(true, { forward: true });

  win.loadFile('index.html');

  // Swap splash for the real window once it's ready to paint,
  // but never cut the splash animation short.
  win.once('ready-to-show', () => {
    const elapsed = splashShownAt ? Date.now() - splashShownAt : 0;
    const remaining = Math.max(MIN_SPLASH_MS - elapsed, 0);

    setTimeout(() => {
      if (splash && !splash.isDestroyed()) {
        splash.close();
        splash = null;
      }
      win.show();
    }, remaining);
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  
  if (!fs.existsSync(iconPath)) {
    console.log("[*] Tray icon not found. Skipping tray initialization to prevent crash.");
    return;
  }

  try {
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show V.E.R.N.O.N. AI', click: () => win.show() },
      { label: 'Hide V.E.R.N.O.N. AI', click: () => win.hide() },
      { type: 'separator' },
      { label: 'Exit', click: () => {
        app.isQuitting = true;
        app.quit();
      }}
    ]);

    tray.setToolTip('V.E.R.N.O.N. AI Assistant');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      win.isVisible() ? win.hide() : win.show();
    });
  } catch (e) {
    console.error("[!] Failed to create tray:", e);
  }
}

ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.setIgnoreMouseEvents(ignore, options);
});

ipcMain.on('resize-window', (event, width, height) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setSize(width, height);
    // Optional: Reposition to corner?
    // win.setPosition(screen.getPrimaryDisplay().workArea.width - width, screen.getPrimaryDisplay().workArea.height - height);
  }
});

ipcMain.on('quit-app', () => {
  app.quit();
});

// IPC handlers for API Keys
ipcMain.handle('check-api-keys', () => {
  let groqKey = store.get('groqKey') || '';
  let geminiKey = store.get('geminiKey') || '';
  
  // Fallback to reading from .env in the parent directory
  if (!groqKey && !geminiKey) {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const groqMatch = envContent.match(/GROQ_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);
        const geminiMatch = envContent.match(/GOOGLE_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);
        if (groqMatch) groqKey = groqMatch[1];
        if (geminiMatch) geminiKey = geminiMatch[1];
      } catch (e) {
        console.error("Failed to read .env file:", e);
      }
    }
  }
  
  return {
    isPackaged: app.isPackaged,
    hasKeys: !!(groqKey || geminiKey),
    groqKey: groqKey,
    geminiKey: geminiKey
  };
});

ipcMain.on('save-api-keys', (event, keys) => {
  store.set('groqKey', keys.groq);
  store.set('geminiKey', keys.gemini);
  
  console.log("[*] API keys saved successfully to Electron Store.");

  // Write/Update the .env file in parent directory
  const envPath = path.join(__dirname, '..', '.env');
  try {
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    } else {
      const examplePath = path.join(__dirname, '..', '.env.example');
      if (fs.existsSync(examplePath)) {
        envContent = fs.readFileSync(examplePath, 'utf8');
      }
    }

    if (envContent.includes('GROQ_API_KEY')) {
      envContent = envContent.replace(/GROQ_API_KEY\s*=\s*["']?[^"'\r\n]*["']?/, `GROQ_API_KEY="${keys.groq}"`);
    } else {
      envContent += `\nGROQ_API_KEY="${keys.groq}"`;
    }

    if (envContent.includes('GOOGLE_API_KEY')) {
      envContent = envContent.replace(/GOOGLE_API_KEY\s*=\s*["']?[^"'\r\n]*["']?/, `GOOGLE_API_KEY="${keys.gemini}"`);
    } else {
      envContent += `\nGOOGLE_API_KEY="${keys.gemini}"`;
    }

    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
    console.log("[*] API keys synced to .env file successfully.");
  } catch (e) {
    console.error("Failed to sync keys to .env file:", e);
  }
  
  // Terminate old backend process to reload new keys (packaged mode)
  if (backendProcess) {
    console.log("[*] Terminating old backend process to apply new keys...");
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
      } else {
        backendProcess.kill();
      }
    } catch (err) {
      console.error("Failed to terminate old backend:", err);
    }
    backendProcess = null;
  }
  
  // Re-start the backend with the new keys
  startBackend();
});

let updateProcess = null;

// Helper to run a command and return a Promise
function runCommandPromise(cmd, cwd) {
  return new Promise((resolve) => {
    exec(cmd, { cwd }, (err, stdout, stderr) => {
      resolve({ success: !err, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

// Check if update is available
async function isUpdateAvailable() {
  const repoPath = path.join(__dirname, '..', 'Github', 'V.E.R.N.O.N.-AI');
  if (!fs.existsSync(repoPath)) {
    console.log("[*] GitHub repository not found at:", repoPath);
    return false;
  }

  console.log("[*] Fetching latest updates from GitHub...");
  const fetchRes = await runCommandPromise('git fetch', repoPath);
  if (!fetchRes.success) {
    console.log("[WARN] Failed to fetch updates (offline or git error). Skipping update check.");
    return false;
  }

  const diffRes = await runCommandPromise('git rev-list --count HEAD..origin/main', repoPath);
  if (!diffRes.success) {
    console.error("Failed to compare HEAD with origin/main.");
    return false;
  }

  const count = parseInt(diffRes.stdout.trim(), 10);
  return count > 0;
}

// Run updater.py using venv python
function runUpdater() {
  return new Promise((resolve) => {
    const pythonPath = path.join(__dirname, '..', 'venv', 'Scripts', 'python.exe');
    const updaterPath = path.join(__dirname, '..', 'updater.py');
    
    if (!fs.existsSync(pythonPath) || !fs.existsSync(updaterPath)) {
      resolve({ success: false, message: 'Python virtual env or updater.py not found.' });
      return;
    }

    const updater = spawn(pythonPath, [updaterPath]);
    
    let output = '';
    updater.stdout.on('data', (data) => {
      output += data.toString();
      const lines = data.toString().split('\n');
      for (let line of lines) {
        if (line.trim().startsWith('[*]') || line.trim().startsWith('[OK]')) {
          if (win) win.webContents.send('update-status', line.trim());
          console.log(`[Updater]: ${line.trim()}`);
        }
      }
    });

    updater.stderr.on('data', (data) => {
      console.error(`[Updater Error]: ${data}`);
    });

    updater.on('close', (code) => {
      resolve({ success: code === 0, message: output });
    });
  });
}

ipcMain.handle('perform-update', async (event) => {
  const baseDir = path.join(__dirname, '..');
  const updaterScript = path.join(baseDir, 'updater.py');
  
  if (!fs.existsSync(updaterScript)) {
    console.error("[!] Updater script not found:", updaterScript);
    if (win) win.webContents.send('update-status', 'Updater script not found');
    return false;
  }

  console.log("[*] Starting update process...");
  
  try {
    // Show update overlay
    if (win) {
      win.webContents.send('show-update-overlay', 'Checking for updates...');
    }

    // Run the updater script
    updateProcess = spawn('python', [updaterScript], {
      cwd: baseDir,
      windowsHide: true
    });

    let updateCompleted = false;
    let updateFailed = false;
    let alreadyUpToDate = false;
    let allOutput = ''; // Accumulate all output for better parsing

    updateProcess.stdout.on('data', (data) => {
      const output = data.toString();
      allOutput += output; // Accumulate all output
      console.log(`[Updater]: ${output}`);
      
      // Parse output and send status updates
      if (output.includes('Checking')) {
        if (win) win.webContents.send('update-status', 'Checking for updates...');
      } else if (output.includes('Backup')) {
        if (win) win.webContents.send('update-status', 'Creating backup...');
      } else if (output.includes('Git pull')) {
        if (win) win.webContents.send('update-status', 'Fetching latest changes...');
      } else if (output.includes('Synchronizing')) {
        if (win) win.webContents.send('update-status', 'Synchronizing files...');
      } else if (output.includes('dependencies')) {
        if (win) win.webContents.send('update-status', 'Updating dependencies...');
      } else if (output.includes('Already up to date') || output.includes('already up to date')) {
        if (win) win.webContents.send('update-status', 'Already up to date! No restart needed.');
        updateCompleted = true;
        alreadyUpToDate = true;
      } else if (output.includes('complete') || output.includes('successfully') || output.includes('updated successfully')) {
        if (win) win.webContents.send('update-status', 'Update complete! Restarting...');
        updateCompleted = true;
      } else if (output.includes('[OK]') && (output.includes('Update marked as complete') || output.includes('updated successfully'))) {
        if (win) win.webContents.send('update-status', 'Update complete! Restarting...');
        updateCompleted = true;
      } else if (output.includes('ERROR') || output.includes('[!]')) {
        // Only treat as failure if it's an actual error (marked with ERROR or [!])
        updateFailed = true;
      }
      // Ignore WARN messages - they're not failures
    });

    updateProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      console.error(`[Updater Error]: ${errorOutput}`);
      // Don't immediately mark as failed - some warnings go to stderr
      // Only mark as failed if it's a real error
      if (errorOutput.includes('ERROR') || errorOutput.includes('Error') || errorOutput.includes('Failed')) {
        updateFailed = true;
      }
    });

    return new Promise((resolve) => {
      updateProcess.on('close', (code) => {
        console.log(`[Updater] exited with code ${code}`);
        console.log(`[Updater] Full output: ${allOutput}`);
        updateProcess = null;
        
        // More robust success detection:
        // 1. Exit code must be 0
        // 2. Either updateCompleted flag is set OR output contains success indicators
        // 3. No explicit failures detected
        const hasSuccessIndicators = allOutput.includes('Already up to date') || 
                                      allOutput.includes('updated successfully') ||
                                      allOutput.includes('Update marked as complete') ||
                                      allOutput.includes('V.E.R.N.O.N. updated successfully');
        
        const isSuccessful = code === 0 && !updateFailed && (updateCompleted || hasSuccessIndicators);
        
        if (isSuccessful) {
          if (win) {
            const isUpToDate = alreadyUpToDate || allOutput.includes('Already up to date') || allOutput.includes('Already up-to-date');
            if (isUpToDate) {
              win.webContents.send('update-success', 'System is already up to date. No updates needed.');
            } else {
              win.webContents.send('update-success', 'Update complete! Restarting V.E.R.N.O.N. system...');
              setTimeout(() => {
                app.relaunch();
                app.exit();
              }, 2500);
            }
          }
          resolve(true);
        } else {
          if (win) {
            const errorLines = allOutput.split('\n').filter(l => l.toLowerCase().includes('failed') || l.includes('ERROR') || l.includes('[!]'));
            const descriptiveError = errorLines.length > 0 ? errorLines[errorLines.length - 1].trim() : 'Unknown error occurred during installation.';
            win.webContents.send('update-error', descriptiveError);
          }
          resolve(false);
        }
      });
    });

  } catch (error) {
    console.error("[!] Update process error:", error);
    if (win) {
      win.webContents.send('update-error', 'Update failed: ' + error.message);
    }
    return false;
  }
});

ipcMain.on('cancel-update', () => {
  if (updateProcess) {
    console.log("[*] Cancelling update process...");
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', updateProcess.pid, '/f', '/t']);
      } else {
        updateProcess.kill();
      }
      updateProcess = null;
    } catch (err) {
      console.error("Failed to cancel update:", err);
    }
  }
  
  if (win) {
    win.webContents.send('hide-update-overlay');
  }
});

function syncStoreToEnv() {
  const groqKey = store.get('groqKey') || '';
  const geminiKey = store.get('geminiKey') || '';
  
  if (!groqKey && !geminiKey) return; // No keys saved in Store to sync

  const envPath = path.join(__dirname, '..', '.env');
  try {
    let envContent = '';
    let needsUpdate = false;
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      
      const groqMatch = envContent.match(/GROQ_API_KEY\s*=\s*["']?([^"'\r\n]*)["']?/);
      const geminiMatch = envContent.match(/GOOGLE_API_KEY\s*=\s*["']?([^"'\r\n]*)["']?/);
      
      const currentGroq = groqMatch ? groqMatch[1] : '';
      const currentGemini = geminiMatch ? geminiMatch[1] : '';
      
      if (groqKey && currentGroq !== groqKey) needsUpdate = true;
      if (geminiKey && currentGemini !== geminiKey) needsUpdate = true;
    } else {
      needsUpdate = true;
      const examplePath = path.join(__dirname, '..', '.env.example');
      if (fs.existsSync(examplePath)) {
        envContent = fs.readFileSync(examplePath, 'utf8');
      }
    }

    if (needsUpdate) {
      if (envContent.includes('GROQ_API_KEY')) {
        envContent = envContent.replace(/GROQ_API_KEY\s*=\s*["']?[^"'\r\n]*["']?/, `GROQ_API_KEY="${groqKey}"`);
      } else {
        envContent += `\nGROQ_API_KEY="${groqKey}"`;
      }

      if (envContent.includes('GOOGLE_API_KEY')) {
        envContent = envContent.replace(/GOOGLE_API_KEY\s*=\s*["']?[^"'\r\n]*["']?/, `GOOGLE_API_KEY="${geminiKey}"`);
      } else {
        envContent += `\nGOOGLE_API_KEY="${geminiKey}"`;
      }

      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
      console.log("[*] API keys auto-synced from Store to .env on startup.");
    }
  } catch (e) {
    console.error("Failed to auto-sync keys to .env file:", e);
  }
}

app.whenReady().then(() => {
  syncStoreToEnv();
  splash = createSplash();
  createWindow();
  createTray();

  // Wait for window to load its DOM before starting auto-update check
  win.webContents.once('did-finish-load', async () => {
    const updateAvailable = await isUpdateAvailable();
    if (updateAvailable) {
      console.log("[*] System updates available. Triggering auto-update...");
      win.webContents.send('show-update-overlay', 'System update detected. Downloading latest changes...');
      
      // Perform the update
      const res = await runUpdater();
      if (res.success) {
        win.webContents.send('update-success', 'Auto-update complete! Restarting system...');
        setTimeout(() => {
          app.relaunch();
          app.exit();
        }, 2500);
      } else {
        const errorLines = res.message.split('\n').filter(l => l.toLowerCase().includes('failed') || l.includes('ERROR') || l.includes('[!]'));
        const descriptiveError = errorLines.length > 0 ? errorLines[errorLines.length - 1].trim() : 'Unknown error occurred.';
        win.webContents.send('update-error', `Auto-update failed: ${descriptiveError}`);
        setTimeout(() => {
          win.webContents.send('hide-update-overlay');
          startBackend();
        }, 4000);
      }
    } else {
      console.log("[*] System is up-to-date. Starting backend...");
      startBackend();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// IPC handlers for provider priority
ipcMain.handle('get-provider-priority', async () => {
  const envPath = path.join(baseDir, '.env');
  
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/AI_PROVIDER_PRIORITY\s*=\s*["']?([^"'\r\n]+)["']?/);
      if (match) {
        return match[1].split(',').map(p => p.trim().toLowerCase());
      }
    }
  } catch (error) {
    console.error('Failed to read provider priority:', error);
  }
  
  return ['groq', 'gemini', 'llama_cpp'];
});

ipcMain.handle('save-provider-priority', async (event, priority) => {
  const envPath = path.join(baseDir, '.env');
  
  try {
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    } else {
      const examplePath = path.join(baseDir, '.env.example');
      if (fs.existsSync(examplePath)) {
        envContent = fs.readFileSync(examplePath, 'utf8');
      }
    }
    
    const priorityString = priority.join(',');
    
    if (envContent.includes('AI_PROVIDER_PRIORITY')) {
      envContent = envContent.replace(/AI_PROVIDER_PRIORITY\s*=\s*["']?[^"'\r\n]*["']?/, `AI_PROVIDER_PRIORITY="${priorityString}"`);
    } else {
      envContent += `\nAI_PROVIDER_PRIORITY="${priorityString}"`;
    }
    
    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
    
    // Only try to reload engine if backend is running (packaged mode)
    if (backendProcess) {
      // Use http module to reload engine
      try {
        const http = require('http');
        const data = JSON.stringify({});
        
        const req = http.request({
          hostname: '127.0.0.1',
          port: 8000,
          path: '/reload-engine',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
          }
        }, (res) => {
          if (res.statusCode === 200) {
            console.log("[*] Engine reloaded successfully");
          } else {
            console.log("[*] Engine reload failed, using fallback");
            restartBackend();
          }
        });
        
        req.on('error', (error) => {
          console.error("[*] Failed to reload engine:", error);
          restartBackend();
        });
        
        req.write(data);
        req.end();
        
        return { success: true };
      } catch (error) {
        console.error("[*] Error in reload process:", error);
        restartBackend();
        return { success: true };
      }
    } else {
      // Development mode - no backend running
      console.log("[*] Development mode: Configuration saved, no backend to reload");
      return { success: true };
    }
  } catch (error) {
    throw new Error('Failed to save provider priority: ' + error.message);
  }
});

// IPC handlers for llama.cpp toggle
ipcMain.handle('get-llama-cpp-status', async () => {
  const envPath = path.join(baseDir, '.env');
  
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/LLAMA_CPP_ENABLED\s*=\s*["']?([^"'\r\n]+)["']?/);
      if (match) {
        const enabled = ['1', 'true', 'yes', 'on'].includes(match[1].toLowerCase());
        const modelMatch = envContent.match(/LLAMA_CPP_MODEL_PATH\s*=\s*["']?([^"'\r\n]+)["']?/);
        return {
          enabled: enabled,
          modelPath: modelMatch ? modelMatch[1] : ''
        };
      }
    }
  } catch (error) {
    console.error('Failed to read llama.cpp status:', error);
  }
  
  return { enabled: false, modelPath: '' };
});

ipcMain.handle('set-llama-cpp-enabled', async (event, enabled) => {
  const envPath = path.join(baseDir, '.env');
  
  try {
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    } else {
      const examplePath = path.join(baseDir, '.env.example');
      if (fs.existsSync(examplePath)) {
        envContent = fs.readFileSync(examplePath, 'utf8');
      }
    }
    
    const enabledString = enabled ? 'true' : 'false';
    
    if (envContent.includes('LLAMA_CPP_ENABLED')) {
      envContent = envContent.replace(/LLAMA_CPP_ENABLED\s*=\s*["']?[^"'\r\n]*["']?/, `LLAMA_CPP_ENABLED="${enabledString}"`);
    } else {
      envContent += `\nLLAMA_CPP_ENABLED="${enabledString}"`;
    }
    
    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
    
    // Only try to reload engine if backend is running (packaged mode)
    if (backendProcess) {
      // Use http module to reload engine
      try {
        const http = require('http');
        const data = JSON.stringify({});
        
        const req = http.request({
          hostname: '127.0.0.1',
          port: 8000,
          path: '/reload-engine',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
          }
        }, (res) => {
          if (res.statusCode === 200) {
            console.log("[*] Engine reloaded successfully");
          } else {
            console.log("[*] Engine reload failed, using fallback");
            restartBackend();
          }
        });
        
        req.on('error', (error) => {
          console.error("[*] Failed to reload engine:", error);
          restartBackend();
        });
        
        req.write(data);
        req.end();
        
        return { success: true };
      } catch (error) {
        console.error("[*] Error in reload process:", error);
        restartBackend();
        return { success: true };
      }
    } else {
      // Development mode - no backend running
      console.log("[*] Development mode: Configuration saved, no backend to reload");
      return { success: true };
    }
  } catch (error) {
    throw new Error('Failed to set llama.cpp enabled: ' + error.message);
  }
});

// IPC handlers for llama model management
ipcMain.handle('get-hardware-info', async () => {
  const pythonPath = path.join(baseDir, 'venv', 'Scripts', 'python.exe');
  const scriptPath = path.join(baseDir, 'core', 'llama_manager.py');
  
  if (!fs.existsSync(pythonPath) || !fs.existsSync(scriptPath)) {
    return {
      os: 'Unknown',
      architecture: 'Unknown',
      cpu_cores: 4,
      ram_gb: 8.0,
      gpu_info: { has_gpu: false, gpu_name: null, cuda_available: false },
      recommended_model: {
        name: 'Phi-3-mini-4k-instruct-Q4_K_M',
        repo: 'bartowski/Phi-3-mini-4k-instruct-GGUF',
        file: 'Phi-3-mini-4k-instruct-Q4_K_M.gguf',
        size_gb: 1.2,
        description: 'Lightweight model for 8GB RAM systems'
      }
    };
  }
  
  return new Promise((resolve) => {
    const python = spawn(pythonPath, [scriptPath, 'get_hardware_info'], {
      cwd: baseDir,
      windowsHide: true
    });
    
    let output = '';
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      console.error('[llama_manager error]:', data.toString());
    });
    
    python.on('close', (code) => {
      try {
        const result = JSON.parse(output.trim());
        resolve(result);
      } catch (e) {
        console.error('[llama_manager parse error]:', e);
        resolve({ error: 'Failed to parse hardware info' });
      }
    });
  });
});

ipcMain.handle('get-downloaded-models', async () => {
  const pythonPath = path.join(baseDir, 'venv', 'Scripts', 'python.exe');
  const scriptPath = path.join(baseDir, 'core', 'llama_manager.py');
  
  if (!fs.existsSync(pythonPath) || !fs.existsSync(scriptPath)) {
    return [];
  }
  
  return new Promise((resolve) => {
    const python = spawn(pythonPath, [scriptPath, 'get_downloaded_models'], {
      cwd: baseDir,
      windowsHide: true
    });
    
    let output = '';
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      console.error('[llama_manager error]:', data.toString());
    });
    
    python.on('close', (code) => {
      try {
        const result = JSON.parse(output.trim());
        resolve(result);
      } catch (e) {
        console.error('[llama_manager parse error]:', e);
        resolve([]);
      }
    });
  });
});

ipcMain.handle('get-available-models', async () => {
  const pythonPath = path.join(baseDir, 'venv', 'Scripts', 'python.exe');
  const scriptPath = path.join(baseDir, 'core', 'llama_manager.py');
  
  if (!fs.existsSync(pythonPath) || !fs.existsSync(scriptPath)) {
    return [];
  }
  
  return new Promise((resolve) => {
    const python = spawn(pythonPath, [scriptPath, 'get_available_models'], {
      cwd: baseDir,
      windowsHide: true
    });
    
    let output = '';
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      console.error('[llama_manager error]:', data.toString());
    });
    
    python.on('close', (code) => {
      try {
        const result = JSON.parse(output.trim());
        resolve(result);
      } catch (e) {
        console.error('[llama_manager parse error]:', e);
        resolve([]);
      }
    });
  });
});

let downloadProcess = null;

ipcMain.handle('download-model', async (event, repo, filename) => {
  const pythonPath = path.join(baseDir, 'venv', 'Scripts', 'python.exe');
  const scriptPath = path.join(baseDir, 'core', 'llama_manager.py');
  
  if (!fs.existsSync(pythonPath) || !fs.existsSync(scriptPath)) {
    throw new Error('Python or llama_manager not found');
  }
  
  return new Promise((resolve, reject) => {
    downloadProcess = spawn(pythonPath, [scriptPath, 'download_model', repo, filename], {
      cwd: baseDir,
      windowsHide: true
    });
    
    let output = '';
    downloadProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Try to parse progress updates
      try {
        const lines = text.trim().split('\n');
        for (const line of lines) {
          if (line.startsWith('PROGRESS:')) {
            const progressData = JSON.parse(line.substring(9));
            if (win) win.webContents.send('download-progress', progressData);
          }
        }
      } catch (e) {
        // Not a progress line, ignore
      }
    });
    
    downloadProcess.stderr.on('data', (data) => {
      console.error('[download error]:', data.toString());
    });
    
    downloadProcess.on('close', (code) => {
      downloadProcess = null;
      try {
        const result = JSON.parse(output.trim());
        if (result.success) {
          resolve(result);
        } else {
          reject(new Error(result.message || 'Download failed'));
        }
      } catch (e) {
        reject(new Error('Download failed'));
      }
    });
  });
});

ipcMain.handle('delete-model', async (event, filename) => {
  const pythonPath = path.join(baseDir, 'venv', 'Scripts', 'python.exe');
  const scriptPath = path.join(baseDir, 'core', 'llama_manager.py');
  
  if (!fs.existsSync(pythonPath) || !fs.existsSync(scriptPath)) {
    throw new Error('Python or llama_manager not found');
  }
  
  return new Promise((resolve, reject) => {
    const python = spawn(pythonPath, [scriptPath, 'delete_model', filename], {
      cwd: baseDir,
      windowsHide: true
    });
    
    let output = '';
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      console.error('[llama_manager error]:', data.toString());
    });
    
    python.on('close', (code) => {
      try {
        const result = JSON.parse(output.trim());
        if (result.success) {
          resolve(result);
        } else {
          reject(new Error(result.message || 'Delete failed'));
        }
      } catch (e) {
        reject(new Error('Delete failed'));
      }
    });
  });
});

ipcMain.handle('load-model', async (event, modelPath) => {
  const envPath = path.join(baseDir, '.env');
  
  try {
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    } else {
      const examplePath = path.join(baseDir, '.env.example');
      if (fs.existsSync(examplePath)) {
        envContent = fs.readFileSync(examplePath, 'utf8');
      }
    }
    
    // Update llama.cpp settings
    if (envContent.includes('LLAMA_CPP_ENABLED')) {
      envContent = envContent.replace(/LLAMA_CPP_ENABLED\s*=\s*["']?[^"'\r\n]*["']?/, 'LLAMA_CPP_ENABLED="true"');
    } else {
      envContent += `\nLLAMA_CPP_ENABLED="true"`;
    }
    
    if (envContent.includes('LLAMA_CPP_MODEL_PATH')) {
      envContent = envContent.replace(/LLAMA_CPP_MODEL_PATH\s*=\s*["']?[^"'\r\n]*["']?/, `LLAMA_CPP_MODEL_PATH="${modelPath}"`);
    } else {
      envContent += `\nLLAMA_CPP_MODEL_PATH="${modelPath}"`;
    }
    
    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
    
    // Only try to reload engine if backend is running (packaged mode)
    if (backendProcess) {
      // Use http module to reload engine
      try {
        const http = require('http');
        const data = JSON.stringify({});
        
        const req = http.request({
          hostname: '127.0.0.1',
          port: 8000,
          path: '/reload-engine',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
          }
        }, (res) => {
          if (res.statusCode === 200) {
            console.log("[*] Engine reloaded successfully");
          } else {
            console.log("[*] Engine reload failed, using fallback");
            restartBackend();
          }
        });
        
        req.on('error', (error) => {
          console.error("[*] Failed to reload engine:", error);
          restartBackend();
        });
        
        req.write(data);
        req.end();
        
        return { success: true };
      } catch (error) {
        console.error("[*] Error in reload process:", error);
        restartBackend();
        return { success: true };
      }
    } else {
      // Development mode - no backend running, just save config
      console.log("[*] Development mode: Configuration saved, no backend to reload");
      return { success: true };
    }
  } catch (error) {
    throw new Error('Failed to load model: ' + error.message);
  }
});

function restartBackend() {
  if (backendProcess) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
      } else {
        backendProcess.kill();
      }
    } catch (err) {
      console.error("Failed to terminate backend:", err);
    }
    backendProcess = null;
    startBackend();
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (backendProcess) {
    console.log("[*] Terminating bundled backend process...");
    // Force kill the child process on Windows
    spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
  }
  
  if (downloadProcess) {
    console.log("[*] Terminating download process...");
    downloadProcess.kill();
  }
});

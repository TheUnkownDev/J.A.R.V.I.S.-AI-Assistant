const { ipcRenderer } = require('electron');

const input = document.getElementById('user-input');
const chatLog = document.getElementById('chat-log');
const micBtn = document.getElementById('mic-btn');
const core = document.getElementById('jarvis-core');
const innerCore = core.querySelector('.inner-core');

const cpuBar = document.getElementById('cpu-bar');
const memBar = document.getElementById('mem-bar');
const volBar = document.getElementById('vol-bar');
const cpuVal = document.getElementById('cpu-val');
const memVal = document.getElementById('mem-val');
const volVal = document.getElementById('vol-val');

const BACKEND_URL = 'http://127.0.0.1:8000';

// State tracking
let isResponding = false;

function setCoreListen(responding) {
    isResponding = responding;
    if (responding) {
        core.classList.remove('idle');
        core.classList.add('responding');
        if (innerCore) {
            innerCore.classList.remove('idle');
            innerCore.classList.add('responding');
        }
    } else {
        core.classList.remove('responding');
        core.classList.add('idle');
        if (innerCore) {
            innerCore.classList.remove('responding');
            innerCore.classList.add('idle');
        }
    }
}

function addMessage(text, sender, isHTML = false) {
    const div = document.createElement('div');
    div.className = `msg msg-${sender}`;
    if (isHTML) {
        div.innerHTML = sender === 'jarvis' ? `> ${text}` : `[USER]: ${text}`;
    } else {
        div.innerText = sender === 'jarvis' ? `> ${text}` : `[USER]: ${text}`;
    }
    
    // Smooth scroll animation
    div.style.opacity = '0';
    div.style.transform = 'translateY(10px)';
    
    chatLog.appendChild(div);
    
    // Trigger animation
    requestAnimationFrame(() => {
        div.style.transition = 'all 0.4s ease';
        div.style.opacity = '1';
        div.style.transform = 'translateY(0)';
    });
    
    chatLog.scrollTop = chatLog.scrollHeight;
}

async function stopSpeech() {
    try {
        await fetch(`${BACKEND_URL}/stop`, { method: 'POST' });
    } catch (e) { console.error("Failed to stop speech"); }
}

function handleJarvisResponse(data) {
    if (!data) return;
    
    if (data.response) {
        addMessage(data.response, 'jarvis');
    }
    
    // Check for shutdown tool call
    if (data.tools_executed && data.tools_executed.some(t => t.name === 'shutdown_system')) {
        console.log("[*] Shutdown tool detected. Closing GUI immediately...");
        setTimeout(() => {
            ipcRenderer.send('quit-app');
        }, 500);
    }

    if (data.tools_executed && data.tools_executed.length > 0) {
        data.tools_executed.forEach(tool => {
            console.log(`Tool executed: ${tool.name} - ${tool.result}`);
        });
    }
}

async function sendMessage(msg) {
    if (!msg) return;
    
    await stopSpeech();
    addMessage(msg, 'user');
    setCoreListen(true);
    
    try {
        const res = await fetch(`${BACKEND_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });

        if (!res.ok) {
            const errorData = await res.json();
            addMessage(`Sir, my processors are reporting an error: ${errorData.detail || 'Internal Error'}`, 'jarvis');
            setCoreListen(false);
            return;
        }

        const data = await res.json();
        handleJarvisResponse(data);
        setCoreListen(false);
        
    } catch (error) {
        addMessage("I'm having trouble connecting to my core processors, sir. Please ensure the backend is running. <span id='open-keys-err' style='color: #00f6ff; text-decoration: underline; cursor: pointer; font-weight: bold;'>Configure API Keys</span>", 'jarvis', true);
        const errLink = document.getElementById('open-keys-err');
        if (errLink) {
            errLink.addEventListener('click', openSetupOverlay);
        }
        console.error(error);
        setCoreListen(false);
    }
}

async function updateStatus() {
    try {
        const res = await fetch(`${BACKEND_URL}/status`);
        const data = await res.json();
        
        // Smooth bar transitions with animation
        const updateBar = (bar, value, val, text) => {
            bar.style.transition = 'width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            bar.style.width = `${value}%`;
            val.style.transition = 'all 0.3s ease';
            val.innerText = text;
        };
        
        updateBar(cpuBar, data.cpu, cpuVal, `${Math.round(data.cpu)}%`);
        updateBar(memBar, data.memory, memVal, `${Math.round(data.memory)}%`);
        updateBar(volBar, data.volume, volVal, `${data.volume}%`);
    } catch (e) {
        // Silently fail status updates if backend is down
    }
}

// Listeners
input.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
        const msg = input.value.trim();
        input.value = '';
        await sendMessage(msg);
    }
});

core.addEventListener('click', async () => {
    await stopSpeech();
    // Add click animation
    core.style.animation = 'none';
    setTimeout(() => {
        core.style.animation = '';
    }, 10);
});

// Hover effects on core
core.addEventListener('mouseenter', () => {
    core.style.filter = 'brightness(1.3)';
});

core.addEventListener('mouseleave', () => {
    core.style.filter = 'brightness(1)';
});

micBtn.addEventListener('click', async () => {
    micBtn.style.color = "red";
    micBtn.style.animation = 'none';
    micBtn.style.transition = 'all 0.2s ease';
    micBtn.style.transform = 'scale(1.2)';
    micBtn.innerText = "🔴";
    
    try {
        const res = await fetch(`${BACKEND_URL}/listen`);
        const data = await res.json();
        if (data.text) {
            await sendMessage(data.text);
        }
    } catch (e) {
        addMessage("Sir, I'm unable to access the microphone array.", 'jarvis');
    } finally {
        micBtn.style.color = "#00f6ff";
        micBtn.style.transform = 'scale(1)';
        micBtn.innerText = "🎙️";
    }
});

// Mic button hover effect
micBtn.addEventListener('mouseenter', () => {
    micBtn.style.transition = 'all 0.2s ease';
    micBtn.style.filter = 'drop-shadow(0 0 8px #00f6ff)';
});

micBtn.addEventListener('mouseleave', () => {
    micBtn.style.filter = 'drop-shadow(0 0 0px #00f6ff)';
});

// View Toggling
const miniToggle = document.getElementById('mini-toggle');
const exitBtn = document.getElementById('exit-btn');
const fullView = document.getElementById('full-view');
const miniView = document.getElementById('mini-view');
const miniCore = document.getElementById('mini-core');
let isMini = false;

exitBtn.addEventListener('click', async () => {
    addMessage("Shutting down all systems, sir.", 'jarvis');
    
    // Shutdown animation
    const container = document.getElementById('full-view');
    if (container) {
        container.style.transition = 'all 0.8s ease';
        container.style.opacity = '0';
        container.style.transform = 'scale(0.95)';
    }
    
    setTimeout(() => {
        try {
            // 1. Tell backend to shut down
            fetch(`${BACKEND_URL}/shutdown`, { method: 'POST' });
            // 2. Close UI immediately
            ipcRenderer.send('quit-app');
        } catch (e) {
            ipcRenderer.send('quit-app'); // Force close UI anyway
        }
    }, 600);
});

// Exit button hover effect
exitBtn.addEventListener('mouseenter', () => {
    exitBtn.style.transition = 'all 0.2s ease';
    exitBtn.style.boxShadow = '0 0 10px rgba(255, 68, 68, 0.5)';
    exitBtn.style.transform = 'scale(1.05)';
});

exitBtn.addEventListener('mouseleave', () => {
    exitBtn.style.boxShadow = 'none';
    exitBtn.style.transform = 'scale(1)';
});

function toggleView() {
    isMini = !isMini;
    document.body.classList.toggle('mini-mode');
    if (isMini) {
        fullView.style.display = 'none';
        miniView.style.display = 'flex';
        ipcRenderer.send('resize-window', 150, 150);
    } else {
        fullView.style.display = 'grid';
        miniView.style.display = 'none';
        ipcRenderer.send('resize-window', 1200, 800);
    }
}

miniToggle.addEventListener('click', toggleView);
miniCore.addEventListener('click', toggleView);

// EventSource for background events (Wake Word)
const eventSource = new EventSource(`${BACKEND_URL}/events`);

eventSource.addEventListener('wakeword', (e) => {
    const data = JSON.parse(e.data);
    console.log("Wake word detected!");
    setCoreListen(true);
    setTimeout(() => { setCoreListen(false); }, 1000);
});

eventSource.addEventListener('user_speech', (e) => {
    const data = JSON.parse(e.data);
    addMessage(data.text, 'user');
    setCoreListen(true);
});

eventSource.addEventListener('jarvis_response', (e) => {
    const data = JSON.parse(e.data);
    setCoreListen(true);
    handleJarvisResponse(data);
    setCoreListen(false);
});

// Click-through handling
window.addEventListener('mousemove', (event) => {
    if (event.target === document.documentElement || event.target === document.body) {
        ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
    } else {
        ipcRenderer.send('set-ignore-mouse-events', false);
    }
});

// First-Time Setup Logic
async function openSetupOverlay() {
    const status = await ipcRenderer.invoke('check-api-keys');
    
    // Pre-populate keys
    document.getElementById('gemini-key-input').value = status.geminiKey || '';
    document.getElementById('groq-key-input').value = status.groqKey || '';

    const cancelBtn = document.getElementById('cancel-keys-btn');
    const saveBtn = document.getElementById('save-keys-btn');

    if (status.hasKeys) {
        cancelBtn.style.display = 'block';
        saveBtn.innerText = 'UPDATE CORE';
    } else {
        cancelBtn.style.display = 'none';
        saveBtn.innerText = 'INITIALIZE';
    }

    document.getElementById('setup-overlay').style.display = 'flex';
}

async function checkSetup() {
    const status = await ipcRenderer.invoke('check-api-keys');
    if (!status.hasKeys) {
        openSetupOverlay();
    }
}

document.getElementById('save-keys-btn').addEventListener('click', () => {
    const geminiKey = document.getElementById('gemini-key-input').value.trim();
    const groqKey = document.getElementById('groq-key-input').value.trim();

    if (!geminiKey && !groqKey) {
        alert("Sir, you must provide at least one API key for me to function.");
        return;
    }

    ipcRenderer.send('save-api-keys', { gemini: geminiKey, groq: groqKey });
    document.getElementById('setup-overlay').style.display = 'none';
    
    // Attempt to connect to backend after a short delay to allow it to spin up
    setTimeout(updateStatus, 3000);
});

document.getElementById('cancel-keys-btn').addEventListener('click', () => {
    document.getElementById('setup-overlay').style.display = 'none';
});

// ── SETTINGS MODAL ────────────────────────────────────────────────────────
const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('settings-btn');
const settingsCloseBtn = document.getElementById('settings-close-btn');
const settingsOverlay = document.querySelector('.settings-modal-overlay');

function openSettingsModal() {
    settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
    settingsModal.classList.add('hidden');
}

settingsBtn.addEventListener('click', openSettingsModal);
settingsCloseBtn.addEventListener('click', closeSettingsModal);
settingsOverlay.addEventListener('click', closeSettingsModal);

// Close modal when clicking outside the content
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal || e.target === settingsOverlay) {
        closeSettingsModal();
    }
});

// Key press to close modal (Escape)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !settingsModal.classList.contains('hidden')) {
        closeSettingsModal();
    }
});

// ── UPDATE button (inside settings modal) ──────────────────────────────────
function resetUpdateUI() {
    const header = document.getElementById('update-header');
    const progressBar = document.getElementById('update-progress-bar');
    const cancelBtn = document.getElementById('cancel-update-btn');
    const dismissBtn = document.getElementById('dismiss-update-btn');
    
    header.textContent = 'SYSTEM UPDATE';
    header.style.color = '#00ff00'; 
    progressBar.style.width = '0%';
    progressBar.style.backgroundColor = '#00ff00'; 
    cancelBtn.style.display = 'inline-block';
    dismissBtn.style.display = 'none';
}

document.getElementById('update-btn').addEventListener('click', async () => {
    closeSettingsModal();
    const overlay = document.getElementById('update-overlay');
    const statusText = document.getElementById('update-status-text');
    const progressBar = document.getElementById('update-progress-bar');
    
    resetUpdateUI();
    overlay.style.display = 'flex';
    statusText.textContent = 'Initiating system update sequence...';
    progressBar.style.width = '10%';

    await ipcRenderer.invoke('perform-update');
});

// ── KEYS button (inside settings modal) ────────────────────────────────────
document.getElementById('keys-btn').addEventListener('click', () => {
    closeSettingsModal();
    openSetupOverlay();
});

// ── MODELS button (inside settings modal) ───────────────────────────────────
document.getElementById('models-btn').addEventListener('click', () => {
    closeSettingsModal();
    openModelsOverlay();
});

// ── PROVIDER button (inside settings modal) ─────────────────────────────────
document.getElementById('provider-btn').addEventListener('click', () => {
    closeSettingsModal();
    openProviderOverlay();
});

let providerPriority = ['groq', 'gemini', 'llama_cpp'];

async function openProviderOverlay() {
    const overlay = document.getElementById('provider-overlay');
    overlay.style.display = 'flex';
    
    // Load current priority
    try {
        const currentPriority = await ipcRenderer.invoke('get-provider-priority');
        providerPriority = currentPriority;
    } catch (error) {
        console.error('Failed to load provider priority:', error);
    }
    
    renderProviderList();
    document.getElementById('current-priority').textContent = providerPriority.join(', ');
}

function closeProviderOverlay() {
    document.getElementById('provider-overlay').style.display = 'none';
}

function renderProviderList() {
    const list = document.getElementById('provider-list');
    list.innerHTML = '';
    
    const providerNames = {
        'groq': 'Groq API (Fastest)',
        'gemini': 'Google Gemini (Best Context)',
        'llama_cpp': 'Local Model (Offline)'
    };
    
    providerPriority.forEach((provider, index) => {
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 12px;
            margin-bottom: 8px;
            background: rgba(0, 246, 255, 0.1);
            border: 1px solid rgba(0, 246, 255, 0.3);
            border-radius: 5px;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        item.draggable = true;
        item.dataset.index = index;
        item.innerHTML = `
            <span style="color: #00f6ff; font-size: 0.9rem;">${index + 1}. ${providerNames[provider] || provider}</span>
            <span style="color: #a0d8ef; font-size: 0.8rem;">☰</span>
        `;
        
        // Drag events
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
        
        list.appendChild(item);
    });
}

let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    this.style.opacity = '0.5';
}

function handleDragOver(e) {
    e.preventDefault();
    this.style.borderTop = '2px solid #00f6ff';
}

function handleDrop(e) {
    e.preventDefault();
    if (this !== draggedItem) {
        const fromIndex = parseInt(draggedItem.dataset.index);
        const toIndex = parseInt(this.dataset.index);
        
        // Reorder array
        const item = providerPriority.splice(fromIndex, 1)[0];
        providerPriority.splice(toIndex, 0, item);
        
        renderProviderList();
        document.getElementById('current-priority').textContent = providerPriority.join(', ');
    }
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    document.querySelectorAll('#provider-list > div').forEach(item => {
        item.style.borderTop = '1px solid rgba(0, 246, 255, 0.3)';
    });
}

document.getElementById('save-priority-btn').addEventListener('click', async () => {
    try {
        await ipcRenderer.invoke('save-provider-priority', providerPriority);
        closeProviderOverlay();
        addMessage('AI provider priority updated successfully. Restart JARVIS to apply changes.', 'jarvis');
    } catch (error) {
        alert('Failed to save provider priority: ' + error.message);
    }
});

document.getElementById('close-provider-btn').addEventListener('click', closeProviderOverlay);

// ── LOCAL MODEL TOGGLE ─────────────────────────────────────────────────────────
document.getElementById('local-model-toggle').addEventListener('click', async () => {
    const toggle = document.getElementById('local-model-toggle');
    const status = document.getElementById('local-model-status');
    
    try {
        const currentState = await ipcRenderer.invoke('get-llama-cpp-status');
        const newState = !currentState.enabled;
        
        await ipcRenderer.invoke('set-llama-cpp-enabled', newState);
        
        if (newState) {
            toggle.textContent = 'DISABLE';
            toggle.style.background = 'rgba(255, 68, 68, 0.1)';
            toggle.style.borderColor = '#ff4444';
            toggle.style.color = '#ff4444';
            status.textContent = 'ONLINE';
            status.style.color = '#00ff00';
            addMessage('Local AI model enabled. Please ensure a model is loaded in settings.', 'jarvis');
        } else {
            toggle.textContent = 'ENABLE';
            toggle.style.background = 'rgba(0, 246, 255, 0.1)';
            toggle.style.borderColor = '#00f6ff';
            toggle.style.color = '#00f6ff';
            status.textContent = 'OFFLINE';
            status.style.color = '#a0d8ef';
            addMessage('Local AI model disabled. Switching to cloud APIs.', 'jarvis');
        }
    } catch (error) {
        alert('Failed to toggle local model: ' + error.message);
    }
});

async function openModelsOverlay() {
    const overlay = document.getElementById('models-overlay');
    overlay.style.display = 'flex';
    
    // Initialize local model toggle status first
    try {
        const status = await ipcRenderer.invoke('get-llama-cpp-status');
        const toggle = document.getElementById('local-model-toggle');
        const statusText = document.getElementById('local-model-status');
        
        if (status.enabled) {
            toggle.textContent = 'DISABLE';
            toggle.style.background = 'rgba(255, 68, 68, 0.1)';
            toggle.style.borderColor = '#ff4444';
            toggle.style.color = '#ff4444';
            statusText.textContent = 'ONLINE';
            statusText.style.color = '#00ff00';
        } else {
            toggle.textContent = 'ENABLE';
            toggle.style.background = 'rgba(0, 246, 255, 0.1)';
            toggle.style.borderColor = '#00f6ff';
            toggle.style.color = '#00f6ff';
            statusText.textContent = 'OFFLINE';
            statusText.style.color = '#a0d8ef';
        }
    } catch (error) {
        console.error('Failed to initialize local model toggle:', error);
    }
    
    // Load hardware info
    loadHardwareInfo();
    
    // Load downloaded models
    loadDownloadedModels();
    
    // Load available models
    loadAvailableModels();
}

function closeModelsOverlay() {
    document.getElementById('models-overlay').style.display = 'none';
}

document.getElementById('close-models-btn').addEventListener('click', closeModelsOverlay);

async function loadHardwareInfo() {
    const hardwareDiv = document.getElementById('hardware-details');
    hardwareDiv.innerHTML = 'Scanning hardware capabilities...';
    
    try {
        const hardware = await ipcRenderer.invoke('get-hardware-info');
        
        let html = `
            <div style="margin-bottom: 8px;"><strong>OS:</strong> ${hardware.os} (${hardware.architecture})</div>
            <div style="margin-bottom: 8px;"><strong>CPU Cores:</strong> ${hardware.cpu_cores}</div>
            <div style="margin-bottom: 8px;"><strong>RAM:</strong> ${hardware.ram_gb} GB</div>
            <div style="margin-bottom: 8px;"><strong>GPU:</strong> ${hardware.gpu_info.has_gpu ? hardware.gpu_info.gpu_name : 'Not detected'}</div>
            <div style="margin-top: 10px; padding: 10px; background: rgba(0, 255, 0, 0.1); border: 1px solid #00ff00; border-radius: 3px;">
                <strong style="color: #00ff00;">⭐ RECOMMENDED MODEL:</strong><br>
                ${hardware.recommended_model.name}<br>
                <small>${hardware.recommended_model.description}</small>
            </div>
        `;
        
        hardwareDiv.innerHTML = html;
    } catch (error) {
        hardwareDiv.innerHTML = 'Failed to scan hardware: ' + error.message;
    }
}

async function loadDownloadedModels() {
    const modelsDiv = document.getElementById('downloaded-models-list');
    modelsDiv.innerHTML = 'Loading downloaded models...';
    
    try {
        const models = await ipcRenderer.invoke('get-downloaded-models');
        const llamaStatus = await ipcRenderer.invoke('get-llama-cpp-status');
        
        if (models.length === 0) {
            modelsDiv.innerHTML = '<div style="color: #a0d8ef; font-family: \'Rajdhani\'; font-size: 0.9rem;">No models downloaded yet.</div>';
            return;
        }
        
        let html = '';
        models.forEach(model => {
            const isLoaded = llamaStatus.enabled && llamaStatus.modelPath && model.path === llamaStatus.modelPath;
            const isActiveClass = isLoaded ? 'rgba(0, 255, 0, 0.2)' : 'rgba(0, 246, 255, 0.1)';
            const isActiveBorder = isLoaded ? '#00ff00' : 'rgba(0, 246, 255, 0.3)';
            const activeIndicator = isLoaded ? '<span style="color: #00ff00; font-size: 0.7rem; margin-left: 5px;">● ACTIVE</span>' : '';
            
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin-bottom: 8px; background: ${isActiveClass}; border: 1px solid ${isActiveBorder}; border-radius: 3px;">
                    <div>
                        <div style="color: #00f6ff; font-weight: bold;">${model.name} ${activeIndicator}</div>
                        <div style="color: #a0d8ef; font-size: 0.8rem;">${model.size_gb} GB</div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        ${isLoaded 
                            ? `<button onclick="unloadModel('${model.path}')" style="background: rgba(255, 68, 68, 0.1); border: 1px solid #ff4444; color: #ff4444; padding: 5px 10px; cursor: pointer; font-size: 0.8rem;">UNLOAD</button>`
                            : `<button onclick="loadModel('${model.path}')" style="background: rgba(0, 255, 0, 0.1); border: 1px solid #00ff00; color: #00ff00; padding: 5px 10px; cursor: pointer; font-size: 0.8rem;">LOAD</button>`
                        }
                        <button onclick="deleteModel('${model.file}')" style="background: rgba(255, 68, 68, 0.1); border: 1px solid #ff4444; color: #ff4444; padding: 5px 10px; cursor: pointer; font-size: 0.8rem;">DELETE</button>
                    </div>
                </div>
            `;
        });
        
        modelsDiv.innerHTML = html;
    } catch (error) {
        modelsDiv.innerHTML = 'Failed to load models: ' + error.message;
    }
}

async function loadAvailableModels() {
    const modelsDiv = document.getElementById('available-models-list');
    modelsDiv.innerHTML = 'Loading available models...';
    
    try {
        const models = await ipcRenderer.invoke('get-available-models');
        
        let html = '';
        models.forEach(model => {
            const recommendedBadge = model.recommended === 'MAIN' 
                ? '<span style="background: #00ff00; color: black; padding: 2px 6px; border-radius: 3px; font-size: 0.7rem; margin-left: 5px;">MAIN RECOMMENDATION</span>'
                : model.recommended 
                ? '<span style="background: rgba(0, 246, 255, 0.3); color: #00f6ff; padding: 2px 6px; border-radius: 3px; font-size: 0.7rem; margin-left: 5px;">RECOMMENDED</span>'
                : '';
            
            html += `
                <div style="padding: 10px; margin-bottom: 8px; background: rgba(0, 246, 255, 0.05); border: 1px solid rgba(0, 246, 255, 0.2); border-radius: 3px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="color: #00f6ff; font-weight: bold;">${model.name} ${recommendedBadge}</div>
                            <div style="color: #a0d8ef; font-size: 0.8rem; margin-top: 5px;">${model.description}</div>
                            <div style="color: #a0d8ef; font-size: 0.8rem;">Size: ${model.size_gb} GB</div>
                        </div>
                        <button onclick="downloadModel('${model.repo}', '${model.file}', '${model.name}')" style="background: rgba(0, 246, 255, 0.1); border: 1px solid #00f6ff; color: #00f6ff; padding: 8px 15px; cursor: pointer; font-size: 0.8rem;">DOWNLOAD</button>
                    </div>
                </div>
            `;
        });
        
        modelsDiv.innerHTML = html;
    } catch (error) {
        modelsDiv.innerHTML = 'Failed to load available models: ' + error.message;
    }
}

async function downloadModel(repo, filename, modelName) {
    const progressContainer = document.getElementById('download-progress-container');
    const progressBar = document.getElementById('download-progress-bar');
    const statusText = document.getElementById('download-status-text');
    
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    statusText.textContent = `Starting download: ${modelName}...`;
    
    try {
        await ipcRenderer.invoke('download-model', repo, filename);
        statusText.textContent = 'Download completed successfully!';
        progressBar.style.width = '100%';
        
        setTimeout(() => {
            progressContainer.style.display = 'none';
            loadDownloadedModels();
        }, 2000);
    } catch (error) {
        statusText.textContent = 'Download failed: ' + error.message;
        progressBar.style.backgroundColor = '#ff4444';
        
        setTimeout(() => {
            progressContainer.style.display = 'none';
            progressBar.style.backgroundColor = '#00f6ff';
        }, 3000);
    }
}

async function deleteModel(filename) {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) {
        return;
    }
    
    try {
        await ipcRenderer.invoke('delete-model', filename);
        loadDownloadedModels();
    } catch (error) {
        alert('Failed to delete model: ' + error.message);
    }
}

async function loadModel(modelPath) {
    try {
        const result = await ipcRenderer.invoke('load-model', modelPath);
        // Refresh the model list to update button states
        loadDownloadedModels();
    } catch (error) {
        console.error('Failed to load model:', error);
    }
}

async function unloadModel(modelPath) {
    try {
        // Disable the model by setting LLAMA_CPP_ENABLED to false
        await ipcRenderer.invoke('set-llama-cpp-enabled', false);
        // Refresh the model list to update button states
        loadDownloadedModels();
    } catch (error) {
        console.error('Failed to unload model:', error);
    }
}

// Listen for download progress updates
ipcRenderer.on('download-progress', (event, progress) => {
    const progressBar = document.getElementById('download-progress-bar');
    const statusText = document.getElementById('download-status-text');
    
    progressBar.style.width = `${progress.percentage}%`;
    statusText.textContent = `Downloading: ${progress.percentage.toFixed(1)}% (${(progress.downloaded / (1024 * 1024)).toFixed(1)} MB / ${(progress.total / (1024 * 1024)).toFixed(1)} MB)`;
});

document.getElementById('cancel-update-btn').addEventListener('click', () => {
    const overlay = document.getElementById('update-overlay');
    overlay.style.display = 'none';
    ipcRenderer.send('cancel-update');
});

document.getElementById('dismiss-update-btn').addEventListener('click', () => {
    const overlay = document.getElementById('update-overlay');
    overlay.style.display = 'none';
});

// ── Update overlay IPC events (from main.js) ───────────────────────────────
ipcRenderer.on('show-update-overlay', (event, message) => {
    const overlay = document.getElementById('update-overlay');
    const statusText = document.getElementById('update-status-text');
    const progressBar = document.getElementById('update-progress-bar');
    
    resetUpdateUI();
    overlay.style.display = 'flex';
    if (message) statusText.textContent = message;
    progressBar.style.width = '20%';
});

ipcRenderer.on('update-status', (event, message) => {
    const statusText = document.getElementById('update-status-text');
    const progressBar = document.getElementById('update-progress-bar');
    if (statusText && message) {
        statusText.textContent = message;
        // Update progress based on message content
        if (message.includes('Checking')) progressBar.style.width = '30%';
        else if (message.includes('Backup')) progressBar.style.width = '40%';
        else if (message.includes('Git')) progressBar.style.width = '50%';
        else if (message.includes('Synchronizing')) progressBar.style.width = '60%';
        else if (message.includes('dependencies')) progressBar.style.width = '75%';
        else if (message.includes('complete') || message.includes('success')) progressBar.style.width = '100%';
    }
});

ipcRenderer.on('update-progress', (event, progress) => {
    const progressBar = document.getElementById('update-progress-bar');
    if (progressBar) progressBar.style.width = `${progress}%`;
});

ipcRenderer.on('update-success', (event, message) => {
    const header = document.getElementById('update-header');
    const statusText = document.getElementById('update-status-text');
    const progressBar = document.getElementById('update-progress-bar');
    const cancelBtn = document.getElementById('cancel-update-btn');
    const dismissBtn = document.getElementById('dismiss-update-btn');
    
    const isAlreadyUpToDate = message && (
        message.toLowerCase().includes('already up to date') || 
        message.toLowerCase().includes('already up-to-date') || 
        message.toLowerCase().includes('no updates needed')
    );
    
    if (isAlreadyUpToDate) {
        header.textContent = 'SYSTEM UP TO DATE';
        header.style.color = '#00f6ff';
        progressBar.style.width = '100%';
        progressBar.style.backgroundColor = '#00f6ff';
    } else {
        header.textContent = 'UPDATE SUCCEEDED';
        header.style.color = '#00ff00';
        progressBar.style.width = '100%';
        progressBar.style.backgroundColor = '#00ff00';
    }
    
    statusText.textContent = message || 'System successfully updated.';
    cancelBtn.style.display = 'none';
    
    // If it's about to restart/relaunch, don't show the dismiss button to avoid confusion
    if (message && !message.includes('Restarting') && !message.includes('relaunch')) {
        dismissBtn.style.display = 'inline-block';
    } else if (!message) {
        dismissBtn.style.display = 'inline-block';
    }
});

ipcRenderer.on('update-error', (event, error) => {
    const header = document.getElementById('update-header');
    const statusText = document.getElementById('update-status-text');
    const progressBar = document.getElementById('update-progress-bar');
    const cancelBtn = document.getElementById('cancel-update-btn');
    const dismissBtn = document.getElementById('dismiss-update-btn');
    
    header.textContent = 'UPDATE FAILED';
    header.style.color = '#ff3c3c';
    progressBar.style.width = '100%';
    progressBar.style.backgroundColor = '#ff3c3c';
    statusText.textContent = error || 'An error occurred during update.';
    
    cancelBtn.style.display = 'none';
    dismissBtn.style.display = 'inline-block';
});

ipcRenderer.on('hide-update-overlay', () => {
    const overlay = document.getElementById('update-overlay');
    const progressBar = document.getElementById('update-progress-bar');
    overlay.style.display = 'none';
    progressBar.style.width = '0%';
});

// Init
checkSetup();
setInterval(updateStatus, 2000);
updateStatus();
setCoreListen(false); // Start in idle state

const pointerNode = document.getElementById('custom-pointer');
let currentPointerStyle = 'default';
let audioToneGainVolume = 0.15;
let workerArrayPool = [];

function generateWorkerBlob() {
    const code = `
        let active = false;
        self.onmessage = function(e) {
            if(e.data === 'start') {
                active = true;
                let count = 0;
                while(active && count < 10) {
                    let acc = 0; for(let i=0; i<45000000; i++) { acc += Math.atan(i) * Math.sin(i); }
                    count++;
                    self.postMessage({ type: 'progress', cycle: count });
                }
                self.postMessage({ type: 'done' });
            } else if(e.data === 'stop') { active = false; }
        };
    `;
    return URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
}
const sharedWorkerBlobUrl = generateWorkerBlob();

function writeAuditLog(msg) {
    const consoleEl = document.getElementById('audit-console');
    if (consoleEl) {
        const time = new Date().toISOString().slice(11, 19);
        consoleEl.innerText = `[${time}] ${msg}\n` + consoleEl.innerText;
    }
}

function purgeConsoleLogs() {
    const consoleEl = document.getElementById('audit-console');
    if (consoleEl) consoleEl.innerText = `[${new Date().toISOString().slice(11, 19)}] Event trace purged cleanly.`;
}

const colorPicker = document.getElementById('theme-color-picker');
if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
        accentColor = e.target.value;
        document.documentElement.style.setProperty('--accent-main', accentColor);
        const lLat = document.getElementById('legend-latency');
        if (lLat) lLat.style.color = accentColor;
        updateCustomPointerLayout();
    });
}

const audioVol = document.getElementById('audio-volume-slider');
if (audioVol) {
    audioVol.addEventListener('input', (e) => {
        audioToneGainVolume = parseFloat(e.target.value) / 100;
    });
}

const pointerSel = document.getElementById('pointer-style-selector');
if (pointerSel) {
    pointerSel.addEventListener('change', (e) => {
        currentPointerStyle = e.target.value;
        updateCustomPointerLayout();
    });
}

function updateCustomPointerLayout() {
    if (!pointerNode) return;
    if (currentPointerStyle === 'default') {
        document.body.style.cursor = 'auto';
        pointerNode.className = ''; pointerNode.style.cssText = '';
    } else {
        document.body.style.cursor = 'none';
        pointerNode.className = currentPointerStyle;
        pointerNode.style.position = 'fixed';
        pointerNode.style.pointerEvents = 'none';
        pointerNode.style.zIndex = '99999';
        pointerNode.style.transform = 'translate(-50%, -50%)';
        
        if (currentPointerStyle === 'quantum') {
            pointerNode.style.width = '24px'; pointerNode.style.height = '24px';
            pointerNode.style.borderRadius = '50%'; pointerNode.style.border = `2px solid ${accentColor}`;
            pointerNode.style.boxShadow = `0 0 12px ${accentColor}`;
        } else if (currentPointerStyle === 'precision') {
            pointerNode.style.width = '6px'; pointerNode.style.height = '6px';
            pointerNode.style.borderRadius = '50%'; pointerNode.style.background = accentColor;
        } else if (currentPointerStyle === 'stealth') {
            pointerNode.style.width = '40px'; pointerNode.style.height = '40px';
            pointerNode.style.borderRadius = '50%'; pointerNode.style.background = `radial-gradient(circle, ${accentColor}33 0%, transparent 70%)`;
        }
    }
}

window.addEventListener('mousemove', (e) => {
    const coords = document.getElementById('pointer-coordinates');
    if (coords) coords.innerText = `X: ${e.clientX} | Y: ${e.clientY}`;
    if (pointerNode && currentPointerStyle !== 'default') {
        pointerNode.style.left = `${e.clientX}px`; pointerNode.style.top = `${e.clientY}px`;
    }
});

function triggerAudioPulse(freq, type) {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type; osc.frequency.value = freq;
        gain.gain.setValueAtTime(audioToneGainVolume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.5);
        writeAuditLog(`Wave oscillator generated: ${freq}Hz (${type})`);
    } catch(e) { writeAuditLog(`Audio context focal restraint: ${e.message}`); }
}

function executeCoreStressBenchmark() {
    writeAuditLog("Deploying synchronous local thread math loop profile...");
    setTimeout(() => {
        const t0 = performance.now();
        let acc = 0; for(let i=0; i<30000000; i++) acc += Math.sqrt(i);
        writeAuditLog(`Local execution test finished inside ${(performance.now() - t0).toFixed(1)}ms.`);
    }, 20);
}

function triggerHyperStressLoop() {
    if (structuralMatrixTestLoopActive) return writeAuditLog("An asynchronous computation stress channel is already running.");
    structuralMatrixTestLoopActive = true;
    
    const threadCount = parseInt(document.getElementById('stressor-threads-selector').value) || 1;
    writeAuditLog(`Deploying ${threadCount} parallel runtime execution streams onto separate WebWorker instances...`);
    
    let activeFinishedCount = 0;
    for(let i=0; i<threadCount; i++) {
        const w = new Worker(sharedWorkerBlobUrl);
        w.onmessage = function(e) {
            if (e.data.type === 'progress') {
                writeAuditLog(`Worker instance [#${i+1}] tracking cycles completed: [${e.data.cycle}/10]`);
            } else if (e.data.type === 'done') {
                activeFinishedCount++;
                w.terminate();
                if(activeFinishedCount >= threadCount) {
                    writeAuditLog("Parallel background workers tracking cycles completed cleanly.");
                    structuralMatrixTestLoopActive = false;
                }
            }
        };
        w.postMessage('start');
        workerArrayPool.push(w);
    }
}

function syncStorageViews() {
    try { document.getElementById('local-storage-status').innerText = `${Object.keys(localStorage).length} Committed Keys`; } catch(e) {}
    try { document.getElementById('session-storage-status').innerText = `${Object.keys(sessionStorage).length} Tab Keys`; } catch(e) {}
}

function commitStorageRecord(type) {
    const k = `metric_${Math.floor(Math.random()*1000)}`;
    const v = `stamp_${Date.now()}`;
    if (type === 'local') localStorage.setItem(k, v); else sessionStorage.setItem(k, v);
    writeAuditLog(`Committed payload element key [${k}] to isolated ${type} array.`);
    syncStorageViews();
}

function verifyIndexedDBStore() {
    const req = indexedDB.open("SystemTelemetryDB", 1);
    req.onupgradeneeded = (e) => { e.target.result.createObjectStore("records", { autoIncrement: true }); };
    req.onsuccess = () => {
        const idb = document.getElementById('idb-status');
        if (idb) idb.innerText = "Linked Store";
        writeAuditLog("IndexedDB database instance structure verified successfully.");
    };
}

function requestGeolocationTelemetry() {
    navigator.geolocation.getCurrentPosition(
        p => writeAuditLog(`Coords established: [Lat: ${p.coords.latitude.toFixed(4)}, Lon: ${p.coords.longitude.toFixed(4)}]`),
        err => writeAuditLog(`Location interface fault: ${err.message}`)
    );
}

async function requestMediaHardwareStream() {
    try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        writeAuditLog("Handshake approved: Connected to system camera and audio components.");
        s.getTracks().forEach(t => t.stop());
    } catch(err) { writeAuditLog(`Media matching failure: ${err.message}`); }
}

async function requestUSBDeviceAccess() {
    try {
        const dev = await navigator.usb.requestDevice({ filters: [] });
        writeAuditLog(`USB channel aligned -> Product Identity: ${dev.productName || 'Device'}`);
    } catch(e) { writeAuditLog(`USB interface picker closed: ${e.message}`); }
}

async function requestHIDDeviceAccess() {
    try {
        const dev = await navigator.hid.requestDevice({ filters: [] });
        writeAuditLog(dev.length ? `HID aligned -> Product Identity: ${dev.productName}` : "HID modal cleared without association.");
    } catch(e) { writeAuditLog(`HID interface selection aborted: ${e.message}`); }
}

window.addEventListener('deviceorientation', (e) => {
    if(e.beta !== null) {
        const b = document.getElementById('gyro-b');
        const g = document.getElementById('gyro-g');
        if (b) b.innerText = `${Math.round(e.beta)}°`;
        if (g) g.innerText = `${Math.round(e.gamma)}°`;
    }
});

setInterval(() => {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const count = Array.from(gamepads).filter(g => g !== null).length;
    const el = document.getElementById('gamepads-count');
    if(el) el.innerText = `${count} Active Nodes`;
}, 1500);

function exportAuditLedger() {
    const dataUri = "data:text/plain;charset=utf-8," + encodeURIComponent(consoleElement.innerText);
    const anchor = document.createElement('a');
    anchor.setAttribute("href", dataUri); anchor.setAttribute("download", `sandbox_audit_${Date.now()}.txt`);
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
}

syncStorageViews();

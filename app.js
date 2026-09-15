const consoleElement = document.getElementById('audit-console');
const canvas = document.getElementById('telemetry-chart');
const ctx = canvas ? canvas.getContext('2d') : null;

const maxPoints = 40;
const runLogs = { latency: Array(maxPoints).fill(0), fps: Array(maxPoints).fill(0), memory: Array(maxPoints).fill(0) };

let frameCount = 0;
let lastFpsUpdate = performance.now();
let activeCalculatedFps = 60;
let accentColor = '#2997ff';
let structuralMatrixTestLoopActive = false;
const startTimeIndex = performance.now();

function runTelemetryLoop() {
    frameCount++;
    const currentTick = performance.now();
    if (currentTick >= lastFpsUpdate + 1000) {
        activeCalculatedFps = Math.round((frameCount * 1000) / (currentTick - lastFpsUpdate));
        const fpsEl = document.getElementById('fps-val');
        if (fpsEl) fpsEl.innerText = `${activeCalculatedFps} FPS`;
        
        if (activeCalculatedFps < 30) document.documentElement.style.setProperty('--alert-color', '#ff453a');
        else if (activeCalculatedFps < 50) document.documentElement.style.setProperty('--alert-color', '#ff9f0a');
        else document.documentElement.style.setProperty('--alert-color', '#30d158');
        
        runLogs.fps.shift();
        runLogs.fps.push(activeCalculatedFps);
        frameCount = 0;
        lastFpsUpdate = currentTick;
    }
    requestAnimationFrame(runTelemetryLoop);
}

function sampleExecutionLatencies() {
    const startDeltaTime = performance.now();
    requestAnimationFrame(() => {
        const delta = (performance.now() - startDeltaTime).toFixed(1);
        const latEl = document.getElementById('thread-latency');
        const upEl = document.getElementById('uptime-val');
        if (latEl) latEl.innerText = `${delta} ms`;
        if (upEl) upEl.innerText = `${((performance.now() - startTimeIndex)/1000).toFixed(1)}s`;
        
        runLogs.latency.shift();
        runLogs.latency.push(parseFloat(delta));
        
        updateSystemChronometer();
        sampleMemoryAllocations();
        if (ctx) plotMultiAxisChart();
    });
}

function updateSystemChronometer() {
    const d = new Date();
    const lt = document.getElementById('local-time');
    const ut = document.getElementById('utc-time');
    if (lt) lt.innerText = d.toTimeString().split(' ');
    if (ut) ut.innerText = d.toUTCString().slice(17, 25) + ' UTC';
}

function sampleMemoryAllocations() {
    const usedEl = document.getElementById('heap-used');
    const limitEl = document.getElementById('heap-limit');
    if (performance && performance.memory) {
        const used = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
        const limit = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
        if (usedEl) usedEl.innerText = `${used} MB`;
        if (limitEl) limitEl.innerText = `${limit} MB`;
        runLogs.memory.shift();
        runLogs.memory.push(parseFloat(used));
    } else {
        if (usedEl) usedEl.innerText = 'Chromium Bound';
        if (limitEl) limitEl.innerText = 'Restricted';
        runLogs.memory.shift(); runLogs.memory.push(0);
    }
}

function plotMultiAxisChart() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const step = canvas.width / (maxPoints - 1);
    const h = canvas.height;
    
    const maxLat = Math.max(...runLogs.latency, 25);
    const maxFps = Math.max(...runLogs.fps, 75);
    const maxMem = Math.max(...runLogs.memory, 100);

    function drawPath(data, limit, hexColor) {
        ctx.beginPath(); ctx.strokeStyle = hexColor; ctx.lineWidth = 2.5;
        for (let i = 0; i < data.length; i++) {
            const x = i * step;
            const y = h - ((data[i] / limit) * (h - 40)) - 20;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    drawPath(runLogs.latency, maxLat, accentColor);
    drawPath(runLogs.fps, maxFps, '#30d158');
    if (maxMem > 0) drawPath(runLogs.memory, maxMem, '#af52de');
}

function initializeStaticMatrixData() {
    const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    setTxt('cpu-cores', `${navigator.hardwareConcurrency || 'N/A'} Core Threads`);
    setTxt('language-val', navigator.language || 'Unknown');
    setTxt('timezone-val', Intl.DateTimeFormat().resolvedOptions().timeZone);
    setTxt('display-pipeline', `${screen.width}×${screen.height}`);
    setTxt('viewport-dim', `${window.innerWidth}×${window.innerHeight}`);
    setTxt('color-depth', `${screen.colorDepth}-bit`);
    setTxt('pixel-ratio', `${window.devicePixelRatio || 1}x`);
    setTxt('online-flag', navigator.onLine ? "Online" : "Offline");
    setTxt('cookie-clear', navigator.cookieEnabled ? "Allowed" : "Blocked");
    setTxt('browser-engine', navigator.vendor || "Open Runtime Architecture");

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
        setTxt('net-rtt', connection.rtt ? `${connection.rtt} ms` : 'N/A');
        setTxt('net-downlink', connection.downlink ? `${connection.downlink} Mbps` : 'N/A');
    }

    try {
        navigator.storage.persisted().then(p => setTxt('storage-persist', p ? "Persistent Vault" : "Transient Store"));
    } catch(e) { setTxt('storage-persist', "Implicit Sandbox"); }

    try {
        const canvasRef = document.createElement('canvas');
        const gl = canvasRef.getContext('webgl') || canvasRef.getContext('experimental-webgl');
        if (gl) {
            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            setTxt('gpu-val', ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "Software Abstract Layer");
        }
    } catch(err) { setTxt('gpu-val', "Access Restrained Policy"); }
}

if (canvas) {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
initializeStaticMatrixData();
requestAnimationFrame(runTelemetryLoop);
setInterval(sampleExecutionLatencies, 1000);

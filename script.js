// Configuration & State
let state = {
    moisture: 45,
    isPumpOn: false,
    isAutoMode: true,
    temperature: 28,
    humidity: 12,
    windSpeed: 15,
    logs: [
        { time: "19:00", message: "Sistema inicializado" },
        { time: "18:45", message: "Bomba desligada automaticamente" },
        { time: "18:30", message: "Irrigação concluída" }
    ]
};

// DOM Elements
const moistureValueEl = document.getElementById('moisture-value');
const moistureStatusEl = document.getElementById('moisture-status');
const gaugeProgress = document.querySelector('.gauge-progress');
const pumpToggle = document.getElementById('pump-toggle');
const pumpStatusText = document.getElementById('pump-status-text');
const pumpAnimation = document.getElementById('pump-animation');
const autoModeStatus = document.getElementById('auto-mode-status');
const currentTempEl = document.getElementById('current-temp');
const weatherHumidityEl = document.getElementById('weather-humidity');
const windSpeedEl = document.getElementById('wind-speed');
const logListEl = document.getElementById('activity-logs');

// Initialize Gauge
const setGaugeValue = (value) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;
    gaugeProgress.style.strokeDashoffset = offset;
    moistureValueEl.textContent = Math.round(value);
    
    // Color logic
    if (value < 30) {
        gaugeProgress.style.stroke = "#ef4444"; // Red
        moistureStatusEl.textContent = "Solo Muito Seco - Perigo!";
        moistureStatusEl.style.color = "#ef4444";
    } else if (value < 60) {
        gaugeProgress.style.stroke = "#f1c40f"; // Yellow
        moistureStatusEl.textContent = "Solo Seco - Necessita Água";
        moistureStatusEl.style.color = "#f1c40f";
    } else {
        gaugeProgress.style.stroke = "#2ecc71"; // Green
        moistureStatusEl.textContent = "Umidade Ideal";
        moistureStatusEl.style.color = "#2ecc71";
    }
};

// Update Pump Logic
const updatePump = (isOn, manual = false) => {
    state.isPumpOn = isOn;
    pumpToggle.checked = isOn;
    pumpStatusText.textContent = isOn ? "Ligada" : "Desligada";
    pumpStatusText.style.color = isOn ? "#2ecc71" : "#94a3b8";
    
    if (isOn) {
        pumpAnimation.classList.add('pump-active');
        document.getElementById('water-flow').parentElement.classList.add('pump-active');
    } else {
        pumpAnimation.classList.remove('pump-active');
        document.getElementById('water-flow').parentElement.classList.remove('pump-active');
    }

    if (manual) {
        addLog(isOn ? "Bomba ligada manualmente" : "Bomba desligada manualmente");
    }
};

// Activity Logs
const addLog = (message) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    state.logs.unshift({ time: timeStr, message });
    if (state.logs.length > 5) state.logs.pop();
    renderLogs();
};

const renderLogs = () => {
    logListEl.innerHTML = state.logs
        .map(log => `<li><span class="log-time">${log.time}</span> ${log.message}</li>`)
        .join('');
};

// Simulation Loop
setInterval(() => {
    // 1. Update moisture
    if (state.isPumpOn) {
        state.moisture += Math.random() * 2; // Moisture increases fast when pump is on
        if (state.moisture > 85) {
            if (state.isAutoMode) {
                updatePump(false);
                addLog("Bomba desligada automaticamente (Humidade Ideal)");
            }
        }
    } else {
        state.moisture -= Math.random() * 0.5; // Naturally dries up
        if (state.moisture < 25) {
            if (state.isAutoMode && !state.isPumpOn) {
                updatePump(true);
                addLog("Bomba ligada automaticamente (Solo Seco)");
            }
        }
    }
    
    // Bounds
    if (state.moisture < 0) state.moisture = 0;
    if (state.moisture > 100) state.moisture = 100;
    
    setGaugeValue(state.moisture);

    // 2. Update Weather (Slow fluctuations)
    state.temperature += (Math.random() - 0.5) * 0.1;
    state.humidity += (Math.random() - 0.5) * 0.2;
    
    currentTempEl.textContent = Math.round(state.temperature);
    weatherHumidityEl.textContent = Math.round(Math.max(0, state.humidity)) + "%";
}, 2000);

// Event Listeners
pumpToggle.addEventListener('change', (e) => {
    updatePump(e.target.checked, true);
    // When manual toggle happens, we could briefly disable auto mode or keep it.
    // Let's keep it simple: manual override doesn't disable auto, but auto will re-evaluate on next cycle.
});

// Initial Setup
renderLogs();
setGaugeValue(state.moisture);
updatePump(state.isPumpOn);

// Configuration & State
const CONFIG = {
    CRITICAL_LOW: 25,
    CRITICAL_HIGH: 85,
    UPDATE_INTERVAL: 2000,
    CHART_POINTS: 20
};

let state = {
    moisture: 45,
    isPumpOn: false,
    isAutoMode: true,
    temperature: 28,
    humidity: 12,
    windSpeed: 15,
    maxTemp: 31,
    moistureHistory: Array(CONFIG.CHART_POINTS).fill(45),
    timeLabels: Array(CONFIG.CHART_POINTS).fill(''),
    logs: [
        { time: "10:30", message: "Sistema inicializado com sucesso" },
        { time: "10:31", message: "Conexão com sensores estabelecida" }
    ]
};

// DOM Elements
const elements = {
    moistureValue: document.getElementById('moisture-value'),
    moistureStatus: document.getElementById('moisture-status'),
    gaugeProgress: document.querySelector('.gauge-progress'),
    pumpToggle: document.getElementById('pump-toggle'),
    pumpStatusText: document.getElementById('pump-status-text'),
    pumpVisual: document.querySelector('.pump-visual'),
    autoModeStatus: document.getElementById('auto-mode-status'),
    currentTemp: document.getElementById('current-temp'),
    weatherHumidity: document.getElementById('weather-humidity'),
    windSpeed: document.getElementById('wind-speed'),
    maxTemp: document.getElementById('max-temp'),
    logList: document.getElementById('activity-logs'),
    notificationContainer: document.getElementById('notification-container')
};

// --- CHART INITIALIZATION ---
let moistureChart;
const initChart = () => {
    const ctx = document.getElementById('moistureChart').getContext('2d');

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(46, 204, 113, 0.4)');
    gradient.addColorStop(1, 'rgba(46, 204, 113, 0)');

    moistureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: state.timeLabels,
            datasets: [{
                label: 'Umidade (%)',
                data: state.moistureHistory,
                borderColor: '#2ecc71',
                borderWidth: 3,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHitRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { display: false }
                }
            }
        }
    });
};

// --- NOTIFICATION SYSTEM ---
const showNotification = (title, message, type = 'success') => {
    const id = Date.now();
    const icon = type === 'critical' ? 'alert-triangle' : (type === 'warning' ? 'info' : 'check-circle');

    const notification = document.createElement('div');
    notification.className = `notification notification-${type} ${type}`;
    notification.id = `notif-${id}`;

    notification.innerHTML = `
        <i data-lucide="${icon}"></i>
        <div class="notification-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;

    elements.notificationContainer.appendChild(notification);
    lucide.createIcons();

    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);

    // Remove after 5s
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
};

// --- UPDATE UI FUNCTIONS ---
const setGaugeValue = (value) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;
    elements.gaugeProgress.style.strokeDashoffset = offset;
    elements.moistureValue.textContent = Math.round(value);

    if (value < CONFIG.CRITICAL_LOW) {
        elements.gaugeProgress.style.stroke = "#ef4444";
        elements.moistureStatus.textContent = "CRÍTICO: Solo Muito Seco!";
        elements.moistureStatus.style.color = "#ef4444";
    } else if (value < 60) {
        elements.gaugeProgress.style.stroke = "#f1c40f";
        elements.moistureStatus.textContent = "Atenção: Solo Seco";
        elements.moistureStatus.style.color = "#f1c40f";
    } else {
        elements.gaugeProgress.style.stroke = "#2ecc71";
        elements.moistureStatus.textContent = "Umidade Ideal";
        elements.moistureStatus.style.color = "#2ecc71";
    }
};

const updatePump = (isOn, manual = false) => {
    state.isPumpOn = isOn;
    elements.pumpToggle.checked = isOn;
    elements.pumpStatusText.textContent = isOn ? "Ligada" : "Desligada";
    elements.pumpStatusText.style.color = isOn ? "#2ecc71" : "#94a3b8";

    if (isOn) {
        elements.pumpVisual.classList.add('pump-active');
    } else {
        elements.pumpVisual.classList.remove('pump-active');
    }

    if (manual) {
        const msg = isOn ? "Bomba ativada manualmente" : "Bomba desativada manualmente";
        addLog(msg);
        showNotification("Comando Manual", msg, isOn ? 'success' : 'warning');
    }
};

const addLog = (message) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    state.logs.unshift({ time: timeStr, message });
    if (state.logs.length > 8) state.logs.pop();
    renderLogs();
};

const renderLogs = () => {
    elements.logList.innerHTML = state.logs
        .map(log => `<li><span class="log-time">${log.time}</span> ${log.message}</li>`)
        .join('');
};

// --- SIMULATION LOOP ---
setInterval(() => {
    // 1. Moisture Logic
    if (state.isPumpOn) {
        state.moisture += Math.random() * 3 + 1;
        if (state.moisture >= CONFIG.CRITICAL_HIGH && state.isAutoMode) {
            updatePump(false);
            addLog("Bomba desligada (Nível Ideal atingido)");
            showNotification("Automação", "Irrigação concluída com sucesso.", "success");
        }
    } else {
        state.moisture -= Math.random() * 0.8;
        if (state.moisture <= CONFIG.CRITICAL_LOW && state.isAutoMode && !state.isPumpOn) {
            updatePump(true);
            addLog("Bomba ligada (Nível Crítico detectado)");
            showNotification("Alerta de Umidade", "Solo muito seco! Iniciando irrigação de emergência.", "critical");
        }
    }

    // Bounds
    state.moisture = Math.max(0, Math.min(100, state.moisture));
    setGaugeValue(state.moisture);

    // 2. Update History & Chart
    state.moistureHistory.push(state.moisture);
    state.moistureHistory.shift();
    moistureChart.update('none'); // Update without transition for performance

    // 3. Weather Simulation
    state.temperature += (Math.random() - 0.5) * 0.2;
    state.humidity += (Math.random() - 0.5) * 0.3;

    elements.currentTemp.textContent = Math.round(state.temperature);
    elements.weatherHumidity.textContent = Math.round(Math.max(0, state.humidity)) + "%";

    // Critical temperature alert
    if (state.temperature > 35) {
        showNotification("Alerta de Calor", "Temperatura elevada detectada. Monitore a plantação.", "warning");
    }
}, CONFIG.UPDATE_INTERVAL);

// Event Listeners
elements.pumpToggle.addEventListener('change', (e) => {
    updatePump(e.target.checked, true);
});

// Initial Setup
window.addEventListener('DOMContentLoaded', () => {
    initChart();
    renderLogs();
    setGaugeValue(state.moisture);
    updatePump(state.isPumpOn);

    setTimeout(() => {
        showNotification("Bem-vindo ao AquaFlow", "Monitoramento inteligente ativo e operacional.", "success");
    }, 1000);
});

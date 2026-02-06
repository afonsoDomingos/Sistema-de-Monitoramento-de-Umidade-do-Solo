// Configuration & State
const CONFIG = {
    CRITICAL_LOW: 25,
    CRITICAL_HIGH: 85,
    UPDATE_INTERVAL: 2000,
    WEATHER_SYNC_INTERVAL: 600000, // 10 minutes
    CHART_POINTS: 20,
    LOCATION: {
        lat: -25.9692,
        lon: 32.5732,
        name: "Moçambique (Maputo)"
    }
};

let state = {
    moisture: 45,
    isPumpOn: false,
    isAutoMode: true,
    temperature: "--",
    humidity: "--",
    windSpeed: "--",
    maxTemp: "--",
    condition: "Desconhecido",
    theme: 'dark',
    moistureHistory: Array(CONFIG.CHART_POINTS).fill(45),
    timeLabels: Array(CONFIG.CHART_POINTS).fill(''),
    logs: [
        { time: new Date().toLocaleTimeString([], { hour: '2bit', minute: '2bit' }), message: "Sistema AquaFlow inicializado" }
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
    notificationContainer: document.getElementById('notification-container'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    weatherIcon: document.getElementById('weather-icon')
};

// --- WEATHER INTEGRATION (Open-Meteo) ---
const syncWeather = async () => {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${CONFIG.LOCATION.lat}&longitude=${CONFIG.LOCATION.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max&timezone=auto`;

        const response = await fetch(url);
        const data = await response.json();

        state.temperature = Math.round(data.current.temperature_2m);
        state.humidity = data.current.relative_humidity_2m;
        state.windSpeed = Math.round(data.current.wind_speed_10m);
        state.maxTemp = Math.round(data.daily.temperature_2m_max[0]);

        updateWeatherUI(data.current.weather_code);

        console.log(`Weather synced for ${CONFIG.LOCATION.name}: ${state.temperature}°C`);
    } catch (error) {
        console.error("Failed to sync weather:", error);
        showNotification("Erro de Conexão", "Não foi possível carregar dados meteorológicos reais.", "warning");
    }
};

const updateWeatherUI = (code) => {
    elements.currentTemp.textContent = state.temperature;
    elements.weatherHumidity.textContent = state.humidity + "%";
    elements.windSpeed.textContent = state.windSpeed + " km/h";
    elements.maxTemp.textContent = state.maxTemp + "°C";

    // Map WMO codes to Lucide icons
    let iconName = 'sun';
    if (code >= 1 && code <= 3) iconName = 'cloud-sun';
    else if (code >= 45 && code <= 48) iconName = 'cloud';
    else if (code >= 51 && code <= 67) iconName = 'cloud-rain';
    else if (code >= 71 && code <= 77) iconName = 'cloud-snow';
    else if (code >= 80 && code <= 99) iconName = 'cloud-lightning';

    elements.weatherIcon.setAttribute('data-lucide', iconName);
    lucide.createIcons();
};

// --- CHART INITIALIZATION ---
let moistureChart;
const initChart = () => {
    const ctx = document.getElementById('moistureChart').getContext('2d');
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
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: state.theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: { grid: { display: false }, ticks: { display: false } }
            }
        }
    });
};

// --- THEME MANAGEMENT ---
const toggleTheme = () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    elements.themeIcon.setAttribute('data-lucide', state.theme === 'dark' ? 'moon' : 'sun');
    lucide.createIcons();
    if (moistureChart) {
        moistureChart.options.scales.y.grid.color = state.theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        moistureChart.update();
    }
    localStorage.setItem('aquaflow-theme', state.theme);
};

// --- NOTIFICATION SYSTEM ---
const showNotification = (title, message, type = 'success') => {
    const id = Date.now();
    const iconMap = { critical: 'alert-triangle', warning: 'info', success: 'check-circle' };
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} ${type}`;
    notification.id = `notif-${id}`;
    notification.innerHTML = `
        <i data-lucide="${iconMap[type] || 'check-circle'}"></i>
        <div class="notification-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;
    elements.notificationContainer.appendChild(notification);
    lucide.createIcons();
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
};

// --- UPDATE UI FUNCTIONS ---
const setGaugeValue = (value) => {
    const circumference = 2 * Math.PI * 45;
    elements.gaugeProgress.style.strokeDashoffset = circumference - (value / 100) * circumference;
    elements.moistureValue.textContent = Math.round(value);

    if (value < CONFIG.CRITICAL_LOW) {
        elements.gaugeProgress.stroke = "#ef4444";
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
    isOn ? elements.pumpVisual.classList.add('pump-active') : elements.pumpVisual.classList.remove('pump-active');

    if (manual) {
        const msg = isOn ? "Bomba ativada manualmente" : "Bomba desativada manualmente";
        addLog(msg);
        showNotification("Comando Manual", msg, isOn ? 'success' : 'warning');
    }
};

const addLog = (message) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2bit', minute: '2bit' });
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
            showNotification("Alerta de Umidade", "Solo muito seco! Iniciando irrigação.", "critical");
        }
    }
    state.moisture = Math.max(0, Math.min(100, state.moisture));
    setGaugeValue(state.moisture);
    state.moistureHistory.push(state.moisture);
    state.moistureHistory.shift();
    if (moistureChart) moistureChart.update('none');
}, CONFIG.UPDATE_INTERVAL);

// Periodic Weather Sync
setInterval(syncWeather, CONFIG.WEATHER_SYNC_INTERVAL);

// Event Listeners
elements.pumpToggle.addEventListener('change', (e) => updatePump(e.target.checked, true));
elements.themeToggle.addEventListener('click', toggleTheme);

// Initial Setup
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('aquaflow-theme');
    if (savedTheme) {
        state.theme = savedTheme;
        document.documentElement.setAttribute('data-theme', state.theme);
        elements.themeIcon.setAttribute('data-lucide', state.theme === 'dark' ? 'moon' : 'sun');
    }
    initChart();
    renderLogs();
    setGaugeValue(state.moisture);
    updatePump(state.isPumpOn);
    syncWeather(); // Initial sync
    lucide.createIcons();
    setTimeout(() => {
        showNotification("AquaFlow Mozambique", "Conectado a Maputo. Clima sincronizado.", "success");
    }, 1500);
});

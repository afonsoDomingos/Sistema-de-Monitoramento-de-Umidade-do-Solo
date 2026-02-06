// Configuration & State
const CONFIG = {
    UPDATE_INTERVAL: 2000,
    WEATHER_SYNC_INTERVAL: 600000,
    CHART_POINTS: 20,
    WATER_FLOW_RATE: 0.15, // Litros por segundo (ajustado para simulação)
    WATER_COST_PER_LITER: 0.045, // Ex: 45 MT por cada 1000 litros
    LOCATIONS: {
        mapito: { lat: -25.9692, lon: 32.5732, name: "Maputo" },
        beira: { lat: -19.8436, lon: 34.8389, name: "Beira" },
        nampula: { lat: -15.1165, lon: 39.2662, name: "Nampula" },
        quelimane: { lat: -17.8764, lon: 36.8878, name: "Quelimane" }
    },
    CROP_PROFILES: {
        banana: { low: 60, high: 90, name: "Banana" },
        arroz: { low: 80, high: 98, name: "Arroz" },
        cana: { low: 65, high: 85, name: "Cana-de-Açúcar" },
        milho: { low: 40, high: 70, name: "Milho" },
        soja: { low: 55, high: 80, name: "Soja" },
        algodao: { low: 45, high: 70, name: "Algodão" },
        mandioca: { low: 30, high: 55, name: "Mandioca" },
        batata_doce: { low: 50, high: 75, name: "Batata-doce" },
        amendoim: { low: 35, high: 55, name: "Amendoim" },
        gergelim: { low: 30, high: 50, name: "Gergelim" },
        girassol: { low: 40, high: 65, name: "Girassol" },
        tomate: { low: 50, high: 80, name: "Tomate" },
        feijao: { low: 45, high: 70, name: "Feijão Caupi" },
        citrinos: { low: 50, high: 75, name: "Citrinos" },
        caju: { low: 40, high: 60, name: "Castanha de Caju" }
    }
};

let state = {
    currentLocation: 'mapito',
    currentCrop: 'banana',
    limits: { low: 60, high: 90 },
    moisture: 65,
    isPumpOn: false,
    isAutoMode: true,
    totalLiters: 0,
    totalCost: 0,
    theme: 'dark',
    weather: { current: {}, forecast: [] },
    moistureHistory: Array(CONFIG.CHART_POINTS).fill(65),
    timeLabels: Array(CONFIG.CHART_POINTS).fill(''),
    logs: []
};

// DOM Elements
const elements = {
    moistureValue: document.getElementById('moisture-value'),
    moistureStatus: document.getElementById('moisture-status'),
    gaugeProgress: document.querySelector('.gauge-progress'),
    pumpToggle: document.getElementById('pump-toggle'),
    pumpStatusText: document.getElementById('pump-status-text'),
    pumpVisual: document.querySelector('.pump-visual'),
    currentTemp: document.getElementById('current-temp'),
    weatherHumidity: document.getElementById('weather-humidity'),
    windSpeed: document.getElementById('wind-speed'),
    maxTemp: document.getElementById('max-temp'),
    weatherIcon: document.getElementById('weather-icon'),
    locationName: document.getElementById('location-name'),
    forecastList: document.getElementById('forecast-list'),
    logList: document.getElementById('activity-logs'),
    cropSelect: document.getElementById('crop-select'),
    recommendedRange: document.getElementById('recommended-range'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    closeModal: document.querySelector('.close-modal'),
    locationSelect: document.getElementById('location-select'),
    rangeLow: document.getElementById('range-low'),
    rangeHigh: document.getElementById('range-high'),
    labelLow: document.getElementById('label-low'),
    labelHigh: document.getElementById('label-high'),
    saveSettings: document.getElementById('save-settings'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    notificationContainer: document.getElementById('notification-container'),
    waterLiters: document.getElementById('water-liters'),
    waterCost: document.getElementById('water-cost'),
    savingsAlert: document.getElementById('savings-alert'),
    currentTime: document.getElementById('current-time'),
    currentDate: document.getElementById('current-date'),
    precipitation: document.getElementById('precipitation')
};

// --- CLOCK UPDATE ---
const updateClock = () => {
    const now = new Date();

    // Time
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    elements.currentTime.textContent = `${hours}:${minutes}:${seconds}`;

    // Date
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    elements.currentDate.textContent = `${day}/${month}/${year}`;
};

// Update clock every second
setInterval(updateClock, 1000);
updateClock(); // Initial call

// --- WEATHER & FORECAST ---
const syncWeather = async () => {
    try {
        const loc = CONFIG.LOCATIONS[state.currentLocation];
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&daily=weather_code,temperature_2m_max&timezone=auto`;

        const response = await fetch(url);
        const data = await response.json();

        // Update UI
        elements.locationName.textContent = loc.name;
        elements.currentTemp.textContent = Math.round(data.current.temperature_2m);
        elements.weatherHumidity.textContent = data.current.relative_humidity_2m + "%";
        elements.windSpeed.textContent = Math.round(data.current.wind_speed_10m) + " km/h";
        elements.maxTemp.textContent = Math.round(data.daily.temperature_2m_max[0]) + "°C";
        elements.precipitation.textContent = data.current.precipitation.toFixed(1) + " mm";

        setWeatherIcon(elements.weatherIcon, data.current.weather_code);

        // Smart Savings Logic (Rain prediction)
        let rainPredicted = false;
        elements.forecastList.innerHTML = '';
        for (let i = 1; i <= 3; i++) {
            const code = data.daily.weather_code[i];
            if (code >= 51) rainPredicted = true; // Codes 51+ indicate rain/storm

            const date = new Date(data.daily.time[i]);
            const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
            const item = document.createElement('div');
            item.className = 'forecast-item';
            item.innerHTML = `
                <span class="forecast-day">${dayName}</span>
                <i class="forecast-icon" data-lucide="${getIconName(code)}"></i>
                <span class="forecast-temp">${Math.round(data.daily.temperature_2m_max[i])}°C</span>
            `;
            elements.forecastList.appendChild(item);
        }

        if (rainPredicted) {
            elements.savingsAlert.classList.remove('hidden');
        } else {
            elements.savingsAlert.classList.add('hidden');
        }

        lucide.createIcons();
    } catch (e) {
        showNotification("Erro no Clima", "Não foi possível carregar a previsão.", "warning");
    }
};

const getIconName = (code) => {
    if (code === 0) return 'sun';
    if (code <= 3) return 'cloud-sun';
    if (code <= 48) return 'cloud';
    if (code <= 67) return 'cloud-rain';
    if (code <= 99) return 'cloud-lightning';
    return 'sun';
};

const setWeatherIcon = (el, code) => {
    el.setAttribute('data-lucide', getIconName(code));
};

// --- SETTINGS & CROP LOGIC ---
const updateCropProfile = (profileKey) => {
    const profile = CONFIG.CROP_PROFILES[profileKey];
    state.currentCrop = profileKey;
    state.limits.low = profile.low;
    state.limits.high = profile.high;

    // Update UI
    elements.recommendedRange.textContent = `${profile.low}% - ${profile.high}%`;
    elements.rangeLow.value = profile.low;
    elements.rangeHigh.value = profile.high;
    elements.labelLow.textContent = profile.low;
    elements.labelHigh.textContent = profile.high;

    addLog(`Cultivo alterado para: ${profile.name}`);
};

// --- CORE FUNCTIONS ---
const setGaugeValue = (value) => {
    const circum = 2 * Math.PI * 45;
    elements.gaugeProgress.style.strokeDashoffset = circum - (value / 100) * circum;
    elements.moistureValue.textContent = Math.round(value);

    if (value < state.limits.low) {
        elements.gaugeProgress.style.stroke = "#ef4444";
        elements.moistureStatus.textContent = "ALERTA: Solo Seco";
        elements.moistureStatus.style.color = "#ef4444";
    } else if (value > state.limits.high) {
        elements.gaugeProgress.style.stroke = "#3498db";
        elements.moistureStatus.textContent = "Solo Hidratado";
        elements.moistureStatus.style.color = "#3498db";
    } else {
        elements.gaugeProgress.style.stroke = "#2ecc71";
        elements.moistureStatus.textContent = "Status OK";
        elements.moistureStatus.style.color = "#2ecc71";
    }
};

const updatePump = (isOn, manual = false) => {
    state.isPumpOn = isOn;
    elements.pumpToggle.checked = isOn;
    elements.pumpStatusText.textContent = isOn ? "Ligada" : "Desligada";
    isOn ? elements.pumpVisual.classList.add('pump-active') : elements.pumpVisual.classList.remove('pump-active');

    if (manual) {
        addLog(isOn ? "Bomba ligada manualmente" : "Bomba desligada manualmente");
        showNotification("Manual", isOn ? "Irrigação Iniciada" : "Irrigação Parada", isOn ? "success" : "warning");
    }
};

const updateConsumptionUI = () => {
    elements.waterLiters.textContent = state.totalLiters.toFixed(1);
    elements.waterCost.textContent = state.totalCost.toFixed(2);
};

const addLog = (msg) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    state.logs.unshift({ time, msg });
    if (state.logs.length > 8) state.logs.pop();
    renderLogs();
};

const renderLogs = () => {
    elements.logList.innerHTML = state.logs
        .map(l => `<li><span class="log-time">${l.time}</span> ${l.msg}</li>`).join('');
};

const showNotification = (title, message, type) => {
    const n = document.createElement('div');
    n.className = `notification notification-${type}`;
    n.innerHTML = `<h4>${title}</h4><p>${message}</p>`;
    elements.notificationContainer.appendChild(n);
    setTimeout(() => n.classList.add('show'), 100);
    setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 500); }, 4000);
};

// --- SIMULATION ---
setInterval(() => {
    if (state.isPumpOn) {
        state.moisture += 1.5;

        // Calculate consumption (Update interval is 2s)
        const litersGained = CONFIG.WATER_FLOW_RATE * (CONFIG.UPDATE_INTERVAL / 1000);
        state.totalLiters += litersGained;
        state.totalCost += litersGained * CONFIG.WATER_COST_PER_LITER;
        updateConsumptionUI();

        if (state.moisture >= state.limits.high && state.isAutoMode) {
            updatePump(false);
            addLog("Auto: Limite ideal atingido");
            showNotification("Automação", "Solo Hidratado!", "success");
        }
    } else {
        state.moisture -= 0.3;
        if (state.moisture <= state.limits.low && state.isAutoMode && !state.isPumpOn) {
            updatePump(true);
            addLog("Auto: Umidade crítica detectada");
            showNotification("Alerta", "Iniciando Irrigação", "critical");
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

// --- EVENT LISTENERS ---
elements.cropSelect.addEventListener('change', (e) => updateCropProfile(e.target.value));
elements.settingsBtn.addEventListener('click', () => elements.settingsModal.classList.add('show'));
elements.closeModal.addEventListener('click', () => elements.settingsModal.classList.remove('show'));
elements.rangeLow.addEventListener('input', (e) => elements.labelLow.textContent = e.target.value);
elements.rangeHigh.addEventListener('input', (e) => elements.labelHigh.textContent = e.target.value);

elements.saveSettings.addEventListener('click', () => {
    state.currentLocation = elements.locationSelect.value;
    state.limits.low = parseInt(elements.rangeLow.value);
    state.limits.high = parseInt(elements.rangeHigh.value);
    syncWeather();
    elements.settingsModal.classList.remove('show');
    showNotification("Salvo", "Configurações actualizadas.", "success");
    addLog("Configurações do sistema alteradas");
});

elements.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    elements.themeIcon.setAttribute('data-lucide', state.theme === 'dark' ? 'moon' : 'sun');
    lucide.createIcons();
    localStorage.setItem('aquaflow-theme', state.theme);
});

// --- CHART ---
let moistureChart;
const initChart = () => {
    const ctx = document.getElementById('moistureChart').getContext('2d');
    moistureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: state.timeLabels,
            datasets: [{
                data: state.moistureHistory,
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 0, max: 100, grid: { color: 'rgba(128,128,128,0.1)' } },
                x: { display: false }
            }
        }
    });
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('aquaflow-theme');
    if (savedTheme) {
        state.theme = savedTheme;
        document.documentElement.setAttribute('data-theme', state.theme);
        elements.themeIcon.setAttribute('data-lucide', state.theme === 'dark' ? 'moon' : 'sun');
    }
    initChart();
    updateCropProfile('banana');
    syncWeather();
    addLog("Painel de Controle operacional");
    lucide.createIcons();
});

// PWA Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
}

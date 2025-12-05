let ledStates = [];
let currentConfig = { leds: [] };

document.addEventListener('DOMContentLoaded', () => {
    for (let i = 0; i < CONFIG.numLEDs; i++) {
        ledStates.push({ state: false, intensity: 100, color: { r: 255, g: 255, b: 255 } });
    }
    checkSession();
    mqttClient = new MQTTClient4LED(CONFIG);
    mqttClient.onStatusUpdate = handleStatusUpdate;
    mqttClient.onConnectionChange = handleConnectionChange;
    mqttClient.connect();
    setupLEDControls();
    loadUserConfig();
    setInterval(checkSession, 60000);
});

async function checkSession() {
    try {
        const response = await fetch('check_session.php');
        const data = await response.json();
        if (!data.authenticated) {
            window.location.href = 'login.html';
            return;
        }
        const usernameDisplay = document.getElementById('usernameDisplay');
        if (usernameDisplay && !usernameDisplay.textContent.includes('User:')) {
            usernameDisplay.textContent = `User: ${data.username}`;
        }
    } catch (error) {
        console.error('Error checking session:', error);
    }
}

async function loadUserConfig() {
    try {
        const response = await fetch('load_config.php');
        const data = await response.json();
        if (data.success && data.config && data.config.leds) {
            currentConfig = data.config;
            data.config.leds.forEach((led, index) => {
                if (index < CONFIG.numLEDs) {
                    applyLEDConfig(index + 1, led);
                }
            });
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

async function saveUserConfig() {
    const config = { leds: [] };
    for (let i = 0; i < CONFIG.numLEDs; i++) {
        const ledIndex = i + 1;
        const switchEl = document.getElementById(`switchLED${ledIndex}`);
        const intensitySlider = document.getElementById(`intensitySlider${ledIndex}`);
        const colorPicker = document.getElementById(`colorPicker${ledIndex}`);
        config.leds.push({
            state: switchEl ? switchEl.checked : false,
            intensity: intensitySlider ? parseInt(intensitySlider.value) : 100,
            color: colorPicker ? hexToRgb(colorPicker.value) : { r: 255, g: 255, b: 255 }
        });
    }
    currentConfig = config;
    try {
        const response = await fetch('save_config.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config: config })
        });
        const data = await response.json();
        if (data.success) {
            alert('Konfigurasi berhasil disimpan');
        }
    } catch (error) {
        console.error('Error saving config:', error);
    }
}

function applyLEDConfig(ledIndex, config) {
    const switchEl = document.getElementById(`switchLED${ledIndex}`);
    const intensitySlider = document.getElementById(`intensitySlider${ledIndex}`);
    const intensityValue = document.getElementById(`intensityValue${ledIndex}`);
    const colorPicker = document.getElementById(`colorPicker${ledIndex}`);
    if (switchEl && config.state !== undefined) {
        switchEl.checked = config.state;
    }
    if (intensitySlider && config.intensity !== undefined) {
        intensitySlider.value = config.intensity;
    }
    if (intensityValue && config.intensity !== undefined) {
        intensityValue.textContent = config.intensity + '%';
    }
    if (colorPicker && config.color) {
        colorPicker.value = rgbToHex(config.color.r, config.color.g, config.color.b);
    }
}

function setupLEDControls() {
    const ledsGrid = document.getElementById('ledsGrid');
    const ledControls = document.getElementById('ledControls');
    for (let i = 0; i < CONFIG.numLEDs; i++) {
        const ledIndex = i + 1;
        const statusCard = document.createElement('div');
        statusCard.className = 'led-card';
        statusCard.id = `ledStatus${ledIndex}`;
        statusCard.innerHTML = `
            <h4>LED ${ledIndex}</h4>
            <div class="led-status-indicator off" id="ledIndicator${ledIndex}">
                <span>💡</span>
            </div>
            <p id="ledStatusText${ledIndex}">Mati</p>
        `;
        ledsGrid.appendChild(statusCard);
        const controlCard = document.createElement('div');
        controlCard.className = 'led-control-card';
        controlCard.innerHTML = `
            <h3>
                LED ${ledIndex}
                <label class="switch">
                    <input type="checkbox" id="switchLED${ledIndex}" class="led-switch">
                    <span class="slider-switch"></span>
                </label>
            </h3>
            <div class="control-group">
                <label>Intensitas:</label>
                <div class="slider-container">
                    <input type="range" id="intensitySlider${ledIndex}" min="0" max="100" value="100" class="slider">
                    <div class="slider-labels">
                        <span>0%</span>
                        <span id="intensityValue${ledIndex}">100%</span>
                        <span>100%</span>
                    </div>
                </div>
            </div>
            <div class="control-group">
                <label>Warna:</label>
                <input type="color" id="colorPicker${ledIndex}" value="#ffffff" class="color-picker">
            </div>
            <button class="btn btn-primary" id="btnApplyLED${ledIndex}">Terapkan</button>
        `;
        ledControls.appendChild(controlCard);
        const switchEl = document.getElementById(`switchLED${ledIndex}`);
        switchEl.addEventListener('change', (e) => {
            const state = e.target.checked;
            ledStates[ledIndex - 1].state = state;
            mqttClient.publishLEDCommand(ledIndex, state ? 'ON' : 'OFF');
        });
        const intensitySlider = document.getElementById(`intensitySlider${ledIndex}`);
        const intensityValue = document.getElementById(`intensityValue${ledIndex}`);
        intensitySlider.addEventListener('input', (e) => {
            intensityValue.textContent = e.target.value + '%';
        });
        const btnApply = document.getElementById(`btnApplyLED${ledIndex}`);
        btnApply.addEventListener('click', () => {
            const intensity = parseInt(intensitySlider.value);
            const color = document.getElementById(`colorPicker${ledIndex}`).value;
            ledStates[ledIndex - 1].intensity = intensity;
            ledStates[ledIndex - 1].color = hexToRgb(color);
            mqttClient.publishLEDIntensity(ledIndex, intensity);
            mqttClient.publishLEDColor(ledIndex, color);
        });
    }
    const switchAll = document.getElementById('switchAllLEDs');
    switchAll.addEventListener('change', (e) => {
        const state = e.target.checked;
        mqttClient.publishAllCommand(state ? 'ON' : 'OFF');
    });
    const btnSaveConfig = document.getElementById('btnSaveConfig');
    if (btnSaveConfig) {
        btnSaveConfig.addEventListener('click', saveUserConfig);
    }
}

function handleStatusUpdate(status) {
    if (status.leds && Array.isArray(status.leds)) {
        status.leds.forEach((led, index) => {
            const ledIndex = index + 1;
            updateLEDStatus(ledIndex, led);
        });
    }
}

function updateLEDStatus(ledIndex, ledData) {
    const indicator = document.getElementById(`ledIndicator${ledIndex}`);
    const statusText = document.getElementById(`ledStatusText${ledIndex}`);
    const switchEl = document.getElementById(`switchLED${ledIndex}`);
    if (!indicator || !statusText || !switchEl) return;
    const isOn = ledData.state === 'on' || ledData.state === true;
    switchEl.checked = isOn;
    ledStates[ledIndex - 1].state = isOn;
    if (isOn) {
        indicator.classList.remove('off');
        indicator.classList.add('on');
        statusText.textContent = 'Menyala';
        if (ledData.color) {
            const rgb = `rgb(${ledData.color.r}, ${ledData.color.g}, ${ledData.color.b})`;
            indicator.style.background = `radial-gradient(circle, ${rgb} 0%, ${rgb}dd 100%)`;
        }
    } else {
        indicator.classList.remove('on');
        indicator.classList.add('off');
        statusText.textContent = 'Mati';
        indicator.style.background = '';
    }
    const intensitySlider = document.getElementById(`intensitySlider${ledIndex}`);
    const intensityValue = document.getElementById(`intensityValue${ledIndex}`);
    const colorPicker = document.getElementById(`colorPicker${ledIndex}`);
    if (intensitySlider && ledData.intensity !== undefined) {
        intensitySlider.value = ledData.intensity;
        ledStates[ledIndex - 1].intensity = ledData.intensity;
    }
    if (intensityValue && ledData.intensity !== undefined) {
        intensityValue.textContent = ledData.intensity + '%';
    }
    if (colorPicker && ledData.color) {
        const hex = rgbToHex(ledData.color.r, ledData.color.g, ledData.color.b);
        colorPicker.value = hex;
        ledStates[ledIndex - 1].color = ledData.color;
    }
}

function handleConnectionChange(connected) {
    const mqttStatus = document.getElementById('mqttStatus');
    const mqttStatusText = document.getElementById('mqttStatusText');
    if (!mqttStatus || !mqttStatusText) return;
    if (connected) {
        mqttStatus.classList.remove('disconnected');
        mqttStatus.classList.add('connected');
        mqttStatusText.textContent = 'Terhubung';
    } else {
        mqttStatus.classList.remove('connected');
        mqttStatus.classList.add('disconnected');
        mqttStatusText.textContent = 'Tidak Terhubung';
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
}


let currentConfig = { state: false, intensity: 50, color: { r: 255, g: 255, b: 255 } };

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    mqttClient = new MQTTClient(CONFIG);
    mqttClient.onStatusUpdate = handleStatusUpdate;
    mqttClient.onConnectionChange = handleConnectionChange;
    mqttClient.connect();
    setupControls();
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
        if (data.success && data.config) {
            currentConfig = data.config;
            applyConfig(data.config);
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

async function saveUserConfig() {
    const config = {
        state: currentConfig.state,
        intensity: parseInt(document.getElementById('intensitySlider').value),
        color: hexToRgb(document.getElementById('colorPicker').value)
    };
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

function applyConfig(config) {
    if (config.state !== undefined) {
        document.getElementById('btnOn').disabled = config.state;
        document.getElementById('btnOff').disabled = !config.state;
    }
    if (config.intensity !== undefined) {
        document.getElementById('intensitySlider').value = config.intensity;
        document.getElementById('intensityValue').textContent = config.intensity + '%';
    }
    if (config.color) {
        const hex = rgbToHex(config.color.r, config.color.g, config.color.b);
        document.getElementById('colorPicker').value = hex;
    }
}

function setupControls() {
    const btnOn = document.getElementById('btnOn');
    const btnOff = document.getElementById('btnOff');
    if (btnOn) {
        btnOn.addEventListener('click', () => {
            currentConfig.state = true;
            mqttClient.publishCommand('ON');
        });
    }
    if (btnOff) {
        btnOff.addEventListener('click', () => {
            currentConfig.state = false;
            mqttClient.publishCommand('OFF');
        });
    }
    const intensitySlider = document.getElementById('intensitySlider');
    const intensityValue = document.getElementById('intensityValue');
    const btnSetIntensity = document.getElementById('btnSetIntensity');
    if (intensitySlider && intensityValue) {
        intensitySlider.addEventListener('input', (e) => {
            intensityValue.textContent = e.target.value + '%';
        });
    }
    if (btnSetIntensity) {
        btnSetIntensity.addEventListener('click', () => {
            const intensity = intensitySlider.value;
            currentConfig.intensity = parseInt(intensity);
            mqttClient.publishIntensity(intensity);
        });
    }
    const colorPicker = document.getElementById('colorPicker');
    const btnSetColor = document.getElementById('btnSetColor');
    const colorPresets = document.querySelectorAll('.color-preset');
    if (btnSetColor) {
        btnSetColor.addEventListener('click', () => {
            const color = colorPicker.value;
            currentConfig.color = hexToRgb(color);
            mqttClient.publishColor(color);
        });
    }
    colorPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            const color = preset.getAttribute('data-color');
            colorPicker.value = color;
            currentConfig.color = hexToRgb(color);
            mqttClient.publishColor(color);
        });
    });
    const btnSaveConfig = document.getElementById('btnSaveConfig');
    if (btnSaveConfig) {
        btnSaveConfig.addEventListener('click', saveUserConfig);
    }
}

function handleStatusUpdate(status) {
    currentConfig.state = (status.state === 'on' || status.state === true);
    if (status.intensity !== undefined) currentConfig.intensity = status.intensity;
    if (status.color) currentConfig.color = status.color;
    const lightStatus = document.getElementById('lightStatus');
    const statusText = document.getElementById('statusText');
    
    if (!lightStatus || !statusText) return;
    
    // Update status visual
    const state = status.state || status.status || 'off';
    const isOn = state.toLowerCase() === 'on' || state === '1' || state === true;
    
    if (isOn) {
        lightStatus.classList.remove('off');
        lightStatus.classList.add('on');
        statusText.textContent = 'Lampu Menyala';
        
        // Update warna jika ada
        if (status.color) {
            const rgb = `rgb(${status.color.r}, ${status.color.g}, ${status.color.b})`;
            lightStatus.style.background = `radial-gradient(circle, ${rgb} 0%, ${rgb}dd 100%)`;
        }
    } else {
        lightStatus.classList.remove('on');
        lightStatus.classList.add('off');
        statusText.textContent = 'Lampu Mati';
        lightStatus.style.background = '';
    }
    
    // Update intensitas jika ada
    if (status.intensity !== null && status.intensity !== undefined) {
        const intensitySlider = document.getElementById('intensitySlider');
        const intensityValue = document.getElementById('intensityValue');
        if (intensitySlider) {
            intensitySlider.value = status.intensity;
        }
        if (intensityValue) {
            intensityValue.textContent = status.intensity + '%';
        }
    }
    
    // Update color picker jika ada
    if (status.color) {
        const colorPicker = document.getElementById('colorPicker');
        if (colorPicker) {
            const hex = rgbToHex(status.color.r, status.color.g, status.color.b);
            colorPicker.value = hex;
        }
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


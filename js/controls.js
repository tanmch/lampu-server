/**
 * Kontrol UI dan event handlers
 */

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    // Cek session terlebih dahulu
    checkSession();
    
    // Inisialisasi MQTT client
    mqttClient = new MQTTClient(CONFIG);
    
    // Setup callbacks
    mqttClient.onStatusUpdate = handleStatusUpdate;
    mqttClient.onConnectionChange = handleConnectionChange;
    
    // Koneksi ke MQTT broker
    mqttClient.connect();
    
    // Setup event listeners untuk kontrol
    setupControls();
    
    // Setup periodic session check
    setInterval(checkSession, CONFIG.sessionCheckInterval);
});

/**
 * Cek status session
 */
async function checkSession() {
    try {
        const response = await fetch('check_session.php');
        const data = await response.json();
        
        if (!data.authenticated) {
            // Session tidak valid, redirect ke login
            if (data.timeout) {
                window.location.href = 'login.html?error=timeout';
            } else {
                window.location.href = 'login.html';
            }
            return;
        }
        
        // Update username display (jika belum diisi dari PHP)
        const usernameDisplay = document.getElementById('usernameDisplay');
        if (usernameDisplay && !usernameDisplay.textContent.includes('User:')) {
            usernameDisplay.textContent = `User: ${data.username}`;
        }
    } catch (error) {
        console.error('Error checking session:', error);
    }
}

/**
 * Setup event listeners untuk semua kontrol
 */
function setupControls() {
    // Tombol On/Off
    const btnOn = document.getElementById('btnOn');
    const btnOff = document.getElementById('btnOff');
    
    if (btnOn) {
        btnOn.addEventListener('click', () => {
            mqttClient.publishCommand('ON');
        });
    }
    
    if (btnOff) {
        btnOff.addEventListener('click', () => {
            mqttClient.publishCommand('OFF');
        });
    }
    
    // Slider intensitas
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
            mqttClient.publishIntensity(intensity);
        });
    }
    
    // Color picker
    const colorPicker = document.getElementById('colorPicker');
    const btnSetColor = document.getElementById('btnSetColor');
    const colorPresets = document.querySelectorAll('.color-preset');
    
    if (btnSetColor) {
        btnSetColor.addEventListener('click', () => {
            const color = colorPicker.value;
            mqttClient.publishColor(color);
        });
    }
    
    // Color presets
    colorPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            const color = preset.getAttribute('data-color');
            colorPicker.value = color;
            mqttClient.publishColor(color);
        });
    });
}

/**
 * Menangani update status dari ESP8266
 */
function handleStatusUpdate(status) {
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

/**
 * Menangani perubahan status koneksi MQTT
 */
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

/**
 * Konversi RGB ke Hex
 */
function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
}


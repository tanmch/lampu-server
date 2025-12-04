/**
 * Kontrol UI untuk 4 LED dengan switch dan penjadwalan
 */

// State aplikasi
let ledStates = [];
let schedules = [];
let currentScheduleIndex = -1; // -1 untuk tambah baru, >= 0 untuk edit

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi state LED
    for (let i = 0; i < CONFIG.numLEDs; i++) {
        ledStates.push({
            state: false,
            intensity: 100,
            color: { r: 255, g: 255, b: 255 }
        });
    }
    
    // Cek session
    checkSession();
    
    // Inisialisasi MQTT client
    mqttClient = new MQTTClient4LED(CONFIG);
    
    // Setup callbacks
    mqttClient.onStatusUpdate = handleStatusUpdate;
    mqttClient.onConnectionChange = handleConnectionChange;
    
    // Koneksi ke MQTT broker
    mqttClient.connect();
    
    // Setup UI
    setupLEDControls();
    setupSchedules();
    
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
            if (data.timeout) {
                window.location.href = 'login.html?error=timeout';
            } else {
                window.location.href = 'login.html';
            }
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

/**
 * Setup kontrol LED di UI
 */
function setupLEDControls() {
    const ledsGrid = document.getElementById('ledsGrid');
    const ledControls = document.getElementById('ledControls');
    
    // Buat status indicator untuk setiap LED
    for (let i = 0; i < CONFIG.numLEDs; i++) {
        const ledIndex = i + 1;
        
        // Status card
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
        
        // Control card
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
        
        // Event listeners
        const switchEl = document.getElementById(`switchLED${ledIndex}`);
        switchEl.addEventListener('change', (e) => {
            const state = e.target.checked;
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
            mqttClient.publishLEDIntensity(ledIndex, intensity);
            mqttClient.publishLEDColor(ledIndex, color);
        });
    }
    
    // Switch untuk semua LED
    const switchAll = document.getElementById('switchAllLEDs');
    switchAll.addEventListener('change', (e) => {
        const state = e.target.checked;
        mqttClient.publishAllCommand(state ? 'ON' : 'OFF');
    });
}

/**
 * Setup penjadwalan
 */
function setupSchedules() {
    const btnAddSchedule = document.getElementById('btnAddSchedule');
    const btnClearSchedules = document.getElementById('btnClearSchedules');
    const modal = document.getElementById('scheduleModal');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('btnCancelSchedule');
    const scheduleForm = document.getElementById('scheduleForm');
    
    // Modal handlers
    btnAddSchedule.addEventListener('click', () => {
        currentScheduleIndex = -1;
        resetScheduleForm();
        modal.style.display = 'block';
    });
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Clear schedules
    btnClearSchedules.addEventListener('click', () => {
        if (confirm('Hapus semua jadwal?')) {
            mqttClient.publishSchedule({ action: 'clear' });
        }
    });
    
    // Schedule form
    scheduleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveSchedule();
    });
    
    // Intensity slider
    const scheduleIntensity = document.getElementById('scheduleIntensity');
    const scheduleIntensityValue = document.getElementById('scheduleIntensityValue');
    scheduleIntensity.addEventListener('input', (e) => {
        scheduleIntensityValue.textContent = e.target.value + '%';
    });
}

/**
 * Reset form jadwal
 */
function resetScheduleForm() {
    document.getElementById('scheduleLed').value = '-1';
    document.getElementById('scheduleTime').value = '';
    document.getElementById('scheduleAction').value = 'on';
    document.getElementById('scheduleIntensity').value = '100';
    document.getElementById('scheduleIntensityValue').textContent = '100%';
    document.getElementById('scheduleColor').value = '#ffffff';
    document.getElementById('scheduleRepeat').checked = true;
    document.getElementById('scheduleEnabled').checked = true;
}

/**
 * Simpan jadwal
 */
function saveSchedule() {
    const time = document.getElementById('scheduleTime').value;
    if (!time) {
        alert('Pilih waktu terlebih dahulu');
        return;
    }
    
    const [hour, minute] = time.split(':').map(Number);
    const color = hexToRgb(document.getElementById('scheduleColor').value);
    
    const schedule = {
        action: 'add',
        enabled: document.getElementById('scheduleEnabled').checked,
        ledIndex: parseInt(document.getElementById('scheduleLed').value),
        hour: hour,
        minute: minute,
        turnOn: document.getElementById('scheduleAction').value === 'on',
        intensity: parseInt(document.getElementById('scheduleIntensity').value),
        red: color.r,
        green: color.g,
        blue: color.b,
        repeat: document.getElementById('scheduleRepeat').checked
    };
    
    mqttClient.publishSchedule(schedule);
    document.getElementById('scheduleModal').style.display = 'none';
}

/**
 * Update status LED dari ESP8266
 */
function handleStatusUpdate(status) {
    if (status.leds && Array.isArray(status.leds)) {
        status.leds.forEach((led, index) => {
            const ledIndex = index + 1;
            updateLEDStatus(ledIndex, led);
        });
    }
    
    // Update schedules
    if (status.schedules && Array.isArray(status.schedules)) {
        schedules = status.schedules;
        renderSchedules();
    }
}

/**
 * Update status LED di UI
 */
function updateLEDStatus(ledIndex, ledData) {
    const indicator = document.getElementById(`ledIndicator${ledIndex}`);
    const statusText = document.getElementById(`ledStatusText${ledIndex}`);
    const switchEl = document.getElementById(`switchLED${ledIndex}`);
    
    if (!indicator || !statusText || !switchEl) return;
    
    const isOn = ledData.state === 'on' || ledData.state === true;
    
    // Update switch
    switchEl.checked = isOn;
    
    // Update indicator
    if (isOn) {
        indicator.classList.remove('off');
        indicator.classList.add('on');
        statusText.textContent = 'Menyala';
        
        // Update warna jika ada
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
    
    // Update slider dan color picker
    const intensitySlider = document.getElementById(`intensitySlider${ledIndex}`);
    const intensityValue = document.getElementById(`intensityValue${ledIndex}`);
    const colorPicker = document.getElementById(`colorPicker${ledIndex}`);
    
    if (intensitySlider && ledData.intensity !== undefined) {
        intensitySlider.value = ledData.intensity;
    }
    if (intensityValue && ledData.intensity !== undefined) {
        intensityValue.textContent = ledData.intensity + '%';
    }
    if (colorPicker && ledData.color) {
        const hex = rgbToHex(ledData.color.r, ledData.color.g, ledData.color.b);
        colorPicker.value = hex;
    }
    
    // Update state
    ledStates[ledIndex - 1] = {
        state: isOn,
        intensity: ledData.intensity || 100,
        color: ledData.color || { r: 255, g: 255, b: 255 }
    };
}

/**
 * Render daftar jadwal
 */
function renderSchedules() {
    const schedulesList = document.getElementById('schedulesList');
    if (!schedulesList) return;
    
    schedulesList.innerHTML = '';
    
    if (schedules.length === 0) {
        schedulesList.innerHTML = '<p>Tidak ada jadwal</p>';
        return;
    }
    
    schedules.forEach((schedule, index) => {
        const scheduleItem = document.createElement('div');
        scheduleItem.className = `schedule-item ${schedule.enabled ? '' : 'disabled'}`;
        
        const ledText = schedule.ledIndex === -1 ? 'Semua LED' : `LED ${schedule.ledIndex + 1}`;
        const actionText = schedule.action === 'on' || schedule.action === true ? 'Nyalakan' : 'Matikan';
        const timeStr = String(schedule.hour).padStart(2, '0') + ':' + String(schedule.minute).padStart(2, '0');
        const repeatText = schedule.repeat ? ' (Ulang setiap hari)' : ' (Sekali)';
        
        scheduleItem.innerHTML = `
            <div class="schedule-info">
                <h4>${ledText} - ${actionText}</h4>
                <div class="schedule-details">
                    Waktu: ${timeStr}${repeatText} | 
                    Intensitas: ${schedule.intensity}% | 
                    Status: ${schedule.enabled ? 'Aktif' : 'Nonaktif'}
                </div>
            </div>
            <div class="schedule-actions">
                <button class="btn btn-secondary btn-sm" onclick="editSchedule(${index})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteSchedule(${index})">Hapus</button>
            </div>
        `;
        
        schedulesList.appendChild(scheduleItem);
    });
}

/**
 * Edit jadwal
 */
function editSchedule(index) {
    if (index < 0 || index >= schedules.length) return;
    
    const schedule = schedules[index];
    currentScheduleIndex = index;
    
    document.getElementById('scheduleLed').value = schedule.ledIndex;
    const timeStr = String(schedule.hour).padStart(2, '0') + ':' + String(schedule.minute).padStart(2, '0');
    document.getElementById('scheduleTime').value = timeStr;
    document.getElementById('scheduleAction').value = (schedule.action === 'on' || schedule.action === true) ? 'on' : 'off';
    document.getElementById('scheduleIntensity').value = schedule.intensity;
    document.getElementById('scheduleIntensityValue').textContent = schedule.intensity + '%';
    const hex = rgbToHex(schedule.color.r, schedule.color.g, schedule.color.b);
    document.getElementById('scheduleColor').value = hex;
    document.getElementById('scheduleRepeat').checked = schedule.repeat;
    document.getElementById('scheduleEnabled').checked = schedule.enabled;
    
    document.getElementById('scheduleModal').style.display = 'block';
}

/**
 * Hapus jadwal
 */
function deleteSchedule(index) {
    if (index < 0 || index >= schedules.length) return;
    
    if (confirm('Hapus jadwal ini?')) {
        mqttClient.publishSchedule({ action: 'remove', index: index });
    }
}

/**
 * Handle perubahan status koneksi MQTT
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
 * Konversi hex ke RGB
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
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




<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kontrol Lampu LED - Mode Testing (Tanpa Login)</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>Kontrol Lampu LED</h1>
            <div class="user-info">
                <span id="usernameDisplay">Mode: Testing (Tanpa Autentikasi)</span>
            </div>
        </header>

        <main>
            <div class="status-section">
                <h2>Status Lampu</h2>
                <div class="status-indicator">
                    <div id="lightStatus" class="light-bulb off">
                        <span class="light-icon">💡</span>
                    </div>
                    <p id="statusText">Menghubungkan...</p>
                </div>
            </div>

            <div class="control-section">
                <h2>Kontrol Lampu</h2>
                
                <div class="control-group">
                    <h3>Power</h3>
                    <div class="button-group">
                        <button id="btnOn" class="btn btn-success">Nyalakan</button>
                        <button id="btnOff" class="btn btn-danger">Matikan</button>
                    </div>
                </div>

                <div class="control-group">
                    <h3>Intensitas Cahaya</h3>
                    <div class="slider-container">
                        <input type="range" id="intensitySlider" min="0" max="100" value="50" class="slider">
                        <div class="slider-labels">
                            <span>0%</span>
                            <span id="intensityValue">50%</span>
                            <span>100%</span>
                        </div>
                    </div>
                    <button id="btnSetIntensity" class="btn btn-primary">Set Intensitas</button>
                </div>

                <div class="control-group">
                    <h3>Warna Lampu</h3>
                    <div class="color-picker-container">
                        <input type="color" id="colorPicker" value="#ffffff" class="color-picker">
                        <div class="color-presets">
                            <button class="color-preset" data-color="#ffffff" style="background-color: #ffffff;" title="Putih"></button>
                            <button class="color-preset" data-color="#ff0000" style="background-color: #ff0000;" title="Merah"></button>
                            <button class="color-preset" data-color="#00ff00" style="background-color: #00ff00;" title="Hijau"></button>
                            <button class="color-preset" data-color="#0000ff" style="background-color: #0000ff;" title="Biru"></button>
                            <button class="color-preset" data-color="#ffff00" style="background-color: #ffff00;" title="Kuning"></button>
                            <button class="color-preset" data-color="#ff00ff" style="background-color: #ff00ff;" title="Magenta"></button>
                            <button class="color-preset" data-color="#00ffff" style="background-color: #00ffff;" title="Cyan"></button>
                            <button class="color-preset" data-color="#ffa500" style="background-color: #ffa500;" title="Orange"></button>
                        </div>
                    </div>
                    <button id="btnSetColor" class="btn btn-primary">Set Warna</button>
                </div>
            </div>

            <div class="connection-status">
                <div id="mqttStatus" class="status-badge disconnected">
                    <span class="status-dot"></span>
                    <span id="mqttStatusText">Tidak Terhubung</span>
                </div>
            </div>
        </main>
    </div>

    <script src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script>
    <script src="js/config.js"></script>
    <script src="js/mqtt-client.js"></script>
    <script src="js/controls.js"></script>
</body>
</html>



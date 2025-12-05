<?php
session_start();
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    header('Location: login.html');
    exit;
}
$session_timeout = 30 * 60;
if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > $session_timeout) {
    session_destroy();
    header('Location: login.html?error=timeout');
    exit;
}
$_SESSION['login_time'] = time();
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kontrol 4 Lampu LED</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/style_4led.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>Kontrol 4 Lampu LED</h1>
            <div class="user-info">
                <span id="usernameDisplay">User: <?php echo htmlspecialchars($_SESSION['username'] ?? 'User'); ?></span>
                <a href="logout.php" class="btn btn-secondary">Keluar</a>
            </div>
        </header>
        <main>
            <div class="status-section">
                <h2>Status Semua Lampu</h2>
                <div class="leds-grid" id="ledsGrid"></div>
            </div>
            <div class="control-section">
                <h2>Kontrol Lampu</h2>
                <div class="led-controls" id="ledControls"></div>
                <div class="control-group">
                    <h3>Kontrol Semua Lampu</h3>
                    <div class="switch-container">
                        <label class="switch-label">Power Semua Lampu</label>
                        <label class="switch">
                            <input type="checkbox" id="switchAllLEDs">
                            <span class="slider-switch"></span>
                        </label>
                    </div>
                </div>
                <div class="control-group">
                    <button id="btnSaveConfig" class="btn btn-primary">Simpan Konfigurasi</button>
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
    <script src="js/config_4led.js"></script>
    <script src="js/mqtt-client-4led.js"></script>
    <script src="js/controls_4led.js"></script>
</body>
</html>


<?php
/**
 * Entry point untuk halaman utama - Versi 4 LED
 * Memeriksa session sebelum menampilkan halaman kontrol
 */
session_start();

// Cek apakah user sudah login
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    header('Location: login.html');
    exit;
}

// Cek timeout session (30 menit)
$session_timeout = 30 * 60; // 30 menit dalam detik
if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > $session_timeout) {
    session_destroy();
    header('Location: login.html?error=timeout');
    exit;
}

// Update waktu aktivitas
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
            <!-- Status Section untuk semua LED -->
            <div class="status-section">
                <h2>Status Semua Lampu</h2>
                <div class="leds-grid" id="ledsGrid">
                    <!-- Akan diisi oleh JavaScript -->
                </div>
            </div>

            <!-- Control Section -->
            <div class="control-section">
                <h2>Kontrol Lampu</h2>
                
                <!-- Kontrol per LED -->
                <div class="led-controls" id="ledControls">
                    <!-- Akan diisi oleh JavaScript -->
                </div>

                <!-- Kontrol Semua LED -->
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
            </div>

            <!-- Penjadwalan Section -->
            <div class="schedule-section">
                <h2>Penjadwalan</h2>
                
                <div class="schedule-controls">
                    <button id="btnAddSchedule" class="btn btn-primary">Tambah Jadwal</button>
                    <button id="btnClearSchedules" class="btn btn-danger">Hapus Semua Jadwal</button>
                </div>

                <div class="schedules-list" id="schedulesList">
                    <!-- Daftar jadwal akan ditampilkan di sini -->
                </div>

                <!-- Modal untuk tambah/edit jadwal -->
                <div id="scheduleModal" class="modal">
                    <div class="modal-content">
                        <span class="close">&times;</span>
                        <h3>Tambah Jadwal</h3>
                        <form id="scheduleForm">
                            <div class="form-group">
                                <label>LED:</label>
                                <select id="scheduleLed" class="form-control">
                                    <option value="-1">Semua LED</option>
                                    <option value="0">LED 1</option>
                                    <option value="1">LED 2</option>
                                    <option value="2">LED 3</option>
                                    <option value="3">LED 4</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Waktu:</label>
                                <input type="time" id="scheduleTime" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label>Aksi:</label>
                                <select id="scheduleAction" class="form-control">
                                    <option value="on">Nyalakan</option>
                                    <option value="off">Matikan</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Intensitas (%):</label>
                                <input type="range" id="scheduleIntensity" min="0" max="100" value="100" class="slider">
                                <span id="scheduleIntensityValue">100%</span>
                            </div>
                            <div class="form-group">
                                <label>Warna:</label>
                                <input type="color" id="scheduleColor" value="#ffffff" class="color-picker">
                            </div>
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="scheduleRepeat" checked> Ulang setiap hari
                                </label>
                            </div>
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="scheduleEnabled" checked> Aktif
                                </label>
                            </div>
                            <button type="submit" class="btn btn-primary">Simpan Jadwal</button>
                            <button type="button" class="btn btn-secondary" id="btnCancelSchedule">Batal</button>
                        </form>
                    </div>
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


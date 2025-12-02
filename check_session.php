<?php
session_start();

// Cek apakah user sudah login
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    http_response_code(401);
    echo json_encode(['authenticated' => false]);
    exit;
}

// Cek timeout session (30 menit)
$session_timeout = 30 * 60; // 30 menit dalam detik
if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > $session_timeout) {
    session_destroy();
    http_response_code(401);
    echo json_encode(['authenticated' => false, 'timeout' => true]);
    exit;
}

// Update waktu aktivitas
$_SESSION['login_time'] = time();

// Return status autentikasi
echo json_encode([
    'authenticated' => true,
    'username' => $_SESSION['username'] ?? 'User'
]);
?>


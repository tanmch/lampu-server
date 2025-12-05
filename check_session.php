<?php
session_start();
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    http_response_code(401);
    echo json_encode(['authenticated' => false]);
    exit;
}
$session_timeout = 30 * 60;
if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > $session_timeout) {
    session_destroy();
    http_response_code(401);
    echo json_encode(['authenticated' => false, 'timeout' => true]);
    exit;
}
$_SESSION['login_time'] = time();
echo json_encode([
    'authenticated' => true,
    'username' => $_SESSION['username'] ?? 'User',
    'led_type' => $_SESSION['led_type'] ?? '1led'
]);
?>


<?php
session_start();
require_once 'config/db_config.php';

if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$username = $_SESSION['username'];
$ledType = $_SESSION['led_type'] ?? '1led';

$db = get_db_connection();
if (!$db) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

$stmt = $db->prepare("SELECT config_data FROM user_configs WHERE username = ? AND led_type = ?");
$stmt->execute([$username, $ledType]);
$result = $stmt->fetch();

if ($result) {
    $config = json_decode($result['config_data'], true);
    echo json_encode(['success' => true, 'config' => $config]);
} else {
    echo json_encode(['success' => true, 'config' => null]);
}
?>


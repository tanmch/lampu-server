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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['config'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid input']);
    exit;
}

$db = get_db_connection();
if (!$db) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

$configData = json_encode($input['config']);
$stmt = $db->prepare("INSERT INTO user_configs (username, led_type, config_data, updated_at) 
                      VALUES (?, ?, ?, NOW()) 
                      ON DUPLICATE KEY UPDATE config_data = ?, updated_at = NOW()");
$stmt->execute([$username, $ledType, $configData, $configData]);

echo json_encode(['success' => true]);
?>


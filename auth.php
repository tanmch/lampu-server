<?php
session_start();
require_once 'config/radius_config.php';
require_once 'config/db_config.php';
require_once 'config/mqtt_config.php';

function authenticate_radius($username, $password) {
    if (function_exists('radius_auth_open')) {
        $radius = radius_auth_open();
        if (!$radius) return false;
        radius_add_server($radius, RADIUS_SERVER, RADIUS_PORT, RADIUS_SECRET, RADIUS_TIMEOUT, RADIUS_MAX_TRIES);
        radius_create_request($radius, RADIUS_ACCESS_REQUEST);
        radius_put_attr($radius, RADIUS_USER_NAME, $username);
        radius_put_attr($radius, RADIUS_USER_PASSWORD, $password);
        $result = radius_send_request($radius);
        radius_close($radius);
        return ($result == RADIUS_ACCESS_ACCEPT);
    } else {
        $temp_file = tempnam(sys_get_temp_dir(), 'radclient_');
        $auth_string = "User-Name = \"$username\",\nUser-Password = \"$password\"\n";
        file_put_contents($temp_file, $auth_string);
        $command = escapeshellcmd(RADIUS_CLIENT_PATH) . " -x " . 
                   escapeshellarg(RADIUS_SERVER) . ":" . escapeshellarg(RADIUS_PORT) . 
                   " auth " . escapeshellarg(RADIUS_SECRET) . " < " . escapeshellarg($temp_file) . " 2>&1";
        $output = shell_exec($command);
        unlink($temp_file);
        return (strpos($output, 'Received response ID') !== false && strpos($output, 'Access-Accept') !== false);
    }
}

function publish_user_config($username, $ledType) {
    $db = get_db_connection();
    if (!$db) return false;
    
    $stmt = $db->prepare("SELECT config_data FROM user_configs WHERE username = ? AND led_type = ?");
    $stmt->execute([$username, $ledType]);
    $config = $stmt->fetch();
    
    if (!$config) return false;
    
    $configData = json_decode($config['config_data'], true);
    $mqttMessage = json_encode([
        'username' => $username,
        'led_type' => $ledType,
        'config' => $configData
    ]);
    
    $command = sprintf(
        'mosquitto_pub -h %s -p %d -t %s -m %s 2>&1',
        escapeshellarg(MQTT_BROKER_HOST),
        MQTT_BROKER_PORT,
        escapeshellarg(MQTT_TOPIC_CONFIG),
        escapeshellarg($mqttMessage)
    );
    
    shell_exec($command);
    return true;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = isset($_POST['username']) ? trim($_POST['username']) : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';
    $ledType = isset($_POST['led_type']) ? $_POST['led_type'] : '1led';
    
    if (empty($username) || empty($password)) {
        header('Location: login.html?error=empty');
        exit;
    }
    
    if (authenticate_radius($username, $password)) {
        $_SESSION['authenticated'] = true;
        $_SESSION['username'] = $username;
        $_SESSION['login_time'] = time();
        $_SESSION['led_type'] = $ledType;
        
        publish_user_config($username, $ledType);
        
        $redirect = $ledType === '4led' ? 'index_4led.php' : 'index.php';
        header("Location: $redirect");
        exit;
    } else {
        header('Location: login.html?error=invalid');
        exit;
    }
} else {
    header('Location: login.html');
    exit;
}
?>


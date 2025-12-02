<?php
session_start();

// Konfigurasi RADIUS
require_once 'config/radius_config.php';

/**
 * Fungsi untuk autentikasi menggunakan RADIUS
 */
function authenticate_radius($username, $password) {
    // Menggunakan radius_auth() jika extension tersedia
    if (function_exists('radius_auth_open')) {
        $radius = radius_auth_open();
        if (!$radius) {
            error_log("Failed to open RADIUS connection");
            return false;
        }
        
        radius_add_server($radius, RADIUS_SERVER, RADIUS_PORT, RADIUS_SECRET, RADIUS_TIMEOUT, RADIUS_MAX_TRIES);
        radius_create_request($radius, RADIUS_ACCESS_REQUEST);
        radius_put_attr($radius, RADIUS_USER_NAME, $username);
        radius_put_attr($radius, RADIUS_USER_PASSWORD, $password);
        
        $result = radius_send_request($radius);
        radius_close($radius);
        
        return ($result == RADIUS_ACCESS_ACCEPT);
    } else {
        // Fallback: menggunakan radclient atau exec untuk autentikasi RADIUS
        // Metode ini menggunakan radclient dari FreeRADIUS
        $radclient_path = RADIUS_CLIENT_PATH;
        $secret = RADIUS_SECRET;
        $server = RADIUS_SERVER;
        $port = RADIUS_PORT;
        
        // Membuat file temporary untuk radclient
        $temp_file = tempnam(sys_get_temp_dir(), 'radclient_');
        $auth_string = "User-Name = \"$username\",\nUser-Password = \"$password\"\n";
        file_put_contents($temp_file, $auth_string);
        
        // Menjalankan radclient
        $command = escapeshellcmd($radclient_path) . " -x " . 
                   escapeshellarg($server) . ":" . escapeshellarg($port) . 
                   " auth " . escapeshellarg($secret) . " < " . escapeshellarg($temp_file) . " 2>&1";
        
        $output = shell_exec($command);
        unlink($temp_file);
        
        // Memeriksa apakah autentikasi berhasil
        // radclient mengembalikan "Received response ID" untuk Access-Accept
        return (strpos($output, 'Received response ID') !== false && 
                strpos($output, 'Access-Accept') !== false);
    }
}

// Memproses form login
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = isset($_POST['username']) ? trim($_POST['username']) : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';
    
    if (empty($username) || empty($password)) {
        header('Location: login.html?error=empty');
        exit;
    }
    
    // Autentikasi dengan RADIUS
    if (authenticate_radius($username, $password)) {
        // Autentikasi berhasil
        $_SESSION['authenticated'] = true;
        $_SESSION['username'] = $username;
        $_SESSION['login_time'] = time();
        
        // Redirect ke halaman utama
        header('Location: index.php');
        exit;
    } else {
        // Autentikasi gagal
        header('Location: login.html?error=invalid');
        exit;
    }
} else {
    // Jika bukan POST, redirect ke login
    header('Location: login.html');
    exit;
}
?>


<?php
define('RADIUS_SERVER', 'localhost');
define('RADIUS_PORT', 1812);
define('RADIUS_SECRET', 'testing123');
define('RADIUS_TIMEOUT', 3);
define('RADIUS_MAX_TRIES', 3);
define('RADIUS_CLIENT_PATH', '/usr/bin/radclient');

if (!defined('RADIUS_ACCESS_REQUEST')) {
    define('RADIUS_ACCESS_REQUEST', 1);
    define('RADIUS_ACCESS_ACCEPT', 2);
    define('RADIUS_ACCESS_REJECT', 3);
    define('RADIUS_USER_NAME', 1);
    define('RADIUS_USER_PASSWORD', 2);
}
?>


<?php
declare(strict_types=1);

/**
 * Zpětná kompatibilita: stejný cíl jako flexi-proxy-php.php (hostované Flexi API).
 * Pro nové nasazení preferujte explicitní flexi-proxy-php.php nebo flexi-proxy-windows.php.
 */

define('FLEXI_PROXY_ENTRY', true);
require __DIR__ . '/flexi-proxy.inc.php';

flexiProxyRun('https://flexiapi.prokoho.cz');

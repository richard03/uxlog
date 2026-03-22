<?php
declare(strict_types=1);

/**
 * Proxy na lokální Flexi API běžící na Windows (výchozí port 7842).
 * Spusťte PHP na tomto PC (např. php -S localhost:8787 -t public) a v pluginu zadejte
 * http://localhost:8787/flexi-proxy-windows.php — bez úprav kódu a bez proměnných prostředí.
 *
 * Jiný host nebo port upravte pouze v tomto souboru (konstanta níže).
 */

define('FLEXI_PROXY_ENTRY', true);
require __DIR__ . '/flexi-proxy.inc.php';

flexiProxyRun('http://127.0.0.1:7842');

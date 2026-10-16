<?php
declare(strict_types=1);

/**
 * Endpoint del formulario de contacto (POST /api/contact.php).
 *
 * Recibe el JSON que manda ContactForm.tsx, lo valida y lo reenvía por SMTP
 * a la casilla de la empresa con PHPMailer. Responde siempre JSON.
 *
 *   200 {"ok":true}                        enviado (o honeypot: ver más abajo)
 *   200 {"ok":true,"dry_run":true}         config con dry_run: validó, no envió
 *   400 {"ok":false,"error":"invalid_input","fields":[...]}
 *   403 {"ok":false,"error":"forbidden_origin"}
 *   405 {"ok":false,"error":"method_not_allowed"}
 *   413 {"ok":false,"error":"payload_too_large"}
 *   429 {"ok":false,"error":"rate_limited"}
 *   500 {"ok":false,"error":"config_missing" | "server_error"}
 *   502 {"ok":false,"error":"send_failed"}
 *
 * La contraseña del buzón NO está en este archivo ni en el repo: se lee de
 * eklekta-mail-config.php, que vive un nivel arriba de public_html (fuera de
 * la web). Plantilla en server/eklekta-mail-config.example.php.
 */

use PHPMailer\PHPMailer\PHPMailer;

require_once __DIR__ . '/lib/PHPMailer/Exception.php';
require_once __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/lib/PHPMailer/SMTP.php';

// El formulario manda ~1 KB; 20 KB deja de sobra y corta cualquier intento
// de usar el endpoint para subir basura.
const MAX_BODY_BYTES = 20480;

// Es todo mismo origen (el sitio y este endpoint viven en el mismo dominio),
// por eso no hay cabeceras CORS: lo único que hace falta es rechazar los
// POST que vengan de otro sitio.
const ALLOWED_ORIGINS = ['https://eklekta.com.ar', 'https://www.eklekta.com.ar'];

const CLIENT_LIMIT = 5;      // envíos por cliente...
const CLIENT_WINDOW = 600;   // ...cada 10 minutos
const GLOBAL_LIMIT = 60;     // y entre todos los clientes...
const GLOBAL_WINDOW = 3600;  // ...por hora

// Lo que trae la plantilla de la config. Si llega acá, Lucas se olvidó de
// pegar la contraseña real.
const CONFIG_PLACEHOLDER = 'PEGAR_ACA_LA_CONTRASEÑA_DEL_BUZON';

// Los errores van al log del servidor y nunca a la respuesta: una ruta o un
// warning en pantalla le regalan información a quien esté sondeando.
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

/** Corta la ejecución con una respuesta JSON. */
function respond(int $status, array $body, array $headers = []): void
{
    http_response_code($status);
    foreach ($headers as $header) {
        header($header);
    }
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $status, string $error, array $extra = [], array $headers = []): void
{
    respond($status, ['ok' => false, 'error' => $error] + $extra, $headers);
}

// Cualquier excepción que se nos escape: al log con el detalle, al cliente
// solo un código genérico.
set_exception_handler(static function (Throwable $e): void {
    error_log('[eklekta-contact] ' . get_class($e) . ': ' . $e->getMessage()
        . ' en ' . $e->getFile() . ':' . $e->getLine());
    if (!headers_sent()) {
        http_response_code(500);
    }
    echo '{"ok":false,"error":"server_error"}';
});

// ---------------------------------------------------------------- entrada

/** Lee el cuerpo: JSON (lo que manda el front) o, si no, $_POST. */
function read_payload(): array
{
    $declared = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($declared > MAX_BODY_BYTES) {
        fail(413, 'payload_too_large');
    }

    $type = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    if (strpos($type, 'application/json') !== 0) {
        return $_POST;
    }

    // Se lee un byte de más: así también se detecta un cuerpo sin
    // Content-Length (chunked) que se pase del límite.
    $stream = fopen('php://input', 'rb');
    $raw = $stream === false ? false : stream_get_contents($stream, MAX_BODY_BYTES + 1);
    if ($raw === false) {
        fail(400, 'invalid_input');
    }
    if (strlen($raw) > MAX_BODY_BYTES) {
        fail(413, 'payload_too_large');
    }

    $data = json_decode($raw, true, 8);
    if (!is_array($data)) {
        fail(400, 'invalid_input');
    }
    return $data;
}

/** El campo como string, o null si vino con un tipo que no corresponde. */
function field(array $data, string $key): ?string
{
    $value = $data[$key] ?? '';
    if (is_string($value)) {
        return $value;
    }
    if (is_int($value) || is_float($value)) {
        return (string) $value;
    }
    return null;
}

/**
 * Texto de una sola línea (nombre, email, interés). Devuelve null si trae
 * saltos de línea o UTF-8 roto: un salto de línea en estos campos es la vía
 * de la inyección de cabeceras de mail (Bcc:, Subject:...), así que no se
 * "limpia", se rechaza.
 */
function single_line(?string $value): ?string
{
    if ($value === null || preg_match('//u', $value) !== 1) {
        return null;
    }
    if (preg_match('/[\r\n\x0B\x0C\x{0085}\x{2028}\x{2029}]/u', $value) === 1) {
        return null;
    }
    // Resto de los caracteres de control (tabs incluidos).
    return trim((string) preg_replace('/[\x00-\x1F\x7F\x{0080}-\x{009F}]/u', '', $value));
}

/** El mensaje: conserva saltos de línea y tabs, quita el resto de los controles. */
function multi_line(?string $value): ?string
{
    if ($value === null || preg_match('//u', $value) !== 1) {
        return null;
    }
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    return trim((string) preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\x{0080}-\x{009F}]/u', '', $value));
}

/** Largo en caracteres (no bytes): «ñ» o «é» cuentan 1. */
function text_length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

// ------------------------------------------------------------ rate limit

/**
 * IP del visitante. Detrás del CDN de Hostinger REMOTE_ADDR puede ser el del
 * CDN y no el del visitante (todos compartirían un mismo contador), así que
 * se usa el primer IP de X-Forwarded-For si existe y es válido. Ojo: ese
 * encabezado lo puede mandar cualquiera, o sea que un atacante puede cambiar
 * de «cliente» a voluntad. Por eso existe además el tope global por hora:
 * es el que acota el daño real.
 */
function client_ip(): string
{
    $forwarded = (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '');
    if ($forwarded !== '') {
        $first = trim(explode(',', $forwarded)[0]);
        if (filter_var($first, FILTER_VALIDATE_IP) !== false) {
            return $first;
        }
    }
    $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    return filter_var($remote, FILTER_VALIDATE_IP) !== false ? $remote : 'unknown';
}

/** Marcas de tiempo guardadas en $file que siguen dentro de la ventana. */
function recent_hits(string $file, int $since): array
{
    if (!is_file($file)) {
        return [];
    }
    $raw = file_get_contents($file);
    $decoded = $raw === false ? null : json_decode($raw, true);
    if (!is_array($decoded)) {
        return [];
    }
    return array_values(array_filter($decoded, static function ($time) use ($since): bool {
        return is_int($time) && $time > $since;
    }));
}

function store_hits(string $file, array $hits): void
{
    if (file_put_contents($file, json_encode(array_values($hits)), LOCK_EX) === false) {
        throw new RuntimeException('no se pudo escribir ' . basename($file));
    }
    @chmod($file, 0600);
}

/**
 * Anota un intento y dice si entra dentro de los límites. Los contadores
 * viven fuera de public_html (carpeta eklekta-mail-data, modo 0700) y toda
 * la lectura-modificación-escritura corre bajo un único flock, para que dos
 * pedidos simultáneos no se pisen el contador.
 *
 * Lanza RuntimeException si no puede usar el disco: mejor frenar el envío
 * (y que el log avise) que quedarse sin tope contra el spam.
 */
function register_attempt(string $ip): bool
{
    $dir = dirname(__DIR__, 2) . '/eklekta-mail-data';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException('no se pudo crear la carpeta eklekta-mail-data');
    }

    $lock = fopen($dir . '/ratelimit.lock', 'c');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        throw new RuntimeException('no se pudo tomar el lock del rate limit');
    }

    try {
        $now = time();
        // El IP se guarda hasheado: sirve de nombre de archivo seguro y no
        // deja IPs a la vista en el disco.
        $clientFile = $dir . '/client-' . substr(hash('sha256', $ip), 0, 32) . '.json';
        $globalFile = $dir . '/global.json';

        $client = recent_hits($clientFile, $now - CLIENT_WINDOW);
        $global = recent_hits($globalFile, $now - GLOBAL_WINDOW);

        // Un intento rechazado no se anota: si no, seguir insistiendo
        // alargaría el bloqueo indefinidamente.
        if (count($client) >= CLIENT_LIMIT || count($global) >= GLOBAL_LIMIT) {
            return false;
        }

        $client[] = $now;
        $global[] = $now;
        store_hits($clientFile, $client);
        store_hits($globalFile, $global);

        // De vez en cuando se borran los archivos de clientes que ya no
        // tienen nada dentro de la ventana, para que la carpeta no crezca.
        if (mt_rand(1, 20) === 1) {
            foreach (glob($dir . '/client-*.json') ?: [] as $file) {
                $modified = filemtime($file);
                if ($modified !== false && $modified < $now - CLIENT_WINDOW) {
                    @unlink($file);
                }
            }
        }
        return true;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

// --------------------------------------------------------------- config

/** Carga y valida eklekta-mail-config.php. Si algo falla corta con 500. */
function load_config(): array
{
    $path = dirname(__DIR__, 2) . '/eklekta-mail-config.php';
    if (!is_file($path) || !is_readable($path)) {
        error_log('[eklekta-contact] no se encuentra o no se puede leer ' . $path);
        fail(500, 'config_missing');
    }

    try {
        $config = require $path;
    } catch (Throwable $e) {
        error_log('[eklekta-contact] error al cargar la config: ' . $e->getMessage());
        fail(500, 'config_missing');
    }
    if (!is_array($config)) {
        error_log('[eklekta-contact] la config no devuelve un array');
        fail(500, 'config_missing');
    }

    $dryRun = ($config['dry_run'] ?? false) === true;
    $problems = [];

    foreach (['smtp_host', 'smtp_user', 'smtp_pass', 'from_email', 'to_email'] as $key) {
        if (!isset($config[$key]) || !is_string($config[$key]) || trim($config[$key]) === '') {
            $problems[] = $key;
        }
    }
    foreach (['from_email', 'to_email'] as $key) {
        if (isset($config[$key]) && is_string($config[$key])
            && filter_var($config[$key], FILTER_VALIDATE_EMAIL) === false) {
            $problems[] = $key . ' (no es un email válido)';
        }
    }
    $port = filter_var(
        $config['smtp_port'] ?? null,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1, 'max_range' => 65535]]
    );
    if ($port === false) {
        $problems[] = 'smtp_port';
    }
    if (!in_array($config['smtp_secure'] ?? null, ['ssl', 'tls'], true)) {
        $problems[] = "smtp_secure (tiene que ser 'ssl' o 'tls')";
    }
    if (!$dryRun && ($config['smtp_pass'] ?? '') === CONFIG_PLACEHOLDER) {
        $problems[] = 'smtp_pass (sigue el texto de la plantilla)';
    }

    if ($problems !== []) {
        // Solo los nombres de las claves: nunca los valores.
        error_log('[eklekta-contact] config inválida, revisar: ' . implode(', ', $problems));
        fail(500, 'config_missing');
    }

    return [
        'smtp_host'   => trim($config['smtp_host']),
        'smtp_port'   => $port,
        'smtp_secure' => $config['smtp_secure'],
        'smtp_user'   => $config['smtp_user'],
        'smtp_pass'   => $config['smtp_pass'],
        'from_email'  => trim($config['from_email']),
        'from_name'   => is_string($config['from_name'] ?? null) ? $config['from_name'] : 'Web eklekta',
        'to_email'    => trim($config['to_email']),
        'dry_run'     => $dryRun,
    ];
}

// ----------------------------------------------------------------- envío

/** Página desde la que se envió, solo si parece una URL http(s) razonable. */
function referer(): string
{
    $referer = (string) ($_SERVER['HTTP_REFERER'] ?? '');
    return strlen($referer) <= 300 && preg_match('#^https?://\S+$#i', $referer) === 1
        ? $referer
        : '';
}

/** Manda el mail. Lanza si PHPMailer falla. */
function send_mail(array $config, string $subject, string $html, string $text, string $nombre, string $email): void
{
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = $config['smtp_host'];
        $mail->Port = $config['smtp_port'];
        $mail->SMTPAuth = true;
        $mail->Username = $config['smtp_user'];
        $mail->Password = $config['smtp_pass'];
        $mail->SMTPSecure = $config['smtp_secure'] === 'tls'
            ? PHPMailer::ENCRYPTION_STARTTLS
            : PHPMailer::ENCRYPTION_SMTPS;
        $mail->CharSet = 'UTF-8';
        $mail->Timeout = 15;

        // El remitente tiene que ser el buzón autenticado: si no, el SMTP lo
        // rechaza o el mail cae en spam. El visitante va como Reply-To, así
        // se le contesta directo desde el webmail.
        $mail->setFrom($config['from_email'], $config['from_name']);
        $mail->addAddress($config['to_email']);
        $mail->addReplyTo($email, $nombre);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $html;
        $mail->AltBody = $text;
        $mail->send();
    } catch (Throwable $e) {
        error_log('[eklekta-contact] falló el envío: ' . $mail->ErrorInfo . ' | ' . $e->getMessage());
        throw $e;
    }
}

// ------------------------------------------------------------------ flujo

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail(405, 'method_not_allowed', [], ['Allow: POST']);
}

$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '' && !in_array($origin, ALLOWED_ORIGINS, true)) {
    fail(403, 'forbidden_origin');
}

$data = read_payload();

// Honeypot: un visitante real nunca ve ese campo, así que si trae algo es un
// bot. Se le responde éxito (y no se envía nada) para no darle pie a
// reintentar.
$trap = field($data, 'empresa');
if ($trap === null || trim($trap) !== '') {
    respond(200, ['ok' => true]);
}

$nombre = single_line(field($data, 'nombre'));
$email = single_line(field($data, 'email'));
$interes = single_line(field($data, 'interes'));
$mensaje = multi_line(field($data, 'mensaje'));

$invalid = [];
if ($nombre === null || text_length($nombre) < 2 || text_length($nombre) > 100) {
    $invalid[] = 'nombre';
}
if ($email === null || $email === '' || strlen($email) > 254
    || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    $invalid[] = 'email';
}
if ($interes === null || text_length($interes) > 100) {
    $invalid[] = 'interes';
}
if ($mensaje === null || text_length($mensaje) < 10 || text_length($mensaje) > 5000) {
    $invalid[] = 'mensaje';
}
if ($invalid !== []) {
    fail(400, 'invalid_input', ['fields' => $invalid]);
}

// A partir de acá las cuatro variables son strings válidos.
$config = load_config();

if (!register_attempt(client_ip())) {
    fail(429, 'rate_limited');
}

$servicio = $interes !== '' ? $interes : 'Sin especificar';
$subject = 'Nueva consulta web: ' . $servicio . ' — ' . $nombre;
$when = (new DateTimeImmutable('now', new DateTimeZone('America/Argentina/Buenos_Aires')))
    ->format('d/m/Y H:i');
$from = referer();

$rows = [
    'Nombre' => h($nombre),
    'Email' => '<a href="mailto:' . h($email) . '">' . h($email) . '</a>',
    'Servicio' => h($servicio),
    'Fecha' => h($when) . ' (hora de Argentina)',
];
if ($from !== '') {
    $rows['Página'] = h($from);
}

$html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1a1a22">'
    . '<h2 style="margin:0 0 16px;font-size:18px">Nueva consulta desde el sitio</h2>'
    . '<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">';
foreach ($rows as $label => $value) {
    $html .= '<tr><td style="padding:2px 16px 2px 0;color:#6b6b78;vertical-align:top">' . h($label)
        . '</td><td style="padding:2px 0">' . $value . '</td></tr>';
}
$html .= '</table>'
    . '<p style="margin:20px 0 4px;color:#6b6b78">Mensaje</p>'
    . '<div style="padding:12px 14px;background:#f4f3f8;border-radius:8px">' . nl2br(h($mensaje), false) . '</div>'
    . '</div>';

$text = "Nueva consulta desde el sitio\n\n"
    . "Nombre: $nombre\n"
    . "Email: $email\n"
    . "Servicio: $servicio\n"
    . "Fecha: $when (hora de Argentina)\n"
    . ($from !== '' ? "Página: $from\n" : '')
    . "\nMensaje:\n$mensaje\n";

if ($config['dry_run']) {
    error_log('[eklekta-contact] dry_run OK: ' . json_encode([
        'asunto' => $subject,
        'para' => $config['to_email'],
        'reply_to' => $email,
        'caracteres_mensaje' => text_length($mensaje),
    ], JSON_UNESCAPED_UNICODE));
    respond(200, ['ok' => true, 'dry_run' => true]);
}

try {
    send_mail($config, $subject, $html, $text, $nombre, $email);
} catch (Throwable $e) {
    // El detalle ya quedó en el log dentro de send_mail().
    fail(502, 'send_failed');
}

respond(200, ['ok' => true]);

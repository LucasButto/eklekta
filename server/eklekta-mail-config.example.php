<?php
// Copiá este archivo en Hostinger a la carpeta que CONTIENE public_html
// (un nivel arriba) con el nombre: eklekta-mail-config.php
// Nunca lo subas dentro de public_html ni lo commitees con la contraseña real.
return [
    'smtp_host'   => 'smtp.hostinger.com',
    'smtp_port'   => 465,
    'smtp_secure' => 'ssl',            // 'ssl' = SMTPS (465). Con 587 usar 'tls'.
    'smtp_user'   => 'contacto@eklekta.com.ar',
    'smtp_pass'   => 'PEGAR_ACA_LA_CONTRASEÑA_DEL_BUZON',
    'from_email'  => 'contacto@eklekta.com.ar',
    'from_name'   => 'Web eklekta',
    'to_email'    => 'contacto@eklekta.com.ar',
    'dry_run'     => false,            // true = valida todo pero no envía (para pruebas)
];

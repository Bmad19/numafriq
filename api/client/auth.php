<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../whatsapp.php';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

client_db_init();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── Inscription ───────────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'register') {
    $b = body();
    $name    = trim($b['name'] ?? '');
    $email   = trim($b['email'] ?? '');
    $password= $b['password'] ?? '';
    $company = trim($b['company'] ?? '');
    $phone   = trim($b['phone'] ?? '');

    if (!$name || !$email || !$password) json_out(['error' => 'Champs requis manquants'], 400);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_out(['error' => 'Email invalide'], 400);
    if (strlen($password) < 6) json_out(['error' => 'Mot de passe trop court (min 6 caractères)'], 400);

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $db = get_db();
    try {
        $db->prepare("INSERT INTO clients (name,email,password,company,phone) VALUES (?,?,?,?,?)")
           ->execute([$name, $email, $hash, $company ?: null, $phone ?: null]);
        $clientId = $db->lastInsertId();

        // Notification WhatsApp
        sendWhatsApp(waMsgClientRegister($name, $email, $company));

        // Message de bienvenue automatique de l'équipe
        $db->prepare("INSERT INTO client_messages (client_id,sender_type,content) VALUES (?,'agent',?)")
           ->execute([$clientId, "Bonjour $name ! 👋 Bienvenue dans votre espace client NUMAFRIQ. Notre équipe est disponible pour répondre à toutes vos questions concernant votre projet. N'hésitez pas à nous écrire ici !"]);

        // Générer session
        $token = bin2hex(random_bytes(32));
        $db->prepare("INSERT INTO client_sessions (client_id,token,expires_at) VALUES (?,?,DATE_ADD(NOW(), INTERVAL 12 HOUR))")
           ->execute([$clientId, $token]);

        json_out([
            'token'  => $token,
            'client' => ['id'=>$clientId,'name'=>$name,'email'=>$email,'company'=>$company,'phone'=>$phone],
        ]);
    } catch (Exception) {
        json_out(['error' => 'Cette adresse email est déjà utilisée'], 409);
    }
}

// ── Connexion ─────────────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'login') {
    $b = body();
    $email    = trim($b['email'] ?? '');
    $password = $b['password'] ?? '';

    if (!$email || !$password) json_out(['error' => 'Email et mot de passe requis'], 400);

    $db  = get_db();
    $row = $db->prepare("SELECT * FROM clients WHERE email=? AND active=1");
    $row->execute([$email]);
    $client = $row->fetch();

    if (!$client || !password_verify($password, $client['password']))
        json_out(['error' => 'Email ou mot de passe incorrect'], 401);

    $token = bin2hex(random_bytes(32));
    $db->prepare("INSERT INTO client_sessions (client_id,token,expires_at) VALUES (?,?,DATE_ADD(NOW(), INTERVAL 12 HOUR))")
       ->execute([$client['id'], $token]);

    json_out([
        'token'  => $token,
        'client' => [
            'id'      => $client['id'],
            'name'    => $client['name'],
            'email'   => $client['email'],
            'company' => $client['company'],
            'phone'   => $client['phone'],
        ],
    ]);
}

// ── Déconnexion ───────────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'logout') {
    $token = get_token();
    if ($token) get_db()->prepare("DELETE FROM client_sessions WHERE token=?")->execute([$token]);
    json_out(['success' => true]);
}

// ── Profil courant ────────────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'me') {
    $me = client_auth();
    $db = get_db();

    $project = null;
    if ($me['project_id']) {
        $p = $db->prepare("SELECT id,name,client,status,progress,deadline,budget FROM projects WHERE id=?");
        $p->execute([$me['project_id']]);
        $project = $p->fetch();
    }

    // Nombre de messages non lus de l'équipe
    $unread = $db->prepare("SELECT COUNT(*) FROM client_messages WHERE client_id=? AND sender_type='agent' AND is_read=0");
    $unread->execute([$me['id']]);

    json_out([
        'id'      => $me['id'],
        'name'    => $me['name'],
        'email'   => $me['email'],
        'company' => $me['company'],
        'phone'   => $me['phone'],
        'project' => $project,
        'unread'  => (int)$unread->fetchColumn(),
    ]);
}

// ── Modifier profil ───────────────────────────────────────────────────────────
if ($method === 'PUT' && $action === 'profile') {
    $me = client_auth();
    $b  = body();
    $db = get_db();
    $db->prepare("UPDATE clients SET name=?,company=?,phone=? WHERE id=?")
       ->execute([trim($b['name']??$me['name']), trim($b['company']??''), trim($b['phone']??''), $me['id']]);
    json_out(['success' => true]);
}

// ── Changer mot de passe ──────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'change_password') {
    $me = client_auth();
    $b  = body();
    $db = get_db();
    $row = $db->prepare("SELECT password FROM clients WHERE id=?");
    $row->execute([$me['id']]);
    $current = $row->fetchColumn();
    if (!password_verify($b['old_password']??'', $current))
        json_out(['error' => 'Mot de passe actuel incorrect'], 401);
    if (strlen($b['new_password']??'') < 6)
        json_out(['error' => 'Nouveau mot de passe trop court'], 400);
    $db->prepare("UPDATE clients SET password=? WHERE id=?")
       ->execute([password_hash($b['new_password'], PASSWORD_BCRYPT), $me['id']]);
    json_out(['success' => true]);
}

json_out(['error' => 'Action non trouvée'], 404);

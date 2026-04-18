<?php
require_once __DIR__ . '/helpers.php';
db_init();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── Login ─────────────────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'login') {
    $b = body();
    $username = trim($b['username'] ?? '');
    $password = $b['password'] ?? '';

    if (!$username || !$password) json_out(['error' => 'Identifiants requis'], 400);

    $db  = get_db();
    $row = $db->prepare("SELECT * FROM users WHERE username=? AND active=1");
    $row->execute([$username]);
    $user = $row->fetch();

    if (!$user || !password_verify($password, $user['password']))
        json_out(['error' => 'Identifiants incorrects'], 401);

    // Create session token
    $token = bin2hex(random_bytes(32));
    $db->prepare("
        INSERT INTO sessions (user_id, token, expires_at)
        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 8 HOUR))
    ")->execute([$user['id'], $token]);

    // Update last login
    $db->prepare("UPDATE users SET last_login=NOW() WHERE id=?")
       ->execute([$user['id']]);

    json_out([
        'token'       => $token,
        'first_login' => (bool)$user['first_login'],
        'user'        => [
            'id'        => $user['id'],
            'username'  => $user['username'],
            'full_name' => $user['full_name'],
            'email'     => $user['email'],
            'role'      => $user['role'],
            'avatar'    => $user['avatar'],
        ],
    ]);
}

// ── Logout ────────────────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'logout') {
    $token = get_token();
    if ($token) get_db()->prepare("DELETE FROM sessions WHERE token=?")->execute([$token]);
    json_out(['success' => true]);
}

// ── Change password ───────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'change_password') {
    $me = auth_required();
    $b  = body();
    $new_password = $b['new_password'] ?? '';
    $old_password = $b['old_password'] ?? '';

    if (strlen($new_password) < 6)
        json_out(['error' => 'Mot de passe trop court (min. 6 caractères)'], 400);

    // If not first login, require old password
    if (!$me['first_login']) {
        $row = get_db()->prepare("SELECT password FROM users WHERE id=?");
        $row->execute([$me['id']]);
        $user = $row->fetch();
        if (!password_verify($old_password, $user['password']))
            json_out(['error' => 'Ancien mot de passe incorrect'], 401);
    }

    $hash = password_hash($new_password, PASSWORD_BCRYPT, ['cost' => 12]);
    get_db()->prepare("UPDATE users SET password=?, first_login=0 WHERE id=?")
            ->execute([$hash, $me['id']]);

    json_out(['success' => true, 'message' => 'Mot de passe modifié avec succès']);
}

// ── Get current user ──────────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'me') {
    $me = auth_required();
    json_out([
        'id'          => $me['id'],
        'username'    => $me['username'],
        'full_name'   => $me['full_name'],
        'email'       => $me['email'],
        'role'        => $me['role'],
        'avatar'      => $me['avatar'],
        'first_login' => (bool)$me['first_login'],
    ]);
}

// ── Update profile (username/email) ──────────────────────────────────────────
if ($method === 'PUT' && $action === 'profile') {
    $me = auth_required();
    $b  = body();
    $db = get_db();

    $username  = trim($b['username'] ?? $me['username']);
    $full_name = trim($b['full_name'] ?? $me['full_name']);
    $email     = trim($b['email'] ?? $me['email']);

    // Check username uniqueness
    $exists = $db->prepare("SELECT id FROM users WHERE username=? AND id!=?");
    $exists->execute([$username, $me['id']]);
    if ($exists->fetch()) json_out(['error' => 'Ce nom d\'utilisateur est déjà pris'], 409);

    $db->prepare("UPDATE users SET username=?, full_name=?, email=? WHERE id=?")
       ->execute([$username, $full_name, $email, $me['id']]);

    json_out(['success' => true, 'message' => 'Profil mis à jour']);
}

json_out(['error' => 'Action non trouvée'], 404);

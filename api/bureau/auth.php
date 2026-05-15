<?php
/**
 * Auth bureau — erreurs PDO / logique renvoyées en JSON (évite page HTML 500 vide).
 */
require_once __DIR__ . '/helpers.php';

header('Content-Type: application/json; charset=utf-8');

try {
    db_init();

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = $_GET['action'] ?? '';

    // ── Login ─────────────────────────────────────────────────────────────────
    if ($method === 'POST' && $action === 'login') {
        $b = body();
        $username = trim($b['username'] ?? '');
        $password = $b['password'] ?? '';

        if (!$username || !$password) {
            json_out(['error' => 'Identifiants requis'], 400);
        }

        $db  = get_db();
        $row = $db->prepare('SELECT * FROM users WHERE username=? AND active=1');
        $row->execute([$username]);
        $user = $row->fetch();

        if (!$user || empty($user['password']) || !is_string($user['password'])) {
            json_out(['error' => 'Identifiants incorrects'], 401);
        }

        if (!password_verify($password, $user['password'])) {
            json_out(['error' => 'Identifiants incorrects'], 401);
        }

        $token = bin2hex(random_bytes(32));
        $db->prepare('
            INSERT INTO sessions (user_id, token, expires_at)
            VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 8 HOUR))
        ')->execute([$user['id'], $token]);

        $db->prepare('UPDATE users SET last_login=NOW() WHERE id=?')->execute([$user['id']]);

        json_out([
            'token'       => $token,
            'first_login' => (bool) $user['first_login'],
            'user'        => [
                'id'        => (int) $user['id'],
                'username'  => $user['username'],
                'full_name' => $user['full_name'],
                'email'     => $user['email'],
                'role'      => $user['role'],
                'avatar'    => $user['avatar'],
            ],
        ]);
    }

    // ── Logout ────────────────────────────────────────────────────────────────
    if ($method === 'POST' && $action === 'logout') {
        $token = get_token();
        if ($token) {
            get_db()->prepare('DELETE FROM sessions WHERE token=?')->execute([$token]);
        }
        json_out(['success' => true]);
    }

    // ── Change password ──────────────────────────────────────────────────────
    if ($method === 'POST' && $action === 'change_password') {
        $me = auth_required();
        $b  = body();
        $new_password = $b['new_password'] ?? '';
        $old_password = $b['old_password'] ?? '';

        if (strlen($new_password) < 6) {
            json_out(['error' => 'Mot de passe trop court (min. 6 caractères)'], 400);
        }

        if (!$me['first_login']) {
            $row = get_db()->prepare('SELECT password FROM users WHERE id=?');
            $row->execute([$me['id']]);
            $urow = $row->fetch();
            if (!$urow || empty($urow['password']) || !password_verify($old_password, $urow['password'])) {
                json_out(['error' => 'Ancien mot de passe incorrect'], 401);
            }
        }

        $hash = password_hash($new_password, PASSWORD_BCRYPT, ['cost' => 12]);
        get_db()->prepare('UPDATE users SET password=?, first_login=0 WHERE id=?')
            ->execute([$hash, $me['id']]);

        json_out(['success' => true, 'message' => 'Mot de passe modifié avec succès']);
    }

    // ── Me ────────────────────────────────────────────────────────────────────
    if ($method === 'GET' && $action === 'me') {
        $me = auth_required();
        json_out([
            'id'          => (int) $me['id'],
            'username'    => $me['username'],
            'full_name'   => $me['full_name'],
            'email'       => $me['email'],
            'role'        => $me['role'],
            'avatar'      => $me['avatar'],
            'first_login' => (bool) $me['first_login'],
        ]);
    }

    // ── Update profile ───────────────────────────────────────────────────────
    if ($method === 'PUT' && $action === 'profile') {
        $me = auth_required();
        $b  = body();
        $db = get_db();

        $username  = trim($b['username'] ?? $me['username']);
        $full_name = trim($b['full_name'] ?? $me['full_name']);
        $email     = trim($b['email'] ?? $me['email']);

        $exists = $db->prepare('SELECT id FROM users WHERE username=? AND id!=?');
        $exists->execute([$username, $me['id']]);
        if ($exists->fetch()) {
            json_out(['error' => "Ce nom d'utilisateur est déjà pris"], 409);
        }

        $db->prepare('UPDATE users SET username=?, full_name=?, email=? WHERE id=?')
            ->execute([$username, $full_name, $email, $me['id']]);

        json_out(['success' => true, 'message' => 'Profil mis à jour']);
    }

    json_out(['error' => 'Action non trouvée'], 404);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error'  => 'Erreur serveur',
        'detail' => $e->getMessage(),
        'hint'   => 'Vérifiez que sql/setup.sql est importé (tables users + sessions). Voir sql/bootstrap_afrilex_agent_mysql.sql pour un compte secours.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

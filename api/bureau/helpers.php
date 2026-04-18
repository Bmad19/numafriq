<?php
require_once __DIR__ . '/../config.php';

// ── Init tables (idempotent) ──────────────────────────────────────────────────
function db_init(): void {
    static $done = false;
    if ($done) return;
    $done = true;
    // Les tables sont créées via sql/setup.sql — rien à faire ici en prod
}

// ── Helpers réponse ───────────────────────────────────────────────────────────
function json_out(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function body(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

function get_token(): ?string {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', $h, $m)) return $m[1];
    return null;
}

function auth_required(?string $role = null): array {
    $token = get_token();
    if (!$token) json_out(['error' => 'Non authentifié'], 401);

    $db  = get_db();
    $row = $db->prepare("
        SELECT u.* FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > NOW() AND u.active = 1
    ");
    $row->execute([$token]);
    $user = $row->fetch();

    if (!$user) json_out(['error' => 'Session expirée'], 401);

    if ($role) {
        $hierarchy = ['agent'=>1, 'admin'=>2, 'super_admin'=>3];
        $required  = $hierarchy[$role] ?? 0;
        $current   = $hierarchy[$user['role']] ?? 0;
        if ($current < $required) json_out(['error' => 'Accès refusé'], 403);
    }

    $db->prepare("UPDATE sessions SET expires_at = DATE_ADD(NOW(), INTERVAL 8 HOUR) WHERE token = ?")
       ->execute([$token]);

    return $user;
}

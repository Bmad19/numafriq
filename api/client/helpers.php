<?php
require_once __DIR__ . '/../config.php';

function client_db_init(): void {
    // Tables créées via sql/setup.sql
}

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

function client_auth(): array {
    $token = get_token();
    if (!$token) json_out(['error' => 'Non authentifié'], 401);

    $db  = get_db();
    $row = $db->prepare("
        SELECT c.* FROM client_sessions s
        JOIN clients c ON c.id = s.client_id
        WHERE s.token = ? AND s.expires_at > NOW() AND c.active = 1
    ");
    $row->execute([$token]);
    $client = $row->fetch();
    if (!$client) json_out(['error' => 'Session expirée'], 401);

    $db->prepare("UPDATE client_sessions SET expires_at = DATE_ADD(NOW(), INTERVAL 12 HOUR) WHERE token = ?")
       ->execute([$token]);
    return $client;
}

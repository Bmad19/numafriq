<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../whatsapp.php';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

client_db_init();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$since  = (int)($_GET['since'] ?? 0);

// ── Liste des messages ────────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'list') {
    $me = client_auth();
    $db = get_db();

    $q = $since
        ? "SELECT * FROM client_messages WHERE client_id=? AND id>? ORDER BY created_at ASC"
        : "SELECT * FROM client_messages WHERE client_id=? ORDER BY created_at ASC LIMIT 100";
    $s = $db->prepare($q);
    $since ? $s->execute([$me['id'], $since]) : $s->execute([$me['id']]);
    $msgs = $s->fetchAll();

    // Marquer comme lus les messages de l'agent
    $db->prepare("UPDATE client_messages SET is_read=1 WHERE client_id=? AND sender_type='agent' AND is_read=0")
       ->execute([$me['id']]);

    json_out($msgs);
}

// ── Envoyer un message (côté client) ─────────────────────────────────────────
if ($method === 'POST' && $action === 'send') {
    $me = client_auth();
    $b  = body();
    $content = trim($b['content'] ?? '');
    if (!$content) json_out(['error' => 'Message vide'], 400);

    $db = get_db();
    $db->prepare("INSERT INTO client_messages (client_id,sender_type,content) VALUES (?,'client',?)")
       ->execute([$me['id'], $content]);
    $id = $db->lastInsertId();

    // Notification WhatsApp à chaque nouveau message client
    $clientName = $me['name'] ?? 'Client';
    sendWhatsApp(waMsgClientMessage($clientName, $content));

    $msg = $db->prepare("SELECT * FROM client_messages WHERE id=?");
    $msg->execute([$id]);
    json_out(['success' => true, 'message' => $msg->fetch()]);
}

// ── Nombre de non-lus ─────────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'unread') {
    $me  = client_auth();
    $cnt = get_db()->prepare("SELECT COUNT(*) FROM client_messages WHERE client_id=? AND sender_type='agent' AND is_read=0");
    $cnt->execute([$me['id']]);
    json_out(['count' => (int)$cnt->fetchColumn()]);
}

// ────── Pour les agents (répondre à un client) ────────────────────────────────
// Nécessite une session agent valide (via bureau/helpers.php)
if ($method === 'POST' && $action === 'agent_reply') {
    require_once __DIR__ . '/../bureau/helpers.php';
    $agent    = auth_required();
    $b        = body();
    $clientId = (int)($b['client_id'] ?? 0);
    $content  = trim($b['content'] ?? '');
    if (!$clientId || !$content) json_out(['error' => 'Champs requis manquants'], 400);

    $db = get_db();
    $db->prepare("INSERT INTO client_messages (client_id,sender_type,sender_id,content) VALUES (?,'agent',?,?)")
       ->execute([$clientId, $agent['id'], $content]);
    json_out(['success' => true]);
}

// ── Liste conversations pour agents ──────────────────────────────────────────
if ($method === 'GET' && $action === 'conversations') {
    require_once __DIR__ . '/../bureau/helpers.php';
    auth_required();

    $db   = get_db();
    $rows = $db->query("
        SELECT c.id, c.name, c.email, c.company,
               COUNT(CASE WHEN cm.sender_type='client' AND cm.is_read=0 THEN 1 END) as unread,
               MAX(cm.created_at) as last_message_at,
               (SELECT content FROM client_messages WHERE client_id=c.id ORDER BY created_at DESC LIMIT 1) as last_message
        FROM clients c
        LEFT JOIN client_messages cm ON cm.client_id=c.id
        WHERE c.active=1
        GROUP BY c.id
        ORDER BY last_message_at DESC
    ")->fetchAll();
    json_out($rows);
}

// ── Historique d'une conversation (pour agents) ───────────────────────────────
if ($method === 'GET' && $action === 'thread') {
    require_once __DIR__ . '/../bureau/helpers.php';
    auth_required();
    $clientId = (int)($_GET['client_id'] ?? 0);
    if (!$clientId) json_out(['error' => 'client_id requis'], 400);

    $db   = get_db();
    $msgs = $db->prepare("SELECT cm.*, u.full_name as agent_name FROM client_messages cm LEFT JOIN users u ON u.id=cm.sender_id WHERE cm.client_id=? ORDER BY cm.created_at ASC");
    $msgs->execute([$clientId]);

    // Marquer messages client comme lus
    $db->prepare("UPDATE client_messages SET is_read=1 WHERE client_id=? AND sender_type='client' AND is_read=0")
       ->execute([$clientId]);

    json_out($msgs->fetchAll());
}

json_out(['error' => 'Action non trouvée'], 404);

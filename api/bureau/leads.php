<?php
require_once __DIR__ . '/helpers.php';
db_init();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id     = (int)($_GET['id'] ?? 0);

// ── List ──────────────────────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'list') {
    auth_required();
    $db   = get_db();
    $rows = $db->query("SELECT * FROM leads ORDER BY created_at DESC")->fetchAll();
    json_out($rows);
}

// ── Get one ───────────────────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'get' && $id) {
    auth_required();
    $stmt = get_db()->prepare("SELECT * FROM leads WHERE id = ?");
    $stmt->execute([$id]);
    $lead = $stmt->fetch();
    if (!$lead) json_out(['error' => 'Demande non trouvée'], 404);

    // Marquer automatiquement comme "vu" si encore "nouveau"
    if ($lead['status'] === 'nouveau') {
        get_db()->prepare("UPDATE leads SET status = 'vu' WHERE id = ?")->execute([$id]);
        $lead['status'] = 'vu';
    }
    json_out($lead);
}

// ── Update status ─────────────────────────────────────────────────────────────
if ($method === 'PUT' && $action === 'update' && $id) {
    auth_required();
    $b      = body();
    $status = $b['status'] ?? '';
    $allowed = ['nouveau', 'vu', 'traite', 'archive'];
    if (!in_array($status, $allowed, true)) {
        json_out(['error' => 'Statut invalide'], 422);
    }
    get_db()->prepare("UPDATE leads SET status = ? WHERE id = ?")->execute([$status, $id]);
    json_out(['success' => true, 'message' => 'Statut mis à jour']);
}

// ── Delete ────────────────────────────────────────────────────────────────────
if ($method === 'DELETE' && $action === 'delete' && $id) {
    auth_required('admin');
    get_db()->prepare("DELETE FROM leads WHERE id = ?")->execute([$id]);
    json_out(['success' => true, 'message' => 'Demande supprimée']);
}

// ── Stats ─────────────────────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'stats') {
    auth_required();
    $db = get_db();
    json_out([
        'total'   => (int)$db->query("SELECT COUNT(*) FROM leads")->fetchColumn(),
        'nouveau' => (int)$db->query("SELECT COUNT(*) FROM leads WHERE status='nouveau'")->fetchColumn(),
        'vu'      => (int)$db->query("SELECT COUNT(*) FROM leads WHERE status='vu'")->fetchColumn(),
        'traite'  => (int)$db->query("SELECT COUNT(*) FROM leads WHERE status='traite'")->fetchColumn(),
        'archive' => (int)$db->query("SELECT COUNT(*) FROM leads WHERE status='archive'")->fetchColumn(),
    ]);
}

json_out(['error' => 'Action non trouvée'], 404);

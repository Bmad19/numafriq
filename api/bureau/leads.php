<?php
require_once __DIR__ . '/helpers.php';
db_init();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id     = (int)($_GET['id'] ?? 0);

$STATUSES = ['nouveau', 'en_cours', 'converti', 'perdu', 'archive'];

// ── List ───────────────────────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'list') {
    auth_required();
    $db   = get_db();
    $rows = $db->query("
        SELECT l.*, u.full_name AS agent_name
        FROM leads l
        LEFT JOIN users u ON u.id = l.assigned_to
        ORDER BY l.created_at DESC
    ")->fetchAll(PDO::FETCH_ASSOC);
    json_out($rows);
}

// ── Stats ─────────────────────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'stats') {
    auth_required();
    $db      = get_db();
    $total = (int)$db->query("SELECT COUNT(*) FROM leads")->fetchColumn();
    $by    = [];
    $qc    = $db->prepare("SELECT COUNT(*) FROM leads WHERE status = ?");
    foreach ($STATUSES as $st) {
        $qc->execute([$st]);
        $by[$st] = (int)$qc->fetchColumn();
    }
    json_out(array_merge(['total' => $total], $by));
}

// ── Update (statut / assignation / notes) ───────────────────────────────────────
if ($method === 'PUT' && $action === 'update' && $id) {
    auth_required();
    $b      = body();
    $fields = [];
    $params = [];

    if (array_key_exists('status', $b)) {
        $st = $b['status'];
        if (!in_array($st, $STATUSES, true)) {
            json_out(['error' => 'Statut invalide'], 422);
        }
        $fields[] = 'status = ?';
        $params[] = $st;
    }
    if (array_key_exists('assigned_to', $b)) {
        $aid = $b['assigned_to'];
        if ($aid === '' || $aid === null) {
            $fields[] = 'assigned_to = ?';
            $params[] = null;
        } else {
            $fields[] = 'assigned_to = ?';
            $params[] = (int)$aid;
        }
    }
    if (array_key_exists('notes', $b)) {
        $fields[] = 'notes = ?';
        $params[] = $b['notes'] ?? null;
    }

    if (!$fields) {
        json_out(['error' => 'Aucun champ à mettre à jour'], 422);
    }

    $params[] = $id;
    $sql      = 'UPDATE leads SET ' . implode(', ', $fields) . ' WHERE id = ?';
    get_db()->prepare($sql)->execute($params);
    json_out(['success' => true, 'message' => 'Mis à jour']);
}

// ── Delete ─────────────────────────────────────────────────────────────────────
if ($method === 'DELETE' && $action === 'delete' && $id) {
    auth_required('admin');
    get_db()->prepare('DELETE FROM leads WHERE id = ?')->execute([$id]);
    json_out(['success' => true, 'message' => 'Demande supprimée']);
}

json_out(['error' => 'Action non trouvée'], 404);

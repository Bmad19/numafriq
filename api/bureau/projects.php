<?php
require_once __DIR__ . '/helpers.php';
db_init();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id     = (int)($_GET['id'] ?? 0);

// ── List ──────────────────────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'list') {
    $me = auth_required();
    $db = get_db();
    $q  = "SELECT p.*,u.full_name as agent_name FROM projects p LEFT JOIN users u ON u.id=p.assigned_to";
    $rows = $db->query($q . " ORDER BY p.created_at DESC")->fetchAll();
    json_out($rows);
}

// ── Get one ───────────────────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'get' && $id) {
    auth_required();
    $row = get_db()->prepare("SELECT p.*,u.full_name as agent_name FROM projects p LEFT JOIN users u ON u.id=p.assigned_to WHERE p.id=?");
    $row->execute([$id]);
    $proj = $row->fetch();
    if (!$proj) json_out(['error'=>'Projet non trouvé'],404);

    // Missions
    $missions = get_db()->prepare("SELECT m.*,u.full_name as assignee_name FROM missions m LEFT JOIN users u ON u.id=m.assigned_to WHERE m.project_id=? ORDER BY m.created_at DESC");
    $missions->execute([$id]);
    $proj['missions'] = $missions->fetchAll();
    json_out($proj);
}

// ── Create ────────────────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'create') {
    $me = auth_required('admin');
    $b  = body();
    $db = get_db();

    $db->prepare("INSERT INTO projects (name,client,description,status,priority,budget,deadline,assigned_to,created_by)
                  VALUES (?,?,?,?,?,?,?,?,?)")
       ->execute([$b['name'],$b['client'],$b['description']??null,$b['status']??'en_cours',$b['priority']??'normale',(float)($b['budget']??0),$b['deadline']??null,$b['assigned_to']??null,$me['id']]);
    json_out(['success'=>true,'id'=>$db->lastInsertId(),'message'=>'Projet créé']);
}

// ── Update ────────────────────────────────────────────────────────────────────
if ($method === 'PUT' && $action === 'update' && $id) {
    auth_required('admin');
    $b  = body();
    get_db()->prepare("UPDATE projects SET name=?,client=?,description=?,status=?,priority=?,budget=?,deadline=?,assigned_to=?,progress=?,updated_at=NOW() WHERE id=?")
            ->execute([$b['name'],$b['client'],$b['description']??null,$b['status'],$b['priority'],(float)($b['budget']??0),$b['deadline']??null,$b['assigned_to']??null,(int)($b['progress']??0),$id]);
    json_out(['success'=>true,'message'=>'Projet mis à jour']);
}

// ── Delete ────────────────────────────────────────────────────────────────────
if ($method === 'DELETE' && $action === 'delete' && $id) {
    auth_required('admin');
    get_db()->prepare("DELETE FROM projects WHERE id=?")->execute([$id]);
    json_out(['success'=>true,'message'=>'Projet supprimé']);
}

// ── Stats ─────────────────────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'stats') {
    auth_required();
    $db   = get_db();
    $data = [
        'total'     => $db->query("SELECT COUNT(*) FROM projects")->fetchColumn(),
        'en_cours'  => $db->query("SELECT COUNT(*) FROM projects WHERE status='en_cours'")->fetchColumn(),
        'termine'   => $db->query("SELECT COUNT(*) FROM projects WHERE status='termine'")->fetchColumn(),
        'en_pause'  => $db->query("SELECT COUNT(*) FROM projects WHERE status='en_pause'")->fetchColumn(),
        'budget_total' => $db->query("SELECT SUM(budget) FROM projects WHERE status!='annule'")->fetchColumn() ?? 0,
    ];
    json_out($data);
}

json_out(['error'=>'Action non trouvée'],404);

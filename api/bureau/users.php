<?php
require_once __DIR__ . '/helpers.php';
db_init();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id     = (int)($_GET['id'] ?? 0);

// ── List users ────────────────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'list') {
    auth_required('admin');
    $rows = get_db()->query("SELECT id,username,full_name,email,role,avatar,active,created_at,last_login FROM users ORDER BY role DESC,full_name ASC")->fetchAll();
    json_out($rows);
}

// ── Create user ───────────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'create') {
    auth_required('super_admin');
    $b = body();
    ['username'=>$u,'full_name'=>$fn,'email'=>$em,'role'=>$role,'password'=>$pw] = $b + ['username'=>'','full_name'=>'','email'=>'','role'=>'agent','password'=>''];

    if (!$u || !$fn || !$pw) json_out(['error' => 'Champs requis manquants'], 400);
    if (!in_array($role,['agent','admin','super_admin'])) json_out(['error'=>'Rôle invalide'],400);

    $hash = password_hash($pw, PASSWORD_BCRYPT, ['cost'=>12]);
    try {
        get_db()->prepare("INSERT INTO users (username,password,full_name,email,role,first_login) VALUES (?,?,?,?,?,1)")
                ->execute([$u,$hash,$fn,$em,$role]);
        json_out(['success'=>true,'message'=>"Utilisateur $fn créé avec succès"]);
    } catch (Exception $e) {
        json_out(['error'=>'Ce nom d\'utilisateur existe déjà'],409);
    }
}

// ── Update user ───────────────────────────────────────────────────────────────
if ($method === 'PUT' && $action === 'update' && $id) {
    auth_required('super_admin');
    $b  = body();
    $db = get_db();
    $row = $db->prepare("SELECT * FROM users WHERE id=?")->execute([$id]) && $db->prepare("SELECT * FROM users WHERE id=?")->execute([$id]);

    $username  = trim($b['username'] ?? '');
    $full_name = trim($b['full_name'] ?? '');
    $email     = trim($b['email'] ?? '');
    $role      = $b['role'] ?? 'agent';
    $active    = isset($b['active']) ? (int)$b['active'] : 1;

    $db->prepare("UPDATE users SET username=?,full_name=?,email=?,role=?,active=? WHERE id=?")
       ->execute([$username,$full_name,$email,$role,$active,$id]);
    json_out(['success'=>true,'message'=>'Utilisateur mis à jour']);
}

// ── Delete user ───────────────────────────────────────────────────────────────
if ($method === 'DELETE' && $action === 'delete' && $id) {
    $me = auth_required('super_admin');
    if ($me['id'] === $id) json_out(['error'=>'Vous ne pouvez pas supprimer votre propre compte'],400);
    get_db()->prepare("UPDATE users SET active=0 WHERE id=?")->execute([$id]);
    json_out(['success'=>true,'message'=>'Utilisateur désactivé']);
}

// ── Reset password ────────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'reset_password' && $id) {
    auth_required('super_admin');
    $b  = body();
    $pw = $b['password'] ?? 'Numafriq2026!';
    $hash = password_hash($pw, PASSWORD_BCRYPT, ['cost'=>12]);
    get_db()->prepare("UPDATE users SET password=?,first_login=1 WHERE id=?")->execute([$hash,$id]);
    json_out(['success'=>true,'message'=>'Mot de passe réinitialisé. L\'agent devra le changer à la prochaine connexion.']);
}

json_out(['error'=>'Action non trouvée'],404);

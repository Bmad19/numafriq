<?php require_once __DIR__ . '/helpers.php'; db_init();
$method=$_SERVER['REQUEST_METHOD']; $action=$_GET['action']??''; $id=(int)($_GET['id']??0);

if ($method==='GET' && $action==='list') {
    auth_required();
    $rows=get_db()->query("SELECT f.*,p.name as project_name FROM feedback f LEFT JOIN projects p ON p.id=f.project_id ORDER BY f.created_at DESC")->fetchAll();
    json_out($rows);
}
if ($method==='POST' && $action==='create') {
    auth_required('admin'); $b=body();
    get_db()->prepare("INSERT INTO feedback (client_name,project_id,rating,comment,category,status) VALUES (?,?,?,?,?,?)")
            ->execute([$b['client_name'],$b['project_id']??null,(int)($b['rating']??5),$b['comment']??null,$b['category']??'satisfaction','nouveau']);
    json_out(['success'=>true,'message'=>'Retour client ajouté']);
}
if ($method==='PUT' && $action==='update' && $id) {
    auth_required('admin'); $b=body();
    get_db()->prepare("UPDATE feedback SET status=? WHERE id=?")->execute([$b['status'],$id]);
    json_out(['success'=>true,'message'=>'Retour mis à jour']);
}
if ($method==='DELETE' && $action==='delete' && $id) {
    auth_required('admin'); get_db()->prepare("DELETE FROM feedback WHERE id=?")->execute([$id]);
    json_out(['success'=>true,'message'=>'Supprimé']);
}
json_out(['error'=>'Action non trouvée'],404);

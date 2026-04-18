<?php require_once __DIR__ . '/helpers.php'; db_init();
$method=$_SERVER['REQUEST_METHOD']; $action=$_GET['action']??''; $id=(int)($_GET['id']??0);

if ($method==='GET' && $action==='list') {
    $me=auth_required();
    $db=get_db();
    $q = $me['role']==='agent'
        ? "SELECT m.*,u.full_name as assignee,p.name as project_name FROM missions m LEFT JOIN users u ON u.id=m.assigned_to LEFT JOIN projects p ON p.id=m.project_id WHERE m.assigned_to=? ORDER BY m.created_at DESC"
        : "SELECT m.*,u.full_name as assignee,p.name as project_name FROM missions m LEFT JOIN users u ON u.id=m.assigned_to LEFT JOIN projects p ON p.id=m.project_id ORDER BY m.created_at DESC";
    $s=$db->prepare($q);
    $me['role']==='agent' ? $s->execute([$me['id']]) : $s->execute([]);
    json_out($s->fetchAll());
}
if ($method==='POST' && $action==='create') {
    $me=auth_required('admin'); $b=body();
    get_db()->prepare("INSERT INTO missions (title,description,project_id,assigned_to,assigned_by,status,due_date) VALUES (?,?,?,?,?,?,?)")
            ->execute([$b['title'],$b['description']??null,$b['project_id']??null,$b['assigned_to'],$me['id'],$b['status']??'a_faire',$b['due_date']??null]);
    json_out(['success'=>true,'message'=>'Mission assignée']);
}
if ($method==='PUT' && $action==='update' && $id) {
    $me=auth_required(); $b=body();
    if ($me['role']==='agent') {
        get_db()->prepare("UPDATE missions SET status=? WHERE id=? AND assigned_to=?")->execute([$b['status'],$id,$me['id']]);
    } else {
        get_db()->prepare("UPDATE missions SET title=?,description=?,status=?,due_date=?,assigned_to=? WHERE id=?")->execute([$b['title'],$b['description']??null,$b['status'],$b['due_date']??null,$b['assigned_to'],$id]);
    }
    json_out(['success'=>true,'message'=>'Mission mise à jour']);
}
if ($method==='DELETE' && $action==='delete' && $id) {
    auth_required('admin'); get_db()->prepare("DELETE FROM missions WHERE id=?")->execute([$id]);
    json_out(['success'=>true,'message'=>'Mission supprimée']);
}
json_out(['error'=>'Action non trouvée'],404);

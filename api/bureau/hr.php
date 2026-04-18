<?php require_once __DIR__ . '/helpers.php'; db_init();
$method=$_SERVER['REQUEST_METHOD']; $action=$_GET['action']??''; $id=(int)($_GET['id']??0);

if ($method==='GET' && $action==='list') {
    auth_required();
    $rows=get_db()->query("SELECT h.*,u.full_name as employee_name FROM hr_records h LEFT JOIN users u ON u.id=h.user_id ORDER BY h.date DESC")->fetchAll();
    json_out($rows);
}
if ($method==='POST' && $action==='create') {
    $me=auth_required('admin'); $b=body();
    get_db()->prepare("INSERT INTO hr_records (user_id,type,title,description,date,amount,status,created_by) VALUES (?,?,?,?,?,?,?,?)")
            ->execute([$b['user_id'],$b['type'],$b['title'],$b['description']??null,$b['date'],(float)($b['amount']??0),$b['status']??'en_attente',$me['id']]);
    json_out(['success'=>true,'message'=>'Enregistrement RH ajouté']);
}
if ($method==='PUT' && $action==='update' && $id) {
    auth_required('admin'); $b=body();
    get_db()->prepare("UPDATE hr_records SET status=?,description=? WHERE id=?")->execute([$b['status'],$b['description']??null,$id]);
    json_out(['success'=>true,'message'=>'RH mis à jour']);
}
if ($method==='DELETE' && $action==='delete' && $id) {
    auth_required('super_admin'); get_db()->prepare("DELETE FROM hr_records WHERE id=?")->execute([$id]);
    json_out(['success'=>true,'message'=>'Supprimé']);
}
if ($method==='GET' && $action==='stats') {
    auth_required();
    $db=get_db();
    json_out([
        'total_conges'   =>$db->query("SELECT COUNT(*) FROM hr_records WHERE type='conge'")->fetchColumn(),
        'en_attente'     =>$db->query("SELECT COUNT(*) FROM hr_records WHERE status='en_attente'")->fetchColumn(),
        'total_primes'   =>$db->query("SELECT SUM(amount) FROM hr_records WHERE type='prime' AND status='approuve'")->fetchColumn()??0,
    ]);
}
json_out(['error'=>'Action non trouvée'],404);

<?php require_once __DIR__ . '/helpers.php'; db_init();
$method=$_SERVER['REQUEST_METHOD']; $action=$_GET['action']??''; $id=(int)($_GET['id']??0);

if ($method==='GET' && $action==='list') {
    auth_required();
    $rows=get_db()->query("SELECT a.*,u.full_name as created_by_name,p.name as project_name FROM accounting a LEFT JOIN users u ON u.id=a.created_by LEFT JOIN projects p ON p.id=a.project_id ORDER BY a.date DESC")->fetchAll();
    json_out($rows);
}
if ($method==='GET' && $action==='stats') {
    auth_required();
    $db=get_db();
    $recettes=(float)$db->query("SELECT SUM(amount) FROM accounting WHERE type='recette'")->fetchColumn();
    $depenses=(float)$db->query("SELECT SUM(amount) FROM accounting WHERE type='depense'")->fetchColumn();
    json_out([
        'recettes'=>$recettes,
        'depenses'=>$depenses,
        'solde'   =>$recettes-$depenses,
        'by_month'=>$db->query("SELECT strftime('%Y-%m',date) as month,type,SUM(amount) as total FROM accounting GROUP BY month,type ORDER BY month DESC LIMIT 24")->fetchAll(),
    ]);
}
if ($method==='POST' && $action==='create') {
    $me=auth_required('admin'); $b=body();
    get_db()->prepare("INSERT INTO accounting (type,category,amount,description,project_id,date,created_by) VALUES (?,?,?,?,?,?,?)")
            ->execute([$b['type'],$b['category'],(float)$b['amount'],$b['description'],$b['project_id']??null,$b['date'],$me['id']]);
    json_out(['success'=>true,'message'=>'Écriture comptable ajoutée']);
}
if ($method==='DELETE' && $action==='delete' && $id) {
    auth_required('admin'); get_db()->prepare("DELETE FROM accounting WHERE id=?")->execute([$id]);
    json_out(['success'=>true,'message'=>'Supprimé']);
}
json_out(['error'=>'Action non trouvée'],404);

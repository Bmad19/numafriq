<?php
require_once __DIR__ . '/whatsapp.php';
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);

if (!$body) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Données invalides']);
    exit;
}

$name     = trim($body['from_name']   ?? '');
$email    = filter_var(trim($body['from_email'] ?? ''), FILTER_SANITIZE_EMAIL);
$phone    = trim($body['phone']    ?? '');
$company  = trim($body['company']  ?? '');
$service  = trim($body['service']  ?? '');
$budget   = trim($body['budget']   ?? '');
$timeline = trim($body['timeline'] ?? '');
$message  = trim($body['message']  ?? '');

if (!$name || !$email || !$message) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Champs requis manquants']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Email invalide']);
    exit;
}

// ── Enregistrement en base de données ────────────────────────────────────────
try {
    $db = get_db();
    $stmt = $db->prepare("
        INSERT INTO leads (name, email, phone, company, service, budget, timeline, message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $name,
        $email,
        $phone    ?: null,
        $company  ?: null,
        $service  ?: null,
        $budget   ?: null,
        $timeline ?: null,
        $message,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'enregistrement de votre demande.']);
    exit;
}

// ── Notification WhatsApp (optionnel) ─────────────────────────────────────────
$waMsg = waMsgContact(
    $name,
    $email,
    $phone    ?: 'Non renseigné',
    $service  ?: 'Non précisé',
    $budget   ?: 'Non précisé',
    $message
);
sendWhatsApp($waMsg);

// ── Email de confirmation au client ──────────────────────────────────────────
$safeName    = htmlspecialchars($name,    ENT_QUOTES, 'UTF-8');
$safeService = htmlspecialchars($service, ENT_QUOTES, 'UTF-8');
$safeBudget  = htmlspecialchars($budget,  ENT_QUOTES, 'UTF-8');

$confirmSubject = '=?UTF-8?B?' . base64_encode("Votre demande NUMAFRIQ a bien été reçue") . '?=';
$confirmHtml = "
<!DOCTYPE html>
<html lang='fr'>
<head><meta charset='UTF-8'></head>
<body style='font-family:Arial,sans-serif;background:#263a34;color:#fffefb;margin:0;padding:0;'>
  <div style='max-width:600px;margin:40px auto;background:#111113;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);'>
    <div style='background:linear-gradient(135deg,#ff6b4a,#8b5cf6);padding:32px 40px;'>
      <h1 style='color:#fff;margin:0;font-size:22px;font-weight:800;'>Demande bien reçue !</h1>
    </div>
    <div style='padding:32px 40px;'>
      <p style='color:rgba(255,255,255,0.8);font-size:15px;line-height:1.7;'>Bonjour <strong>{$safeName}</strong>,</p>
      <p style='color:rgba(255,255,255,0.6);font-size:14px;line-height:1.7;'>Merci pour votre message. Notre équipe l'a bien reçu et vous répondra sous <strong style='color:#a3e635;'>24h ouvrées</strong> avec une première orientation claire.</p>
      <div style='background:rgba(255,255,255,0.04);border-radius:12px;padding:20px;margin:24px 0;border:1px solid rgba(255,255,255,0.06);'>
        <p style='margin:0;color:rgba(255,255,255,0.4);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;'>Votre projet</p>
        <p style='margin:8px 0 0;color:#ff6b4a;font-size:16px;font-weight:700;'>{$safeService} &mdash; {$safeBudget}</p>
      </div>
      <p style='color:rgba(255,255,255,0.4);font-size:13px;'>En attendant, vous pouvez nous joindre directement via <a href='https://numafriq.com/contact' style='color:#a3e635;'>numafriq.com/contact</a></p>
    </div>
    <div style='padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;'>
      <p style='color:rgba(255,255,255,0.2);font-size:11px;margin:0;'>NUMAFRIQ &mdash; numafriq.com</p>
    </div>
  </div>
</body>
</html>
";

$confirmHeaders  = "MIME-Version: 1.0\r\n";
$confirmHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
$confirmHeaders .= "From: NUMAFRIQ <noreply@numafriq.com>\r\n";
mail($email, $confirmSubject, $confirmHtml, $confirmHeaders);

echo json_encode(['success' => true, 'message' => 'Demande enregistrée avec succès']);

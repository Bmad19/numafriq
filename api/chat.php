<?php
// ── NUMAFRIQ — Agent IA NUMA (Groq API) ──────────────────────────────────────
// Modèle : llama-3.3-70b-versatile | Gratuit : 14 400 req/jour
// ─────────────────────────────────────────────────────────────────────────────

// ── CORS (doit être tout en haut, avant tout output) ─────────────────────────
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']); exit;
}

// ── Notification WhatsApp (optionnelle) ──────────────────────────────────────
$whatsappFile = __DIR__ . '/whatsapp.php';
if (file_exists($whatsappFile)) require_once $whatsappFile;

// ── Clé API Groq (variable d'environnement serveur) ───────────────────────────
$GROQ_API_KEY = getenv('GROQ_API_KEY') ?: '';

// ── Lecture JSON ──────────────────────────────────────────────────────────────
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!$body || !isset($body['messages']) || !is_array($body['messages'])) {
    http_response_code(400);
    echo json_encode(['error' => 'messages[] requis']); exit;
}

$messages = $body['messages'];

// ── Prompt système NUMA ───────────────────────────────────────────────────────
$systemPrompt = <<<PROMPT
Tu es NUMA, l'assistant IA officiel de NUMAFRIQ.
Tu es professionnel, chaleureux, concis et orienté résultat.
Tu réponds TOUJOURS en français sauf si le client parle anglais.
Tu n'inventes jamais d'informations.

══════════════════════════════════════
NUMAFRIQ — CE QUE TU DOIS SAVOIR
══════════════════════════════════════

SERVICES :
1. Sites vitrine & landing pages — à partir de 450 000 FCFA
2. E-commerce — à partir de 850 000 FCFA
3. Identité visuelle & UI
4. Performance & SEO
5. Applications web sur-mesure
6. Maintenance & accompagnement

TARIFS :
- Pack Starter : 450 000 FCFA
- Pack Growth : 850 000 FCFA
- Pack Premium : 1 800 000 FCFA
- Maintenance : 75 000 FCFA/mois

DÉLAIS : Landing 2-3 sem | Site 4-6 sem | E-commerce 6-10 sem | App 8-16 sem

CONTACT : info@numafriq.com | WhatsApp +22656191930 | Réponse sous 24h

CLIENTS : Telecel Faso, IAM Gold, PNUD, Banque Mondiale, AFD, Union Africaine

══════════════════════════════════════
RÈGLES :
══════════════════════════════════════
- Réponds en 3-4 lignes max sauf si détails demandés
- Utilise **gras** pour les infos importantes
- Propose toujours une prochaine étape
- Emojis avec parcimonie
- Sujets : digital, web, NUMAFRIQ uniquement

CAPTURE DE LEAD :
Quand quelqu'un veut être rappelé ou demande un devis, demande son NOM et son TÉLÉPHONE.
Quand tu as les deux, ajoute à la FIN (invisible pour l'utilisateur) :
[LEAD:nom=NOM COMPLET|tel=NUMÉRO|sujet=SUJET COURT]
PROMPT;

// ── Construction messages Groq ────────────────────────────────────────────────
$groqMessages = [['role' => 'system', 'content' => $systemPrompt]];

$recent = array_slice($messages, -12);
foreach ($recent as $msg) {
    $role = (isset($msg['role']) && $msg['role'] === 'assistant') ? 'assistant' : 'user';
    $content = trim($msg['content'] ?? '');
    if ($content !== '') {
        $groqMessages[] = ['role' => $role, 'content' => $content];
    }
}

if (count($groqMessages) <= 1) {
    http_response_code(400);
    echo json_encode(['error' => 'Aucun message valide']); exit;
}

// ── Appel Groq ────────────────────────────────────────────────────────────────
$payload = json_encode([
    'model'       => 'llama-3.3-70b-versatile',
    'messages'    => $groqMessages,
    'temperature' => 0.7,
    'max_tokens'  => 500,
    'stream'      => false,
]);

if (!extension_loaded('curl')) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL non disponible sur ce serveur']); exit;
}

$ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . $GROQ_API_KEY,
        'Content-Type: application/json',
    ],
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response   = curl_exec($ch);
$httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError  = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(503);
    echo json_encode(['error' => 'Connexion impossible à l\'IA. Réessayez.']); exit;
}

if ($httpStatus === 401) {
    http_response_code(503);
    echo json_encode(['error' => 'Clé API Groq invalide ou expirée.']); exit;
}

$data = json_decode($response, true);

if ($httpStatus !== 200 || empty($data['choices'][0]['message']['content'])) {
    error_log("Groq erreur {$httpStatus}: " . $response);
    http_response_code(503);
    echo json_encode(['error' => 'L\'IA est temporairement indisponible. Réessayez dans quelques instants.']); exit;
}

$aiText = $data['choices'][0]['message']['content'];

// ── Détection lead + notification WhatsApp ────────────────────────────────────
$leadDetected = false;
if (preg_match('/\[LEAD:nom=([^|]+)\|tel=([^|]+)\|sujet=([^\]]+)\]/i', $aiText, $m)) {
    $leadName    = trim($m[1]);
    $leadPhone   = trim($m[2]);
    $leadSubject = trim($m[3]);
    if (function_exists('sendWhatsApp') && function_exists('waMsgChat')) {
        sendWhatsApp(waMsgChat($leadName, $leadPhone, $leadSubject));
    }
    $aiText = trim(preg_replace('/\[LEAD:[^\]]+\]/i', '', $aiText));
    $leadDetected = true;
}

echo json_encode([
    'success' => true,
    'message' => $aiText,
    'model'   => 'llama-3.3-70b-versatile',
    'lead'    => $leadDetected,
]);

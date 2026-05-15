<?php
/**
 * Afrilex Conseil — Recrutements & placement (multipart/form-data, CV PDF/DOC/DOCX).
 * Vivier candidats : missions internes et mises en relation avec entreprises mandantes.
 */
require_once __DIR__ . '/whatsapp.php';
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
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

const CV_MAX_BYTES = 5242880;

function careers_strlen_utf8(string $s): int {
    return function_exists('mb_strlen') ? (int) mb_strlen($s, 'UTF-8') : strlen($s);
}

function careers_substr_utf8(string $s, int $start, int $length): string {
    return function_exists('mb_substr') ? mb_substr($s, $start, $length, 'UTF-8') : substr($s, $start, $length);
}

$POSITIONS = [
    'hr_talent_management',
    'lawyer_associate',
    'legal_counsel',
    'paralegal',
    'tax_accounting',
    'trainee_internship',
    'office_operations',
    'communication',
    'spontaneous',
];

/** Références d’offres — synchroniser avec `src/config/jobOffers.ts`. */
$OFFER_TO_POSITION = [
    'of_assistant_juridique_2026' => 'paralegal',
    'of_juriste_entreprise_2026'  => 'legal_counsel',
    'of_charge_rh_gestion_2026'   => 'hr_talent_management',
];

$APPLICATION_MODES = ['offer', 'profile_pool', 'spontaneous'];

$CONTRACTS = ['cdi', 'cdd', 'freelance', 'internship', 'discuss'];
$EXPERIENCE = ['0-1', '2-3', '4-6', '7plus'];
$EDUCATION = ['bac', 'bac2_3', 'bac4_5', 'bac5_plus', 'professional_track'];

if (!empty($_POST['website'] ?? '')) {
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'OK']);
    exit;
}

$first = trim($_POST['first_name'] ?? '');
$last  = trim($_POST['last_name'] ?? '');
$email = filter_var(trim($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL);
$phone = trim($_POST['phone'] ?? '');
$city  = trim($_POST['city_country'] ?? '');
$linkedin = trim($_POST['linkedin_url'] ?? '');
$position = trim($_POST['position_applied'] ?? '');
$contract = trim($_POST['contract_type'] ?? '');
$availability = trim($_POST['availability'] ?? '');
$experience = trim($_POST['experience_years'] ?? '');
$education = trim($_POST['education_level'] ?? '');
$languages = trim($_POST['languages'] ?? '');
$motivation = trim($_POST['motivation'] ?? '');
$job_offer_ref = trim($_POST['job_offer_ref'] ?? '');
$sought_role_title = trim($_POST['sought_role_title'] ?? '');
$application_mode = strtolower(trim($_POST['application_mode'] ?? ''));
if (!in_array($application_mode, $APPLICATION_MODES, true)) {
    $application_mode = 'offer';
}
$locale = strtolower(trim($_POST['locale'] ?? 'fr'));
if (!in_array($locale, ['fr', 'en'], true)) {
    $locale = 'fr';
}

$consent = isset($_POST['consent_data_processing']) && $_POST['consent_data_processing'] === '1';

if ($first === '' || $last === '' || $email === '' || $motivation === '') {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $locale === 'en' ? 'Missing required fields.' : 'Champs obligatoires manquants.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $locale === 'en' ? 'Invalid email.' : 'Email invalide.']);
    exit;
}

if (careers_strlen_utf8($motivation) < 80) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => $locale === 'en'
            ? 'Motivation text must be at least 80 characters.'
            : 'Le message de motivation doit contenir au moins 80 caractères.',
    ]);
    exit;
}

if (!$consent) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => $locale === 'en'
            ? 'You must accept the processing of your data to apply.'
            : 'Vous devez accepter le traitement de vos données pour envoyer votre candidature.',
    ]);
    exit;
}

if ($application_mode === 'spontaneous') {
    $position = 'spontaneous';
    $job_offer_ref = '';
}

if ($application_mode === 'profile_pool') {
    $job_offer_ref = '';
    if ($sought_role_title === '' || careers_strlen_utf8($sought_role_title) < 10) {
        http_response_code(422);
        echo json_encode([
            'success' => false,
            'message' => $locale === 'en'
                ? 'Please specify the role you are targeting (at least 10 characters).'
                : 'Indiquez le poste recherché (au moins 10 caractères).',
        ]);
        exit;
    }
}

if ($application_mode === 'offer') {
    if ($job_offer_ref === '' || !isset($OFFER_TO_POSITION[$job_offer_ref])) {
        http_response_code(422);
        echo json_encode([
            'success' => false,
            'message' => $locale === 'en'
                ? 'Please select a valid job posting.'
                : 'Veuillez sélectionner une offre valide.',
        ]);
        exit;
    }
    $position = $OFFER_TO_POSITION[$job_offer_ref];
}

if ($sought_role_title !== '' && careers_strlen_utf8($sought_role_title) > 255) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $locale === 'en' ? 'Role title too long.' : 'Intitulé de poste trop long.']);
    exit;
}

if (!in_array($position, $POSITIONS, true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $locale === 'en' ? 'Invalid position.' : 'Poste invalide.']);
    exit;
}

if (!in_array($contract, $CONTRACTS, true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $locale === 'en' ? 'Invalid contract type.' : 'Type de contrat invalide.']);
    exit;
}

if ($experience !== '' && !in_array($experience, $EXPERIENCE, true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $locale === 'en' ? 'Invalid experience.' : 'Expérience invalide.']);
    exit;
}

if ($education !== '' && !in_array($education, $EDUCATION, true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $locale === 'en' ? 'Invalid education level.' : 'Niveau de formation invalide.']);
    exit;
}

if ($linkedin !== '') {
    if (!preg_match('#^https?://#i', $linkedin)) {
        $linkedin = 'https://' . ltrim($linkedin, '/');
    }
    if (strlen($linkedin) > 500 || !filter_var($linkedin, FILTER_VALIDATE_URL)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => $locale === 'en' ? 'Invalid LinkedIn URL.' : 'URL LinkedIn invalide.']);
        exit;
    }
}

if (!isset($_FILES['cv']) || !is_uploaded_file($_FILES['cv']['tmp_name'])) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $locale === 'en' ? 'Please attach your CV.' : 'Veuillez joindre votre CV.']);
    exit;
}

$file = $_FILES['cv'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $locale === 'en' ? 'CV upload failed.' : 'Échec du téléversement du CV.']);
    exit;
}

if ($file['size'] > CV_MAX_BYTES) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $locale === 'en' ? 'CV must be 5 MB or less.' : 'Le CV ne doit pas dépasser 5 Mo.']);
    exit;
}

$origName = $file['name'] ?? 'cv';
$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
if (!in_array($ext, ['pdf', 'doc', 'docx'], true)) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => $locale === 'en' ? 'CV must be PDF, DOC or DOCX.' : 'Le CV doit être au format PDF, DOC ou DOCX.',
    ]);
    exit;
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
$allowedMime = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
if (!in_array($mime, $allowedMime, true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $locale === 'en' ? 'Invalid CV file type.' : 'Type de fichier CV non autorisé.']);
    exit;
}

$uploadDir = __DIR__ . '/uploads/cvs';
if (!is_dir($uploadDir)) {
    if (!@mkdir($uploadDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $locale === 'en' ? 'Server configuration error.' : 'Erreur de configuration serveur.']);
        exit;
    }
}

$storedBase = bin2hex(random_bytes(16)) . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $origName);
if (strlen($storedBase) > 200) {
    $storedBase = bin2hex(random_bytes(16)) . '.' . $ext;
}
$destPath = $uploadDir . '/' . $storedBase;
if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $locale === 'en' ? 'Could not save CV.' : 'Impossible d’enregistrer le CV.']);
    exit;
}

@chmod($destPath, 0644);

$relativePath = 'uploads/cvs/' . $storedBase;
$fullName = $first . ' ' . $last;

try {
    $db = get_db();
    $stmt = $db->prepare('
        INSERT INTO job_applications (
            first_name, last_name, email, phone, city_country, linkedin_url,
            position_applied, contract_type, availability, experience_years,
            education_level, languages, reference_offer, sought_role_title, application_mode,
            motivation, cv_original_name, cv_stored_path,
            locale, consent_data_processing
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ');
    $stmt->execute([
        $first,
        $last,
        $email,
        $phone !== '' ? $phone : null,
        $city !== '' ? $city : null,
        $linkedin !== '' ? $linkedin : null,
        $position,
        $contract,
        $availability !== '' ? $availability : null,
        $experience !== '' ? $experience : null,
        $education !== '' ? $education : null,
        $languages !== '' ? $languages : null,
        $job_offer_ref !== '' ? $job_offer_ref : null,
        $sought_role_title !== '' ? $sought_role_title : null,
        $application_mode,
        $motivation,
        $origName,
        $relativePath,
        $locale,
    ]);
} catch (Throwable $e) {
    @unlink($destPath);
    error_log('careers.php DB: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $locale === 'en'
            ? 'Could not save your application. Please try again later.'
            : 'Impossible d’enregistrer votre candidature. Réessayez plus tard.',
    ]);
    exit;
}

if (function_exists('waMsgCareerApplication')) {
    $waLine = waMsgCareerApplication($fullName, $email, $phone ?: '—', $position, $contract, $origName);
    $waLine .= "\n📋 Mode : {$application_mode}";
    if ($job_offer_ref !== '') {
        $waLine .= "\n📌 Offre : {$job_offer_ref}";
    }
    if ($sought_role_title !== '') {
        $waLine .= "\n🎯 Poste recherché : {$sought_role_title}";
    }
    sendWhatsApp($waLine);
}

$safeFull = htmlspecialchars($fullName, ENT_QUOTES, 'UTF-8');
$safeEmail = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
$safeMotivation = htmlspecialchars(careers_substr_utf8($motivation, 0, 1200), ENT_QUOTES, 'UTF-8');
$safeMode = htmlspecialchars($application_mode, ENT_QUOTES, 'UTF-8');
$safeOfferRef = htmlspecialchars($job_offer_ref !== '' ? $job_offer_ref : '—', ENT_QUOTES, 'UTF-8');
$safeSought = htmlspecialchars($sought_role_title !== '' ? $sought_role_title : '—', ENT_QUOTES, 'UTF-8');
$safePosition = htmlspecialchars($position, ENT_QUOTES, 'UTF-8');

$hrSubject = $locale === 'en'
    ? '=?UTF-8?B?' . base64_encode('[Afrilex Conseil HR / placements] New application — ' . $fullName) . '?='
    : '=?UTF-8?B?' . base64_encode('[Afrilex Conseil Recrutements & placement] Nouvelle candidature — ' . $fullName) . '?=';

$hrHtml = <<<HTML
<!DOCTYPE html>
<html lang="{$locale}">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#0a0a0c;color:#f4f2ef;margin:0;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#111113;border-radius:16px;padding:28px;border:1px solid rgba(255,255,255,0.08);">
    <h1 style="margin:0 0 16px;font-size:18px;color:#ec8c5a;">{$safeFull}</h1>
    <p style="margin:0 0 8px;color:rgba(255,255,255,0.75);"><strong>Email :</strong> {$safeEmail}</p>
    <p style="margin:0 0 8px;color:rgba(255,255,255,0.75);"><strong>Mode :</strong> {$safeMode}</p>
    <p style="margin:0 0 8px;color:rgba(255,255,255,0.75);"><strong>Réf. offre :</strong> {$safeOfferRef}</p>
    <p style="margin:0 0 8px;color:rgba(255,255,255,0.75);"><strong>Poste recherché :</strong> {$safeSought}</p>
    <p style="margin:0 0 8px;color:rgba(255,255,255,0.75);"><strong>Famille de poste :</strong> {$safePosition}</p>
    <p style="margin:0 0 8px;color:rgba(255,255,255,0.75);"><strong>Contrat :</strong> {$contract}</p>
    <p style="margin:0 0 16px;color:rgba(255,255,255,0.75);"><strong>Fichier CV :</strong> {$relativePath}</p>
    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:16px;margin-top:16px;">
      <p style="margin:0;color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;">Motivation (extrait)</p>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.85);white-space:pre-wrap;">{$safeMotivation}</p>
    </div>
  </div>
</body>
</html>
HTML;

$hrHeaders  = "MIME-Version: 1.0\r\n";
$hrHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
$hrHeaders .= "From: Afrilex Conseil RH <noreply@afrilexconseil.com>\r\n";

mail('info@afrilexconseil.com', $hrSubject, $hrHtml, $hrHeaders);

if ($locale === 'en') {
    $candSubject = '=?UTF-8?B?' . base64_encode('We received your application — Afrilex Conseil') . '?=';
    $candHtml = "
<!DOCTYPE html>
<html lang='en'>
<head><meta charset='UTF-8'></head>
<body style='font-family:Arial,sans-serif;background:#0a0a0c;color:#f4f2ef;margin:0;padding:0;'>
  <div style='max-width:600px;margin:40px auto;background:#111113;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);'>
    <div style='background:linear-gradient(135deg,#ec8c5a,#a3e635);padding:28px 36px;'>
      <h1 style='color:#0c1814;margin:0;font-size:20px;font-weight:800;'>Application received</h1>
    </div>
    <div style='padding:32px 36px;'>
      <p style='color:rgba(255,255,255,0.8);font-size:15px;line-height:1.7;'>Hello <strong>{$safeFull}</strong>,</p>
      <p style='color:rgba(255,255,255,0.6);font-size:14px;line-height:1.7;'>Thank you for registering your profile with Afrilex Conseil. Our HR team has received your CV and motivation note. If your profile fits an internal role or a client placement mandate, we will contact you within <strong style=\"color:#a3e635;\">10–15 business days</strong>.</p>
      <p style='color:rgba(255,255,255,0.45);font-size:13px;margin-top:24px;'>This inbox is not monitored for replies. For questions: <a href='mailto:info@afrilexconseil.com' style='color:#a3e635;'>info@afrilexconseil.com</a>.</p>
    </div>
  </div>
</body>
</html>";
} else {
    $candSubject = '=?UTF-8?B?' . base64_encode('Votre candidature Afrilex Conseil a bien été reçue') . '?=';
    $candHtml = "
<!DOCTYPE html>
<html lang='fr'>
<head><meta charset='UTF-8'></head>
<body style='font-family:Arial,sans-serif;background:#0a0a0c;color:#f4f2ef;margin:0;padding:0;'>
  <div style='max-width:600px;margin:40px auto;background:#111113;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);'>
    <div style='background:linear-gradient(135deg,#ec8c5a,#a3e635);padding:28px 36px;'>
      <h1 style='color:#0c1814;margin:0;font-size:20px;font-weight:800;'>Candidature bien reçue</h1>
    </div>
    <div style='padding:32px 36px;'>
      <p style='color:rgba(255,255,255,0.8);font-size:15px;line-height:1.7;'>Bonjour <strong>{$safeFull}</strong>,</p>
      <p style='color:rgba(255,255,255,0.6);font-size:14px;line-height:1.7;'>Merci d’avoir déposé votre dossier auprès d’Afrilex Conseil. Notre équipe RH a bien reçu votre CV et votre message de motivation. Si votre profil correspond à un besoin interne ou à une mission de placement pour une entreprise mandante, nous vous recontactons sous <strong style=\"color:#a3e635;\">10 à 15 jours ouvrés</strong>.</p>
      <p style='color:rgba(255,255,255,0.45);font-size:13px;margin-top:24px;'>Cette adresse n’est pas suivie pour les réponses. Pour toute question : <a href='mailto:info@afrilexconseil.com' style='color:#a3e635;'>info@afrilexconseil.com</a>.</p>
    </div>
  </div>
</body>
</html>";
}

mail($email, $candSubject, $candHtml, $hrHeaders);

echo json_encode(['success' => true, 'message' => $locale === 'en' ? 'Application submitted.' : 'Candidature enregistrée.']);

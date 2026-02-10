# Firebase Storage CORS Configuration Script for Windows PowerShell
# This script configures CORS for Firebase Storage to allow browser access

Write-Host "🔧 Configuring CORS for Firebase Storage..." -ForegroundColor Cyan
Write-Host ""

# Check if gsutil is installed
$gsutilPath = Get-Command gsutil -ErrorAction SilentlyContinue
if (-not $gsutilPath) {
    Write-Host "❌ Error: gsutil is not installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Google Cloud SDK:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    Write-Host "2. Run the installer and follow the instructions" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Check if authenticated
Write-Host "Checking authentication..." -ForegroundColor Cyan
$authStatus = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>&1
if (-not $authStatus -or $authStatus -match "error") {
    Write-Host "⚠️  Not authenticated. Please run: gcloud auth login" -ForegroundColor Yellow
    exit 1
}

# Set project
$PROJECT_ID = "demoproject-c9fbc"
$BUCKET_NAME = "${PROJECT_ID}.firebasestorage.app"

Write-Host "📦 Project: ${PROJECT_ID}" -ForegroundColor Green
Write-Host "🪣 Bucket: ${BUCKET_NAME}" -ForegroundColor Green
Write-Host ""

# Apply CORS configuration
Write-Host "Applying CORS configuration..." -ForegroundColor Cyan
$result = gsutil cors set configure-cors.json gs://${BUCKET_NAME} 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ CORS configuration applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verifying configuration..." -ForegroundColor Cyan
    gsutil cors get gs://${BUCKET_NAME}
    Write-Host ""
    Write-Host "✅ Done! CORS is now configured." -ForegroundColor Green
    Write-Host "🔄 Please refresh your browser to see the changes." -ForegroundColor Yellow
} else {
    Write-Host "❌ Failed to apply CORS configuration." -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    exit 1
}


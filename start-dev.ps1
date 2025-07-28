# CodeMitra Development Setup Script
Write-Host "Starting CodeMitra Development Environment..." -ForegroundColor Green

# Check if Docker containers are running
$dockerContainers = docker ps --format "table {{.Names}}" | Select-String "codemitra"
if ($dockerContainers.Count -lt 3) {
    Write-Host "Starting Docker containers..." -ForegroundColor Yellow
    docker-compose -f docker-compose.simple.yml up -d
    Start-Sleep 10
}

# Set environment variables
$env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/codemitra"
$env:REDIS_URL = "redis://localhost:6379"
$env:JWT_SECRET = "your_local_jwt_secret_key_here"
$env:NODE_ENV = "development"

# Start Backend
Write-Host "Starting Backend Service..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-Command", "cd backend; npm install; npm run dev" -WindowStyle Normal

# Wait a bit for backend to start
Start-Sleep 5

# Start Frontend
Write-Host "Starting Frontend Service..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-Command", "cd frontend; npm install; npm run dev" -WindowStyle Normal

# Start Worker
Write-Host "Starting Worker Service..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-Command", "cd worker; npm install; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "CodeMitra Development Environment Started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Backend: http://localhost:5000" -ForegroundColor White
Write-Host "Database Admin: http://localhost:8080" -ForegroundColor White
Write-Host "Redis: localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to stop all services..." -ForegroundColor Yellow
Read-Host

# Stop all services
Write-Host "Stopping services..." -ForegroundColor Red
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force
docker-compose -f docker-compose.simple.yml down

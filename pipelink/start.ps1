# PipeLink — Start both servers
Write-Host "Starting PipeLink..." -ForegroundColor Cyan

# Kill any process already using port 8000 (backend) or 3000 (frontend)
Write-Host "Freeing ports 8000 and 3000..." -ForegroundColor Gray
@(8000, 3000) | ForEach-Object {
    $port = $_
    $pids = netstat -ano | Select-String ":$port " | ForEach-Object {
        ($_ -split '\s+')[-1]
    } | Select-Object -Unique
    foreach ($p in $pids) {
        if ($p -match '^\d+$' -and $p -ne '0') {
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            Write-Host "  Killed PID $p on port $port" -ForegroundColor DarkGray
        }
    }
}
Start-Sleep -Seconds 1

# Start backend in a new terminal window
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
  "cd '$PSScriptRoot\pipelink_backend'; Write-Host 'Backend starting...' -ForegroundColor Yellow; uvicorn main:app --reload --port 8000"

# Small delay so backend starts first
Start-Sleep -Seconds 4

# Start frontend in a new terminal window
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
  "cd '$PSScriptRoot\pipelink_frontend'; Write-Host 'Frontend starting...' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "Both servers launching in new windows:" -ForegroundColor Green
Write-Host "  Backend  -> http://localhost:8000" -ForegroundColor Yellow
Write-Host "  Frontend -> http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opening browser in 5 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 5
Start-Process "http://localhost:3000"

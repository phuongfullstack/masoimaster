# Open isolated browser windows for multiplayer testing (each window = separate player)
param(
    [string]$Room = "QURXNS",
    [string[]]$Players = @("Player 2", "Player 3", "Player 4")
)

$baseUrl = "http://localhost:3000"
$room = $Room.ToUpper()

$browser = $null
if (Get-Command msedge -ErrorAction SilentlyContinue) { $browser = "msedge" }
elseif (Test-Path "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe") { $browser = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe" }
elseif (Test-Path "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe") { $browser = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe" }
else { Write-Error "Không tìm thấy Edge hoặc Chrome"; exit 1 }

$profileRoot = Join-Path $env:TEMP "masoi-test-tabs"
New-Item -ItemType Directory -Force -Path $profileRoot | Out-Null

$i = 0
foreach ($name in $Players) {
    $i++
    $profile = Join-Path $profileRoot "player-$i"
    $url = "${baseUrl}?as=$([uri]::EscapeDataString($name))&room=$room"
    Write-Host "Opening: $name -> $url"
    if ($browser -eq "msedge") {
        Start-Process msedge -ArgumentList "--user-data-dir=$profile", "--new-window", $url
    } else {
        Start-Process $browser -ArgumentList "--user-data-dir=$profile", "--new-window", $url
    }
    Start-Sleep -Milliseconds 500
}

Write-Host "Done. Opened $($Players.Count) windows for room $room"

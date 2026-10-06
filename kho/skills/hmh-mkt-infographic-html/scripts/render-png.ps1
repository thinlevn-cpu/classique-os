<#
  render-png.ps1 — Render 1 file HTML infographic ra PNG nét cao bằng Chrome headless.
  Dùng cho skill mkt-infographic-html.

  Cách chạy:
    powershell -File render-png.ps1 -Html "<đường dẫn .html>" -Out "<đường dẫn .png>" [-Width 1080] [-Height 1450] [-Scale 2]

  Vì sao phức tạp một chút:
   - Path dự án có dấu cách + tiếng Việt ("HOÁ TRI THỨC") làm Chrome đôi khi ra ảnh TRẮNG.
     → Copy HTML sang %TEMP% (ASCII) render ở đó rồi copy PNG về (gotcha đã xác nhận trên máy này).
   - KHÔNG gọi Remove-Item dọn temp: sandbox PowerShell chặn vì static-analysis nhầm path "C:\Program".
     → Để temp lại, vô hại; Windows tự dọn %TEMP%.
   - Template PHẢI self-contained (CSS inline, icon = emoji/SVG, KHÔNG ảnh ngoài) để chỉ cần copy 1 file.
#>
param(
  [Parameter(Mandatory=$true)][string]$Html,
  [Parameter(Mandatory=$true)][string]$Out,
  [int]$Width  = 1080,
  [int]$Height = 1450,
  [int]$Scale  = 2
)

$ErrorActionPreference = "Stop"

# 1. Tìm Chrome (ưu tiên) hoặc Edge làm dự phòng
$browser = $null
$cands = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)
foreach ($c in $cands) { if (Test-Path $c) { $browser = $c; break } }
if (-not $browser) { Write-Output "FAILED: không tìm thấy Chrome/Edge"; exit 1 }

if (-not (Test-Path $Html)) { Write-Output "FAILED: không thấy HTML $Html"; exit 1 }

# 2. Copy HTML sang thư mục temp ASCII
$work = Join-Path $env:TEMP ("ig_" + [guid]::NewGuid().ToString("N").Substring(0,8))
New-Item -ItemType Directory -Path $work -Force | Out-Null
$htm = Join-Path $work "page.html"
$png = Join-Path $work "page.png"
Copy-Item $Html $htm -Force
$url = "file:///" + $htm.Replace('\','/')

# 3. Render
$cargs = @(
  "--headless=new","--disable-gpu","--hide-scrollbars",
  "--force-device-scale-factor=$Scale",
  "--window-size=$Width,$Height",
  "--screenshot=$png", $url
)
Start-Process -FilePath $browser -ArgumentList $cargs -Wait -NoNewWindow

# 4. Đưa PNG về đích
if (Test-Path $png) {
  $dir = Split-Path $Out -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Copy-Item $png $Out -Force
  $kb = [math]::Round((Get-Item $Out).Length/1KB,1)
  Write-Output "OK $kb KB -> $Out  (${Width}x${Height} @${Scale}x)"
} else {
  Write-Output "FAILED: Chrome không tạo PNG (tmp=$work). Thử lại hoặc kiểm tra HTML."
  exit 1
}

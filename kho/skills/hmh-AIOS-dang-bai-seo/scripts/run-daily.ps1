# run-daily.ps1 — Chạy pipeline ĐĂNG BÀI SEO tự động (kiến trúc TÁCH NODE).
# Đăng ký bằng Windows Task Scheduler lúc 11:00 mỗi ngày (xem register-task.ps1).
# Ghi log vào logs\YYYY-MM-DD.log.
#
# VÌ SAO TÁCH NODE (sửa 2026-06-18):
#   Bản cũ giao CẢ pipeline cho 1 phiên `claude -p` headless. Nhưng cổng duyệt quyền của harness
#   chặn MỌI lệnh shell trong phiên đó (kể cả `node --version`) dù đã --permission-mode bypassPermissions,
#   nên select/publish không chạy được → suốt 14–18/06 không đăng được bài nào (HẬU KIỂM THẤT BẠI).
#   Bản này:
#     • Bước 1 (chọn bài + tải ảnh) và Bước 3 (đăng WP + cập nhật Lark) → CHẠY THẲNG bằng node trong
#       PowerShell. Node gọi trực tiếp KHÔNG qua cổng quyền của Claude → không bao giờ bị chặn.
#     • Bước 2 (VIẾT bài HTML) → vẫn do `claude -p` làm, CÙNG prompt + CÙNG checklist như cũ, nhưng
#       NHẢ HTML ra STDOUT (chỉ đọc, không dùng tool ghi file) → PowerShell tự ghi file. Không cần quyền.
#   Chất lượng bài & cách SEO KHÔNG đổi: checklist, prompt viết bài, publish-wordpress.mjs đều giữ nguyên.
#
# CHỐNG LỖI CÂM: tiền kiểm WP creds TRƯỚC; hậu kiểm PUBLISH_OK SAU. Lỗi bất kỳ → ping nhóm Lark, không chết câm.

$ErrorActionPreference = "Continue"
# UTF-8 không BOM cho mọi I/O với native exe (giữ tiếng Việt đúng khi pipe prompt sang claude).
$utf8 = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = $utf8
try { [Console]::OutputEncoding = $utf8; [Console]::InputEncoding = $utf8 } catch {}

$proj   = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
$skill  = Split-Path $PSScriptRoot -Parent
$logDir = Join-Path $skill "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Force $logDir | Out-Null }
$stamp  = Get-Date -Format "yyyy-MM-dd"
$logf   = Join-Path $logDir "$stamp.log"
$ledger = Join-Path $logDir "fail-ledger.json"   # sổ đếm lần lỗi theo record (chống nghẽn hàng đợi)
$MAX_FAILS = 3

# Đường dẫn CLI: mặc định theo cài đặt npm chuẩn của user hiện tại. Ghi đè bằng biến môi trường nếu khác.
$claude = if ($env:CLAUDE_CLI) { $env:CLAUDE_CLI } else { Join-Path $env:APPDATA "npm\claude.cmd" }
$node   = if ($env:NODE_EXE)   { $env:NODE_EXE }   else { "C:\Program Files\nodejs\node.exe" }
$wpEnv  = Join-Path $proj ".secrets\wordpress.env"

# Nạp cấu hình SEO (.secrets\seo-web.env): SEO_BASE_TOKEN, SEO_TABLE_ID, LARK_ALERT_WEBHOOK (tuỳ chọn).
# Xuất thành biến môi trường để các script node con (select-article / publish-wordpress) đọc được.
$seoEnvFile = Join-Path $proj ".secrets\seo-web.env"
$WEBHOOK = ""
if (Test-Path $seoEnvFile) {
  foreach ($line in (Get-Content $seoEnvFile -Encoding UTF8)) {
    if ($line -match '^\s*([A-Z_]+)\s*=\s*(.+?)\s*$') {
      Set-Item -Path ("Env:" + $Matches[1]) -Value $Matches[2]
      if ($Matches[1] -eq "LARK_ALERT_WEBHOOK") { $WEBHOOK = $Matches[2] }
    }
  }
}

$selectScript  = Join-Path $PSScriptRoot "select-article.mjs"
$publishScript = Join-Path $PSScriptRoot "publish-wordpress.mjs"
$checklistFile = Join-Path $skill "references\seo-blog-checklist.md"

$outDir   = Join-Path $proj "output\$stamp-dang-bai-seo"
$imgDir   = Join-Path $outDir "img"
# lark-cli +record-download-attachment đòi --output là đường dẫn TƯƠNG ĐỐI trong cwd. Đã Set-Location $proj,
# nên truyền imgdir tương đối (gốc dự án) cho select-article để ảnh tải được. Dùng '/' cho node trên Windows.
$imgDirRel = "output/$stamp-dang-bai-seo/img"
$manifest = Join-Path $outDir "manifest.json"
$htmlPath = Join-Path $outDir "bai-viet.html"

function Log($msg) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg" | Out-File -Append -Encoding utf8 $logf }
function Send-LarkAlert($text) {
  if (-not $WEBHOOK) { Log "ALERT (không có LARK_ALERT_WEBHOOK, chỉ ghi log): $text"; return }
  try {
    $payload = @{ msg_type = "text"; content = @{ text = $text } } | ConvertTo-Json -Depth 5 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
    Invoke-RestMethod -Uri $WEBHOOK -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes -TimeoutSec 30 | Out-Null
    Log "Đã gửi cảnh báo Lark."
  } catch { Log "ALERT FAIL: $($_.Exception.Message)" }
}

# ---- TỰ DỌN SESSION MA (vá 2026-07-23) --------------------------------------------------------------
# Mỗi lần claude -p sinh tiêu đề tự động lại để lại 1 file session .jsonl CHỈ có dòng ai-title, KHÔNG có
# hội thoại. Các file "ma" này chất đống trong danh sách session của Claude Code panel; file mới nhất bị
# mở nhầm -> báo "No conversation found with session ID". Dọn AN TOÀN: chỉ chuyển sang backup những .jsonl
# mà nội dung CHỈ gồm ai-title (tuyệt đối không có message user/assistant). Không đụng session thật.
function Remove-GhostSessions {
  try {
    $root = Join-Path $env:USERPROFILE ".claude\projects"
    if (-not (Test-Path $root)) { return }
    $bak = Join-Path $env:USERPROFILE ".claude\_ghost-sessions-backup"
    if (-not (Test-Path $bak)) { New-Item -ItemType Directory -Force $bak | Out-Null }
    $n = 0
    Get-ChildItem -Path $root -Recurse -Filter *.jsonl -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Length -lt 1024 } | ForEach-Object {
        try {
          $hasReal = $false; $hasTitle = $false
          foreach ($ln in (Get-Content -LiteralPath $_.FullName -ErrorAction Stop)) {
            if ($ln -match '"type":"(user|assistant)"') { $hasReal = $true; break }
            if ($ln -match '"type":"ai-title"')        { $hasTitle = $true }
          }
          if ((-not $hasReal) -and $hasTitle) {
            Move-Item -LiteralPath $_.FullName -Destination (Join-Path $bak $_.Name) -Force
            $n++
          }
        } catch {}
      }
    if ($n -gt 0) { Log "Đã dọn $n session ma (chỉ có ai-title) sang _ghost-sessions-backup." }
  } catch { Log "Remove-GhostSessions lỗi: $($_.Exception.Message)" }
}
Remove-GhostSessions   # dọn tồn đọng trước khi chạy pipeline

# ---- SỔ ĐẾM LỖI theo record (chống nghẽn hàng đợi) — select-article.mjs đọc file này để bỏ qua bài kẹt ----
function Read-Ledger {
  $h = @{}
  if (Test-Path $ledger) {
    try {
      $o = Get-Content $ledger -Raw -Encoding UTF8 | ConvertFrom-Json
      foreach ($p in $o.PSObject.Properties) { $h[$p.Name] = @{ count = [int]$p.Value.count; lastError = [string]$p.Value.lastError; lastDate = [string]$p.Value.lastDate } }
    } catch {}
  }
  return $h
}
function Record-Fail($rid, $reason, $title) {
  if (-not $rid) { return }
  $h = Read-Ledger
  if ($h.ContainsKey($rid)) { $h[$rid].count = [int]$h[$rid].count + 1 } else { $h[$rid] = @{ count = 1 } }
  $h[$rid].lastError = "$reason"; $h[$rid].lastDate = $stamp
  # UTF-8 KHÔNG BOM: Out-File -Encoding utf8 (PS 5.1) thêm BOM -> Node JSON.parse nghẹn -> sổ coi như rỗng.
  [System.IO.File]::WriteAllText($ledger, ($h | ConvertTo-Json -Depth 5), $utf8)
  $n = [int]$h[$rid].count
  Log "FAIL-LEDGER: record $rid -> $n lần lỗi ($reason)."
  if ($n -ge $MAX_FAILS) {
    Send-LarkAlert "🚫 [Đăng bài SEO] BÀI KẸT $stamp`nRecord $rid ('$title') đã lỗi $n lần liên tiếp. Từ giờ sẽ BỎ QUA để không chặn hàng đợi.`nHãy kiểm tra brief/ảnh của bài này rồi sửa. Log: .claude\skills\hmh-AIOS-dang-bai-seo\logs\$stamp.log"
  }
}
function Clear-Fail($rid) {
  if (-not $rid) { return }
  $h = Read-Ledger
  if ($h.ContainsKey($rid)) { $h.Remove($rid); [System.IO.File]::WriteAllText($ledger, ($h | ConvertTo-Json -Depth 5), $utf8); Log "FAIL-LEDGER: xoá record $rid (đã đăng thành công)." }
}

Log "==== BẮT ĐẦU pipeline đăng bài SEO (tách node) ===="
Set-Location $proj

# ---------- TIỀN KIỂM: có credential WordPress không? ----------
$envOk = $false
if (Test-Path $wpEnv) {
  $c = Get-Content $wpEnv -Raw
  $envOk = ($c -match "WP_URL\s*=\s*\S") -and ($c -match "WP_USER\s*=\s*\S") -and ($c -match "WP_APP_PASSWORD\s*=\s*\S")
}
if (-not $envOk) {
  Log "TIỀN KIỂM THẤT BẠI: thiếu .secrets/wordpress.env (WP_URL/WP_USER/WP_APP_PASSWORD)."
  Send-LarkAlert "⚠️ [Đăng bài SEO 11h] BỊ HOÃN $stamp`nChưa có WordPress Application Password trong .secrets\wordpress.env. Tạo tại wp-admin → Users → Profile → Application Passwords, dán vào file rồi chạy lại.`nKhông bài nào được đăng hôm nay."
  Log "==== DỪNG (thiếu WP creds) ===="
  exit 1
}
Log "TIỀN KIỂM OK: có WordPress creds."

# ---------- BƯỚC 0: thư mục output ----------
New-Item -ItemType Directory -Force $imgDir | Out-Null

# ---------- BƯỚC 1: CHỌN BÀI ĐẾN HẠN + TẢI ẢNH (node trực tiếp) ----------
Log "Bước 1: chọn bài đến hạn (select-article.mjs)..."
$selOut = & $node $selectScript --imgdir $imgDirRel --out $manifest --fail-ledger $ledger --max-fails $MAX_FAILS 2>&1 | Out-String
$selExit = $LASTEXITCODE
$selOut | Out-File -Append -Encoding utf8 $logf

if ($selExit -eq 3) {
  Log "HẬU KIỂM: không có bài 'Chờ viết' nào đến hạn hôm nay (exit 3) — dừng êm, không cảnh báo."
  Log "==== KẾT THÚC (không có bài) ===="
  exit 0
}
if ($selExit -eq 4) {
  Log "HẬU KIỂM: có bài đến hạn nhưng TẤT CẢ đang KẸT (>=$MAX_FAILS lần lỗi) — không đăng được (exit 4)."
  Send-LarkAlert "🚫 [Đăng bài SEO 11h] $stamp — mọi bài đến hạn đều đang KẸT (>=$MAX_FAILS lần lỗi). Không đăng được bài nào. Kiểm tra brief/ảnh các bài kẹt. Log: .claude\skills\hmh-AIOS-dang-bai-seo\logs\$stamp.log"
  Log "==== DỪNG (mọi bài đều kẹt) ===="
  exit 1
}
if ($selExit -ne 0 -or -not (Test-Path $manifest)) {
  Log "BƯỚC 1 THẤT BẠI: select-article exit=$selExit, manifest tồn tại=$(Test-Path $manifest)."
  Send-LarkAlert "⚠️ [Đăng bài SEO 11h] LỖI chọn bài $stamp`nselect-article.mjs exit=$selExit. Xem log: .claude\skills\hmh-AIOS-dang-bai-seo\logs\$stamp.log"
  Log "==== DỪNG (lỗi chọn bài) ===="
  exit 1
}

# Đọc manifest để lấy thông tin dựng prompt viết bài.
$mf = Get-Content $manifest -Raw -Encoding UTF8 | ConvertFrom-Json
$imgCount = 0
if ($mf.images) { $imgCount = @($mf.images).Count }
$targetWords = if ($mf.target_words) { $mf.target_words } else { "1500-2000" }
Log "Bước 1 OK: chọn '$($mf.title)' | keyword='$($mf.focus_keyword)' | slug=/$($mf.slug) | ảnh=$imgCount"

# ---------- BƯỚC 2: VIẾT BÀI HTML (claude -p nhả HTML ra stdout) ----------
Log "Bước 2: viết bài HTML chuẩn SEO (claude -p, stdout)..."
$checklist   = Get-Content $checklistFile -Raw -Encoding UTF8
$manifestStr = Get-Content $manifest -Raw -Encoding UTF8

$imgRule = if ($imgCount -gt 0) {
  "Có $imgCount ảnh. Mỗi ảnh thân bài dùng placeholder __IMG1__ .. __IMG$imgCount__ ở thuộc tính src, bọc trong <figure><img src=`"__IMGk__`" alt=`"<từ khoá chính ...>`"><figcaption>...</figcaption></figure>. Alt BẮT BUỘC chứa từ khoá chính. Ảnh #1 sẽ là featured."
} else {
  "Record KHÔNG có ảnh — KHÔNG chèn thẻ <img> hay placeholder __IMG__ nào. Viết bài text-only chuẩn SEO."
}

$writePrompt = @"
Bạn là cây bút SEO chuyên nghiệp cho website WordPress này. Viết MỘT bài blog chuẩn SEO bằng tiếng Việt, dựa trên brief và checklist dưới đây.

=== CHECKLIST SEO BLOG (tuân thủ tuyệt đối) ===
$checklist

=== BRIEF BÀI VIẾT (manifest.json) ===
$manifestStr

=== YÊU CẦU ĐẦU RA (theo đúng Bước 2 của SKILL) ===
- Viết CHỈ phần thân bài HTML (không cần <html>/<head>/<body>).
- Headline/H1: từ khoá chính ở đầu, có số + lợi ích + lời hứa.
- Sapo: từ khoá chính trong 100 từ đầu (tốt nhất câu 1), có neo móc.
- Heading H2/H3 theo Outline trong brief; rải từ khoá chính/phụ vào heading.
- Mật độ từ khoá ~1.5-2%, độ dài >= số từ mục tiêu ($targetWords), đoạn 3-5 dòng.
- $imgRule
- Internal links: 2-3 link nội bộ (anchor chứa từ khoá) từ internal_links. External: 1 link web mạnh cùng chủ đề từ backlink_targets.
- Kết luận < 200 từ, không ý mới, truyền cảm hứng + câu cuối dễ nhớ.
- 2 CTA (giữa + cuối bài) gắn UTM: ?utm_source=blog&utm_medium=post&utm_campaign=$($mf.slug)&utm_content=cta-giua-bai (và cta-cuoi-bai).
- CẤM: ký tự em dash, emoji, trích dẫn/viết kiểu tin báo.

QUAN TRỌNG VỀ ĐỊNH DẠNG ĐẦU RA:
In ra DUY NHẤT mã HTML thân bài. KHÔNG kèm bất kỳ lời giải thích, lời mở đầu, hay ghi chú nào. KHÔNG bọc trong dấu ``` hay khối mã. Ký tự đầu tiên của câu trả lời phải là dấu '<'.
"@

# KHOÁ CHẶT Bước 2 (vá lỗi 20/06: claude -p tự đi đọc Lark/ghi file rồi treo 43' thay vì chỉ in HTML):
#   --tools ""               -> tắt MỌI tool: model KHÔNG thể đọc Lark/ghi file, BẮT BUỘC chỉ in HTML ra stdout.
#   --strict-mcp-config + mcp rỗng -> bỏ qua mọi MCP server (không treo lúc khởi động khi server đang kết nối).
#   --disable-slash-commands -> không nạp skill agentic vào ngữ cảnh.
#   --no-session-persistence -> không lưu/resume phiên (tránh poison phiên 1M).
#   + Timeout cứng 8' (19/06 chỉ mất 2'): quá giờ -> kill cây tiến trình, cảnh báo, thoát sạch (không để task treo).
# Prompt & I/O qua FILE (UTF-8 no BOM) để giữ tiếng Việt đúng và né giới hạn dòng lệnh.
$emptyMcp   = Join-Path $outDir "_empty-mcp.json"
[System.IO.File]::WriteAllText($emptyMcp, '{"mcpServers":{}}', $utf8)
$promptFile = Join-Path $outDir "_write-prompt.txt"
[System.IO.File]::WriteAllText($promptFile, $writePrompt, $utf8)
$rawFile = Join-Path $outDir "_claude-stdout.txt"
$errFile = Join-Path $outDir "_claude-stderr.txt"
$argLine = '-p --output-format text --tools "" --strict-mcp-config --mcp-config "' + $emptyMcp + '" --disable-slash-commands --no-session-persistence --permission-mode bypassPermissions'
$proc = Start-Process -FilePath $claude -ArgumentList $argLine -RedirectStandardInput $promptFile -RedirectStandardOutput $rawFile -RedirectStandardError $errFile -NoNewWindow -PassThru
$writeTimeoutMs = 8 * 60 * 1000
if (-not $proc.WaitForExit($writeTimeoutMs)) {
  try { taskkill /PID $proc.Id /T /F 2>$null | Out-Null } catch {}
  Log "BƯỚC 2 TIMEOUT: claude -p quá $($writeTimeoutMs/60000) phút — đã kill cây tiến trình."
  Record-Fail $mf.record_id "timeout viết bài" $mf.title
  Send-LarkAlert "⚠️ [Đăng bài SEO 11h] TIMEOUT viết bài $stamp`nclaude -p quá $($writeTimeoutMs/60000) phút cho '$($mf.title)'. Đã kill, chưa đăng. Xem log: .claude\skills\hmh-AIOS-dang-bai-seo\logs\$stamp.log"
  Log "==== DỪNG (timeout viết bài) ===="
  exit 1
}
$raw = ""
if (Test-Path $rawFile) { $raw = Get-Content $rawFile -Raw -Encoding UTF8 }
if (-not $raw) { $raw = "" }

Remove-GhostSessions   # quét ngay file ma mà claude -p vừa sinh ra trong lần chạy này

# Dọn output: bỏ rào ```...```, cắt từ dấu '<' đầu tiên.
$html = $raw
$html = [regex]::Replace($html, '(?s)^\s*```[a-zA-Z]*\s*', '')
$html = [regex]::Replace($html, '(?s)\s*```\s*$', '')
$lt = $html.IndexOf('<')
if ($lt -gt 0) { $html = $html.Substring($lt) }
$html = $html.Trim()

# Lưới an toàn: checklist CẤM em dash. Thay '—' (U+2014) bằng ', ' và '–' (U+2013) bằng '-' để không lọt ra web.
$html = $html.Replace([string][char]0x2014, ', ').Replace([string][char]0x2013, '-')

# Guard chất lượng: phải là HTML thật, đủ dài.
if ($html.Length -lt 500 -or $html -notmatch '<(h1|h2|p)\b') {
  Log "BƯỚC 2 THẤT BẠI: HTML không hợp lệ (len=$($html.Length)). Đầu output: $($raw.Substring(0,[Math]::Min(300,$raw.Length)))"
  Record-Fail $mf.record_id "HTML không hợp lệ" $mf.title
  Send-LarkAlert "⚠️ [Đăng bài SEO 11h] LỖI viết bài $stamp`nClaude không trả về HTML hợp lệ cho '$($mf.title)'. Chưa đăng. Xem log: .claude\skills\hmh-AIOS-dang-bai-seo\logs\$stamp.log"
  Log "==== DỪNG (lỗi viết bài) ===="
  exit 1
}
# Guard ẢNH: có ảnh nhưng HTML thiếu placeholder __IMG1__ -> publish sẽ mất ảnh + featured. Chặn, không đăng câm.
if ($imgCount -gt 0 -and $html -notmatch '__IMG1__') {
  Log "BƯỚC 2 THẤT BẠI: có $imgCount ảnh nhưng HTML thiếu placeholder __IMG1__ (sẽ mất ảnh & featured)."
  Record-Fail $mf.record_id "thiếu placeholder ảnh" $mf.title
  Send-LarkAlert "⚠️ [Đăng bài SEO 11h] LỖI viết bài $stamp`nBài '$($mf.title)' có $imgCount ảnh nhưng thiếu placeholder __IMG__. Chưa đăng. Xem log: .claude\skills\hmh-AIOS-dang-bai-seo\logs\$stamp.log"
  Log "==== DỪNG (thiếu placeholder ảnh) ===="
  exit 1
}
[System.IO.File]::WriteAllText($htmlPath, $html, $utf8)
Log "Bước 2 OK: đã viết $htmlPath ($($html.Length) ký tự)."

# ---------- BƯỚC 3: ĐĂNG WORDPRESS + CẬP NHẬT LARK (node trực tiếp) ----------
Log "Bước 3: đăng WordPress + cập nhật Lark (publish-wordpress.mjs)..."
$pubOut = & $node $publishScript --manifest $manifest --html $htmlPath 2>&1 | Out-String
$pubExit = $LASTEXITCODE
$pubOut | Out-File -Append -Encoding utf8 $logf

$pubOk   = $pubOut -match "PUBLISH_OK"
$pubFail = $pubOut -match "PUBLISH_FAIL"
$pubLink = ""
$m = [regex]::Match($pubOut, "PUBLISH_OK\s+(\S+)")
if ($m.Success) { $pubLink = $m.Groups[1].Value }

# ---------- HẬU KIỂM ----------
if ($pubOk -and -not $pubFail) {
  Log "HẬU KIỂM OK: PUBLISH_OK $pubLink (đã đăng + cập nhật Lark)."
  Clear-Fail $mf.record_id   # đăng thành công -> xoá khỏi sổ lỗi (nếu trước đó từng fail)

  # BƯỚC 4: ghi sổ (output .md + log.md) — deterministic, không cần Claude.
  try {
    $descMd = Join-Path $outDir "$stamp-dang-bai-seo.md"
    $fm = @"
---
type: output
title: Đăng bài SEO "$($mf.title)"
created: $stamp
tags: [seo, dang-bai, wordpress]
sources: [bang-lich-bai-seo]
---

# Đăng bài SEO tự động — $stamp

- Bài: **$($mf.title)**
- Từ khoá chính: $($mf.focus_keyword)
- Slug: /$($mf.slug)
- Số ảnh: $imgCount
- Link đã đăng: $pubLink
- Trạng thái Lark: Đã đăng
"@
    [System.IO.File]::WriteAllText($descMd, $fm, $utf8)
    $logMd = Join-Path $proj "log.md"
    "`n## [$stamp] query | Đăng bài SEO `"$($mf.title)`" — $pubLink" | Out-File -Append -Encoding utf8 $logMd
    Log "Bước 4 OK: đã ghi $descMd + log.md."
  } catch { Log "Bước 4 (ghi sổ) lỗi: $($_.Exception.Message)" }

  Send-LarkAlert "✅ [Đăng bài SEO 11h] $stamp — đã đăng 1 bài lên website.`n$($mf.title)`n$pubLink"
} else {
  $reason = if ($pubFail) { "publish lỗi (PUBLISH_FAIL)" } else { "không thấy PUBLISH_OK (exit=$pubExit)" }
  Log "HẬU KIỂM THẤT BẠI: $reason."
  Record-Fail $mf.record_id $reason $mf.title
  Send-LarkAlert "⚠️ [Đăng bài SEO 11h] KHÔNG hoàn tất $stamp`nBài: $($mf.title)`nLý do: $reason.`nBài đã viết xong (output\$stamp-dang-bai-seo\bai-viet.html) nhưng chưa đăng — kiểm tra log: .claude\skills\hmh-AIOS-dang-bai-seo\logs\$stamp.log"
}

Log "==== KẾT THÚC ===="

# register-task.ps1 - Đăng ký Windows Scheduled Task chạy pipeline đăng bài SEO lúc 11:00 mỗi ngày.
# Chạy 1 lần: powershell -ExecutionPolicy Bypass -File register-task.ps1
# Gỡ:        Unregister-ScheduledTask -TaskName "SEO - Dang Bai 11AM" -Confirm:$false
#
# Ghi chú:
#  - Dùng $PSScriptRoot để lấy đường dẫn dự án từ filesystem (tránh mojibake path tiếng Việt khi PS5.1 đọc file).
#  - Dùng Register-ScheduledTask (schtasks.exe hỏng quoting với path có dấu cách).

$taskName = "SEO - Dang Bai 11AM"
$runner   = Join-Path $PSScriptRoot "run-daily.ps1"
$arg      = "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""

$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arg
$trigger = New-ScheduledTaskTrigger -Daily -At 11:00am

# Cấu hình chống treo & chống bỏ chạy (vá 20/06):
#  - ExecutionTimeLimit 20' : tiến trình treo bị giết, KHÔNG chạy lan man tới 3 ngày (mặc định PT72H).
#  - StartWhenAvailable     : máy ngủ/tắt lúc 11h -> chạy bù khi bật lại, không mất bài.
#  - Cho chạy & không dừng khi dùng pin (mặc định Windows chặn chạy trên pin -> mất bài).
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 20)
$settings.DisallowStartIfOnBatteries = $false
$settings.StopIfGoingOnBatteries     = $false
$settings.MultipleInstances          = 'IgnoreNew'

try {
  $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force -ErrorAction Stop | Out-Null
  Write-Output "OK: registered '$taskName' at 11:00 daily (RunLevel Highest)."
} catch {
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force -ErrorAction Stop | Out-Null
  Write-Output "OK: registered '$taskName' at 11:00 daily (default level; Highest needs admin)."
}
Write-Output "Check:   Get-ScheduledTaskInfo -TaskName '$taskName'"
Write-Output "Run now: Start-ScheduledTask  -TaskName '$taskName'"
Write-Output "Remove:  Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false"

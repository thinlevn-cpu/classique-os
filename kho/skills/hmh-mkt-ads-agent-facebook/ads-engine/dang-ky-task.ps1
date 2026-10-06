# dang-ky-task.ps1 -- DANG KY Scheduled Task "HMH-Ads-Agent-3x" (Ads Agent 3 lan/ngay).
# Goi thang bash.exe voi -WorkingDirectory (tranh loi PowerShell quote path co dau cach/Unicode).
# Chay 1 lan voi quyen ADMIN.
$dir  = $PSScriptRoot
$bash = "C:\Program Files\Git\bin\bash.exe"
$action = New-ScheduledTaskAction -Execute $bash -Argument '-lc "bash agent-3x.sh >> agent-3x.log 2>&1"' -WorkingDirectory $dir
$triggers = @(
  (New-ScheduledTaskTrigger -Daily -At 8:00am),
  (New-ScheduledTaskTrigger -Daily -At 1:00pm),
  (New-ScheduledTaskTrigger -Daily -At 7:00pm)
)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType S4U -RunLevel Limited
Register-ScheduledTask -TaskName "HMH-Ads-Agent-3x" -Action $action -Trigger $triggers -Settings $settings -Principal $principal -Description "Ads Agent 3 lan/ngay (08:00,13:00,19:00): quet chien dich dang chay -> ghi Bang 5 -> gui the Lark" -Force
Get-ScheduledTask -TaskName "HMH-Ads-Agent-3x" | Select-Object TaskName,State

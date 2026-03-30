@echo off
chcp 65001 >nul
title 创建桌面快捷方式

set "TARGET=%~dp0nwjs\nwjs-v0.14.7-win-ia32\nw.exe"
set "SHORTCUT=%USERPROFILE%\Desktop\金蝶财务软件K3.lnk"

echo 正在创建桌面快捷方式...

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%TARGET%'; $s.WorkingDirectory = '%~dp0nwjs\nwjs-v0.14.7-win-ia32'; $s.Description = '金蝶财务软件 K3'; $s.Save()"

if exist "%SHORTCUT%" (
    echo [√] 桌面快捷方式创建成功！
) else (
    echo [×] 桌面快捷方式创建失败
)

pause

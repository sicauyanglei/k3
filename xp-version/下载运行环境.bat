@echo off
chcp 65001 >nul
title 下载 NW.js 运行环境

echo ========================================
echo   金蝶财务软件 K3 - 下载运行环境
echo ========================================
echo.

set "TARGET=%~dp0"

echo 正在下载 NW.js 0.14.7 (Windows 32位)...
echo 文件大小约 80MB，请耐心等待...
echo.

powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri 'https://dl.nwjs.io/v0.14.7/nwjs-v0.14.7-win-ia32.zip' -OutFile '%TARGET%downloads\nwjs-win32.zip' -UseBasicParsing }"

if exist "%TARGET%downloads\nwjs-win32.zip" (
    echo [√] NW.js 下载完成
    echo.
    echo 正在解压...
    
    powershell -Command "Expand-Archive -Path '%TARGET%downloads\nwjs-win32.zip' -DestinationPath '%TARGET%nwjs' -Force"
    
    if exist "%TARGET%nwjs\nwjs-v0.14.7-win-ia32\nw.exe" (
        echo [√] 解压完成
        
        echo.
        echo 正在复制应用文件...
        
        xcopy /Y /Q "%TARGET%package.json" "%TARGET%nwjs\nwjs-v0.14.7-win-ia32\"
        xcopy /Y /Q "%TARGET%index.html" "%TARGET%nwjs\nwjs-v0.14.7-win-ia32\"
        xcopy /Y /E /I /Q "%TARGET%css" "%TARGET%nwjs\nwjs-v0.14.7-win-ia32\css"
        xcopy /Y /E /I /Q "%TARGET%js" "%TARGET%nwjs\nwjs-v0.14.7-win-ia32\js"
        xcopy /Y /E /I /Q "%TARGET%lib\sql-wasm.js" "%TARGET%nwjs\nwjs-v0.14.7-win-ia32\lib"
        xcopy /Y /E /I /Q "%TARGET%lib\sql-wasm.wasm" "%TARGET%nwjs\nwjs-v0.14.7-win-ia32\lib"
        
        echo [√] 文件复制完成
        echo.
        echo ========================================
        echo   安装完成！
        echo ========================================
        echo.
        echo 双击 "启动K3财务软件.bat" 运行程序
    ) else (
        echo [×] 解压失败
    )
) else (
    echo [×] 下载失败，请检查网络连接
)

echo.
pause

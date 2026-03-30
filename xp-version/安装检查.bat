@echo off
chcp 65001 >nul
title 安装金蝶财务软件 K3

echo ========================================
echo   金蝶财务软件 K3 - Windows XP版
echo   安装程序
echo ========================================
echo.

set "TARGET=%~dp0"

echo 正在检查系统环境...

if exist "%TARGET%nwjs\nwjs-v0.14.7-win-ia32\nw.exe" (
    echo [√] NW.js 运行环境已就绪
) else (
    echo [×] NW.js 运行环境未找到
    echo     请确保 nwjs\nwjs-v0.14.7-win-ia32 目录存在
    pause
    exit /b 1
)

if exist "%TARGET%nwjs\nwjs-v0.14.7-win-ia32\sql-wasm.js" (
    echo [√] 数据库组件已就绪
) else (
    echo [×] 数据库组件未找到
    echo     请确保 lib 目录中的 sql-wasm.js 和 sql-wasm.wasm 已复制
    pause
    exit /b 1
)

if exist "%TARGET%nwjs\nwjs-v0.14.7-win-ia32\index.html" (
    echo [√] 应用程序文件已就绪
) else (
    echo [×] 应用程序文件未找到
    pause
    exit /b 1
)

echo.
echo ========================================
echo   安装检查完成！
echo ========================================
echo.
echo 使用方法：
echo   1. 双击 "启动K3财务软件.bat" 运行程序
echo   2. 默认账号: admin / admin
echo.
echo 系统要求：
echo   - Windows XP SP3 或更高版本
echo   - 512MB 内存
echo   - 100MB 硬盘空间
echo.

pause

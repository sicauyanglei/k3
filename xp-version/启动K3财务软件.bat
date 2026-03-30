@echo off
chcp 65001 >nul
title 金蝶财务软件 K3 - Windows XP版
cd /d "%~dp0nwjs\nwjs-v0.14.7-win-ia32"
start "" nw.exe

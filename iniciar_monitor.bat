@echo off
title PausaFast - Monitor de pedidos, lojas e pausas
rem Sobe SO o worker contínuo (worker\monitor.py). Use num PC/servidor que fica ligado 24h.
cd /d "%~dp0"
:loop
".venv\Scripts\python.exe" worker\monitor.py
echo  Monitor parou. Reiniciando em 10s... (feche esta janela pra parar de vez)
timeout /t 10 /nobreak >nul
goto loop

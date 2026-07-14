@echo off
setlocal
title Cajupar - Automacao iFood
color 0A
echo.
echo  ================================================
echo          CAJUPAR - AUTOMACAO IFOOD
echo  ================================================
echo.
echo  Liberando portas do projeto (5000 e 5173)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 /nobreak >nul

if not exist "%~dp0.venv\Scripts\python.exe" (
	echo.
	echo  ERRO: ambiente virtual Python nao encontrado em %~dp0.venv
	echo  Rode: python -m venv .venv  e depois instale requirements.txt
	pause
	exit /b 1
)

if not exist "%~dp0viewer\package.json" (
	echo.
	echo  ERRO: pasta viewer nao encontrada em %~dp0viewer
	pause
	exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
	echo.
	echo  ERRO: npm nao encontrado no PATH.
	echo  Instale o Node.js e tente novamente.
	pause
	exit /b 1
)

echo.
echo  Verificando dependencias do BACKEND...
"%~dp0.venv\Scripts\python.exe" -c "import flask" >nul 2>&1
if errorlevel 1 (
	echo  Instalando dependencias do backend...
	"%~dp0.venv\Scripts\python.exe" -m pip install -r "%~dp0requirements.txt"
	if errorlevel 1 (
		echo.
		echo  ERRO ao instalar dependencias do backend.
		pause
		exit /b 1
	)
) else (
	echo  Backend OK.
)

echo.
echo  Verificando dependencias do FRONTEND...
if not exist "%~dp0viewer\node_modules" (
	echo  Instalando dependencias do frontend...
	pushd "%~dp0viewer"
	call npm install
	if errorlevel 1 (
		popd
		echo.
		echo  ERRO ao instalar dependencias do frontend.
		pause
		exit /b 1
	)
	popd
) else (
	echo  Frontend OK.
)

echo.
echo  [1/2] Iniciando BACKEND - API iFood (porta 5000)...
start "Backend - API iFood" cmd /k "cd /d "%~dp0" && ".venv\Scripts\python.exe" server\app.py"
timeout /t 3 /nobreak >nul

echo  [2/2] Iniciando FRONTEND - Painel (porta 5173)...
start "Frontend - Painel" cmd /k "cd /d "%~dp0viewer" && npm run dev"
timeout /t 4 /nobreak >nul

echo.
echo  ================================================
echo   SERVIDORES INICIADOS COM SUCESSO!
echo  ================================================
echo.
echo   Backend:  http://localhost:5000
echo   Painel:   http://localhost:5173
echo.
echo   Aguarde alguns segundos e acesse:
echo   http://localhost:5173
echo.
start http://localhost:5173

echo.
echo  Sistema rodando! Pode fechar esta janela.
echo  (as janelas do Backend e do Painel precisam continuar abertas)
echo.
endlocal
exit /b 0

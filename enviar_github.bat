@echo off
setlocal enabledelayedexpansion

set REPO_URL=https://github.com/lKauazinnn/automa-o-apis-delivery.git

rem Sempre roda a partir da pasta onde este .bat está, não importa de onde foi chamado.
cd /d "%~dp0"

if not exist ".git" (
    echo Inicializando repositorio git...
    git init
    git branch -M main
    git remote add origin %REPO_URL%
) else (
    git remote get-url origin >nul 2>&1
    if errorlevel 1 (
        echo Ligando ao repositorio remoto...
        git remote add origin %REPO_URL%
    )
)

echo.
echo Verificando o que sera enviado (respeitando o .gitignore)...
git add -A
git status --short

git diff --cached --quiet
if %errorlevel% equ 0 (
    echo.
    echo Nada novo pra enviar.
    goto fim
)

echo.
set /p MSG="Mensagem do commit (Enter = usa uma padrao): "
if "%MSG%"=="" set MSG=Atualizacao do painel iFood

git commit -m "%MSG%"
if errorlevel 1 goto fim

echo.
echo Enviando pro GitHub...
git push -u origin main

:fim
echo.
pause

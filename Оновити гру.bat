@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Lemonade King - оновлення гри
where node >nul 2>nul
if errorlevel 1 (
  echo Потрібен Node.js. Завантажте LTS-версію з https://nodejs.org і запустіть цей файл ще раз.
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Перший запуск: встановлюю потрібні пакети, це займе хвилину...
  call npm install
  if errorlevel 1 (
    echo Не вдалося встановити пакети.
    pause
    exit /b 1
  )
)
echo Збираю гру...
call npm run build:play
if errorlevel 1 (
  echo Помилка під час збірки. Подивіться повідомлення вище.
  pause
  exit /b 1
)
echo.
echo Готово! Файл "Lemonade King.html" оновлено.
if not defined LK_NO_OPEN start "" "Lemonade King.html"
if not defined LK_NO_OPEN timeout /t 3 >nul
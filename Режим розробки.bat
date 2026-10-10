@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Lemonade King - режим розробки
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
echo Запускаю гру з автоперезавантаженням. Браузер відкриється сам.
echo Зміни в коді й нові картинки з'являтимуться одразу.
echo Щоб зупинити, просто закрийте це вікно.
echo.
call npx vite --open
pause
@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Lemonade King - відправка гри в Steam
rem Відправляє в Steam останню Windows-збірку гри (реліз "Windows (latest)" на GitHub) через SteamCMD від Valve.
rem Перед першим запуском впишіть номери гри зі Steamworks у steam\app_build.vdf (див. docs\STEAM.md).

findstr /c:"0000000" app_build.vdf >nul
if not errorlevel 1 (
  echo Спершу впишіть у steam\app_build.vdf номер гри ^(App ID^) і номер депо ^(Depot ID^) зі Steamworks.
  echo Де їх узяти: docs\STEAM.md, крок 3.
  pause
  exit /b 1
)

if not exist tools mkdir tools
if not exist "tools\steamcmd\steamcmd.exe" (
  echo Завантажую SteamCMD від Valve...
  curl -L -o tools\steamcmd.zip https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip || goto :fail
  mkdir tools\steamcmd
  tar -xf tools\steamcmd.zip -C tools\steamcmd || goto :fail
)

echo Завантажую останню збірку гри для Steam з GitHub...
curl -L -o tools\game.zip https://github.com/vivites753-coder/lemonade-king-njx5t211/releases/download/windows-latest/lemonade-king-steam-win64.zip || goto :fail
if exist content rmdir /s /q content
mkdir content
tar -xf tools\game.zip -C content || goto :fail
if not exist "content\Lemonade King.exe" goto :fail

echo.
set /p STEAM_USER=Логін вашого акаунта Steamworks:
echo SteamCMD спитає пароль і код Steam Guard: вводьте їх тільки в цьому вікні.
tools\steamcmd\steamcmd.exe +login %STEAM_USER% +run_app_build "%~dp0app_build.vdf" +quit
if errorlevel 1 goto :fail

echo.
echo Готово: збірку відправлено. Тепер на сайті Steamworks відкрийте SteamPipe - Builds
echo і зробіть її робочою для гілки default (Set build live).
pause
exit /b 0

:fail
echo.
echo Щось пішло не так: дивіться повідомлення вище.
pause
exit /b 1

@echo off
chcp 65001 >nul
title شاشة مواقيت الصلاة - مسجد مقطع مناور أبو خزيمة الأنصاري

rem ============================================================
rem  تشغيل شاشة المسجد على التلفاز / الحاسوب في وضع ملء الشاشة
rem  مع السماح بتشغيل صوت الأذان تلقائيًا (بدون نقرة)
rem ============================================================

set "URL=https://steverlaabs.github.io/mawaqit-el-salat/"

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  echo فتح الشاشة عبر Google Chrome...
  start "" "%CHROME%" --kiosk --autoplay-policy=no-user-gesture-required --no-first-run --no-default-browser-check --disable-features=Translate --disable-infobars --disable-session-crashed-bubble "%URL%"
  exit /b
)

set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%EDGE%" (
  echo فتح الشاشة عبر Microsoft Edge...
  start "" "%EDGE%" --kiosk --autoplay-policy=no-user-gesture-required --no-first-run --no-default-browser-check --disable-infobars --disable-session-crashed-bubble "%URL%"
  exit /b
)

echo لم يتم العثور على Chrome أو Edge على هذا الجهاز.
echo افتح الرابط التالي يدويًا في أي متصفح:
echo %URL%
echo.
echo ملاحظة: لتشغيل صوت الأذان تلقائيًا يجب السماح بالتشغيل التلقائي للصوت.
pause

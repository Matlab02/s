@echo off
title Seklini gormek olar
echo Dependencies qurasdirilir...
call npm install
echo.
echo Server ise salinir...
echo Sayt: http://localhost:3000
echo Admin: http://localhost:3000/admin
echo.
call npm start
pause

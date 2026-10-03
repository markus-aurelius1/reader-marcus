@echo off
rem Opens the notes reader. Needs Node.js. First run installs and builds.
cd /d "%~dp0"
if not exist node_modules call npm install
if not exist dist call npm run build
start "" http://localhost:4310
call npm run preview

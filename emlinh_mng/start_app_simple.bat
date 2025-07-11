@echo off
echo Starting Emlinh AI Assistant...
echo.

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Start the application
python -m src.app.run

pause 
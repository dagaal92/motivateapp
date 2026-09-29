@echo off
echo Instalando el panel de subtitulos para Premiere...
set "DEST=%APPDATA%\Adobe\CEP\extensions\com.motivate.subtitulos"
xcopy /E /I /Y /Q "%~dp0panel-premiere" "%DEST%" >nul
copy /Y "%~dp0subtitular.py" "%DEST%\" >nul
xcopy /E /I /Y /Q "%~dp0fuentes" "%DEST%\fuentes" >nul
if exist "%~dp0..\silencios\quitar_silencios.py" copy /Y "%~dp0..\silencios\quitar_silencios.py" "%DEST%\" >nul

REM Permite paneles no firmados (necesario para paneles propios).
for %%v in (9 10 11 12 13 14) do reg add "HKCU\Software\Adobe\CSXS.%%v" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul

echo Instalando el reconocimiento de voz...
py -m pip install --upgrade faster-whisper pillow numpy scipy noisereduce

echo.
echo Listo. Cierra y vuelve a abrir Premiere y ve a:
echo Ventana ^> Extensiones ^> Subtitulos y silencios
pause

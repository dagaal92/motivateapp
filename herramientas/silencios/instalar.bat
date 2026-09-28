@echo off
echo Instalando lo necesario para quitar silencios y ruido...
py -m pip install --upgrade faster-whisper noisereduce scipy numpy
echo.
echo Listo. Ya puedes arrastrar tus videos sobre quitar_silencios.bat
pause

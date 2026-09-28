@echo off
REM Doble clic: se abre una ventana para elegir el video. (Tambien puedes arrastrar videos encima.)
REM Opciones (cambialas a tu gusto):
REM   --silencio 0.4  solo corta silencios de mas de 0.4 segundos
REM   --margen 0.15   aire que se deja antes y despues de cada frase
REM   --ruido 0.8     fuerza de la limpieza de ruido (0 = nada, 1 = maxima)
py "%~dp0quitar_silencios.py" %* --silencio 0.4 --margen 0.15 --ruido 0.8
pause

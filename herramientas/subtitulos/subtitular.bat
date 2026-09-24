@echo off
REM Arrastra uno o varios videos sobre este archivo.
REM Cambia las opciones de abajo a tu gusto (quita --mayusculas si no las quieres).
py "%~dp0subtitular.py" %* --modelo small --palabras 1 --mayusculas
pause

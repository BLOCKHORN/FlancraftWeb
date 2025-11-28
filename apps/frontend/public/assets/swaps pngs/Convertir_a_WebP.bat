@echo off
setlocal enabledelayedexpansion

:: --- CONFIGURACION ---
:: Calidad (0 a 100). 90 es excelente, 75 es bueno para web.
set CALIDAD=90
:: Compresión (0 a 6). 6 tarda más pero reduce más el peso.
set COMPRESION=6
:: ---------------------

echo ===================================================
echo      CONVERTIDOR DE PNG A WEBP (FFMPEG)
echo ===================================================
echo.

if not exist "WebP_Convertidos" mkdir "WebP_Convertidos"

echo Buscando archivos PNG...
echo.

for %%i in (*.png) do (
    echo Procesando: %%i ...
    
    :: Comando FFmpeg explicado:
    :: -c:v libwebp  -> Usa el codec de WebP
    :: -q:v %CALIDAD% -> Define la calidad visual
    :: -compression_level %COMPRESION% -> Máximo esfuerzo para reducir peso
    
    ffmpeg -i "%%i" -c:v libwebp -q:v !CALIDAD! -compression_level !COMPRESION! "WebP_Convertidos\%%~ni.webp" -hide_banner -loglevel error
    
    echo [OK] %%~ni.webp creado.
)

echo.
echo ===================================================
echo      PROCESO TERMINADO
echo ===================================================
echo Tus archivos estan en la carpeta "WebP_Convertidos"
pause
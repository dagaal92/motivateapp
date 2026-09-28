# Quitar silencios y ruido de fondo

Limpia la voz (reduce ruido de ventiladores, calle, zumbidos) y corta los silencios de tus videos. El resultado es una **secuencia nueva de Premiere** con los cortes ya hechos, para que puedas revisarlos y ajustarlos.

## Instalación (una sola vez)

1. Necesitas **Python** (el mismo de los subtítulos; si ya lo tienes, sáltate esto).
2. Doble clic en **`instalar.bat`**.

## Uso

1. **Doble clic en `quitar_silencios.bat`**. Se abre una ventana: elige tu video y pulsa *Abrir*. Puedes elegir varios con Ctrl.
2. Al lado del video aparecen dos archivos:
   - `video_limpio.wav`: el audio completo con el ruido reducido.
   - `video_cortado.xml`: la secuencia sin silencios.
3. En Premiere: **Archivo > Importar** y elige `video_cortado.xml`. Aparece una secuencia nueva llamada *"video sin silencios"*.
4. Revísala. Si algún corte quedó muy justo, alarga el clip desde el borde (el video completo sigue ahí).
5. Si quieres subtítulos, usa el panel de subtítulos sobre esta secuencia nueva.

## Ajustes

Edita la línea `py ...` dentro de `quitar_silencios.bat`:

| Opción | Qué hace | Si... |
|---|---|---|
| `--silencio 0.4` | Solo corta silencios de más de 0.4 s | corta pausas que querías dejar: súbelo (0.6) |
| `--margen 0.15` | Aire antes y después de cada frase | se comen el inicio o final de palabras: súbelo (0.25) |
| `--ruido 0.8` | Fuerza de la limpieza (0 a 1) | la voz suena "metálica" o robótica: bájalo (0.5) |

La limpieza funciona mejor con ruido **constante** (ventilador, aire acondicionado, zumbido). Ruidos que van y vienen (carros que pasan, gente hablando) se reducen poco.

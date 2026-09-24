# Subtítulos palabra por palabra para Premiere

Convierte un video en un archivo `.srt` con **una palabra por subtítulo**, sincronizado con la voz. Todo corre en tu PC, gratis y sin internet (menos la primera descarga del modelo).

## Instalación (una sola vez)

1. Instala **Python** desde https://www.python.org/downloads/ y marca la casilla **"Add Python to PATH"** durante la instalación.
2. Haz doble clic en **`instalar.bat`**.

## Uso diario

1. Exporta tu video (o solo el audio) desde Premiere, o usa el archivo original.
2. **Arrastra el video sobre `subtitular.bat`**. Puedes arrastrar varios a la vez.
3. Se crea un `.srt` con el mismo nombre al lado del video (ej. `reel.mp4` → `reel.srt`).
4. En Premiere: **Archivo > Importar** el `.srt` y arrástralo a la línea de tiempo. Queda como pista de subtítulos.
5. Para darles estilo a todos de una vez: selecciona un subtítulo, cámbiale fuente/tamaño/posición en el panel **Propiedades** (o **Gráficos esenciales**) y guárdalo como **Estilo de pista**. Se aplica a todos.

La primera vez tarda más porque descarga el modelo de reconocimiento de voz.

## Opciones

Edita la línea `py ...` dentro de `subtitular.bat`:

| Opción | Qué hace |
|---|---|
| `--palabras 2` | 2 palabras por subtítulo en vez de 1 |
| `--mayusculas` | Todo en MAYÚSCULAS (quítala si no la quieres) |
| `--sin-puntuacion` | Quita comas, puntos, signos |
| `--modelo medium` | Más preciso pero más lento (`tiny`, `base`, `small`, `medium`, `large-v3`) |
| `--idioma en` | Si el video está en inglés |

Si tienes tarjeta gráfica NVIDIA, se usa automáticamente y va mucho más rápido.

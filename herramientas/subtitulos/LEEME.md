# Subtítulos palabra por palabra para Premiere

Convierte un video en un archivo `.srt` con **una palabra por subtítulo**, sincronizado con la voz. Todo corre en tu PC, gratis y sin internet (menos la primera descarga del modelo).

Hay dos formas de usarlo: **el panel dentro de Premiere** (recomendado) o arrastrando videos sobre un `.bat`.

## Opción A: panel dentro de Premiere

### Instalación (una sola vez)

1. Instala **Python** desde https://www.python.org/downloads/ y marca **"Add Python to PATH"**.
2. Cierra Premiere y haz doble clic en **`instalar_panel.bat`**.
3. Abre Premiere y ve a **Ventana > Extensiones (heredado) > Subtitulos palabra por palabra**
   (en versiones anteriores: **Ventana > Extensiones**).

Si cambias algo en esta carpeta, vuelve a ejecutar `instalar_panel.bat` para actualizar el panel.

### Uso

1. Abre la secuencia que quieres subtitular.
2. Elige las opciones en el panel y pulsa **Subtitular secuencia activa**.
3. El panel exporta el audio, lo transcribe y crea una **pista de subtítulos nueva** en la secuencia. El `.srt` queda en la carpeta *Subtitulos* del proyecto.

**En Premiere 2020 o anterior** los subtítulos importados no se ven en la vista previa. Por eso ahí el panel crea un **video transparente** (`.mov`) con las palabras en blanco con borde negro y lo pone en una pista de video encima de tu video. Se ve sin configurar nada y sale al exportar. Para moverlo o cambiarle el tamaño usa *Controles de efectos > Movimiento*.

La primera vez tarda más porque descarga el modelo. Mientras se exporta el audio, Premiere se queda congelado unos segundos. Es normal.

Si sale un error de exportación, pulsa **Elegir preset de audio** y selecciona un preset `.epr` de audio (por ejemplo, en `C:\Program Files\Adobe\Adobe Premiere Pro 20XX\MediaIO\systempresets`). El panel lo recuerda.

## Opción B: arrastrar videos sobre un .bat

### Instalación (una sola vez)

1. Instala **Python** desde https://www.python.org/downloads/ y marca la casilla **"Add Python to PATH"** durante la instalación.
2. Haz doble clic en **`instalar.bat`**.

### Uso diario

1. Exporta tu video (o solo el audio) desde Premiere, o usa el archivo original.
2. **Arrastra el video sobre `subtitular.bat`**. Puedes arrastrar varios a la vez.
3. Se crea un `.srt` con el mismo nombre al lado del video (ej. `reel.mp4` → `reel.srt`).
4. En Premiere: **Archivo > Importar** el `.srt` y arrástralo a la línea de tiempo. Queda como pista de subtítulos.
5. Para darles estilo a todos de una vez: selecciona un subtítulo, cámbiale fuente/tamaño/posición en el panel **Propiedades** (o **Gráficos esenciales**) y guárdalo como **Estilo de pista**. Se aplica a todos.

La primera vez tarda más porque descarga el modelo de reconocimiento de voz.

## Opciones (Opción B)

Edita la línea `py ...` dentro de `subtitular.bat`:

| Opción | Qué hace |
|---|---|
| `--palabras 2` | 2 palabras por subtítulo en vez de 1 |
| `--mayusculas` | Todo en MAYÚSCULAS (quítala si no la quieres) |
| `--sin-puntuacion` | Quita comas, puntos, signos |
| `--modelo medium` | Más preciso pero más lento (`tiny`, `base`, `small`, `medium`, `large-v3`) |
| `--idioma en` | Si el video está en inglés |

Si tienes tarjeta gráfica NVIDIA, se usa automáticamente y va mucho más rápido.

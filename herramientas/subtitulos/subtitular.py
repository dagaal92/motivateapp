"""
Genera subtítulos palabra por palabra (.srt) a partir de un video o audio,
listos para importar en Adobe Premiere Pro.

Uso:
    python subtitular.py video.mp4 [otro_video.mov ...] [opciones]

Ejemplos:
    python subtitular.py reel.mp4
    python subtitular.py reel.mp4 --mayusculas --sin-puntuacion
    python subtitular.py reel.mp4 --palabras 2 --modelo medium

Crea "reel.srt" junto al video. En Premiere: Archivo > Importar > reel.srt,
y arrástralo a la línea de tiempo (queda como pista de subtítulos).
"""

import argparse
import re
import sys
from pathlib import Path

# Si el siguiente subtítulo empieza antes de este hueco (segundos), estiramos
# el actual hasta él para que no parpadee la pantalla entre palabras.
HUECO_MAXIMO = 0.6
DURACION_MINIMA = 0.15


def formato_tiempo(segundos):
    ms = max(0, int(round(segundos * 1000)))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def limpiar(palabra, mayusculas, sin_puntuacion):
    palabra = palabra.strip()
    if sin_puntuacion:
        palabra = re.sub(r"[^\w'’-]", "", palabra)
    if mayusculas:
        palabra = palabra.upper()
    return palabra


def cargar_modelo(nombre):
    from faster_whisper import WhisperModel

    try:
        # Usa la tarjeta gráfica NVIDIA si está disponible (mucho más rápido).
        return WhisperModel(nombre, device="auto", compute_type="auto")
    except Exception:
        return WhisperModel(nombre, device="cpu", compute_type="int8")


def transcribir(modelo, ruta, idioma):
    segmentos, info = modelo.transcribe(
        str(ruta),
        language=idioma,
        word_timestamps=True,
        vad_filter=True,
    )
    palabras = []
    for segmento in segmentos:
        for w in segmento.words or []:
            palabras.append((w.start, w.end, w.word))
        print(f"  [{formato_tiempo(segmento.end)}] {segmento.text.strip()}")
    return palabras


def agrupar(palabras, por_grupo, mayusculas, sin_puntuacion):
    grupos = []
    for i in range(0, len(palabras), por_grupo):
        bloque = palabras[i : i + por_grupo]
        texto = " ".join(
            t for t in (limpiar(p[2], mayusculas, sin_puntuacion) for p in bloque) if t
        )
        if texto:
            grupos.append([bloque[0][0], bloque[-1][1], texto])

    for actual, siguiente in zip(grupos, grupos[1:]):
        if siguiente[0] - actual[1] < HUECO_MAXIMO:
            actual[1] = siguiente[0]
        actual[1] = min(max(actual[1], actual[0] + DURACION_MINIMA), siguiente[0])
    if grupos:
        grupos[-1][1] = max(grupos[-1][1], grupos[-1][0] + DURACION_MINIMA)
    return grupos


def escribir_srt(grupos, destino):
    with open(destino, "w", encoding="utf-8") as f:
        for n, (inicio, fin, texto) in enumerate(grupos, 1):
            f.write(f"{n}\n{formato_tiempo(inicio)} --> {formato_tiempo(fin)}\n{texto}\n\n")


def main():
    parser = argparse.ArgumentParser(description="Subtítulos palabra por palabra para Premiere.")
    parser.add_argument("archivos", nargs="+", help="Videos o audios a subtitular")
    parser.add_argument("--idioma", default="es", help="Idioma del audio (por defecto: es)")
    parser.add_argument(
        "--modelo",
        default="small",
        help="tiny, base, small, medium, large-v3 (más grande = más preciso y más lento)",
    )
    parser.add_argument("--palabras", type=int, default=1, help="Palabras por subtítulo (por defecto: 1)")
    parser.add_argument("--mayusculas", action="store_true", help="Escribir todo en MAYÚSCULAS")
    parser.add_argument("--sin-puntuacion", action="store_true", help="Quitar comas, puntos, etc.")
    args = parser.parse_args()

    print(f"Cargando modelo '{args.modelo}' (la primera vez se descarga, tarda un poco)...")
    modelo = cargar_modelo(args.modelo)

    for archivo in args.archivos:
        ruta = Path(archivo)
        if not ruta.exists():
            print(f"No encuentro el archivo: {ruta}")
            continue
        print(f"\nTranscribiendo {ruta.name}...")
        palabras = transcribir(modelo, ruta, args.idioma)
        grupos = agrupar(palabras, max(1, args.palabras), args.mayusculas, args.sin_puntuacion)
        destino = ruta.with_suffix(".srt")
        escribir_srt(grupos, destino)
        print(f"Listo: {destino} ({len(grupos)} subtítulos)")


if __name__ == "__main__":
    sys.exit(main())

"""
Limpia el ruido de fondo de la voz y quita los silencios de un video.

Uso:
    python quitar_silencios.py video.mp4 [otro_video.mp4 ...] [opciones]

Crea junto al video:
  - video_limpio.wav   el audio completo con el ruido reducido
  - video_cortado.xml  una secuencia de Premiere con los silencios ya cortados
                       (video original + audio limpio)

En Premiere: Archivo > Importar > video_cortado.xml. Aparece una secuencia
nueva, lista para editar (puedes alargar cualquier corte si quedó justo).
"""

import argparse
import sys
from fractions import Fraction
from pathlib import Path
from urllib.parse import quote
from xml.sax.saxutils import escape

import numpy

FRECUENCIA = 48000  # Hz, lo estándar en video


def leer_audio(ruta):
    """Audio del video en mono, 48 kHz, como números entre -1 y 1."""
    import av

    partes = []
    with av.open(str(ruta)) as contenedor:
        if not contenedor.streams.audio:
            raise ValueError("el video no tiene audio")
        remuestreo = av.AudioResampler(format="flt", layout="mono", rate=FRECUENCIA)
        for cuadro in contenedor.decode(audio=0):
            for salida in remuestreo.resample(cuadro):
                partes.append(salida.to_ndarray().reshape(-1))
        for salida in remuestreo.resample(None):
            partes.append(salida.to_ndarray().reshape(-1))
    return numpy.concatenate(partes).astype(numpy.float32)


def limpiar_ruido(audio, fuerza):
    """Reduce el ruido de fondo constante (ventiladores, calle, zumbidos)."""
    import noisereduce

    if fuerza <= 0:
        return audio
    limpio = noisereduce.reduce_noise(
        y=audio, sr=FRECUENCIA, stationary=True, prop_decrease=fuerza,
    )
    return limpio.astype(numpy.float32)


def detectar_voz(audio, silencio_minimo, margen):
    """Tramos (inicio, fin) en segundos donde hay voz."""
    from faster_whisper.vad import VadOptions, get_speech_timestamps
    from scipy.signal import resample_poly

    audio_16k = resample_poly(audio, 1, FRECUENCIA // 16000).astype(numpy.float32)
    opciones = VadOptions(
        min_silence_duration_ms=int(silencio_minimo * 1000),
        speech_pad_ms=int(margen * 1000),
    )
    tramos = []
    for t in get_speech_timestamps(audio_16k, opciones):
        inicio, fin = t["start"] / 16000, t["end"] / 16000
        if tramos and inicio <= tramos[-1][1]:
            tramos[-1][1] = max(tramos[-1][1], fin)
        else:
            tramos.append([inicio, fin])
    return tramos


def guardar_wav(audio, destino):
    from scipy.io import wavfile

    muestras = numpy.clip(audio, -1, 1)
    wavfile.write(destino, FRECUENCIA, (muestras * 32767).astype(numpy.int16))


def info_video(ruta):
    import av

    with av.open(str(ruta)) as contenedor:
        stream = contenedor.streams.video[0]
        fps = Fraction(stream.average_rate or stream.guessed_rate or 30)
        ancho, alto = stream.codec_context.width, stream.codec_context.height
        # Los celulares guardan el video vertical "acostado" con una rotación.
        try:
            rotacion = next(contenedor.decode(video=0)).rotation
        except Exception:
            rotacion = 0
        if abs(rotacion) == 90:
            ancho, alto = alto, ancho
        duracion = float(contenedor.duration or 0) / 1_000_000
    return ancho, alto, fps, duracion


def url_archivo(ruta):
    ruta = str(Path(ruta).resolve()).replace("\\", "/")
    if not ruta.startswith("/"):
        ruta = "/" + ruta  # Windows: /C:/...
    return "file://localhost" + quote(ruta, safe="/:")


def xml_tasa(fps):
    base = round(float(fps))
    ntsc = "TRUE" if abs(float(fps) - base) > 0.01 else "FALSE"
    return f"<rate><timebase>{base}</timebase><ntsc>{ntsc}</ntsc></rate>"


def escribir_xml(destino, nombre, video, wav, tramos, ancho, alto, fps, duracion):
    """Secuencia en formato Final Cut Pro XML, que Premiere importa directamente."""
    tasa = xml_tasa(fps)
    cuadros_archivo = int(round(duracion * fps))
    formato = (
        f"<samplecharacteristics>{tasa}<width>{ancho}</width><height>{alto}</height>"
        "<anamorphic>FALSE</anamorphic><pixelaspectratio>square</pixelaspectratio>"
        "<fielddominance>none</fielddominance></samplecharacteristics>"
    )
    audio_formato = (
        "<samplecharacteristics><depth>16</depth>"
        f"<samplerate>{FRECUENCIA}</samplerate></samplecharacteristics>"
    )

    def archivo(id_, ruta, es_video, completo):
        if not completo:
            return f'<file id="{id_}"/>'
        media = f"<video>{formato}</video>" if es_video else ""
        media += f"<audio>{audio_formato}<channelcount>{2 if es_video else 1}</channelcount></audio>"
        return (
            f'<file id="{id_}"><name>{escape(Path(ruta).name)}</name>'
            f"<pathurl>{escape(url_archivo(ruta))}</pathurl>{tasa}"
            f"<duration>{cuadros_archivo}</duration><media>{media}</media></file>"
        )

    clips_video, clips_audio = [], []
    posicion = 0
    for n, (inicio, fin) in enumerate(tramos, 1):
        entrada = int(round(inicio * fps))
        salida = int(round(fin * fps))
        if salida <= entrada:
            continue
        largo = salida - entrada
        comun = (
            f"{tasa}<start>{posicion}</start><end>{posicion + largo}</end>"
            f"<in>{entrada}</in><out>{salida}</out>"
        )
        clips_video.append(
            f'<clipitem id="video-{n}"><name>{escape(Path(video).name)}</name>'
            f"<duration>{cuadros_archivo}</duration>{comun}"
            f'{archivo("archivo-video", video, True, n == 1)}</clipitem>'
        )
        clips_audio.append(
            f'<clipitem id="audio-{n}"><name>{escape(Path(wav).name)}</name>'
            f"<duration>{cuadros_archivo}</duration>{comun}"
            f'{archivo("archivo-audio", wav, False, n == 1)}'
            "<sourcetrack><mediatype>audio</mediatype><trackindex>1</trackindex></sourcetrack>"
            "</clipitem>"
        )
        posicion += largo

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="4">'
        f"<sequence><name>{escape(nombre)}</name><duration>{posicion}</duration>{tasa}"
        f"<media><video><format>{formato}</format><track>{''.join(clips_video)}</track></video>"
        f"<audio><format>{audio_formato}</format><track>{''.join(clips_audio)}</track></audio>"
        "</media></sequence></xmeml>\n"
    )
    Path(destino).write_text(xml, encoding="utf-8")
    return float(posicion / fps)


def procesar(ruta, args):
    print(f"\n{ruta.name}")
    print("  1/4 Leyendo el audio...")
    audio = leer_audio(ruta)

    print("  2/4 Limpiando el ruido de fondo...")
    limpio = limpiar_ruido(audio, args.ruido)
    pico = float(numpy.max(numpy.abs(limpio))) or 1.0
    limpio = limpio * (0.89 / pico)  # volumen parejo: pico a -1 dB
    wav = ruta.with_name(ruta.stem + "_limpio.wav")
    guardar_wav(limpio, wav)

    print("  3/4 Buscando los silencios...")
    tramos = detectar_voz(limpio, args.silencio, args.margen)
    if not tramos:
        print("  No encontré voz en este video.")
        return

    print("  4/4 Creando la secuencia para Premiere...")
    ancho, alto, fps, duracion = info_video(ruta)
    duracion = duracion or len(audio) / FRECUENCIA
    xml = ruta.with_name(ruta.stem + "_cortado.xml")
    nueva = escribir_xml(xml, ruta.stem + " sin silencios", ruta, wav, tramos, ancho, alto, fps, duracion)

    print(f"  Listo: {len(tramos)} tramos con voz.")
    print(f"  Duración: {duracion:.1f} s -> {nueva:.1f} s (quité {duracion - nueva:.1f} s de silencio)")
    print(f"  Importa en Premiere: {xml}")


def elegir_videos():
    """Ventana de Windows para elegir los videos (si no se arrastraron)."""
    import tkinter
    from tkinter import filedialog

    ventana = tkinter.Tk()
    ventana.withdraw()
    ventana.attributes("-topmost", True)
    archivos = filedialog.askopenfilenames(
        title="Elige el video (o varios) al que quieres quitarle los silencios",
        filetypes=[("Videos", "*.mp4 *.mov *.m4v *.avi *.mkv *.MP4 *.MOV"), ("Todos", "*.*")],
    )
    ventana.destroy()
    return list(archivos)


def main():
    parser = argparse.ArgumentParser(description="Quita ruido y silencios de videos para Premiere.")
    parser.add_argument("videos", nargs="*", help="Videos a procesar (si no pones ninguno, se abre una ventana)")
    parser.add_argument(
        "--silencio", type=float, default=0.4,
        help="Solo corta silencios más largos que esto, en segundos (por defecto: 0.4)",
    )
    parser.add_argument(
        "--margen", type=float, default=0.15,
        help="Aire que se deja antes y después de cada frase, en segundos (por defecto: 0.15)",
    )
    parser.add_argument(
        "--ruido", type=float, default=0.8,
        help="Fuerza de la limpieza de ruido de 0 (nada) a 1 (máxima). Por defecto: 0.8",
    )
    args = parser.parse_args()

    videos = args.videos or elegir_videos()
    if not videos:
        print("No elegiste ningún video.")
        return

    for video in videos:
        ruta = Path(video)
        if not ruta.exists():
            print(f"No encuentro el archivo: {ruta}")
            continue
        try:
            procesar(ruta, args)
        except Exception as e:
            print(f"  Error con {ruta.name}: {e}")


if __name__ == "__main__":
    sys.exit(main())

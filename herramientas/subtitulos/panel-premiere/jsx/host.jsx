// Parte que corre dentro de Premiere (ExtendScript).
// Devuelve siempre "OK|dato" o "ERROR|mensaje" para que el panel lo lea.

function subt_buscarEprs(carpeta, lista) {
    var archivos = carpeta.getFiles();
    for (var i = 0; i < archivos.length; i++) {
        var f = archivos[i];
        if (f instanceof Folder) {
            subt_buscarEprs(f, lista);
        } else if (/\.epr$/i.test(f.name)) {
            lista.push(f);
        }
    }
}

// Busca entre los ajustes de exportación de Premiere uno que saque solo audio
// (WAV de preferencia) para que la exportación sea rápida.
function subt_buscarPreset() {
    var raiz = new Folder(app.path + "/MediaIO/systempresets");
    if (!raiz.exists) raiz = new Folder(app.path + "/Contents/MediaIO/systempresets");
    if (!raiz.exists) return null;

    var lista = [];
    subt_buscarEprs(raiz, lista);

    var mejor = null;
    var mejorPuntos = 0;
    for (var i = 0; i < lista.length; i++) {
        var nombre = decodeURI(lista[i].name);
        var carpeta = decodeURI(lista[i].parent.name);
        var puntos = 0;
        if (/57415645/.test(carpeta) || /wav|waveform/i.test(nombre)) puntos = 3;
        else if (/mp3|aac|audio/i.test(nombre)) puntos = 2;
        if (puntos > mejorPuntos) {
            mejor = lista[i];
            mejorPuntos = puntos;
        }
    }
    return mejor;
}

// Carpeta "Subtitulos" junto al proyecto (o en temporales si no está guardado).
function subt_carpeta() {
    var carpeta;
    if (app.project.path) {
        carpeta = new Folder(new File(app.project.path).parent.fsName + "/Subtitulos");
    } else {
        carpeta = new Folder(Folder.temp.fsName + "/Subtitulos");
    }
    if (!carpeta.exists) carpeta.create();
    return carpeta;
}

function subt_nombreBase(seq) {
    return seq.name.replace(/[^\w\-]+/g, "_") + "_" + new Date().getTime();
}

// Plan B sin exportar: lista los clips de las pistas de audio no silenciadas
// con su archivo original y dónde caen en la secuencia.
// Primera línea: ruta del .srt a crear. Luego: archivo, inicio, fin, entrada (segundos).
function subt_clipsAudio() {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return "ERROR|Abre (activa) la secuencia que quieres subtitular.";

        var lineas = [];
        for (var t = 0; t < seq.audioTracks.numTracks; t++) {
            var pista = seq.audioTracks[t];
            if (pista.isMuted && pista.isMuted()) continue;
            for (var c = 0; c < pista.clips.numItems; c++) {
                var clip = pista.clips[c];
                var ruta = clip.projectItem && clip.projectItem.getMediaPath ? clip.projectItem.getMediaPath() : "";
                if (!ruta) continue;
                lineas.push([ruta, clip.start.seconds, clip.end.seconds, clip.inPoint.seconds].join("\t"));
            }
        }
        if (!lineas.length) return "ERROR|No encontré clips de audio en la secuencia.";

        var srt = new File(subt_carpeta().fsName + "/" + subt_nombreBase(seq) + ".srt").fsName;
        return "OK|" + srt + "\n" + lineas.join("\n");
    } catch (e) {
        return "ERROR|" + e.toString();
    }
}

// Tamaño y fotogramas por segundo de la secuencia, y si esta versión de
// Premiere puede crear pistas de subtítulos (2021 en adelante).
function subt_info() {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return "ERROR|Abre (activa) la secuencia que quieres subtitular.";
        var fps = 254016000000 / Number(seq.timebase);
        var subtitulos = typeof seq.createCaptionTrack === "function" ? 1 : 0;
        return "OK|" + [seq.frameSizeHorizontal, seq.frameSizeVertical, fps, subtitulos].join("|");
    } catch (e) {
        return "ERROR|" + e.toString();
    }
}

function subt_exportarAudio(presetManual) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return "ERROR|Abre (activa) la secuencia que quieres subtitular.";

        var preset = presetManual ? new File(presetManual) : subt_buscarPreset();
        if (!preset || !preset.exists) {
            return "ERROR|No encontré un ajuste de exportación de audio. Elige uno (.epr) con el botón 'Elegir preset'.";
        }

        var carpeta = subt_carpeta();
        var base = subt_nombreBase(seq);
        var extension = /wav|waveform|57415645/i.test(preset.fsName) ? ".wav" : ".mp3";
        // fsName deja la ruta con las barras de Windows; Premiere falla con rutas mezcladas.
        var salida = new File(carpeta.fsName + "/" + base + extension).fsName;

        var resultado = seq.exportAsMediaDirect(salida, preset.fsName, app.encoder.ENCODE_ENTIRE);

        // Premiere a veces pone su propia extensión: buscamos lo que haya creado.
        var creados = carpeta.getFiles(base + ".*");
        for (var i = 0; i < creados.length; i++) {
            if (!/\.srt$/i.test(creados[i].name)) return "OK|" + creados[i].fsName;
        }
        return "ERROR|No se pudo exportar el audio (" + resultado + ").";
    } catch (e) {
        return "ERROR|" + e.toString();
    }
}

function subt_elegirPreset() {
    var f = File.openDialog("Elige un ajuste de exportación de audio (.epr)", "*.epr");
    return f ? "OK|" + f.fsName : "ERROR|cancelado";
}

// Importa el .srt (pista de subtítulos) o el .mov transparente (pista de video).
function subt_importar(rutaSrt) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return "ERROR|No hay secuencia activa.";

        var raiz = app.project.rootItem;
        var bin = null;
        for (var i = 0; i < raiz.children.numItems; i++) {
            var hijo = raiz.children[i];
            if (hijo.type === ProjectItemType.BIN && hijo.name === "Subtitulos") bin = hijo;
        }
        if (!bin) bin = raiz.createBin("Subtitulos");

        app.project.importFiles([rutaSrt], true, bin, false);

        var nombre = new File(rutaSrt).name;
        nombre = decodeURI(nombre);
        var item = null;
        for (var j = bin.children.numItems - 1; j >= 0; j--) {
            var c = bin.children[j];
            if (c.name === nombre || c.name === nombre.replace(/\.(srt|mov)$/i, "")) {
                item = c;
                break;
            }
        }
        if (!item) return "ERROR|Importé el .srt pero no lo encuentro en el proyecto.";

        // El .mov (y en Premiere 2020, que no tiene createCaptionTrack, también
        // el .srt) se pone como clip en una pista de video libre.
        if (/\.mov$/i.test(nombre) || typeof seq.createCaptionTrack !== "function") return subt_ponerEnPistaDeVideo(seq, item, nombre);

        var ok;
        if (typeof Sequence !== "undefined" && Sequence.CAPTION_FORMAT_SUBTITLE !== undefined) {
            ok = seq.createCaptionTrack(item, 0, Sequence.CAPTION_FORMAT_SUBTITLE);
        } else {
            ok = seq.createCaptionTrack(item, 0);
        }
        if (ok === false) {
            return "ERROR|El .srt está en la carpeta Subtitulos del proyecto, pero no pude crear la pista. Arrástralo a la secuencia.";
        }
        return "OK|" + nombre;
    } catch (e) {
        return "ERROR|" + e.toString();
    }
}

function subt_pistaVaciaArriba(seq) {
    var pistas = seq.videoTracks;
    var ultimaUsada = -1;
    for (var i = 0; i < pistas.numTracks; i++) {
        if (pistas[i].clips.numItems > 0) ultimaUsada = i;
    }
    return ultimaUsada + 1 < pistas.numTracks ? pistas[ultimaUsada + 1] : null;
}

function subt_ponerEnPistaDeVideo(seq, item, nombre) {
    var pista = subt_pistaVaciaArriba(seq);
    if (!pista) {
        // Intentamos crear una pista de video nueva arriba de todo.
        try {
            app.enableQE();
            qe.project.getActiveSequence().addTracks(1, seq.videoTracks.numTracks, 0);
        } catch (e) { /* sin QE */ }
        pista = subt_pistaVaciaArriba(seq);
    }
    if (!pista) {
        return "ERROR|Agrega una pista de video vacía arriba de todo y arrastra ahí " + nombre + " (está en la carpeta Subtitulos del proyecto).";
    }
    pista.overwriteClip(item, 0);
    return "OK|" + nombre;
}

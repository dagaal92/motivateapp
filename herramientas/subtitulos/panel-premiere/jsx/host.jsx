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

function subt_exportarAudio(presetManual) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return "ERROR|Abre (activa) la secuencia que quieres subtitular.";

        var preset = presetManual ? new File(presetManual) : subt_buscarPreset();
        if (!preset || !preset.exists) {
            return "ERROR|No encontré un ajuste de exportación de audio. Elige uno (.epr) con el botón 'Elegir preset'.";
        }

        var carpeta;
        if (app.project.path) {
            carpeta = new Folder(new File(app.project.path).parent.fsName + "/Subtitulos");
        } else {
            carpeta = new Folder(Folder.temp.fsName + "/Subtitulos");
        }
        if (!carpeta.exists) carpeta.create();

        var base = seq.name.replace(/[^\w\-]+/g, "_") + "_" + new Date().getTime();
        var extension = /wav|waveform|57415645/i.test(preset.fsName) ? ".wav" : ".mp3";
        var salida = carpeta.fsName + "/" + base + extension;

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
            if (c.name === nombre || c.name === nombre.replace(/\.srt$/i, "")) {
                item = c;
                break;
            }
        }
        if (!item) return "ERROR|Importé el .srt pero no lo encuentro en el proyecto.";

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

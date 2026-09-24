/* global __adobe_cep__ */
var nodeRequire = window.cep_node ? window.cep_node.require : require;
var childProcess = nodeRequire("child_process");
var fs = nodeRequire("fs");
var path = nodeRequire("path");

var OPCIONES = ["palabras", "idioma", "modelo", "mayusculas", "sinPuntuacion"];
var $ = function (id) { return document.getElementById(id); };

function log(texto, clase) {
  var linea = document.createElement("div");
  linea.textContent = texto;
  if (clase) linea.className = clase;
  $("log").appendChild(linea);
  $("log").scrollTop = $("log").scrollHeight;
}

function carpetaExtension() {
  var ruta = decodeURI(__adobe_cep__.getSystemPath("extension")).replace(/^file:\/{2,3}/, "");
  if (/^[A-Za-z]:/.test(ruta)) return ruta; // Windows: "C:/..."
  return "/" + ruta.replace(/^\/+/, "");
}

function evalScript(codigo) {
  return new Promise(function (resolve, reject) {
    __adobe_cep__.evalScript(codigo, function (respuesta) {
      var partes = String(respuesta).split("|");
      var estado = partes.shift();
      var dato = partes.join("|");
      if (estado === "OK") resolve(dato);
      else reject(new Error(estado === "ERROR" ? dato : "Premiere respondió: " + respuesta));
    });
  });
}

function comillas(texto) {
  return JSON.stringify(texto.replace(/\\/g, "/"));
}

function leerOpciones() {
  try {
    var guardadas = JSON.parse(localStorage.getItem("opciones") || "{}");
    OPCIONES.forEach(function (id) {
      if (!(id in guardadas)) return;
      if ($(id).type === "checkbox") $(id).checked = guardadas[id];
      else $(id).value = guardadas[id];
    });
  } catch (e) { /* sin opciones guardadas */ }
}

function guardarOpciones() {
  var datos = {};
  OPCIONES.forEach(function (id) {
    datos[id] = $(id).type === "checkbox" ? $(id).checked : $(id).value;
  });
  try { localStorage.setItem("opciones", JSON.stringify(datos)); } catch (e) { /* no pasa nada */ }
}

// Prueba "py" (lanzador de Windows) y si no existe, "python" / "python3".
function ejecutarPython(argumentos, alSalirTexto) {
  var candidatos = [["py", ["-3", "-u"]], ["python", ["-u"]], ["python3", ["-u"]]];
  return new Promise(function (resolve, reject) {
    function intentar(i) {
      if (i >= candidatos.length) {
        reject(new Error("No encuentro Python. Instálalo y vuelve a ejecutar instalar_panel.bat."));
        return;
      }
      var proceso = childProcess.spawn(candidatos[i][0], candidatos[i][1].concat(argumentos), {
        env: Object.assign({}, process.env, { PYTHONIOENCODING: "utf-8" }),
        windowsHide: true,
      });
      var arranco = false;
      var ultimoError = "";
      var noExiste = false;
      function recibir(datos, esError) {
        arranco = true;
        String(datos).split(/\r?\n/).forEach(function (l) {
          if (!l.trim()) return;
          if (esError) ultimoError = l;
          alSalirTexto(l, esError);
        });
      }
      proceso.stdout.on("data", function (d) { recibir(d, false); });
      proceso.stderr.on("data", function (d) { recibir(d, true); });
      proceso.on("error", function (e) {
        if (e.code === "ENOENT" && !arranco) {
          noExiste = true;
          intentar(i + 1);
        }
        else reject(e);
      });
      proceso.on("close", function (codigo) {
        if (noExiste) return;
        if (codigo === 0) resolve();
        else reject(new Error(ultimoError || "Python terminó con error " + codigo));
      });
    }
    intentar(0);
  });
}

function generar() {
  guardarOpciones();
  $("generar").disabled = true;
  $("log").innerHTML = "";
  var rutaAudio = null;
  var preset = "";
  try { preset = localStorage.getItem("preset") || ""; } catch (e) { /* sin preset */ }

  log("1/3 Exportando el audio de la secuencia...");
  evalScript("subt_exportarAudio(" + comillas(preset) + ")")
    .then(function (audio) {
      rutaAudio = audio;
      log("2/3 Transcribiendo (la primera vez descarga el modelo, puede tardar)...");
      var argumentos = [
        path.join(carpetaExtension(), "subtitular.py"),
        audio,
        "--idioma", $("idioma").value,
        "--modelo", $("modelo").value,
        "--palabras", $("palabras").value,
      ];
      if ($("mayusculas").checked) argumentos.push("--mayusculas");
      if ($("sinPuntuacion").checked) argumentos.push("--sin-puntuacion");
      return ejecutarPython(argumentos, function (linea, esError) {
        // Los avisos de las librerías salen por stderr; solo mostramos lo útil.
        if (!esError || /error|traceback/i.test(linea)) log(linea, esError ? "error" : null);
      });
    })
    .then(function () {
      var srt = rutaAudio.replace(/\.[^.\\/]+$/, "") + ".srt";
      if (!fs.existsSync(srt)) throw new Error("No se generó el archivo de subtítulos.");
      log("3/3 Poniendo los subtítulos en la secuencia...");
      return evalScript("subt_importar(" + comillas(srt) + ")");
    })
    .then(function () {
      log("¡Listo! Revisa la nueva pista de subtítulos.", "ok");
      log("Tip: dale estilo a uno y guárdalo como Estilo de pista para aplicarlo a todos.");
    })
    .catch(function (e) {
      log("Error: " + e.message, "error");
    })
    .then(function () {
      if (rutaAudio) { try { fs.unlinkSync(rutaAudio); } catch (e) { /* ya no existe */ } }
      $("generar").disabled = false;
    });
}

function elegirPreset() {
  evalScript("subt_elegirPreset()")
    .then(function (ruta) {
      try { localStorage.setItem("preset", ruta); } catch (e) { /* no pasa nada */ }
      log("Preset guardado: " + ruta, "ok");
    })
    .catch(function () { /* cancelado */ });
}

leerOpciones();
$("generar").addEventListener("click", generar);
$("preset").addEventListener("click", elegirPreset);

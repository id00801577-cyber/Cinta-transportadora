/*
 * app.js - Interfaz de la aplicación de dimensionado de cintas transportadoras.
 *
 * Autor: Alberto Jorge Lorenzo - Transporte y Manutención Industrial (USAL).
 *
 * Lee el formulario, llama al motor de cálculo (calculos.js) y pinta los resultados
 * con el desarrollo paso a paso: fórmula, valores sustituidos, resultado y fuente.
 * Los datos y tablas se cargan de data/datos.json.
 */
(function () {
  'use strict';

  // Si este archivo se ejecuta, los scripts se han cargado: se quita el aviso de index.html
  // que explica qué hacer cuando se abre la página sin sus carpetas (por ejemplo, desde dentro del ZIP).
  var avisoCarga = document.getElementById('avisoCarga');
  if (avisoCarga) avisoCarga.parentNode.removeChild(avisoCarga);

  var datos = null;
  var C = window.Calculos;
  var $ = function (id) { return document.getElementById(id); };

  /* ------------------------------------------------------------------ *
   * Formato de números (coma decimal, espacio fino en miles >= 10 000)  *
   * ------------------------------------------------------------------ */
  function fmt(x, d) {
    if (typeof x !== 'number' || !isFinite(x)) return '-';
    var s = Math.abs(x).toFixed(d);
    var partes = s.split('.');
    var ent = partes[0];
    if (ent.length >= 5) ent = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    var neg = x < 0 && Number(s) !== 0 ? '−' : '';
    return neg + ent + (partes[1] ? ',' + partes[1] : '');
  }
  // Número "tal cual" (datos de entrada): hasta 4 decimales sin ceros sobrantes.
  function fmtN(x) {
    if (typeof x !== 'number' || !isFinite(x)) return '-';
    var d = Math.abs(x - Math.round(x)) < 1e-9 ? 0 : 4;
    var s = fmt(x, d);
    if (d > 0) s = s.replace(/0+$/, '').replace(/,$/, '');
    return s;
  }
  function u(x, d, unidad) { return fmt(x, d) + (unidad ? ' ' + unidad : ''); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ------------------------------------------------------------------ *
   * Carga de datos: data/datos.json, con copia de respaldo para abrir   *
   * la app con doble clic (los navegadores bloquean fetch en file://).  *
   * ------------------------------------------------------------------ */
  function cargarDatos() {
    var respaldo = { datos: window.DATOS_RESPALDO, origen: 'js/datos-respaldo.js (copia de data/datos.json para abrir la app sin servidor)' };
    // Abierta con doble clic (file://), los navegadores no dejan usar fetch: se usa directamente la copia.
    if (location.protocol === 'file:' && window.DATOS_RESPALDO) return Promise.resolve(respaldo);
    return fetch('data/datos.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { return { datos: j, origen: 'data/datos.json' }; })
      .catch(function () {
        if (window.DATOS_RESPALDO) return respaldo;
        throw new Error('No se han podido cargar los datos.');
      });
  }

  /* ------------------------------------------------------------------ *
   * Formulario                                                           *
   * ------------------------------------------------------------------ */
  function opcion(valor, texto) { var o = document.createElement('option'); o.value = valor; o.textContent = texto; return o; }

  function rellenarSelects() {
    var s = $('selEjemplo');
    datos.ejemplos.forEach(function (e) { s.appendChild(opcion(e.id, e.titulo)); });

    var m = $('selMaterial');
    m.appendChild(opcion('otro', 'Otro (introducir los datos a mano)'));
    datos.materiales.lista.forEach(function (mat, i) {
      var dens = mat.densidadMin === mat.densidadMax ? fmtN(mat.densidadMin) : fmtN(mat.densidadMin) + '-' + fmtN(mat.densidadMax);
      m.appendChild(opcion(String(i), mat.nombre + ' (' + dens + ' t/m³)'));
    });

    var f = $('selF');
    datos.coeficienteF.opciones.forEach(function (o) { f.appendChild(opcion(String(o.f), o.texto + ': f = ' + fmtN(o.f))); });
    f.appendChild(opcion('otro', 'Otro valor'));

    var mu = $('selMu');
    var cm = datos.coeficienteMu;
    cm.condiciones.forEach(function (cond, i) {
      var g = document.createElement('optgroup'); g.label = cond.condicion;
      cm.superficies.forEach(function (sup, j) {
        var r = cond.rangos[j];
        var txt = sup + ': ' + (r[0] === r[1] ? fmtN(r[0]) : fmtN(r[0]) + '-' + fmtN(r[1]) + ' (se toma ' + fmtN(r[0]) + ')');
        var o = opcion(i + '-' + j, txt); o.dataset.mu = r[0]; g.appendChild(o);
      });
      mu.appendChild(g);
    });
    mu.appendChild(opcion('otro', 'Otro valor'));

    var R = $('selR');
    datos.tejidosEP.R.forEach(function (r) { R.appendChild(opcion(String(r), 'EP ' + r + ' (' + r + ' N/mm por capa)')); });
    R.appendChild(opcion('otro', 'Otro valor'));

    var dl = $('listaDiametros');
    datos.diametrosTambor.valores.forEach(function (d) { dl.appendChild(opcion(String(d), d + ' mm (DIN 22101)')); });
  }

  // Opciones de ancho y velocidad: "automático" en modo diseño; en comprobación hay que elegirlos.
  function rellenarBV(modo) {
    var b = $('selB'), v = $('selV');
    var bAnt = b.value, vAnt = v.value;
    b.innerHTML = ''; v.innerHTML = '';
    b.appendChild(modo === 'diseno' ? opcion('auto', 'Automático (el menor que cumple)') : opcion('', 'Elige el ancho'));
    datos.anchosVelocidades.filas.forEach(function (fl) { b.appendChild(opcion(String(fl.B), fl.B + ' mm')); });
    v.appendChild(modo === 'diseno' ? opcion('auto', 'Automática (DIN 22101)') : opcion('', 'Elige la velocidad'));
    datos.velocidadesNormalizadas.valores.forEach(function (x) { v.appendChild(opcion(String(x), fmtN(x) + ' m/s')); });
    v.appendChild(opcion('otra', 'Otra'));
    if (Array.prototype.some.call(b.options, function (o) { return o.value === bAnt; })) b.value = bAnt;
    if (Array.prototype.some.call(v.options, function (o) { return o.value === vAnt; })) v.value = vAnt;
  }

  // Lectura de números: admite coma o punto decimal. Vacío o texto no válido -> NaN.
  // Un número con punto de miles como «1.500» (¿1500 o 1,5?) tampoco se interpreta (versión 3.0):
  // se guarda en "ambiguos" para explicar en el error cómo escribirlo.
  var ambiguos = {};
  function vacio(id) { return String($(id).value || '').trim() === ''; }
  function valor(id) {
    var r = C.leerNumero($(id).value);
    if (r.ambiguo) ambiguos[id] = r;
    return r.valor;
  }
  // Nombre del campo para los mensajes: su etiqueta sin la unidad.
  function nombreCampo(el) {
    var caja = el.closest ? el.closest('.campo') : null;
    var etq = caja ? caja.querySelector('label') : null;
    if (!etq) return el.getAttribute('aria-label') || '';
    var copia = etq.cloneNode(true);
    Array.prototype.forEach.call(copia.querySelectorAll('.ud'), function (s) { s.parentNode.removeChild(s); });
    return copia.textContent.replace(/\s+/g, ' ').trim();
  }
  function mensajeAmbiguo(el, r) {
    var n = nombreCampo(el), q = '«' + r.texto + '»';
    var m = r.comoDecimal !== null ? q + ' puede ser ' + r.comoMiles + ' o ' + r.comoDecimal + '; escribe los miles sin punto y los decimales con coma.'
          : r.comoMiles !== null ? 'escribe ' + q + ' sin punto de miles: ' + r.comoMiles + '.'
          : q + ' no es un número válido; escribe los miles sin separador y los decimales con coma.';
    return (n ? n + ': ' : '') + m;
  }
  // Como valor(), pero marca en rojo el campo si tiene un texto que no es un número.
  function num(id) {
    var x = valor(id);
    if (!vacio(id) && isNaN(x)) $(id).setAttribute('aria-invalid', 'true');
    return x;
  }
  // Campo opcional: vacío = 0; texto no válido = NaN (el motor de cálculo lo rechaza).
  function numO0(id) { return vacio(id) ? 0 : num(id); }
  // Campo opcional sin valor por defecto: vacío = null (sin dato); texto no válido = NaN.
  function numONull(id) { return vacio(id) ? null : num(id); }
  function modoActual() { return document.querySelector('input[name="modo"]:checked').value; }

  function leerFormulario() {
    var modo = modoActual();
    var selMat = $('selMaterial').value;
    var mat = selMat !== 'otro' && selMat !== '' ? datos.materiales.lista[Number(selMat)] : null;
    var rod = Number($('rodillos').value);
    var selV = $('selV').value;
    var selMu = $('selMu');
    var muOpt = selMu.options[selMu.selectedIndex];
    return {
      modo: modo,
      Q: num('Q'), L: num('L'), H: num('H'),
      material: {
        nombre: mat ? mat.nombre : 'Material introducido a mano',
        densidad: num('densidad'), reposo: numONull('reposo'), abrasividad: $('abrasividad').value || null,
        beta: $('betaModo').value === 'auto' ? 'auto' : num('beta'),
        clase: $('clase').value, tamMax: num('tamMax'), granulometria: $('granulometria').value
      },
      rodillos: rod, lambda: rod === 1 ? 0 : num('lambda'), metodoCapacidad: $('metodoCapacidad').value,
      l3Manual: rod === 3 && $('l3Modo').value === 'manual' ? num('l3') : null,
      B: $('selB').value === 'auto' ? null : $('selB').value === '' ? NaN : Number($('selB').value),
      v: selV === 'auto' ? null : selV === 'otra' ? num('vOtra') : selV === '' ? NaN : Number(selV),
      qG: num('qG'),
      qb: num('qb'), modoRodillos: $('modoRodillos').value, qRO: num('qRO'), qRU: num('qRU'), mRO: num('mRO'), mRU: num('mRU'),
      lSup: num('lSup'), lInf: num('lInf'),
      f: $('selF').value === 'otro' ? num('fOtro') : Number($('selF').value),
      metodoResistencias: $('metodoResistencias').value, tablaC: $('tablaC').value, C: $('tablaC').value === 'manual' ? num('C') : null,
      v0: numO0('v0'), FNtamb: numO0('FNtamb'), FS1: numO0('FS1'), FS2: numO0('FS2'),
      eta: num('eta'), D: num('D'),
      FuManual: $('chkFu').checked ? num('FuManual') : null,
      mu: selMu.value === 'otro' ? num('muOtro') : Number(muOpt.dataset.mu),
      theta: num('theta'), margenAdh: numO0('margenAdh'), hrelMax: num('hrelMax'),
      T2manual: $('T2modo').value === 'manual' ? num('T2') : null,
      TlocalSup: $('chkLocales').checked ? num('TlocalSup') : null,
      TlocalInf: $('chkLocales').checked ? num('TlocalInf') : null,
      R: $('selR').value === 'otro' ? num('ROtro') : Number($('selR').value),
      zMin: num('zMin'), zManual: $('zModo').value === 'manual' ? num('z') : null
    };
  }

  function poner(id, x) { $(id).value = x === null || x === undefined || (typeof x === 'number' && !isFinite(x)) ? '' : String(x).replace('.', ','); }
  function ponerSelectValor(selId, otroId, valor) {
    var s = $(selId);
    var hay = Array.prototype.some.call(s.options, function (o) { return o.value === String(valor); });
    if (hay) { s.value = String(valor); poner(otroId, ''); }
    else { s.value = 'otro'; poner(otroId, valor); }
  }

  function cargarEjemplo(id) {
    var ej = datos.ejemplos.filter(function (e) { return e.id === id; })[0];
    if (!ej) return;
    var e = ej.entrada;
    document.querySelector('input[name="modo"][value="' + e.modo + '"]').checked = true;
    rellenarBV(e.modo);
    var m = e.material || {};
    var idx = -1;
    datos.materiales.lista.forEach(function (mt, i) { if (mt.nombre === m.nombre) idx = i; });
    $('selMaterial').value = idx >= 0 ? String(idx) : 'otro';
    poner('densidad', m.densidad); poner('reposo', m.reposo); $('abrasividad').value = m.abrasividad || '';
    $('betaModo').value = m.beta === 'auto' || m.beta === undefined ? 'auto' : 'manual'; poner('beta', m.beta === 'auto' ? '' : m.beta);
    $('clase').value = m.clase || 'auto'; poner('tamMax', m.tamMax); $('granulometria').value = m.granulometria || 'uniforme';
    poner('Q', e.Q); poner('L', e.L); poner('H', e.H);
    $('rodillos').value = String(e.rodillos || 3); poner('lambda', e.lambda);
    $('metodoCapacidad').value = e.metodoCapacidad || 'masico';
    $('l3Modo').value = e.l3Manual ? 'manual' : 'auto'; poner('l3', e.l3Manual);
    $('selB').value = e.B ? String(e.B) : (e.modo === 'diseno' ? 'auto' : '');
    if (e.v === null || e.v === undefined) { $('selV').value = 'auto'; poner('vOtra', ''); }
    else if (datos.velocidadesNormalizadas.valores.indexOf(e.v) >= 0) { $('selV').value = String(e.v); poner('vOtra', ''); }
    else { $('selV').value = 'otra'; poner('vOtra', e.v); }
    poner('qG', e.qG);
    poner('qb', e.qb); $('modoRodillos').value = e.modoRodillos || 'porMetro';
    poner('qRO', e.qRO); poner('qRU', e.qRU); poner('mRO', e.mRO); poner('mRU', e.mRU); poner('lSup', e.lSup); poner('lInf', e.lInf);
    ponerSelectValor('selF', 'fOtro', e.f);
    $('metodoResistencias').value = e.metodoResistencias || 'auto'; $('tablaC').value = e.tablaC || 'DIN'; poner('C', e.C);
    poner('v0', e.v0); poner('FNtamb', e.FNtamb); poner('FS1', e.FS1); poner('FS2', e.FS2);
    poner('eta', e.eta); poner('D', e.D);
    $('chkFu').checked = e.FuManual !== null && e.FuManual !== undefined; poner('FuManual', e.FuManual);
    // mu: si el ejemplo indica la opción de la tabla se usa; si no, valor a mano
    if (ej.ui && ej.ui.mu) { $('selMu').value = ej.ui.mu; poner('muOtro', ''); }
    else { $('selMu').value = 'otro'; poner('muOtro', e.mu); }
    poner('theta', e.theta); poner('hrelMax', e.hrelMax);
    $('T2modo').value = e.T2manual ? 'manual' : 'auto'; poner('T2', e.T2manual); poner('margenAdh', e.margenAdh);
    $('chkLocales').checked = !!(e.TlocalSup || e.TlocalInf); poner('TlocalSup', e.TlocalSup); poner('TlocalInf', e.TlocalInf);
    ponerSelectValor('selR', 'ROtro', e.R);
    poner('zMin', e.zMin); $('zModo').value = e.zManual ? 'manual' : 'auto'; poner('z', e.zManual);
    $('notaEjemplo').innerHTML = '<strong>' + esc(ej.titulo) + '.</strong> ' + esc(ej.nota) + ' <em>Fuente: ' + esc(ej.fuente) + '</em>';
    estadoSecciones = {};                      // al cargar un ejemplo, secciones en su estado por defecto
    $('desarrollo').innerHTML = '';
    actualizarVisibilidad();
    recalcular();
  }

  // Muestra u oculta campos según el modo y las opciones elegidas.
  function actualizarVisibilidad() {
    var b = document.body.classList;
    var modo = modoActual();
    b.toggle('modo-diseno', modo === 'diseno'); b.toggle('modo-comprobacion', modo === 'comprobacion');
    var rod = Number($('rodillos').value);
    b.toggle('no-tres', rod !== 3);
    $('lambda').disabled = rod === 1;
    b.toggle('rod-por-metro', $('modoRodillos').value === 'porMetro');
    b.toggle('rod-por-estacion', $('modoRodillos').value === 'porEstacion');
    var L = valor('L');
    var met = $('metodoResistencias').value;
    var efectivo = met === 'auto' ? (L > 80 ? 'simplificado' : 'global') : met;
    b.toggle('res-global', efectivo === 'global'); b.toggle('res-simplificado', efectivo === 'simplificado');
    b.toggle('t2-manual', $('T2modo').value === 'manual');
    b.toggle('sin-locales', !$('chkLocales').checked);
    b.toggle('sin-fu', !$('chkFu').checked);
    $('beta').hidden = $('betaModo').value !== 'manual';
    $('vOtra').hidden = $('selV').value !== 'otra';
    $('l3').hidden = $('l3Modo').value !== 'manual';
    $('fOtro').hidden = $('selF').value !== 'otro';
    $('C').hidden = $('tablaC').value !== 'manual';
    $('muOtro').hidden = $('selMu').value !== 'otro';
    $('T2').hidden = $('T2modo').value !== 'manual';
    $('ROtro').hidden = $('selR').value !== 'otro';
    $('z').hidden = $('zModo').value !== 'manual';
  }

  /* ------------------------------------------------------------------ *
   * Ayudas junto a los campos                                            *
   * ------------------------------------------------------------------ */
  function actualizarAyudas(R) {
    var selMat = $('selMaterial').value;
    var mat = selMat !== 'otro' && selMat !== '' ? datos.materiales.lista[Number(selMat)] : null;
    $('ayudaDensidad').textContent = mat ? 'Tabla: ' + (mat.densidadMin === mat.densidadMax ? fmtN(mat.densidadMin) : fmtN(mat.densidadMin) + '-' + fmtN(mat.densidadMax)) + ' t/m³ (se propone la media).' : '';
    var reposo = valor('reposo');
    if (isFinite(reposo)) {
      var sb = C.sugerirBeta(reposo, datos);
      $('ayudaBeta').textContent = 'Reposo ' + fmtN(reposo) + '° → fluidez ' + sb.fila.fluidez.toLowerCase() + ' → β = ' + sb.beta + '° (tabla: ' + sb.fila.texto + ').';
    } else $('ayudaBeta').textContent = $('betaModo').value === 'auto' ? 'Sin ángulo de reposo: indica β a mano.' : '';
    var dens = valor('densidad');
    if (isFinite(dens)) {
      var sc = C.sugerirClase(dens, $('abrasividad').value || null);
      $('ayudaClase').textContent = 'Por densidad: ' + sc.porDensidad + (sc.porAbrasion ? '; por abrasividad: ' + sc.porAbrasion : '') + ' → se propone ' + sc.clase + '.';
    } else $('ayudaClase').textContent = '';
    var B = R && R.capacidad && R.capacidad.B ? R.capacidad.B : Number($('selB').value) || null;
    var o = datos.orientativos;
    if (B) {
      var fb = o.pesoBanda.filas.filter(function (f) { return f.B === B; })[0] || (B > 2000 ? o.pesoBanda.filas[o.pesoBanda.filas.length - 1] : null);
      $('ayudaQb').textContent = fb ? 'Orientativo para B = ' + B + ' mm (Rotrans, tabla B): ' + fmtN(fb.qb) + ' kg/m.' : '';
      var fs = o.separacionEstaciones.filas.filter(function (f) { return f.B === B; })[0] || (B > 2000 ? o.separacionEstaciones.filas[o.separacionEstaciones.filas.length - 1] : null);
      var pesado = !(dens <= o.separacionEstaciones.limitePesoEspecifico);
      $('ayudaSeparacion').textContent = fs ? 'Orientativo para B = ' + B + ' mm (Rotrans, tabla A): superiores ' + fmt(pesado ? fs.supPesado : fs.supLigero, 2) + ' m' + (isFinite(dens) ? ' (ρ ' + (pesado ? '>' : '≤') + ' 0,6 t/m³)' : '') + ', inferiores ' + fmt(fs.inf, 2) + ' m.' : '';
    } else { $('ayudaQb').textContent = ''; $('ayudaSeparacion').textContent = ''; }
  }

  /* ------------------------------------------------------------------ *
   * Resultados                                                           *
   * ------------------------------------------------------------------ */
  function cifra(etiqueta, valor, extra) {
    return '<div class="cifra"><div class="cifra__etiqueta">' + etiqueta + '</div><div class="cifra__valor">' + valor + '</div>' + (extra ? '<div class="cifra__extra">' + extra + '</div>' : '') + '</div>';
  }
  function paso(titulo, formula, sustitucion, resultado, fuente, destacado) {
    return '<div class="paso' + (destacado ? ' paso--destacado' : '') + '"><div class="paso__titulo">' + titulo + '</div><div class="paso__resultado">' + (resultado || '') + '</div>' +
      (formula ? '<div class="paso__formula">' + formula + '</div>' : '') + (sustitucion ? '<div class="paso__sustitucion">' + sustitucion + '</div>' : '') +
      (fuente ? '<div class="paso__fuente">' + fuente + '</div>' : '') + '</div>';
  }
  // Secciones plegables del desarrollo. Se recuerda cuáles ha abierto o cerrado el usuario
  // para que no cambien al recalcular; el estado por defecto solo se usa al cargar un ejemplo.
  var estadoSecciones = {};
  function seccion(titulo, html, abierta) {
    var abierto = Object.prototype.hasOwnProperty.call(estadoSecciones, titulo) ? estadoSecciones[titulo] : abierta;
    return '<details class="tarjeta seccion-desarrollo" data-seccion="' + esc(titulo) + '"' + (abierto ? ' open' : '') + '><summary>' + titulo + '</summary><div class="contenido">' + html + '</div></details>';
  }
  function guardarEstadoSecciones() {
    Array.prototype.forEach.call(document.querySelectorAll('#desarrollo details[data-seccion]'), function (d) {
      estadoSecciones[d.getAttribute('data-seccion')] = d.open;
    });
  }
  function g() { return fmtN(C.G); }

  function pintar(R, e) {
    var errores = $('errores'), resumen = $('resumen'), comp = $('comprobaciones'), avisos = $('avisos'), des = $('desarrollo');
    guardarEstadoSecciones();
    if (R.errores.length) {
      // Cada error lleva al campo que hay que corregir
      errores.innerHTML = '<div class="mensajes mensajes--error" role="alert"><strong>Faltan datos o hay valores no válidos:</strong><ul>' + R.errores.map(function (er) {
        return '<li>' + (er.campo ? '<button type="button" class="enlace-error" data-campo="' + esc(er.campo) + '">' + esc(er.texto) + '</button>' : esc(er.texto)) + '</li>';
      }).join('') + '</ul></div>';
    } else errores.innerHTML = '';
    avisos.innerHTML = R.avisos.length ? '<div class="mensajes mensajes--aviso"><strong>Avisos:</strong><ul>' + R.avisos.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' : '';
    // Con errores de datos no se muestran resultados parciales: primero hay que corregir los datos.
    if (R.errores.length) { resumen.innerHTML = ''; comp.innerHTML = ''; des.innerHTML = ''; return; }

    // Resumen
    var c = R.capacidad || {}, a = R.accionamiento, t = R.tensiones, b = R.banda;
    var h = '';
    if (c.B) h += cifra('Ancho de banda B', u(c.B, 0, 'mm'), c.modo === 'diseno' ? (c.Bauto ? 'elegido por la app' : 'fijado a mano') : 'dato');
    if (c.v) h += cifra('Velocidad v', u(c.v, 2, 'm/s'), c.modo === 'diseno' ? (c.vauto ? 'normalizada DIN 22101' : 'fijada a mano') : 'dato');
    if (c.modo === 'diseno' && isFinite(c.Qmax)) h += cifra('Capacidad máxima', u(c.Qmax, 1, 't/h'), 'llenado ' + u(c.llenado * 100, 1, '%'));
    else if (isFinite(c.Q)) h += cifra('Capacidad', u(c.Q, 1, 't/h'), 'Q = 3,6·qG·v');
    if (isFinite(c.qG)) h += cifra('Material por metro qG', u(c.qG, 2, 'kg/m'));
    if (isFinite(R.Fu)) h += cifra('Fuerza periférica Fu', u(R.Fu, 2, 'N'), R.FuEsManual ? 'introducida a mano' : 'resistencias al avance');
    if (a && !a.frenado) h += cifra('Potencia del motor', u(a.Pmotor / 1000, 2, 'kW'), 'Pu = ' + u(a.Pu / 1000, 2, 'kW') + ', η = ' + fmtN(a.eta));
    if (a && a.frenado) h += cifra('Potencia que entrega la cinta', u(-a.Pu / 1000, 2, 'kW'), 'Fu &lt; 0: necesita freno (no se dimensiona)');
    if (a) h += cifra(a.frenado ? 'Par de frenado y giro' : 'Par y giro del tambor', u(Math.abs(a.M), 2, 'N·m'), u(a.n, 1, 'rpm'));
    if (t) h += cifra('Tensión T1 (ramal tenso)', u(t.T1, 0, 'N'), 'T1/T2 = ' + fmt(t.relacion, 3) + ' (límite ' + fmt(t.k, 3) + ')');
    if (t) h += cifra('Tensión T2 (ramal flojo)', u(t.T2, 0, 'N'), t.T2esManual ? 'fijada a mano' : 'adherencia y flecha');
    if (b) h += cifra('Banda', b.z + ' capas EP ' + fmtN(b.R), 'Tadm = ' + u(b.Tadm, 0, 'N') + ' (S = ' + b.S + ')');
    resumen.innerHTML = h ? '<div class="tarjeta"><h2>Resultado</h2><div class="resumen-cifras">' + h + '</div></div>' : '';

    // Comprobaciones
    var lista = R.comprobaciones || [];
    comp.innerHTML = lista.length ? '<div class="tarjeta"><h2>Comprobaciones</h2><ul class="lista-comprobaciones">' + lista.map(function (k) {
      return '<li class="' + (k.ok ? 'ok' : 'mal') + '"><span class="icono" aria-hidden="true">' + (k.ok ? '✓' : '✗') + '</span><span>' + k.texto + ': ' + (k.ok ? 'cumple' : 'no cumple') + ' <span class="cumple-detalle">(' + detalleComprobacion(k, e) + ')</span></span></li>';
    }).join('') + '</ul></div>' : '';

    // Desarrollo
    des.innerHTML = desarrollo(R, e);
  }

  function detalleComprobacion(k, e) {
    var d = k.detalle;
    switch (k.id) {
      case 'capacidad': return 'Qmáx = ' + u(d.Qmax, 1, 't/h') + (k.ok ? ' ≥ ' : ' < ') + 'Q = ' + u(d.Q, 1, 't/h');
      case 'velocidad': return 'v = ' + u(d.v, 2, 'm/s') + (k.ok ? ' ≤ ' : ' > ') + 'vmáx = ' + u(d.vmax, 2, 'm/s');
      case 'terron': return 'B = ' + u(d.B, 0, 'mm') + (k.ok ? ' ≥ ' : ' < ') + u(d.Bmin, 0, 'mm');
      case 'adherencia': return 'T1/T2 = ' + fmt(d.relacion, 4) + (k.ok ? ' ≤ ' : ' > ') + 'e^μθ = ' + fmt(d.k, 4);
      case 'flechaSup': case 'flechaInf': return 'h/l = ' + u(d.hrel * 100, 3, '%') + (k.ok ? ' ≤ ' : ' > ') + u(e.hrelMax, 2, '%');
      case 'rotura': return 'T1 = ' + u(d.T1, 2, 'N') + (k.ok ? ' ≤ ' : ' > ') + 'Tadm = ' + u(d.Tadm, 2, 'N');
    }
    return '';
  }

  function desarrollo(R, e) {
    var out = '', h, c = R.capacidad || {}, tr = R.trazado;
    // 0. Datos de partida
    h = '<div class="tabla-envoltorio"><table class="tabla"><tbody>';
    var filas = [];
    if (e.modo === 'diseno') {
      var m = e.material;
      filas.push(['Material', esc(m.nombre)], ['Densidad aparente ρ', u(m.densidad, 3, 't/m³')],
        ['Tamaño máximo / granulometría', u(m.tamMax, 0, 'mm') + ' / ' + { uniforme: 'uniforme', mezcla: '10 % gruesos', gruesos: '100 % gruesos' }[m.granulometria]],
        ['Capacidad pedida Q', u(e.Q, 1, 't/h')], ['Estación', e.rodillos + ' rodillo(s)' + (e.rodillos > 1 ? ', λ = ' + fmtN(e.lambda) + '°' : '')],
        ['Método de capacidad', e.metodoCapacidad === 'volumetrico' ? 'volumétrico (tablas Rulmeca)' : 'flujo másico (fórmulas)']);
    } else filas.push(['Ancho B / velocidad v', u(e.B, 0, 'mm') + ' / ' + u(e.v, 2, 'm/s')], ['Masa de material qG', u(e.qG, 2, 'kg/m')]);
    filas.push(['Longitud L / desnivel H', u(e.L, 2, 'm') + ' / ' + u(e.H, 2, 'm')], ['Masa de la banda qb', u(e.qb, 2, 'kg/m')],
      ['Rodillos', e.modoRodillos === 'porEstacion' ? 'masas por estación ' + fmtN(e.mRO) + ' kg / ' + fmtN(e.mRU) + ' kg' : 'qRO = ' + fmtN(e.qRO) + ' kg/m, qRU = ' + fmtN(e.qRU) + ' kg/m'],
      ['Separación de rodillos', fmtN(e.lSup) + ' m (sup.) / ' + fmtN(e.lInf) + ' m (inf.)'], ['Coeficiente f', fmtN(e.f)],
      ['Resistencias localizadas', 'v0 = ' + fmtN(e.v0) + ' m/s, FN = ' + fmtN(e.FNtamb) + ' N, FS1 = ' + fmtN(e.FS1) + ' N, FS2 = ' + fmtN(e.FS2) + ' N'],
      ['Accionamiento', 'η = ' + fmtN(e.eta) + ', D = ' + fmtN(e.D) + ' mm'], ['Tambor motriz', 'μ = ' + fmtN(e.mu) + ', θ = ' + fmtN(e.theta) + '°'],
      ['Flecha máxima', fmtN(e.hrelMax) + ' %'], ['Tejido', 'R = ' + fmtN(e.R) + ' N/mm por capa, mínimo ' + fmtN(e.zMin) + ' capas']);
    h += filas.map(function (f) { return '<tr><td>' + f[0] + '</td><td>' + f[1] + '</td></tr>'; }).join('') + '</tbody></table></div>';
    out += seccion('0. Datos de partida', h, false);
    if (!tr) return out;

    // 1. Trazado
    h = paso('Inclinación', 'δ = arcsen(H / L)', 'δ = arcsen(' + fmtN(e.H) + ' / ' + fmtN(e.L) + ')', u(tr.deltaGrados, 2, '°'), 'T1_6, ejemplos 7 y 8');
    var ki = tr.Kinfo.interp, formulaK, sustK;
    if (tr.Kinfo.fuera) { formulaK = 'Tabla 1.1'; sustK = '|δ| = ' + fmt(Math.abs(tr.deltaGrados), 2) + '° > 20°: fuera de tabla, se toma el valor extremo'; }
    else if (ki && !ki.exacto) {
      formulaK = 'K = K1 + (K2 − K1)·(δ − δ1)/(δ2 − δ1)';
      sustK = 'K = ' + fmtN(ki.y1) + ' + (' + fmtN(ki.y2) + ' − ' + fmtN(ki.y1) + ')·(' + fmt(Math.abs(tr.deltaGrados), 3) + ' − ' + ki.x1 + ')/(' + ki.x2 + ' − ' + ki.x1 + ')';
    } else { formulaK = 'Tabla 1.1'; sustK = Math.abs(tr.deltaGrados) <= 2 ? 'δ ≤ 2° → K = 1' : 'Valor de la tabla para δ = ' + fmt(Math.abs(tr.deltaGrados), 2) + '°'; }
    h += paso('Factor de inclinación K', formulaK, sustK, fmt(tr.K, 4), 'T1_6, tabla 1.1 e interpolación lineal (ejercicio 13)');
    out += seccion('1. Trazado', h, true);

    // 2-3. Material y capacidad (modo diseño)
    if (c.modo === 'diseno' && c.anchoMinimo) {
      var am = c.anchoMinimo;
      h = '';
      if (c.betaInfo) h += paso('Ángulo de sobrecarga β', 'Tabla de fluidez a partir del ángulo de reposo', 'Reposo ' + fmtN(e.material.reposo) + '° → fluidez ' + c.betaInfo.fila.fluidez.toLowerCase() + ' (' + c.betaInfo.fila.texto + ')', u(c.beta, 0, '°'), 'T1_4.1, figura 7');
      else h += paso('Ángulo de sobrecarga β', '', 'Introducido a mano', u(c.beta, 1, '°'), '');
      if (c.claseInfo) h += paso('Clase de material', 'La más exigente entre densidad y abrasividad', 'ρ = ' + fmtN(c.densidad) + ' t/m³ → ' + c.claseInfo.porDensidad + (c.claseInfo.porAbrasion ? '; abrasividad → ' + c.claseInfo.porAbrasion : ''), c.clase, 'T1_6, tabla 1.3 (definición de las clases A-D)');
      else h += paso('Clase de material', '', 'Elegida a mano', c.clase, 'T1_6, tabla 1.3');
      h += paso('Ancho mínimo por tamaño máximo (tabla 1.3)', 'Primer ancho con tamaño máximo ' + (am.columna === 'tamMaxMixto' ? 'mixto' : 'uniforme') + ' ≥ ' + fmtN(e.material.tamMax) + ' mm', '', am.B13 !== null ? u(am.B13, 0, 'mm') : 'ninguno', 'T1_6, tabla 1.3');
      if (am.factor !== null) h += paso('Ancho mínimo por terrones (tabla 1.2)', 'B ≥ factor · tamaño máximo', 'B ≥ ' + am.factor + ' · ' + fmtN(e.material.tamMax) + ' = ' + fmtN(am.Bnecesario12) + ' mm → ancho normalizado', am.B12 !== null ? u(am.B12, 0, 'mm') : 'ninguno', 'T1_6, tabla 1.2; T1_4.1, ejemplo 1');
      h += paso('Ancho mínimo', 'Bmín = máx(tabla 1.3, tabla 1.2)', '', u(am.Bmin, 0, 'mm'), '', true);
      out += seccion('2. Material', h, true);

      // Capacidad
      var el = c.elegido;
      h = '<p class="ayuda">Para cada ancho se calcula la capacidad por cada m/s, c1, la velocidad necesaria v = Q / c1 y la menor velocidad DIN que la cubre. Se elige el ' +
        (!c.Bauto ? 'ancho fijado a mano.' : c.vauto ? 'menor ancho que cumple sin pasar de la velocidad máxima del material.' :
          'menor ancho que alcanza Q con la velocidad fijada a mano (' + u(c.v, 2, 'm/s') + ') sin pasar de su velocidad máxima.') + '</p>';
      h += tablaCandidatos(c);
      if (c.metodo === 'masico') {
        var Bm = c.B / 1000, l3 = el.l3 / 1000;
        h += paso('Anchura útil b', c.B <= 2000 ? 'b = 0,9·B − 0,05' : 'b = B − 0,2', c.B <= 2000 ? 'b = 0,9·' + fmtN(Bm) + ' − 0,05' : 'b = ' + fmtN(Bm) + ' − 0,2', u(el.b, 3, 'm'), 'T1_6, cap. 1');
        h += paso('Rodillo central l3', e.rodillos === 3 ? (e.l3Manual ? 'Introducido a mano' : 'Figura 1.1 (3 rodillos)') : 'Con 1 o 2 rodillos l3 = 0', '', u(el.l3, 0, 'mm'), 'T1_6, figura 1.1');
        h += paso('Sección superior S1', 'S1 = [l3 + (b − l3)·cos λ]²·tg β / 6',
          'S1 = [' + fmtN(l3) + ' + (' + fmt(el.b, 3) + ' − ' + fmtN(l3) + ')·cos ' + fmtN(c.lambda) + '°]²·tg ' + fmtN(c.beta) + '° / 6', u(el.S1, 6, 'm²'), 'T1_6, ec. 1.1');
        h += paso('Sección inferior S2', 'S2 = [l3 + (b − l3)/2·cos λ]·[(b − l3)/2·sen λ]',
          'S2 = [' + fmtN(l3) + ' + (' + fmt(el.b, 3) + ' − ' + fmtN(l3) + ')/2·cos ' + fmtN(c.lambda) + '°]·[(' + fmt(el.b, 3) + ' − ' + fmtN(l3) + ')/2·sen ' + fmtN(c.lambda) + '°]',
          u(el.S2, 6, 'm²'), 'T1_6, ec. 1.1, con cos λ como ISO 5048 y los ejemplos de T1_4.1 (ver Readme)');
        h += paso('Sección total S', 'S = S1 + S2', 'S = ' + fmt(el.S1, 6) + ' + ' + fmt(el.S2, 6), u(el.S, 6, 'm²'), '', true);
        h += paso('Capacidad máxima', 'Qmáx = 3600·S·v·ρ·K', 'Qmáx = 3600·' + fmt(el.S, 6) + '·' + fmtN(c.v) + '·' + fmtN(c.densidad) + '·' + fmt(c.K, 4), u(c.Qmax, 1, 't/h'), 'T1_6, ec. 1.2; ejercicio 13', true);
        h += figuraSeccion(c, el);
      } else {
        var iv = el.ivtInfo.interp;
        var fueraIVT = el.ivtInfo.fuera;
        h += paso('Caudal volumétrico a 1 m/s (IVT)', fueraIVT || iv.exacto ? 'Tabla Rulmeca' : 'Interpolación en β entre ' + iv.x1 + '° y ' + iv.x2 + '°',
          fueraIVT ? 'β = ' + fmtN(c.beta) + '° fuera de la tabla (5-30°): se toma el valor extremo' :
          iv.exacto ? '' : 'IVT = ' + fmtN(iv.y1) + ' + (' + fmtN(iv.y2) + ' − ' + fmtN(iv.y1) + ')·(' + fmtN(c.beta) + ' − ' + iv.x1 + ')/(' + iv.x2 + ' − ' + iv.x1 + ')',
          u(el.IVT, 2, 'm³/h'), 'T1_4.2, tabla Rulmeca ' + ({ plano: '5a', dosRodillos: '5b', tresRodillos: '5c' })[el.ivtInfo.tabla] + ' (B = ' + c.B + ' mm, λ = ' + fmtN(el.ivtInfo.lambda) + '°)');
        h += paso('Capacidad máxima', 'Qmáx = IVT·v·ρ·K', 'Qmáx = ' + fmt(el.IVT, 2) + '·' + fmtN(c.v) + '·' + fmtN(c.densidad) + '·' + fmt(c.K, 4), u(c.Qmax, 1, 't/h'), 'T1_6, ec. 1.3', true);
      }
      h += paso('Grado de llenado', 'Q / Qmáx', fmt(c.Q, 1) + ' / ' + fmt(c.Qmax, 1), u(c.llenado * 100, 1, '%'), '');
      h += paso('Masa de material por metro', 'qG = Q / (3,6·v)', 'qG = ' + fmtN(c.Q) + ' / (3,6·' + fmtN(c.v) + ')', u(c.qG, 3, 'kg/m'), 'Q en t/h y v en m/s', true);
      out += seccion('3. Capacidad, ancho y velocidad', h, true);
    } else if (c.modo === 'comprobacion') {
      h = paso('Capacidad correspondiente', 'Q = 3,6·qG·v', 'Q = 3,6·' + fmtN(c.qG) + '·' + fmtN(c.v), u(c.Q, 2, 't/h'), 'Modo comprobación: ancho, velocidad y qG son datos');
      out += seccion('2. Carga', h, true);
    }
    if (!R.masas) return out;

    // 4. Resistencias
    var ms = R.masas, r = R.resistencias;
    h = '';
    if (ms.modoRodillos === 'porEstacion') {
      h += paso('Rodillos superiores qRO', 'qRO = masa por estación / separación', 'qRO = ' + fmtN(ms.mRO) + ' / ' + fmtN(ms.lSup), u(ms.qRO, 3, 'kg/m'), 'T1_4.1, ejemplo 3');
      h += paso('Rodillos inferiores qRU', 'qRU = masa por estación / separación', 'qRU = ' + fmtN(ms.mRU) + ' / ' + fmtN(ms.lInf), u(ms.qRU, 3, 'kg/m'), '');
    }
    var cos = 'cos ' + fmt(tr.deltaGrados, 2) + '°';
    var corchete = '[' + fmt(ms.qRO, 3) + ' + ' + fmt(ms.qRU, 3) + ' + (2·' + fmtN(ms.qb) + ' + ' + fmt(ms.qG, 3) + ')·' + cos + ']';
    if (r.metodo === 'global') {
      h += '<p class="ayuda">Método global (L ≤ 80 m o elegido a mano): se suman las resistencias una a una.</p>';
      h += paso('Resistencias principales FH', 'FH = f·L·g·[qRO + qRU + (2·qb + qG)·cos δ]', 'FH = ' + fmtN(e.f) + '·' + fmtN(e.L) + '·' + g() + '·' + corchete, u(r.FH, 2, 'N'), 'T1_6, ec. 2.2 (cos δ en los términos de carga, como los ejemplos 7 y 8)');
      h += paso('Aceleración del material', 'FN,acc = Im·(v − v0), con Im = qG·v', 'FN,acc = ' + fmt(r.Im, 3) + '·(' + fmtN(c.v) + ' − ' + fmtN(e.v0) + ')', u(r.Facc, 2, 'N'), 'T1_6, ec. 2.3');
      h += paso('Resistencias secundarias FN', 'FN = FN,acc + otras resistencias secundarias', 'FN = ' + fmt(r.Facc, 2) + ' + ' + fmtN(e.FNtamb), u(r.FN, 2, 'N'), 'T1_6, apartado 2.1.2; ejemplos 1 y 7');
    } else {
      var ci = r.Cinfo, cTxt = '';
      if (ci.tabla === 'manual') cTxt = 'Introducido a mano';
      else if (ci.fuera) cTxt = 'L = ' + fmtN(e.L) + ' m fuera de la tabla: se toma el valor extremo';
      else if (ci.interp && !ci.interp.exacto && ci.interp.x1 !== ci.interp.x2) cTxt = 'C = ' + fmtN(ci.interp.y1) + ' + (' + fmtN(ci.interp.y2) + ' − ' + fmtN(ci.interp.y1) + ')·(' + fmtN(e.L) + ' − ' + ci.interp.x1 + ')/(' + ci.interp.x2 + ' − ' + ci.interp.x1 + ')';
      else if (ci.interp && e.L > ci.interp.x1) cTxt = 'L ≥ ' + ci.interp.x1 + ' m: último valor de la tabla';
      else cTxt = 'Valor de la tabla para L = ' + fmtN(e.L) + ' m';
      h += '<p class="ayuda">Método simplificado (L > 80 m o elegido a mano): las resistencias principales y secundarias se agrupan con la longitud corregida LC = C·L.</p>';
      h += paso('Coeficiente C', ci.tabla === 'manual' ? '' : 'Tabla ' + (ci.tabla === 'UC3M' ? 'UC3M (T1_4.1)' : 'DIN 22101') + ', interpolación lineal', cTxt, fmtN(Math.round(r.C * 10000) / 10000), ci.tabla === 'UC3M' ? 'UC3M, diapositiva 10; T1_4.1' : ci.tabla === 'manual' ? '' : 'DIN 22101 (Phoenix, tabla 7); T1_6, ejemplo 2');
      h += paso('Longitud corregida', 'LC = C·L', 'LC = ' + fmt(r.C, 4) + '·' + fmtN(e.L), u(r.LC, 2, 'm'), 'T1_6, ec. 2.7');
      h += paso('Resistencias principales y secundarias', 'FH + FN = f·LC·g·[qRO + qRU + (2·qb + qG)·cos δ]', 'FH + FN = ' + fmtN(e.f) + '·' + fmt(r.LC, 2) + '·' + g() + '·' + corchete, u(r.FHN, 2, 'N'), 'T1_6, ec. 2.6; ejemplos 2 y 8');
    }
    h += paso('Resistencia por la inclinación FSt', 'FSt = qG·g·H', 'FSt = ' + fmt(ms.qG, 3) + '·' + g() + '·' + fmtN(e.H), u(r.FSt, 2, 'N'), 'T1_6, ec. 2.4');
    h += paso('Resistencias especiales', 'FS1 + FS2', fmtN(e.FS1) + ' + ' + fmtN(e.FS2), u(r.FS1 + r.FS2, 2, 'N'), 'T1_6, apartados 2.1.3 y 2.1.4');
    h += paso('Fuerza periférica Fu', r.metodo === 'global' ? 'Fu = FH + FN + FS1 + FS2 + FSt' : 'Fu = (FH + FN) + FS1 + FS2 + FSt',
      'Fu = ' + (r.metodo === 'global' ? fmt(r.FH, 2) + ' + ' + fmt(r.FN, 2) : fmt(r.FHN, 2)) + ' + ' + fmtN(e.FS1) + ' + ' + fmtN(e.FS2) + ' + ' + fmt(r.FSt, 2), u(r.Fu, 2, 'N'), 'T1_6, ec. 2.1', true);
    if (R.FuEsManual) h += paso('Fu usada en el cálculo', '', 'Introducida a mano', u(R.Fu, 2, 'N'), '', true);
    out += seccion('4. Resistencias al avance', h, true);
    if (!R.accionamiento) return out;

    // 5. Accionamiento
    var a = R.accionamiento;
    h = paso('Potencia útil en el tambor', 'Pu = Fu·v', 'Pu = ' + fmt(R.Fu, 2) + '·' + fmtN(c.v), u(a.Pu, 2, 'W') + ' = ' + u(a.Pu / 1000, 2, 'kW'), 'T1_6, ec. 3.7');
    if (a.frenado) h += paso('Potencia del motor', '', 'Pu &lt; 0: la cinta entrega potencia al tambor y hace falta freno o recuperación de energía (T1_6, apartado 2.1.5). Los apuntes no tratan el dimensionado del freno, así que la app no lo calcula.', 'no se calcula', '', true);
    else h += paso('Potencia en el eje del motor', 'Pmotor = Pu / η', 'Pmotor = ' + fmt(a.Pu / 1000, 4) + ' / ' + fmtN(a.eta), u(a.Pmotor / 1000, 2, 'kW'), 'T1_6, ec. 4.14', true);
    h += paso(a.frenado ? 'Par de frenado en el tambor' : 'Par en el tambor', 'M = Fu·r, con r = D/2', 'M = ' + fmt(R.Fu, 2) + '·' + fmtN(a.r), u(a.M, 2, 'N·m'), a.frenado ? 'El signo negativo indica que el par frena la cinta. T1_6, ec. 3.7' : 'T1_6, ec. 3.7');
    h += paso('Velocidad angular', 'ω = v / r', 'ω = ' + fmtN(c.v) + ' / ' + fmtN(a.r), u(a.omega, 3, 'rad/s'), '');
    h += paso('Velocidad de giro', 'n = 60·ω / (2π)', 'n = 60·' + fmt(a.omega, 3) + ' / (2π)', u(a.n, 1, 'rpm'), 'T1_6, ejercicio 11');
    out += seccion('5. Potencia y accionamiento', h, true);
    if (!R.tensiones) return out;

    // 6. Tensiones
    var t = R.tensiones;
    var cosd = fmt(t.cosDelta, 4);
    h = paso('Límite de Euler-Eytelwein', 'e^(μ·θ), con θ en radianes', 'e^(' + fmtN(e.mu) + '·' + fmt(t.theta, 4) + ')', fmt(t.k, 4), 'T1_6, ec. 3.4');
    h += paso('T2 mínima por adherencia', 'T2,adh = Fu / (e^(μθ) − 1)', 'T2,adh = ' + fmt(R.Fu, 2) + ' / (' + fmt(t.k, 4) + ' − 1)', u(t.T2adh, 2, 'N'), 'T1_6, ec. 3.6 y 4.11');
    h += paso('Tensión mínima por flecha, ramal superior', 'Tsup,mín = (qb + qG)·g·cos δ·lsup / (8·h/l)', 'Tsup,mín = (' + fmtN(e.qb) + ' + ' + fmt(R.masas.qG, 3) + ')·' + g() + '·' + cosd + '·' + fmtN(e.lSup) + ' / (8·' + fmtN(e.hrelMax / 100) + ')', u(t.TsupMin, 2, 'N'), 'T1_6, ec. 3.11, con cos δ como en el ejemplo integrado');
    h += paso('Tensión mínima por flecha, ramal inferior', 'Tinf,mín = qb·g·cos δ·linf / (8·h/l)', 'Tinf,mín = ' + fmtN(e.qb) + '·' + g() + '·' + cosd + '·' + fmtN(e.lInf) + ' / (8·' + fmtN(e.hrelMax / 100) + ')', u(t.TinfMin, 2, 'N'), 'T1_6, ec. 3.12');
    h += paso('T2 mínima', 'T2,mín = máx(T2,adh; Tsup,mín; Tinf,mín)', 'máx(' + fmt(t.T2adh, 2) + '; ' + fmt(t.TsupMin, 2) + '; ' + fmt(t.TinfMin, 2) + ')', u(t.T2min, 2, 'N'), 'T1_6, ec. 4.12');
    if (t.T2esManual) h += paso('T2 adoptada', '', 'Introducida a mano', u(t.T2, 2, 'N'), '', true);
    else h += paso('T2 adoptada', 'T2 = máx(T2,adh·(1 + margen); Tsup,mín; Tinf,mín), redondeada al alza a ' + t.pasoT2 + ' N',
      'máx(' + fmt(t.T2adh, 2) + '·' + fmtN(1 + e.margenAdh / 100) + '; ' + fmt(t.TsupMin, 2) + '; ' + fmt(t.TinfMin, 2) + ') = ' + fmt(t.T2diseno, 2) + ' → ' + fmt(t.T2, 0),
      u(t.T2, 2, 'N'), 'El margen solo se aplica a la adherencia, para no trabajar en el límite de deslizamiento (T1_6, apartado 4.3.2). Se adopta un valor redondo, como en los ejemplos de los apuntes.', true);
    h += paso('T1 (ramal tenso)', 'T1 = T2 + Fu', 'T1 = ' + fmt(t.T2, 2) + ' + ' + fmt(R.Fu, 2), u(t.T1, 2, 'N'), 'T1_6, ec. 4.13', true);
    h += paso('Comprobación de adherencia', 'T1 / T2 ≤ e^(μθ)', fmt(t.T1, 2) + ' / ' + fmt(t.T2, 2) + ' = ' + fmt(t.relacion, 4) + (t.adherenciaOk ? ' ≤ ' : ' > ') + fmt(t.k, 4), t.adherenciaOk ? 'cumple' : 'no cumple', 'T1_6, ec. 3.4');
    h += paso('Fuerza máxima transmisible', 'Fu,máx = T2·(e^(μθ) − 1)', 'Fu,máx = ' + fmt(t.T2, 2) + '·(' + fmt(t.k, 4) + ' − 1)', u(t.FuMaxAdh, 2, 'N'), 'T1_6, ec. 3.5');
    h += paso('Reserva de adherencia', 'Radh = Fu,máx / Fu − 1', fmt(t.FuMaxAdh, 2) + ' / ' + fmt(R.Fu, 2) + ' − 1', u(t.reservaAdh * 100, 1, '%'), 'T1_6, ejemplo 4');
    h += paso('Ángulo de abrazamiento mínimo con esta T2', 'θmín = ln(Fu / T2 + 1) / μ', 'θmín = ln(' + fmt(R.Fu, 2) + ' / ' + fmt(t.T2, 2) + ' + 1) / ' + fmtN(e.mu), u(t.thetaMin, 3, 'rad') + ' = ' + u(C.grados(t.thetaMin), 1, '°'), 'T1_6, ejemplos 9 y 10');
    var fuenteT = t.localSup || t.localInf ? 'Tensiones locales introducidas a mano' :
      'Con T2, como en los apuntes (ec. 4.12). Con el motor en cabeza y la cinta subiendo, T2 solo es la tensión mínima si qb·g·H no supera las resistencias del ramal de retorno; si no, la mínima está en la cola (ver Readme, apartado 11)';
    h += paso('Flecha, ramal superior', 'h = (qb + qG)·g·cos δ·l² / (8·T)', 'h = (' + fmtN(e.qb) + ' + ' + fmt(R.masas.qG, 3) + ')·' + g() + '·' + cosd + '·' + fmtN(e.lSup) + '² / (8·' + fmt(t.Tsup, 2) + ')', u(t.hSup * 1000, 2, 'mm') + ' (' + u(t.hrelSup * 100, 3, '%') + ')', fuenteT + '. T1_6, ec. 3.8 y 3.9');
    h += paso('Flecha, ramal inferior', 'h = qb·g·cos δ·l² / (8·T)', 'h = ' + fmtN(e.qb) + '·' + g() + '·' + cosd + '·' + fmtN(e.lInf) + '² / (8·' + fmt(t.Tinf, 2) + ')', u(t.hInf * 1000, 2, 'mm') + ' (' + u(t.hrelInf * 100, 3, '%') + ')', 'T1_6, ec. 3.8 y 3.9');
    h += paso('Separación máxima de rodillos con esas tensiones', 'lmáx = 8·T·(h/l) / (q·g·cos δ)', 'superior: 8·' + fmt(t.Tsup, 2) + '·' + fmtN(e.hrelMax / 100) + ' / (' + fmt(t.qSup, 3) + '·' + g() + '·' + cosd + ')', u(t.lSupMax, 3, 'm') + ' / ' + u(t.lInfMax, 3, 'm'), 'Superior / inferior. T1_6, ejercicio 15');
    out += seccion('6. Tensiones', h, true);
    if (!R.banda) return out;

    // 7. Banda
    var b = R.banda;
    h = '<p class="ayuda">El coeficiente de seguridad S depende del número de capas (tabla 4.1), así que se itera como en el ejercicio 12.</p>';
    h += '<div class="tabla-envoltorio"><table class="tabla"><thead><tr><th>Hipótesis</th><th>S</th><th>z = S·T1/(R·B)</th><th>z entero</th></tr></thead><tbody>' +
      b.tramos.map(function (tr2) { return '<tr><td>' + tr2.texto + '</td><td>' + tr2.S + '</td><td>' + fmt(tr2.zCalc, 3) + '</td><td>' + tr2.zEntero + '</td></tr>'; }).join('') + '</tbody></table></div>';
    h += paso('Número de capas', b.zEsManual ? 'Introducido a mano' : 'Menor z ≥ ' + fmtN(e.zMin) + ' (mínimo constructivo) con R·z·B / S(z) ≥ T1', 'z = S·T1/(R·B) = ' + b.S + '·' + fmt(t.T1, 2) + ' / (' + fmtN(b.R) + '·' + b.B + ') = ' + fmt(b.zCalc, 3) + ' → se adoptan ' + b.z, u(b.z, 0, 'capas'), 'T1_6, ec. 4.5 y tabla 4.1', true);
    h += paso('Tensión admisible', 'Tadm = R·z·B / S', 'Tadm = ' + fmtN(b.R) + '·' + b.z + '·' + b.B + ' / ' + b.S, u(b.Tadm, 2, 'N'), 'T1_6, ec. 4.6', true);
    h += paso('Comprobación de rotura', 'T1 ≤ Tadm', fmt(t.T1, 2) + (b.ok ? ' ≤ ' : ' > ') + fmt(b.Tadm, 2) + '; Tadm / T1 = ' + fmt(b.reserva, 2), b.ok ? 'cumple' : 'no cumple', 'T1_6, ec. 4.1');
    out += seccion('7. Banda: número de capas', h, true);
    return out;
  }

  function tablaCandidatos(c) {
    var vol = c.metodo === 'volumetrico';
    var h = '<div class="tabla-envoltorio"><table class="tabla"><thead><tr><th>B (mm)</th><th>' + (vol ? 'IVT (m³/h)' : 'S (m²)') + '</th><th>c1 (t/h por m/s)</th><th>v necesaria (m/s)</th><th>v DIN (m/s)</th><th>vmáx ' + c.clase + ' (m/s)</th><th>Resultado</th></tr></thead><tbody>';
    var vMano = c.vauto === false ? c.v : null;   // velocidad fijada a mano: cada ancho se juzga con ella
    c.candidatos.forEach(function (k) {
      var clase = k.B === c.B ? 'elegido' : (!k.porTerron || k.sinDato ? 'descartado' : '');
      var res;
      if (k.sinDato) res = 'sin dato';
      else if (!k.porTerron) res = 'menor que Bmín';
      else if (vMano !== null) res = k.c1 * vMano < c.Q * (1 - 1e-12) ? 'no alcanza Q con ' + fmtN(vMano) + ' m/s' : vMano > k.vmax + 1e-12 ? fmtN(vMano) + ' m/s supera vmáx' : 'cumple';
      else if (k.vDIN === null) res = 'no hay v DIN suficiente';
      else if (k.vDIN > k.vmax + 1e-12) res = 'supera vmáx';
      else res = 'cumple';
      if (k.B === c.B) res += c.Bauto ? ' · elegido' : ' · fijado a mano';
      h += '<tr class="' + clase + '"><td>' + k.B + '</td><td>' + (k.sinDato ? '-' : vol ? fmt(k.IVT, 2) : fmt(k.S, 6)) + '</td><td>' + (k.sinDato ? '-' : fmt(k.c1, 1)) +
        '</td><td>' + (k.sinDato ? '-' : fmt(k.vReq, 3)) + '</td><td>' + (k.vDIN === null || k.sinDato ? '-' : fmt(k.vDIN, 2)) + '</td><td>' + fmt(k.vmax, 2) + '</td><td>' + res + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  // Esquema de la sección transversal (solo ilustrativo; no interviene en el cálculo).
  function figuraSeccion(c, el) {
    var b = el.b, l3 = el.l3 / 1000, lam = C.rad(c.lambda), bet = C.rad(c.beta);
    var lado = (b - l3) / 2;
    var wTop = l3 + 2 * lado * Math.cos(lam);         // ancho superior del trapecio
    var hTrap = lado * Math.sin(lam);
    var hCap = wTop * Math.tan(bet) / 4;              // flecha de la parábola: área = (2/3)·w·h = S1
    var W = 520, margen = 24, pie = 30, altoMax = 300;
    var escala = (W - 2 * margen) / wTop;
    if ((hTrap + hCap) * escala > altoMax) escala = altoMax / (hTrap + hCap);
    var Hs = Math.ceil((hTrap + hCap) * escala + margen + pie);
    var cx = W / 2, y0 = Hs - pie;                    // y0: nivel del rodillo central
    function X(x) { return (cx + x * escala).toFixed(1); }
    function Y(y) { return (y0 - y * escala).toFixed(1); }
    var xL = -wTop / 2, xR = wTop / 2;
    var ptsTrap = [[-l3 / 2, 0], [l3 / 2, 0], [xR, hTrap], [xL, hTrap]].map(function (p) { return X(p[0]) + ',' + Y(p[1]); }).join(' ');
    var cap = 'M' + X(xL) + ',' + Y(hTrap) + ' Q' + X(0) + ',' + Y(hTrap + 2 * hCap) + ' ' + X(xR) + ',' + Y(hTrap) + ' Z';
    var banda = 'M' + X(xL) + ',' + Y(hTrap) + ' L' + X(-l3 / 2) + ',' + Y(0) + ' L' + X(l3 / 2) + ',' + Y(0) + ' L' + X(xR) + ',' + Y(hTrap);
    return '<svg class="figura-seccion" viewBox="0 0 ' + W + ' ' + Hs + '" role="img" aria-label="Esquema de la sección del material sobre la banda">' +
      '<polygon points="' + ptsTrap + '" fill="#9cc2e5" stroke="none"/>' +
      '<path d="' + cap + '" fill="#d9b779" stroke="none"/>' +
      '<path d="' + banda + '" fill="none" stroke="#1d4f7a" stroke-width="3" stroke-linejoin="round"/>' +
      '<text x="' + X(0) + '" y="' + Y(hTrap / 2) + '" text-anchor="middle" font-size="13" fill="#0f2f4d">S2 = ' + fmt(el.S2, 5) + ' m²</text>' +
      '<text x="' + X(0) + '" y="' + Y(hTrap + hCap * 0.55) + '" text-anchor="middle" font-size="13" fill="#4a3510">S1 = ' + fmt(el.S1, 5) + ' m²</text>' +
      '<text x="' + X(0) + '" y="' + (y0 + 18) + '" text-anchor="middle" font-size="12" fill="#556274">b = ' + fmt(b, 3) + ' m · l3 = ' + fmt(l3, 3) + ' m · λ = ' + fmtN(c.lambda) + '° · β = ' + fmtN(c.beta) + '°</text>' +
      '</svg><p class="ayuda" style="text-align:center">Esquema a escala de la sección útil (azul: trapecio S2; ocre: sobrecarga parabólica S1).</p>';
  }

  /* ------------------------------------------------------------------ *
   * Eventos                                                              *
   * ------------------------------------------------------------------ */
  var temporizador = null, ultimoResultado = null;

  // Campo de la entrada del motor -> elemento del formulario que hay que marcar en rojo.
  var CAMPOS = {
    'L': 'L', 'H': 'H', 'Q': 'Q', 'material.densidad': 'densidad', 'material.reposo': 'reposo', 'material.beta': 'beta',
    'material.clase': 'clase', 'material.tamMax': 'tamMax', 'material.granulometria': 'granulometria', 'rodillos': 'rodillos',
    'lambda': 'lambda', 'l3Manual': 'l3', 'B': 'selB', 'qG': 'qG', 'qb': 'qb', 'qRO': 'qRO', 'qRU': 'qRU', 'mRO': 'mRO', 'mRU': 'mRU',
    'lSup': 'lSup', 'lInf': 'lInf', 'C': 'C', 'v0': 'v0', 'FNtamb': 'FNtamb', 'FS1': 'FS1', 'FS2': 'FS2', 'eta': 'eta', 'D': 'D',
    'FuManual': 'FuManual', 'theta': 'theta', 'hrelMax': 'hrelMax', 'margenAdh': 'margenAdh', 'T2manual': 'T2',
    'TlocalSup': 'TlocalSup', 'TlocalInf': 'TlocalInf', 'zMin': 'zMin', 'zManual': 'z', 'metodoCapacidad': 'metodoCapacidad'
  };
  function elementoDeCampo(campo) {
    if (campo === 'v') return $('selV').value === 'otra' ? $('vOtra') : $('selV');
    if (campo === 'f') return $('selF').value === 'otro' ? $('fOtro') : $('selF');
    if (campo === 'mu') return $('selMu').value === 'otro' ? $('muOtro') : $('selMu');
    if (campo === 'R') return $('selR').value === 'otro' ? $('ROtro') : $('selR');
    return CAMPOS[campo] ? $(CAMPOS[campo]) : null;
  }

  function recalcular() {
    ambiguos = {};
    actualizarVisibilidad();
    // Se limpian las marcas rojas; leerFormulario() marca los textos que no son números
    // y después se marcan los campos de los errores que devuelve el motor.
    Array.prototype.forEach.call($('formulario').querySelectorAll('[aria-invalid]'), function (el) { el.removeAttribute('aria-invalid'); });
    var e = leerFormulario();
    var R = C.calcular(e, datos);
    R.errores.forEach(function (er) {
      var el = er.campo ? elementoDeCampo(er.campo) : null;
      if (!el) return;
      el.setAttribute('aria-invalid', 'true');
      // Un número ambiguo llega al motor como NaN: su mensaje explica cómo escribirlo
      if (ambiguos.hasOwnProperty(el.id)) er.texto = mensajeAmbiguo(el, ambiguos[el.id]);
    });
    ultimoResultado = R;
    actualizarAyudas(R);
    pintar(R, e);
  }
  function programarRecalculo() { clearTimeout(temporizador); temporizador = setTimeout(recalcular, 120); }

  function alCambiarMaterial() {
    var v = $('selMaterial').value;
    if (v === 'otro' || v === '') return;
    var m = datos.materiales.lista[Number(v)];
    poner('densidad', Math.round((m.densidadMin + m.densidadMax) / 2 * 1000) / 1000);
    poner('reposo', m.reposoMin);
    $('abrasividad').value = m.abrasividad || '';
    // β por fluidez si el material tiene ángulo de reposo; si no, hay que darlo a mano
    $('betaModo').value = m.reposoMin === null ? 'manual' : 'auto';
    // La clase A-D vuelve a automática: se deduce del nuevo material (versión 3.0)
    $('clase').value = 'auto';
  }

  // Al cambiar de modo: en diseño, ancho y velocidad vuelven a automático; en comprobación
  // se parte del ancho y la velocidad del último diseño calculado (si lo hay).
  function alCambiarModo() {
    var modo = modoActual();
    var c = ultimoResultado && ultimoResultado.capacidad;
    rellenarBV(modo);
    if (modo === 'diseno') { $('selB').value = 'auto'; $('selV').value = 'auto'; return; }
    if (c && c.B && c.v) {
      $('selB').value = String(c.B);
      if (datos.velocidadesNormalizadas.valores.indexOf(c.v) >= 0) $('selV').value = String(c.v);
      else { $('selV').value = 'otra'; poner('vOtra', c.v); }
    } else { $('selB').value = ''; $('selV').value = ''; }
  }

  function iniciar(cargados) {
    datos = cargados.datos;
    $('origenDatos').textContent = 'Datos cargados de ' + cargados.origen + '.';
    rellenarSelects();
    rellenarBV('diseno');
    var f = $('formulario');
    f.addEventListener('input', programarRecalculo);
    f.addEventListener('change', function (ev) {
      if (ev.target.name === 'modo') alCambiarModo();
      if (ev.target.id === 'selMaterial') alCambiarMaterial();
      programarRecalculo();
    });
    f.addEventListener('submit', function (ev) { ev.preventDefault(); });
    $('selEjemplo').addEventListener('change', function () { cargarEjemplo(this.value); });
    // Pulsar un error lleva al campo que hay que corregir
    $('errores').addEventListener('click', function (ev) {
      var bt = ev.target.closest ? ev.target.closest('.enlace-error') : null;
      var el = bt ? elementoDeCampo(bt.getAttribute('data-campo')) : null;
      if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); }
    });
    $('btnImprimir').addEventListener('click', function () { window.print(); });
    // Al imprimir se abren todas las secciones y después se deja todo como estaba
    var estadoAntesDeImprimir = null;
    window.addEventListener('beforeprint', function () {
      estadoAntesDeImprimir = Array.prototype.map.call(document.querySelectorAll('#desarrollo details'), function (d) { var o = d.open; d.open = true; return o; });
    });
    window.addEventListener('afterprint', function () {
      if (!estadoAntesDeImprimir) return;
      Array.prototype.forEach.call(document.querySelectorAll('#desarrollo details'), function (d, i) { if (i < estadoAntesDeImprimir.length) d.open = estadoAntesDeImprimir[i]; });
      estadoAntesDeImprimir = null;
    });
    cargarEjemplo(datos.ejemplos[0].id);
  }

  cargarDatos().then(iniciar).catch(function (err) {
    $('errores').innerHTML = '<div class="mensajes mensajes--error" role="alert">' + esc(err.message) + ' Abre la app desde GitHub Pages o con un servidor local.</div>';
  });
})();

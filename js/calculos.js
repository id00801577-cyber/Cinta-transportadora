/*
 * calculos.js - Motor de cálculo para el dimensionado de cintas transportadoras (versión 3.0).
 *
 * Autor: Alberto Jorge Lorenzo - Transporte y Manutención Industrial (Máster en Ingeniería Industrial, USAL).
 *
 * Funciones puras: reciben datos y devuelven resultados, sin tocar la página.
 * Así se pueden probar por separado (pruebas.html) y la interfaz (app.js) solo
 * lee el formulario, llama a calcular() y pinta los resultados.
 *
 * Método: apuntes T1_6 (ISO 5048 / DIN 22101) y notas T1_4.1 de la asignatura.
 * Unidades: longitudes en m, anchos de banda en mm, masas lineales en kg/m,
 * fuerzas en N, capacidades en t/h, densidades en t/m3, ángulos de entrada en grados.
 *
 * Convención de las opciones "automático / a mano" en la entrada:
 *   null       -> automático (lo calcula la app)
 *   un número  -> valor a mano
 *   NaN        -> a mano pero sin un número válido: es un error de datos
 */
(function (raiz) {
  'use strict';

  var G = 9.81; // m/s2 (valor usado en todos los ejemplos de T1_6)

  function rad(grados) { return grados * Math.PI / 180; }
  function grados(radianes) { return radianes * 180 / Math.PI; }
  function esNumero(x) { return typeof x === 'number' && isFinite(x); }
  // Valor "a mano" sin número válido (no es null, que significa automático).
  function manualInvalido(x) { return x !== null && x !== undefined && !esNumero(x); }
  // Número con coma decimal para los mensajes: d decimales (3 por defecto) sin ceros sobrantes.
  function txt(x, d) {
    if (!esNumero(x)) return String(x);
    var s = x.toFixed(d === undefined ? 3 : d);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s.replace('.', ',');
  }
  // Lectura de un número escrito en el formulario (versión 3.0). Admite coma o punto decimal y espacios.
  // «1.500» o «12.000» son ambiguos en español (¿miles o decimales?) y un texto con punto y coma
  // («1.500,5») lleva separador de miles: no se interpretan; se devuelve NaN con ambiguo = true para
  // pedir que se escriba sin separador de miles. Texto vacío o que no es un número -> NaN.
  //   comoMiles:   el número leyendo el punto como separador de miles («1500»), si tiene sentido
  //   comoDecimal: el número leyendo el punto como coma decimal («1,5»), si tiene sentido
  function leerNumero(texto) {
    var t = String(texto === null || texto === undefined ? '' : texto).replace(/\s/g, '');
    var puntoYComa = t.indexOf('.') >= 0 && t.indexOf(',') >= 0;
    if (puntoYComa || /^[-+]?[1-9]\d{0,2}(\.\d{3})+$/.test(t)) {
      var r = { valor: NaN, ambiguo: true, texto: t, comoMiles: null, comoDecimal: null };
      if (!puntoYComa) {
        r.comoMiles = t.replace(/\./g, '').replace(/^\+/, '');
        if (t.indexOf('.') === t.lastIndexOf('.')) r.comoDecimal = txt(Number(t));
      } else if (/^[-+]?[1-9]\d{0,2}(\.\d{3})+,\d+$/.test(t)) r.comoMiles = t.replace(/\./g, '').replace(/^\+/, '');   // «1.500,5» -> «1500,5»
      return r;
    }
    var x = t === '' ? NaN : Number(t.replace(',', '.'));
    return { valor: isFinite(x) ? x : NaN, ambiguo: false };
  }

  /* ------------------------------------------------------------------ *
   * Utilidades de tablas                                                *
   * ------------------------------------------------------------------ */

  // Interpolación lineal en una tabla con xs crecientes (T1_6, ejercicio 13).
  // Fuera de rango devuelve el extremo y marca fuera = true.
  function interpolar(xs, ys, x) {
    var n = xs.length;
    if (x <= xs[0]) return { valor: ys[0], fuera: x < xs[0], x1: xs[0], x2: xs[0], y1: ys[0], y2: ys[0], exacto: x === xs[0] };
    if (x >= xs[n - 1]) return { valor: ys[n - 1], fuera: x > xs[n - 1], x1: xs[n - 1], x2: xs[n - 1], y1: ys[n - 1], y2: ys[n - 1], exacto: x === xs[n - 1] };
    for (var i = 0; i < n - 1; i++) {
      if (x >= xs[i] && x <= xs[i + 1]) {
        if (x === xs[i]) return { valor: ys[i], fuera: false, x1: xs[i], x2: xs[i], y1: ys[i], y2: ys[i], exacto: true };
        if (x === xs[i + 1]) return { valor: ys[i + 1], fuera: false, x1: xs[i + 1], x2: xs[i + 1], y1: ys[i + 1], y2: ys[i + 1], exacto: true };
        var t = (x - xs[i]) / (xs[i + 1] - xs[i]);
        return { valor: ys[i] + t * (ys[i + 1] - ys[i]), fuera: false, x1: xs[i], x2: xs[i + 1], y1: ys[i], y2: ys[i + 1], exacto: false };
      }
    }
    return { valor: NaN, fuera: true };
  }

  // Factor K de reducción de capacidad por inclinación (T1_6, tabla 1.1).
  // Por debajo de 2° K = 1,00; por encima de 20° se toma 0,81 y se avisa.
  function factorK(inclinacionGrados, datos) {
    var t = datos.factorInclinacion;
    var a = Math.abs(inclinacionGrados);
    if (a <= t.inclinacionGrados[0]) return { K: t.K[0], fuera: false, interp: null };
    var r = interpolar(t.inclinacionGrados, t.K, a);
    return { K: r.valor, fuera: r.fuera, interp: r };
  }

  // Ángulo de inclinación: sen(delta) = H / L, con L la longitud entre centros de tambores (T1_6, ejemplos 7 y 8).
  function inclinacion(L, H) { return Math.asin(H / L); }

  // Anchura útil b (m) a partir de la anchura real B (m) (T1_6, cap. 1).
  function anchoUtil(Bm) { return Bm <= 2 ? 0.9 * Bm - 0.05 : Bm - 0.2; }

  // Longitud del rodillo central l3 (mm) para estaciones de 3 rodillos (T1_6, figura 1.1).
  // Con 1 o 2 rodillos l3 = 0 (T1_6, cap. 1).
  function longitudRodilloCentral(Bmm, numRodillos, datos) {
    if (numRodillos !== 3) return 0;
    var fila = datos.longitudRodillos.filas.filter(function (f) { return f.B === Bmm; })[0];
    return fila && esNumero(fila.tres) ? fila.tres : null;
  }

  // Sección del material sobre la banda, método del flujo másico (T1_6, ec. 1.1).
  // S2 con cos(lambda), como ISO 5048 y los ejemplos numéricos de T1_4.1 (ver Readme, decisión 1).
  function seccionMasica(Bm, l3m, lambdaGrados, betaGrados) {
    var b = anchoUtil(Bm);
    var lam = rad(lambdaGrados), bet = rad(betaGrados);
    var S1 = Math.pow(l3m + (b - l3m) * Math.cos(lam), 2) * Math.tan(bet) / 6;
    var S2 = (l3m + (b - l3m) / 2 * Math.cos(lam)) * ((b - l3m) / 2 * Math.sin(lam));
    return { b: b, S1: S1, S2: S2, S: S1 + S2 };
  }

  // Caudal volumétrico IVT (m3/h a 1 m/s) de las tablas Rulmeca (T1_4.2), interpolando en beta.
  function ivt(Bmm, numRodillos, lambdaGrados, betaGrados, datos) {
    var cv = datos.capacidadVolumetrica;
    var clave = numRodillos === 1 ? 'plano' : numRodillos === 2 ? 'dosRodillos' : 'tresRodillos';
    var tabla = cv[clave];
    var lam = numRodillos === 1 ? 0 : lambdaGrados;
    var j = tabla.lambda.indexOf(lam);
    if (j < 0) return { error: 'La tabla Rulmeca de ' + (numRodillos === 1 ? 'estaciones planas' : numRodillos + ' rodillos') + ' solo admite lambda = ' + tabla.lambda.join(', ') + '°.' };
    var filas = tabla.anchos[String(Bmm)];
    if (!filas) return { error: 'La tabla Rulmeca no tiene el ancho B = ' + Bmm + ' mm para esta estación.' };
    var col = filas.map(function (f) { return Array.isArray(f) ? f[j] : f; });
    var r = interpolar(cv.beta, col, betaGrados);
    var erratas = (cv.posiblesErratas || []).filter(function (e) {
      return e.tabla === clave && e.B === Bmm && e.lambda === lam && (e.beta === r.x1 || e.beta === r.x2);
    });
    return { IVT: r.valor, interp: r, fuera: r.fuera, tabla: clave, lambda: lam, erratas: erratas };
  }

  /* ------------------------------------------------------------------ *
   * Material                                                            *
   * ------------------------------------------------------------------ */

  // Ángulo de sobrecarga beta a partir del ángulo de reposo (tabla de fluidez, T1_4.1 fig. 7).
  function sugerirBeta(reposo, datos) {
    var filas = datos.fluidez.filas;
    for (var i = 0; i < filas.length; i++) if (reposo <= filas[i].reposoMax) return { beta: filas[i].sobrecarga, fila: filas[i] };
    return { beta: filas[filas.length - 1].sobrecarga, fila: filas[filas.length - 1] };
  }

  // Clase de material A-D de la tabla 1.3 (T1_6) a partir de densidad y abrasividad (leyenda Rulmeca).
  // Se toma la más exigente de las dos.
  function sugerirClase(densidad, abrasividad) {
    var porDensidad = densidad < 1.0 ? 'A' : densidad < 1.5 ? 'B' : densidad <= 2.0 ? 'C' : 'D';
    var porAbrasion = abrasividad === 'C' ? 'D' : abrasividad === 'B' ? 'B' : 'A';
    var clase = porDensidad > porAbrasion ? porDensidad : porAbrasion;
    return { clase: clase, porDensidad: porDensidad, porAbrasion: abrasividad ? porAbrasion : null };
  }

  // Ancho mínimo por tamaño de terrón: tabla 1.3 (columna uniforme o mixto) y tabla 1.2 (factor x tamaño).
  // avisoBeta = true si se usa la tabla 1.2 con beta > 30° (fuera de la tabla).
  function anchoMinimo(tamMax, granulometria, beta, datos) {
    var filas = datos.anchosVelocidades.filas;
    var col = granulometria === 'mezcla' ? 'tamMaxMixto' : 'tamMaxUniforme';
    var f13 = filas.filter(function (f) { return f[col] >= tamMax; })[0];
    var r = { columna: col, B13: f13 ? f13.B : null, B12: null, factor: null, Bnecesario12: null, avisoBeta: false };
    if (granulometria !== 'uniforme') {
      var ft = datos.factorTerron.filas;
      var fila = ft.filter(function (f) { return beta <= f.betaMax; })[0];
      if (!fila) { fila = ft[ft.length - 1]; r.avisoBeta = true; }
      r.factor = granulometria === 'mezcla' ? fila.mezcla : fila.todoGruesos;
      r.Bnecesario12 = r.factor * tamMax;
      var f12 = filas.filter(function (f) { return f.B >= r.Bnecesario12; })[0];
      r.B12 = f12 ? f12.B : null;
    }
    var imposible = r.B13 === null || (granulometria !== 'uniforme' && r.B12 === null);
    r.Bmin = imposible ? null : Math.max(r.B13, r.B12 || 0);
    return r;
  }

  function velocidadMaxima(Bmm, clase, datos) {
    var fila = datos.anchosVelocidades.filas.filter(function (f) { return f.B === Bmm; })[0];
    return fila ? fila.vmax[clase] : null;
  }

  // Menor velocidad normalizada DIN 22101 >= v (T1_6, tabla 1.4). null si no hay ninguna.
  function siguienteVelocidadDIN(v, datos) {
    var vs = datos.velocidadesNormalizadas.valores;
    for (var i = 0; i < vs.length; i++) if (vs[i] >= v * (1 - 1e-12)) return vs[i];
    return null;
  }

  /* ------------------------------------------------------------------ *
   * Resistencias, potencia, tensiones y banda                          *
   * ------------------------------------------------------------------ */

  // Coeficiente C de longitud (método simplificado, L > 80 m).
  // erratas: posibles erratas de la tabla que intervienen en el valor (interpolación o valor exacto).
  function coeficienteC(L, tabla, datos) {
    var t = tabla === 'UC3M' ? datos.coeficienteC.UC3M : datos.coeficienteC.DIN22101;
    var r = interpolar(t.L, t.C, L);
    var fuera = L < t.L[0] || (tabla === 'UC3M' && L > t.L[t.L.length - 1]);
    var erratas = (t.posiblesErratas || []).filter(function (er) { return er.L === r.x1 || er.L === r.x2; });
    return { C: r.valor, interp: r, fuera: fuera, tabla: tabla, erratas: erratas };
  }

  // Resistencias al avance (T1_6, cap. 2; ISO 5048).
  // p: {metodo: 'global'|'simplificado', L, H, delta (rad), f, C, qRO, qRU, qb, qG, v, v0, FNtamb, FS1, FS2}
  function resistencias(p) {
    var cosd = Math.cos(p.delta);
    var corchete = p.qRO + p.qRU + (2 * p.qb + p.qG) * cosd; // kg/m
    var FSt = p.qG * G * p.H;                                 // ec. 2.4
    var r = { metodo: p.metodo, cosDelta: cosd, corchete: corchete, FSt: FSt, FS1: p.FS1, FS2: p.FS2 };
    if (p.metodo === 'global') {
      r.FH = p.f * p.L * G * corchete;                        // ec. 2.2 (cos solo en la carga, como los ejemplos)
      r.Im = p.qG * p.v;                                      // kg/s
      r.Facc = r.Im * (p.v - p.v0);                           // ec. 2.3
      r.FNtamb = p.FNtamb;
      r.FN = r.Facc + p.FNtamb;
      r.FHN = r.FH + r.FN;
    } else {
      r.C = p.C;
      r.LC = p.C * p.L;                                       // ec. 2.7
      r.FHN = p.f * r.LC * G * corchete;                      // ec. 2.6
    }
    r.Fu = r.FHN + p.FS1 + p.FS2 + FSt;                       // ec. 2.1 / 2.5 / 2.6
    return r;
  }

  // Potencia y accionamiento (T1_6, ec. 3.7 y 4.14).
  // Con Fu < 0 (cinta descendente que se acelera sola) la cinta arrastra al motor y hace falta
  // freno: no hay potencia de motor que calcular (frenado = true, Pmotor = null).
  function accionamiento(Fu, v, eta, Dmm) {
    var r = Dmm / 2000;          // radio en m
    var Pu = Fu * v;             // W
    var omega = v / r;           // rad/s
    var frenado = Pu < 0;
    return { Pu: Pu, Pmotor: frenado ? null : Pu / eta, frenado: frenado, eta: eta, D: Dmm, r: r, M: Fu * r, omega: omega, n: omega * 60 / (2 * Math.PI) };
  }

  // Tensiones (T1_6, cap. 3 y apartado 4.3).
  // p: {Fu, mu, thetaGrados, margenAdh (fracción), qb, qG, lSup, lInf, hrelMax (fracción), delta (rad),
  //     T2manual (N o null), TlocalSup (N o null), TlocalInf (N o null)}
  function tensiones(p) {
    var theta = rad(p.thetaGrados);
    var k = Math.exp(p.mu * theta);                                       // límite de Euler-Eytelwein
    var cosd = Math.cos(p.delta);
    var qSup = p.qb + p.qG, qInf = p.qb;
    var T2adh = p.Fu / (k - 1);                                           // ec. 3.6 / 4.11
    var TsupMin = qSup * G * cosd * p.lSup / (8 * p.hrelMax);             // ec. 3.11 (con cos, ejemplo integrado)
    var TinfMin = qInf * G * cosd * p.lInf / (8 * p.hrelMax);             // ec. 3.12
    var T2flecha = Math.max(TsupMin, TinfMin);
    var T2min = Math.max(T2adh, T2flecha);                                // ec. 4.12
    var T2adhMargen = T2adh * (1 + p.margenAdh);
    var T2diseno = Math.max(T2adhMargen, T2flecha);
    // Se adopta un valor redondo hacia arriba, como hacen los apuntes (ejemplo 4: 600 N; integrado: 4000 N)
    var pasoT2 = T2diseno < 1000 ? 10 : 100;
    var T2auto = Math.ceil(T2diseno / pasoT2 - 1e-9) * pasoT2;
    var T2 = esNumero(p.T2manual) ? p.T2manual : T2auto;
    var T1 = T2 + p.Fu;                                                   // ec. 4.13
    var FuMaxAdh = T2 * (k - 1);                                          // ec. 3.5
    var Tsup = esNumero(p.TlocalSup) ? p.TlocalSup : T2;                  // tensión con la que se comprueba cada ramal
    var Tinf = esNumero(p.TlocalInf) ? p.TlocalInf : T2;
    var hSup = qSup * G * cosd * p.lSup * p.lSup / (8 * Tsup);            // ec. 3.8
    var hInf = qInf * G * cosd * p.lInf * p.lInf / (8 * Tinf);
    return {
      theta: theta, k: k, cosDelta: cosd, qSup: qSup, qInf: qInf,
      T2adh: T2adh, TsupMin: TsupMin, TinfMin: TinfMin, T2flecha: T2flecha, T2min: T2min,
      T2adhMargen: T2adhMargen, T2diseno: T2diseno, pasoT2: pasoT2, T2auto: T2auto, T2: T2, T2esManual: esNumero(p.T2manual), T1: T1,
      relacion: T1 / T2, FuMaxAdh: FuMaxAdh, reservaAdh: FuMaxAdh / p.Fu - 1, adherenciaOk: T1 / T2 <= k * (1 + 1e-12),
      thetaMin: Math.log(p.Fu / T2 + 1) / p.mu,                           // ejemplos 9 y 10
      Tsup: Tsup, Tinf: Tinf, localSup: esNumero(p.TlocalSup), localInf: esNumero(p.TlocalInf),
      hSup: hSup, hInf: hInf, hrelSup: hSup / p.lSup, hrelInf: hInf / p.lInf,
      lSupMax: 8 * Tsup * p.hrelMax / (qSup * G * cosd),                  // ejercicio 15
      lInfMax: 8 * Tinf * p.hrelMax / (qInf * G * cosd)
    };
  }

  // Coeficiente de seguridad S según el número de capas (T1_6, tabla 4.1).
  function coefSeguridad(z, datos) {
    var tramos = datos.coeficienteSeguridad.tramos;
    for (var i = 0; i < tramos.length; i++) if (tramos[i].zMax === null || z <= tramos[i].zMax) return tramos[i].S;
    return tramos[tramos.length - 1].S;
  }

  // Número de capas (T1_6, ec. 4.5 y tabla 4.1). Menor z >= zMin con R·z·B/S(z) >= Tmax,
  // que es la iteración del ejercicio 12 hecha de forma exhaustiva.
  function capas(Tmax, Bmm, R, zMin, zManual, datos) {
    var z;
    if (esNumero(zManual)) z = zManual;
    else {
      z = Math.max(1, zMin);
      while (R * z * Bmm / coefSeguridad(z, datos) < Tmax && z < 60) z++;
    }
    var S = coefSeguridad(z, datos);
    var Tadm = R * z * Bmm / S;                                           // ec. 4.6
    var tramos = datos.coeficienteSeguridad.tramos.map(function (t) {
      var zc = t.S * Tmax / (R * Bmm);
      return { S: t.S, texto: t.texto, zCalc: zc, zEntero: Math.ceil(zc - 1e-12) };
    });
    return { z: z, S: S, Tadm: Tadm, reserva: Tadm / Tmax, ok: Tmax <= Tadm * (1 + 1e-12),
             zCalc: S * Tmax / (R * Bmm), zEsManual: esNumero(zManual), zMin: zMin, tramos: tramos };
  }

  /* ------------------------------------------------------------------ *
   * Validación de los datos de entrada                                  *
   * ------------------------------------------------------------------ */

  // Comprueba todos los datos que no dependen de resultados intermedios y devuelve la lista
  // de errores. Cada error lleva el campo de la entrada al que se refiere, para marcarlo en rojo.
  function validar(e) {
    var errores = [];
    function error(texto, campo) { errores.push({ texto: texto, campo: campo }); }
    // dato obligatorio: si no es un número -> "falta"; si no cumple la condición -> "rango"
    function dato(x, campo, falta, rango, valido) {
      if (!esNumero(x)) { error(falta, campo); return false; }
      if (valido && !valido(x)) { error(rango, campo); return false; }
      return true;
    }
    // dato a mano (null = automático): solo se comprueba si se ha elegido "a mano"
    function aMano(x, campo, falta, rango, valido) {
      if (x === null || x === undefined) return true;
      return dato(x, campo, falta, rango, valido);
    }
    function positivo(x) { return x > 0; }
    function noNegativo(x) { return x >= 0; }
    function entero(x) { return x >= 1 && Math.round(x) === x; }
    function angulo(x) { return x > 0 && x < 90; }

    // Trazado
    dato(e.L, 'L', 'Indica la longitud L entre tambores.', 'La longitud L debe ser mayor que 0.', positivo);
    if (dato(e.H, 'H', 'Indica el desnivel H (0 si la cinta es horizontal).') && e.L > 0 && Math.abs(e.H) >= e.L)
      error('El desnivel |H| debe ser menor que la longitud L.', 'H');

    if (e.modo === 'diseno') {
      var m = e.material || {};
      dato(e.Q, 'Q', 'Indica la capacidad Q.', 'La capacidad Q debe ser mayor que 0.', positivo);
      dato(m.densidad, 'material.densidad', 'Indica la densidad aparente del material.', 'La densidad debe ser mayor que 0.', positivo);
      aMano(m.reposo, 'material.reposo', 'El ángulo de reposo no es un número válido.', 'El ángulo de reposo debe estar entre 0 y 90°.', function (x) { return x >= 0 && x < 90; });
      if (m.beta === 'auto') {
        if (m.reposo === null || m.reposo === undefined) error('Para proponer β hace falta el ángulo de reposo; si no lo tienes, indica β a mano.', 'material.reposo');
      } else dato(m.beta, 'material.beta', 'Indica el ángulo de sobrecarga β.', 'β debe estar entre 0 y 90°.', angulo);
      if (m.clase !== 'auto' && ['A', 'B', 'C', 'D'].indexOf(m.clase) < 0) error('Indica la clase de material (A, B, C o D).', 'material.clase');
      dato(m.tamMax, 'material.tamMax', 'Indica el tamaño máximo de terrón.', 'El tamaño máximo de terrón debe ser mayor que 0.', positivo);
      if (['uniforme', 'mezcla', 'gruesos'].indexOf(m.granulometria) < 0) error('Indica la granulometría del material.', 'material.granulometria');
      if ([1, 2, 3].indexOf(e.rodillos) < 0) error('El número de rodillos por estación debe ser 1, 2 o 3.', 'rodillos');
      if (e.rodillos === 2 || e.rodillos === 3) dato(e.lambda, 'lambda', 'Indica el ángulo de artesa λ.', 'λ debe estar entre 0 y 90°.', angulo);
      aMano(e.v, 'v', 'Indica la velocidad (o elige «Automática»).', 'La velocidad debe ser mayor que 0.', positivo);
      if (e.rodillos === 3 && e.l3Manual !== null && e.l3Manual !== undefined) {
        if (!esNumero(e.l3Manual)) error('Indica la longitud del rodillo central l3 (o elige «Figura 1.1»).', 'l3Manual');
        else if (!esNumero(e.B)) error('Para fijar l3 a mano, fija también el ancho B: l3 depende del ancho de banda.', 'l3Manual');
        else if (!(e.l3Manual >= 0)) error('La longitud del rodillo central l3 no puede ser negativa.', 'l3Manual');
      }
    } else {
      dato(e.B, 'B', 'Elige el ancho de banda B.', 'El ancho B debe ser mayor que 0.', positivo);
      dato(e.v, 'v', 'Indica la velocidad v.', 'La velocidad debe ser mayor que 0.', positivo);
      dato(e.qG, 'qG', 'Indica la masa lineal de material qG.', 'qG no puede ser negativa.', noNegativo);
    }

    // Banda y rodillos
    dato(e.qb, 'qb', 'Indica la masa lineal de la banda qb.', 'qb debe ser mayor que 0.', positivo);
    if (e.modoRodillos === 'porEstacion') {
      dato(e.mRO, 'mRO', 'Indica la masa giratoria de la estación superior.', 'La masa de la estación superior no puede ser negativa.', noNegativo);
      dato(e.mRU, 'mRU', 'Indica la masa giratoria de la estación inferior.', 'La masa de la estación inferior no puede ser negativa.', noNegativo);
    } else {
      dato(e.qRO, 'qRO', 'Indica la masa lineal de los rodillos superiores qRO.', 'qRO no puede ser negativa.', noNegativo);
      dato(e.qRU, 'qRU', 'Indica la masa lineal de los rodillos inferiores qRU.', 'qRU no puede ser negativa.', noNegativo);
    }
    dato(e.lSup, 'lSup', 'Indica la separación de los rodillos superiores.', 'La separación de los rodillos superiores debe ser mayor que 0.', positivo);
    dato(e.lInf, 'lInf', 'Indica la separación de los rodillos inferiores.', 'La separación de los rodillos inferiores debe ser mayor que 0.', positivo);
    dato(e.f, 'f', 'Indica el coeficiente f.', 'El coeficiente f debe ser mayor que 0.', positivo);

    // Resistencias (los campos opcionales vacíos llegan como 0; un texto no válido llega como NaN)
    if (metodoResistencias(e) === 'simplificado' && e.tablaC === 'manual')
      dato(e.C, 'C', 'Indica el coeficiente C.', 'El coeficiente C debe ser mayor que 0.', positivo);
    aMano(e.v0, 'v0', 'La velocidad de entrada v0 no es un número válido.');
    aMano(e.FNtamb, 'FNtamb', 'Las otras resistencias secundarias no son un número válido.', 'Las otras resistencias secundarias no pueden ser negativas.', noNegativo);
    aMano(e.FS1, 'FS1', 'FS1 no es un número válido.', 'FS1 no puede ser negativa.', noNegativo);
    aMano(e.FS2, 'FS2', 'FS2 no es un número válido.', 'FS2 no puede ser negativa.', noNegativo);

    // Accionamiento
    dato(e.eta, 'eta', 'Indica el rendimiento del motorreductor η.', 'El rendimiento η debe estar entre 0 y 1.', function (x) { return x > 0 && x <= 1; });
    dato(e.D, 'D', 'Indica el diámetro del tambor motriz.', 'El diámetro del tambor debe ser mayor que 0.', positivo);
    aMano(e.FuManual, 'FuManual', 'Indica Fu (o desmarca «Introducir la fuerza periférica Fu a mano»).');

    // Tensiones
    dato(e.mu, 'mu', 'Indica el coeficiente de rozamiento μ.', 'El coeficiente μ debe ser mayor que 0.', positivo);
    dato(e.theta, 'theta', 'Indica el ángulo de abrazamiento θ.', 'El ángulo de abrazamiento θ debe ser mayor que 0.', positivo);
    dato(e.hrelMax, 'hrelMax', 'Indica la flecha relativa máxima.', 'La flecha relativa máxima debe ser mayor que 0.', positivo);
    aMano(e.margenAdh, 'margenAdh', 'El margen de adherencia no es un número válido.', 'El margen de adherencia no puede ser negativo.', noNegativo);
    aMano(e.T2manual, 'T2manual', 'Indica T2 (o elige «Automática»).', 'T2 debe ser mayor que 0.', positivo);
    aMano(e.TlocalSup, 'TlocalSup', 'Indica la tensión local del ramal superior (o desmarca «Comprobar la flecha con tensiones locales»).', 'La tensión local del ramal superior debe ser mayor que 0.', positivo);
    aMano(e.TlocalInf, 'TlocalInf', 'Indica la tensión local del ramal inferior (o desmarca «Comprobar la flecha con tensiones locales»).', 'La tensión local del ramal inferior debe ser mayor que 0.', positivo);

    // Banda: capas
    dato(e.R, 'R', 'Indica la resistencia por capa R.', 'La resistencia por capa R debe ser mayor que 0.', positivo);
    dato(e.zMin, 'zMin', 'Indica el mínimo constructivo de capas.', 'El mínimo de capas debe ser un número entero mayor o igual que 1.', entero);
    aMano(e.zManual, 'zManual', 'Indica el número de capas (o elige «Automático»).', 'El número de capas debe ser un número entero mayor o igual que 1.', entero);
    return errores;
  }

  // Método de resistencias efectivo: el elegido o, en automático, global si L <= 80 m y simplificado si L > 80 m.
  function metodoResistencias(e) {
    if (e.metodoResistencias === 'global' || e.metodoResistencias === 'simplificado') return e.metodoResistencias;
    return e.L > 80 ? 'simplificado' : 'global';
  }

  /* ------------------------------------------------------------------ *
   * Cálculo completo                                                    *
   * ------------------------------------------------------------------ */

  function calcular(e, datos) {
    var R = { entrada: e, avisos: [], errores: validar(e) };
    function aviso(t) { R.avisos.push(t); }
    function error(t, campo) { R.errores.push({ texto: t, campo: campo || null }); }
    if (R.errores.length) return R;   // con datos incompletos o no válidos no se calcula nada

    // 1. Trazado
    var delta = inclinacion(e.L, e.H);
    var Kr = factorK(grados(delta), datos);
    R.trazado = { L: e.L, H: e.H, delta: delta, deltaGrados: grados(delta), K: Kr.K, Kinfo: Kr };
    if (Kr.fuera) aviso('La inclinación (' + txt(Math.abs(grados(delta)), 2) + '°) supera los 20° de la tabla 1.1: se toma K = 0,81. Las bandas lisas no suelen superar 18-20°.');
    if (e.H < 0) aviso('Cinta descendente: FSt es negativa y la gravedad ayuda al movimiento.');

    // 2. Capacidad (modo diseño) o carga conocida (modo comprobación)
    var B, v, qG;
    if (e.modo === 'diseno') {
      var cap = disenarCapacidad(e, datos, Kr.K, aviso, error);
      R.capacidad = cap;
      if (R.errores.length) return R;
      B = cap.B; v = cap.v; qG = cap.qG;
    } else {
      B = e.B; v = e.v; qG = e.qG;
      R.capacidad = { modo: 'comprobacion', B: B, v: v, qG: qG, Q: 3.6 * qG * v };
    }

    // 3. Masas lineales de banda y rodillos
    var qRO = e.qRO, qRU = e.qRU;
    if (e.modoRodillos === 'porEstacion') { qRO = e.mRO / e.lSup; qRU = e.mRU / e.lInf; }
    R.masas = { qb: e.qb, qRO: qRO, qRU: qRU, qG: qG, modoRodillos: e.modoRodillos, mRO: e.mRO, mRU: e.mRU, lSup: e.lSup, lInf: e.lInf };

    // 4. Resistencias
    var metodo = metodoResistencias(e);
    var Cinfo = null, C = null;
    if (metodo === 'simplificado') {
      if (e.tablaC === 'manual') { C = e.C; Cinfo = { C: C, tabla: 'manual', erratas: [] }; }
      else {
        Cinfo = coeficienteC(e.L, e.tablaC === 'UC3M' ? 'UC3M' : 'DIN', datos); C = Cinfo.C;
        if (Cinfo.fuera) aviso('L = ' + txt(e.L) + ' m está fuera de la tabla de C elegida: se toma el valor del extremo (C = ' + txt(C, 2) + ').');
        Cinfo.erratas.forEach(function (er) {
          aviso('Posible errata en la tabla CL de la UC3M usada (L = ' + txt(er.L) + ' m: C = ' + txt(er.valor) + '). ' + er.nota);
        });
      }
      if (e.L <= 80) aviso('El método simplificado con C está pensado para L > 80 m (T1_6, apartado 2.2.2).');
    } else if (e.L > 80 && e.metodoResistencias === 'global') {
      aviso('Con L > 80 m los apuntes recomiendan el método simplificado con C.');
    }
    var res = resistencias({ metodo: metodo, L: e.L, H: e.H, delta: delta, f: e.f, C: C, qRO: qRO, qRU: qRU, qb: e.qb, qG: qG,
                             v: v, v0: e.v0 || 0, FNtamb: e.FNtamb || 0, FS1: e.FS1 || 0, FS2: e.FS2 || 0 });
    res.Cinfo = Cinfo;
    R.resistencias = res;

    // 5. Fuerza periférica de cálculo (la calculada o la introducida a mano)
    var Fu = esNumero(e.FuManual) ? e.FuManual : res.Fu;
    R.Fu = Fu; R.FuEsManual = esNumero(e.FuManual);

    // 6. Accionamiento
    R.accionamiento = accionamiento(Fu, v, e.eta, e.D);

    // 7. Tensiones
    if (!(Fu > 0)) {
      if (Fu < 0) aviso('Fu < 0: la cinta tiende a acelerarse sola y necesita freno o recuperación de energía (T1_6, apartado 2.1.5). La app no dimensiona el freno ni calcula las tensiones en este caso.');
      else aviso('Fu = 0: no hace falta transmitir fuerza en el tambor motriz; no se calculan las tensiones.');
      R.comprobaciones = comprobaciones(R, e);
      return R;
    }
    R.tensiones = tensiones({ Fu: Fu, mu: e.mu, thetaGrados: e.theta, margenAdh: (e.margenAdh || 0) / 100, qb: e.qb, qG: qG,
                              lSup: e.lSup, lInf: e.lInf, hrelMax: e.hrelMax / 100, delta: delta,
                              T2manual: esNumero(e.T2manual) ? e.T2manual : null,
                              TlocalSup: esNumero(e.TlocalSup) ? e.TlocalSup : null,
                              TlocalInf: esNumero(e.TlocalInf) ? e.TlocalInf : null });

    // 8. Banda: número de capas
    R.banda = capas(R.tensiones.T1, B, e.R, e.zMin, esNumero(e.zManual) ? e.zManual : null, datos);
    R.banda.B = B; R.banda.R = e.R;
    if (R.banda.z >= 10) aviso('Salen muchas capas: valora una banda más ancha o un tejido más resistente (T1_6, ejemplo 6).');

    R.comprobaciones = comprobaciones(R, e);
    return R;
  }

  // Selección de ancho y velocidad a partir de la capacidad pedida (modo diseño).
  function disenarCapacidad(e, datos, K, aviso, error) {
    var m = e.material;
    var c = { modo: 'diseno', metodo: e.metodoCapacidad === 'volumetrico' ? 'volumetrico' : 'masico', Q: e.Q, K: K };
    var nR = e.rodillos;
    var lambda = nR === 1 ? 0 : e.lambda;
    // beta: automático por fluidez o a mano
    var beta = m.beta, betaInfo = null;
    if (m.beta === 'auto') { betaInfo = sugerirBeta(m.reposo, datos); beta = betaInfo.beta; }
    // clase A-D: automática o a mano
    var clase = m.clase, claseInfo = null;
    if (m.clase === 'auto') { claseInfo = sugerirClase(m.densidad, m.abrasividad); clase = claseInfo.clase; }
    c.rodillos = nR; c.lambda = lambda; c.beta = beta; c.betaInfo = betaInfo; c.clase = clase; c.claseInfo = claseInfo;
    c.densidad = m.densidad;

    // Ancho mínimo por terrón (el aviso de beta > 30° solo si se usa la tabla 1.2)
    var am = anchoMinimo(m.tamMax, m.granulometria, beta, datos);
    c.anchoMinimo = am;
    if (am.avisoBeta) aviso('β > 30°: la tabla de terrones (1.2) solo llega a 30°; se usa la fila de 20-30°.');
    if (am.Bmin === null) { error('Ningún ancho de la tabla 1.3 admite un terrón de ' + txt(m.tamMax) + ' mm con esa granulometría.', 'material.tamMax'); return c; }

    // l3 a mano: solo con 3 rodillos y B fijado (validado en validar()); se aplica solo a ese ancho
    var l3Manual = nR === 3 && esNumero(e.l3Manual) ? e.l3Manual : null;

    // Candidatos: todos los anchos de la tabla 1.3
    var filas = datos.anchosVelocidades.filas;
    c.candidatos = filas.map(function (f) {
      var cand = { B: f.B, vmax: f.vmax[clase], porTerron: f.B >= am.Bmin };
      if (c.metodo === 'masico') {
        var l3 = l3Manual !== null && f.B === e.B ? l3Manual : longitudRodilloCentral(f.B, nR, datos);
        if (l3 === null) { cand.sinDato = 'Sin longitud de rodillo para este ancho.'; return cand; }
        var b = anchoUtil(f.B / 1000);
        if (l3 / 1000 > b + 1e-12) {
          cand.sinDato = 'l3 = ' + txt(l3) + ' mm es mayor que la anchura útil b = ' + txt(b * 1000) + ' mm de la banda de ' + f.B + ' mm.';
          cand.l3Invalido = true;
          return cand;
        }
        var sec = seccionMasica(f.B / 1000, l3 / 1000, lambda, beta);
        cand.l3 = l3; cand.b = sec.b; cand.S1 = sec.S1; cand.S2 = sec.S2; cand.S = sec.S;
        cand.c1 = 3600 * sec.S * m.densidad * K;               // t/h por cada m/s
      } else {
        var iv = ivt(f.B, nR, lambda, beta, datos);
        if (iv.error) { cand.sinDato = iv.error; return cand; }
        cand.IVT = iv.IVT; cand.ivtInfo = iv;
        cand.c1 = iv.IVT * m.densidad * K;
      }
      // Defensa: una sección o un caudal nulos o negativos no son válidos
      if (!(cand.c1 > 0)) { cand.sinDato = 'Sección de material no válida (capacidad por m/s menor o igual que 0).'; return cand; }
      cand.vReq = e.Q / cand.c1;
      cand.vDIN = siguienteVelocidadDIN(cand.vReq, datos);
      cand.cumple = cand.porTerron && cand.vDIN !== null && cand.vDIN <= cand.vmax + 1e-12;
      return cand;
    });

    // Elección de B
    var elegido = null;
    var vManual = esNumero(e.v) ? e.v : null;
    if (esNumero(e.B)) {
      elegido = c.candidatos.filter(function (k) { return k.B === e.B; })[0];
      if (!elegido) { error('El ancho B = ' + txt(e.B) + ' mm no está en la tabla 1.3.', 'B'); return c; }
      c.Bauto = false;
    } else {
      c.Bauto = true;
      var validos = c.candidatos.filter(function (k) { return !k.sinDato && k.porTerron; });
      if (vManual !== null) {
        // Velocidad fijada a mano (versión 3.0): el menor ancho que da la capacidad con esa velocidad
        // sin superar su velocidad máxima (tabla 1.3). Si ninguno la respeta, el menor que da la
        // capacidad, con aviso (la comprobación de velocidad máxima sale en rojo).
        var conCapacidad = validos.filter(function (k) { return k.c1 * vManual >= e.Q * (1 - 1e-12); });
        elegido = conCapacidad.filter(function (k) { return vManual <= k.vmax + 1e-12; })[0];
        if (elegido && elegido !== conCapacidad[0]) {
          // Se explica por qué sale un ancho mayor que el menor que da la capacidad
          var saltados = conCapacidad.filter(function (k) { return k.B < elegido.B; });
          var enAuto = validos.filter(function (k) { return k.cumple; })[0];
          aviso('Con v = ' + txt(vManual) + ' m/s, ' + (saltados.length === 1 ?
                'el ancho de ' + saltados[0].B + ' mm alcanza la capacidad pero supera su velocidad máxima (' + txt(saltados[0].vmax, 2) + ' m/s)' :
                'los anchos de ' + saltados[0].B + ' a ' + saltados[saltados.length - 1].B + ' mm alcanzan la capacidad pero superan su velocidad máxima') +
                ': se elige ' + elegido.B + ' mm.' +
                (enAuto && enAuto.B < elegido.B ? ' Con la velocidad automática bastaría un ancho de ' + enAuto.B + ' mm (v = ' + txt(enAuto.vDIN, 2) + ' m/s).' : ''));
        }
        if (!elegido && conCapacidad.length) {
          elegido = conCapacidad[0];
          aviso('Con v = ' + txt(vManual) + ' m/s, ningún ancho que alcanza la capacidad respeta la velocidad máxima de la tabla 1.3 (clase ' + clase + '): se muestra el menor (' + elegido.B + ' mm). Baja la velocidad o elige «Automática».');
        }
      } else {
        elegido = validos.filter(function (k) { return k.cumple; })[0];
      }
      if (!elegido) {
        elegido = validos[validos.length - 1];
        if (!elegido) {
          var sinDato = c.candidatos.filter(function (k) { return k.sinDato; })[0];
          error(sinDato ? sinDato.sinDato : 'No hay anchos con datos para esta estación y método.', 'metodoCapacidad');
          return c;
        }
        aviso('Ningún ancho de la tabla alcanza la capacidad pedida dentro de los límites: se muestra el mayor (' + elegido.B + ' mm).');
      }
    }
    if (elegido.sinDato) { error(elegido.sinDato, elegido.l3Invalido ? 'l3Manual' : 'B'); return c; }
    c.B = elegido.B; c.elegido = elegido; c.vmax = elegido.vmax;
    // Elección de v
    if (vManual !== null) { c.v = vManual; c.vauto = false; }
    else {
      c.vauto = true;
      c.v = elegido.vDIN !== null ? elegido.vDIN : datos.velocidadesNormalizadas.valores.slice(-1)[0];
    }
    c.Qmax = elegido.c1 * c.v;                 // capacidad máxima con ese ancho y velocidad
    c.llenado = e.Q / c.Qmax;
    c.qG = e.Q / (3.6 * c.v);                  // kg/m
    c.vNormalizada = datos.velocidadesNormalizadas.valores.some(function (x) { return Math.abs(x - c.v) < 1e-9; });

    // Posibles erratas de las tablas Rulmeca: se avisa de las de todos los anchos evaluados
    // hasta el elegido, porque una errata en un ancho menor puede cambiar la elección.
    if (c.metodo === 'volumetrico') {
      var evaluados = c.Bauto ? c.candidatos.filter(function (k) { return k.porTerron && !k.sinDato && k.B <= c.B; }) : [elegido];
      var nombres = { plano: '5a', dosRodillos: '5b', tresRodillos: '5c' };
      var vistas = {};
      evaluados.forEach(function (k) {
        (k.ivtInfo ? k.ivtInfo.erratas : []).forEach(function (er) {
          var clave = er.tabla + '|' + er.B + '|' + er.lambda + '|' + er.beta;
          if (vistas[clave]) return;
          vistas[clave] = true;
          aviso('Posible errata en la tabla Rulmeca ' + nombres[er.tabla] + ' usada para el ancho de ' + er.B + ' mm (λ = ' + er.lambda + '°, β = ' + er.beta + '°: ' + txt(er.valor) + '). ' + er.nota +
                (k.B !== c.B ? ' Con el valor corregido, la elección del ancho podría cambiar.' : ''));
        });
      });
      if (elegido.ivtInfo.fuera) aviso('β fuera del intervalo 5-30° de la tabla Rulmeca: se toma el valor del extremo.');
    }
    if (!c.vNormalizada) aviso('La velocidad ' + txt(c.v) + ' m/s no es normalizada (DIN 22101).');
    return c;
  }

  // Lista de comprobaciones finales (verde / rojo).
  function comprobaciones(R, e) {
    var lista = [];
    var c = R.capacidad;
    if (c && c.modo === 'diseno' && esNumero(c.Qmax)) {
      lista.push({ id: 'capacidad', texto: 'Capacidad', ok: c.Qmax >= c.Q * (1 - 1e-9), detalle: { Qmax: c.Qmax, Q: c.Q } });
      lista.push({ id: 'velocidad', texto: 'Velocidad máxima del material', ok: c.v <= c.vmax + 1e-12, detalle: { v: c.v, vmax: c.vmax } });
      lista.push({ id: 'terron', texto: 'Ancho mínimo por tamaño de terrón', ok: c.B >= c.anchoMinimo.Bmin, detalle: { B: c.B, Bmin: c.anchoMinimo.Bmin } });
    }
    if (R.tensiones) {
      var t = R.tensiones;
      lista.push({ id: 'adherencia', texto: 'Adherencia en el tambor motriz', ok: t.adherenciaOk, detalle: { relacion: t.relacion, k: t.k } });
      lista.push({ id: 'flechaSup', texto: 'Flecha en el ramal superior', ok: t.hrelSup <= e.hrelMax / 100 * (1 + 1e-12), detalle: { hrel: t.hrelSup } });
      lista.push({ id: 'flechaInf', texto: 'Flecha en el ramal inferior', ok: t.hrelInf <= e.hrelMax / 100 * (1 + 1e-12), detalle: { hrel: t.hrelInf } });
    }
    if (R.banda) lista.push({ id: 'rotura', texto: 'Resistencia de la banda', ok: R.banda.ok, detalle: { T1: R.tensiones.T1, Tadm: R.banda.Tadm } });
    return lista;
  }

  var API = {
    G: G, rad: rad, grados: grados, interpolar: interpolar, factorK: factorK, inclinacion: inclinacion,
    anchoUtil: anchoUtil, longitudRodilloCentral: longitudRodilloCentral, seccionMasica: seccionMasica, ivt: ivt,
    sugerirBeta: sugerirBeta, sugerirClase: sugerirClase, anchoMinimo: anchoMinimo, velocidadMaxima: velocidadMaxima,
    siguienteVelocidadDIN: siguienteVelocidadDIN, coeficienteC: coeficienteC, resistencias: resistencias,
    accionamiento: accionamiento, tensiones: tensiones, coefSeguridad: coefSeguridad, capas: capas,
    validar: validar, metodoResistencias: metodoResistencias, calcular: calcular, leerNumero: leerNumero
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.Calculos = API;
})(this);

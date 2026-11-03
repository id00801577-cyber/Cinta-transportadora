/*
 * pruebas.js - Comprobación del motor de cálculo con los ejercicios resueltos de los apuntes.
 *
 * Autor: Alberto Jorge Lorenzo - Transporte y Manutención Industrial (USAL).
 *
 * Cada comprobación compara el valor de la app, redondeado a los decimales que dan los apuntes,
 * con el valor de los apuntes:
 *   - "cuadra": coincide con los apuntes.
 *   - "explicada": no coincide porque los apuntes redondean pasos intermedios o tienen una errata;
 *     coincide con el valor correcto recalculado (se explica en la nota y en el Readme).
 *   - "falla": no coincide con ninguno. No debe aparecer nunca.
 *
 * Funciona en el navegador (pruebas.html) y en Node: node -e "require('./js/pruebas.js')..."
 */
(function (raiz) {
  'use strict';

  function casos(C, datos) {
    var ej = {};
    (datos.ejemplos || []).forEach(function (e) { ej[e.id] = e.entrada; });
    var lista = [];
    function caso(id, fuente, descripcion, calcula, checks) { lista.push({ id: id, fuente: fuente, descripcion: descripcion, calcula: calcula, checks: checks }); }
    // check: [clave, etiqueta, valorApuntes, decimales, unidad, valorCorrecto?, nota?]

    // ---------------- T1_6 ----------------
    var p1 = { metodo: 'global', L: 60, H: 0, delta: 0, f: 0.02, qRO: 10, qRU: 0, qb: 8, qG: 25, v: 2, v0: 0, FNtamb: 20, FS1: 0, FS2: 40 };
    var r1 = C.resistencias(p1);
    caso('T1_6-1', 'T1_6, ejemplo 1', 'Resistencias por el método global (L = 60 m)',
      function () { return { FH: r1.FH, Facc: r1.Facc, FN: r1.FN, Fu: r1.Fu }; },
      [['FH', 'FH', 600.37, 2, 'N'], ['Facc', 'FN,acc', 100, 2, 'N'], ['FN', 'FN', 120, 2, 'N'], ['Fu', 'Fu', 760.37, 2, 'N']]);

    caso('T1_6-2', 'T1_6, ejemplo 2', 'Método simplificado con C de DIN 22101 (L = 200 m)',
      function () {
        var c = C.coeficienteC(200, 'DIN', datos).C;
        var r = C.resistencias({ metodo: 'simplificado', L: 200, H: 0, delta: 0, f: 0.02, C: c, qRO: 10, qRU: 0, qb: 8, qG: 25, v: 2, v0: 0, FNtamb: 0, FS1: 0, FS2: 40 });
        return { C: c, LC: r.LC, FHN: r.FHN, Fu: r.Fu, Pu: r.Fu * 2 / 1000 };
      },
      [['C', 'C (tabla DIN 22101)', 1.45, 2, ''], ['LC', 'LC', 290, 1, 'm'], ['FHN', 'FH + FN', 2901.80, 2, 'N'], ['Fu', 'Fu', 2941.80, 2, 'N'], ['Pu', 'Pu', 5.88, 2, 'kW']]);

    caso('T1_6-3', 'T1_6, ejemplo 3', 'Potencia, par y velocidad de giro (cinta del ejemplo 1)',
      function () { var a = C.accionamiento(r1.Fu, 2, 0.90, 400); return { Pu: a.Pu, Pmotor: a.Pmotor / 1000, M: a.M, omega: a.omega, n: a.n }; },
      [['Pu', 'Pu', 1520.74, 2, 'W'], ['Pmotor', 'P en el eje del motor', 1.69, 2, 'kW'], ['M', 'M tambor', 152.07, 2, 'N·m'], ['omega', 'omega', 10, 2, 'rad/s'], ['n', 'n', 95.5, 1, 'rpm']]);

    var base5 = { qb: 8, qG: 25, lSup: 1.2, lInf: 2.4, hrelMax: 0.01, delta: 0, margenAdh: 0, TlocalSup: null, TlocalInf: null };
    function ten(extra) { var p = {}; var k; for (k in base5) p[k] = base5[k]; for (k in extra) p[k] = extra[k]; return C.tensiones(p); }
    caso('T1_6-4', 'T1_6, ejemplo 4', 'Adherencia: T2 mínima y reserva (Fu del ejemplo 1)',
      function () {
        var a = ten({ Fu: r1.Fu, mu: 0.30, thetaGrados: 180, T2manual: 400 });
        var b = ten({ Fu: r1.Fu, mu: 0.30, thetaGrados: 180, T2manual: 600 });
        return { k: a.k, rel: a.relacion, Fumax400: a.FuMaxAdh, T2adh: a.T2adh, T1lim: a.T2adh + r1.Fu, Fumax600: b.FuMaxAdh, res600: b.reservaAdh * 100 };
      },
      [['k', 'e^(mu theta)', 2.5663, 4, ''], ['rel', 'T1/T2 con T2 = 400 N', 2.901, 3, ''], ['Fumax400', 'Fu,máx con T2 = 400 N', 626.53, 2, 'N'],
       ['T2adh', 'T2,mín por adherencia', 485.45, 2, 'N'], ['T1lim', 'T1 en el límite', 1245.82, 2, 'N'], ['Fumax600', 'Fu,máx con T2 = 600 N', 939.80, 2, 'N'],
       ['res600', 'Reserva de adherencia', 23.6, 1, '%']]);

    caso('T1_6-5', 'T1_6, ejemplo 5', 'Flecha entre rodillos y tensiones mínimas (1 %)',
      function () {
        var t = ten({ Fu: 1000, mu: 0.3, thetaGrados: 180, T2manual: 1000, TlocalSup: 5000, TlocalInf: 2500 });
        return { hSup: t.hSup * 1000, hrelSup: t.hrelSup * 100, hInf: t.hInf * 1000, hrelInf: t.hrelInf * 100, TsupMin: t.TsupMin, TinfMin: t.TinfMin };
      },
      [['hSup', 'h ramal superior', 11.65, 2, 'mm'], ['hrelSup', 'h relativa superior', 0.971, 3, '%'], ['hInf', 'h ramal inferior', 22.60, 2, 'mm'],
       ['hrelInf', 'h relativa inferior', 0.942, 3, '%'], ['TsupMin', 'Tsup,mín', 4855.95, 2, 'N'], ['TinfMin', 'Tinf,mín', 2354.40, 2, 'N']]);

    caso('T1_6-6', 'T1_6, ejemplo 6', 'Número de capas (los apuntes adoptan 2 capas)',
      function () { var c = C.capas(18000, 800, 160, 2, null, datos); return { zc: c.tramos[0].zCalc, z: c.z, Tadm: c.Tadm, res: c.reserva }; },
      [['zc', 'z calculado (S = 11)', 1.547, 3, ''], ['z', 'z adoptado', 2, 0, 'capas'],
       ['Tadm', 'Tadm', 32000, 2, 'N', 23272.73, 'Errata de los apuntes: 160 x 2 x 800 / 11 = 256 000 / 11 = 23 272,73 N (no 32 000 N).'],
       ['res', 'Tadm / Tmáx', 1.78, 2, '', 1.29, 'Consecuencia de la errata anterior: 23 272,73 / 18 000 = 1,29.']]);

    caso('T1_6-7', 'T1_6, ejemplo 7', 'Resistencias con desnivel H = 4 m (método global)',
      function () {
        var d = C.inclinacion(50, 4);
        var r = C.resistencias({ metodo: 'global', L: 50, H: 4, delta: d, f: 0.025, qRO: 12, qRU: 0, qb: 10, qG: 30, v: 1.5, v0: 0.5, FNtamb: 25, FS1: 0, FS2: 50 });
        return { d: C.grados(d), FH: r.FH, Facc: r.Facc, FN: r.FN, FSt: r.FSt, Fu: r.Fu };
      },
      [['d', 'delta', 4.59, 2, '°'], ['FH', 'FH', 758.31, 2, 'N'], ['Facc', 'FN,acc', 45, 2, 'N'], ['FN', 'FN', 70, 2, 'N'], ['FSt', 'FSt', 1177.2, 1, 'N'], ['Fu', 'Fu', 2055.51, 2, 'N']]);

    caso('T1_6-8', 'T1_6, ejemplo 8', 'Método simplificado con desnivel H = 12 m y C = 1,35 dado',
      function () {
        var d = C.inclinacion(250, 12);
        var r = C.resistencias({ metodo: 'simplificado', L: 250, H: 12, delta: d, f: 0.025, C: 1.35, qRO: 12, qRU: 0, qb: 9, qG: 30, v: 2.5, v0: 0, FNtamb: 0, FS1: 0, FS2: 60 });
        return { d: C.grados(d), LC: r.LC, FHN: r.FHN, FSt: r.FSt, Fu: r.Fu, Pu: r.Fu * 2.5 / 1000 };
      },
      [['d', 'alfa', 2.75, 2, '°'], ['LC', 'LC', 337.5, 1, 'm'], ['FHN', 'FH + FN', 4961.73, 2, 'N'], ['FSt', 'FSt', 3531.60, 2, 'N'], ['Fu', 'Fu', 8553.33, 2, 'N'], ['Pu', 'Pu', 21.38, 2, 'kW']]);

    if (ej.integrado) {
      caso('T1_6-int', 'T1_6, ejemplo integrado (págs. 39-44)', 'Cálculo completo con la app (ejemplo precargado)',
        function () {
          var R = C.calcular(ej.integrado, datos), r = R.resistencias, a = R.accionamiento, t = R.tensiones, b = R.banda;
          return { d: R.trazado.deltaGrados, C: r.C, LC: r.LC, FHN: r.FHN, FSt: r.FSt, Fu: r.Fu, Pu: a.Pu / 1000, Pm: a.Pmotor / 1000, M: a.M, n: a.n,
                   k: t.k, T2adh: t.T2adh, T1: t.T1, rel: t.relacion, Fumax: t.FuMaxAdh, res: t.reservaAdh * 100,
                   hSup: t.hSup * 1000, hrelSup: t.hrelSup * 100, hInf: t.hInf * 1000, hrelInf: t.hrelInf * 100, TsupMin: t.TsupMin, TinfMin: t.TinfMin,
                   zc: b.tramos[0].zCalc, z: b.z, Tadm: b.Tadm, errores: R.errores.length };
        },
        [['errores', 'Errores de entrada', 0, 0, ''], ['d', 'delta', 2.87, 2, '°'], ['C', 'C (DIN 22101, L = 200 m)', 1.45, 2, ''], ['LC', 'LC', 290, 1, 'm'],
         ['FHN', 'FH + FN', 2898.88, 2, 'N'], ['FSt', 'FSt', 2452.50, 2, 'N'], ['Fu', 'Fu', 5391.38, 2, 'N'], ['Pu', 'Pu', 10.78, 2, 'kW'],
         ['Pm', 'P en el eje del motor', 11.98, 2, 'kW'], ['M', 'M tambor', 1078.28, 2, 'N·m'], ['n', 'n', 95.5, 1, 'rpm'], ['k', 'e^(mu theta)', 2.5663, 4, ''],
         ['T2adh', 'T2,mín por adherencia', 3442, 0, 'N'], ['T1', 'T1 con T2 = 4000 N', 9391.38, 2, 'N'], ['rel', 'T1/T2', 2.3478, 4, ''],
         ['Fumax', 'Fu,máx por adherencia', 6265, 0, 'N'], ['res', 'Reserva de adherencia', 16.2, 1, '%'], ['hSup', 'h superior (6000 N)', 9.70, 2, 'mm'],
         ['hrelSup', 'h relativa superior', 0.81, 2, '%'], ['hInf', 'h inferior (4000 N)', 14.11, 2, 'mm'], ['hrelInf', 'h relativa inferior', 0.59, 2, '%'],
         ['TsupMin', 'Tsup,mín', 4849.88, 2, 'N'], ['TinfMin', 'Tinf,mín', 2351.46, 2, 'N'], ['zc', 'z calculado (S = 11)', 0.807, 3, ''],
         ['z', 'z adoptado (mínimo constructivo)', 3, 0, 'capas'], ['Tadm', 'Tadm', 34909, 0, 'N']]);
    }

    caso('T1_6-9', 'T1_6, ejemplo 9', 'Ángulo de abrazamiento mínimo y tambor de reenvío',
      function () {
        var a = ten({ Fu: 8000, mu: 0.30, thetaGrados: 180, T2manual: 3000 });
        var b = ten({ Fu: 8000, mu: 0.30, thetaGrados: 270, T2manual: 3000 });
        return { k1: a.k, Fumax1: a.FuMaxAdh, thmin: C.grados(a.thetaMin), k2: b.k, Fumax2: b.FuMaxAdh, res: b.reservaAdh * 100, rel: b.relacion };
      },
      [['k1', 'e^(mu theta) con 180°', 2.566, 3, ''],
       ['Fumax1', 'Fu,máx con 180°', 4698, 0, 'N', 4699, 'Redondeo de los apuntes: usan e^(mu theta) = 2,566; con el valor exacto (2,56633) sale 4699 N.'],
       ['thmin', 'theta mínimo', 248.1, 1, '°'],
       ['k2', 'e^(mu theta) con 270°', 4.112, 3, '', 4.111, 'Redondeo de los apuntes: e^1,41372 = 4,1112.'],
       ['Fumax2', 'Fu,máx con 270°', 9336, 0, 'N', 9334, 'Consecuencia del redondeo anterior: 3000 x 3,1112 = 9334 N.'],
       ['res', 'Reserva de adherencia', 16.7, 1, '%'], ['rel', 'T1/T2', 3.667, 3, '']]);

    caso('T1_6-10', 'T1_6, ejemplo 10', 'Elección entre aumentar T2 o el ángulo de abrazamiento',
      function () {
        var a = ten({ Fu: 12000, mu: 0.28, thetaGrados: 180, T2manual: 3500 });
        var b = ten({ Fu: 12000, mu: 0.28, thetaGrados: 315, T2manual: 3500 });
        var c = C.capas(15500, 800, 160, 3, 3, datos);
        return { k: a.k, Fumax: a.FuMaxAdh, T2adh: a.T2adh, T1adh: a.T2adh + 12000, thmin: C.grados(a.thetaMin), k2: b.k, Fumax2: b.FuMaxAdh, res: b.reservaAdh * 100, Tadm: c.Tadm };
      },
      [['k', 'e^(mu theta) con 180°', 2.410, 3, ''], ['Fumax', 'Fu,máx con T2 = 3500 N', 4935, 0, 'N'],
       ['T2adh', 'T2 necesaria por adherencia', 8511, 0, 'N', 8510, 'Los apuntes redondean e^(mu theta) a 2,410; con el valor exacto sale 8510,4 N.'],
       ['T1adh', 'T1 correspondiente', 20511, 0, 'N', 20510, 'Consecuencia del redondeo anterior.'],
       ['thmin', 'theta mínimo', 304.5, 1, '°'], ['k2', 'e^(mu theta) con 315°', 4.662, 3, ''],
       ['Fumax2', 'Fu,máx con 315°', 12817, 0, 'N', 12816, 'Redondeo de los apuntes: 3500 x 3,6617 = 12 816 N.'],
       ['res', 'Reserva de adherencia', 6.8, 1, '%'], ['Tadm', 'Tadm (3 capas)', 34909, 0, 'N']]);

    caso('T1_6-11', 'T1_6, ejercicio 11', 'Potencia del motor y velocidad de giro',
      function () { var a = C.accionamiento(1000, 2, 0.90, 200); return { Pm: a.Pmotor, n: a.n }; },
      [['Pm', 'Potencia del motor', 2222.2, 1, 'W'], ['n', 'n', 191, 0, 'rpm']]);

    caso('T1_6-12', 'T1_6, ejercicio 12', 'Número de capas con iteración del coeficiente S',
      function () { var c = C.capas(125000, 800, 180, 3, null, datos); return { z12: c.tramos[1].zCalc, z13: c.tramos[2].zCalc, z: c.z, S: c.S }; },
      [['z12', 'z con S = 12', 10.42, 2, ''], ['z13', 'z con S = 13', 11.28, 2, ''], ['z', 'z adoptado', 12, 0, 'capas'], ['S', 'S final', 13, 0, '']]);

    caso('T1_6-13', 'T1_6, ejercicio 13', 'Capacidad de transporte con inclinación de 20°',
      function () { var K = C.factorK(20, datos).K; return { K: K, Q: 3600 * 0.014 * 1.68 * 1.5 * K }; },
      [['K', 'K (20°)', 0.81, 2, ''],
       ['Q', 'Q', 103.1, 1, 't/h', 102.9, 'Errata de los apuntes: 3,6 x 1,68 x 0,014 x 1500 x 0,81 = 102,88 t/h (no 103,1).']]);

    caso('T1_6-14', 'T1_6, ejercicio 14', 'Tensión mínima del ramal flojo (100 kW a 2 m/s)',
      function () { var t = ten({ Fu: 100000 / 2, mu: 0.2, thetaGrados: 160, T2manual: null }); return { k: t.k, T2: t.T2adh / 1000 }; },
      [['k', 'e^(mu theta)', 1.748, 3, ''],
       ['T2', 'T2 mínima', 66.85, 2, 'kN', 66.84, 'Redondeo de los apuntes: 50 000 / 0,748 = 66 844,9 N = 66,84 kN; con el valor exacto de e^(mu theta) (1,74806) sale 66 839,8 N = 66,84 kN.']]);

    caso('T1_6-15', 'T1_6, ejercicio 15', 'Separación máxima entre rodillos (20 kN, 150 kg/m, 1 %)',
      function () { var t = C.tensiones({ Fu: 1000, mu: 0.3, thetaGrados: 180, margenAdh: 0, qb: 150, qG: 0, lSup: 1, lInf: 1, hrelMax: 0.01, delta: 0, T2manual: 1000, TlocalSup: 20000, TlocalInf: null }); return { l: t.lSupMax }; },
      [['l', 'l0,máx', 1.087, 3, 'm']]);

    caso('T1_6-A6', 'T1_6, apéndice A.6', 'Flecha con q = 15 kg/m, L = 4 m y T = 3000 N',
      function () { var t = C.tensiones({ Fu: 1000, mu: 0.3, thetaGrados: 180, margenAdh: 0, qb: 15, qG: 0, lSup: 4, lInf: 4, hrelMax: 0.01, delta: 0, T2manual: 1000, TlocalSup: 3000, TlocalInf: null }); return { h: t.hSup }; },
      [['h', 'Flecha máxima', 0.098, 3, 'm']]);

    // ---------------- T1_4.1 ----------------
    caso('T1_4.1-2', 'T1_4.1, ejemplo 2', 'Sección de material con B = 650 mm y beta = 15°',
      function () {
        var a = C.seccionMasica(0.65, 0, 0, 15), b = C.seccionMasica(0.65, 0, 30, 15), c = C.seccionMasica(0.65, 0.25, 45, 15);
        return { b: a.b, S1r: a.S, S2a: b.S1, S2b: b.S2, S2r: b.S, S3a: c.S1, S3b: c.S2, S3r: c.S };
      },
      [['b', 'b', 0.535, 3, 'm'], ['S1r', 'S con 1 rodillo', 0.01278, 5, 'm²'], ['S2a', 'S1 con 2 rodillos a 30°', 0.00959, 5, 'm²'],
       ['S2b', 'S2 con 2 rodillos a 30° (cos lambda)', 0.03098, 5, 'm²'], ['S2r', 'S con 2 rodillos a 30°', 0.04057, 5, 'm²'],
       ['S3a', 'S1 con 3 rodillos a 45°', 0.00910, 5, 'm²'], ['S3b', 'S2 con 3 rodillos a 45° (cos lambda)', 0.03534, 5, 'm²'],
       ['S3r', 'S con 3 rodillos a 45°', 0.04444, 5, 'm²', 0.04445, 'Redondeo de los apuntes: suman S1 y S2 ya redondeados; el valor exacto es 0,044449 m².']]);

    if (ej.granito) {
      caso('T1_4.1-3', 'T1_4.1, ejemplo 3', 'Granito fino 100 t/h: de la capacidad a la potencia (ejemplo precargado)',
        function () {
          var R = C.calcular(ej.granito, datos), c = R.capacidad, el = c.elegido;
          return { B: c.B, b: el.b, l3: el.l3, S1: el.S1, S2: el.S2, S: el.S, vreq: el.vReq, vmax: c.vmax, qG: c.qG, C: R.resistencias.C, Fu: R.resistencias.Fu, P: R.accionamiento.Pmotor / 1000, errores: R.errores.length };
        },
        [['errores', 'Errores de entrada', 0, 0, ''], ['B', 'B mínimo (tabla 1.3)', 400, 0, 'mm'], ['b', 'b', 0.31, 2, 'm'], ['l3', 'l3', 160, 0, 'mm'],
         ['S1', 'S1', 0.00375, 5, 'm²'], ['S2', 'S2', 0.008435, 6, 'm²', 0.008436, 'Los apuntes truncan: S2 = 0,0084357 m².'],
         ['S', 'S', 0.012185, 6, 'm²', 0.012189, 'Los apuntes suman S1 y S2 redondeados; el valor exacto es 0,0121890 m².'],
         ['vreq', 'v necesaria', 1.52, 2, 'm/s'], ['vmax', 'v máxima (clase C, 400 mm)', 2.09, 2, 'm/s'], ['qG', 'qG (v = 1,52 m/s)', 18.27, 2, 'kg/m'],
         ['C', 'CL (tabla UC3M, 100 m)', 1.7, 1, ''],
         ['Fu', 'Fu', 1068.56, 2, 'N', 1068.71, 'Los apuntes usan qG redondeado a 18,27 kg/m; con 100 / (3,6 x 1,52) = 18,275 kg/m sale 1068,71 N.'],
         ['P', 'Potencia del motor', 1.91, 2, 'kW']]);
    }

    if (ej.caliza1500) {
      caso('T1_4.1-1', 'T1_4.1, ejemplo 1', 'Caliza 1500 t/h: elección de ancho y velocidad con la tabla Rulmeca (ejemplo precargado)',
        function () {
          var R = C.calcular(ej.caliza1500, datos), c = R.capacidad;
          var k800 = c.candidatos.filter(function (k) { return k.B === 800; })[0], k1000 = c.candidatos.filter(function (k) { return k.B === 1000; })[0];
          return { d: R.trazado.deltaGrados, K: R.trazado.K, Bmin: c.anchoMinimo.Bmin, ivt800: k800.IVT, Q800: k800.c1 * 3.35, ivt1000: k1000.IVT, Q1000: c.Qmax, B: c.B, v: c.v, errores: R.errores.length };
        },
        [['errores', 'Errores de entrada', 0, 0, ''],
         ['d', 'Inclinación', 10.73, 2, '°', 10.74, 'Los apuntes truncan: arcsen(150/805) = 10,738°.'],
         ['K', 'K', 0.95, 2, '', 0.94, 'Los apuntes toman K aproximado; interpolando la tabla 1.1 entre 10° y 12° sale 0,9426.'],
         ['Bmin', 'B mínimo por terrón (3 x 250 mm)', 800, 0, 'mm'], ['ivt800', 'IVT con 800 mm (beta 15° interpolado)', 258, 0, 'm³/h'],
         ['Q800', 'Q con 800 mm a 3,35 m/s', 1150, 0, 't/h', 1143, 'Diferencia por K: con K = 0,9426 sale 1143 t/h. La conclusión no cambia (no llega a 1500 t/h).'],
         ['ivt1000', 'IVT con 1000 mm', 415, 0, 'm³/h', 419, 'Interpolando la tabla Rulmeca entre beta = 10° (368,6) y 20° (469,8) sale 419,2 m³/h; los apuntes toman 415 de las diapositivas de la UC3M.'],
         ['Q1000', 'Q con 1000 mm a 3,35 m/s', 1849, 0, 't/h', 1853, 'Consecuencia de IVT y K anteriores. La conclusión no cambia.'],
         ['B', 'B elegido', 1000, 0, 'mm'], ['v', 'v elegida', 3.35, 2, 'm/s']]);
    }
    return lista;
  }

  function redondear(x, d) { var f = Math.pow(10, d); return Math.round(x * f + (x >= 0 ? 1e-9 : -1e-9)) / f; }

  function ejecutar(C, datos) {
    var resultados = [], total = { cuadra: 0, explicada: 0, falla: 0 };
    casos(C, datos).forEach(function (cs) {
      var valores, err = null;
      try { valores = cs.calcula(); } catch (e) { err = String(e); valores = {}; }
      var filas = cs.checks.map(function (ch) {
        var clave = ch[0], etiqueta = ch[1], apuntes = ch[2], d = ch[3], unidad = ch[4], correcto = ch[5], nota = ch[6];
        var v = valores[clave];
        var estado;
        if (typeof v !== 'number' || !isFinite(v)) estado = 'falla';
        else if (redondear(v, d) === redondear(apuntes, d)) estado = 'cuadra';
        else if (typeof correcto === 'number' && redondear(v, d) === redondear(correcto, d)) estado = 'explicada';
        else estado = 'falla';
        total[estado]++;
        return { etiqueta: etiqueta, app: v, apuntes: apuntes, correcto: correcto, decimales: d, unidad: unidad, estado: estado, nota: nota || (err ? 'Error: ' + err : '') };
      });
      resultados.push({ id: cs.id, fuente: cs.fuente, descripcion: cs.descripcion, filas: filas });
    });
    return { casos: resultados, total: total };
  }

  /* ------------------------------------------------------------------ *
   * Pruebas de robustez (versiones 2.0 y 3.0)                           *
   * Casos de la revisión independiente de la versión 1.0: datos a mano  *
   * incompletos, valores fuera de rango, cinta descendente y avisos de  *
   * erratas. Casos de la revisión de la versión 2.0 (M1 y M4):          *
   * velocidad fijada a mano y números con punto de miles.               *
   * Cada comprobación es sí / no.                                       *
   * ------------------------------------------------------------------ */
  function casosRobustez(C, datos) {
    var lista = [];
    var base = (datos.ejemplos || []).filter(function (e) { return e.id === 'diseno'; })[0];
    if (!base) return lista;
    function entrada(cambios) {
      var e = JSON.parse(JSON.stringify(base.entrada));
      for (var k in cambios) {
        if (k === 'material') { for (var j in cambios.material) e.material[j] = cambios.material[j]; }
        else e[k] = cambios[k];
      }
      return e;
    }
    function errorEn(R, campo) { return R.errores.some(function (er) { return er.campo === campo; }); }
    function textoError(R, campo) { var er = R.errores.filter(function (x) { return x.campo === campo; })[0]; return er ? er.texto : 'sin error'; }
    function hayAviso(R, trozo) { return R.avisos.some(function (a) { return a.indexOf(trozo) >= 0; }); }
    function caso(id, descripcion, filas) { lista.push({ id: id, descripcion: descripcion, filas: filas }); }
    function fila(etiqueta, ok, detalle) { return { etiqueta: etiqueta, ok: !!ok, detalle: detalle || '' }; }
    function coma(x, d) { return typeof x === 'number' && isFinite(x) ? x.toFixed(d).replace('.', ',').replace('-', '\u2212') : '-'; }

    // Referencia: el ejemplo de diseño no cambia
    var R0 = C.calcular(base.entrada, datos);
    caso('2.0', 'Ejemplo de diseño (caliza, 400 t/h): los resultados no cambian desde la versión 1.0', [
      fila('B = 650 mm y v = 2,09 m/s', R0.capacidad.B === 650 && R0.capacidad.v === 2.09, 'B = ' + R0.capacidad.B + ' mm, v = ' + coma(R0.capacidad.v, 2) + ' m/s'),
      fila('Fu = 10 029,08 N', redondear(R0.Fu, 2) === 10029.08, 'Fu = ' + coma(R0.Fu, 2) + ' N'),
      fila('Potencia del motor = 23,29 kW', redondear(R0.accionamiento.Pmotor / 1000, 2) === 23.29, coma(R0.accionamiento.Pmotor / 1000, 2) + ' kW'),
      fila('T1 = 18 129,08 N y 3 capas', redondear(R0.tensiones.T1, 2) === 18129.08 && R0.banda.z === 3, 'T1 = ' + coma(R0.tensiones.T1, 2) + ' N, z = ' + R0.banda.z)
    ]);

    // 2.1 l3 a mano
    var R1 = C.calcular(entrada({ l3Manual: 500 }), datos);
    var R2 = C.calcular(entrada({ l3Manual: 500, B: 400 }), datos);
    var R3 = C.calcular(entrada({ l3Manual: 300, B: 650 }), datos);
    caso('2.1', 'Rodillo central l3 a mano', [
      fila('Con B automático da error en l3 y no calcula', errorEn(R1, 'l3Manual') && !R1.capacidad, textoError(R1, 'l3Manual')),
      fila('Con B = 400 mm y l3 = 500 mm > b da error', errorEn(R2, 'l3Manual'), textoError(R2, 'l3Manual')),
      fila('Con B = 650 mm y l3 = 300 mm calcula con sección positiva', !R3.errores.length && R3.capacidad.B === 650 && R3.capacidad.elegido.S > 0,
           R3.capacidad && R3.capacidad.elegido ? 'S = ' + coma(R3.capacidad.elegido.S, 6) + ' m²' : ''),
      fila('Ningún ancho candidato tiene capacidad por m/s ≤ 0', R3.capacidad.candidatos.every(function (k) { return k.sinDato || k.c1 > 0; }), '')
    ]);

    // 2.2 campos "a mano" sin valor
    var manuales = [['T2manual', 'T2 a mano'], ['FuManual', 'Fu a mano'], ['TlocalSup', 'Tensión local superior'], ['TlocalInf', 'Tensión local inferior'],
                    ['zManual', 'Número de capas a mano'], ['v', 'Velocidad «Otra» en modo diseño']];
    var filas22 = manuales.map(function (m) {
      var cambios = {}; cambios[m[0]] = NaN;
      var R = C.calcular(entrada(cambios), datos);
      return fila(m[1] + ' vacío: error en rojo', errorEn(R, m[0]), textoError(R, m[0]));
    });
    var Rl3 = C.calcular(entrada({ B: 650, l3Manual: NaN }), datos);
    filas22.push(fila('l3 a mano vacío: error en rojo', errorEn(Rl3, 'l3Manual'), textoError(Rl3, 'l3Manual')));
    var Rauto = C.calcular(entrada({ T2manual: null, FuManual: null, TlocalSup: null, TlocalInf: null, zManual: null, v: null }), datos);
    filas22.push(fila('En automático (null) no hay errores', !Rauto.errores.length, ''));
    caso('2.2', 'Opciones «A mano» con el campo vacío', filas22);

    // 2.5 cinta descendente
    var R5 = C.calcular(entrada({ H: -12 }), datos);
    caso('2.5', 'Cinta descendente con Fu < 0 (H = −12 m)', [
      fila('Fu < 0', R5.Fu < 0, 'Fu = ' + coma(R5.Fu, 2) + ' N'),
      fila('No se calcula una potencia del motor negativa', R5.accionamiento.frenado === true && R5.accionamiento.Pmotor === null, 'Pu = ' + coma(R5.accionamiento.Pu / 1000, 2) + ' kW'),
      fila('Aviso de que hace falta freno', hayAviso(R5, 'necesita freno'), ''),
      fila('No se calculan tensiones', !R5.tensiones, '')
    ]);

    // 2.6 avisos de erratas
    var R6 = C.calcular(entrada({ metodoResistencias: 'simplificado', tablaC: 'UC3M', L: 4, H: 0 }), datos);
    var R7 = C.calcular(entrada({ metodoCapacidad: 'volumetrico', lambda: 25, Q: 80, L: 50, H: 0,
      material: { densidad: 1, reposo: null, abrasividad: null, beta: 10, clase: 'A', tamMax: 10, granulometria: 'uniforme' } }), datos);
    caso('2.6', 'Avisos de posibles erratas en las tablas', [
      fila('Tabla UC3M con L = 4 m: avisa de la errata', hayAviso(R6, 'Posible errata en la tabla CL'), 'C = ' + (R6.resistencias ? coma(R6.resistencias.C, 1) : '-')),
      fila('Rulmeca: elige 500 mm y avisa de la errata del candidato de 400 mm', R7.capacidad.B === 500 && hayAviso(R7, 'ancho de 400 mm'), 'B = ' + R7.capacidad.B + ' mm')
    ]);

    // Detalles menores
    var R8 = C.calcular(entrada({ H: 60 }), datos);
    var R9 = C.calcular(entrada({ zMin: NaN }), datos);
    var R10 = C.calcular(entrada({ Q: -5 }), datos);
    var R11 = C.calcular(entrada({ material: { granulometria: 'uniforme', beta: 35 } }), datos);
    var R12 = C.calcular(entrada({ material: { beta: 35 } }), datos);
    var R13 = C.calcular(entrada({ FS2: NaN }), datos);
    caso('menores', 'Detalles menores', [
      fila('Los avisos usan coma decimal (inclinación de 23,58°)', hayAviso(R8, '23,58°'), ''),
      fila('Mínimo de capas vacío: error', errorEn(R9, 'zMin'), textoError(R9, 'zMin')),
      fila('Q = −5 t/h: «debe ser mayor que 0» en el campo Q', errorEn(R10, 'Q') && textoError(R10, 'Q').indexOf('mayor que 0') >= 0, textoError(R10, 'Q')),
      fila('Granulometría uniforme con β = 35°: sin aviso de la tabla 1.2', !hayAviso(R11, 'tabla de terrones'), ''),
      fila('Mezcla con β = 35°: con aviso de la tabla 1.2', hayAviso(R12, 'tabla de terrones'), ''),
      fila('Texto no válido en un campo opcional (FS2): error', errorEn(R13, 'FS2'), textoError(R13, 'FS2'))
    ]);

    // Versión 3.0 (revisión independiente de la versión 2.0)
    // M1: velocidad fijada a mano con el ancho automático
    function velocidad(R) { return (R.comprobaciones || []).filter(function (k) { return k.id === 'velocidad'; })[0] || {}; }
    var Rm1 = C.calcular(entrada({ v: 3.35 }), datos);
    var Rm2 = C.calcular(entrada({ v: 4.19 }), datos);
    var Rm3 = C.calcular(entrada({ v: 5.24, material: { clase: 'C' } }), datos);
    var Rm4 = C.calcular(entrada({ v: 2.09 }), datos);
    caso('M1', 'Velocidad fijada a mano con el ancho automático (ejemplo de diseño, clase B)', [
      fila('v = 3,35 m/s: elige 800 mm (vmáx 3,35 m/s) y no 650 mm (vmáx 2,62 m/s), y avisa de que en automático bastarían 650 mm',
           !Rm1.errores.length && Rm1.capacidad.B === 800 && velocidad(Rm1).ok === true && hayAviso(Rm1, 'bastaría un ancho de 650 mm'),
           'B = ' + (Rm1.capacidad ? Rm1.capacidad.B : '-') + ' mm, vmáx = ' + (Rm1.capacidad ? coma(Rm1.capacidad.vmax, 2) : '-') + ' m/s'),
      fila('v = 4,19 m/s: elige 1600 mm, el primero con vmáx ≥ 4,19 m/s', !Rm2.errores.length && Rm2.capacidad.B === 1600 && velocidad(Rm2).ok === true,
           'B = ' + (Rm2.capacidad ? Rm2.capacidad.B : '-') + ' mm, vmáx = ' + (Rm2.capacidad ? coma(Rm2.capacidad.vmax, 2) : '-') + ' m/s'),
      fila('v = 5,24 m/s con clase C (ningún ancho la admite): muestra el menor con capacidad, avisa y la comprobación sale en rojo',
           !Rm3.errores.length && Rm3.capacidad.B === 500 && hayAviso(Rm3, 'ningún ancho que alcanza la capacidad respeta la velocidad máxima') && velocidad(Rm3).ok === false,
           'B = ' + (Rm3.capacidad ? Rm3.capacidad.B : '-') + ' mm, vmáx = ' + (Rm3.capacidad ? coma(Rm3.capacidad.vmax, 2) : '-') + ' m/s'),
      fila('v = 2,09 m/s (la que elige la app): mismo ancho que en automático, 650 mm', !Rm4.errores.length && Rm4.capacidad.B === 650 && Rm4.capacidad.B === R0.capacidad.B,
           'B = ' + (Rm4.capacidad ? Rm4.capacidad.B : '-') + ' mm')
    ]);

    // M4: números con punto de miles
    function lee(t) { return C.leerNumero(t); }
    var a1 = lee('1.500'), a2 = lee('12.000'), a3 = lee('1.500,5');
    var bien = [['1500', 1500], ['1 500', 1500], ['1,5', 1.5], ['2.5', 2.5], ['0.500', 0.5], ['-12', -12]];
    caso('M4', 'Números escritos con punto de miles («1.500»)', [
      fila('«1.500» no se lee como 1,5: se pide aclarar si es 1500 o 1,5', a1.ambiguo && isNaN(a1.valor) && a1.comoMiles === '1500' && a1.comoDecimal === '1,5',
           '¿' + a1.comoMiles + ' o ' + a1.comoDecimal + '?'),
      fila('«12.000» tampoco se interpreta (¿12000 o 12?)', a2.ambiguo && isNaN(a2.valor) && a2.comoMiles === '12000' && a2.comoDecimal === '12',
           '¿' + a2.comoMiles + ' o ' + a2.comoDecimal + '?'),
      fila('«1.500,5» (punto de miles y coma decimal): se pide escribir 1500,5', a3.ambiguo && isNaN(a3.valor) && a3.comoMiles === '1500,5', a3.comoMiles),
      fila('«1500», «1 500», «1,5», «2.5», «0.500» y «-12» se leen bien', bien.every(function (p) { var r = lee(p[0]); return !r.ambiguo && r.valor === p[1]; }),
           bien.map(function (p) { return coma(lee(p[0]).valor, p[1] % 1 ? 1 : 0); }).join('; ')),
      fila('Texto vacío o que no es un número: NaN, y el motor da el error', isNaN(lee('').valor) && isNaN(lee('abc').valor) && errorEn(C.calcular(entrada({ Q: lee('abc').valor }), datos), 'Q'),
           textoError(C.calcular(entrada({ Q: NaN }), datos), 'Q'))
    ]);
    return lista;
  }

  function ejecutarRobustez(C, datos) {
    var total = { ok: 0, falla: 0 }, resultados = [];
    casosRobustez(C, datos).forEach(function (cs) {
      cs.filas.forEach(function (f) { total[f.ok ? 'ok' : 'falla']++; });
      resultados.push(cs);
    });
    return { casos: resultados, total: total };
  }

  var API = { ejecutar: ejecutar, ejecutarRobustez: ejecutarRobustez, redondear: redondear };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.Pruebas = API;
})(this);

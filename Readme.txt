===============================================================================
 DIMENSIONADO DE CINTAS TRANSPORTADORAS - APLICACIÓN WEB
 Transporte y Manutención Industrial
 Máster Universitario en Ingeniería Industrial - Universidad de Salamanca
 Autor: Alberto Jorge Lorenzo
 Versión 3.0 - 3 de noviembre de 2026 (historial en el apartado 13)
===============================================================================

ÍNDICE
  1. Qué hace la aplicación
  2. Cómo abrirla
  3. Archivos del proyecto
  4. Funcionamiento de la interfaz
  5. Método de cálculo
  6. Tablas de datos (data/datos.json) y fuentes
  7. Decisiones de cálculo y diferencias con los apuntes
  8. Verificación: ejercicios de los apuntes y pruebas de robustez
  9. Ejemplo resuelto paso a paso
 10. Ejemplos precargados
 11. Hipótesis y limitaciones
 12. Bibliografía
 13. Historial de versiones


-------------------------------------------------------------------------------
1. QUÉ HACE LA APLICACIÓN
-------------------------------------------------------------------------------
Dimensiona una cinta transportadora de banda textil con el método de los
apuntes de la asignatura (T1_6, basado en ISO 5048 y DIN 22101) y de las notas
T1_4.1. Recorre la cadena completa de cálculo:

  material y capacidad pedida
    -> ancho mínimo de banda por tamaño de terrón
    -> ancho y velocidad que dan la capacidad
    -> resistencias al avance y fuerza periférica Fu
    -> potencia del motor, par y velocidad de giro del tambor
    -> tensiones T1 y T2 (adherencia y flecha)
    -> número de capas de la banda y comprobación de rotura

Cada resultado se muestra con su desarrollo: fórmula, valores sustituidos,
resultado con unidades y fuente (documento, ecuación o tabla). Al final, una
lista de comprobaciones indica en verde o rojo si el diseño cumple.

La aplicación tiene dos modos:
  - Diseño completo: la app elige el ancho y la velocidad a partir del
    material y de la capacidad.
  - Comprobación con carga conocida: se dan el ancho B, la velocidad v y la
    masa de material por metro qG, como en los ejemplos de T1_6.


-------------------------------------------------------------------------------
2. CÓMO ABRIRLA
-------------------------------------------------------------------------------
a) En Internet (GitHub Pages):
       https://id00801577-cyber.github.io/Cinta-transportadora/
     Código fuente (repositorio de GitHub):
       https://github.com/id00801577-cyber/Cinta-transportadora

  b) Sin conexión: descomprimir el ZIP y abrir index.html con doble clic.
     Los navegadores no dejan leer archivos .json desde el disco, así que en
     ese caso la app usa js/datos-respaldo.js, una copia automática de
     data/datos.json. El pie de página indica de dónde se han cargado los
     datos.

No necesita instalación ni librerías externas: es HTML, CSS y JavaScript
estándar. Probada en Chromium (el motor de Chrome y Edge), con tamaño de
pantalla de ordenador y de móvil.


-------------------------------------------------------------------------------
3. ARCHIVOS DEL PROYECTO
-------------------------------------------------------------------------------
  index.html            Página principal: formulario y resultados.
  css/estilos.css       Estilos (pantalla, móvil e impresión).
  js/calculos.js        Motor de cálculo. Funciones puras: reciben datos y
                        devuelven resultados, sin tocar la página.
  js/app.js             Interfaz: lee el formulario, llama al motor y pinta
                        los resultados con el desarrollo paso a paso.
  data/datos.json       Todas las tablas (con su fuente) y los ejemplos.
  js/datos-respaldo.js  Copia automática de datos.json para abrir la app con
                        doble clic. No se edita a mano.
  pruebas.html          Página de pruebas: compara la app con los ejercicios
  js/pruebas.js         resueltos de los apuntes y comprueba cómo responde a
                        datos incompletos o fuera de rango (robustez).
  Readme.txt            Este documento.

Separar el motor (calculos.js) de la interfaz (app.js) permite probar los
cálculos por separado, sin la página, y que el código no lleve números
sueltos: todos los datos salen de datos.json.


-------------------------------------------------------------------------------
4. FUNCIONAMIENTO DE LA INTERFAZ
-------------------------------------------------------------------------------
La página tiene dos columnas: datos a la izquierda y resultados a la derecha
(en el móvil, una debajo de otra). Los resultados se recalculan al cambiar
cualquier dato; no hay botón de calcular.

Barra superior
  - Ejemplo: carga uno de los ejemplos precargados (apartado 10).
  - Imprimir o guardar en PDF: imprime los resultados con todo el desarrollo
    y una tabla con los datos de partida.
  - Pruebas con los ejercicios: abre pruebas.html.

Bloques de datos
  1. Material (solo en modo diseño). Se elige de la tabla de T1_3.2 (123
     materiales) o se introduce a mano. Al elegirlo se proponen la densidad
     (media del intervalo de la tabla), el ángulo de reposo y la
     abrasividad. A partir de ellos la app propone:
       - el ángulo de sobrecarga beta, con la tabla de fluidez (T1_4.1);
       - la clase de material A-D de la tabla 1.3 de T1_6.
     Ambos se pueden fijar a mano. Al elegir otro material de la tabla, beta
     vuelve a «Por fluidez» si el material tiene ángulo de reposo, y la
     clase vuelve a «Automática». También se piden el tamaño máximo de
     terrón y la granulometría (uniforme, 10 % gruesos o 100 % gruesos).
  2. Trazado y capacidad: capacidad Q (t/h), longitud entre tambores L,
     desnivel H (negativo si la cinta baja), rodillos por estación (1, 2 o
     3), ángulo de artesa lambda y método de capacidad (másico o
     volumétrico). El ancho B y la velocidad v pueden ser automáticos o
     fijarse a mano. Con la velocidad a mano y el ancho automático, la app
     elige el menor ancho que da la capacidad con esa velocidad sin superar
     su velocidad máxima (apartado 5.3). La longitud del rodillo central l3
     solo se puede fijar a mano si también se fija B, porque depende del
     ancho. En modo comprobación se piden B, v y qG. Al pasar a modo
     diseño, B y v vuelven a «Automático»; al pasar a modo comprobación se
     parte del ancho y la velocidad del último diseño calculado.
  3. Banda y rodillos: masa de la banda qb y de los rodillos (por metro, o
     por estación junto con la separación), separación de rodillos y
     coeficiente f. Junto a los campos aparecen valores orientativos del
     catálogo Rotrans para el ancho elegido.
  4. Resistencias: método global, simplificado con C o automático (global si
     L <= 80 m), tabla de C (DIN 22101, UC3M o valor a mano), velocidad de
     entrada del material v0 y resistencias localizadas FN, FS1 y FS2.
  5. Accionamiento: rendimiento del motorreductor y diámetro del tambor
     motriz (con lista de diámetros normalizados).
  6. Tensiones: coeficiente de rozamiento mu (tabla de T1_5.1 o valor a
     mano), ángulo de abrazamiento, flecha relativa máxima, T2 automática o a
     mano, margen sobre la adherencia, tensiones locales opcionales para la
     flecha y Fu a mano (para comprobar casos con Fu conocida).
  7. Banda: resistencia por capa R (tejidos EP 100 a EP 630), mínimo
     constructivo de capas y número de capas automático o a mano.

Resultados
  - Resultado: cifras clave (B, v, capacidad, qG, Fu, potencia, par,
    tensiones y banda).
  - Comprobaciones: capacidad, velocidad máxima, ancho por terrón,
    adherencia, flecha en los dos ramales y rotura, en verde o rojo.
  - Avisos: valores fuera de tabla, velocidades no normalizadas, posibles
    erratas en las tablas usadas, etc.
  - Desarrollo: secciones 0 a 7 con cada paso del cálculo. La sección de
    capacidad incluye la tabla de anchos candidatos y un esquema a escala de
    la sección de material sobre la banda.
  - Si falta un dato, no es un número o está fuera de rango, aparece un
    mensaje en rojo, el campo se marca en rojo y no se calcula nada hasta
    corregirlo. Al pulsar el mensaje, la página lleva al campo. Esto vale
    también para las opciones «A mano»: si se elige «A mano» y el campo se
    deja vacío, es un error; la app no pasa al valor automático sin avisar.
    Los decimales se pueden escribir con coma o con punto, y los miles van
    sin separador (1500). Un número como «1.500» es ambiguo (¿1500 o 1,5?):
    la app no lo interpreta y pide escribirlo sin punto de miles o con coma
    decimal.
  - Las secciones del desarrollo que se abren o cierran se quedan así al
    cambiar datos; al cargar un ejemplo vuelven a su estado inicial.


-------------------------------------------------------------------------------
5. MÉTODO DE CÁLCULO
-------------------------------------------------------------------------------
Unidades: L, H, b, separaciones en m; B y diámetros en mm; masas lineales en
kg/m; fuerzas en N; Q en t/h; densidad en t/m3; g = 9,81 m/s2.

5.1 Trazado
  delta = arcsen(H / L)                       (L entre centros de tambores)
  K: tabla 1.1 de T1_6 con interpolación lineal (ejercicio 13); K = 1 por
     debajo de 2 grados; por encima de 20 grados se toma 0,81 y se avisa.

5.2 Material y ancho mínimo
  beta (sobrecarga) por fluidez, según el ángulo de reposo:
     hasta 20 -> 5 grados; 20-30 -> 10; 30-40 -> 20 (tabla: 20-25); > 40 -> 30.
  Clase A-D (tabla 1.3): la más exigente entre la de la densidad
     (A < 1; B 1-1,5; C 1,5-2; D > 2 t/m3) y la de la abrasividad
     (no abrasivo -> A; poco abrasivo -> B; muy abrasivo -> D).
  Ancho mínimo = el mayor de:
     - tabla 1.3: primer ancho cuyo tamaño máximo (columna uniforme o mixto)
       admite el terrón;
     - tabla 1.2 (solo si hay terrones): B >= factor x tamaño máximo, con
       factor 3 o 5 (beta <= 20) y 6 o 10 (20 < beta <= 30), redondeado al
       ancho normalizado siguiente (aplicación de T1_4.1, ejemplo 1).

5.3 Capacidad, ancho y velocidad
  Anchura útil: b = 0,9·B - 0,05 (B <= 2 m);  b = B - 0,2 (B > 2 m)
  Método másico (T1_6, ec. 1.1 y 1.2):
     S1 = [l3 + (b - l3)·cos(lambda)]^2 · tg(beta) / 6
     S2 = [l3 + (b - l3)/2·cos(lambda)] · [(b - l3)/2·sen(lambda)]
     S  = S1 + S2
     Q  = 3600·S·v·rho·K
     l3 de la figura 1.1 con 3 rodillos; l3 = 0 con 1 o 2; lambda = 0 con 1.
  Método volumétrico (T1_6, ec. 1.3; tablas Rulmeca de T1_4.2):
     Q = IVT·v·rho·K, con IVT (m3/h a 1 m/s) interpolado linealmente en beta.
  Elección (modo diseño): para cada ancho normalizado se calcula la
  capacidad por cada m/s, c1, la velocidad necesaria v = Q / c1 y la menor
  velocidad DIN 22101 que la cubre. Se elige el menor ancho, no inferior al
  mínimo por terrón, cuya velocidad DIN no supere la máxima del material
  (tabla 1.3). Así se cumple el criterio de los apuntes (cinta lo más
  estrecha posible) sin sobredimensionar la velocidad.
  Con la velocidad fijada a mano se elige el menor ancho que da la
  capacidad con esa velocidad sin superar su velocidad máxima. Si para ello
  hace falta un ancho mayor que el menor que da la capacidad, un aviso lo
  explica e indica el ancho que bastaría con la velocidad automática. Si
  ningún ancho admite esa velocidad, se muestra el menor que da la
  capacidad, con un aviso, y la comprobación de velocidad sale en rojo.
  l3 a mano: solo con el ancho B fijado y con 0 <= l3 <= b. Además, se
  descarta cualquier ancho cuya capacidad por m/s (c1) no sea positiva.
  Grado de llenado = Q / Qmáx.   Masa de material: qG = Q / (3,6·v).

5.4 Resistencias al avance (T1_6, cap. 2)
  Método global (L <= 80 m):
     FH = f·L·g·[qRO + qRU + (2·qb + qG)·cos(delta)]
     FN = Im·(v - v0) + otras secundarias, con Im = qG·v
     Fu = FH + FN + FS1 + FS2 + FSt
  Método simplificado (L > 80 m):
     LC = C·L
     FH + FN = f·LC·g·[qRO + qRU + (2·qb + qG)·cos(delta)]
     Fu = (FH + FN) + FS1 + FS2 + FSt
  FSt = qG·g·H (negativa si la cinta baja).
  C de la tabla DIN 22101 (por defecto) o de la tabla UC3M, interpolando.
  Si las masas de rodillos se dan por estación: qRO = mRO / lsup y
  qRU = mRU / linf.

5.5 Potencia y accionamiento (T1_6, ec. 3.7 y 4.14)
  Pu = Fu·v      Pmotor = Pu / eta      M = Fu·r      w = v / r
  n = 60·w / (2·pi)
  Si Fu < 0 (cinta descendente que se acelera sola), Pu es negativa: la
  cinta entrega potencia al tambor y hace falta freno o recuperación de
  energía (T1_6, apartado 2.1.5). Los apuntes no tratan el freno, así que
  la app no calcula la potencia del motor ni las tensiones: muestra Pu, el
  par de frenado y un aviso.

5.6 Tensiones (T1_6, cap. 3 y apartado 4.3)
  Límite de Euler-Eytelwein: T1/T2 <= e^(mu·theta), theta en radianes.
  T2,adh   = Fu / (e^(mu·theta) - 1)
  Tsup,mín = (qb + qG)·g·cos(delta)·lsup / (8·h/l)
  Tinf,mín = qb·g·cos(delta)·linf / (8·h/l)
  T2,mín   = máx(T2,adh; Tsup,mín; Tinf,mín)                (ec. 4.12)
  T2 adoptada (automática) = máx(T2,adh·(1 + margen); Tsup,mín; Tinf,mín),
     redondeada al alza a 100 N (a 10 N si es menor de 1000 N). El margen
     solo afecta a la adherencia, para no trabajar en el límite de
     deslizamiento. También se puede fijar a mano.
  T1 = T2 + Fu
  Fu,máx = T2·(e^(mu·theta) - 1)     Reserva = Fu,máx / Fu - 1
  Ángulo mínimo de abrazamiento con esa T2: theta,mín = ln(Fu/T2 + 1) / mu
  Flechas: h = q·g·cos(delta)·l^2 / (8·T), con T = T2, como en los apuntes
     (ec. 4.12), o con las tensiones locales que se introduzcan a mano. Con
     el motor en cabeza, T2 solo es la tensión mínima de la banda si
     qb·g·H no supera las resistencias del ramal de retorno (apartado 11).
  Separación máxima de rodillos: l,máx = 8·T·(h/l) / (q·g·cos(delta)).

5.7 Número de capas (T1_6, cap. 4)
  z >= S·T1 / (R·B), con S de la tabla 4.1: 11 (3-5 capas), 12 (6-9),
  13 (más de 9). Como S depende de z, se busca el menor z, no inferior al
  mínimo constructivo (3 por defecto), que cumple R·z·B / S(z) >= T1. Es la
  iteración del ejercicio 12, hecha de forma exhaustiva.
  Tadm = R·z·B / S   y se comprueba T1 <= Tadm.


-------------------------------------------------------------------------------
6. TABLAS DE DATOS (data/datos.json) Y FUENTES
-------------------------------------------------------------------------------
Cada tabla del JSON lleva su campo "fuente". Todas se han comprobado contra
los PDF originales.

  velocidadesNormalizadas  T1_6, tabla 1.4 (DIN 22101)
  factorInclinacion        T1_6, tabla 1.1
  factorTerron             T1_6, tabla 1.2
  anchosVelocidades        T1_6, tabla 1.3 (ancho mínimo, tamaño máximo y
                           velocidades máximas por clase A-D)
  longitudRodillos         T1_6, figura 1.1
  capacidadVolumetrica     T1_4.2, tablas Rulmeca 5a (planas), 5b (2
                           rodillos) y 5c (3 rodillos), IVT a 1 m/s
  materiales               T1_3.2, tabla Rulmeca 2 (123 materiales)
  fluidez                  T1_4.1 figura 7 y T1_3.1 diapositiva 10
  coeficienteF             Resumen Tablas, diapositiva 7 (y UC3M)
  coeficienteC.DIN22101    DIN 22101, tabla 7 de "Phoenix Conveyor Belts
                           Design Fundamentals" (valor usado en T1_6, ej. 2)
  coeficienteC.UC3M        UC3M diapositiva 10, T1_4.1 y Resumen Tablas
  coeficienteMu            T1_5.1, diapositiva 9
  coeficienteSeguridad     T1_6, tabla 4.1 (DIN 22101)
  tejidosEP                Catálogo Rotrans, tabla B2
  orientativos             Catálogo Rotrans, tablas A (separación de
                           estaciones) y B (peso de banda)
  diametrosTambor          UC3M, diapositiva 7 (DIN 22101)
  ejemplos                 Entradas completas de los ejemplos precargados

Posibles erratas detectadas en las tablas originales. Se mantienen tal cual
y la app avisa cuando el cálculo las usa: en las tablas Rulmeca, para todos
los anchos evaluados hasta el elegido, porque una errata en un ancho menor
puede cambiar la elección; en la tabla CL de la UC3M, cuando C sale de
L = 4 m o se interpola con ese valor.
  - Rulmeca 5a (planas), 800 mm, beta 30: 198,3 (se esperaría unos 234).
  - Rulmeca 5b (2 rodillos), 1000 mm, beta 5: 317,1, mayor que con beta 10.
  - Rulmeca 5c (3 rodillos), 400 mm, lambda 25, beta 10: 29,2 (¿39,2?).
  - Rulmeca 5c, 2800 mm, beta 30, lambda 30: 5185,6 (¿4785,6?).
  - Tabla CL de UC3M, L = 4 m: 5,6, menor que para 5 m (6,6); ¿7,6?


-------------------------------------------------------------------------------
7. DECISIONES DE CÁLCULO Y DIFERENCIAS CON LOS APUNTES
-------------------------------------------------------------------------------
Los documentos de la asignatura no siempre coinciden. Estas son las
decisiones tomadas y su justificación:

 1. Sección S2 con cos(lambda). T1_6 (ec. 1.1), UC3M y Resumen Tablas
    escriben 1/cos(lambda), pero ISO 5048 y los ejemplos numéricos del propio
    profesor (T1_4.1, ejemplos 2 y 3) dan los resultados de cos(lambda). Por
    ejemplo, con B = 650 mm, 2 rodillos a 30 grados y beta = 15: S2 = 0,03098
    m2 en los apuntes, que es el valor con cos(lambda); con 1/cos(lambda)
    saldría 0,04131 m2. Geométricamente, S2 es un trapecio de bases l3 y
    l3 + (b - l3)·cos(lambda) y altura (b - l3)/2·sen(lambda).
 2. En FH, cos(delta) solo multiplica los términos de carga (2·qb + qG), como
    en ISO 5048 y en los ejemplos 7, 8 y el integrado de T1_6. La ec. 2.2 lo
    aplica a todo el corchete; la diferencia es mínima (ejemplo 7: 758,31 N
    frente a 757,84 N).
 3. La flecha incluye cos(delta), como el ejemplo integrado. En cintas
    horizontales coincide con la ec. 3.8.
 4. Coeficiente C: por defecto la tabla de DIN 22101, que es la que usa T1_6
    (ejemplo 2: C = 1,45 para 200 m). T1_4.1 usa otra tabla (UC3M: 1,7 para
    100 m), que se puede elegir. Entre ambas C difiere del 3 al 14 % según la
    longitud. También se puede dar C a mano (T1_6, ejemplo 8: C = 1,35).
 5. Mínimo constructivo de 3 capas, editable: la tabla 4.1 empieza en 3 y el
    ejemplo integrado adopta 3 (el ejemplo 6 adopta 2).
 6. Velocidad: la app redondea siempre a las velocidades normalizadas DIN
    22101. Para reproducir T1_4.1 ejemplo 3 (v = 1,52 m/s, no normalizada)
    se fija la velocidad a mano, y la app avisa.
 7. Ancho mínimo por terrón: se aplican las tablas 1.2 y 1.3 y se toma la más
    exigente.
 8. qb, qRO, qRU y separaciones de rodillos son datos (como en los apuntes);
    la app muestra valores orientativos del catálogo Rotrans como ayuda.
 9. La flecha se comprueba con T2, como en T1_6 (ec. 4.12). Con un único
    tambor motriz en cabeza, T2 es la tensión mínima de la banda solo si
    qb·g·H no supera las resistencias del ramal de retorno (apartado 11).
    Opcionalmente se pueden introducir tensiones locales, como hace el
    ejemplo integrado (6000 N y 4000 N).
10. La anchura útil para B > 2 m es b = B - 0,2, como en los apuntes.
    Conviene contrastarlo con ISO 5048, que según otras fuentes usa
    B - 0,25. Solo afecta a anchos de más de 2 m.
11. Valores de tabla con intervalo (mu, f desfavorable): se propone el valor
    bajo de mu, que exige más tensión (del lado de la seguridad).
12. La longitud del rodillo central l3 solo se puede fijar a mano con el
    ancho B fijado, y debe cumplir 0 <= l3 <= b. l3 depende del ancho
    (figura 1.1), así que un mismo valor no sirve para todos los anchos.
13. Cinta descendente con Fu < 0: no se calcula la potencia del motor, que
    saldría negativa. Los apuntes solo indican que hace falta freno o
    recuperación de energía (T1_6, apartado 2.1.5).

Erratas y redondeos de los apuntes (la app da el valor correcto):
  - T1_6, ejemplo 6: Tadm = 160·2·800/11 = 256 000/11 = 23 272,73 N, no
    32 000 N; la relación Tadm/Tmáx es 1,29, no 1,78.
  - T1_6, ejercicio 13: Q = 3,6·1,68·0,014·1500·0,81 = 102,88 t/h, no 103,1.
  - T1_6, ejercicio 14: T2 = 66,84 kN (los apuntes ponen 66,85 kN).
  - T1_6, ejemplos 9 y 10: los apuntes redondean e^(mu·theta) y obtienen
    Fu,máx = 4698, 9336 y 12 817 N; con el valor exacto salen 4699, 9334 y
    12 816 N. Las conclusiones no cambian.
  - T1_4.1, ejemplo 3: los apuntes usan qG = 18,27 kg/m redondeado y obtienen
    Fu = 1068,56 N; con qG = 100/(3,6·1,52) = 18,275 kg/m sale 1068,71 N. La
    potencia es 1,91 kW en ambos casos.
  - T1_4.1, ejemplo 1: los apuntes toman K = 0,95 e IVT = 415 m3/h para
    1000 mm; interpolando la tabla 1.1 (K = 0,9426) y la tabla Rulmeca
    (IVT = 419,2 m3/h) se obtienen 1143 t/h con 800 mm y 1853 t/h con
    1000 mm, frente a 1150 y 1849 t/h. La elección (1000 mm a 3,35 m/s) es la
    misma.


-------------------------------------------------------------------------------
8. VERIFICACIÓN: EJERCICIOS DE LOS APUNTES Y PRUEBAS DE ROBUSTEZ
-------------------------------------------------------------------------------
pruebas.html tiene dos bloques.

1) Comparación con los ejercicios resueltos: 128 comprobaciones con T1_6
(ejemplos 1 a 10, ejemplo integrado, ejercicios 11 a 15 y apéndice A.6) y
con T1_4.1 (ejemplos 1, 2 y 3). Cada valor de la app, redondeado a los
decimales que dan los apuntes, se compara con el valor publicado:

  Cuadra con los apuntes ................................... 109
  Diferencia explicada (errata o redondeo de los apuntes) ..  19
  Falla ....................................................   0

Las 19 diferencias explicadas son las del apartado 7. Además, todos los
resultados se han contrastado con un cálculo independiente hecho aparte.

2) Pruebas de robustez (versiones 2.0 y 3.0): 37 comprobaciones de sí o no
con los casos de las dos revisiones independientes. De la versión 1.0: l3 a
mano, opciones «A mano» con el campo vacío, cinta descendente, avisos de
erratas, valores fuera de rango y coma decimal en los avisos. De la versión
2.0: velocidad fijada a mano con el ancho automático (M1) y números
escritos con punto de miles (M4). También comprueban que el ejemplo de
diseño da los mismos resultados que en la versión 1.0.

  Se cumple ................................................  37
  No se cumple .............................................   0

El cambio de la clase A-D al elegir otro material (M3) es de la interfaz y
se ha comprobado en el navegador.


-------------------------------------------------------------------------------
9. EJEMPLO RESUELTO PASO A PASO
-------------------------------------------------------------------------------
Es el ejemplo que se carga al abrir la app ("Diseño completo: caliza
fragmentada, 400 t/h"). Los valores que no da el enunciado se toman de las
tablas de la app y se indica su origen.

ENUNCIADO
  Dimensionar una cinta para transportar 400 t/h de caliza fragmentada
  (tamaño máximo 100 mm, con un 10 % de gruesos) entre dos tambores
  separados L = 150 m, con un desnivel ascendente H = 12 m. Estaciones de 3
  rodillos con artesa de 30 grados. Banda textil EP 160.

DATOS
  Material (T1_3.2): caliza fragmentada, 1,36-1,44 t/m3 -> rho = 1,40 t/m3;
     ángulo de reposo 35 grados; abrasividad B (poco abrasivo).
  Para B = 650 mm (el ancho que resulta), valores orientativos de Rotrans:
     qb = 6,5 kg/m (tabla B); separación de estaciones 1,10 m (superiores,
     rho > 0,6) y 3,00 m (inferiores) (tabla A); rodillos de 108 mm:
     masa giratoria por estación superior 3·1,75·2,3 = 12,08 kg y por
     rodillo inferior 4,02·2,3 = 9,25 kg.
  f = 0,020 (rodamientos, condiciones normales); un limpiador FS2 = 50 N
     (valor del ejemplo 7 de T1_6); FS1 = 0.
  Accionamiento: eta = 0,90; tambor motriz de 500 mm (DIN 22101).
  Tambor forrado de goma mojado con agua limpia: mu = 0,35 (T1_5.1);
     abrazamiento 180 grados; margen de adherencia 20 %; flecha máxima 1 %.

PASO 1. TRAZADO
  delta = arcsen(12/150) = 4,59 grados
  K = 0,99 + (0,98 - 0,99)·(4,589 - 4)/(6 - 4) = 0,9871   (tabla 1.1)

PASO 2. MATERIAL
  beta: reposo 35 grados -> fluidez normal (20-25) -> beta = 20 grados
  Clase: rho = 1,40 -> B; poco abrasivo -> B. Clase B.
  Ancho mínimo por terrón:
     tabla 1.3 (columna mixto): primer ancho que admite 100 mm -> 400 mm
     tabla 1.2: B >= 3·100 = 300 mm -> 400 mm
     Bmín = 400 mm

PASO 3. CAPACIDAD, ANCHO Y VELOCIDAD
  Para cada ancho: c1 = 3600·S·rho·K (t/h por m/s) y v = Q/c1.
     B (mm)   S (m2)     c1      v nec.  v DIN   vmáx B   Resultado
     400      0,013534    67,3   5,941   -       2,09     no hay v DIN
     500      0,022779   113,3   3,530   4,19    2,62     supera vmáx
     650      0,041578   206,8   1,934   2,09    2,62     cumple: elegido
  Detalle con B = 650 mm (l3 = 250 mm, figura 1.1):
     b  = 0,9·0,65 - 0,05 = 0,535 m
     S1 = [0,25 + (0,535 - 0,25)·cos 30]^2·tg 20 / 6 = 0,014973 m2
     S2 = [0,25 + (0,535 - 0,25)/2·cos 30]·[(0,535 - 0,25)/2·sen 30]
        = 0,026605 m2
     S  = 0,041578 m2
     Qmáx = 3600·0,041578·2,09·1,4·0,9871 = 432,3 t/h  >= 400 t/h
     Grado de llenado = 400/432,3 = 92,5 %
     qG = 400/(3,6·2,09) = 53,163 kg/m
  Resultado: B = 650 mm y v = 2,09 m/s.

PASO 4. RESISTENCIAS AL AVANCE (L = 150 m > 80 m: método simplificado)
  qRO = 12,08/1,10 = 10,982 kg/m       qRU = 9,25/3,00 = 3,083 kg/m
  C = 1,58 (DIN 22101, L = 150 m)      LC = 1,58·150 = 237,00 m
  FH + FN = 0,02·237·9,81·[10,982 + 3,083 + (2·6,5 + 53,163)·cos 4,59]
          = 3720,71 N
  FSt = 53,163·9,81·12 = 6258,37 N
  Fu  = 3720,71 + 0 + 50 + 6258,37 = 10 029,08 N

PASO 5. POTENCIA Y ACCIONAMIENTO
  Pu     = 10 029,08·2,09 = 20 960,78 W = 20,96 kW
  Pmotor = 20,96/0,90 = 23,29 kW
  M      = 10 029,08·0,25 = 2507,27 N·m
  w      = 2,09/0,25 = 8,360 rad/s;   n = 60·8,360/(2·pi) = 79,8 rpm

PASO 6. TENSIONES
  e^(mu·theta) = e^(0,35·pi) = 3,0028
  T2,adh   = 10 029,08/(3,0028 - 1) = 5007,44 N
  Tsup,mín = (6,5 + 53,163)·9,81·0,9968·1,10/(8·0,01) = 8022,03 N
  Tinf,mín = 6,5·9,81·0,9968·3,00/(8·0,01) = 2383,52 N
  T2 = máx(5007,44·1,2; 8022,03; 2383,52) = 8022,03 -> T2 = 8100 N
       (manda la flecha del ramal superior)
  T1 = 8100 + 10 029,08 = 18 129,08 N
  Adherencia: T1/T2 = 2,2382 <= 3,0028  -> cumple
  Fu,máx = 8100·(3,0028 - 1) = 16 222,98 N; reserva = 61,8 %
  Flechas con T2 = 8100 N:
     superior: h = 10,89 mm (0,990 %) <= 1 %
     inferior: h = 8,83 mm (0,294 %) <= 1 %

PASO 7. NÚMERO DE CAPAS (EP 160, B = 650 mm)
  z = S·T1/(R·B) = 11·18 129,08/(160·650) = 1,917 -> mínimo constructivo:
  z = 3 capas, S = 11
  Tadm = 160·3·650/11 = 28 363,64 N >= T1 = 18 129,08 N -> cumple
  (Tadm/T1 = 1,56)

RESULTADO
  Banda de 650 mm a 2,09 m/s, 3 capas EP 160 (EP 480/3), motor de al menos
  23,29 kW, tambor motriz de 500 mm a 79,8 rpm y T2 de 8100 N en el tensor.
  Todas las comprobaciones se cumplen.


-------------------------------------------------------------------------------
10. EJEMPLOS PRECARGADOS
-------------------------------------------------------------------------------
  - Diseño completo: caliza fragmentada, 400 t/h. El ejemplo del apartado 9.
  - Ejemplo integrado de los apuntes (T1_6, págs. 39-44). Modo comprobación.
    Reproduce Fu = 5391,38 N, Pmotor = 11,98 kW, T1 = 9391,38 N, las flechas
    de 0,81 % y 0,59 % (con tensiones locales de 6000 y 4000 N) y 3 capas.
  - Granito fino, 100 t/h (T1_4.1, ejemplo 3). Elige B = 400 mm y, con
    v = 1,52 m/s y CL = 1,7 como en los apuntes, da Fu = 1068,71 N y
    1,91 kW. El enunciado no da mu ni el diámetro del tambor: se suponen
    mu = 0,30 y D = 400 mm. Comprueba la banda de 3 capas de 200 N/mm.
  - Roca caliza, 1500 t/h (T1_4.1, ejemplo 1). Elección de ancho y velocidad
    por el método volumétrico: 1000 mm a 3,35 m/s. El resto de datos son
    orientativos; con 150 m de desnivel salen muchas capas, por lo que en la
    práctica se usaría una banda de cables de acero.

Para probar la adherencia con poco ángulo de abrazamiento (ejemplos 9 y 10
de T1_6) basta con fijar T2 a mano: la app muestra el ángulo mínimo
necesario.


-------------------------------------------------------------------------------
11. HIPÓTESIS Y LIMITACIONES
-------------------------------------------------------------------------------
  - Cinta de un solo tramo, con un único tambor motriz en cabeza y régimen
    estacionario. No se calculan el arranque ni el frenado (en T1_6 están sin
    desarrollar).
  - Bandas de carcasa textil (EP). No se dimensionan bandas de cables de
    acero, rodillos, tambores ni rodamientos.
  - Si Fu < 0 (cinta descendente que se acelera sola), la app avisa de que
    hace falta freno y no calcula la potencia del motor ni las tensiones.
  - Tensión mínima y flecha. La flecha se comprueba con T2, como en los
    apuntes. Pero en una cinta que sube con el motor en cabeza, la tensión
    mínima está en la cola, no en el tambor motriz:
        T_cola ≈ T2 + F_retorno - qb·g·H
    En el ejemplo del apartado 9, F_retorno = f·L·g·(qRU + qb·cos(delta)) es
    de unos 281 N (445 N si se aplica el coeficiente C) y qb·g·H = 765 N, así
    que T_cola ≈ 7600-7800 N y la flecha del ramal superior pasaría de
    0,990 % a un 1,03-1,05 %. La app mantiene el método de los apuntes. Para
    estudiar ese caso se puede introducir la tensión de la cola con la opción
    «Comprobar la flecha con tensiones locales».
  - Las tablas tienen límites: anchos de 400 a 2200 mm (tabla 1.3),
    inclinación hasta 20 grados, beta entre 5 y 30 grados en las tablas
    Rulmeca. Fuera de ellos se toma el valor extremo y se avisa.
  - Los valores orientativos (Rotrans) son una ayuda; el proyectista debe
    confirmarlos con el catálogo del fabricante elegido.


-------------------------------------------------------------------------------
12. BIBLIOGRAFÍA
-------------------------------------------------------------------------------
  - Muñoz, R. Apuntes sobre cintas transportadoras (T1_6), v1, 2026, y Breves
    notas sobre el cálculo de cintas transportadoras (T1_4.1). Transporte y
    Manutención Industrial, Universidad de Salamanca.
  - ISO 5048:1989. Continuous mechanical handling equipment - Belt conveyors
    with carrying idlers - Calculation of operating power and tensile forces.
  - DIN 22101:2011-12. Continuous conveyors - Belt conveyors for loose bulk
    materials - Basis for calculation and dimensioning.
  - Fuentes Losa, J. (coord.) et al. Ingeniería del transporte. UNED, 2012.
  - Boada, M. J. L. Bandas transportadoras. Universidad Carlos III de Madrid.
  - Rulmeca. Rodillos y componentes para el transporte por banda de material
    a granel (tablas de propiedades de materiales y capacidades).
  - Phoenix Conveyor Belt Systems. Phoenix Conveyor Belts - Design
    Fundamentals. Hamburgo, 2004.
  - Rotrans, S.A. Catálogo de rodillos, estaciones y tambores.


-------------------------------------------------------------------------------
13. HISTORIAL DE VERSIONES
-------------------------------------------------------------------------------
  1.0 (3 de noviembre de 2026): primera versión.
  2.0 (3 de noviembre de 2026): correcciones tras una revisión independiente
      de la versión 1.0. No cambia ningún resultado de los ejemplos ni de las
      128 comprobaciones con los apuntes.
      - l3 a mano solo con B fijado y 0 <= l3 <= b; se descartan los anchos
        con capacidad por m/s no positiva (antes podía salir una capacidad
        negativa dada por buena).
      - Las opciones «A mano» con el campo vacío o no válido dan error, en
        vez de pasar al valor automático sin avisar.
      - Cada error marca en rojo su campo, y se distingue entre dato que falta
        y dato fuera de rango. El mínimo de capas es obligatorio.
      - Al elegir un material con ángulo de reposo, beta vuelve a «Por
        fluidez».
      - Las secciones del desarrollo mantienen su estado al recalcular.
      - Cinta descendente (Fu < 0): ya no se muestra una potencia del motor
        negativa.
      - Avisos de erratas completos (tablas Rulmeca y tabla CL de la UC3M).
      - Detalles: texto de las fórmulas fuera de tabla, coma decimal en los
        avisos, aviso de la tabla 1.2 solo cuando se usa, sin error en la
        consola al abrir con doble clic y B y v en automático al volver a
        modo diseño.
      - Página de pruebas con la misma cabecera que la principal y un bloque
        nuevo de 28 pruebas de robustez.
      - Readme: matices sobre la tensión mínima y la flecha (apartados 5.6, 7
        y 11).
  3.0 (3 de noviembre de 2026): correcciones tras una segunda revisión
      independiente, de la versión 2.0. No cambia ningún resultado de los
      ejemplos ni de las 128 comprobaciones con los apuntes.
      - Velocidad fijada a mano con el ancho automático: se elige el menor
        ancho que da la capacidad sin superar su velocidad máxima (antes
        podía elegir uno que la superaba aunque otro más ancho cumpliera).
        Un aviso explica el cambio e indica el ancho que bastaría con la
        velocidad automática. La tabla de anchos candidatos juzga cada ancho
        con la velocidad fijada.
      - Un número con punto de miles como «1.500» ya no se lee como 1,5: la
        app pide escribirlo sin punto (1500) o con coma decimal (1,5).
      - Al elegir otro material, la clase A-D vuelve a «Automática».
      - 9 pruebas de robustez nuevas (37 en total).

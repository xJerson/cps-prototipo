"use strict";
/* ══════════ DATOS SEMILLA ══════════ */
let ID = {p:100,u:200,c:300,t:400,w:1062,e:500,f:605,pr:700,mv:800,cl:900,ad:962,cm:960,rw:10,gx:10,inv:10};
const nid = k => ++ID[k];
/* Fotos semilla: no hay cámara real en el arranque del prototipo, pero la
   galería/miniatura necesita una URL de imagen real (no un contador ni
   url:null) para poder probarse desde que abre la demo. */
const FOTO_SEED = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='60'%3E%3Crect width='80' height='60' fill='%237fa8c9'/%3E%3C/svg%3E";
const loteSeed = (amb,cond,n,hora) => ({amb,cond,fotosArr:Array.from({length:n},()=>({url:FOTO_SEED,quien:"T6",hora}))});
let ultimoSubwoTocado = null;   // WO de la última Sub-Work Order a la que se le tocó una foto — lo lee AUD_POST.subwoFoto
let ultimoEstTocado = null;     // num del último estimado aprobado/rechazado — lo lee AUD_POST.estMedioOK

let S = {
  usuario:"Claudia", mod:"tablero", semana:33, reloj:9*60+41,
  // Reunión Claudia (feedback prototipo): Nómina y Facturación no deberían
  // quedar pegadas a "la semana actual" nada más — hace falta poder mirar
  // otra semana, un día puntual, un rango, o un mes completo.
  periodo:{tipo:"semana", sem:33, dia:"2026-08-12", desde:"2026-08-01", hasta:"2026-08-15", anio:2026, mes:8},
  // Punto 9 del feedback: el Calendario necesita el mismo Día/Semana/Rango/Mes
  // que Nómina y Facturación, pero sin pisarles el período — estado propio.
  periodoCal:{tipo:"semana", sem:33, dia:"2026-08-12", desde:"2026-08-01", hasta:"2026-08-15", anio:2026, mes:8},
  /* El buscador de Work Orders conserva texto y fecha por separado: cambiar
     uno no borra el otro, que era el problema del Excel. */
  filtroWO:{modo:"todos", sem:33, desde:"", hasta:""},
  /* El cierre no queda atado a una hora fija: hoy es 4 PM, pero operación
     puede moverlo sin tocar código. Las confirmaciones son correos simulados
     y auditables hasta que se conecte un proveedor real de correo. */
  cierreAgendamiento:{hora:"16:00", fecha:"2026-08-12"},
  confirmacionesAgendamiento:[],
  sub:null, tab:null, phone:false, phTec:"T1", phView:"agenda", phWO:null, phSub:null,
  // Avisos sembrados para que la pestaña del celular no arranque vacía: uno sin leer, uno ya leído.
  notis:[
    /* Ejemplos de hoy comentados — cada área va a generar sus propios avisos.
    {t:"Nueva Work Order confirmada", b:"WO-1048 · Bayside Landing A-105 quedó confirmada por el cliente.", h:"8:15", leido:false},
    {t:"Recordatorio", b:"No olvides la foto del antes en cada unidad antes de empezar.", h:"7:30", leido:true}
    */
  ],
  coach:true,   // asistente "¿qué hago ahora?" — se puede apagar desde su tarjeta
  /* El celular tiene dos dueños distintos: el técnico ejecuta, el supervisor reporta.
     No es la misma app con otro logo — es otra herramienta. */
  phRol:"tecnico", gRep:null, gVer:null,

  impuestos:[],

  clientes:[
    {id:"CL2",nombre:"Trident Group",contacto:"Rick Halloway",tel:"251-555-0198",mail:"rick@tridentgrp.com",fechaAlta:"2026-06-15"}
  ],
  comunicaciones:[],
  // Los campos "shop / paint / horario / expectativas" ya existen en su pestaña Propiedades
  // (Paint logistics, Paint specificatios, Cleaning details, Final Expectations, Notas para el tecnico).
  // Hoy no llegan al técnico porque le mandan una captura de Schedule, que no las tiene.
  propiedades:[
    {id:"P3",nombre:"Harbor Pointe",zona:"Gulf Breeze",cliente:"CL2",estado:"Active",origen:"Llamada",dir:"9 Harbor Blvd",activa:true,regalo:"No",door:"9134",aprob:"Texto al manager",pref:"Texto/Llamada",
     polizas:[{tipo:"General Liability",aseguradora:"Ategrity Specialty",poliza:"01-C-PK-P20181323-0",vence:"2026-08-20"},
              {tipo:"Auto Liability",aseguradora:"Progressive Express",poliza:"999240061",vence:"2026-06-23"}],
     horario:"Acceso 24h con código",
     shop:"No tiene shop — el material se lleva desde la base",shopCode:"",
     notasPaint:"Behr Marquee, satin. No usar semi-gloss aunque el tenant lo pida.",notasClean:"",finalExp:"",notasTec:"Perro suelto en el patio de la C-8.",
     notas:"Aprobaciones con el manager y apertura de gate en oficina."}
  ],
  // UC-10: reemplaza el True/False de la columna Asistencia, que hoy marca alguien de oficina
  asistencias:[],
  /* Reunión 2026-09-09: la unidad se guarda partida en building + número.
     En su Excel unos escriben "102B" y otros "B 102" — con dos campos el
     sistema siempre la reconoce igual. `num` es el texto ya armado
     (building-número, o solo el número si no hay building) y es lo que se
     muestra en todas las pantallas; building/unidadNum son la fuente. */
  unidades:[
    {id:"U6",prop:"P3",building:"C",unidadNum:"8",num:"C-8",rooms:"3 bedroom",pisos:1,detalle:[{tipo:"Bedroom",cantidad:3},{tipo:"Bathroom",cantidad:2}]},
    {id:"U7",prop:"P3",building:"C",unidadNum:"12",num:"C-12",rooms:"2 bedroom",pisos:1,detalle:[{tipo:"Bedroom",cantidad:2},{tipo:"Bathroom",cantidad:2}]},
    {id:"U14",prop:"P3",building:"D",unidadNum:"3",num:"D-3",rooms:"Studio",pisos:1,detalle:[{tipo:"Studio",cantidad:1},{tipo:"Bathroom",cantidad:1}]},
    {id:"U15",prop:"P3",building:"D",unidadNum:"20",num:"D-20",rooms:"2 bedroom",pisos:2,detalle:[{tipo:"Bedroom",cantidad:2},{tipo:"Bathroom",cantidad:1}]}
  ],
  contactos:[
    {id:"C4",prop:"P3",tipo:"Manager",nombre:"Rick Halloway",mail:"rick@tridentgrp.com",tel:"251-555-0198"},
    {id:"C5",prop:"P3",tipo:"Assistant",nombre:"Kaylah S.",mail:"kaylah@tridentgrp.com",tel:"251-555-0111"}
  ],
  tecnicos:[
    {id:"T1",nombre:"Diego",apellido:"Ramírez",esp:["Tecnico","Housekeeper"],zona:"Pensacola",tel:"850-555-0301",nac:"1990-04-12",dir:"Pensacola FL",movimiento:true,activo:true},
    {id:"T2",nombre:"Marcos",apellido:"Ayala",esp:["Tecnico","Resurface"],zona:"Pensacola",tel:"850-555-0302",nac:"1986-11-02",dir:"Pensacola FL",movimiento:true,activo:true},
    {id:"T3",nombre:"Luz",apellido:"Ferrer",esp:["Housekeeper"],zona:"Foley",tel:"251-555-0303",nac:"1993-07-21",dir:"Foley AL",movimiento:false,activo:true},
    {id:"T4",nombre:"Andrés",apellido:"Solís",esp:["Carpeter","Tecnico"],zona:"Gulf Breeze",tel:"850-555-0304",nac:"1988-02-09",dir:"Gulf Breeze FL",movimiento:true,activo:true},
    {id:"T5",nombre:"Reyna",apellido:"Bonilla",esp:["Housekeeper"],zona:"Pensacola",tel:"850-555-0305",nac:"1995-05-30",dir:"Pensacola FL",movimiento:false,activo:true},
    {id:"T6",nombre:"Gustavo",apellido:"Andrade",esp:["Supervisor"],zona:"Pensacola",tel:"850-555-0306",nac:"1982-09-14",dir:"Pensacola FL",movimiento:true,activo:true}
  ],
  disponibilidad:[/* Ejemplo comentado — cada técnico va a enviar la suya.
    {id:"D1",tec:"T3",desde:"2026-08-11",hasta:"2026-08-14",motivo:"Permiso personal",estado:"Aprobado"} */],
  // Tarifario: nivel General (Ingreso Fijo) + por propiedad (Ingreso Variable)
  tarifas:[
    {id:"TR1",prop:null,cat:"Clean",serv:"Full clean",variante:"1 bedroom",precio:110,pago:55},
    {id:"TR2",prop:null,cat:"Clean",serv:"Full clean",variante:"2 bedroom",precio:145,pago:70},
    {id:"TR3",prop:null,cat:"Clean",serv:"Full clean",variante:"3 bedroom",precio:185,pago:92},
    {id:"TR4",prop:null,cat:"Clean",serv:"Heavy clean",variante:"2 bedroom",precio:210,pago:105},
    {id:"TR5",prop:null,cat:"Paint",serv:"Full paint",variante:"1 bedroom",precio:520,pago:260},
    {id:"TR6",prop:null,cat:"Paint",serv:"Full paint",variante:"2 bedroom",precio:640,pago:320},
    {id:"TR7",prop:null,cat:"Paint",serv:"Full paint",variante:"3 bedroom",precio:790,pago:395},
    {id:"TR8",prop:null,cat:"Paint",serv:"Touch up paint",variante:"2 bedroom",precio:180,pago:90},
    {id:"TR9",prop:null,cat:"Clean",serv:"Carpet clean",variante:"2 bedroom",precio:120,pago:60},
    {id:"TR10",prop:null,cat:"Resurface",serv:"Tub resurfacing just tub",variante:"Tub only",precio:395,pago:190},
    {id:"TR11",prop:null,cat:"Clean",serv:"Trash out",variante:"Per trailer",precio:160,pago:80},
    {id:"TR12",prop:"P1",cat:"Clean",serv:"Full clean",variante:"2 bedroom",precio:132,pago:70},
    {id:"TR13",prop:"P1",cat:"Paint",serv:"Full paint",variante:"2 bedroom",precio:600,pago:320},
    // De su Tabla Maestra del Tarifario: el precio SÍ cambia por pisos en unidades chicas
    {id:"TR14",prop:null,cat:"Clean",serv:"Full clean",variante:"Studio",pisos:1,precio:95,pago:65},
    {id:"TR15",prop:null,cat:"Clean",serv:"Touch up clean",variante:"Studio",pisos:1,precio:55,pago:30},
    /* Services.xlsx llegó sin precios: una tarifa general PROVISORIA por cada servicio que no tenía ninguna,
       para cualquier tamaño (variante vacía) y pago = 50% del precio. Son valores de referencia inventados:
       no salen en «Enviar lista de precios» y dejan de ser provisorias cuando alguien las edita. */
    ...[["Clean","Office and amenities",150],["Clean","Pressure washing",175],["Clean","Carpet - Pet treatment",60],
      ["Paint","Color change",650],["Paint","Gloss finish change",300],["Paint","Full ceilings paint",250],
      ["Paint","Partial ceilings paint",125],["Paint","Exterior door paint",75],["Paint","Bathroom cabinet paint",120],
      ["Paint","Kitchen cabinet paint",350],["Paint","Exterior closet paint",60],["Paint","Color change ceilings paint",300],
      ["Paint","Accent wall paint",120],
      ["Resurface","Tub resurfacing with wall",595],["Resurface","Bathroom cabinet resurface",150],
      ["Resurface","Kitchen cabinet resurface",450],["Resurface","Bathroom countertop resurface",175],
      ["Resurface","Kitchen countertop resurface",325],["Resurface","Sink resurface",150],
      ["Resurface","Kitchen countertop marble resurface",425],["Resurface","Bathroom countertop marble resurface",225],
      ["Make Ready Checklist","Make Ready Checklist",85],["Flooring Services","Carpet tear out",200],
      ["Repair","Sheetrock repair",120],["Repair","Tape repair",75],["Repair","Popcorn texture repair",110],
      ["Repair","Texture repair",90],["Repair","Countertop repair",140],["Repair","Bath tub repair",160],
      ["Repair","Tile repair",120],["Repair","Door repair",85],["Repair","Window repair",95],
      ["Repair","Balcony repair",180],["Repair","Extra prep",75],
      ["Installation","Tile installation",450],["Installation","Grab bar installation",85],
      ["Installation","Bath tub installation",900],["Installation","Light fixture installation",90],
      ["Installation","Blinds installation",45],["Installation","Dishwasher installation",150],
      ["Installation","Kitchen installation",1200],["Installation","Interior door installation",175],
      ["Installation","Exterior door installation",325],["Installation","2 doors interior closet installation",225],
      ["Installation","4 doors interior closet installation",375],["Installation","Trim installation",150],
      ["Installation","Baseboard installation",175],["Installation","Full cabinets installation",1500],
      ["Installation","Full cabinets door installation",450],["Installation","Shower rod installation",45],
      ["Installation","Cabinet handles installation",60],
      ["Removal","Removal",150],["Estimate","Estimate",0],["Inspection","Inspection",0]
    ].map(([cat,serv,precio],i)=>({id:"TRP"+(i+1),prop:null,cat,serv,nombre:serv,variante:"",pisos:null,
      precio,pago:Math.round(precio/2)}))
  ],
  /* Pago diferenciado por técnico: override OPCIONAL sobre la tarifa general
     (ver pagoTecnicoWO en helpers.js). Si no hay override acá, el pago sigue
     saliendo de `tarifas` como siempre — esto nunca reemplaza esa tabla. */
  pagosTecnico:[
    {id:"PT1",tec:"T2",prop:null,cat:"Resurface",serv:"Tub resurfacing just tub",variante:"Tub only",pisos:null,pago:230,
      motivo:"Especialista en resane de tinas — tarifa más alta por experiencia",quien:"Claudia",fecha:"2026-08-05"}
  ],
  estimados:[
    /* Ejemplo comentado — Comercial va a crear sus propios estimados de 0.
    {id:"E2",num:"EST-2026-019",cliente:"CL2",prop:"P3",fecha:"2026-08-08",estado:"Enviado",lineas:[{unidad:"U6",cat:"Clean",serv:"Heavy clean",precio:210,pago:105,nivel:"General"}],aprob:null}
    */
  ],
  wos:[
    /* ░░ EJEMPLOS DE HOY COMENTADOS (9 WO: 1039,1040,1043,1047,1049,1050,1055,1057,1062) ░░
    Cada área va a crear y registrar sus propias Work Orders desde 0.
    Se deja el texto de las notas originales como referencia, sin el formato
    de comentario interno (para no anidar comentarios dentro de éste):

    1039 Paint·Touch up paint·T2·Completed — Migrada de Magnolia Court (P2) al reducir a 1 sola
    propiedad: era la base de DS-SEED2 (descuento aplicado) y NM-SEED2 (pago parcial a técnico).
    {id:1039,prop:"P3",unidad:"U7",cat:"Paint",serv:"Touch up paint",tec:"T2",estado:"Completed",semana:33,fecha:"2026-08-10",horaProg:"8:30",po:"PO-8842",asistencia:true,evid:0,mats:[],notas:"",notasTec:"",hist:[["8:15","Creada","Thalia"],["8:16","Asignada a Marcos Ayala","Thalia"],["9:30","Llegó a la propiedad","Marcos"],["13:20","Terminó — sin cargar evidencia","Marcos"]]},

    1040 Carpet·Carpet clean·T1·In progress — corroborado:true a propósito, así "Mientras trabajas"
    (botón "Compra de materiales") se ve directo sin pasar primero por "Sí, coincide — empezar".
    {id:1040,prop:"P3",unidad:"U6",cat:"Clean",serv:"Carpet clean",tec:"T1",estado:"In progress",semana:33,fecha:"2026-08-11",horaProg:"8:00",po:"",asistencia:true,evid:0,corroborado:true,mats:[],notas:"",notasTec:"",
     hist:[["8:05","Creada","Thalia"],["8:06","Asignada a Diego Ramírez","Thalia"],["8:52","Llegó a la propiedad","Diego"],
           ["8:55","Sub-WO planificada creada: Sheetrock","Diego Ramírez"],
           ["9:15","Aprobada por el cliente vía Llamada","Claudia"],
           ["9:20","Initial finding agregado a Sub-WO · Sheetrock (desde oficina)","Claudia"],
           ["9:30","Compró en tienda (Home Depot): Sellador de grout × 3 · usó 2 · sobró 1 (queda en inventario) · con foto del ticket","Diego"]]},

    1043 Repair·Drywall repair·T4·Confirmed — confirmCliente es solo de oficina, el técnico la ve
    en su agenda igual que cualquier otra. fotosPrevias = Work to Be Performed.
    {id:1043,prop:"P3",unidad:"U7",cat:"Repair",serv:"Sheetrock repair",tec:"T4",estado:"Confirmed",semana:33,fecha:"2026-08-12",horaProg:"10:00",po:"",asistencia:false,evid:0,mats:[],notas:"",notasTec:"",
     confirmCliente:{fecha:"2026-08-12",medio:"Llamada",contacto:"Property Manager",quien:"Thalia",hora:"8:40"},
     fotosPrevias:[{url:FOTO_SEED,quien:"Thalia",hora:"8:25"},{url:FOTO_SEED,quien:"Thalia",hora:"8:25"}],
     hist:[["8:25","Creada","Thalia"],["8:26","Asignada a Andrés Solís","Thalia"]]},

    1062 Clean·Full clean·T4·Confirmed — ejemplo para el cierre de agendamiento: Harbor Pointe
    tiene dos unidades elegibles el mismo día (ésta y la 1043), debe salir UN solo correo.
    {id:1062,prop:"P3",unidad:"U14",cat:"Clean",serv:"Full clean",tec:"T4",estado:"Confirmed",semana:33,fecha:"2026-08-12",horaProg:"13:00",horaFin:"15:00",po:"",asistencia:false,evid:0,mats:[],notas:"",notasTec:"",
     confirmCliente:{fecha:"2026-08-12",medio:"Email",contacto:"Rick Halloway",quien:"Thalia",hora:"9:05"},
     hist:[["9:00","Creada","Thalia"],["9:05","Fecha confirmada con el cliente","Thalia"],["9:06","Asignada a Andrés Solís","Thalia"]]},

    1047 Repair·Drywall repair·T4·Completed — circuito completo: aprobada, validada, pagada al
    técnico y facturada (S.facturas F601). También la WO de la nota de crédito (S.devoluciones).
    {id:1047,prop:"P3",unidad:"U7",cat:"Repair",serv:"Sheetrock repair",tec:"T4",estado:"Completed",semana:33,fecha:"2026-08-08",horaProg:"9:00",po:"",asistencia:true,evid:1,evidFotos:[{url:FOTO_SEED,quien:"T4",hora:"11:20"}],supervisada:true,validada:true,pagadaTec:true,facturada:true,mats:[],notas:"",notasTec:"",hist:[["8:00","Creada","Thalia"],["8:02","Asignada a Andrés Solís","Thalia"],["9:05","Llegó a la propiedad","Andrés"],["11:20","Terminó · 1 evidencia","Andrés"],["11:40","Revisión operativa completada","Gustavo"],["14:00","Validada y pagada en nómina","Erika"],["15:00","Facturada — INV-2026-1041","Erika"]]},

    1049 Clean·Full clean·T1·In progress — SIN corroborar todavía, para ver la tarjeta "corrobora
    la unidad" antes de destrabar "Mientras trabajas".
    {id:1049,prop:"P3",unidad:"U15",cat:"Clean",serv:"Full clean",tec:"T1",estado:"In progress",semana:33,fecha:"2026-08-12",horaProg:"13:00",po:"",asistencia:true,evid:0,mats:[],notas:"",notasTec:"",
     hist:[["12:40","Creada","Thalia"],["12:41","Asignada a Diego Ramírez","Thalia"],["13:05","Llegó a la propiedad","Diego"]]},

    1050 Repair·Drywall repair·T1·Esperando aprobación — frenada por un adicional, ya corroborada;
    trae los adicionales pendiente/rechazado/parcial. Base de DS-SEED3 y NM-SEED1.
    {id:1050,prop:"P3",unidad:"U14",cat:"Repair",serv:"Sheetrock repair",tec:"T1",estado:"Esperando aprobación",semana:33,fecha:"2026-08-12",horaProg:"14:00",po:"",asistencia:true,evid:0,corroborado:true,mats:[],notas:"",notasTec:"",
     hist:[["13:40","Creada","Thalia"],["13:41","Asignada a Diego Ramírez","Thalia"],["14:05","Llegó a la propiedad","Diego"],
           ["14:10","Confirmó la unidad","Diego"],["14:30","Pidió aprobación de un adicional · Sheetrock","Diego"]]},

    1055 Clean·Full clean·T3·Completed — ejemplo para probar Facturación y Cobranza: Completed
    y lista para facturar.
    {id:1055,prop:"P3",unidad:"U14",cat:"Clean",serv:"Full clean",tec:"T3",estado:"Completed",semana:33,fecha:"2026-08-12",horaProg:"9:00",po:"",asistencia:true,evid:1,evidFotos:[{url:FOTO_SEED,quien:"T3",hora:"11:05"}],supervisada:true,validada:true,pagadaTec:false,facturada:false,mats:[],notas:"",notasTec:"",
     hist:[["8:30","Creada","Thalia"],["8:32","Asignada a Luz Ferrer","Thalia"],["9:05","Llegó a la propiedad","Luz"],["11:05","Terminó · 1 evidencia","Luz"],["11:30","Revisión operativa completada","Gustavo"],["12:00","Validada","Erika"]]},

    1057 Clean·Full clean·T5·Completed — ejemplo de AjusteTotal (descuento en factura) para
    Auditoría financiera, ver S.facturas F602.
    {id:1057,prop:"P3",unidad:"U15",cat:"Clean",serv:"Full clean",tec:"T5",estado:"Completed",semana:33,fecha:"2026-08-09",horaProg:"9:00",po:"",asistencia:true,evid:1,evidFotos:[{url:FOTO_SEED,quien:"T5",hora:"11:15"}],supervisada:true,validada:true,pagadaTec:true,facturada:true,mats:[],notas:"",notasTec:"",
     hist:[["8:15","Creada","Thalia"],["8:16","Asignada a Reyna Bonilla","Thalia"],["9:05","Llegó a la propiedad","Reyna"],["11:15","Terminó · 1 evidencia","Reyna"],["11:40","Revisión operativa completada","Gustavo"],["12:00","Validada","Erika"],["13:00","Pagada al técnico en nómina — semana 33","Erika"],["14:00","Facturada — INV-2026-1042","Erika"]]}
    */
  ],
  adicionales:[
    /* ░░ EJEMPLOS DE HOY COMENTADOS (adicionales/Sub-WO: 951-958, 961) ░░
    Cada área va a crear sus propios adicionales y Sub-WO desde 0.
    Resumen de lo que mostraba cada uno, sin anidar comentarios:
    951 — hallazgo real en WO-1040: Diego reportó humedad sin poder cargar la foto desde el
    celular; aprobado, con foto cargada después desde oficina.
    952 — Pendiente: adicional recién enviado por Diego en WO-1050, todavía sin decidir.
    953 — Rechazado: el cliente no autorizó el cambio de color.
    954/955 — Parcial: dos líneas del mismo envío, una aprobada y otra rechazada.
    956 — Sub-WO planificada asignada, sin empezar (sin initial finding ni evidencia).
    957 — Sub-WO planificada ya terminada, con initial finding y evidencia.
    958 — Aprobado SIN precio: quedaba como Request "Definir precio del adicional".
    961 — Sub-WO planificada en curso, sin técnico asignado aparte.

    {id:951, sol:"SOL20260811A", wo:1040, desc:"Manchas de humedad y olor en el techo del baño — no estaba en el pedido original.", ubic:"Bano",
     concepto:"Sheetrock", cant:1, precio:85, pago:45, precioOrigen:"manual", catalogoId:null,
     estado:"Aprobado", aprob:{medio:"Llamada", quien:"Claudia", hora:"9:15"}, origen:"Técnico",
     fotosRefArr:[], fotosEvidArr:[],
     hallazgoFoto:{url:FOTO_SEED, quien:"Claudia", hora:"9:20"},
     specs:{}, tec:null, fecha:null, facturaSeparada:false, facturable:true,
     hist:[["8:55","Creada por el técnico en sitio: Sheetrock · precio manual pendiente","Diego Ramírez"],
           ["9:15","Aprobada por el cliente vía Llamada","Claudia"],
           ["9:20","Initial finding cargado desde oficina — el técnico no pudo adjuntarlo desde el celular","Claudia"]]},
    {id:952, sol:"SOL20260812P", wo:1050, desc:"Grieta en el techo de la sala, no estaba en el pedido original.", ubic:"Sala",
     concepto:"Sheetrock", cant:1, precio:85, pago:45, precioOrigen:"manual", catalogoId:null,
     estado:"Pendiente", aprob:null, origen:"Técnico",
     fotosRefArr:[], fotosEvidArr:[], hallazgoFoto:{url:FOTO_SEED, quien:"Diego", hora:"14:25"},
     specs:{}, tec:null, fecha:null, facturaSeparada:false, facturable:true,
     hist:[["14:25","Creada por el técnico en sitio: Sheetrock · precio manual pendiente","Diego Ramírez"]]},
    {id:953, sol:"SOL20260812R", wo:1050, desc:"Cambio de color solicitado por el inquilino, no estaba en el contrato.", ubic:"Dormitorio",
     concepto:"Color change", cant:1, precio:120, pago:60, precioOrigen:"manual", catalogoId:null,
     estado:"Rechazado", aprob:{medio:"Correo", quien:"Danielle Pratt", hora:"15:10"}, origen:"Técnico",
     fotosRefArr:[], fotosEvidArr:[], hallazgoFoto:null,
     specs:{}, tec:null, fecha:null, facturaSeparada:false, facturable:true,
     hist:[["14:50","Creada por el técnico en sitio: Color change · precio manual pendiente","Diego Ramírez"],
           ["15:10","Rechazada por el cliente vía Correo","Thalia"]]},
    {id:954, sol:"SOL20260812X", wo:1050, desc:"Grieta secundaria cerca de la ventana; pidió aprobar solo el tape, no la masa extra.", ubic:"Sala",
     concepto:"Tape", cant:1, precio:40, pago:20, precioOrigen:"manual", catalogoId:null,
     estado:"Aprobado", aprob:{medio:"Llamada", quien:"Danielle Pratt", hora:"15:40"}, origen:"Técnico",
     fotosRefArr:[], fotosEvidArr:[], hallazgoFoto:null,
     specs:{}, tec:null, fecha:null, facturaSeparada:false, facturable:true,
     hist:[["15:20","Creada por el técnico en sitio: Tape · precio manual pendiente","Diego Ramírez"],
           ["15:40","Aprobada por el cliente vía Llamada","Danielle Pratt"]]},
    {id:955, sol:"SOL20260812X", wo:1050, desc:"Grieta secundaria cerca de la ventana; pidió aprobar solo el tape, no la masa extra.", ubic:"Sala",
     concepto:"Masa", cant:1, precio:35, pago:18, precioOrigen:"manual", catalogoId:null,
     estado:"Rechazado", aprob:{medio:"Llamada", quien:"Danielle Pratt", hora:"15:40"}, origen:"Técnico",
     fotosRefArr:[], fotosEvidArr:[], hallazgoFoto:null,
     specs:{}, tec:null, fecha:null, facturaSeparada:false, facturable:true,
     hist:[["15:20","Creada por el técnico en sitio: Masa · precio manual pendiente","Diego Ramírez"],
           ["15:40","Rechazada por el cliente vía Llamada","Danielle Pratt"]]},
    {id:956, sol:"SUBP-1040A", wo:1040, desc:"Reparación de sheetrock en la pared del pasillo, planificada aparte del carpet clean.", ubic:"Pasillo",
     concepto:"Sheetrock", cant:1, precio:85, pago:45, precioOrigen:"manual", catalogoId:null,
     estado:"Aprobado", aprob:{medio:"Llamada", quien:"Rick Halloway", hora:"9:00"}, origen:"Planificada",
     fotosRefArr:[], fotosEvidArr:[], hallazgoFoto:null,
     specs:{}, tec:null, fecha:"2026-08-12", facturaSeparada:false, facturable:true,
     estadoTrabajo:"Assigned", cantRealizada:0, cantPendiente:0, parcial:false, facturada:false,
     hist:[["9:00","Sub-WO planificada aprobada: Sheetrock","Claudia"]]},
    {id:957, sol:"SUBP-1040B", wo:1040, desc:"Reemplazo de bisagra de puerta del clóset, hallada floja durante el carpet clean.", ubic:"Dormitorio",
     concepto:"Door", cant:1, precio:60, pago:30, precioOrigen:"manual", catalogoId:null,
     estado:"Aprobado", aprob:{medio:"Correo", quien:"Rick Halloway", hora:"9:05"}, origen:"Planificada",
     fotosRefArr:[], fotosEvidArr:[{url:FOTO_SEED, quien:"T1", hora:"9:50"}],
     hallazgoFoto:{url:FOTO_SEED, quien:"T1", hora:"9:10"},
     specs:{}, tec:null, fecha:"2026-08-12", facturaSeparada:false, facturable:true,
     estadoTrabajo:"Completed", cantRealizada:1, cantPendiente:0, parcial:false, facturada:false,
     hist:[["9:05","Sub-WO planificada aprobada: Door","Claudia"],["9:10","Initial finding cargado","Diego Ramírez"],
           ["9:50","Evidencia cargada","Diego Ramírez"],["9:55","Sub-WO terminada","Diego Ramírez"]]},
    {id:958, sol:"SOL20260811B", wo:1040, desc:"Manchas de moho detrás del refrigerador — no estaba en el pedido original.", ubic:"Cocina",
     concepto:"Moho", cant:1, precio:null, pago:null, precioOrigen:null, catalogoId:null,
     estado:"Aprobado", precioPend:true, aprob:{medio:"Llamada", quien:"Thalia", hora:"9:35"}, origen:"Técnico",
     fotosRefArr:[], fotosEvidArr:[], hallazgoFoto:{url:FOTO_SEED, quien:"Diego", hora:"9:30"},
     specs:{}, tec:null, fecha:null, facturaSeparada:false, facturable:false,
     hist:[["9:30","Creada por el técnico en sitio: Moho · precio manual pendiente","Diego Ramírez"],
           ["9:35","Aprobada por llamada — sin precio, falta definirlo","Thalia"]]},
    {id:961, sol:"SUBP-1049A", wo:1049, desc:"Reparación de sheetrock en el pasillo, se hace durante el clean.", ubic:"Pasillo",
     concepto:"Sheetrock", cant:1, precio:85, pago:45, precioOrigen:"manual", catalogoId:null,
     estado:"Aprobado", aprob:{medio:"Llamada", quien:"Rick Halloway", hora:"9:40"}, origen:"Planificada",
     fotosRefArr:[], fotosEvidArr:[], hallazgoFoto:{url:FOTO_SEED, quien:"T1", hora:"13:30"},
     specs:{}, tec:null, fecha:"2026-08-12", facturaSeparada:false, facturable:true,
     estadoTrabajo:"In progress", cantRealizada:0, cantPendiente:0, parcial:false, facturada:false,
     hist:[["9:40","Sub-WO planificada aprobada: Sheetrock","Claudia"],["13:30","Initial finding cargado","Diego Ramírez"]]}
    */
  ],
  facturas:[
    /* ░░ EJEMPLOS DE HOY COMENTADOS (F601, F602, F-CN-SEED1) ░░
    Facturación va a emitir y cobrar sus propias facturas desde 0.
    F601 INV-2026-1041 — factura normal de la WO-1047, dentro del plazo.
    F602 INV-2026-1042 — con AjusteTotal (descuento en el invoice) para Auditoría financiera.
    F-CN-SEED1 CN-2026-1041 — nota de crédito por el return DV-SEED1 sobre la WO-1047 ya facturada
    en F601: F601 queda intacta, ésta es la factura nueva en negativo, vinculada.

    {id:"F601",num:"INV-2026-1041",prop:"P3",lineas:[1047],
      conceptos:[{tipo:"WO",wo:1047,subwo:null,unidad:"U7",descripcion:"Drywall repair",cantidad:1,importe:220,evidencia:1}],
      total:220,separada:false,emision:"2026-08-09",vence:"2026-09-08",estado:"Emitida",
      pdf:"INV-2026-1041.pdf",pdfHora:"15:00",pdfQuien:"Erika",seguimiento:[]},
    {id:"F602",num:"INV-2026-1042",prop:"P3",lineas:[1057],
      conceptos:[{tipo:"WO",wo:1057,subwo:null,unidad:"U15",descripcion:"Full clean",cantidad:1,importe:145,evidencia:1},
        {tipo:"AjusteTotal",final:115,motivo:"Cliente pidió descuento por atraso en el acceso",importe:-30,calc:145}],
      total:115,separada:false,emision:"2026-08-09",vence:"2026-09-08",estado:"Emitida",
      pdf:"INV-2026-1042.pdf",pdfHora:"14:00",pdfQuien:"Erika",seguimiento:[]},
    {id:"F-CN-SEED1",num:"CN-2026-1041",prop:"P3",facturaOrigen:"F601",dev:"DV-SEED1",
      conceptos:[{tipo:"Manual",cat:"Nota de crédito",nombre:"Nota de crédito — El parche de drywall quedó con textura distinta a la pared, se nota el remiendo.",cantidad:1,importe:-60}],
      lineas:[],total:-60,separada:false,emision:"2026-08-11",vence:null,estado:"Nota de crédito",
      motivo:"El parche de drywall quedó con textura distinta a la pared, se nota el remiendo.",
      quien:"Thalia",fecha:"2026-08-11",pdf:null,seguimiento:[]}
    */
  ],
  creditosProp:[/* Ejemplo comentado, migrado de Bayside Landing al reducir a 1 propiedad.
    {id:"CR0",prop:"P3",unidad:"U7",tipo:"Abono",monto:150,motivo:"Retraso en entrega",quien:"Claudia",fecha:"2026-08-05"} */],
  pinturas:[],
  // Migrado de Bayside Landing (P1) al reducir a 1 sola propiedad — ejemplo de Auditoría financiera.
  creditosServ:[/* Ejemplo comentado, migrado de Bayside Landing al reducir a 1 propiedad.
    {id:"CS0",prop:"P3",unidad:null,serv:"Full clean",cant:2,tipo:"Abono",motivo:"Cortesía por retraso",quien:"Claudia",fecha:"2026-08-05"} */],
  pagos:[/* Ejemplo comentado, cobranza va a registrar sus propios pagos.
    {id:"PG1",factura:"F601",monto:120,medio:"Check",referencia:"CHK-10488",fecha:"2026-08-11",evidencia:true,quien:"Claudia",nota:"Partial payment received"} */],
  nomina:[
    /* Ejemplos de hoy comentados (NM-SEED1/2) — pagos parciales a técnicos.
    {id:"NM-SEED1", semana:33, periodo:{tipo:"semana",sem:33}, tec:"T1", wos:[1050], total:90, tipo:"Parcial", nota:"Adelanto pedido por el técnico", cheque:"", foto:null, quien:"Erika", fecha:"2026-08-11", hora:"9:50"},
    {id:"NM-SEED2", semana:33, periodo:{tipo:"semana",sem:33}, tec:"T2", wos:[1039], total:50, tipo:"Parcial", nota:"", cheque:"CHK-10512", foto:null, quien:"Claudia", fecha:"2026-08-11", hora:"10:40"}
    */
  ],
  bitacora:[
    /* Ejemplos de hoy comentados (bitácora n:1 a 6) — queda vacía, cada acción real que
    hagan las áreas la va completando sola.
    {n:6, fecha:"2026-08-11", hora:"10:30", usuario:"Erika", rol:"Administración", accion:"Ajustó el total de una factura del borrador (de → a · motivo)", modulo:"Facturación", ref:"Harbor Pointe · Factura INV-2026-1042: $145.00 → $115.00 · Cliente pidió descuento por atraso en el acceso"},
    {n:5, fecha:"2026-08-11", hora:"10:05", usuario:"Thalia", rol:"Programación", accion:"Decidió un adicional", modulo:"Excepciones", ref:"WO-1040"},
    {n:4, fecha:"2026-08-11", hora:"9:40", usuario:"Erika", rol:"Administración", accion:"Marcó como pagado a un técnico", modulo:"Nómina", ref:"Diego Ramírez · Semana 33"},
    {n:3, fecha:"2026-08-11", hora:"9:10", usuario:"Gustavo", rol:"Supervisión", accion:"Hizo un return a un trabajo", modulo:"Work Orders", ref:"WO-1039"},
    {n:2, fecha:"2026-08-10", hora:"16:20", usuario:"Claudia", rol:"Administración / Estimados", accion:"Aprobó la nómina de un técnico", modulo:"Nómina", ref:"Marcos Ayala · Semana 33"},
    {n:1, fecha:"2026-08-10", hora:"8:16", usuario:"Thalia", rol:"Programación", accion:"Creó una Work Order", modulo:"Work Orders", ref:"WO-1050"}
    */
  ], audSeq:0, avisos:[], campana:false,
  /* Expedientes post-work enviados al cliente: se conserva el token para
     que el enlace pueda abrirse en otra pestaña del mismo origen. */
  revisionesCliente:[], aprobadoresSol:{},
  /* Lo que Gustavo manda desde el campo. Hoy va por WhatsApp: llega, pero no se queda.
     A los dos meses, cuando el manager reclama, esas fotos ya no las encuentra nadie. */
  reportes:[
    /* Ejemplo de hoy comentado (R1) — cada supervisor va a subir sus propios reportes.
    {id:"R1", tipo:"previo", prop:"P3", unidad:"U7", wo:null,
     fecha:"2026-08-08", hora:"8:40", quien:"T6", antesDe:"Full paint",
     lotes:[loteSeed("Sala","Accesorios",6,"8:40"),loteSeed("Sala","Pared / drywall",9,"8:41"),
            loteSeed("Bano","Accesorios",11,"8:42"),loteSeed("Room","Pisos",7,"8:43")],
     nota:"Interruptores de la sala ya venian manchados de pintura del trabajo anterior. Golpe en la pared del bano, junto al lavamanos.",
     medidas:"", servicios:[], estado:"Archivado", accion:"Archivado en la unidad"},
    */
  ],
  /* UC — «Recibir Solicitud Comercial de Lydia»: es el paso 1 del flujograma
     de Propuestas y Estimados, antes de que exista ningun estimado. */
  solicitudesComerciales:[],
  draftEst:[], estHdr:{cli:"CL1",prop:"P1",cat:"Clean"},
  diasCerrados:[],   // «una vez que ya tenemos cerrado nuestro agendamiento... ahora sí las empezamos a asignar»
  bajas:{categorias:["Carpet","Trash out","Pressure washing","Cabinet","Ceramica"],
    /* Change order items: todos de baja. Los que ya son un servicio de Services.xlsx, los que pasaron a Surcharges /
       Miscellaneous, y los que no están en el Excel porque no se usan (Door, Balcony, Masa, Extra clean, Primer, Caulking). */
    adicionales:["Cambio de color","Cambio de brillo (sheen)","Closet exterior","Heavy clean","Extra prep","Tape","Sheetrock",
      "Textura","Living room (carpet)","Studio","Garage","Simple repair","Servicio adicional","Other",
      "Door","Balcony","Masa","Extra clean","Primer","Caulking"]},   // valores de catálogo dados de baja — no se borran, dejan de ofrecerse
  // UC-02: lo que Lydia pasa a Thalia sin llamada ni reingreso de datos
  solicitudes:[],
  // UC-01b / UC-04b / UC-12b: visitas comerciales, inspecciones y supervisión.
  // La de tipo "Comercial" es la que le faltaba al flujograma de Ventas: hasta
  // ahora el prototipo saltaba de "registrar prospecto" directo a "Solicitud
  // Comercial", sin la visita en sí — y sin ella, un prospecto que no se
  // decide en el momento ("sigue en seguimiento") no quedaba en ningún lado.
  visitas:[],
  /* «Recibir Agendamiento Diario de CLAUDIA» — el primer paso de su flujograma.
     Claudia decide a dónde va; el sistema ordena las paradas por zona para que
     no dé vueltas. Lo que hoy se dice por teléfono cada mañana. */
  agendaSup:[
    /* Ejemplo de hoy comentado (AS2) — Claudia va a cargar su propia agenda.
    {id:"AS2", fecha:"2026-08-11", prop:"P3", motivo:"Inspección para estimado", nota:"El manager pidió cotizar dos unidades más",
     estado:"Pendiente", hora:null, quien:"Claudia"}
    */
  ],
  solicitudesSup:[
    /* Ejemplo de hoy comentado (SS3) — Thalia va a pedir sus propias visitas.
    {id:"SS3", tipo:"Estimado", prop:"P3", unidad:"", fechaTentativa:"2026-08-18", nota:"",
     estado:"Por agendar", pide:"Thalia", hora:"9:25", fecha:"2026-08-11", hist:[["9:25","Solicitud creada","Thalia"]]}
    */
  ],
  /* ── DEVOLUCIONES ─────────────────────────────────────────────────────
     Hasta ahora una devolucion era solo un estado de la Work Order que
     rebotaba a Thalia. No alcanza: una devolucion vive dias, cruza fechas
     y no se cierra hasta que alguien verifica con fotos que se corrigio.

     El campo que decide la plata es la CAUSA, no el responsable. Su
     formulario tenia "responsable de la correccion" (quien la arregla)
     pero no por que paso — y de eso depende si se le paga al tecnico y
     si se le puede cobrar al cliente. */
  devoluciones:[
    /* Ejemplo de hoy comentado (DV-SEED1) — sembraba la "nota de crédito" sobre la
    WO-1047 ya facturada, con 2 áreas para probar varias áreas por return.
    {id:"DV-SEED1", prop:"P3", unidad:"U7", wo:1047, areas:["Bano","Room"],
     desc:"El parche de drywall quedó con textura distinta a la pared, se nota el remiendo.",
     causa:"Trabajo mal ejecutado por el técnico", responsable:"T4",
     prioridad:"Media", fechaRep:"2026-08-11", fechaLimite:"2026-08-14", horaLimite:"17:00",
     estado:"Abierta", lotesAntes:[loteSeed("Bano",null,1,"9:08")], lotesDespues:[],
     verifica:null, quien:"Gustavo",
     hist:[["9:10","Return creado desde informe de supervisión","Gustavo Andrade"]]}
    */
  ],

  /* ── REPORTE DIARIO ───────────────────────────────────────────────────
     UN reporte por dia, no reportes sueltos. Se abre en la manana, se le
     agrega todo el dia y se cierra en la tarde. Una vez cerrado no se
     edita: solo se le agrega una nota, y queda el historial.

     Mezcla dos fuentes: lo que el sistema YA SABE entra solo (llegadas,
     informes, devoluciones) y Gustavo escribe unicamente lo que nadie mas
     puede saber (compras, coordinaciones, problemas, pendientes). */
  /* Lineas negativas de nomina, siempre atadas a una devolucion.
     Nunca sueltas: si no se puede senalar la devolucion que las origina,
     el tecnico tiene razon en reclamar. */
  /* Borradores de informe: Claudia pidio "Guardar borrador". Si entra a una
     unidad sin senal o lo interrumpen, no pierde lo que llevaba escrito. */
  borradores:[],
  /* Ejemplo: Marcos hizo mal WO-1041, Andrés lo corrigió (WO-1061); Erika/Claudia decide si se descuenta. */
  descuentos:[
    /* Ejemplos de hoy comentados (DS-SEED2 Aplicado, DS-SEED3 No aplicado) para la
    tabla "Descuentos en nómina" de Auditoría financiera.
    {id:"DS-SEED2", tipo:"Manual", estado:"Aplicado", tec:"T2", semana:33, wo:1039,
     concepto:"Material dañado por mal manejo", motivo:"Material dañado por mal manejo", desc:"",
     monto:25, quien:"Thalia", fecha:"2026-08-11", hora:"9:30"},
    {id:"DS-SEED3", tec:"T1", wo:1050, dev:"DV-SEED", monto:40, montoReal:40, tope:false, semana:33, fecha:"2026-08-11",
     estado:"No aplicado", decidio:"Claudia", horaDecision:"11:15", fechaDecision:"2026-08-11",
     motivoDecision:"Material defectuoso, no es responsabilidad del técnico",
     motivo:"Return fix de Drywall en la unidad U10 — lo corrigió Diego Ramírez"}
    */
  ],
  repDiario:[],
  phDev:null,      // return abierto en el celular
  phDiaId:null,    // si mira un reporte de otro día
  gDia:null,        // la entrada que esta escribiendo
  gDev:null,        // la devolucion que esta creando o verificando

  // EXCEPCIONES: todo lo que se sale de la regla y necesita que alguien más decida.
  // Una excepción atada a una WO frena solo esa WO; sin WO, frena todo (ver woBloqueada).
  excepciones:[
    /* Ejemplos de hoy comentados (X1 Pendiente, X2/X3 Aprobada automática por Sub-WO)
    para la tabla "Descuentos/Pagos" de Auditoría financiera.
    {id:"X1",tipo:"Pago adicional al técnico",wo:1039,motivo:"Marcos tuvo que hacer resane de pared antes de pintar; no está en la tarifa.",monto:75,pide:"Marcos Ayala",aprueba:"Claudia",estado:"Pendiente",fecha:"2026-08-10",creada:{quien:"Marcos Ayala",hora:"7:50"},resol:null},
    {id:"X2",tipo:"Pago adicional al técnico",wo:1040,subwo:"SW1040A",tec:"T1",motivo:"Sub-Work Order aprobada · Sheetrock · Closet pared norte",monto:60,pide:"Oficina",aprueba:"Thalia",estado:"Aprobada",fecha:"2026-08-11",creada:{quien:"Oficina",hora:"8:55"},resol:{quien:"Thalia",hora:"9:05"}},
    {id:"X3",tipo:"Pago adicional al técnico",wo:1043,subwo:"SW1043A",tec:"T1",motivo:"Sub-Work Order aprobada · Drywall patch · Hallway",monto:45,pide:"Diego Ramírez",aprueba:"Claudia",estado:"Aprobada",fecha:"2026-08-11",creada:{quien:"Diego Ramírez",hora:"10:20"},resol:{quien:"Claudia",hora:"10:30"}}
    */
  ],
  excCreadas:{},   // primera vez que se vio cada excepción automática: id -> hora. Así queda "creada el/a las" sin tener que guardarlas de antemano.
  // Las solicitudes automáticas se reconstruyen al renderizar. Su propietario
  // operativo vive aparte para que no se pierda entre renders.
  excAsignaciones:{},
  productos:[
    {id:"PR1",cat:"Pintura",nombre:"ProMar 200 eggshell",um:"galón",costo:32.5,min:12},
    {id:"PR2",cat:"Pintura",nombre:"Primer PVA",um:"galón",costo:24.0,min:8},
    {id:"PR3",cat:"Limpieza",nombre:"Líquido carpeta",um:"galón",costo:29.93,min:6},
    {id:"PR4",cat:"Repuesto",nombre:"Drywall 4x8",um:"unidad",costo:18.75,min:10},
    /* Creado "al vuelo" cuando Andrés lo compró en tienda desde su celular —
       no puso lo que pagó, por eso arranca en 0 hasta que oficina lo
       complete mirando la foto del ticket (ver movs M6/M7, más abajo). */
    {id:"PT1",cat:"Compra en tienda",nombre:"Sellador de grout",um:"unidad",costo:0,min:0}
    ,{id:"EQ1",cat:"Herramientas y equipos",nombre:"Aspiradora industrial",um:"unidad",costo:420,min:0,consumible:false,responsable:"T3",estado:"Operativa",ubicacion:"Bodega Pensacola"}
    ,{id:"AF1",cat:"Muebles / activos",nombre:"Laptop administración",um:"unidad",costo:780,min:0,consumible:false,responsable:"Claudia",estado:"Operativa",ubicacion:"Oficina"}
    ,{id:"IN1",cat:"Material para instalación",nombre:"LVT flooring",um:"caja",costo:48,min:4,consumible:true,reservadoPara:"",ubicacion:"Bodega"}
    ,{id:"OF1",cat:"Suministros de oficina",nombre:"Papel carta",um:"resma",costo:6.5,min:3,consumible:true,ubicacion:"Oficina"}
  ],
  gastosCompartidos:[
    /* Ejemplos de hoy comentados (GC1/GC2/GC3) — cada quien va a registrar sus propios gastos.
    {id:"GC1",tipo:"Fuel",concepto:"Gasolina para ruta de 2 unidades",monto:60,fecha:"2026-08-10",vehiculo:"Ford Transit 12",evidencia:true,notas:"Ruta lejana Pensacola",asignaciones:[{wo:1039,monto:30},{wo:1040,monto:30}],quien:"Gustavo"},
    {id:"GC2",tipo:"Accommodation",concepto:"Airbnb para finalizar trabajos",monto:420,fecha:"2026-08-09",vehiculo:"",evidencia:true,notas:"Semana de cierre",asignaciones:[{wo:1040,monto:210},{wo:1043,monto:210}],quien:"Erika"},
    {id:"GC3",tipo:"Office",concepto:"Internet oficina",monto:95,fecha:"2026-08-01",vehiculo:"",evidencia:true,notas:"Gasto administrativo",asignaciones:[],quien:"Claudia"}
    */
  ],
  vehiculos:[{id:"V1",nombre:"Ford Transit 12",placa:"FL CPS-012"},{id:"V2",nombre:"Chevrolet Silverado 8",placa:"FL CPS-008"}],
  recordatoriosWO:[/* Ejemplos comentados (RW1/RW2) — se generan solos con cada WO real.
    {id:"RW1",wo:1043,tipo:"1 day before",fecha:"2026-08-11",hora:"10:00",cliente:true,tecnico:false,estado:"Scheduled"},{id:"RW2",wo:1043,tipo:"1 hour before",fecha:"2026-08-12",hora:"09:00",cliente:true,estado:"Scheduled"} */],
  comunicacionesWO:[],
  movs:[
    /* ░░ EJEMPLOS DE HOY COMENTADOS (M1-M7, movimientos de inventario) ░░
    Oficina y técnicos van a registrar sus propios movimientos desde 0.
    M6/M7 mostraban la "Compra de materiales" desde el celular del técnico: Diego
    compró 3 en Home Depot, usó 2 en la unidad y 1 quedó en inventario.

    {id:"M1",prod:"PR1",tipo:"entrada",cant:24,fecha:"2026-08-03",wo:null,costo:780,tienda:"Sherwin Williams",quien:"Erika",evid:true},
    {id:"M2",prod:"PR3",tipo:"entrada",cant:8,fecha:"2026-07-20",wo:null,costo:239.44,tienda:"Home Depot",quien:"Gustavo",evid:true},
    {id:"M3",prod:"PR1",tipo:"salida",cant:2,fecha:"2026-08-10",wo:1039,costo:65,tienda:"",quien:"Marcos",evid:false},
    {id:"M4",prod:"PR4",tipo:"entrada",cant:12,fecha:"2026-08-05",wo:null,costo:225,tienda:"Home Depot",quien:"Gustavo",evid:true},
    {id:"M5",prod:"PR3",tipo:"salida",cant:3,fecha:"2026-08-11",wo:1040,costo:89.79,tienda:"",quien:"Diego",evid:false},
    {id:"M6",prod:"PT1",tipo:"entrada",cant:3,fecha:"2026-08-11",wo:null,compraWo:1040,costo:0,costoPend:true,
     tienda:"Home Depot",quien:"Diego",
     notas:"Comprado en tienda con tarjeta de la empresa — falta cargar el costo del ticket",
     recibo:FOTO_SEED,evid:true},
    {id:"M7",prod:"PT1",tipo:"salida",cant:2,fecha:"2026-08-11",wo:1040,costo:0,compra:"M6",tienda:"",quien:"Diego",evid:false}
    */
  ]
};

/* Las unidades anteriores a Unit Occupancy no traían el campo. Se adopta la
   opción conservadora: se consideran ocupadas hasta que oficina confirme que
   están vacantes, para que el técnico nunca reciba permiso implícito de entrar. */
S.unidades.forEach(u=>{ if(!u.ocupacion) u.ocupacion="Occupied"; if(!u.ubicacionUnidad) u.ubicacionUnidad=""; });

S.cat = CAT;   // los catálogos son datos del sistema, no constantes del código
/* Todo el sistema lee y edita CAT, pero al abrir se carga el catálogo guardado (nube o navegador) en S.cat, un objeto
   nuevo. Sin volver a unirlos, la pantalla mostraba el catálogo del código y lo que se editaba en Catálogos nunca se
   guardaba. Lo guardado manda; una lista nueva del código que todavía no está guardada se conserva. */
function unirCatalogo(){
  if(!S.cat || S.cat===CAT) return;
  Object.keys(S.cat).forEach(k=>{ CAT[k]=S.cat[k]; });
  S.cat = CAT;
}

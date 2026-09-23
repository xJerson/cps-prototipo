"use strict";
/* ══════════ DATOS SEMILLA ══════════ */
let ID = {p:100,u:200,c:300,t:400,w:1047,e:500,f:601,pr:700,mv:800,cl:900,ad:951,cm:960};
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
  sub:null, tab:null, phone:false, phTec:"T1", phView:"agenda", phWO:null, phSub:null, notis:[],
  coach:true,   // asistente "¿qué hago ahora?" — se puede apagar desde su tarjeta
  /* El celular tiene dos dueños distintos: el técnico ejecuta, el supervisor reporta.
     No es la misma app con otro logo — es otra herramienta. */
  phRol:"tecnico", gRep:null, gVer:null,

  impuestos:[],

  clientes:[
    {id:"CL1",nombre:"Coastal PM",contacto:"Danielle Pratt",tel:"850-555-0142",mail:"danielle@coastalpm.com",fechaAlta:"2026-06-02"},
    {id:"CL2",nombre:"Trident Group",contacto:"Rick Halloway",tel:"251-555-0198",mail:"rick@tridentgrp.com",fechaAlta:"2026-06-15"},
    {id:"CL3",nombre:"Meridian Residential",contacto:"Stacey Boone",tel:"850-555-077",mail:"stacey@meridianres.com",fechaAlta:"2026-08-05"}
  ],
  comunicaciones:[
    {id:"CM1",prop:"P1",fecha:"2026-07-28",medio:"Llamada",contacto:"Danielle Pratt",quien:"Lydia",nota:"Confirmó el ajuste de tarifa de limpieza para agosto."},
    {id:"CM2",prop:"P1",fecha:"2026-08-01",medio:"Correo",contacto:"Danielle Pratt",quien:"Lydia",nota:"Envió por escrito la aprobación de la tarifa."}
  ],
  // Los campos "shop / paint / horario / expectativas" ya existen en su pestaña Propiedades
  // (Paint logistics, Paint specificatios, Cleaning details, Final Expectations, Notas para el tecnico).
  // Hoy no llegan al técnico porque le mandan una captura de Schedule, que no las tiene.
  propiedades:[
    {id:"P1",nombre:"Bayside Landing",zona:"Pensacola",cliente:"CL1",estado:"Active",origen:"Referido",dir:"1420 Bayfront Pkwy",activa:true,regalo:"Yes",door:"4417",aprob:"Correo al manager",pref:"Correo",
     polizas:[{tipo:"General Liability",aseguradora:"Ategrity Specialty",poliza:"01-C-PK-P20181323-0",vence:"2026-12-31"}],
     horario:"Oficina abre 8:00 · unidades disponibles desde 8:30",
     shop:"Edificio de mantenimiento, detrás de la alberca",shopCode:"8812",
     notasPaint:"Sherwin ProMar 200, eggshell. Techos blanco plano.",
     notasClean:"No usar químicos con aroma — política del management",
     finalExp:"Ventanas por dentro y por fuera. Filtros de A/C cambiados.",
     notasTec:"Estacionarse en visitas, no en la entrada principal.",
     notas:"No se cobra cambio de brillo. Siempre aprobado el cambio de color."},
    {id:"P2",nombre:"Magnolia Court",zona:"Pensacola",cliente:"CL1",estado:"Active",origen:"Referido",dir:"88 Magnolia Ave",activa:true,regalo:"Yes",door:"2280",aprob:"Mensaje al manager",pref:"Mensaje",
     polizas:[{tipo:"General Liability",aseguradora:"Ategrity Specialty",poliza:"01-C-PK-P20181323-0",vence:"2026-09-15"}],
     horario:"Oficina abre 9:00",
     shop:"Bodega junto al buzón, lado norte",shopCode:"3390",
     notasPaint:"Color change requiere 2 manos",notasClean:"",
     finalExp:"Dejar llaves en la oficina al terminar.",notasTec:"",
     notas:"Solicitan estimado antes de cualquier reparación."},
    {id:"P3",nombre:"Harbor Pointe",zona:"Gulf Breeze",cliente:"CL2",estado:"Active",origen:"Llamada",dir:"9 Harbor Blvd",activa:true,regalo:"No",door:"9134",aprob:"Texto al manager",pref:"Texto/Llamada",
     polizas:[{tipo:"General Liability",aseguradora:"Ategrity Specialty",poliza:"01-C-PK-P20181323-0",vence:"2026-08-20"},
              {tipo:"Auto Liability",aseguradora:"Progressive Express",poliza:"999240061",vence:"2026-06-23"}],
     horario:"Acceso 24h con código",
     shop:"No tiene shop — el material se lleva desde la base",shopCode:"",
     notasPaint:"Behr Marquee, satin. No usar semi-gloss aunque el tenant lo pida.",notasClean:"",finalExp:"",notasTec:"Perro suelto en el patio de la C-8.",
     notas:"Aprobaciones con el manager y apertura de gate en oficina."},
    {id:"P4",nombre:"Cypress Run",zona:"Foley",cliente:"CL2",estado:"Active",origen:"Llamada",dir:"305 Cypress Rd",activa:false,regalo:"Yes",door:"5561",aprob:"Llamada a mantenimiento",pref:"Llamada",
     polizas:[],
     horario:"",shop:"",shopCode:"",notasPaint:"",notasClean:"",finalExp:"",notasTec:"",notas:""}
  ],
  // UC-10: reemplaza el True/False de la columna Asistencia, que hoy marca alguien de oficina
  asistencias:[],
  /* Reunión 2026-09-09: la unidad se guarda partida en building + número.
     En su Excel unos escriben "102B" y otros "B 102" — con dos campos el
     sistema siempre la reconoce igual. `num` es el texto ya armado
     (building-número, o solo el número si no hay building) y es lo que se
     muestra en todas las pantallas; building/unidadNum son la fuente. */
  unidades:[
    {id:"U1",prop:"P1",building:"A",unidadNum:"204",num:"A-204",rooms:"2 bedroom",pisos:1,detalle:[{tipo:"Bedroom",cantidad:2},{tipo:"Bathroom",cantidad:2}]},
    {id:"U2",prop:"P1",building:"A",unidadNum:"211",num:"A-211",rooms:"3 bedroom",pisos:2,detalle:[{tipo:"Bedroom",cantidad:3},{tipo:"Bathroom",cantidad:2}]},
    {id:"U3",prop:"P1",building:"B",unidadNum:"102",num:"B-102",rooms:"1 bedroom",pisos:1,detalle:[{tipo:"Bedroom",cantidad:1},{tipo:"Bathroom",cantidad:1}]},
    {id:"U9",prop:"P1",building:"A",unidadNum:"105",num:"A-105",rooms:"Studio",pisos:1,detalle:[{tipo:"Studio",cantidad:1},{tipo:"Bathroom",cantidad:1}]},
    {id:"U10",prop:"P1",building:"B",unidadNum:"201",num:"B-201",rooms:"1 bedroom",pisos:2,detalle:[{tipo:"Bedroom",cantidad:1},{tipo:"Bathroom",cantidad:1}]},
    {id:"U11",prop:"P1",building:"C",unidadNum:"310",num:"C-310",rooms:"2 bedroom",pisos:3,detalle:[{tipo:"Bedroom",cantidad:2},{tipo:"Bathroom",cantidad:2},{tipo:"Living Room",cantidad:1}]},
    {id:"U4",prop:"P2",building:"",unidadNum:"14",num:"14",rooms:"2 bedroom",pisos:1,detalle:[{tipo:"Bedroom",cantidad:2},{tipo:"Bathroom",cantidad:2}]},
    {id:"U5",prop:"P2",building:"",unidadNum:"27",num:"27",rooms:"2 bedroom",pisos:2,detalle:[{tipo:"Bedroom",cantidad:2},{tipo:"Bathroom",cantidad:1}]},
    {id:"U12",prop:"P2",building:"",unidadNum:"8",num:"8",rooms:"1 bedroom",pisos:1,detalle:[{tipo:"Bedroom",cantidad:1},{tipo:"Bathroom",cantidad:1}]},
    {id:"U13",prop:"P2",building:"",unidadNum:"33",num:"33",rooms:"3 bedroom",pisos:2,detalle:[{tipo:"Bedroom",cantidad:3},{tipo:"Bathroom",cantidad:2}]},
    {id:"U6",prop:"P3",building:"C",unidadNum:"8",num:"C-8",rooms:"3 bedroom",pisos:1,detalle:[{tipo:"Bedroom",cantidad:3},{tipo:"Bathroom",cantidad:2}]},
    {id:"U7",prop:"P3",building:"C",unidadNum:"12",num:"C-12",rooms:"2 bedroom",pisos:1,detalle:[{tipo:"Bedroom",cantidad:2},{tipo:"Bathroom",cantidad:2}]},
    {id:"U14",prop:"P3",building:"D",unidadNum:"3",num:"D-3",rooms:"Studio",pisos:1,detalle:[{tipo:"Studio",cantidad:1},{tipo:"Bathroom",cantidad:1}]},
    {id:"U15",prop:"P3",building:"D",unidadNum:"20",num:"D-20",rooms:"2 bedroom",pisos:2,detalle:[{tipo:"Bedroom",cantidad:2},{tipo:"Bathroom",cantidad:1}]},
    {id:"U8",prop:"P4",building:"",unidadNum:"31",num:"31",rooms:"Studio",pisos:1,detalle:[{tipo:"Studio",cantidad:1},{tipo:"Bathroom",cantidad:1}]},
    {id:"U16",prop:"P4",building:"",unidadNum:"12",num:"12",rooms:"1 bedroom",pisos:1,detalle:[{tipo:"Bedroom",cantidad:1},{tipo:"Bathroom",cantidad:1}]},
    {id:"U17",prop:"P4",building:"",unidadNum:"22",num:"22",rooms:"2 bedroom",pisos:1,detalle:[{tipo:"Bedroom",cantidad:2},{tipo:"Bathroom",cantidad:2}]},
    {id:"U18",prop:"P4",building:"",unidadNum:"40",num:"40",rooms:"3 bedroom",pisos:2,detalle:[{tipo:"Bedroom",cantidad:3},{tipo:"Bathroom",cantidad:2},{tipo:"Living Room",cantidad:1}]}
  ],
  contactos:[
    {id:"C1",prop:"P1",tipo:"Manager",nombre:"Danielle Pratt",mail:"danielle@coastalpm.com",tel:"850-555-0142"},
    {id:"C2",prop:"P1",tipo:"Maintenance",nombre:"Tim Reyes",mail:"tim@coastalpm.com",tel:"850-555-0166"},
    {id:"C3",prop:"P2",tipo:"Manager",nombre:"Danielle Pratt",mail:"danielle@coastalpm.com",tel:"850-555-0142"},
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
  disponibilidad:[{id:"D1",tec:"T3",desde:"2026-08-11",hasta:"2026-08-14",motivo:"Permiso personal",estado:"Aprobado"}],
  // Tarifario: nivel General (Ingreso Fijo) + por propiedad (Ingreso Variable)
  tarifas:[
    {id:"TR1",prop:null,cat:"Clean",serv:"Full clean",variante:"1 bedroom",precio:110,pago:55},
    {id:"TR2",prop:null,cat:"Clean",serv:"Full clean",variante:"2 bedroom",precio:145,pago:70},
    {id:"TR3",prop:null,cat:"Clean",serv:"Full clean",variante:"3 bedroom",precio:185,pago:92},
    {id:"TR4",prop:null,cat:"Clean",serv:"Deep clean",variante:"2 bedroom",precio:210,pago:105},
    {id:"TR5",prop:null,cat:"Paint",serv:"Full paint",variante:"1 bedroom",precio:520,pago:260},
    {id:"TR6",prop:null,cat:"Paint",serv:"Full paint",variante:"2 bedroom",precio:640,pago:320},
    {id:"TR7",prop:null,cat:"Paint",serv:"Full paint",variante:"3 bedroom",precio:790,pago:395},
    {id:"TR8",prop:null,cat:"Paint",serv:"Touch up paint",variante:"2 bedroom",precio:180,pago:90},
    {id:"TR9",prop:null,cat:"Carpet",serv:"Carpet clean",variante:"2 bedroom",precio:120,pago:60},
    {id:"TR10",prop:null,cat:"Resurface",serv:"Tub resurfacing",variante:"Tub only",precio:395,pago:190},
    {id:"TR11",prop:null,cat:"Trash out",serv:"Trash out",variante:"Per trailer",precio:160,pago:80},
    {id:"TR12",prop:"P1",cat:"Clean",serv:"Full clean",variante:"2 bedroom",precio:132,pago:70},
    {id:"TR13",prop:"P1",cat:"Paint",serv:"Full paint",variante:"2 bedroom",precio:600,pago:320},
    // De su Tabla Maestra del Tarifario: el precio SÍ cambia por pisos en unidades chicas
    {id:"TR14",prop:null,cat:"Clean",serv:"Full clean",variante:"Studio",pisos:1,precio:95,pago:65},
    {id:"TR15",prop:null,cat:"Clean",serv:"Touch up clean",variante:"Studio",pisos:1,precio:55,pago:30}
  ],
  estimados:[
    {id:"E1",num:"EST-2026-018",cliente:"CL1",prop:"P1",fecha:"2026-08-04",estado:"Aprobado",lineas:[{unidad:"U1",cat:"Clean",serv:"Full clean",precio:132,pago:70,nivel:"Propiedad"},{unidad:"U1",cat:"Paint",serv:"Full paint",precio:600,pago:320,nivel:"Propiedad"}],aprob:{medio:"Llamada",quien:"Danielle Pratt",fecha:"2026-08-05 10:22",ip:null}},
    {id:"E2",num:"EST-2026-019",cliente:"CL3",prop:"P3",fecha:"2026-08-08",estado:"Enviado",lineas:[{unidad:"U6",cat:"Clean",serv:"Deep clean",precio:210,pago:105,nivel:"General"}],aprob:null}
  ],
  wos:[
    {id:1038,prop:"P1",unidad:"U1",cat:"Clean",serv:"Full clean",tec:"T1",estado:"Completed",semana:33,fecha:"2026-08-10",horaProg:"9:00",po:"PO-8841",asistencia:true,evid:1,evidFotos:[{url:FOTO_SEED,quien:"T1",hora:"11:40"}],supervisada:true,validada:true,pagadaTec:false,facturada:false,mats:[],notas:"",notasTec:"",hist:[["8:10","Creada","Thalia"],["8:12","Asignada a Diego Ramírez","Thalia"],["9:02","Llegó a la propiedad","Diego"],["11:40","Terminó · 1 evidencia","Diego"],["12:00","Revisión operativa completada","Oficina"]]},
    {id:1039,prop:"P2",unidad:"U4",cat:"Paint",serv:"Touch up paint",tec:"T2",estado:"Completed",semana:33,fecha:"2026-08-10",horaProg:"8:30",po:"PO-8842",asistencia:true,evid:0,mats:[],notas:"",notasTec:"",hist:[["8:15","Creada","Thalia"],["8:16","Asignada a Marcos Ayala","Thalia"],["9:30","Llegó a la propiedad","Marcos"],["13:20","Terminó — sin cargar evidencia","Marcos"]]},
    {id:1040,prop:"P3",unidad:"U6",cat:"Carpet",serv:"Carpet clean",tec:"T4",estado:"In progress",semana:33,fecha:"2026-08-11",horaProg:"8:00",po:"",asistencia:true,evid:0,mats:[],notas:"",notasTec:"",
     hist:[["8:05","Creada","Thalia"],["8:06","Asignada a Andrés Solís","Thalia"],["8:52","Llegó a la propiedad","Andrés"],
           ["8:55","Sub-WO planificada creada: Sheetrock","Andrés Solís"],
           ["9:15","Aprobada por el cliente vía Llamada","Claudia"],
           ["9:20","Initial finding agregado a Sub-WO · Sheetrock (desde oficina)","Claudia"]]},
    /* Estado "Returned" y devuelta:1 a propósito: es la WO que trae la
       devolución DV1 sembrada más abajo — así queda un ejemplo real y
       visible desde que abre el prototipo, sin tener que armar uno a
       mano para poder mostrarlo. */
    {id:1041,prop:"P1",unidad:"U2",cat:"Paint",serv:"Full paint",tec:"T2",estado:"Returned",devuelta:1,
     motivoDev:"Quedó pintura en el marco de la puerta y el zócalo sin retocar.",
     semana:33,fecha:"2026-08-11",horaProg:"9:00",po:"",asistencia:true,evid:1,mats:[],notas:"",
     notasTec:"Color change aprobado por manager",
     hist:[["8:20","Creada","Thalia"],["8:21","Asignada a Marcos Ayala","Thalia"],
           ["14:10","Devuelta por supervisión: Quedó pintura en el marco de la puerta y el zócalo sin retocar.","Gustavo"]]},
    {id:1042,prop:"P2",unidad:"U5",cat:"Clean",serv:"Deep clean",tec:null,estado:"Scheduled",semana:33,fecha:"2026-08-12",horaProg:"9:00",po:"",asistencia:false,evid:0,mats:[],notas:"",notasTec:"",hist:[["7:50","Creada","Claudia"]]},
    {id:1043,prop:"P3",unidad:"U7",cat:"Repair",serv:"Drywall repair",tec:"T4",estado:"Scheduled",semana:33,fecha:"2026-08-12",horaProg:"10:00",po:"",asistencia:false,evid:0,mats:[],notas:"",notasTec:"",
     /* Fotos de referencia: lo que hay que reparar, para que el técnico lo vea
        antes de ir — Work to Be Performed, sembrado para que la galería no
        arranque siempre vacía. */
     fotosPrevias:[{url:FOTO_SEED,quien:"Thalia",hora:"8:25"},{url:FOTO_SEED,quien:"Thalia",hora:"8:25"}],
     hist:[["8:25","Creada","Thalia"],["8:26","Asignada a Andrés Solís","Thalia"]]},
    {id:1044,prop:"P1",unidad:"U3",cat:"Clean",serv:"Full clean",tec:"T1",estado:"Scheduled",semana:33,fecha:"2026-08-13",horaProg:"9:00",po:"",asistencia:false,evid:0,mats:[],notas:"",notasTec:"",hist:[["8:30","Creada","Claudia"]]},
    /* Terminada y con evidencia, pero todavía sin que nadie la revise — a
       diferencia de la 1039 (sin evidencia), a ésta SÍ se le puede tocar
       «Aprobar supervisión» y va a funcionar: sirve para probar el flujo de
       Gustavo de punta a punta, en vivo, sin que se bloquee. */
    {id:1045,prop:"P2",unidad:"U5",cat:"Clean",serv:"Deep clean",tec:"T4",estado:"Completed",semana:33,fecha:"2026-08-12",horaProg:"9:00",po:"",asistencia:true,evid:1,evidFotos:[{url:FOTO_SEED,quien:"T4",hora:"12:15"}],mats:[],notas:"",notasTec:"",hist:[["8:00","Creada","Thalia"],["8:01","Asignada a Andrés Solís","Thalia"],["9:05","Llegó a la propiedad","Andrés"],["12:15","Terminó · 1 evidencia","Andrés"]]},
    /* Ya la aprobó Gustavo (supervisada:true) pero Erika todavía no la validó
       en Nómina — el paso intermedio entre las dos personas, que hasta ahora
       no tenía ejemplo propio. */
    {id:1046,prop:"P1",unidad:"U3",cat:"Clean",serv:"Full clean",tec:"T1",estado:"Completed",semana:33,fecha:"2026-08-12",horaProg:"9:30",po:"",asistencia:true,evid:1,evidFotos:[{url:FOTO_SEED,quien:"T1",hora:"12:40"}],supervisada:true,pagadaTec:false,facturada:false,mats:[],notas:"",notasTec:"",hist:[["8:20","Creada","Thalia"],["8:22","Asignada a Diego Ramírez","Thalia"],["9:35","Llegó a la propiedad","Diego"],["12:40","Terminó · 1 evidencia","Diego"],["13:00","Revisión operativa completada","Gustavo"]]},
    /* El circuito ya cerrado del todo: aprobada, validada, pagada al técnico
       y ya facturada — su factura está sembrada más abajo (S.facturas). */
    {id:1047,prop:"P3",unidad:"U7",cat:"Repair",serv:"Drywall repair",tec:"T4",estado:"Completed",semana:33,fecha:"2026-08-08",horaProg:"9:00",po:"",asistencia:true,evid:1,evidFotos:[{url:FOTO_SEED,quien:"T4",hora:"11:20"}],supervisada:true,validada:true,pagadaTec:true,facturada:true,mats:[],notas:"",notasTec:"",hist:[["8:00","Creada","Thalia"],["8:02","Asignada a Andrés Solís","Thalia"],["9:05","Llegó a la propiedad","Andrés"],["11:20","Terminó · 1 evidencia","Andrés"],["11:40","Revisión operativa completada","Gustavo"],["14:00","Validada y pagada en nómina","Erika"],["15:00","Facturada — INV-2026-1041","Erika"]]}
  ],
  /* Hallazgo real encontrado en sitio (WO-1040, en progreso): Andrés reportó
     la humedad desde su celular pero no pudo cargar la foto (mala señal).
     Queda sembrado ya aprobado y con la foto cargada desde oficina — el
     ejemplo pedido para mostrar el botón nuevo sin tener que armarlo a mano. */
  adicionales:[
    {id:951, sol:"SOL20260811A", wo:1040, desc:"Manchas de humedad y olor en el techo del baño — no estaba en el pedido original.", ubic:"Bano",
     concepto:"Sheetrock", cant:1, precio:85, pago:45, precioOrigen:"manual", catalogoId:null,
     estado:"Aprobado", aprob:{medio:"Llamada", quien:"Claudia", hora:"9:15"}, origen:"Técnico",
     fotosRefArr:[], fotosEvidArr:[],
     hallazgoFoto:{url:FOTO_SEED, quien:"Claudia", hora:"9:20"},
     specs:{}, tec:null, fecha:null, facturaSeparada:false, facturable:true,
     hist:[["8:55","Creada por el técnico en sitio: Sheetrock · precio manual pendiente","Andrés Solís"],
           ["9:15","Aprobada por el cliente vía Llamada","Claudia"],
           ["9:20","Initial finding cargado desde oficina — el técnico no pudo adjuntarlo desde el celular","Claudia"]]}
  ],
  facturas:[{id:"F601",num:"INV-2026-1041",prop:"P3",lineas:[1047],
    conceptos:[{tipo:"WO",wo:1047,subwo:null,unidad:"U7",descripcion:"Drywall repair",cantidad:1,importe:220,evidencia:1}],
    total:220,separada:false,emision:"2026-08-09",vence:"2026-09-08",estado:"Emitida",
    pdf:"INV-2026-1041.pdf",pdfHora:"15:00",pdfQuien:"Erika",seguimiento:[]}],
  pagos:[], nomina:[], bitacora:[], audSeq:0, avisos:[], campana:false,
  /* Expedientes post-work enviados al cliente: se conserva el token para
     que el enlace pueda abrirse en otra pestaña del mismo origen. */
  revisionesCliente:[], aprobadoresSol:{},
  /* Lo que Gustavo manda desde el campo. Hoy va por WhatsApp: llega, pero no se queda.
     A los dos meses, cuando el manager reclama, esas fotos ya no las encuentra nadie. */
  reportes:[
    {id:"R1", tipo:"previo", prop:"P1", unidad:"U2", wo:null,
     fecha:"2026-08-08", hora:"8:40", quien:"T6", antesDe:"Full paint",
     lotes:[loteSeed("Sala","Accesorios",6,"8:40"),loteSeed("Sala","Pared / drywall",9,"8:41"),
            loteSeed("Bano","Accesorios",11,"8:42"),loteSeed("Room","Pisos",7,"8:43")],
     nota:"Interruptores de la sala ya venian manchados de pintura del trabajo anterior. Golpe en la pared del bano, junto al lavamanos.",
     medidas:"", servicios:[], estado:"Archivado", accion:"Archivado en la unidad"},
  ],
  /* UC — «Recibir Solicitud Comercial de Lydia»: es el paso 1 del flujograma
     de Propuestas y Estimados, antes de que exista ningun estimado. */
  solicitudesComerciales:[
    {id:"SC1", fecha:"2026-08-09", prop:"P2", propNombre:"", contacto:"Rick Halloway", correo:"rick@tridentgrp.com",
     alcance:"Pintura completa de 2 unidades por cambio de inquilino.", inspeccion:false, fechaObjetivo:"2026-08-20",
     notas:"Cliente pidio que sea antes de fin de mes.", quien:"Lydia", estado:"Lista para estimado", estimadoId:null},
  ],
  draftEst:[], estHdr:{cli:"CL1",prop:"P1",cat:"Clean"},
  diasCerrados:[],   // «una vez que ya tenemos cerrado nuestro agendamiento... ahora sí las empezamos a asignar»
  bajas:{},   // valores de catálogo dados de baja — no se borran, dejan de ofrecerse
  // UC-02: lo que Lydia pasa a Thalia sin llamada ni reingreso de datos
  solicitudes:[],
  // UC-01b / UC-04b / UC-12b: visitas comerciales, inspecciones y supervisión.
  // La de tipo "Comercial" es la que le faltaba al flujograma de Ventas: hasta
  // ahora el prototipo saltaba de "registrar prospecto" directo a "Solicitud
  // Comercial", sin la visita en sí — y sin ella, un prospecto que no se
  // decide en el momento ("sigue en seguimiento") no quedaba en ningún lado.
  visitas:[
    {id:"VC1", tipo:"Comercial", prop:"P4", propNombre:"", fecha:"2026-08-06", hora:"11:15",
     contacto:"—", correo:"", quien:"Lydia",
     notas:"El manager quiere cotizar pero está esperando aprobación de presupuesto del dueño. Pidió que lo contactemos la semana siguiente.",
     resultado:"Sigue en seguimiento", proximaAccion:"2026-08-08", estado:"En seguimiento",
     hist:[["10:40","Visita comercial registrada","Lydia"]]},
  ],
  /* «Recibir Agendamiento Diario de CLAUDIA» — el primer paso de su flujograma.
     Claudia decide a dónde va; el sistema ordena las paradas por zona para que
     no dé vueltas. Lo que hoy se dice por teléfono cada mañana. */
  agendaSup:[
    {id:"AS1", fecha:"2026-08-11", prop:"P1", motivo:"Supervisar", nota:"Revisar el clean de A-204 antes de que llegue el manager",
     estado:"Pendiente", hora:null, quien:"Claudia"},
    {id:"AS2", fecha:"2026-08-11", prop:"P3", motivo:"Inspección para estimado", nota:"El manager pidió cotizar dos unidades más",
     estado:"Pendiente", hora:null, quien:"Claudia"}
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
    {id:"DV1", prop:"P1", unidad:"U2", wo:1041, area:"Baño",
     desc:"Quedó pintura en el marco de la puerta y el zócalo sin retocar.",
     causa:"Trabajo mal ejecutado por el técnico", responsable:"T2",
     prioridad:"Alta", fechaRep:"2026-08-09", fechaLimite:"2026-08-12",
     estado:"Abierta", lotesAntes:[{amb:"Baño",n:4}], lotesDespues:[],
     verifica:null, quien:"T6",
     hist:[["8:52","Devolución creada desde informe de supervisión","Gustavo Andrade"]]}
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
  descuentos:[],
  repDiario:[],
  phDev:null,      // devolución abierta en el celular
  phDiaId:null,    // si mira un reporte de otro día
  gDia:null,        // la entrada que esta escribiendo
  gDev:null,        // la devolucion que esta creando o verificando

  // EXCEPCIONES: todo lo que se sale de la regla y necesita que alguien más decida.
  // Una excepción atada a una WO frena solo esa WO; sin WO, frena todo (ver woBloqueada).
  excepciones:[
    {id:"X1",tipo:"Pago adicional al técnico",wo:1039,motivo:"Marcos tuvo que hacer resane de pared antes de pintar; no está en la tarifa.",monto:75,pide:"Marcos Ayala",aprueba:"Claudia",estado:"Pendiente",fecha:"2026-08-10",creada:{quien:"Marcos Ayala",hora:"7:50"},resol:null}
  ],
  excCreadas:{},   // primera vez que se vio cada excepción automática: id -> hora. Así queda "creada el/a las" sin tener que guardarlas de antemano.
  // Las solicitudes automáticas se reconstruyen al renderizar. Su propietario
  // operativo vive aparte para que no se pierda entre renders.
  excAsignaciones:{},
  productos:[
    {id:"PR1",cat:"Pintura",nombre:"ProMar 200 eggshell",um:"galón",costo:32.5,min:12},
    {id:"PR2",cat:"Pintura",nombre:"Primer PVA",um:"galón",costo:24.0,min:8},
    {id:"PR3",cat:"Limpieza",nombre:"Líquido carpeta",um:"galón",costo:29.93,min:6},
    {id:"PR4",cat:"Repuesto",nombre:"Drywall 4x8",um:"unidad",costo:18.75,min:10}
  ],
  movs:[
    {id:"M1",prod:"PR1",tipo:"entrada",cant:24,fecha:"2026-08-03",wo:null,costo:780,tienda:"Sherwin Williams",quien:"Erika",evid:true},
    {id:"M2",prod:"PR3",tipo:"entrada",cant:8,fecha:"2026-07-20",wo:null,costo:239.44,tienda:"Home Depot",quien:"Gustavo",evid:true},
    {id:"M3",prod:"PR1",tipo:"salida",cant:2,fecha:"2026-08-10",wo:1039,costo:65,tienda:"",quien:"Marcos",evid:false},
    {id:"M4",prod:"PR4",tipo:"entrada",cant:12,fecha:"2026-08-05",wo:null,costo:225,tienda:"Home Depot",quien:"Gustavo",evid:true},
    {id:"M5",prod:"PR3",tipo:"salida",cant:3,fecha:"2026-08-11",wo:1040,costo:89.79,tienda:"",quien:"Andrés",evid:false}
  ]
};

/* Las unidades anteriores a Unit Occupancy no traían el campo. Se adopta la
   opción conservadora: se consideran ocupadas hasta que oficina confirme que
   están vacantes, para que el técnico nunca reciba permiso implícito de entrar. */
S.unidades.forEach(u=>{ if(!u.ocupacion) u.ocupacion="Occupied"; });

S.cat = CAT;   // los catálogos son datos del sistema, no constantes del código

"use strict";
/* ══════════ CATÁLOGOS — tal como están hoy en la pestaña Catalogo ══════════ */
/* Cada lista de aquí es una TABLA editable desde el módulo Catálogos.
   Los valores son los que hoy están en la pestaña Catalogo del Excel. */
const CAT = {
  // Hoy NO existe como lista: Schedule.Location se escribe libre (por eso "Navarre" y "navarre")
  zonas:["Pensacola","Foley","Gulf Breeze","Mobile","Daphne","Navarre","Fort Walton","Fairhope",
         "Biloxi, MS","Gulf Shores","Crestview","Spanish Fort","Orange Beach"],
  rooms:["Studio","1 bedroom","2 bedroom","3 bedroom","4 bedroom","Oficina",
         "1 bedroom and studio","2 bedroom and studio","3 bedroom and studio"],   // Catalogo!F
  pisos:[1,2,3],                                                                  // Catalogo!G
  /* Services.xlsx (CPS, 2026-10-28): la lista oficial de tipos de servicio y servicios.
     Los tipos retirados (Carpet, Trash out, Pressure washing, Cabinet, Ceramica) quedan al final y
     están en S.bajas.categorias, para que los registros viejos conserven su historia. */
  categorias:["Clean","Paint","Resurface","Make Ready Checklist","Flooring Services","Repair",
              "Installation","Removal","Estimate","Inspection",
              "Carpet","Trash out","Pressure washing","Cabinet","Ceramica"],
  // Cada servicio cuelga de su tipo. Se conservan los ids existentes para que los renombrados sigan
  // enlazados; los que no tienen equivalente en Services.xlsx quedan con baja:true.
  servicios:[
    {id:"S1",tipo:"Clean",nombre:"Full clean"},{id:"S2",tipo:"Clean",nombre:"Heavy clean"},
    {id:"S4",tipo:"Clean",nombre:"Office and amenities"},{id:"S3",tipo:"Clean",nombre:"Touch up clean"},
    {id:"S14",tipo:"Clean",nombre:"Carpet clean"},{id:"S15",tipo:"Clean",nombre:"Trash out"},
    {id:"S16",tipo:"Clean",nombre:"Pressure washing"},{id:"S27",tipo:"Clean",nombre:"Carpet - Pet treatment"},
    {id:"S5",tipo:"Clean",nombre:"Amenities",baja:true},
    {id:"S6",tipo:"Paint",nombre:"Full paint"},{id:"S8",tipo:"Paint",nombre:"Color change"},
    {id:"S10",tipo:"Paint",nombre:"Gloss finish change"},{id:"S9",tipo:"Paint",nombre:"Touch up paint"},
    {id:"S11",tipo:"Paint",nombre:"Full ceilings paint"},{id:"S28",tipo:"Paint",nombre:"Partial ceilings paint"},
    {id:"S29",tipo:"Paint",nombre:"Exterior door paint"},{id:"S30",tipo:"Paint",nombre:"Bathroom cabinet paint"},
    {id:"S18",tipo:"Paint",nombre:"Kitchen cabinet paint"},{id:"S31",tipo:"Paint",nombre:"Exterior closet paint"},
    {id:"S32",tipo:"Paint",nombre:"Color change ceilings paint"},{id:"S33",tipo:"Paint",nombre:"Accent wall paint"},
    {id:"S7",tipo:"Paint",nombre:"Partial paint",baja:true},
    {id:"S19",tipo:"Resurface",nombre:"Tub resurfacing just tub"},{id:"S20",tipo:"Resurface",nombre:"Tub resurfacing with wall"},
    {id:"S17",tipo:"Resurface",nombre:"Bathroom cabinet resurface"},{id:"S34",tipo:"Resurface",nombre:"Kitchen cabinet resurface"},
    {id:"S35",tipo:"Resurface",nombre:"Bathroom countertop resurface"},{id:"S36",tipo:"Resurface",nombre:"Kitchen countertop resurface"},
    {id:"S37",tipo:"Resurface",nombre:"Sink resurface"},{id:"S38",tipo:"Resurface",nombre:"Kitchen countertop marble resurface"},
    {id:"S39",tipo:"Resurface",nombre:"Bathroom countertop marble resurface"},
    {id:"S21",tipo:"Resurface",nombre:"Resurface countertops",baja:true},
    {id:"S23",tipo:"Make Ready Checklist",nombre:"Make Ready Checklist"},
    {id:"S40",tipo:"Flooring Services",nombre:"Carpet tear out"},
    {id:"S12",tipo:"Repair",nombre:"Sheetrock repair"},{id:"S41",tipo:"Repair",nombre:"Tape repair"},
    {id:"S42",tipo:"Repair",nombre:"Popcorn texture repair"},{id:"S43",tipo:"Repair",nombre:"Texture repair"},
    {id:"S44",tipo:"Repair",nombre:"Countertop repair"},{id:"S45",tipo:"Repair",nombre:"Bath tub repair"},
    {id:"S46",tipo:"Repair",nombre:"Tile repair"},{id:"S47",tipo:"Repair",nombre:"Door repair"},
    {id:"S48",tipo:"Repair",nombre:"Window repair"},{id:"S49",tipo:"Repair",nombre:"Balcony repair"},
    {id:"S13",tipo:"Repair",nombre:"Extra prep"},
    {id:"S50",tipo:"Installation",nombre:"Tile installation"},{id:"S51",tipo:"Installation",nombre:"Grab bar installation"},
    {id:"S52",tipo:"Installation",nombre:"Bath tub installation"},{id:"S53",tipo:"Installation",nombre:"Light fixture installation"},
    {id:"S54",tipo:"Installation",nombre:"Blinds installation"},{id:"S55",tipo:"Installation",nombre:"Dishwasher installation"},
    {id:"S56",tipo:"Installation",nombre:"Kitchen installation"},{id:"S57",tipo:"Installation",nombre:"Interior door installation"},
    {id:"S58",tipo:"Installation",nombre:"Exterior door installation"},{id:"S59",tipo:"Installation",nombre:"2 doors interior closet installation"},
    {id:"S60",tipo:"Installation",nombre:"4 doors interior closet installation"},{id:"S61",tipo:"Installation",nombre:"Trim installation"},
    {id:"S62",tipo:"Installation",nombre:"Baseboard installation"},{id:"S22",tipo:"Installation",nombre:"Full cabinets installation"},
    {id:"S63",tipo:"Installation",nombre:"Full cabinets door installation"},{id:"S64",tipo:"Installation",nombre:"Shower rod installation"},
    {id:"S65",tipo:"Installation",nombre:"Cabinet handles installation"},
    {id:"S66",tipo:"Removal",nombre:"Removal"},
    {id:"S24",tipo:"Estimate",nombre:"Estimate"},
    {id:"S25",tipo:"Inspection",nombre:"Inspection"},
    {id:"S26",tipo:"Ceramica",nombre:"Ceramica",baja:true},
    // Solo para change orders (ver tiposCO): no se agendan como Work Order. El precio lo pone oficina al aprobar.
    {id:"S67",tipo:"Surcharges",nombre:"Studio surcharge"},{id:"S68",tipo:"Surcharges",nombre:"Garage surcharge"},
    {id:"S69",tipo:"Miscellaneous",nombre:"Other"}
  ],
  /* Un change order es un servicio del catálogo pedido desde el campo: el técnico elige tipo y servicio, y el precio
     sale de su tarifa. Estos dos tipos existen solo para change orders (recargos por espacio extra y lo imprevisto),
     por eso no están en «categorias» ni aparecen al crear una Work Order. */
  tiposCO:["Surcharges","Miscellaneous"],
  /* Change order items: la lista suelta de antes (Catalogo!P + flujograma del técnico). Los que tienen servicio
     equivalente en Services.xlsx quedaron de baja (S.bajas.adicionales); los activos esperan que Erika diga a qué
     servicio corresponden. */
  adicionales:["Extra clean","Cambio de color","Cambio de brillo (sheen)","Extra prep","Heavy clean","Simple repair","Servicio adicional",
               "Studio","Balcony","Living room (carpet)","Tape","Sheetrock","Masa","Garage","Primer","Textura","Closet exterior","Door","Caulking","Other"],
  // Precio fijo de un change order item pendiente. Heavy clean ya sale de su tarifa y Simple repair dejó de existir.
  adicionalesCatalogo:[
    {id:"AD1",nombre:"Extra clean",precio:55,pago:30}
  ],
  ubicaciones:["Sala","Comedor","Room","Bano","Closet","Pantry","Exterior","Otro"],   // Catalogo!Q
  // Cómo se clasifica un daño previo. Sale de lo que describió Claudia:
  // «interruptores manchados con pintura», golpes, marcas que ya estaban.
  condiciones:["Pintura","Pared / drywall","Pisos","Accesorios","Limpieza","Otro"],
  especialidades:["Housekeeper","Carpeter","Tecnico","Resurface","Supervisor","Make Ready"],
  folder:["Completo","Antes","Despues","Findings"],                                    // Catalogo!W
  // Catalogo!S tal cual (10) + el único que su Dashboard mide y no existe
  /* PRODUCCIÓN: en el prototipo ningún código asigna Pending, Rescheduled, Returned,
     Corrected, Inspeccion ni Esperando aprobación (solo existen en datos de ejemplo).
     En la versión real: registrar un return pasa la WO a Returned y cerrarla a
     Corrected; reagendar a Rescheduled; un adicional por aprobar a Esperando aprobación.
     Invoiced y Paid no son estados aquí: son marcas (facturada, pagadaTec, cobrada).
     Asignar técnico no cambia el estado; Confirmed = el cliente confirmó la fecha
     (la descripción en vistas/catalogos-crud.js dice otra cosa y hay que corregirla). */
  estados:[
    {n:"Scheduled",   p:"g", nuevo:false},
    {n:"Confirmed",   p:"a", nuevo:false},   // el CLIENTE confirmó la fecha (Schedule.Client confirmation)
    {n:"In progress", p:"m", nuevo:false},
    {n:"Esperando aprobación", p:"w", nuevo:true},
    {n:"Detenido",p:"w"},{n:"Completed",   p:"v", nuevo:false},
    {n:"Pending",     p:"g", nuevo:false},
    {n:"Rescheduled", p:"w", nuevo:false},
    {n:"Returned",    p:"r", nuevo:false},
    {n:"Corrected",   p:"a", nuevo:false},
    {n:"Canceled",    p:"r", nuevo:false},
    {n:"Inspeccion",  p:"m", nuevo:false}
  ],
  tiendas:["Home Depot","Walmart","Sherwin Williams","Lowe's","Amazon"],
  medios:["Correo","Mensaje","Llamada","Enlace digital"]
};
const estP = n => (CAT.estados.find(e=>e.n===n)||{p:"g"}).p;
/* "Quedó en confirmar después" no tenía dónde verse fuera del momento en
   que se registraba — ni en la lista, ni en el detalle. Esta es la marca
   visible, igual criterio que "↻ reagendada": no bloquea nada, solo hace
   que cualquiera que vea la WO se entere de que la fecha sigue floja. */
const fechaSinConfirmar = w => !w.confirmCliente && (w.propuestas||[]).length>0
  && !["Completed","Canceled","Invoiced","Paid"].includes(w.estado);

/* ── Aquí nada se borra: se da de baja ──
   Un valor dado de baja deja de ofrecerse para registros nuevos, pero sigue
   mostrándose en todo lo que ya lo usaba. Así no quedan registros huérfanos
   ni se pierde historia. Lo mismo aplica a Work Orders (Canceled),
   propiedades, técnicos y clientes: cambian de estado, no desaparecen. */
const debaja = (k,v) => (S.bajas[k]||[]).includes(String(v));
const activos = k => CAT[k].filter(v=>!debaja(k,v));
const zonasN = () => activos("zonas");
/* «aquí a la semana. Pero la semana es cuando da la fecha» — se calcula, no se escribe */
function semanaDe(fecha){ const d=new Date(fecha+"T00:00:00"); const e=new Date(d.getFullYear(),0,1);
  return Math.ceil((((d-e)/86400000)+e.getDay()+1)/7); }
const servDe = t => CAT.servicios.filter(s=>s.tipo===t && !s.baja).map(s=>s.nombre);
const servTodos = t => CAT.servicios.filter(s=>s.tipo===t);
/* Lo que se puede pedir como change order (técnico en sitio o Sub-WO de oficina): los tipos de servicio que son
   trabajo (Estimate e Inspection no), los dos tipos propios de change order y, mientras queden, los change order items
   que Erika todavía no ubicó en un servicio. */
const CO_PEND = "Change order items";
const tiposCO = () => activos("categorias").filter(c=>!["Estimate","Inspection"].includes(c))
  .concat((CAT.tiposCO||[]).filter(t=>!debaja("categorias",t)))
  .concat(activos("adicionales").length ? [CO_PEND] : []);
const opcionesCO = t => t===CO_PEND ? activos("adicionales") : servDe(t);

/* ══════════ ROLES — quién ve qué (UC del módulo que le toca) ══════════ */
const ROLES = {
  "Claudia":{i:"CV",r:"Administración / Estimados",m:"*"},
  "Lydia":  {i:"LC",r:"Comercial",     m:["tablero","clientes","solicitudes","estimados","propiedades","wo","calendario","excepciones","reportes","alertas"]},
  "Thalia": {i:"TM",r:"Programación",  m:["tablero","wo","calendario","despacho","devoluciones","supervision","propiedades","tecnicos","catalogos","excepciones","reportes","alertas"]},
  "Gustavo":{i:"GA",r:"Supervisión",   m:["tablero","wo","calendario","supervision","gustavoweb","inventario","tecnicos","excepciones","reportes","alertas"]},
  "Erika":  {i:"EM",r:"Administración",m:["tablero","wo","devoluciones","nomina","facturacion","cobranza","tarifario","inventario","finanzas","excepciones","reportes","buscar","alertas","bitacora"]}
  ,"Contador":{i:"CT",r:"Contabilidad · solo lectura",m:["tablero","finanzas","inventario","reportes"]}
};
/* Teléfono que se le da al cajero cuando el técnico compra material en
   tienda con la tarjeta de la empresa — lo usa la tarjeta "Compra de
   materiales" del celular del técnico. */
const CLAUDIA_TEL = "850-555-0100";
const MODS = [
  {g:"Operación"},
  {id:"tablero",   n:"Tablero",              ic:'<path d="M3 13h8V3H3zM13 21h8V11h-8zM13 7h8V3h-8zM3 21h8v-4H3z"/>'},
  {id:"wo",        n:"Work Orders",          ic:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15h6"/>'},
  {id:"calendario",n:"Calendario",           ic:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'},
  {id:"despacho",  n:"Disponibilidad",       ic:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'},
  {id:"supervision",n:"Supervisión",         ic:'<path d="M20 6L9 17l-5-5"/>'},
  {id:"devoluciones",n:"Returns",    ic:'<path d="M9 14L4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>'},
  {id:"gustavoweb",n:"Vista de Gustavo (web)",ic:'<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M9 18h6"/>'},
  {id:"excepciones",n:"Requests",         ic:'<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>'},
  {id:"reportes",  n:"Reportes",              ic:'<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>'},
  {id:"buscar",    n:"Buscar",               ic:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'},
  {g:"Comercial"},
  {id:"clientes",  n:"Management",ic:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>'},
  {id:"solicitudes",n:"Solicitudes",         ic:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'},
  {id:"estimados", n:"Estimados",            ic:'<path d="M9 11H5a2 2 0 0 0-2 2v7h18v-7a2 2 0 0 0-2-2h-4M9 11V4h6v7M9 11h6"/>'},
  {g:"Maestros"},
  {id:"propiedades",n:"Propiedades",         ic:'<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5"/>'},
  {id:"tecnicos",  n:"Técnicos",             ic:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'},
  {id:"tarifario", n:"Tarifario",            ic:'<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'},
  {id:"catalogos", n:"Catálogos",            ic:'<path d="M4 6h16M4 12h16M4 18h16"/>'},
  {g:"Administración"},
  {id:"nomina",    n:"Nómina de la semana",  ic:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>'},
  {id:"facturacion",n:"Facturación",         ic:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/>'},
  {id:"auditoria", n:"Auditoría financiera",  ic:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'},
  {id:"cobranza",  n:"Cobranza",             ic:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>'},
  {id:"inventario",n:"Inventario",           ic:'<path d="M21 16V8l-9-5-9 5v8l9 5z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/>'},
  {id:"finanzas", n:"Finanzas",             ic:'<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>'},
  {g:"Sistema"},
  {id:"alertas",   n:"Alertas",              ic:'<path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>'},
  {id:"bitacora",  n:"Bitácora",             ic:'<path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/>'}
];

"use strict";
/* ══════════ CRM · PERFIL VENTAS ══════════
   Puerta de entrada de las cuentas nuevas y guardián de la relación con las activas.
   Reglas de CPS:
   - Una WO de una cuenta activa nunca pasa por Ventas: la oficina agenda como siempre.
   - Ventas no pone precios: pide el estimado a la oficina (Solicitudes comerciales).
   - Al dar de alta, la oportunidad se convierte en la MISMA propiedad (Lead) y Claudia completa el expediente.
   - La cuenta pasa sola a Activa cuando tiene expediente completo y su primera WO agendada.
   - Lo que Ventas anota sobre una propiedad real queda también en su pestaña Comunicación.
   Los datos viven en S.crm (config «crm» de la nube). */

const CRM_ETAPAS = [
  {k:"prospecto",  n:"Prospecto",   p:"g", req:"Nombre, zona y de dónde llegó."},
  {k:"contactado", n:"Contactado",  p:"a", req:"Un contacto con nombre y al menos una actividad registrada."},
  {k:"visita",     n:"Visita",      p:"a", req:"Una visita (walkthrough) registrada."},
  {k:"propuesta",  n:"Propuesta",   p:"w", req:"Estimado pedido a la oficina."},
  {k:"negociacion",n:"Negociación", p:"w", req:"La oficina envió el estimado al cliente."},
  {k:"alta",       n:"Alta",        p:"m", req:"El cliente aceptó y la oficina recibió la propiedad para el expediente."},
  {k:"activa",     n:"Activa",      p:"v", req:"Expediente completo y primera WO agendada (pasa sola)."}
];
/* Vendedores = catálogo «Ejecutivos de ventas» (el mismo que usa el formulario de la propiedad).
   Claudia los crea desde «Metas del equipo» o desde Catálogos; cada uno activo tiene su usuario con perfil Ventas. */
const crmVendLista = () => activos("vendedores");
const CRM_ACT_TIPOS = ["Llamada","Visita","Mensaje de texto","Correo","Nota"];
const CRM_ORIGENES = ["Llamada","Mensaje de texto","Formulario web","Referido","Visita comercial","Correo"];
const CRM_ROLES_CONT = ["Property Manager","Assistant Manager","Maintenance Supervisor","Regional Manager","Otro"];
const CRM_MOTIVOS = ["Precio","Ya tienen vendor","Sin respuesta","Zona fuera de cobertura","No cumplimos requisitos del management","Otro"];
/* Valor mensual estimado de una cuenta: unidades × rotación anual × ticket promedio de make-ready ÷ 12.
   Sirve para priorizar, no es un compromiso. */
const CRM_ROT = 0.45, CRM_TICKET = 380;
const CRM_ESTANCADO = 14;   // días sin actividad para marcar un trato como estancado

const crmD = n => fechaMover(hoyReal(), n);
if(!S.crm) S.crm = (() => {
  const a = (opp, tipo, n, nota, quien) => ({id:"CA"+opp+n, opp, prop:null, tipo, fecha:crmD(n), nota, quien});
  return {
    opps:[
      {id:"OP1",nombre:"Bayview Commons",mgmt:"Greystar",zona:"Pensacola",dir:"4100 Bayou Blvd",unidades:180,origen:"Referido",etapa:"prospecto",owner:"Daniela",
       creado:crmD(-3),etapaDesde:crmD(-3),contacto:{nombre:"",rol:"Property Manager",tel:"",mail:""},prox:{tipo:"Llamada",fecha:crmD(0),nota:"Pedir nombre del manager en la oficina de leasing"}},
      {id:"OP2",nombre:"Palms at Navarre",mgmt:"Cortland",zona:"Gulf Breeze",dir:"8700 Navarre Pkwy",unidades:260,origen:"Formulario web",etapa:"contactado",owner:"Daniela",
       creado:crmD(-12),etapaDesde:crmD(-6),contacto:{nombre:"Megan Lowe",rol:"Property Manager",tel:"850-555-0144",mail:"mlowe@cortland.com"},prox:{tipo:"Visita",fecha:crmD(2),nota:"Walkthrough de 3 unidades vacías"}},
      {id:"OP3",nombre:"Magnolia Trace",mgmt:"",zona:"Foley",dir:"201 Magnolia Ave",unidades:120,origen:"Visita comercial",etapa:"visita",owner:"Daniela",
       creado:crmD(-30),etapaDesde:crmD(-16),contacto:{nombre:"Tom Reyes",rol:"Maintenance Supervisor",tel:"251-555-0170",mail:""},prox:{tipo:"Llamada",fecha:crmD(-2),nota:"Confirmar si quieren precio de pintura completa"}},
      {id:"OP4",nombre:"Cordova Ridge",mgmt:"Trident Group",zona:"Pensacola",dir:"9 Cordova Ln",unidades:300,origen:"Llamada",etapa:"propuesta",owner:"Daniela",
       creado:crmD(-25),etapaDesde:crmD(-4),contacto:{nombre:"Rick Halloway",rol:"Regional Manager",tel:"251-555-0198",mail:"rick@tridentgrp.com"},prox:{tipo:"Correo",fecha:crmD(1),nota:"Preguntar a Claudia por el estimado"},
       estHist:{estado:"En preparación",num:""}},
      {id:"OP5",nombre:"Seaside Villas",mgmt:"",zona:"Gulf Breeze",dir:"12 Via Deluna",unidades:90,origen:"Correo",etapa:"negociacion",owner:"Daniela",
       creado:crmD(-40),etapaDesde:crmD(-9),contacto:{nombre:"Ana Pruitt",rol:"Property Manager",tel:"850-555-0122",mail:"apruitt@seasidevillas.com"},prox:{tipo:"Llamada",fecha:crmD(-1),nota:"Respuesta sobre el precio de limpieza"},
       estHist:{estado:"Enviado",num:"EST-2026-027"}},
      {id:"OP6",nombre:"Sevilla Apartments",mgmt:"",zona:"Foley",dir:"3151 Boulevard de Sevilla",unidades:220,origen:"Llamada",etapa:"activa",owner:"Daniela",prop:"P107",
       creado:crmD(-120),etapaDesde:crmD(-60),activada:crmD(-60),contacto:{nombre:"Gabriela Perez",rol:"Property Manager",tel:"251-555-0198",mail:""},prox:{tipo:"Llamada",fecha:crmD(10),nota:"Revisión trimestral con el manager"}},
      {id:"OP10",nombre:"Carriage Hills",mgmt:"",zona:"Pensacola",dir:"922 Brookside",unidades:160,origen:"Llamada",etapa:"activa",owner:"Óscar",prop:"P108",
       creado:crmD(-45),etapaDesde:crmD(-3),activada:crmD(-3),contacto:{nombre:"Rick",rol:"Maintenance Supervisor",tel:"850-501-6894",mail:""},prox:{tipo:"Llamada",fecha:crmD(4),nota:"Preguntar cómo quedó el primer trabajo"}},
      {id:"OP7",nombre:"Pinewood Flats",mgmt:"",zona:"Foley",dir:"77 Pine St",unidades:150,origen:"Referido",etapa:"visita",owner:"Óscar",
       creado:crmD(-14),etapaDesde:crmD(-5),contacto:{nombre:"Laura Kim",rol:"Assistant Manager",tel:"251-555-0181",mail:"lkim@pinewood.com"},prox:{tipo:"Correo",fecha:crmD(1),nota:"Mandar lista de servicios"}},
      {id:"OP8",nombre:"Lakeside at Milton",mgmt:"Lincoln Property",zona:"Pensacola",dir:"5500 Hwy 90",unidades:210,origen:"Llamada",etapa:"negociacion",owner:"Óscar",
       creado:crmD(-35),etapaDesde:crmD(-3),contacto:{nombre:"Chris Dale",rol:"Property Manager",tel:"850-555-0190",mail:"cdale@lpc.com"},prox:{tipo:"Visita",fecha:crmD(3),nota:"Presentar equipo de pintura"},
       estHist:{estado:"Enviado",num:"EST-2026-029"}},
      {id:"OP9",nombre:"Oak Hollow",mgmt:"",zona:"Pensacola",dir:"18 Oak Hollow Dr",unidades:80,origen:"Formulario web",etapa:"perdida",owner:"Daniela",
       creado:crmD(-50),etapaDesde:crmD(-20),etapaPerdida:"propuesta",motivo:"Ya tienen vendor",recontacto:crmD(60),contacto:{nombre:"Joe Park",rol:"Property Manager",tel:"850-555-0133",mail:""},prox:null}
    ],
    acts:[
      a("OP2","Llamada",-6,"Le interesa comparar precios de limpieza; tiene 12 unidades por mes","Daniela"),
      a("OP3","Llamada",-20,"Pidió visita","Daniela"),
      a("OP3","Visita",-16,"Recorrimos 4 unidades. Hoy pintan con su propio personal","Daniela"),
      a("OP4","Llamada",-12,"Rick quiere un vendor para Cordova Ridge además de Harbor Pointe","Daniela"),
      a("OP4","Visita",-8,"Walkthrough completo. Pidió estimado de full paint y full clean","Daniela"),
      a("OP5","Visita",-20,"Unidades pequeñas, mucha rotación en verano","Daniela"),
      a("OP5","Correo",-9,"La oficina envió el estimado EST-2026-027","Daniela"),
      a("OP6","Llamada",-30,"Seguimiento: contentos con los tiempos de entrega","Daniela"),
      a("OP10","Visita",-20,"Walkthrough con el maintenance supervisor","Óscar"),
      a("OP7","Visita",-5,"Walkthrough de 2 unidades","Óscar"),
      a("OP8","Visita",-10,"Interés alto, piden descuento por volumen","Óscar"),
      a("OP8","Llamada",-3,"Negociando el precio de pintura","Óscar"),
      a("OP9","Llamada",-20,"Firmaron con otro vendor por un año","Daniela")
    ],
    metas:{
      "Daniela":{activadas:2, unidades:400, visitas:12, estimados:4},
      "Óscar":  {activadas:2, unidades:350, visitas:10, estimados:4}
    }
  };
})();

/* ── helpers ── */
const crmEsVentas = () => (ROLES[S.usuario]||{}).r==="Ventas";
const crmIdx = k => CRM_ETAPAS.findIndex(e=>e.k===k);
const crmEtapa = k => CRM_ETAPAS.find(e=>e.k===k) || {k, n:k==="perdida"?"Perdida":k, p:"r"};
const crmDias = (desde, hasta) => !desde ? 0 : Math.round((new Date((hasta||hoyReal())+"T12:00:00")-new Date(desde+"T12:00:00"))/864e5);
const crmValor = o => Math.round((+o.unidades||0)*CRM_ROT*CRM_TICKET/12);
const crmActs = o => S.crm.acts.filter(a=>a.opp===o.id).sort((x,y)=>y.fecha.localeCompare(x.fecha));
const crmUltAct = o => { const a=crmActs(o)[0]; return a ? a.fecha : o.creado; };
const crmAbierta = o => o.etapa!=="activa" && o.etapa!=="perdida";
const crmEstancada = o => crmAbierta(o) && crmDias(crmUltAct(o)) >= CRM_ESTANCADO;
const crmVencida = o => crmAbierta(o) && o.prox && o.prox.fecha && o.prox.fecha < hoyReal();
const crmFecha = f => { if(!f) return "—"; const [y,m,d]=f.split("-"); return d+"/"+m; };
const crmMes = () => hoyReal().slice(0,7);
/* Quién ve qué: Ventas solo lo suyo; la administración ve todo o filtra por vendedor. */
const crmVendActivo = () => crmEsVentas() ? S.usuario : (S.crmVend||"");
const crmMias = () => S.crm.opps.filter(o=>!crmVendActivo() || o.owner===crmVendActivo());
const crmVendDe = () => crmVendActivo() ? [crmVendActivo()] : crmVendLista();

/* Lo que la oficina hizo con el pedido de estimado */
function crmEst(o){
  const sol = o.solId ? by(S.solicitudesComerciales, o.solId) : null;
  if(sol){
    const est = sol.estimadoId ? (by(S.estimados, sol.estimadoId) || S.estimados.find(e=>e.num===sol.estimadoId)) : null;
    if(est) return {estado:est.estado, num:est.num, sol};
  }
  /* Si Claudia lo armó por fuera (desde Estimados y no desde la solicitud), igual cuenta: cualquier estimado
     enviado o aprobado de esa misma propiedad. Así el vendedor nunca queda trabado en Propuesta. */
  const otro = o.prop ? S.estimados.filter(e=>e.prop===o.prop && CRM_EST_OK.includes(e.estado))
    .sort((a,b)=>String(b.fecha||"").localeCompare(String(a.fecha||"")))[0] : null;
  if(otro) return {estado:otro.estado, num:otro.num, sol};
  if(sol) return {estado: sol.estado==="Descartada" ? "Descartada" : "En preparación", num:"", sol};
  return o.estHist || null;
}
const CRM_EST_OK = ["Enviado","Aprobado","Transferido"];
const crmEstEnviado = o => { const e=crmEst(o); return !!e && CRM_EST_OK.includes(e.estado); };
/* Se puede volver a pedir si nunca se pidió, o si la oficina lo descartó o el cliente lo rechazó */
const crmPuedePedirEst = o => { if(o.etapa==="perdida") return false; const e=crmEst(o);
  return !e || ["Descartada","Rechazado"].includes(e.estado) || (o.etapa==="activa" && CRM_EST_OK.includes(e.estado)); };
const crmWOsProp = pid => S.wos.filter(w=>w.prop===pid && w.estado!=="Canceled");

/* Qué falta para llegar a una etapa (acumulado desde la actual) */
function crmFalta(o, destino){
  const i = crmIdx(destino), f = [];
  if(i>=1){ if(!String(o.contacto&&o.contacto.nombre||"").trim()) f.push("el nombre del contacto");
            if(!crmActs(o).length) f.push("registrar al menos una actividad"); }
  if(i>=2 && !crmActs(o).some(a=>a.tipo==="Visita")) f.push("registrar la visita (walkthrough)");
  if(i>=3 && !o.solId && !o.estHist && !crmEstEnviado(o)) f.push("pedir el estimado a la oficina");
  if(i>=4 && !crmEstEnviado(o)) f.push("que la oficina envíe el estimado al cliente");
  if(i>=5 && !o.alta) f.push("dar de alta la cuenta (botón «Dar de alta»)");
  if(i>=6){
    if(o.prop && !expedienteOK(o.prop)) f.push("que Claudia complete el expediente (COI vigente)");
    if(!o.prop || !crmWOsProp(o.prop).length) f.push("que la oficina agende la primera WO");
  }
  return f;
}

/* Cada vendedor activo del catálogo tiene un usuario «Ventas»; los dados de baja dejan de poder entrar
   (sus cuentas y su historial se conservan). Los dueños de oportunidades que todavía no estén en el catálogo se agregan. */
function crmRoles(){
  if(!S.crm || !CAT.vendedores) return;
  S.crm.opps.forEach(o=>{ if(o.owner && !CAT.vendedores.includes(o.owner) && !debaja("vendedores",o.owner)) CAT.vendedores.push(o.owner); });
  activos("vendedores").forEach(v=>{ if(!ROLES[v]) ROLES[v] = {i:v.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase(), r:"Ventas", m:["crm"]}; });
  Object.keys(ROLES).forEach(k=>{ if(ROLES[k].r==="Ventas" && debaja("vendedores",k) && S.usuario!==k) delete ROLES[k]; });
}
/* Regla que ya existía en la oficina: cuando el cliente aprueba el estimado, la propiedad
   pasa de Lead a Active (deja de ser prospecto). El CRM la obedece: el trato pasa solo a
   Alta y a Claudia le llega el aviso para subir los documentos.
   Activación automática: expediente completo + primera WO agendada. */
function crmSync(){
  S.crm.opps.forEach(crmLeerProp);
  S.crm.opps.forEach(o=>{
    if(!o.prop || ["alta","activa","perdida"].includes(o.etapa)) return;
    const p = P(o.prop); if(!p.id || estadoProp(p)!=="Active") return;
    const e = S.estimados.find(x=>x.prop===o.prop && ["Aprobado","Transferido"].includes(x.estado)); if(!e) return;
    o.alta = hoyReal(); o.altaVia = "estimado"; crmCambiarEtapa(o, "alta");
    if(!p.vendedor) p.vendedor = o.owner;
    S.crm.acts.push({id:"CA"+Date.now().toString(36)+o.id, opp:o.id, prop:o.prop, tipo:"Nota", fecha:hoyReal(), nota:`El cliente aprobó el estimado ${e.num||""}: pasó a Alta y a la oficina`, quien:"Sistema"});
    avisar("Claudia","Cuenta nueva para expediente", `${esc(o.nombre)} (${esc(o.owner)}) aprobó el estimado ${esc(e.num||"")}. Sube COI y documentos y carga la lista de precios para poder agendar.`, "v");
    if(o.owner) avisar(o.owner,"Tu cliente aprobó el estimado", `${esc(o.nombre)} ya es cliente. La oficina arma el expediente; queda Activa con su primera WO.`, "v");
  });
  S.crm.opps.forEach(o=>{
    if(o.etapa==="alta" && o.alta && o.prop && expedienteOK(o.prop) && crmWOsProp(o.prop).length){
      o.etapa="activa"; o.etapaDesde=hoyReal(); o.activada=hoyReal();
      const p=P(o.prop); if(p.id && p.estado==="Lead") p.estado="Active";
      if(!p.vendedor) p.vendedor=o.owner;
    }
  });
}

/* Salud de una propiedad activa, con datos reales de la operación */
function crmSalud(p){
  const hoy=hoyReal(), ws=crmWOsProp(p.id).filter(w=>w.fecha);
  const ult = ws.map(w=>w.fecha).sort().pop() || null;
  const sin = ult ? crmDias(ult) : null;
  const n30 = ws.filter(w=>crmDias(w.fecha)<=30 && w.fecha<=hoy).length;
  const prom = Math.round(ws.filter(w=>crmDias(w.fecha)<=90 && w.fecha<=hoy).length/3*10)/10;
  const ret = (S.devoluciones||[]).filter(d=>d.estado!=="Cerrada" && (d.prop===p.id || (S.wos.find(w=>w.id===d.wo)||{}).prop===p.id)).length;
  const venc = (S.facturas||[]).filter(f=>f.prop===p.id && typeof facVencida==="function" && facVencida(f)).length;
  /* Cambio de manager: un contacto inactivado en los últimos 30 días → preséntate al nuevo */
  const mgr = S.contactos.some(c=>c.prop===p.id && c.inactivo && c.inactivoFecha && crmDias(c.inactivoFecha)<=30);
  const why=[]; let s="v";
  if(sin===null){ why.push("todavía sin WO"); s="w"; }
  else if(sin>=30){ why.push(`${sin} días sin WO`); s="r"; }
  else if(sin>=14){ why.push(`${sin} días sin WO`); s="w"; }
  if(prom>=2 && n30 < prom*0.5){ why.push(`bajó a ${n30} WO en 30 días (promedio ${prom}/mes)`); s="r"; }
  if(venc){ why.push(`${venc} factura(s) vencida(s)`); s="r"; }
  if(ret>=2){ why.push(`${ret} returns abiertos`); if(s==="v") s="w"; }
  if(mgr){ why.push("cambió un contacto: preséntate al nuevo"); if(s==="v") s="w"; }
  return {s, why, ult, sin, n30, prom, ret, venc};
}
/* Cartera: propiedades activas del vendedor (o todas para la administración) */
function crmCartera(){
  const v = crmVendActivo();
  return S.propiedades.filter(p=>p.estado==="Active" && p.activa!==false).filter(p=>{
    if(!v) return true;
    const o = S.crm.opps.find(x=>x.prop===p.id);
    return p.vendedor===v || (o && o.owner===v);
  });
}
const crmDueno = p => { const o=S.crm.opps.find(x=>x.prop===p.id); return p.vendedor || (o&&o.owner) || ""; };

/* Avance del mes contra la meta */
function crmAvance(vends){
  const m = crmMes(), opps = S.crm.opps.filter(o=>vends.includes(o.owner));
  const act = opps.filter(o=>o.activada && o.activada.startsWith(m));
  const r = {
    activadas: act.length,
    unidades: act.reduce((s,o)=>s+(+o.unidades||0),0),
    visitas: S.crm.acts.filter(a=>a.tipo==="Visita" && a.fecha.startsWith(m) && vends.includes(a.quien)).length,
    estimados: opps.filter(o=>o.solFecha && o.solFecha.startsWith(m)).length
  };
  const meta = {activadas:0,unidades:0,visitas:0,estimados:0};
  vends.forEach(v=>{ const x=S.crm.metas[v]||{}; Object.keys(meta).forEach(k=>meta[k]+= +x[k]||0); });
  return {r, meta};
}

/* ── piezas de interfaz ── */
const crmPill = k => { const e=crmEtapa(k); return `<span class="pill ${e.p}">${esc(e.n)}</span>`; };
function crmMeta(l, v, m, unidad){
  const pct = m ? Math.min(100, Math.round(v/m*100)) : 0;
  return `<div class="kpi crm-meta"><div class="l">${l}</div>
    <div class="v ${pct>=100?"g":""}">${v}<small> / ${m}${unidad||""}</small></div>
    <div class="crm-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${l}"><i style="width:${pct}%"></i></div></div>`;
}
function crmProx(o){
  if(!o.prox || !o.prox.fecha) return `<span class="crm-sinprox">Sin próxima acción</span>`;
  const v = o.prox.fecha < hoyReal(), h = o.prox.fecha===hoyReal();
  return `<span class="crm-prox ${v?"venc":h?"hoy":""}">${esc(o.prox.tipo)} ${v?"vencida":h?"hoy":crmFecha(o.prox.fecha)}</span>`;
}

VIEWS.crm = () => {
  crmSync();
  const admin = !crmEsVentas();
  const tabs = [["dia","Mi día"],["pipe","Pipeline"],["cuentas","Cuentas"],["salud","Salud de cartera"],["num","Números"]]
    .concat(admin ? [["equipo","Metas del equipo"]] : []);
  const t = S.crmTab && tabs.some(x=>x[0]===S.crmTab) ? S.crmTab : "dia";
  const sub = {dia:crmVDia, pipe:crmVPipe, cuentas:crmVCuentas, salud:crmVSalud, num:crmVNum, equipo:crmVEquipo}[t];
  return `<div class="ph"><div><h2>${admin?"CRM · Ventas":"Mi CRM"}</h2>
      <p>${admin?"Todo el trabajo comercial del equipo: prospectos, cuentas activas y metas.":"Tus prospectos, tus cuentas y tus metas del mes."}</p></div>
    <div class="act">
      ${admin?`<label class="crm-filtro"><span>Vendedor</span><select id="crmVendSel" data-a="crmVend" aria-label="Filtrar por vendedor">
        <option value="">Todo el equipo</option>${crmVendLista().map(v=>`<option ${S.crmVend===v?"selected":""}>${v}</option>`).join("")}</select></label>`:""}
      <button class="btn p" data-a="crmNueva">+ Nuevo prospecto</button></div></div>
    <div class="tabs" role="tablist">${tabs.map(([k,n])=>`<button class="tab ${t===k?"on":""}" role="tab" aria-selected="${t===k}" data-a="crmTab" data-t="${k}">${n}</button>`).join("")}</div>
    ${sub()}`;
};

function crmVDia(){
  const vends = crmVendDe(), {r, meta} = crmAvance(vends), hoy = hoyReal();
  const abiertas = crmMias().filter(crmAbierta);
  const tareas = abiertas.filter(o=>o.prox && o.prox.fecha && o.prox.fecha<=fechaMover(hoy,1))
    .sort((a,b)=>a.prox.fecha.localeCompare(b.prox.fecha));
  const sinProx = abiertas.filter(o=>!o.prox || !o.prox.fecha);
  const recontactar = crmMias().filter(o=>o.etapa==="perdida" && o.recontacto && o.recontacto<=hoy);
  const estanc = abiertas.filter(crmEstancada);
  const cartera = crmCartera().map(p=>({p, h:crmSalud(p)})).filter(x=>x.h.s!=="v");
  const recientes = crmMias().filter(o=>o.etapa==="activa" && crmDias(o.activada)<=14);
  const pipeVal = abiertas.reduce((s,o)=>s+crmValor(o),0);
  const metaVal = (meta.unidades||0)*CRM_ROT*CRM_TICKET/12;
  const cobertura = metaVal ? (pipeVal/metaVal) : 0;
  return `
  <div class="kpis">
    ${crmMeta("Cuentas activadas", r.activadas, meta.activadas)}
    ${crmMeta("Unidades ganadas", r.unidades, meta.unidades)}
    ${crmMeta("Visitas del mes", r.visitas, meta.visitas)}
    ${crmMeta("Estimados pedidos", r.estimados, meta.estimados)}
    <div class="kpi"><div class="l">Pipeline abierto</div><div class="v">${money(pipeVal).replace(".00","")}<small>/mes</small></div>
      <div class="crm-sub">${cobertura?`${cobertura.toFixed(1)}× tu meta de unidades`:"sin meta de unidades"}</div></div>
  </div>
  <div class="crm-dia">
    <div class="card"><div class="chd"><h3>Qué hacer hoy</h3><span class="s">${tareas.length+recontactar.length} pendiente(s) para hoy o mañana</span></div>
      ${tareas.length||recontactar.length?`<ul class="crm-list">${tareas.map(o=>{
        const v=o.prox.fecha<hoy;
        return `<li class="${v?"venc":""}"><div class="crm-li-main"><b>${esc(o.prox.tipo)}</b> · ${esc(o.nombre)}
          <div class="crm-li-sub">${esc(o.prox.nota||"")}${o.contacto&&o.contacto.nombre?` — ${esc(o.contacto.nombre)}`:""}</div></div>
          <span class="crm-when">${v?`Vencida ${crmFecha(o.prox.fecha)}`:o.prox.fecha===hoy?"Hoy":"Mañana"}</span>
          <button class="btn sm ${v?"p":""}" data-a="crmAbrir" data-id="${o.id}">Registrar</button></li>`;}).join("")}</ul>`
      :""}
      ${!tareas.length&&!recontactar.length?`<div class="empty">Nada pendiente para hoy. Revisa el pipeline y agenda tu próxima llamada.</div>`:""}
      ${recontactar.length?`<ul class="crm-list crm-recon">${recontactar.map(o=>`<li><div class="crm-li-main"><b>Volver a intentar</b> · ${esc(o.nombre)}
          <div class="crm-li-sub">Se perdió por «${esc(o.motivo||"")}». Hoy toca volver a contactar.</div></div>
          <span class="crm-when">${crmFecha(o.recontacto)}</span><button class="btn sm p" data-a="crmReabrir" data-id="${o.id}">Reabrir</button></li>`).join("")}</ul>`:""}
      ${sinProx.length?`<div class="cp crm-aviso">${sinProx.length} prospecto(s) sin próxima acción: ${sinProx.map(o=>`<button class="lnk" data-a="crmAbrir" data-id="${o.id}">${esc(o.nombre)}</button>`).join(", ")}</div>`:""}
    </div>
    <div>
      <div class="card"><div class="chd"><h3>Tratos estancados</h3><span class="s">${CRM_ESTANCADO}+ días sin actividad</span></div>
        ${estanc.length?`<ul class="crm-list">${estanc.map(o=>`<li><div class="crm-li-main">${esc(o.nombre)} ${crmPill(o.etapa)}
          <div class="crm-li-sub">Última actividad hace ${crmDias(crmUltAct(o))} días</div></div>
          <button class="btn sm" data-a="crmAbrir" data-id="${o.id}">Retomar</button></li>`).join("")}</ul>`
        :`<div class="empty">Ningún trato estancado.</div>`}</div>
      <div class="card"><div class="chd"><h3>Avisos de la oficina</h3><span class="s">lo que pasó en tus cuentas</span></div>
        ${(recientes.length||cartera.length)?`<ul class="crm-list">
          ${recientes.map(o=>{ const w=crmWOsProp(o.prop).find(x=>x.estado==="Completed");
            return `<li><div class="crm-li-main"><span class="pill v">Activa</span> ${esc(o.nombre)}
              <div class="crm-li-sub">${w?`Primer trabajo terminado (WO-${esc(w.id)}). Llama al manager para saber cómo quedó.`:"Ya tiene su primera WO agendada."}</div></div>
              <button class="btn sm" data-a="crmAbrir" data-id="${o.id}">Seguimiento</button></li>`;}).join("")}
          ${cartera.map(({p,h})=>`<li><div class="crm-li-main"><span class="crm-dot ${h.s}" aria-hidden="true"></span>${esc(p.nombre)}
              <div class="crm-li-sub">${esc(h.why.join("; "))}</div></div>
              <button class="btn sm" data-a="crmSaludAct" data-id="${p.id}">Registrar contacto</button></li>`).join("")}
        </ul>`:`<div class="empty">Tus cuentas activas están al día.</div>`}</div>
    </div>
  </div>`;
}

function crmVPipe(){
  const ops = crmMias();
  const perd = ops.filter(o=>o.etapa==="perdida");
  return `<div class="note" style="margin-bottom:12px">Arrastra una tarjeta a otra columna o usa sus flechas. Solo avanza si cumple lo que pide la etapa; «Activa» llega sola cuando la oficina completa el expediente y agenda la primera WO.</div>
  <div class="crm-board" aria-label="Pipeline comercial">
    ${CRM_ETAPAS.map((e,i)=>{
      const col = ops.filter(o=>o.etapa===e.k);
      const val = col.reduce((s,o)=>s+crmValor(o),0);
      return `<section class="crm-col" data-drop="${e.k}" aria-label="${e.n}">
        <header><div class="crm-col-t"><span class="crm-col-n">${i+1}</span>${e.n}<span class="crm-col-c">${col.length}</span></div>
          <div class="crm-col-v">${money(val).replace(".00","")}/mes</div>
          <div class="crm-col-r">${esc(e.req)}</div></header>
        <div class="crm-col-b">${col.map(o=>crmCard(o,i)).join("")||`<div class="crm-vacio">Sin tratos</div>`}</div>
      </section>`;}).join("")}
  </div>
  ${perd.length?`<div class="card"><div class="chd"><h3>Perdidas</h3><span class="s">con fecha para volver a contactar</span></div>
    <table><thead><tr><th>Prospecto</th><th>Llegó hasta</th><th>Motivo</th><th>Volver a contactar</th><th>Vendedor</th><th></th></tr></thead>
    <tbody>${perd.map(o=>`<tr><td><b>${esc(o.nombre)}</b><div class="crm-li-sub">${esc(o.zona)} · ${o.unidades} unidades</div></td>
      <td>${crmPill(o.etapaPerdida||"prospecto")}</td><td>${esc(o.motivo||"—")}</td>
      <td class="mono ${o.recontacto&&o.recontacto<=hoyReal()?"crm-txt-r":""}">${crmFecha(o.recontacto)}</td><td>${esc(o.owner)}</td>
      <td style="text-align:right"><button class="btn sm" data-a="crmReabrir" data-id="${o.id}">Reabrir</button></td></tr>`).join("")}</tbody></table></div>`:""}`;
}
function crmCard(o,i){
  const dias = crmDias(o.etapaDesde), est = crmEstancada(o);
  const ant = i>0 && o.etapa!=="activa" ? CRM_ETAPAS[i-1] : null, sig = i<5 ? CRM_ETAPAS[i+1] : null;
  return `<article class="crm-card ${est?"est":""} ${crmVencida(o)?"venc":""}" draggable="${o.etapa!=="activa"}" data-drag="${o.id}">
    <button class="crm-card-t" data-a="crmAbrir" data-id="${o.id}">${esc(o.nombre)}</button>
    <div class="crm-card-m">${esc(o.zona)}${o.mgmt?` · ${esc(o.mgmt)}`:""}${!crmEsVentas()?` · <b>${esc(o.owner)}</b>`:""}</div>
    <div class="crm-card-k"><span>${o.unidades} u.</span><span>${money(crmValor(o)).replace(".00","")}/mes</span></div>
    ${o.etapa==="activa"?`<div class="crm-card-x">Activa desde ${crmFecha(o.activada)}</div>`:crmProx(o)}
    <div class="crm-card-f"><span class="crm-dias" title="Días en esta etapa">${dias} d${est?" · estancado":" en etapa"}</span>
      <span class="crm-mv">${ant?`<button class="btn sm" data-a="crmMover" data-id="${o.id}" data-e="${ant.k}" aria-label="Regresar a ${ant.n}">‹</button>`:""}
        ${sig?`<button class="btn sm" data-a="crmMover" data-id="${o.id}" data-e="${sig.k}" aria-label="Avanzar a ${sig.n}">›</button>`:""}</span></div>
  </article>`;
}

function crmVCuentas(){
  const ops = crmMias();
  const filas = ops.map(o=>{
    const p = o.prop ? P(o.prop) : null, h = p && p.id && p.estado==="Active" ? crmSalud(p) : null;
    return {o, p, h};
  });
  /* Cuentas activas que existen en la oficina pero no tienen oportunidad en el CRM (entraron directo por la oficina) */
  const sinOpp = crmCartera().filter(p=>!S.crm.opps.some(o=>o.prop===p.id));
  return `<div class="card"><table>
    <thead><tr><th>Cuenta</th><th>Management</th><th>Zona</th><th class="num">Unidades</th><th>Etapa</th><th>Contacto</th><th>Última actividad</th><th>Salud</th>${!crmEsVentas()?"<th>Vendedor</th>":""}<th></th></tr></thead>
    <tbody>${filas.map(({o,h})=>`<tr>
      <td><b>${esc(o.nombre)}</b></td><td>${esc(o.mgmt||"—")}</td><td>${esc(o.zona)}</td><td class="num">${o.unidades}</td>
      <td>${crmPill(o.etapa)}</td>
      <td>${esc(o.contacto&&o.contacto.nombre||"—")}<div class="crm-li-sub">${esc(o.contacto&&o.contacto.rol||"")}</div></td>
      <td class="mono">${crmFecha(crmUltAct(o))}</td>
      <td>${h?`<span class="crm-dot ${h.s}" aria-hidden="true"></span>${h.s==="v"?"Al día":h.s==="w"?"Atención":"En riesgo"}`:"—"}</td>
      ${!crmEsVentas()?`<td>${esc(o.owner)}</td>`:""}
      <td style="text-align:right"><button class="btn sm" data-a="crmAbrir" data-id="${o.id}">Abrir</button></td></tr>`).join("")
      || `<tr><td colspan="10" class="empty">Todavía no hay cuentas. Registra tu primer prospecto.</td></tr>`}
    ${sinOpp.map(p=>{ const h=crmSalud(p); return `<tr><td><b>${esc(p.nombre)}</b><div class="crm-li-sub">entró directo por la oficina</div></td>
      <td>${esc((by(S.clientes,p.cliente)||{}).nombre||"—")}</td><td>${esc(p.zona||"")}</td><td class="num">—</td><td>${crmPill("activa")}</td>
      <td>${esc((contactosDe(p.id)[0]||{}).nombre||"—")}</td><td class="mono">—</td>
      <td><span class="crm-dot ${h.s}" aria-hidden="true"></span>${h.s==="v"?"Al día":h.s==="w"?"Atención":"En riesgo"}</td>
      ${!crmEsVentas()?`<td>${esc(crmDueno(p)||"Sin asignar")}</td>`:""}
      <td style="text-align:right"><button class="btn sm" data-a="crmSaludAct" data-id="${p.id}">Registrar contacto</button></td></tr>`;}).join("")}
    </tbody></table></div>`;
}

function crmVSalud(){
  const cart = crmCartera().map(p=>({p, h:crmSalud(p)}));
  const orden = {r:0,w:1,v:2}; cart.sort((a,b)=>orden[a.h.s]-orden[b.h.s]);
  const c = k => cart.filter(x=>x.h.s===k).length;
  return `<div class="kpis">
    <div class="kpi"><div class="l">En riesgo</div><div class="v b">${c("r")}</div></div>
    <div class="kpi"><div class="l">Atención</div><div class="v w">${c("w")}</div></div>
    <div class="kpi"><div class="l">Al día</div><div class="v g">${c("v")}</div></div>
    <div class="kpi"><div class="l">Cuentas activas</div><div class="v">${cart.length}</div></div></div>
  <div class="card"><div class="chd"><h3>Cuentas activas</h3><span class="s">calculado con las WO, returns y facturas reales de la oficina; Ventas solo mira y llama</span></div>
  <table><thead><tr><th>Cuenta</th><th>Estado</th><th>Por qué</th><th>Última WO</th><th class="num">WO 30 días</th><th class="num">Promedio mes</th>${!crmEsVentas()?"<th>Vendedor</th>":""}<th></th></tr></thead>
  <tbody>${cart.map(({p,h})=>`<tr>
    <td><b>${esc(p.nombre)}</b><div class="crm-li-sub">${esc(p.zona||"")}</div></td>
    <td><span class="crm-dot ${h.s}" aria-hidden="true"></span>${h.s==="v"?"Al día":h.s==="w"?"Atención":"En riesgo"}</td>
    <td>${esc(h.why.join("; ")||"Mandando trabajo normal")}</td>
    <td class="mono">${crmFecha(h.ult)}</td><td class="num">${h.n30}</td><td class="num">${h.prom}</td>
    ${!crmEsVentas()?`<td>${esc(crmDueno(p)||"Sin asignar")}</td>`:""}
    <td style="text-align:right;white-space:nowrap"><button class="btn sm ${h.s==="r"?"p":""}" data-a="crmSaludAct" data-id="${p.id}">Registrar contacto</button>
      ${!crmEsVentas()?`<button class="btn sm" data-a="crmIrProp" data-id="${p.id}">Ver propiedad</button>`:""}</td></tr>`).join("")
    || `<tr><td colspan="8" class="empty">No tienes cuentas activas todavía.</td></tr>`}</tbody></table></div>
  <div class="tr">En riesgo: 30+ días sin WO, caída a menos de la mitad de su promedio o facturas vencidas. Atención: 14+ días sin WO, returns repetidos o cambio de contacto.</div>`;
}

function crmVNum(){
  const ops = crmMias(), admin = !crmEsVentas();
  const alcanzo = o => o.etapa==="perdida" ? crmIdx(o.etapaPerdida||"prospecto") : crmIdx(o.etapa);
  const emb = CRM_ETAPAS.map((e,i)=>({e, n:ops.filter(o=>alcanzo(o)>=i).length}));
  const max = emb[0].n || 1;
  const perd = ops.filter(o=>o.etapa==="perdida");
  const motivos = CRM_MOTIVOS.map(m=>({m, n:perd.filter(o=>o.motivo===m).length})).filter(x=>x.n);
  const orig = CRM_ORIGENES.map(g=>({g, n:ops.filter(o=>o.origen===g).length, a:ops.filter(o=>o.origen===g&&o.etapa==="activa").length})).filter(x=>x.n);
  const act = ops.filter(o=>o.activada);
  const ciclo = act.length ? Math.round(act.reduce((s,o)=>s+crmDias(o.creado,o.activada),0)/act.length) : null;
  const cerradas = ops.filter(o=>o.etapa==="activa"||o.etapa==="perdida").length;
  return `<div class="kpis">
    <div class="kpi"><div class="l">Tasa de cierre</div><div class="v">${cerradas?Math.round(ops.filter(o=>o.etapa==="activa").length/cerradas*100):0}%</div><div class="crm-sub">activas ÷ (activas + perdidas)</div></div>
    <div class="kpi"><div class="l">Días hasta activar</div><div class="v">${ciclo===null?"—":ciclo}</div><div class="crm-sub">promedio desde que se registró</div></div>
    <div class="kpi"><div class="l">Tratos abiertos</div><div class="v">${ops.filter(crmAbierta).length}</div></div>
    <div class="kpi"><div class="l">Estancados</div><div class="v ${ops.filter(crmEstancada).length?"w":""}">${ops.filter(crmEstancada).length}</div></div></div>
  <div class="crm-dia">
    <div class="card"><div class="chd"><h3>Embudo</h3><span class="s">cuántos tratos llegaron a cada etapa</span></div>
      <div class="cp crm-funnel">${emb.map((x,i)=>`<div class="crm-fr"><span class="crm-fl">${x.e.n}</span>
        <span class="crm-fb"><i style="width:${Math.round(x.n/max*100)}%"></i></span><span class="crm-fn">${x.n}</span>
        <span class="crm-fp">${i&&emb[i-1].n?Math.round(x.n/emb[i-1].n*100)+"%":""}</span></div>`).join("")}</div></div>
    <div>
      <div class="card"><div class="chd"><h3>Por qué se pierden</h3></div>
        ${motivos.length?`<table><tbody>${motivos.map(x=>`<tr><td>${esc(x.m)}</td><td class="num">${x.n}</td></tr>`).join("")}</tbody></table>`:`<div class="empty">Ninguna perdida registrada.</div>`}</div>
      <div class="card"><div class="chd"><h3>De dónde llegan</h3><span class="s">Client Source</span></div>
        <table><thead><tr><th>Origen</th><th class="num">Tratos</th><th class="num">Activas</th></tr></thead>
        <tbody>${orig.map(x=>`<tr><td>${esc(x.g)}</td><td class="num">${x.n}</td><td class="num">${x.a}</td></tr>`).join("")}</tbody></table></div>
    </div>
  </div>
  ${admin?crmRanking():""}`;
}
function crmRanking(){
  return `<div class="card"><div class="chd"><h3>Equipo este mes</h3><span class="s">avance contra la meta de cada vendedor</span></div>
  <table><thead><tr><th>Vendedor</th><th class="num">Tratos abiertos</th><th class="num">Pipeline /mes</th><th class="num">Activadas</th><th class="num">Unidades</th><th class="num">Visitas</th><th class="num">Estimados</th><th class="num">Vencidas</th></tr></thead>
  <tbody>${crmVendLista().map(v=>{ const {r,meta}=crmAvance([v]), ab=S.crm.opps.filter(o=>o.owner===v&&crmAbierta(o));
    const cel=(a,m)=>`<td class="num ${m&&a>=m?"crm-txt-v":""}">${a} <span class="crm-de">/ ${m}</span></td>`;
    return `<tr><td><b>${esc(v)}</b></td><td class="num">${ab.length}</td><td class="num">${money(ab.reduce((s,o)=>s+crmValor(o),0)).replace(".00","")}</td>
      ${cel(r.activadas,meta.activadas)}${cel(r.unidades,meta.unidades)}${cel(r.visitas,meta.visitas)}${cel(r.estimados,meta.estimados)}
      <td class="num ${ab.filter(crmVencida).length?"crm-txt-r":""}">${ab.filter(crmVencida).length}</td></tr>`;}).join("")}</tbody></table></div>`;
}

function crmVEquipo(){
  return `<div class="card"><div class="chd"><h3>Metas mensuales</h3><span class="s">las ve cada vendedor en «Mi día»</span>
    <span class="r"><button class="btn sm" data-a="catVer" data-v="vendedores">Gestionar vendedores en Catálogos</button><button class="btn sm p" data-a="crmMetasOK">Guardar metas</button></span></div>
  <div class="cp crm-li-sub" style="border-bottom:1px solid var(--line)">Los vendedores se crean y se dan de baja en <b>Catálogos › Ejecutivos de ventas</b>. Cada uno recibe su usuario de Ventas; aquí solo se ponen sus metas.</div>
  ${(()=>{ const huer = [...new Set(S.crm.opps.filter(o=>crmAbierta(o) && o.owner && !crmVendLista().includes(o.owner)).map(o=>o.owner))];
    return huer.length ? `<div class="cp"><div class="note r">${huer.map(v=>`<b>${esc(v)}</b> ya no está en el catálogo y tiene ${S.crm.opps.filter(o=>o.owner===v&&crmAbierta(o)).length} trato(s) abiertos`).join("; ")}. Ábrelos en el Pipeline y cámbiales el vendedor.</div></div>` : ""; })()}
  ${crmVendLista().length?"":`<div class="empty">Todavía no hay vendedores. Créalos en Catálogos › Ejecutivos de ventas.</div>`}
  <table><thead><tr><th>Vendedor</th><th>Cuentas activadas</th><th>Unidades ganadas</th><th>Visitas</th><th>Estimados pedidos</th></tr></thead>
  <tbody>${crmVendLista().map(v=>{ const m=S.crm.metas[v]||{};
    const inp=(k)=>`<input type="number" min="0" class="crm-in" id="crmM_${v}_${k}" value="${+m[k]||0}" aria-label="${k} de ${v}">`;
    return `<tr><td><b>${esc(v)}</b><div class="crm-li-sub">Entra como «${esc(v)}» en el selector de usuario</div></td><td>${inp("activadas")}</td><td>${inp("unidades")}</td><td>${inp("visitas")}</td><td>${inp("estimados")}</td></tr>`;}).join("")}</tbody></table></div>
  ${crmRanking()}
  <div class="note">El valor mensual de cada cuenta se estima como unidades × ${Math.round(CRM_ROT*100)}% de rotación anual × ${money(CRM_TICKET).replace(".00","")} de ticket promedio ÷ 12. Sirve para priorizar, no es un compromiso.</div>`;
}

/* ── FICHA DE LA OPORTUNIDAD ── */
function crmFicha(id){
  const o = by(S.crm.opps, id); if(!o) return;
  const i = crmIdx(o.etapa), admin = !crmEsVentas();
  const sig = i>=0 && i<5 ? CRM_ETAPAS[i+1] : null;
  const falta = sig ? crmFalta(o, sig.k) : [];
  const est = crmEst(o), acts = crmActs(o);
  const exp = o.prop ? expedienteDe(o.prop) : null;
  modal(`<div class="mh crm-mh"><div><h3>${esc(o.nombre)} ${crmPill(o.etapa)}</h3>
      <p>${esc(o.zona)}${o.mgmt?` · ${esc(o.mgmt)}`:""} · ${o.unidades} unidades · ~${money(crmValor(o)).replace(".00","")}/mes · ${esc(o.origen)}</p></div></div>
  <div class="mb">
    ${o.etapa!=="perdida"?`<ol class="crm-steps">${CRM_ETAPAS.map((e,k)=>`<li class="${k<i?"ok":k===i?"on":""}"><span>${k+1}</span>${e.n}</li>`).join("")}</ol>`
      :`<div class="note r">Perdida en «${esc(crmEtapa(o.etapaPerdida).n)}»: ${esc(o.motivo||"")}. Volver a contactar el ${crmFecha(o.recontacto)}.</div>`}
    ${sig && o.etapa!=="perdida"?(sig.k==="activa"
      ? `<div class="note ${falta.length?"w":"v"}"><b>Para quedar activa:</b> ${falta.length?esc(falta.join("; "))+". Esto lo hace la oficina; aquí se actualiza solo.":"todo listo."}</div>`
      : falta.length ? `<div class="note w"><b>Para pasar a ${sig.n} falta:</b> ${esc(falta.join("; "))}.</div>`
        : sig.k==="alta" ? `<div class="note v">Listo para dar de alta: la oficina recibe la propiedad y Claudia completa el expediente.</div>`
        : `<div class="note v">Cumple lo necesario para pasar a <b>${sig.n}</b>.</div>`):""}
    <div class="crm-ficha">
      <div>
        <h4>Contacto</h4>
        <dl class="crm-dl"><dt>Nombre</dt><dd>${esc(o.contacto.nombre||"—")}</dd><dt>Rol</dt><dd>${esc(o.contacto.rol||"—")}</dd>
          <dt>Teléfono</dt><dd>${esc(o.contacto.tel||"—")}</dd><dt>Correo</dt><dd>${esc(o.contacto.mail||"—")}</dd>
          <dt>Dirección</dt><dd>${esc(o.dir||"—")}</dd><dt>Vendedor</dt><dd>${admin?`<select id="crmOwner" data-a="crmOwner" data-id="${o.id}" aria-label="Vendedor">${crmVendLista().map(v=>`<option ${o.owner===v?"selected":""}>${v}</option>`).join("")}</select>`:esc(o.owner)}</dd></dl>
        <h4>Con la oficina</h4>
        <dl class="crm-dl">
          <dt>Estimado</dt><dd>${est?`<span class="pill ${CRM_EST_OK.includes(est.estado)?"v":est.estado==="Descartada"||est.estado==="Rechazado"?"r":"w"}">${esc(est.estado)}</span> ${esc(est.num||"")}`:"Sin pedir"}</dd>
          <dt>Propiedad</dt><dd>${o.prop?`${esc(P(o.prop).nombre)} <span class="pill ${P(o.prop).estado==="Active"?"v":P(o.prop).estado==="Inactive"?"r":"m"}">${esc(P(o.prop).estado||"Lead")}</span>${o.alta?"":`<div class="crm-li-sub">La oficina ya la ve en Propiedades como Lead</div>`}`:"Se crea al registrar el prospecto"}</dd>
        </dl>
        ${exp&&o.alta?`<ul class="crm-exp">${exp.map(c=>`<li class="${c.ok?"ok":""}">${c.ok?"✓":"○"} ${esc(c.n)}</li>`).join("")}</ul>
          <div class="crm-li-sub">El expediente lo completa Claudia.</div>`:""}
        <div class="crm-acc">
          ${crmPuedePedirEst(o)?`<button class="btn" data-a="crmPedirEst" data-id="${o.id}">${o.etapa==="activa"?"Pedir estimado de servicios nuevos":crmEst(o)?"Volver a pedir estimado":"Pedir estimado a la oficina"}</button>`:""}
          ${o.etapa==="negociacion"&&!o.alta?`<button class="btn v" data-a="crmAlta" data-id="${o.id}" ${falta.length?"disabled":""}>Dar de alta</button>`:""}
          ${sig && sig.k!=="activa" && sig.k!=="alta" && o.etapa!=="perdida"?`<button class="btn p" data-a="crmMover" data-id="${o.id}" data-e="${sig.k}" ${falta.length?"disabled":""}>Pasar a ${sig.n}</button>`:""}
        </div>
      </div>
      <div>
        <h4>Registrar actividad</h4>
        <div class="fg c2">
          <div class="fld"><label for="crmAT">Qué hiciste</label><select id="crmAT">${CRM_ACT_TIPOS.map(t=>`<option>${t}</option>`).join("")}</select></div>
          <div class="fld"><label for="crmAF">Fecha</label><input type="date" id="crmAF" value="${hoyReal()}"></div></div>
        <div class="fld"><label for="crmAN">Qué pasó <span class="req">*</span></label><textarea id="crmAN" rows="2" placeholder="Ej.: habló con el manager, pidió precio de pintura"></textarea></div>
        ${o.etapa!=="perdida"?`<div class="fg c2">
          <div class="fld"><label for="crmPT">Próxima acción</label><select id="crmPT">${CRM_ACT_TIPOS.filter(t=>t!=="Nota").map(t=>`<option ${o.prox&&o.prox.tipo===t?"selected":""}>${t}</option>`).join("")}</select></div>
          <div class="fld"><label for="crmPF">Para cuándo <span class="req">*</span></label><input type="date" id="crmPF" value="${o.prox&&o.prox.fecha>=hoyReal()?o.prox.fecha:fechaMover(hoyReal(),3)}"></div></div>
        <div class="fld"><label for="crmPN">Detalle de la próxima acción</label><input id="crmPN" value="${esc(o.prox&&o.prox.fecha>=hoyReal()?o.prox.nota||"":"")}"></div>`:""}
        <button class="btn p" data-a="crmActOK" data-id="${o.id}">Guardar actividad</button>
        <h4 style="margin-top:14px">Historial</h4>
        <ol class="crm-tl">${acts.map(a=>`<li><span class="crm-tl-f">${crmFecha(a.fecha)}</span><b>${esc(a.tipo)}</b> ${esc(a.nota)} <span class="crm-li-sub">— ${esc(a.quien)}</span></li>`).join("")
          || `<li class="crm-li-sub">Sin actividades todavía. Registra la primera llamada o visita.</li>`}</ol>
      </div>
    </div>
  </div>
  <div class="mf">
    ${o.etapa==="perdida"?`<button class="btn" data-a="crmReabrir" data-id="${o.id}">Reabrir</button>`
      :o.etapa!=="activa"?`<button class="btn" data-a="crmPerder" data-id="${o.id}">Marcar perdida</button>`:""}
    <button class="btn" data-a="crmEditar" data-id="${o.id}">Editar datos</button>
    <button class="btn" data-a="cm">Cerrar</button></div>`, true);
}

function crmForm(o){
  const admin = !crmEsVentas(), c = o ? o.contacto : {};
  const ro = o && o.prop ? "readonly" : "", dis = o && o.prop ? "disabled" : "";
  modal(`<div class="mh"><h3>${o?"Editar prospecto":"Nuevo prospecto"}</h3>
    <p>Una propiedad que quieres convertir en cliente. Si ya es cliente de la oficina, no hace falta registrarla aquí.</p></div>
  <div class="mb">
    <div class="fg c2">
      <div class="fld"><label for="crmN">Propiedad <span class="req">*</span></label><input id="crmN" ${ro} value="${esc(o?o.nombre:"")}" placeholder="Ej.: Palms at Navarre"></div>
      <div class="fld"><label for="crmMg">Management</label><input id="crmMg" list="crmMgL" value="${esc(o?o.mgmt:"")}" placeholder="Empresa que la administra">
        <datalist id="crmMgL">${S.clientes.map(x=>`<option value="${esc(x.nombre)}">`).join("")}</datalist></div></div>
    <div class="fg c2">
      <div class="fld"><label for="crmZ">Zona <span class="req">*</span></label><select id="crmZ" ${dis}><option value="">— elige —</option>${zonasN().map(z=>`<option ${o&&o.zona===z?"selected":""}>${esc(z)}</option>`).join("")}</select></div>
      <div class="fld"><label for="crmU">Unidades <span class="req">*</span></label><input type="number" min="1" id="crmU" value="${o?o.unidades:""}" placeholder="Total de unidades"></div></div>
    <div class="fg c2">
      <div class="fld"><label for="crmDir">Dirección</label><input id="crmDir" ${ro} value="${esc(o?o.dir||"":"")}"></div>
      <div class="fld"><label for="crmO">Client Source <span class="req">*</span></label><select id="crmO" ${dis}><option value="">— elige —</option>${CRM_ORIGENES.map(g=>`<option ${o&&o.origen===g?"selected":""}>${g}</option>`).join("")}</select></div></div>
    ${ro?`<div class="note" style="margin-bottom:10px">Nombre, zona, dirección, origen y contacto ya son de la propiedad y los mantiene la oficina en Propiedades. Si algo cambió, regístralo como actividad («el manager ahora es…») y la oficina lo actualiza.</div>`:""}
    <h4 class="crm-h4">Contacto</h4>
    <div class="fg c2">
      <div class="fld"><label for="crmCN">Nombre</label><input id="crmCN" ${ro} value="${esc(c.nombre||"")}"></div>
      <div class="fld"><label for="crmCR">Rol</label><select id="crmCR" ${dis}>${CRM_ROLES_CONT.map(r=>`<option ${c.rol===r?"selected":""}>${r}</option>`).join("")}</select></div></div>
    <div class="fg c2">
      <div class="fld"><label for="crmCT">Teléfono</label><input id="crmCT" ${ro} value="${esc(c.tel||"")}"></div>
      <div class="fld"><label for="crmCM">Correo</label><input id="crmCM" type="email" ${ro} value="${esc(c.mail||"")}"></div></div>
    ${!o?`<h4 class="crm-h4">Primera acción</h4>
    <div class="fg c2">
      <div class="fld"><label for="crmPT">Qué sigue</label><select id="crmPT">${CRM_ACT_TIPOS.filter(t=>t!=="Nota").map(t=>`<option>${t}</option>`).join("")}</select></div>
      <div class="fld"><label for="crmPF">Para cuándo <span class="req">*</span></label><input type="date" id="crmPF" value="${hoyReal()}"></div></div>`:""}
    ${admin?`<div class="fld"><label for="crmOw">Vendedor</label><select id="crmOw">${crmVendLista().map(v=>`<option ${(o?o.owner:S.crmVend)===v?"selected":""}>${v}</option>`).join("")}</select></div>`:""}
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
    <button class="btn p" data-a="crmGuardar" ${o?`data-id="${o.id}"`:""}>${o?"Guardar cambios":"Registrar prospecto"}</button></div>`);
}

/* Erika (REQ 19/11 punto 4): «llena los datos básicos y de ahí se va a la propiedad».
   El prospecto ES una propiedad en estado Lead desde que se registra: la oficina la ve en Propiedades
   y puede armarle el estimado sin volver a escribir nada. */
function crmAsegurarProp(o){
  if(o.prop && P(o.prop).id) return o.prop;
  const id = "P"+nid("p"), cli = S.clientes.find(c=>c.nombre.toLowerCase()===String(o.mgmt||"").toLowerCase());
  S.propiedades.push({id, nombre:o.nombre, zona:o.zona, ciudad:o.zona, cliente:cli?cli.id:"", dir:o.dir||"", estado:"Lead", origen:o.origen,
    vendedor:o.owner, activa:true, polizas:[], diasCredito:30, notas:`Registrada por Ventas (${o.owner}). ${o.unidades} unidades.`});
  o.prop = id;
  crmContactoProp(o);
  return id;
}
/* El contacto del prospecto queda también como contacto de la propiedad (uno solo, se actualiza) */
/* El CRM nunca pisa lo que la oficina corrigió: si el contacto no existe lo crea; si existe, solo completa lo que esté vacío. */
function crmContactoProp(o){
  if(!o.prop || !o.contacto || !String(o.contacto.nombre||"").trim()) return;
  let c = o.contactoId ? by(S.contactos, o.contactoId) : null;
  if(!c){ c = {id:"C"+nid("c"), prop:o.prop, tipo:o.contacto.rol||"Property Manager", nombre:o.contacto.nombre, mail:o.contacto.mail||"", tel:o.contacto.tel||""};
    S.contactos.push(c); o.contactoId = c.id; return; }
  if(!c.mail && o.contacto.mail) c.mail = o.contacto.mail;
  if(!c.tel && o.contacto.tel) c.tel = o.contacto.tel;
}
/* Con la propiedad creada, los datos los manda la propiedad: lo que la oficina corrija en Propiedades se ve aquí al instante. */
function crmLeerProp(o){
  if(!o.prop) return; const p = P(o.prop); if(!p.id) return;
  o.nombre = p.nombre || o.nombre; o.zona = p.zona || o.zona; o.dir = p.dir || o.dir; if(p.origen) o.origen = p.origen;
  let c = o.contactoId ? by(S.contactos, o.contactoId) : null;
  if(!c){ c = S.contactos.find(x=>x.prop===p.id && !x.inactivo && x.activo!==false); if(c) o.contactoId = c.id; }
  if(c) o.contacto = {nombre:c.nombre||"", rol:c.tipo||"", tel:c.tel||"", mail:c.mail||""};
}
function crmCambiarEtapa(o, e){
  if(o.etapa===e) return;
  o.etapa = e; o.etapaDesde = hoyReal();
}

Object.assign(ACC, {
  crmTab: d => { S.crmTab = d.t; render(); },
  crmVend: () => { S.crmVend = val("crmVendSel"); render(); },
  crmNueva: () => crmForm(null),
  crmEditar: d => crmForm(by(S.crm.opps, d.id)),
  crmAbrir: d => crmFicha(d.id),
  crmGuardar: d => {
    const req = ["crmN","crmZ","crmU","crmO"].concat(d.id?[]:["crmPF"]);
    if(marcaFalta(req)){ toast("Faltan datos","Propiedad, zona, unidades, origen y la fecha de la primera acción son obligatorios.","r"); return; }
    const datos = {nombre:val("crmN"), mgmt:val("crmMg"), zona:val("crmZ"), unidades:Math.max(1, +val("crmU")||1), dir:val("crmDir"), origen:val("crmO"),
      contacto:{nombre:val("crmCN"), rol:val("crmCR"), tel:val("crmCT"), mail:val("crmCM")}};
    if(!crmEsVentas()) datos.owner = val("crmOw") || crmVendLista()[0];
    if(d.id){
      const o = by(S.crm.opps, d.id);
      /* Con propiedad creada, el vendedor solo cambia lo suyo (unidades y management); el resto lo manda la propiedad. */
      if(o.prop){ o.unidades = datos.unidades; o.mgmt = datos.mgmt; if(datos.owner){ o.owner = datos.owner; const p=P(o.prop); if(p.id) p.vendedor = o.owner; } }
      else Object.assign(o, datos);
      cm();
      toast("✓ Cambios guardados", esc(o.nombre), "v"); render(); crmFicha(o.id); return;
    }
    /* Duplicados: la misma propiedad no se registra dos veces (ni en el CRM ni contra la oficina) */
    const norm = x => String(x||"").toLowerCase().replace(/\s+/g," ").trim();
    const yaOpp = S.crm.opps.find(x=>norm(x.nombre)===norm(datos.nombre) && x.etapa!=="perdida");
    if(yaOpp){ toast("Ya está en el CRM", `${esc(yaOpp.nombre)} ya es un trato de ${esc(yaOpp.owner)} (${esc(crmEtapa(yaOpp.etapa).n)}). Si te toca a ti, pide a Claudia que te lo reasigne.`, "r"); return; }
    const yaProp = S.propiedades.find(x=>norm(x.nombre)===norm(datos.nombre) && x.activa!==false);
    if(yaProp && yaProp.estado==="Active"){ toast("Ya es cliente de la oficina", `${esc(yaProp.nombre)} ya está activa. Si quieres venderle servicios nuevos, pídele a Claudia que te asigne la cuenta.`, "r"); return; }
    const perdidaPrev = S.crm.opps.find(x=>norm(x.nombre)===norm(datos.nombre) && x.etapa==="perdida");
    if(perdidaPrev){ toast("Ya se intentó antes", `${esc(perdidaPrev.nombre)} está en Perdidas (${esc(perdidaPrev.motivo||"")}). Ábrela y usa «Reabrir» para no perder su historial.`, "r"); return; }
    const o = Object.assign({id:"OP"+Date.now().toString(36), etapa:"prospecto", owner:S.usuario, creado:hoyReal(), etapaDesde:hoyReal(),
      prox:{tipo:val("crmPT"), fecha:val("crmPF"), nota:""}}, datos);
    if(crmEsVentas()) o.owner = S.usuario;
    S.crm.opps.unshift(o);
    /* Si la oficina ya la tenía registrada como Lead o Inactive, se usa esa misma propiedad */
    if(yaProp){ o.prop = yaProp.id; if(yaProp.estado==="Inactive") yaProp.estado="Lead"; if(!yaProp.vendedor) yaProp.vendedor=o.owner; crmContactoProp(o); }
    crmAsegurarProp(o);
    cm(); S.crmTab = "pipe";
    toast("✓ Prospecto registrado", `${esc(o.nombre)} quedó en Prospecto y ya aparece en Propiedades como Lead. Tu primera acción: ${esc(o.prox.tipo)} el ${crmFecha(o.prox.fecha)}.`, "v");
    render();
  },
  crmOwner: d => { const o=by(S.crm.opps,d.id); if(!o) return; o.owner = val("crmOwner"); if(o.prop && P(o.prop).id) P(o.prop).vendedor = o.owner;
    toast("✓ Vendedor cambiado", `${esc(o.nombre)} ahora es de ${esc(o.owner)}.`, "v"); render(); crmFicha(o.id); },
  crmMover: d => {
    const o = by(S.crm.opps, d.id); if(!o || o.etapa===d.e) return;
    if(o.etapa==="activa"){ toast("Cuenta activa","Una cuenta activa no vuelve al pipeline: su trabajo lo maneja la oficina.","r"); return; }
    const de = crmIdx(o.etapa), a = crmIdx(d.e);
    if(d.e==="activa"){ toast("Esto pasa solo","La cuenta queda activa cuando Claudia completa el expediente y la oficina agenda la primera WO.","r"); return; }
    if(d.e==="alta" && !o.alta){ crmFicha(o.id); toast("Usa «Dar de alta»","Así la oficina recibe la propiedad y Claudia empieza el expediente.","r"); return; }
    if(a>de){ const f = crmFalta(o, d.e);
      if(f.length){ toast(`Todavía no pasa a ${crmEtapa(d.e).n}`, "Falta: "+esc(f.join("; "))+".", "r"); return; } }
    crmCambiarEtapa(o, d.e);
    toast(`✓ ${esc(o.nombre)}`, `Ahora está en ${crmEtapa(d.e).n}.`, "v");
    const abierto = $("#mroot").innerHTML.trim()!=="";
    render(); if(abierto) crmFicha(o.id);
  },
  crmActOK: d => {
    const o = by(S.crm.opps, d.id); if(!o) return;
    const req = ["crmAN"].concat(o.etapa!=="perdida"?["crmPF"]:[]);
    if(marcaFalta(req)){ toast("Faltan datos","Escribe qué pasó y para cuándo es la próxima acción: así ningún prospecto se enfría por olvido.","r"); return; }
    const a = {id:"CA"+Date.now().toString(36), opp:o.id, prop:o.prop||null, tipo:val("crmAT"), fecha:val("crmAF")||hoyReal(), nota:val("crmAN"), quien:S.usuario};
    S.crm.acts.push(a);
    if(o.etapa!=="perdida") o.prox = {tipo:val("crmPT"), fecha:val("crmPF"), nota:val("crmPN")};
    /* Una sola bitácora: si ya es propiedad de la oficina, queda también en su pestaña Comunicación */
    if(o.prop) S.comunicaciones.push({id:"CM"+nid("cm"), prop:o.prop, fecha:a.fecha, medio:a.tipo, contacto:o.contacto.nombre||"", quien:S.usuario, nota:"[Ventas] "+a.nota});
    /* Primera actividad de un prospecto con contacto: pasa solo a Contactado */
    if(o.etapa==="prospecto" && !crmFalta(o,"contactado").length) crmCambiarEtapa(o,"contactado");
    if(o.etapa==="contactado" && a.tipo==="Visita") crmCambiarEtapa(o,"visita");
    toast("✓ Actividad guardada", o.etapa==="perdida" ? "" : `Próxima: ${esc(o.prox.tipo)} el ${crmFecha(o.prox.fecha)}.`, "v");
    render(); crmFicha(o.id);
  },
  crmPedirEst: d => {
    const o = by(S.crm.opps, d.id); if(!o) return;
    modal(`<div class="mh"><h3>Pedir estimado a la oficina</h3><p>Le llega a Claudia en Solicitudes comerciales. Tú no pones precios: ves el estado aquí.</p></div>
    <div class="mb"><div class="note" style="margin-bottom:12px"><b>${esc(o.nombre)}</b> · ${o.unidades} unidades · ${esc(o.contacto.nombre||"sin contacto")}</div>
      <div class="fld"><label for="crmAlc">Qué quiere cotizar el cliente <span class="req">*</span></label>
        <textarea id="crmAlc" rows="3" placeholder="Ej.: full paint y full clean para unidades de 1 y 2 bedroom; lista de precios para todo el año"></textarea></div>
      <div class="fld"><label for="crmAlcM">Correo del contacto <span class="req">*</span></label><input id="crmAlcM" type="email" value="${esc(o.contacto.mail||"")}">
        <div class="hint">La oficina envía el estimado a este correo.</div></div></div>
    <div class="mf"><button class="btn" data-a="crmAbrir" data-id="${o.id}">Volver</button><button class="btn p" data-a="crmPedirEstOK" data-id="${o.id}">Enviar a la oficina</button></div>`);
  },
  crmPedirEstOK: d => {
    const o = by(S.crm.opps, d.id); if(!o) return;
    if(marcaFalta(["crmAlc","crmAlcM"])){ toast("Faltan datos","El alcance y el correo del contacto son obligatorios.","r"); return; }
    o.contacto.mail = val("crmAlcM");
    crmAsegurarProp(o); crmContactoProp(o);
    const ns = {id:"SC"+Date.now(), fecha:HOY_SUP, quien:S.usuario, estimadoId:null, estado:"Lista para estimado", ...solSello(),
      prop:o.prop, propNombre:"", contactoId:o.contactoId||null, contacto:o.contacto.nombre||"Contacto", correo:o.contacto.mail,
      alcance:val("crmAlc"), inspeccion:false, fechaObjetivo:"", notas:`Desde CRM · ${o.unidades} unidades · ${o.zona}`, origen:"Ventas", pidio:o.owner};
    S.solicitudesComerciales.unshift(ns);
    o.solId = ns.id; o.solFecha = hoyReal();
    avisar("Claudia","Ventas pide un estimado", `${esc(o.nombre)} (${esc(o.owner)}): ${esc(ns.alcance.slice(0,80))}`, "a");
    S.crm.acts.push({id:"CA"+Date.now().toString(36), opp:o.id, prop:o.prop||null, tipo:"Nota", fecha:hoyReal(), nota:"Pidió estimado a la oficina", quien:S.usuario});
    if(crmIdx(o.etapa) < crmIdx("propuesta") && !crmFalta(o,"propuesta").length) crmCambiarEtapa(o,"propuesta");
    toast("✓ Pedido enviado","Claudia lo ve en Solicitudes comerciales. Cuando envíe el estimado, lo verás aquí.","v");
    render(); crmFicha(o.id);
  },
  crmAlta: d => {
    const o = by(S.crm.opps, d.id); if(!o) return;
    modal(`<div class="mh"><h3>Dar de alta ${esc(o.nombre)}</h3><p>El cliente aceptó. Claudia recibe el aviso para subir los documentos y completar el expediente.</p></div>
    <div class="mb">
      <div class="fg c2"><div class="fld"><label for="crmAD">Dirección <span class="req">*</span></label><input id="crmAD" value="${esc(o.dir||"")}"></div>
        <div class="fld"><label for="crmAC">Contacto principal <span class="req">*</span></label><input id="crmAC" value="${esc(o.contacto.nombre||"")}"></div></div>
      <div class="fg c2"><div class="fld"><label for="crmAT2">Teléfono</label><input id="crmAT2" value="${esc(o.contacto.tel||"")}"></div>
        <div class="fld"><label for="crmAM">Correo</label><input id="crmAM" value="${esc(o.contacto.mail||"")}"></div></div>
      <div class="note">Le llega a Claudia: subir COI y documentos, cargar la lista de precios acordada y completar el expediente. Sin eso la oficina no puede agendar.</div></div>
    <div class="mf"><button class="btn" data-a="crmAbrir" data-id="${o.id}">Volver</button><button class="btn v" data-a="crmAltaOK" data-id="${o.id}">Dar de alta y avisar a Claudia</button></div>`);
  },
  crmAltaOK: d => {
    const o = by(S.crm.opps, d.id); if(!o) return;
    if(marcaFalta(["crmAD","crmAC"])){ toast("Faltan datos","Dirección y contacto principal son obligatorios.","r"); return; }
    if(!val("crmAT2") && !val("crmAM")){ toast("Falta cómo contactarlo","Pon al menos un teléfono o un correo.","r"); return; }
    Object.assign(o.contacto, {nombre:val("crmAC"), tel:val("crmAT2"), mail:val("crmAM")}); o.dir = val("crmAD");
    const id = crmAsegurarProp(o); crmContactoProp(o);
    const pp = P(id); if(!String(pp.dir||"").trim()) pp.dir = o.dir; if(pp.estado==="Inactive" && o.inactivoPorCrm){ pp.estado="Lead"; o.inactivoPorCrm=false; }
    if(estadoProp(pp)==="Lead") pp.estado="Active";   /* el cliente aceptó: deja de ser prospecto, como en la oficina */
    if(!pp.vendedor) pp.vendedor = o.owner;
    o.alta = hoyReal();
    const sol = o.solId ? by(S.solicitudesComerciales, o.solId) : null; if(sol && !sol.prop){ sol.prop=id; sol.propNombre=""; }
    crmCambiarEtapa(o, "alta");
    avisar("Claudia","Cuenta nueva para expediente", `${esc(o.nombre)} (${esc(o.owner)}) aceptó. Sube COI y documentos y carga la lista de precios para poder agendar.`, "v");
    S.crm.acts.push({id:"CA"+Date.now().toString(36), opp:o.id, prop:id, tipo:"Nota", fecha:hoyReal(), nota:"Dio de alta la cuenta; pasó a la oficina", quien:S.usuario});
    toast("✓ Cuenta dada de alta", `Claudia recibió el aviso para subir documentos de ${esc(o.nombre)}. Queda Activa cuando la oficina agende su primera WO.`, "v");
    render(); crmFicha(o.id);
  },
  crmPerder: d => {
    const o = by(S.crm.opps, d.id); if(!o) return;
    modal(`<div class="mh"><h3>Marcar ${esc(o.nombre)} como perdida</h3><p>Queda guardada con su motivo y una fecha para volver a intentarlo.</p></div>
    <div class="mb"><div class="fld"><label for="crmPM">Motivo <span class="req">*</span></label><select id="crmPM"><option value="">— elige —</option>${CRM_MOTIVOS.map(m=>`<option>${m}</option>`).join("")}</select></div>
      <div class="fld"><label for="crmPR">Volver a contactar el <span class="req">*</span></label><input type="date" id="crmPR" value="${fechaMover(hoyReal(),90)}"></div></div>
    <div class="mf"><button class="btn" data-a="crmAbrir" data-id="${o.id}">Volver</button><button class="btn p" data-a="crmPerderOK" data-id="${o.id}">Marcar perdida</button></div>`);
  },
  crmPerderOK: d => {
    const o = by(S.crm.opps, d.id); if(!o) return;
    if(marcaFalta(["crmPM","crmPR"])){ toast("Faltan datos","Motivo y fecha para volver a contactar son obligatorios.","r"); return; }
    o.etapaPerdida = o.etapa; o.motivo = val("crmPM"); o.recontacto = val("crmPR"); o.prox = null;
    const conTrabajo = o.prop && crmWOsProp(o.prop).length > 0;
    if(o.prop && !conTrabajo && P(o.prop).estado==="Lead"){ P(o.prop).estado = "Inactive"; o.inactivoPorCrm = true; }
    crmCambiarEtapa(o, "perdida");
    cm(); toast("Marcada como perdida", `${esc(o.nombre)}: ${esc(o.motivo)}. Volver a contactar el ${crmFecha(o.recontacto)}.`
      + (conTrabajo ? " La oficina ya trabaja con esta propiedad: no se inactiva." : ""), "a"); render();
  },
  crmReabrir: d => {
    const o = by(S.crm.opps, d.id); if(!o) return;
    /* Solo se reactiva si la inactivó el CRM; si la oficina la dio de baja por su cuenta, se respeta. */
    if(o.prop && o.inactivoPorCrm && P(o.prop).estado==="Inactive"){ P(o.prop).estado = "Lead"; o.inactivoPorCrm = false; }
    crmCambiarEtapa(o, o.etapaPerdida || "prospecto"); o.prox = {tipo:"Llamada", fecha:hoyReal(), nota:"Retomar contacto"};
    toast("✓ Reabierta", `${esc(o.nombre)} volvió a ${crmEtapa(o.etapa).n}.`, "v"); render(); crmFicha(o.id);
  },
  crmSaludAct: d => {
    const p = P(d.id); if(!p.id) return;
    const c = S.contactos.find(x=>x.prop===p.id && !x.inactivo && x.activo!==false) || {};
    modal(`<div class="mh"><h3>Registrar contacto con ${esc(p.nombre)}</h3><p>Queda en la Comunicación de la propiedad, que la oficina también ve.</p></div>
    <div class="mb"><div class="fg c2"><div class="fld"><label for="crmSM">Medio</label><select id="crmSM">${CRM_ACT_TIPOS.filter(t=>t!=="Nota").map(t=>`<option>${t}</option>`).join("")}</select></div>
      <div class="fld"><label for="crmSC">Con quién</label><input id="crmSC" value="${esc(c.nombre||"")}"></div></div>
      <div class="fld"><label for="crmSN">Qué se habló <span class="req">*</span></label><textarea id="crmSN" rows="3" placeholder="Ej.: el nuevo manager confirmó que seguimos como vendor"></textarea></div></div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="crmSaludOK" data-id="${p.id}">Guardar</button></div>`);
  },
  crmSaludOK: d => {
    if(marcaFalta(["crmSN"])){ toast("Falta la nota","Escribe qué se habló.","r"); return; }
    const o = S.crm.opps.find(x=>x.prop===d.id);
    S.comunicaciones.push({id:"CM"+nid("cm"), prop:d.id, fecha:hoyReal(), medio:val("crmSM"), contacto:val("crmSC"), quien:S.usuario, nota:"[Ventas] "+val("crmSN")});
    if(o) S.crm.acts.push({id:"CA"+Date.now().toString(36), opp:o.id, prop:d.id, tipo:val("crmSM"), fecha:hoyReal(), nota:val("crmSN"), quien:S.usuario});
    cm(); toast("✓ Contacto registrado","Quedó en la Comunicación de la propiedad.","v"); render();
  },
  crmIrProp: d => { S.mod="propiedades"; S.sub=d.id; S.tab="comunicacion"; render(); },
  crmMetasOK: () => {
    crmVendLista().forEach(v=>{ const m = S.crm.metas[v] = S.crm.metas[v] || {};
      ["activadas","unidades","visitas","estimados"].forEach(k=>{ const e=document.getElementById(`crmM_${v}_${k}`); if(e) m[k]=Math.max(0, +e.value||0); }); });
    toast("✓ Metas guardadas","Cada vendedor las ve en «Mi día».","v"); render();
  }
});

/* Arrastrar y soltar en el pipeline (las flechas de cada tarjeta hacen lo mismo con teclado o en celular) */
document.addEventListener("dragstart", e=>{
  const c = e.target.closest && e.target.closest("[data-drag]"); if(!c) return;
  e.dataTransfer.setData("text/plain", c.dataset.drag); e.dataTransfer.effectAllowed = "move"; c.classList.add("drag");
});
document.addEventListener("dragend", e=>{ const c = e.target.closest && e.target.closest("[data-drag]"); if(c) c.classList.remove("drag");
  document.querySelectorAll(".crm-col.over").forEach(x=>x.classList.remove("over")); });
document.addEventListener("dragover", e=>{ const col = e.target.closest && e.target.closest("[data-drop]"); if(!col) return;
  e.preventDefault(); document.querySelectorAll(".crm-col.over").forEach(x=>{ if(x!==col) x.classList.remove("over"); }); col.classList.add("over"); });
document.addEventListener("drop", e=>{ const col = e.target.closest && e.target.closest("[data-drop]"); if(!col) return;
  e.preventDefault(); col.classList.remove("over");
  const id = e.dataTransfer.getData("text/plain"); if(id) ACC.crmMover({id, e:col.dataset.drop}); });

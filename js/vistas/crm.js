"use strict";
/* ══════════ CRM · PERFIL VENTAS ══════════
   Puerta de entrada de las cuentas nuevas y guardián de la relación con las activas.
   Reglas de CPS:
   - Una WO de una cuenta activa nunca pasa por Ventas: la oficina agenda como siempre.
   - Ventas no pone precios: pide el estimado a la oficina (Solicitudes comerciales).
   - Al dar de alta, la oportunidad se convierte en la MISMA propiedad (Lead) y Claudia completa el expediente.
   - La cuenta pasa sola a Activa cuando tiene expediente completo y su primera WO agendada.
   - Lo que Ventas anota sobre una propiedad real queda también en su pestaña Comunicación.
   Los datos viven en S.crmProspectos, S.crmAvances y S.crmMetas (tablas crm_prospectos, crm_avances y crm_metas). */

const CRM_ETAPAS = [
  {k:"prospecto",  n:"Prospecto",   p:"g", req:"Sin estimado todavía."},
  {k:"propuesta",  n:"Estimado",    p:"w", req:"El estado lo pone la oficina."},
  {k:"alta",       n:"Alta",        p:"m", req:"Aceptó. Pasa a Clientes en 48 h."},
  {k:"activa",     n:"Activa",      p:"v", req:"COI vigente y primera WO con fecha (pasa sola)."}
];
/* Etapas anteriores: se leen como su equivalente; el historial de llamadas y visitas se conserva. */
const CRM_ETAPA_LEGADO = {contactado:"prospecto", visita:"prospecto", negociacion:"propuesta"};
/* Vendedores = catálogo «Ejecutivos de ventas» (el mismo que usa el formulario de la propiedad).
   Claudia los crea desde «Metas del equipo» o desde Catálogos; cada uno activo tiene su usuario con perfil Ventas. */
const crmVendLista = () => activos("vendedores");
const CRM_ACT_TIPOS = ["Llamada","Visita","Mensaje de texto","Correo","Nota"];
const CRM_ORIGENES = ["Llamada","Mensaje de texto","Formulario web","Referido","Visita comercial","Correo"];
const CRM_ROLES_CONT = ["Property Manager","Assistant Manager","Maintenance Supervisor","Regional Manager","Otro"];
const CRM_MOTIVOS = ["Precio","Ya tienen vendor","Sin respuesta","Zona fuera de cobertura","No cumplimos requisitos del management","Otro"];
const CRM_ESTANCADO = 14;   // días sin actividad para marcar un trato como estancado

const crmD = n => fechaMover(hoyReal(), n);
/* Sin datos de ejemplo: todo lo que se ve en el CRM lo registró alguien operando. */
if(!Array.isArray(S.crmProspectos)) S.crmProspectos = [];
if(!Array.isArray(S.crmAvances)) S.crmAvances = [];
if(!Array.isArray(S.crmMetas)) S.crmMetas = [];   /* una fila por vendedor: {id:vendedor, activadas, unidades, visitas, estimados} */
delete S.crm;
/* Id único aunque dos personas registren a la vez; termina en letra para no mover los contadores de la oficina */
const crmUid = pre => pre + Date.now().toString(36) + Math.random().toString(36).slice(2,6) + "x";
const crmMetaDe = v => by(S.crmMetas, v) || {};

/* ── helpers ── */
const crmEsVentas = () => (ROLES[S.usuario]||{}).r==="Ventas";
const crmIdx = k => CRM_ETAPAS.findIndex(e=>e.k===k);
const crmEtapa = k => CRM_ETAPAS.find(e=>e.k===k) || {k, n:k==="perdida"?"No contrató":k, p:"r"};
const crmDias = (desde, hasta) => !desde ? 0 : Math.round((new Date((hasta||hoyReal())+"T12:00:00")-new Date(desde+"T12:00:00"))/864e5);
const crmUnids = ops => ops.reduce((s,o)=>s+(+o.unidades||0),0);
/* La información del cliente llega de a poco: ningún dato faltante bloquea a Ventas, se muestra y se completa después. */
const crmUniTxt = o => +o.unidades ? `${+o.unidades} unidades` : "Unidades por confirmar";
const crmUnidsTxt = ops => { const n = ops.filter(o=>!+o.unidades).length; return `${crmUnids(ops)} unidades${n?` · ${n} por confirmar`:""}`; };
/* Con muchas cuentas las listas no crecen sin fin: se buscan y se paginan. */
const CRM_TOPE = 5, CRM_PAG = 25;
const crmVerCuentas = (et, n) => `<button class="btn sm" data-a="crmVerCuentas" data-e="${et}">Ver las ${n} en Cuentas</button>`;
/* Alta: 48 horas en la columna; después solo en «Clientes». «Activa» no es columna: ya es cliente. */
const CRM_ALTA_H = 48;
const crmAltaMs = o => o.altaEn || (o.alta||o.activada ? new Date((o.alta||o.activada)+"T00:00:00").getTime() : 0);
const crmAltaRestan = o => Math.ceil((crmAltaMs(o) + CRM_ALTA_H*36e5 - Date.now())/36e5);
const crmEnTablero = o => !["alta","activa"].includes(o.etapa) || crmAltaRestan(o) > 0;
const crmNorm = x => String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
function crmPaginar(lista, cual){
  const tot = Math.max(1, Math.ceil(lista.length/CRM_PAG)), pg = Math.min(Math.max(0, (S[cual]||0)), tot-1);
  return {filas:lista.slice(pg*CRM_PAG, (pg+1)*CRM_PAG), pie: lista.length>CRM_PAG
    ? `<div class="cp" style="display:flex;gap:8px;align-items:center;justify-content:flex-end"><span class="crm-li-sub">${pg*CRM_PAG+1}–${Math.min(lista.length,(pg+1)*CRM_PAG)} de ${lista.length}</span>
       <button class="btn sm" data-a="crmPag" data-c="${cual}" data-p="${pg-1}" ${pg?"":"disabled"}>← Anterior</button><button class="btn sm" data-a="crmPag" data-c="${cual}" data-p="${pg+1}" ${pg<tot-1?"":"disabled"}>Siguiente →</button></div>` : ""};
}
const crmZonaTxt = o => o.zona || "Zona por confirmar";
function crmPorCompletar(o){
  const c = o.contacto||{}, f = [];
  if(!o.zona) f.push("zona");
  if(!+o.unidades) f.push("unidades");
  if(!o.origen) f.push("Client Source");
  if(!String(o.dir||"").trim()) f.push("dirección");
  if(!String(c.nombre||"").trim()) f.push("nombre del contacto");
  if(!c.tel && !c.mail) f.push("teléfono o correo");
  return f;
}
/* Más reciente primero; en el mismo día, el último registrado */
const crmActs = o => S.crmAvances.filter(a=>a.opp===o.id).reverse().sort((x,y)=>y.fecha.localeCompare(x.fecha) || (y.ts||0)-(x.ts||0));
const crmUltAct = o => { const a=crmActs(o)[0]; return a ? a.fecha : o.creado; };
const crmAbierta = o => ["prospecto","propuesta"].includes(o.etapa);
const crmEstancada = o => crmAbierta(o) && crmDias(crmUltAct(o)) >= CRM_ESTANCADO;
const crmVencida = o => crmAbierta(o) && o.prox && o.prox.fecha && o.prox.fecha < hoyReal();
const crmFecha = f => { if(!f) return "—"; const [y,m,d]=f.split("-"); return d+"/"+m; };
const crmMes = () => hoyReal().slice(0,7);
/* Quién ve qué: Ventas solo lo suyo; la administración ve todo o filtra por vendedor. */
const crmVendActivo = () => crmEsVentas() ? S.usuario : (S.crmVend||"");
const crmMias = () => S.crmProspectos.filter(o=>!crmVendActivo() || o.owner===crmVendActivo());
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
const crmWOAgendada = pid => crmWOsProp(pid).some(w=>w.fecha);

/* Qué falta para que una cuenta de Alta quede Activa (lo hace la oficina) */
function crmFalta(o){
  const f = [];
  if(!o.prop || !expedienteOK(o.prop)) f.push("que Claudia complete el expediente (COI vigente)");
  if(!o.prop || !crmWOAgendada(o.prop)) f.push("que la oficina agende la primera WO con fecha");
  return f;
}

/* Cada vendedor activo del catálogo tiene un usuario «Ventas»; los dados de baja dejan de poder entrar
   (sus cuentas y su historial se conservan). Los dueños de oportunidades que todavía no estén en el catálogo se agregan. */
function crmRoles(){
  if(!CAT.vendedores) return;
  S.crmProspectos.forEach(o=>{ if(o.owner && !CAT.vendedores.includes(o.owner) && !debaja("vendedores",o.owner)) CAT.vendedores.push(o.owner); });
  activos("vendedores").forEach(v=>{ if(!ROLES[v]) ROLES[v] = {i:v.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase(), r:"Ventas", m:["crm"]}; });
  Object.keys(ROLES).forEach(k=>{ if(ROLES[k].r==="Ventas" && debaja("vendedores",k) && S.usuario!==k) delete ROLES[k]; });
}
/* Regla que ya existía en la oficina: cuando el cliente aprueba el estimado, la propiedad
   pasa de Lead a Active (deja de ser prospecto). El CRM la obedece: el trato pasa solo a
   Alta y a Claudia le llega el aviso para subir los documentos.
   Activación automática: expediente completo + primera WO agendada. */
function crmSync(){
  S.crmProspectos.forEach(o=>{ if(CRM_ETAPA_LEGADO[o.etapa]) o.etapa = CRM_ETAPA_LEGADO[o.etapa]; if(CRM_ETAPA_LEGADO[o.etapaPerdida]) o.etapaPerdida = CRM_ETAPA_LEGADO[o.etapaPerdida]; });
  S.crmProspectos.forEach(crmLeerProp);
  S.crmProspectos.forEach(o=>{
    if(!o.prop || ["alta","activa","perdida"].includes(o.etapa)) return;
    const p = P(o.prop); if(!p.id) return;
    const e = S.estimados.find(x=>x.prop===o.prop && ["Aprobado","Transferido"].includes(x.estado)); if(!e) return;
    o.alta = hoyReal(); o.altaVia = "estimado"; crmCambiarEtapa(o, "alta");
    if(!p.vendedor) p.vendedor = o.owner;
    S.crmAvances.push({id:"CA"+Date.now().toString(36)+o.id, opp:o.id, prop:o.prop, tipo:"Nota", fecha:hoyReal(), nota:`El cliente aprobó el estimado ${e.num||""}: pasó a Alta y a la oficina`, quien:"Sistema"});
    avisar("Claudia","Cuenta nueva para expediente", `${esc(o.nombre)} (${esc(o.owner)}) aprobó el estimado ${esc(e.num||"")}. Sube COI y documentos y carga la lista de precios para poder agendar.`, "v");
    if(o.owner) avisar(o.owner,"Tu cliente aprobó el estimado", `${esc(o.nombre)} ya es cliente. La oficina arma el expediente; queda Activa con su primera WO.`, "v");
  });
  S.crmProspectos.forEach(o=>{
    if(o.etapa==="alta" && o.alta && o.prop && expedienteOK(o.prop) && crmWOAgendada(o.prop)){
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
    const o = S.crmProspectos.find(x=>x.prop===p.id);
    return p.vendedor===v || (o && o.owner===v);
  });
}
const crmDueno = p => { const o=S.crmProspectos.find(x=>x.prop===p.id); return p.vendedor || (o&&o.owner) || ""; };

/* Avance del mes contra la meta */
function crmAvance(vends){
  const m = crmMes(), opps = S.crmProspectos.filter(o=>vends.includes(o.owner));
  const act = opps.filter(o=>o.activada && o.activada.startsWith(m));
  const r = {
    activadas: act.length,
    unidades: act.reduce((s,o)=>s+(+o.unidades||0),0),
    visitas: S.crmAvances.filter(a=>a.tipo==="Visita" && a.fecha.startsWith(m) && vends.includes(a.quien)).length,
    estimados: opps.filter(o=>o.solFecha && o.solFecha.startsWith(m)).length
  };
  const meta = {activadas:0,unidades:0,visitas:0,estimados:0};
  vends.forEach(v=>{ const x=crmMetaDe(v); Object.keys(meta).forEach(k=>meta[k]+= +x[k]||0); });
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
  /* Tres pestañas. Ocultas por ahora (Erika no las pidió): Cuentas, Salud de cartera, Números y Metas del equipo.
     Para volver a mostrarlas, agregarlas a esta lista: ["cuentas","Cuentas"],["salud","Salud de cartera"],["num","Números"],["equipo","Metas del equipo"]. */
  const tabs = [["dia","Pendientes"],["pipe","Etapas de venta"],["clientes","Clientes"]];
  const t = S.crmTab && tabs.some(x=>x[0]===S.crmTab) ? S.crmTab : "dia";
  const sub = {dia:crmVDia, pipe:crmVPipe, clientes:crmVClientes, cuentas:crmVCuentas, salud:crmVSalud, num:crmVNum, equipo:crmVEquipo}[t];
  return `<div class="ph"><div><h2>${admin?"CRM · Ventas":"Mi CRM"}</h2>
      <p>${admin?"Todo el trabajo comercial del equipo: prospectos, estimados y clientes.":"Tus pendientes, tus prospectos y tus clientes."}</p></div>
    <div class="act">
      ${admin?`<label class="crm-filtro"><span>Vendedor</span><select id="crmVendSel" data-a="crmVend" aria-label="Filtrar por vendedor">
        <option value="">Todo el equipo</option>${crmVendLista().map(v=>`<option ${S.crmVend===v?"selected":""}>${v}</option>`).join("")}</select></label>`:""}
      <button class="btn p" data-a="crmNueva">+ Prospecto</button></div></div>
    <div class="tabs" role="tablist">${tabs.map(([k,n])=>`<button class="tab ${t===k?"on":""}" role="tab" aria-selected="${t===k}" data-a="crmTab" data-t="${k}">${n}</button>`).join("")}</div>
    ${sub()}`;
};

function crmVDia(){
  const hoy = hoyReal();
  const abiertas = crmMias().filter(crmAbierta);
  const tareas = abiertas.filter(o=>o.prox && o.prox.fecha && o.prox.fecha<=fechaMover(hoy,1))
    .sort((a,b)=>a.prox.fecha.localeCompare(b.prox.fecha));
  const sinProx = abiertas.filter(o=>!o.prox || !o.prox.fecha), venc = tareas.filter(o=>o.prox.fecha<hoy).length;
  const recontactar = crmMias().filter(o=>o.etapa==="perdida" && o.recontacto && o.recontacto<=hoy);
  const estanc = abiertas.filter(crmEstancada);
  const cartera = crmCartera().map(p=>({p, h:crmSalud(p)})).filter(x=>x.h.s!=="v");
  const recientes = crmMias().filter(o=>o.etapa==="activa" && crmDias(o.activada)<=14);
  return `
  <div class="kpis">
    <div class="kpi"><div class="l">Vencidos</div><div class="v ${venc?"b":""}">${venc}</div></div>
    <div class="kpi"><div class="l">Para hoy o mañana</div><div class="v">${tareas.length-venc}</div></div>
    <div class="kpi"><div class="l">Sin próxima acción</div><div class="v ${sinProx.length?"w":""}">${sinProx.length}</div></div>
    <div class="kpi"><div class="l">Tratos abiertos</div><div class="v">${abiertas.length}</div><div class="crm-sub">${crmUnidsTxt(abiertas)}</div></div>
  </div>
  <div class="crm-dia">
    <div class="card"><div class="chd"><h3>Qué hacer hoy</h3><span class="s">${tareas.length+recontactar.length} pendiente(s) para hoy o mañana</span></div>
      ${tareas.length||recontactar.length?`<ul class="crm-list">${tareas.map(o=>{
        const v=o.prox.fecha<hoy;
        return `<li class="${v?"venc":""}"><div class="crm-li-main"><b>${esc(o.prox.tipo)}</b> · ${esc(o.nombre)}
          <div class="crm-li-sub">${esc(o.prox.nota||"")}${o.contacto&&o.contacto.nombre?` — ${esc(o.contacto.nombre)}`:""}</div></div>
          <span class="crm-when">${v?`Vencida ${crmFecha(o.prox.fecha)}`:o.prox.fecha===hoy?"Hoy":"Mañana"}</span>
          <button class="btn sm ${v?"p":""}" data-a="crmAvance" data-id="${o.id}">Avance</button></li>`;}).join("")}</ul>`
      :""}
      ${!tareas.length&&!recontactar.length?`<div class="empty">Nada pendiente para hoy. Agenda tu próxima acción en «Etapas de venta».</div>`:""}
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
          ${recientes.slice(0,CRM_TOPE).map(o=>{ const w=crmWOsProp(o.prop).find(x=>x.estado==="Completed");
            return `<li><div class="crm-li-main"><span class="pill v">Activa</span> ${esc(o.nombre)}
              <div class="crm-li-sub">${w?`Primer trabajo terminado (${woN(esc(w.id))}). Llama al manager para saber cómo quedó.`:"Ya tiene su primera WO con fecha."}</div></div>
              <button class="btn sm" data-a="crmAbrir" data-id="${o.id}">Seguimiento</button></li>`;}).join("")}
          ${cartera.slice().sort((a,b)=>(a.h.s==="r"?0:1)-(b.h.s==="r"?0:1)).slice(0,CRM_TOPE).map(({p,h})=>`<li><div class="crm-li-main"><span class="crm-dot ${h.s}" aria-hidden="true"></span>${esc(p.nombre)}
              <div class="crm-li-sub">${esc(h.why.join("; "))}</div></div>
              <button class="btn sm" data-a="crmSaludAct" data-id="${p.id}">Registrar contacto</button></li>`).join("")}
        ${cartera.length>CRM_TOPE?`<li><button class="btn sm" data-a="crmTab" data-t="clientes">Ir a Clientes</button></li>`:""}
        ${recientes.length>CRM_TOPE?`<li>${`<button class="btn sm" data-a="crmTab" data-t="clientes">Ir a Clientes</button>`}</li>`:""}
        </ul>`:`<div class="empty">Tus cuentas activas están al día.</div>`}</div>
    </div>
  </div>`;
}

function crmVPipe(){
  const q = crmNorm(S.crmQ), todas = crmMias();
  const ops = todas.filter(o=>!q || [o.nombre,o.mgmt,o.zona,o.owner,o.contacto&&o.contacto.nombre].some(t=>crmNorm(t).includes(q)));
  const perd = ops.filter(o=>o.etapa==="perdida").sort((a,b)=>String(b.etapaDesde||"").localeCompare(String(a.etapaDesde||"")));
  const {filas:pagPerd, pie:piePerd} = crmPaginar(perd, "crmPgP");
  const clientes = q ? crmClientes().filter(x=>crmNorm(x.n).includes(q)) : [];
  return `${notaProto("cómo se usa el CRM",["«+ Prospecto»: solo el nombre es obligatorio; la propiedad aparece en Propiedades como Lead.","Toca la tarjeta («Avance»): Llamada, Mensaje o Visita la dejan en su columna.","«Pidió estimado» la pasa a Estimado y le llega la solicitud a Claudia; su estado (En preparación, Enviado, Rechazado) lo pone la oficina.","«Aceptó (Alta)», o el estimado aprobado por la oficina, la pasa a Alta: Claudia recibe el aviso para los documentos.",`Alta se queda ${CRM_ALTA_H} horas en la columna y después sigue en «Clientes».`,"«No contrató» la pasa a «No contrataron»; se puede reabrir."])}<div class="note" style="margin-bottom:12px">Toca una tarjeta para registrar el avance. Los datos que falten no bloquean.</div>
  <div class="card"><div class="cp" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="crmQ" type="search" value="${esc(S.crmQ||"")}" placeholder="Buscar propiedad, management, zona, contacto o vendedor" aria-label="Buscar" style="flex:1;min-width:220px">
    <span class="crm-li-sub">${ops.filter(crmEnTablero).length} en etapas y no contrataron${q?` · ${clientes.length} en Clientes`:""}</span>${clientes.length?`<button class="btn sm" data-a="crmBuscaCli">Ir a Clientes</button>`:""}</div></div>
  <div class="crm-board" aria-label="Etapas de venta">
    ${CRM_ETAPAS.filter(e=>e.k!=="activa").map((e,i)=>{
      const col = ops.filter(o=>e.k==="alta" ? ["alta","activa"].includes(o.etapa) && crmEnTablero(o) : o.etapa===e.k);
      const ver = col, cli = e.k==="alta" ? crmClientes().length : 0;
      return `<section class="crm-col" data-drop="${e.k}" aria-label="${e.n}">
        <header><div class="crm-col-t"><span class="crm-col-n">${i+1}</span>${e.n}<span class="crm-col-c">${col.length}</span></div>
          <div class="crm-col-v">${crmUnidsTxt(col)}</div>
          <div class="crm-col-r">${esc(e.req)}</div></header>
        <div class="crm-col-b">${ver.map(o=>crmCard(o)).join("")||`<div class="crm-vacio">Sin tratos</div>`}
          ${cli?`<button class="btn sm" data-a="crmTab" data-t="clientes">Clientes (${cli})</button>`:""}</div>
      </section>`;}).join("")}
  </div>
  ${perd.length?`<div class="card"><div class="chd"><h3>No contrataron</h3><span class="s">con fecha para volver a contactar</span><span class="r">${perd.length}</span></div>
    <table><thead><tr><th>Prospecto</th><th>Llegó hasta</th><th>Motivo</th><th>Volver a contactar</th><th>Vendedor</th><th></th></tr></thead>
    <tbody>${pagPerd.map(o=>`<tr><td><b>${esc(o.nombre)}</b><div class="crm-li-sub">${esc(crmZonaTxt(o))} · ${crmUniTxt(o)}</div></td>
      <td>${crmPill(o.etapaPerdida||"prospecto")}</td><td>${esc(o.motivo||"—")}</td>
      <td class="mono ${o.recontacto&&o.recontacto<=hoyReal()?"crm-txt-r":""}">${crmFecha(o.recontacto)}</td><td>${esc(o.owner)}</td>
      <td style="text-align:right"><button class="btn sm" data-a="crmReabrir" data-id="${o.id}">Reabrir</button></td></tr>`).join("")}</tbody></table>${piePerd}</div>`:""}`;
}
const crmUltTxt = o => { const a = crmActs(o)[0]; return a ? `${a.tipo} · ${crmFecha(a.fecha)} · ${a.nota}` : "sin avances"; };
function crmCard(o){
  const dias = crmDias(o.etapaDesde), est = crmEstancada(o), e = crmEst(o), cli = ["alta","activa"].includes(o.etapa);
  return `<article class="crm-card ${est?"est":""} ${crmVencida(o)?"venc":""}" draggable="${!cli}" ${cli?"":`data-drag="${o.id}"`} data-a="crmAvance" data-id="${o.id}" style="cursor:pointer">
    <button class="crm-card-t" data-a="crmAvance" data-id="${o.id}">${esc(o.nombre)}</button>
    <div class="crm-card-m">${esc(crmZonaTxt(o))}${o.mgmt?` · ${esc(o.mgmt)}`:""}${!crmEsVentas()?` · <b>${esc(o.owner||"Sin vendedor")}</b>`:""}</div>
    <div class="crm-card-k"><span>${crmUniTxt(o)}</span>${o.etapa==="propuesta"&&e?`<span class="pill ${CRM_EST_OK.includes(e.estado)?"v":["Descartada","Rechazado"].includes(e.estado)?"r":"w"}">${esc(e.estado)}${e.num?" · "+esc(e.num):""}</span>`:""}</div>
    <div class="crm-li-sub">Última: ${esc(crmUltTxt(o))}</div>
    ${crmAbierta(o)&&crmPorCompletar(o).length?`<div class="crm-li-sub">Por completar: ${crmPorCompletar(o).length} dato(s)</div>`:""}
    ${cli?`<div class="crm-card-x">${o.etapa==="activa"?`Activa desde ${crmFecha(o.activada)}`:"Alta"}</div><div class="crm-li-sub">Sale de esta columna en ${crmAltaRestan(o)} h</div>`:crmProx(o)}
    <div class="crm-card-f"><span class="crm-dias" title="Días en esta etapa">${dias} d${est?" · estancado":" en etapa"}</span></div>
    <div style="display:flex;gap:6px;margin-top:8px"><button class="btn sm p" data-a="crmAvance" data-id="${o.id}">Avance</button><button class="btn sm" data-a="crmAbrir" data-id="${o.id}">Ficha</button></div>
  </article>`;
}

/* ── REGISTRAR AVANCE ── lo que pasó decide dónde queda el prospecto; siempre queda quién, cuándo y qué dijo. */
const CRM_AVANCES = [
  {k:"llame",    n:"Llamada",        tipo:"Llamada"},
  {k:"escribi",  n:"Mensaje",        tipo:"Mensaje de texto"},
  {k:"visite",   n:"Visita",         tipo:"Visita"},
  {k:"estimado", n:"Pidió estimado", tipo:"Nota", va:"propuesta"},
  {k:"alta",     n:"Aceptó (Alta)",  tipo:"Nota", va:"alta"},
  {k:"no",       n:"No contrató",    tipo:"Nota", va:"perdida"}
];
const crmAvOpciones = o => CRM_AVANCES.filter(a => a.k==="estimado" ? crmPuedePedirEst(o) : a.k==="alta" ? crmAbierta(o) : a.k==="no" ? o.etapa!=="activa" : true);
const crmAvDestino = (o, k) => k==="estimado" ? (o.etapa==="prospecto" ? "Pasa a Estimado y le llega la solicitud a Claudia." : "Le llega la solicitud a Claudia.")
  : k==="alta" ? "Pasa a Alta y Claudia recibe el aviso para los documentos." : k==="no" ? "Pasa a «No contrataron». Se puede reabrir." : `Queda en ${crmEtapa(o.etapa).n} y se guarda en su historial.`;
function crmAvModal(id, k){
  const o = by(S.crmProspectos, id); if(!o) return;
  const ops = crmAvOpciones(o), acts = crmActs(o); if(!ops.some(x=>x.k===k)) k = "";
  modal(`<div class="mh"><h3>Avance — ${esc(o.nombre)}</h3><p>${crmPill(o.etapa)} ${esc(crmZonaTxt(o))} · ${crmUniTxt(o)}</p></div>
  <div class="mb">
    <fieldset id="crmAvF" style="border:0;padding:0;margin:0 0 10px"><legend style="font-weight:700;margin-bottom:6px">Qué pasó <span class="req">*</span></legend>
      ${ops.map(x=>`<label style="display:flex;gap:8px;align-items:center;padding:5px 0;cursor:pointer"><input type="radio" name="crmAvT" value="${x.k}" data-id="${o.id}" style="width:auto" ${k===x.k?"checked":""}> ${x.n}</label>`).join("")}</fieldset>
    <div class="note" id="crmAvD" style="margin-bottom:10px">${k?esc(crmAvDestino(o,k)):"Elige qué pasó."}</div>
    <div class="fld"><label for="crmAN" id="crmAvL">${k==="estimado"?"Qué quiere cotizar":"Comentario"} <span class="req">*</span></label><textarea id="crmAN" rows="3" placeholder="Ej.: hablé con el manager, quiere precio de pintura"></textarea></div>
    <div data-av="estimado" ${k==="estimado"?"":"hidden"}><div class="fld"><label for="crmAlcM">Correo del contacto</label><input id="crmAlcM" type="email" value="${esc(o.contacto&&o.contacto.mail||"")}"></div></div>
    <div data-av="no" ${k==="no"?"":"hidden"}><div class="fg c2"><div class="fld"><label for="crmPM">Motivo</label><select id="crmPM"><option value="">— elige —</option>${CRM_MOTIVOS.map(m=>`<option>${m}</option>`).join("")}</select></div>
      <div class="fld"><label for="crmPR">Recontactar el</label><input type="date" id="crmPR" value="${fechaMover(hoyReal(),90)}"></div></div></div>
    <div data-av="prox" ${k==="no"?"hidden":""}><div class="fg c2"><div class="fld"><label for="crmPT">Próxima acción</label><select id="crmPT">${CRM_ACT_TIPOS.filter(t=>t!=="Nota").map(t=>`<option>${t}</option>`).join("")}</select></div>
      <div class="fld"><label for="crmPF">Para cuándo</label><input type="date" id="crmPF" value=""></div></div>
      <div class="fld"><label for="crmPN">Detalle</label><input id="crmPN" placeholder="Ej.: confirmar si quieren precio de pintura"></div>
      ${o.prox&&o.prox.fecha?`<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="crmPH" style="width:auto"> Pendiente hecha: ${esc(o.prox.tipo)} · ${crmFecha(o.prox.fecha)}${o.prox.nota?" · "+esc(o.prox.nota):""}</label>`:""}</div>
    <h4 style="margin-top:14px">Historial</h4>
    <ol class="crm-tl">${acts.slice(0,4).map(a=>`<li><span class="crm-tl-f">${crmFecha(a.fecha)}</span><b>${esc(a.tipo)}</b> ${esc(a.nota)} <span class="crm-li-sub">— ${esc(a.quien)}</span></li>`).join("")||`<li class="crm-li-sub">Sin avances todavía.</li>`}</ol>
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn" data-a="crmAbrir" data-id="${o.id}">Ficha</button>
    <button class="btn p" data-a="crmAvOK" data-id="${o.id}">Guardar</button></div>`);
}

/* Los que ya trabajan con CPS: de Alta en adelante, más los que entraron directo por la oficina */
const crmClientes = () => crmMias().filter(o=>["alta","activa"].includes(o.etapa)).map(o=>{ const p=o.prop?P(o.prop):{};
      return {o, n:o.nombre, m:o.mgmt, z:o.zona, u:+o.unidades||0, v:o.owner, f:o.alta||o.activada||"", ms:crmAltaMs(o), inact:p.id&&estadoProp(p)==="Inactive", falta:o.etapa==="alta"?crmFalta(o):[]}; })
    .concat(crmCartera().filter(p=>!S.crmProspectos.some(o=>o.prop===p.id)).map(p=>({p, n:p.nombre, m:(by(S.clientes,p.cliente)||{}).nombre, z:p.zona, u:0, v:crmDueno(p), f:"", ms:0, falta:[]})));
function crmVClientes(){
  const q = crmNorm(S.crmQ);
  const lista = crmClientes().filter(x=>!q || [x.n,x.m,x.z,x.v].some(t=>crmNorm(t).includes(q))).sort((a,b)=>b.ms-a.ms);
  const {filas, pie} = crmPaginar(lista, "crmPgC"), admin = !crmEsVentas();
  return `<div class="card"><div class="chd"><h3>Clientes</h3><span class="s">ya trabajan con CPS: de Alta en adelante, y los que entraron por la oficina</span></div>
    <div class="cp" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="crmQ" type="search" value="${esc(S.crmQ||"")}" placeholder="Buscar cuenta, management o zona" aria-label="Buscar cuenta" style="flex:1;min-width:220px"><span class="crm-li-sub">${lista.length} cuenta(s)</span></div>
    <table><thead><tr><th>Cuenta</th><th>Management</th><th>Zona</th><th class="num">Unidades</th><th>Estado</th><th>Qué falta</th><th>Alta</th>${admin?"<th>Vendedor</th>":""}<th></th></tr></thead>
    <tbody>${filas.map(x=>`<tr><td><b>${esc(x.n)}</b>${x.p?`<div class="crm-li-sub">entró directo por la oficina</div>`:""}</td><td>${esc(x.m||"—")}</td><td>${esc(x.z||"—")}</td><td class="num">${x.u||"—"}</td>
      <td>${x.inact?`<span class="pill r">Inactive</span>`:crmPill(x.o?x.o.etapa:"activa")}</td><td>${esc(x.falta.join("; ")||"—")}</td><td class="mono">${x.f?crmFecha(x.f):"—"}</td>
      ${admin?`<td>${esc(x.v||"Sin vendedor")}</td>`:""}<td style="text-align:right">${x.o?`<button class="btn sm" data-a="crmAbrir" data-id="${x.o.id}">Abrir</button>`:`<button class="btn sm" data-a="crmSaludAct" data-id="${x.p.id}">Registrar contacto</button>`}</td></tr>`).join("")
      || `<tr><td colspan="9" class="empty">${q?"Ninguna cuenta coincide.":"Todavía no hay clientes."}</td></tr>`}</tbody></table>${pie}</div>`;
}

function crmVCuentas(){
  const norm = x => String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const ops = crmMias();
  const filas = ops.map(o=>{
    const p = o.prop ? P(o.prop) : null, h = p && p.id && p.estado==="Active" ? crmSalud(p) : null;
    return {o, p, h};
  });
  /* Cuentas activas que existen en la oficina pero no tienen oportunidad en el CRM (entraron directo por la oficina) */
  const sinOpp = crmCartera().filter(p=>!S.crmProspectos.some(o=>o.prop===p.id));
  const q = norm(S.crmQ), et = S.crmEt||"";
  const todas = filas.map(f=>({f, n:f.o.nombre, m:f.o.mgmt, z:f.o.zona, k:f.o.etapa, c:f.o.contacto&&f.o.contacto.nombre, v:f.o.owner}))
    .concat(sinOpp.map(p=>({p, n:p.nombre, m:(by(S.clientes,p.cliente)||{}).nombre, z:p.zona, k:"activa", c:(contactosDe(p.id)[0]||{}).nombre, v:crmDueno(p)})))
    .filter(x=>(!et||x.k===et) && (!q||[x.n,x.m,x.z,x.c,x.v].some(t=>norm(t).includes(q))));
  const {filas:pag, pie} = crmPaginar(todas, "crmPgC");
  const op = CRM_ETAPAS.concat([{k:"perdida",n:"No contrató"}]);
  return `<div class="card"><div class="cp" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    <input id="crmQ" type="search" value="${esc(S.crmQ||"")}" placeholder="Buscar cuenta, management, zona o contacto" aria-label="Buscar cuenta" style="flex:1;min-width:220px">
    <select id="crmEt" data-a="crmEtapaF" aria-label="Filtrar por etapa" style="width:auto"><option value="">Todas las etapas</option>${op.map(e=>`<option value="${e.k}" ${et===e.k?"selected":""}>${e.n}</option>`).join("")}</select>
    <span class="crm-li-sub">${todas.length} cuenta(s)</span></div><table>
    <thead><tr><th>Cuenta</th><th>Management</th><th>Zona</th><th class="num">Unidades</th><th>Etapa</th><th>Contacto</th><th>Última actividad</th><th>Salud</th>${!crmEsVentas()?"<th>Vendedor</th>":""}<th></th></tr></thead>
    <tbody>${pag.map(x=>x.f?(({o,h})=>`<tr>
      <td><b>${esc(o.nombre)}</b></td><td>${esc(o.mgmt||"—")}</td><td>${esc(o.zona||"—")}</td><td class="num">${+o.unidades||"Por confirmar"}</td>
      <td>${crmPill(o.etapa)}</td>
      <td>${esc(o.contacto&&o.contacto.nombre||"—")}<div class="crm-li-sub">${esc(o.contacto&&o.contacto.rol||"")}</div></td>
      <td class="mono">${crmFecha(crmUltAct(o))}</td>
      <td>${h?`<span class="crm-dot ${h.s}" aria-hidden="true"></span>${h.s==="v"?"Al día":h.s==="w"?"Atención":"En riesgo"}`:"—"}</td>
      ${!crmEsVentas()?`<td>${esc(o.owner)}</td>`:""}
      <td style="text-align:right"><button class="btn sm" data-a="crmAbrir" data-id="${o.id}">Abrir</button></td></tr>`)(x.f):(p=>{ const h=crmSalud(p); return `<tr><td><b>${esc(p.nombre)}</b><div class="crm-li-sub">entró directo por la oficina</div></td>
      <td>${esc((by(S.clientes,p.cliente)||{}).nombre||"—")}</td><td>${esc(p.zona||"")}</td><td class="num">—</td><td>${crmPill("activa")}</td>
      <td>${esc((contactosDe(p.id)[0]||{}).nombre||"—")}</td><td class="mono">—</td>
      <td><span class="crm-dot ${h.s}" aria-hidden="true"></span>${h.s==="v"?"Al día":h.s==="w"?"Atención":"En riesgo"}</td>
      ${!crmEsVentas()?`<td>${esc(crmDueno(p)||"Sin asignar")}</td>`:""}
      <td style="text-align:right"><button class="btn sm" data-a="crmSaludAct" data-id="${p.id}">Registrar contacto</button></td></tr>`;})(x.p)).join("")
      || `<tr><td colspan="10" class="empty">${q||et?"Ninguna cuenta coincide.":"Todavía no hay cuentas. Registra tu primer prospecto."}</td></tr>`}
    </tbody></table>${pie}</div>`;
}

function crmVSalud(){
  const cart = crmCartera().map(p=>({p, h:crmSalud(p)}));
  const orden = {r:0,w:1,v:2}; cart.sort((a,b)=>orden[a.h.s]-orden[b.h.s]);
  const c = k => cart.filter(x=>x.h.s===k).length;
  const {filas:pag, pie} = crmPaginar(cart, "crmPgS");
  return `<div class="kpis">
    <div class="kpi"><div class="l">En riesgo</div><div class="v b">${c("r")}</div></div>
    <div class="kpi"><div class="l">Atención</div><div class="v w">${c("w")}</div></div>
    <div class="kpi"><div class="l">Al día</div><div class="v g">${c("v")}</div></div>
    <div class="kpi"><div class="l">Cuentas activas</div><div class="v">${cart.length}</div></div></div>
  <div class="card"><div class="chd"><h3>Cuentas activas</h3><span class="s">calculado con las WO, returns y facturas reales de la oficina; Ventas solo mira y llama</span></div>
  <table><thead><tr><th>Cuenta</th><th>Estado</th><th>Por qué</th><th>Última WO</th><th class="num">WO 30 días</th><th class="num">Promedio mes</th>${!crmEsVentas()?"<th>Vendedor</th>":""}<th></th></tr></thead>
  <tbody>${pag.map(({p,h})=>`<tr>
    <td><b>${esc(p.nombre)}</b><div class="crm-li-sub">${esc(p.zona||"")}</div></td>
    <td><span class="crm-dot ${h.s}" aria-hidden="true"></span>${h.s==="v"?"Al día":h.s==="w"?"Atención":"En riesgo"}</td>
    <td>${esc(h.why.join("; ")||"Mandando trabajo normal")}</td>
    <td class="mono">${crmFecha(h.ult)}</td><td class="num">${h.n30}</td><td class="num">${h.prom}</td>
    ${!crmEsVentas()?`<td>${esc(crmDueno(p)||"Sin asignar")}</td>`:""}
    <td style="text-align:right;white-space:nowrap"><button class="btn sm ${h.s==="r"?"p":""}" data-a="crmSaludAct" data-id="${p.id}">Registrar contacto</button>
      ${!crmEsVentas()?`<button class="btn sm" data-a="crmIrProp" data-id="${p.id}">Ver propiedad</button>`:""}</td></tr>`).join("")
    || `<tr><td colspan="8" class="empty">No tienes cuentas activas todavía.</td></tr>`}</tbody></table>${pie}</div>
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
  <table><thead><tr><th>Vendedor</th><th class="num">Tratos abiertos</th><th class="num">Unidades abiertas</th><th class="num">Activadas</th><th class="num">Unidades ganadas</th><th class="num">Visitas</th><th class="num">Estimados</th><th class="num">Vencidas</th></tr></thead>
  <tbody>${crmVendLista().map(v=>{ const {r,meta}=crmAvance([v]), ab=S.crmProspectos.filter(o=>o.owner===v&&crmAbierta(o));
    const cel=(a,m)=>`<td class="num ${m&&a>=m?"crm-txt-v":""}">${a} <span class="crm-de">/ ${m}</span></td>`;
    return `<tr><td><b>${esc(v)}</b></td><td class="num">${ab.length}</td><td class="num">${crmUnids(ab)}</td>
      ${cel(r.activadas,meta.activadas)}${cel(r.unidades,meta.unidades)}${cel(r.visitas,meta.visitas)}${cel(r.estimados,meta.estimados)}
      <td class="num ${ab.filter(crmVencida).length?"crm-txt-r":""}">${ab.filter(crmVencida).length}</td></tr>`;}).join("")}</tbody></table></div>`;
}

function crmVEquipo(){
  return `<div class="card"><div class="chd"><h3>Metas mensuales</h3><span class="s">las ve cada vendedor</span>
    <span class="r"><button class="btn sm" data-a="catVer" data-v="vendedores">Gestionar vendedores en Catálogos</button><button class="btn sm p" data-a="crmMetasOK">Guardar metas</button></span></div>
  <div class="cp crm-li-sub" style="border-bottom:1px solid var(--line)">Los vendedores se crean y se dan de baja en <b>Catálogos › Ejecutivos de ventas</b>. Cada uno recibe su usuario de Ventas; aquí solo se ponen sus metas.</div>
  ${(()=>{ const huer = [...new Set(S.crmProspectos.filter(o=>crmAbierta(o) && o.owner && !crmVendLista().includes(o.owner)).map(o=>o.owner))];
    return huer.length ? `<div class="cp"><div class="note r">${huer.map(v=>`<b>${esc(v)}</b> ya no está en el catálogo y tiene ${S.crmProspectos.filter(o=>o.owner===v&&crmAbierta(o)).length} trato(s) abiertos`).join("; ")}. Ábrelos en «Etapas de venta» y cámbiales el vendedor.</div></div>` : ""; })()}
  ${crmVendLista().length?"":`<div class="empty">Todavía no hay vendedores. Créalos en Catálogos › Ejecutivos de ventas.</div>`}
  <table><thead><tr><th>Vendedor</th><th>Cuentas activadas</th><th>Unidades ganadas</th><th>Visitas</th><th>Estimados pedidos</th></tr></thead>
  <tbody>${crmVendLista().map(v=>{ const m=crmMetaDe(v);
    const inp=(k)=>`<input type="number" min="0" class="crm-in" id="crmM_${v}_${k}" value="${+m[k]||0}" aria-label="${k} de ${v}">`;
    return `<tr><td><b>${esc(v)}</b><div class="crm-li-sub">Entra como «${esc(v)}» en el selector de usuario</div></td><td>${inp("activadas")}</td><td>${inp("unidades")}</td><td>${inp("visitas")}</td><td>${inp("estimados")}</td></tr>`;}).join("")}</tbody></table></div>
  ${crmRanking()}`;
}

/* ── FICHA DE LA OPORTUNIDAD ── */
function crmFicha(id){
  const o = by(S.crmProspectos, id); if(!o) return;
  const i = crmIdx(o.etapa), admin = !crmEsVentas();
  const falta = o.etapa==="alta" ? crmFalta(o) : [];
  const est = crmEst(o), acts = crmActs(o);
  const exp = o.prop ? expedienteDe(o.prop) : null;
  modal(`<div class="mh crm-mh"><div><h3>${esc(o.nombre)} ${crmPill(o.etapa)}</h3>
      <p>${esc(crmZonaTxt(o))}${o.mgmt?` · ${esc(o.mgmt)}`:""} · ${crmUniTxt(o)} · ${esc(o.origen||"Client Source por confirmar")}</p></div></div>
  <div class="mb">
    ${o.etapa!=="perdida"?`<ol class="crm-steps">${CRM_ETAPAS.map((e,k)=>`<li class="${k<i?"ok":k===i?"on":""}"><span>${k+1}</span>${e.n}</li>`).join("")}</ol>`
      :`<div class="note r">No contrató. Llegó hasta «${esc(crmEtapa(o.etapaPerdida).n)}»: ${esc(o.motivo||"")}. Volver a contactar el ${crmFecha(o.recontacto)}.</div>`}
    ${o.etapa!=="perdida" && crmPorCompletar(o).length?`<div class="note w" style="margin-bottom:8px"><b>Por completar:</b> ${esc(crmPorCompletar(o).join(", "))}. No bloquea; complétalo en «Editar datos» cuando lo tengas.</div>`:""}
    ${o.etapa==="alta"
      ? `<div class="note ${falta.length?"w":"v"}"><b>Para quedar activa:</b> ${falta.length?esc(falta.join("; "))+". Esto lo hace la oficina; aquí se actualiza solo.":"todo listo."}</div>` : ""}
    <div class="crm-ficha">
      <div>
        <h4>Contacto</h4>
        <dl class="crm-dl"><dt>Nombre</dt><dd>${esc(o.contacto.nombre||"—")}</dd><dt>Rol</dt><dd>${esc(o.contacto.rol||"—")}</dd>
          <dt>Teléfono</dt><dd>${esc(o.contacto.tel||"—")}</dd><dt>Correo</dt><dd>${esc(o.contacto.mail||"—")}</dd>
          <dt>Dirección</dt><dd>${esc(o.dir||"—")}</dd><dt>Vendedor</dt><dd>${admin?`<select id="crmOwner" data-a="crmOwner" data-id="${o.id}" aria-label="Vendedor">${o.owner?"":`<option value="" selected>Sin vendedor</option>`}${crmVendLista().map(v=>`<option ${o.owner===v?"selected":""}>${v}</option>`).join("")}</select>`:esc(o.owner)}</dd></dl>
        <h4>Con la oficina</h4>
        <dl class="crm-dl">
          <dt>Estimado</dt><dd>${est?`<span class="pill ${CRM_EST_OK.includes(est.estado)?"v":est.estado==="Descartada"||est.estado==="Rechazado"?"r":"w"}">${esc(est.estado)}</span> ${esc(est.num||"")}`:"Sin pedir"}</dd>
          <dt>Propiedad</dt><dd>${o.prop?`${esc(P(o.prop).nombre)} <span class="pill ${P(o.prop).estado==="Active"?"v":P(o.prop).estado==="Inactive"?"r":"m"}">${esc(P(o.prop).estado||"Lead")}</span>${o.alta?"":`<div class="crm-li-sub">La oficina ya la ve en Propiedades como Lead</div>`}`:"Se crea al registrar el prospecto"}</dd>
        </dl>
        ${exp&&o.alta?`<ul class="crm-exp">${exp.map(c=>`<li class="${c.ok?"ok":""}">${c.ok?"✓":"○"} ${esc(c.n)}</li>`).join("")}</ul>
          <div class="crm-li-sub">El expediente lo completa Claudia.</div>`:""}
        <div class="crm-acc">
          ${o.etapa==="perdida"?"":`<button class="btn p" data-a="crmAvance" data-id="${o.id}">Avance</button>`}
        </div>
      </div>
      <div>
        <h4>Historial</h4>
        <ol class="crm-tl">${acts.map(a=>`<li><span class="crm-tl-f">${crmFecha(a.fecha)}</span><b>${esc(a.tipo)}</b> ${esc(a.nota)} <span class="crm-li-sub">— ${esc(a.quien)}</span></li>`).join("")
          || `<li class="crm-li-sub">Sin avances todavía.</li>`}</ol>
      </div>
    </div>
  </div>
  <div class="mf">
    ${o.etapa==="perdida"?`<button class="btn" data-a="crmReabrir" data-id="${o.id}">Reabrir</button>`:""}
    <button class="btn" data-a="crmEditar" data-id="${o.id}">Editar datos</button>
    <button class="btn" data-a="cm">Cerrar</button></div>`, true);
}

function crmForm(o){
  const admin = !crmEsVentas(), c = o ? o.contacto : {};
  /* Con la propiedad creada, lo que ya tiene dato lo mantiene la oficina; lo vacío se puede completar aquí. */
  const ya = v => o && o.prop && String(v||"").trim(), ro = v => ya(v) ? "readonly" : "", dis = v => ya(v) ? "disabled" : "";
  modal(`<div class="mh"><h3>${o?"Editar prospecto":"Nuevo prospecto"}</h3>
    <p>Una propiedad que quieres convertir en cliente. Si ya es cliente de la oficina, no hace falta registrarla aquí.</p></div>
  <div class="mb">
    <div class="fg c2">
      <div class="fld"><label for="crmN">Propiedad <span class="req">*</span></label><input id="crmN" ${ro(o&&o.nombre)} value="${esc(o?o.nombre:"")}" placeholder="Ej.: Palms at Navarre"></div>
      <div class="fld"><label for="crmMg">Management</label><input id="crmMg" list="crmMgL" value="${esc(o?o.mgmt:"")}" placeholder="Empresa que la administra">
        <datalist id="crmMgL">${S.clientes.map(x=>`<option value="${esc(x.nombre)}">`).join("")}</datalist></div></div>
    <div class="fg c2">
      <div class="fld"><label for="crmZ">Zona</label><select id="crmZ" ${dis(o&&o.zona)}><option value="">— elige —</option>${zonasN().map(z=>`<option ${o&&o.zona===z?"selected":""}>${esc(z)}</option>`).join("")}</select></div>
      <div class="fld"><label for="crmU">Unidades</label><input type="number" min="1" id="crmU" value="${o&&+o.unidades||""}" placeholder="Si no lo sabes, déjalo vacío"></div></div>
    <div class="fg c2">
      <div class="fld"><label for="crmDir">Dirección</label><input id="crmDir" ${ro(o&&o.dir)} value="${esc(o?o.dir||"":"")}"></div>
      <div class="fld"><label for="crmO">Client Source</label><select id="crmO" ${dis(o&&o.origen)}><option value="">— elige —</option>${CRM_ORIGENES.map(g=>`<option ${o&&o.origen===g?"selected":""}>${g}</option>`).join("")}</select></div></div>
    ${o&&o.prop?`<div class="note" style="margin-bottom:10px">Completa lo que falte. Lo que ya tiene dato lo mantiene la oficina en Propiedades; si algo cambió, regístralo como actividad.</div>`:`<div class="note" style="margin-bottom:10px">Solo el nombre es obligatorio. Lo demás se completa después.</div>`}
    <h4 class="crm-h4">Contacto</h4>
    <div class="fg c2">
      <div class="fld"><label for="crmCN">Nombre</label><input id="crmCN" ${ro(c.nombre)} value="${esc(c.nombre||"")}"></div>
      <div class="fld"><label for="crmCR">Rol</label><select id="crmCR" ${dis(c.nombre)}>${CRM_ROLES_CONT.map(r=>`<option ${c.rol===r?"selected":""}>${r}</option>`).join("")}</select></div></div>
    <div class="fg c2">
      <div class="fld"><label for="crmCT">Teléfono</label><input id="crmCT" ${ro(c.tel)} value="${esc(c.tel||"")}"></div>
      <div class="fld"><label for="crmCM">Correo</label><input id="crmCM" type="email" ${ro(c.mail)} value="${esc(c.mail||"")}"></div></div>
    ${!o?`<h4 class="crm-h4">Primera acción</h4>
    <div class="fg c2">
      <div class="fld"><label for="crmPT">Qué sigue</label><select id="crmPT">${CRM_ACT_TIPOS.filter(t=>t!=="Nota").map(t=>`<option>${t}</option>`).join("")}</select></div>
      <div class="fld"><label for="crmPF">Para cuándo</label><input type="date" id="crmPF" value="${hoyReal()}"></div></div>
    <div class="fld"><label for="crmPN">Detalle (opcional)</label><input id="crmPN" placeholder="Ej.: pedir el nombre del manager"></div>`:""}
    ${admin?`<div class="fld"><label for="crmOw">Vendedor</label><select id="crmOw">${crmVendLista().length&&!(o&&!o.owner)?"":`<option value="">Sin vendedor</option>`}${crmVendLista().map(v=>`<option ${(o?o.owner:S.crmVend)===v?"selected":""}>${v}</option>`).join("")}</select></div>`:""}
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
    <button class="btn p" data-a="crmGuardar" ${o?`data-id="${o.id}"`:""}>${o?"Guardar":"Registrar"}</button></div>`);
}

/* Erika (REQ 19/11 punto 4): «llena los datos básicos y de ahí se va a la propiedad».
   El prospecto ES una propiedad en estado Lead desde que se registra: la oficina la ve en Propiedades
   y puede armarle el estimado sin volver a escribir nada. */
function crmAsegurarProp(o){
  if(o.prop && P(o.prop).id) return o.prop;
  const id = crmUid("P"), cli = S.clientes.find(c=>c.nombre.toLowerCase()===String(o.mgmt||"").toLowerCase());
  S.propiedades.push({id, nombre:o.nombre, zona:o.zona, ciudad:o.zona, cliente:cli?cli.id:"", dir:o.dir||"", estado:"Lead", origen:o.origen,
    vendedor:o.owner, activa:true, polizas:[], diasCredito:30, notas:`Registrada por Ventas (${o.owner||S.usuario}). ${crmUniTxt(o)}.`});
  o.prop = id;
  crmContactoProp(o);
  return id;
}
/* El contacto del prospecto queda también como contacto de la propiedad (uno solo, se actualiza) */
/* El CRM nunca pisa lo que la oficina corrigió: si el contacto no existe lo crea; si existe, solo completa lo que esté vacío. */
function crmContactoProp(o){
  if(!o.prop || !o.contacto || !String(o.contacto.nombre||"").trim()) return;
  let c = o.contactoId ? by(S.contactos, o.contactoId) : null;
  if(!c){ c = {id:crmUid("C"), prop:o.prop, tipo:o.contacto.rol||"Property Manager", nombre:o.contacto.nombre, mail:o.contacto.mail||"", tel:o.contacto.tel||""};
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
  if(e==="alta") o.altaEn = Date.now();
}

function crmHacerEstimado(o, alcance, mail){
  o.contacto = o.contacto||{};
  if(mail) o.contacto.mail = mail;
  crmAsegurarProp(o); crmContactoProp(o);
  const ns = {id:crmUid("SC"), fecha:HOY_SUP, quien:S.usuario, estimadoId:null, estado:"Lista para estimado", ...solSello(),
    prop:o.prop, propNombre:"", contactoId:o.contactoId||null, contacto:o.contacto.nombre||"Contacto", correo:o.contacto.mail||"",
    alcance:alcance||"Por confirmar", inspeccion:false, fechaObjetivo:"", notas:`Desde CRM · ${crmUniTxt(o)} · ${crmZonaTxt(o)}`, origen:"Ventas", pidio:o.owner||S.usuario};
  S.solicitudesComerciales.unshift(ns);
  o.solId = ns.id; o.solFecha = hoyReal();
  avisar("Claudia","Ventas pide un estimado", `${esc(o.nombre)} (${esc(o.owner||S.usuario)}): ${esc(ns.alcance.slice(0,80))}`, "a");
  if(o.etapa==="prospecto") crmCambiarEtapa(o,"propuesta");
  toast("✓ Estimado solicitado","Le llegó a Claudia en Solicitudes. El estado lo verás en la tarjeta.","v");
}
function crmHacerAlta(o){
  const id = crmAsegurarProp(o); crmContactoProp(o);
  const pp = P(id); if(pp.estado==="Inactive" && o.inactivoPorCrm){ pp.estado="Lead"; o.inactivoPorCrm=false; }
  /* Sigue en Lead: pasa a Active cuando la oficina le agenda la primera WO (REQ 19/11 punto 2). */
  if(!pp.vendedor) pp.vendedor = o.owner;
  o.alta = hoyReal();
  crmCambiarEtapa(o, "alta");
  avisar("Claudia","Cuenta nueva para expediente", `${esc(o.nombre)} (${esc(o.owner||S.usuario)}) aceptó. Sube COI y documentos y carga la lista de precios para poder agendar.${crmPorCompletar(o).length?` Por completar: ${esc(crmPorCompletar(o).join(", "))}.`:""}`, "v");
  toast("✓ Pasó a Alta", `Claudia recibió el aviso para subir documentos de ${esc(o.nombre)}. Queda ${CRM_ALTA_H} horas en Alta y después sigue en «Clientes».`, "v");
}
function crmHacerNo(o, motivo, recontacto){
  o.etapaPerdida = o.etapa; o.motivo = motivo; o.recontacto = recontacto; o.prox = null;
  const conTrabajo = o.prop && crmWOsProp(o.prop).length > 0;
  if(o.prop && !conTrabajo && P(o.prop).estado==="Lead"){ P(o.prop).estado = "Inactive"; o.inactivoPorCrm = true; }
  crmCambiarEtapa(o, "perdida");
  toast("No contrató", `${esc(o.nombre)}${motivo?": "+esc(motivo):""}.${recontacto?` Volver a contactar el ${crmFecha(recontacto)}.`:""}${conTrabajo?" La oficina ya trabaja con esta propiedad: no se inactiva.":""}`, "a");
}

Object.assign(ACC, {
  crmTab: d => { S.crmTab = d.t; S.crmQ = ""; S.crmEt = ""; S.crmPgC = 0; S.crmPgS = 0; S.crmPgP = 0; render(); },
  crmBuscaCli: () => { S.crmTab = "clientes"; S.crmPgC = 0; render(); },
  crmVerCuentas: d => { S.crmTab = "cuentas"; S.crmEt = d.e; S.crmQ = ""; S.crmPgC = 0; render(); },
  crmEtapaF: () => { S.crmEt = val("crmEt"); S.crmPgC = 0; render(); },
  crmPag: d => { S[["crmPgS","crmPgP"].includes(d.c)?d.c:"crmPgC"] = Math.max(0, +d.p||0); render(); },
  crmVend: () => { S.crmVend = val("crmVendSel"); render(); },
  crmNueva: () => crmForm(null),
  crmEditar: d => crmForm(by(S.crmProspectos, d.id)),
  crmAbrir: d => crmFicha(d.id),
  crmGuardar: d => {
    if(marcaFalta(["crmN"])){ toast("Falta el nombre","Escribe el nombre de la propiedad. Lo demás se completa después.","r"); S.audOmitir=true; return; }
    const datos = {nombre:val("crmN"), mgmt:val("crmMg"), zona:val("crmZ"), unidades:Math.max(0, Math.floor(+val("crmU")||0))||null, dir:val("crmDir"), origen:val("crmO"),
      contacto:{nombre:val("crmCN"), rol:val("crmCR"), tel:val("crmCT"), mail:val("crmCM")}};
    if(!crmEsVentas()) datos.owner = val("crmOw") || "";
    if(d.id){
      const o = by(S.crmProspectos, d.id); S.crmUlt = o.id;
      /* Con propiedad creada, el vendedor solo cambia lo suyo (unidades y management); el resto lo manda la propiedad. */
      if(o.prop){ o.unidades = datos.unidades; o.mgmt = datos.mgmt;
        /* Completa solo lo vacío, en el prospecto y en su propiedad; nunca pisa lo que la oficina ya tiene. */
        const p0 = P(o.prop);
        ["zona","dir","origen"].forEach(k=>{ if(!String(o[k]||"").trim() && datos[k]){ o[k]=datos[k]; if(p0.id && !String(p0[k]||"").trim()) p0[k]=datos[k]; if(k==="zona" && p0.id && !p0.ciudad) p0.ciudad=datos.zona; } });
        o.contacto = o.contacto||{};
        if(!o.contacto.nombre && datos.contacto.rol) o.contacto.rol = datos.contacto.rol;
        ["nombre","tel","mail"].forEach(k=>{ if(!String(o.contacto[k]||"").trim() && datos.contacto[k]) o.contacto[k]=datos.contacto[k]; });
        crmContactoProp(o);
        if(datos.owner){ o.owner = datos.owner; const p=P(o.prop); if(p.id) p.vendedor = o.owner; } }
      else Object.assign(o, datos);
      cm();
      toast("✓ Cambios guardados", esc(o.nombre), "v"); render(); crmFicha(o.id); return;
    }
    /* Duplicados: la misma propiedad no se registra dos veces (ni en el CRM ni contra la oficina) */
    const norm = x => String(x||"").toLowerCase().replace(/\s+/g," ").trim();
    const yaOpp = S.crmProspectos.find(x=>norm(x.nombre)===norm(datos.nombre) && x.etapa!=="perdida");
    if(yaOpp){ toast("Ya está en el CRM", `${esc(yaOpp.nombre)} ya es un trato de ${esc(yaOpp.owner)} (${esc(crmEtapa(yaOpp.etapa).n)}). Si te toca a ti, pide a Claudia que te lo reasigne.`, "r"); S.audOmitir=true; return; }
    const yaProp = S.propiedades.find(x=>norm(x.nombre)===norm(datos.nombre) && x.activa!==false);
    if(yaProp && yaProp.estado==="Active"){ toast("Ya es cliente de la oficina", `${esc(yaProp.nombre)} ya está activa. Si quieres venderle servicios nuevos, pídele a Claudia que te asigne la cuenta.`, "r"); S.audOmitir=true; return; }
    const perdidaPrev = S.crmProspectos.find(x=>norm(x.nombre)===norm(datos.nombre) && x.etapa==="perdida");
    if(perdidaPrev){ toast("Ya se intentó antes", `${esc(perdidaPrev.nombre)} está en «No contrataron» (${esc(perdidaPrev.motivo||"sin motivo")}). Ábrela y usa «Reabrir» para no perder su historial.`, "r"); S.audOmitir=true; return; }
    const o = Object.assign({id:crmUid("OP"), etapa:"prospecto", owner:S.usuario, creado:hoyReal(), etapaDesde:hoyReal(),
      prox:{tipo:val("crmPT"), fecha:val("crmPF"), nota:val("crmPN")}}, datos);
    if(crmEsVentas()) o.owner = S.usuario;
    S.crmProspectos.unshift(o); S.crmUlt = o.id;
    /* Si la oficina ya la tenía registrada como Lead o Inactive, se usa esa misma propiedad */
    if(yaProp){ o.prop = yaProp.id; if(yaProp.estado==="Inactive") yaProp.estado="Lead"; if(!yaProp.vendedor) yaProp.vendedor=o.owner; crmContactoProp(o); }
    crmAsegurarProp(o);
    cm(); S.crmTab = "pipe";
    toast("✓ Prospecto registrado", `${esc(o.nombre)} quedó en Prospecto y ya aparece en Propiedades como Lead. ${o.prox.fecha?`Tu primera acción: ${esc(o.prox.tipo)} el ${crmFecha(o.prox.fecha)}.`:"Agenda tu próxima acción cuando la tengas."}${crmPorCompletar(o).length?` Por completar: ${esc(crmPorCompletar(o).join(", "))}.`:""}`, "v");
    render();
  },
  crmOwner: d => { const o=by(S.crmProspectos,d.id); if(!o) return; o.owner = val("crmOwner"); if(o.prop && P(o.prop).id) P(o.prop).vendedor = o.owner;
    toast("✓ Vendedor cambiado", `${esc(o.nombre)} ahora es de ${esc(o.owner)}.`, "v"); render(); crmFicha(o.id); },
  crmAvance: d => crmAvModal(d.id, d.k),
  crmAvOK: d => {
    const o = by(S.crmProspectos, d.id); if(!o){ S.audOmitir = true; return; }
    const r = document.querySelector('input[name="crmAvT"]:checked'), op = r && crmAvOpciones(o).find(x=>x.k===r.value);
    if(!op){ S.audOmitir = true; toast("Elige qué pasó","Marca una de las opciones.","r"); return; }
    if(marcaFalta(["crmAN"])){ S.audOmitir = true; toast("Falta el comentario",op.k==="estimado"?"Escribe qué quiere cotizar. Si todavía no se sabe, escribe «por confirmar».":"Escribe qué pasó.","r"); return; }
    const nota = val("crmAN"), mail = val("crmAlcM"), motivo = val("crmPM"), reco = val("crmPR"), px = {tipo:val("crmPT"), fecha:val("crmPF"), nota:val("crmPN")};
    const hecha = document.getElementById("crmPH");
    const a = {id:"CA"+Date.now().toString(36)+Math.random().toString(36).slice(2,5), opp:o.id, prop:o.prop||null, tipo:op.tipo, fecha:hoyReal(), ts:Date.now(), quien:S.usuario,
      nota: ["estimado","alta","no"].includes(op.k) ? `${op.n}: ${nota}` : nota};
    S.crmAvances.push(a);
    /* Una sola bitácora: si ya es propiedad de la oficina, queda también en su Communication Log */
    if(o.prop) S.comunicaciones.push({id:crmUid("CM"), prop:o.prop, fecha:a.fecha, medio:a.tipo, contacto:(o.contacto&&o.contacto.nombre)||"", quien:S.usuario, nota:"[Ventas] "+a.nota});
    if(op.k!=="no"){ if(px.fecha) o.prox = px; else if(hecha && hecha.checked) o.prox = null; }
    cm();
    if(op.k==="estimado") crmHacerEstimado(o, nota, mail);
    else if(op.k==="alta") crmHacerAlta(o);
    else if(op.k==="no") crmHacerNo(o, motivo, reco);
    else toast("✓ Avance guardado", `${esc(o.nombre)}: ${esc(op.n)}. Sigue en ${esc(crmEtapa(o.etapa).n)}.`, "v");
    render();
  },
  crmReabrir: d => {
    const o = by(S.crmProspectos, d.id); if(!o) return;
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
    const o = S.crmProspectos.find(x=>x.prop===d.id);
    S.comunicaciones.push({id:crmUid("CM"), prop:d.id, fecha:hoyReal(), medio:val("crmSM"), contacto:val("crmSC"), quien:S.usuario, nota:"[Ventas] "+val("crmSN")});
    if(o) S.crmAvances.push({id:"CA"+Date.now().toString(36), opp:o.id, prop:d.id, tipo:val("crmSM"), fecha:hoyReal(), nota:val("crmSN"), quien:S.usuario});
    cm(); toast("✓ Contacto registrado","Quedó en la Comunicación de la propiedad.","v"); render();
  },
  crmIrProp: d => { S.mod="propiedades"; S.sub=d.id; S.tab="comunicacion"; render(); },
  crmMetasOK: () => {
    crmVendLista().forEach(v=>{ let m = by(S.crmMetas, v); if(!m){ m = {id:v}; S.crmMetas.push(m); }
      ["activadas","unidades","visitas","estimados"].forEach(k=>{ const e=document.getElementById(`crmM_${v}_${k}`); if(e) m[k]=Math.max(0, +e.value||0); }); });
    toast("✓ Metas guardadas","","v"); render();
  }
});

/* Arrastrar a otra columna abre «Registrar avance»: nada se mueve sin dejar registro */
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
  const id = e.dataTransfer.getData("text/plain"); const o = id && by(S.crmProspectos, id);
  if(o && o.etapa!==col.dataset.drop) ACC.crmAvance({id, k:({propuesta:"estimado", alta:"alta"})[col.dataset.drop]||""}); });

/* Buscador de «Cuentas»: filtra mientras se escribe y conserva el cursor */
document.addEventListener("input", e => {
  if(e.target.id!=="crmQ") return;
  const c = e.target.selectionStart; S.crmQ = e.target.value; S.crmPgC = 0; S.crmPgP = 0; render();
  const n = document.getElementById("crmQ"); if(n){ n.focus(); try{ n.setSelectionRange(c,c); }catch(_){} }
});

/* «Registrar avance»: muestra solo lo que corresponde a lo que pasó, sin perder lo escrito */
document.addEventListener("change", e => {
  if(e.target.name!=="crmAvT") return;
  const k = e.target.value, o = by(S.crmProspectos, e.target.dataset.id); if(!o) return;
  document.querySelectorAll("[data-av]").forEach(x=>{ x.hidden = x.dataset.av==="prox" ? k==="no" : x.dataset.av!==k; });
  document.getElementById("crmAvD").textContent = crmAvDestino(o, k);
  document.getElementById("crmAvL").firstChild.textContent = k==="estimado" ? "Qué quiere cotizar " : "Comentario ";
});

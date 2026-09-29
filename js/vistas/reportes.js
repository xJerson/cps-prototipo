"use strict";
const DIMS = {
  semana:  {n:"Semana",           f:w=>"Semana "+w.semana},
  fecha:   {n:"Día",              f:w=>w.fecha},
  prop:    {n:"Propiedad",        f:w=>P(w.prop).nombre},
  tec:     {n:"Técnico",          f:w=>w.tec?tecN(w.tec):"— sin asignar —"},
  zona:    {n:"Zona",             f:w=>P(w.prop).zona},
  estado:  {n:"Estado",           f:w=>w.estado},
  cliente: {n:"Management",          f:w=>CLI(P(w.prop).cliente).nombre}
};
const MEDIDAS = {
  cant:  {n:"Cantidad de trabajos", f:()=>1,                     fmt:v=>v||""},
  ing:   {n:"Ingreso",              f:w=>ingresoWO(w)||0,        fmt:v=>v?money(v):""},
  egr:   {n:"Pago a técnicos",      f:w=>egresoWO(w)||0,         fmt:v=>v?money(v):""},
  util:  {n:"Utilidad",             f:w=>utilidadWO(w)||0,       fmt:v=>v?money(v):""}
};

VIEWS.reportes = () => {
  const dim = S.repDim||"semana";
  /* Si cambió de usuario con "Utilidad" seleccionado (queda en S.repMed,
     no se resetea solo al cambiar de rol), no se le queda mostrando ese
     número igual — cae de vuelta a la medida por defecto. */
  let med = S.repMed||"cant";
  if(med==="util" && !puedeVerUtilidad()) med = "cant";
  const D = DIMS[dim], M = MEDIDAS[med];
  const MEDIDAS_VISIBLES = Object.entries(MEDIDAS).filter(([k])=>k!=="util"||puedeVerUtilidad());
  const ws = S.wos.filter(w=>w.estado!=="Canceled");
  const cols = CAT.categorias.filter(c=>ws.some(w=>w.cat===c));   // incluye los de baja si hay historia
  const filas = {};
  ws.forEach(w=>{
    const k=D.f(w);
    filas[k] = filas[k] || {};
    filas[k][w.cat] = (filas[k][w.cat]||0) + M.f(w);
    filas[k].__tot = (filas[k].__tot||0) + M.f(w);
  });
  const claves = Object.keys(filas).sort();
  const totCol = c => claves.reduce((a,k)=>a+(filas[k][c]||0),0);
  const granTotal = claves.reduce((a,k)=>a+filas[k].__tot,0);
  const maxTot = Math.max(1,...claves.map(k=>filas[k].__tot));

  return `
  <div class="ph"><div><h2>Reportes</h2>
    <p>Es la <code>Pivot Table 3</code>: conteo por tipo de servicio. Aquí se recalcula sola y puedes cambiar por qué agrupar.</p></div></div>

  <div class="card"><div class="cp" style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end">
    <div class="fld" style="margin:0;min-width:190px"><label>Agrupar por</label>
      <select id="repDim" data-a="repCambia">${Object.entries(DIMS).map(([k,v])=>`<option value="${k}" ${k===dim?"selected":""}>${esc(v.n)}</option>`).join("")}</select></div>
    <div class="fld" style="margin:0;min-width:190px"><label>Qué medir</label>
      <select id="repMed" data-a="repCambia">${MEDIDAS_VISIBLES.map(([k,v])=>`<option value="${k}" ${k===med?"selected":""}>${esc(v.n)}</option>`).join("")}</select></div>
    <div style="margin-left:auto;text-align:right">
      <div style="font-size:10.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em">Gran total</div>
      <div class="mono" style="font-size:22px;font-weight:750">${med==="cant"?granTotal:money(granTotal)}</div></div>
  </div></div>

  <div class="card" style="overflow-x:auto"><div class="chd"><h3>${esc(M.n)} por ${esc(D.n.toLowerCase())} y tipo de servicio</h3>
    <span class="s">${claves.length} fila(s) · ${cols.length} tipos</span></div>
    <table><thead><tr><th style="position:sticky;left:0;background:var(--surface)">${esc(D.n)}</th>
      ${cols.map(c=>`<th class="num">${esc(c)}</th>`).join("")}
      <th class="num" style="border-left:2px solid var(--line)">Grand Total</th></tr></thead>
    <tbody>${claves.map(k=>`<tr>
      <td style="font-weight:650;position:sticky;left:0;background:var(--surface)">${esc(k)}</td>
      ${cols.map(c=>`<td class="num mono ${filas[k][c]?"celda":""}" ${filas[k][c]?`data-a="repDetalle" data-k="${esc(k)}" data-c="${esc(c)}"`:""} style="${filas[k][c]?"":"color:var(--faint)"}">${M.fmt(filas[k][c]||0)||"·"}</td>`).join("")}
      <td class="num mono" style="font-weight:700;border-left:2px solid var(--line)">
        ${M.fmt(filas[k].__tot)}
        <div style="background:var(--surface-3);border-radius:3px;height:4px;margin-top:3px">
          <div style="background:var(--azul);height:4px;border-radius:3px;width:${Math.round(filas[k].__tot/maxTot*100)}%"></div></div></td></tr>`).join("")}
      <tr style="background:var(--surface-2);font-weight:750">
        <td style="position:sticky;left:0;background:var(--surface-2)">Total</td>
        ${cols.map(c=>`<td class="num mono">${M.fmt(totCol(c))||"·"}</td>`).join("")}
        <td class="num mono" style="border-left:2px solid var(--line)">${M.fmt(granTotal)}</td></tr>
    </tbody></table></div>

  <div class="note"><b>Toca cualquier número y se abre.</b> Claudia: «nos sirve para contabilizar… para mañana tenemos 11 limpiezas y 18 pinturas.
    Es información general, pero <b>necesitamos un desglose mayor: saber pinturas, pero en dónde están para poder agendar</b>. Aquí yo no lo puedo ver, tengo que regresarme al otro archivito».</div>

  ${vPorZona()}

  <div class="tr" style="margin-top:8px">Hoy esto es una tabla dinámica de mil filas que alguien refresca a mano, y que solo da totales.</div>

  ${vSeguimiento()}`;
};

/* «Necesitamos saber pinturas, pero EN DÓNDE ESTÁN para poder agendar» — el desglose por zona */
function vPorZona(){
  const dia = S.repDia || "2026-08-12";
  const dias = [...new Set(S.wos.filter(w=>w.estado!=="Canceled").map(w=>w.fecha))].sort();
  const ws = S.wos.filter(w=>w.fecha===dia && w.estado!=="Canceled");
  const porZona = {};
  ws.forEach(w=>{ const z=P(w.prop).zona; (porZona[z]=porZona[z]||[]).push(w); });
  const zonas = Object.keys(porZona).sort((a,b)=>porZona[b].length-porZona[a].length);
  return `
  <div class="card"><div class="chd"><h3>Qué hay y dónde está — para poder agendar</h3>
    <span class="s">agrupado por zona, porque el traslado quita tiempo</span>
    <span class="r"><select id="repDia" data-a="repDiaCambia" style="font-family:inherit;font-size:12.5px;padding:5px 8px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink)">
      ${dias.map(d=>`<option value="${d}" ${d===dia?"selected":""}>${d}</option>`).join("")}</select></span></div>
    ${zonas.length?`<div class="cp" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px">
      ${zonas.map(z=>{
        const arr=porZona[z];
        const porTipo={}; arr.forEach(w=>porTipo[w.cat]=(porTipo[w.cat]||0)+1);
        const props=[...new Set(arr.map(w=>w.prop))];
        return `<div style="border:1px solid var(--line);border-radius:9px;overflow:hidden">
          <div style="background:var(--azul-cl);padding:9px 12px;display:flex;align-items:center;gap:8px">
            <b style="color:var(--azul-s)">${esc(z)}</b>
            <span class="pill a" style="margin-left:auto">${arr.length} trabajo(s)</span>
            <span class="pill g">${props.length} propiedad(es)</span></div>
          <div style="padding:9px 12px;display:flex;flex-wrap:wrap;gap:5px;border-bottom:1px solid var(--line)">
            ${Object.entries(porTipo).map(([c,n])=>`<span class="pill ${c==="Paint"?"m":c==="Clean"?"v":"g"}">${n} ${esc(c)}</span>`).join("")}</div>
          <table><tbody>${props.map(pid=>{
            const suyas=arr.filter(w=>w.prop===pid);
            return `<tr><td style="padding:7px 12px">
              <div style="font-weight:650;font-size:12px">${esc(P(pid).nombre)}</div>
              <div style="font-size:10.5px;color:var(--faint)">${esc(P(pid).dir)}</div>
              <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">
                ${suyas.map(w=>`<span class="pill g" style="cursor:pointer" data-a="woVer" data-id="${w.id}">${esc(U(w.unidad).num)} · ${esc(w.serv)}${w.tec?"":" ⚠"}</span>`).join("")}</div>
            </td></tr>`;}).join("")}</tbody></table>
        </div>`;
      }).join("")}</div>`
    :`<div class="empty">Nada agendado ese día</div>`}
    <div class="cp" style="border-top:1px solid var(--line)"><div class="tr" style="margin:0">
      El <b>⚠</b> marca las que todavía no tienen técnico. Con esto se asigna por cercanía en vez de abrir otro archivo para ver dónde queda cada propiedad.</div></div>
  </div>`;
}

/* WO (no canceladas, por fecha) de cada propiedad: últimas 4 semanas contra las 4 anteriores, relativo a HOY_SUP.
   «Sin WO» = las últimas 4 semanas quedaron en 0; «Bajó» = cayó 30 % o más. Lo marcado va primero. */
function tendenciaProps(){
  const mid=fechaMover(HOY_SUP,-28), ini=fechaMover(HOY_SUP,-56);
  const rango={"Sin WO":0,"Bajó":1,"":2};
  return S.propiedades.filter(p=>p.activa!==false).map(p=>{
    const ws=S.wos.filter(w=>w.prop===p.id&&w.estado!=="Canceled"&&w.fecha);
    const ult=ws.filter(w=>w.fecha>mid&&w.fecha<=HOY_SUP).length, ant=ws.filter(w=>w.fecha>ini&&w.fecha<=mid).length;
    const pct=ant>0?Math.round((ult-ant)/ant*100):null;
    const flag=ult===0?"Sin WO":(ant>0&&(ant-ult)/ant>=0.3?"Bajó":"");
    return {p,ult,ant,pct,flag};
  }).sort((a,b)=>rango[a.flag]-rango[b.flag]||b.ant-a.ant||a.p.nombre.localeCompare(b.p.nombre));
}
function tablaTendencia(){
  const tr=tendenciaProps(), nF=tr.filter(x=>x.flag).length;
  const fila=x=>`<tr><td style="font-weight:650">${esc(x.p.nombre)}</td><td class="num mono">${x.ult}</td><td class="num mono">${x.ant}</td>
    <td class="num mono">${x.pct===null?"—":(x.pct>0?"+":"")+x.pct+"%"}</td>
    <td>${x.flag?`<span class="pill ${x.flag==="Sin WO"?"r":"w"}">${x.flag}</span>`:""}</td></tr>`;
  return `<div class="card"><div class="chd"><h3>Frecuencia por propiedad</h3><span class="s">últimas 4 semanas vs. las 4 anteriores${nF?` · ${nF} marcada(s)`:""}</span></div>
    <table><thead><tr><th>Propiedad</th><th class="num">Últimas 4 sem.</th><th class="num">4 sem. previas</th><th class="num">Cambio</th><th></th></tr></thead>
    <tbody>${tr.map(fila).join("")}</tbody></table></div>`;
}
/* Lo que Claudia pidió y el conteo no da: QUÉ propiedad dejó de agendar, para ir por ella */
function vSeguimiento(){
  const META_MIN = 50, META_MAX = 60;
  const activas = new Set(S.wos.filter(w=>w.estado!=="Canceled").map(w=>w.prop));
  const sinMov  = S.propiedades.filter(p=>!activas.has(p.id));
  const conMov  = S.propiedades.filter(p=>activas.has(p.id));
  const pct = Math.min(100, Math.round(activas.size/META_MIN*100));
  return `
  <div class="card" style="margin-top:14px"><div class="chd">
    <h3>Seguimiento comercial — propiedades que están agendando</h3>
    <span class="s">Claudia: «cuando no veo una o dos, digo algo está pasando»</span></div>
    <div class="cp">
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:7px">
        <span class="mono" style="font-size:30px;font-weight:750">${activas.size}</span>
        <span style="color:var(--faint);font-size:12.5px">de ${META_MIN}–${META_MAX} esperadas al mes</span>
        ${activas.size<META_MIN
          ? `<span class="pill w" style="margin-left:auto"><span class="dot"></span>${META_MIN-activas.size} por debajo del mínimo</span>`
          : `<span class="pill v" style="margin-left:auto">en rango</span>`}
      </div>
      <div style="background:var(--surface-3);border-radius:5px;height:10px">
        <div style="background:${activas.size<META_MIN?"var(--ambar)":"var(--verde)"};height:10px;border-radius:5px;width:${pct}%"></div></div>
    </div>
    ${sinMov.length?`<table><thead><tr><th>Propiedad que dejó de agendar</th><th>Cliente</th><th>Zona</th><th>Última Work Order</th><th></th></tr></thead>
      <tbody>${sinMov.map(p=>`<tr>
        <td style="font-weight:650">${esc(p.nombre)}<div style="font-size:10.5px;color:var(--faint)">${esc(p.dir)}</div></td>
        <td>${esc(CLI(p.cliente).nombre)}</td><td>${esc(p.zona)}</td>
        <td style="color:var(--rojo)">sin trabajos registrados</td>
        <td style="text-align:right"><button class="btn sm" data-a="propVer" data-id="${p.id}">Ver ficha</button></td></tr>`).join("")}
      </tbody></table>
      <div class="cp" style="border-top:1px solid var(--line)"><div class="note w" style="margin:0">
        <b>Estas son las que hay que ir a buscar.</b> Claudia: «es cuando tendría que entrar con mi supervisor para darle seguimiento a esa propiedad que no está agendando conmigo».</div></div>`
    :`<div class="empty"><div class="b">✓</div>Todas las propiedades registradas tienen trabajo agendado</div>`}
  </div>
  ${tablaTendencia()}

  <div class="card"><div class="chd"><h3>Detalle por propiedad</h3>
    <span class="s">cuántos trabajos y cuánto ingreso genera cada una</span></div>
    <table><thead><tr><th>Propiedad</th><th>Cliente</th><th class="num">Trabajos</th><th class="num">Ingreso</th>${puedeVerUtilidad()?`<th class="num">Utilidad</th>`:""}</tr></thead>
    <tbody>${conMov.map(p=>{
      const ws=S.wos.filter(w=>w.prop===p.id&&w.estado!=="Canceled");
      const ing=ws.reduce((a,w)=>a+(ingresoWO(w)||0),0);
      const uti=ws.reduce((a,w)=>a+(utilidadWO(w)||0),0);
      return `<tr class="cl${fl("prop:"+p.id)}" data-a="propVer" data-id="${p.id}">
        <td style="font-weight:650">${esc(p.nombre)}</td><td>${esc(CLI(p.cliente).nombre)}</td>
        <td class="num mono">${ws.length}</td><td class="num mono">${money(ing)}</td>
        ${puedeVerUtilidad()?`<td class="num mono" style="color:${uti>=0?"var(--verde)":"var(--rojo)"}">${money(uti)}</td>`:""}</tr>`;
    }).join("")}</tbody></table></div>`;
}

/* ── TRAZABILIDAD ── la cadena completa de una Work Order, de punta a punta ── */

/* ── BUSCAR ── solo Claudia y Erika (ven cobro, pago y utilidad).
   WO por WO con filtros, o agrupado para responder «cuánto pagamos antes por este trabajo». */
function busq(){ if(!S.busq) S.busq={desde:"",hasta:"",prop:"",unidad:"",serv:"",tec:"",estado:"",q:"",agr:""}; return S.busq; }
const BUSQ_AGR = {
  prop:{n:"Propiedad", f:w=>P(w.prop).nombre},
  tec: {n:"Técnico",   f:w=>w.tec?tecN(w.tec):"— sin asignar —"},
  serv:{n:"Servicio",  f:w=>w.serv},
  sem: {n:"Semana",    f:w=>"Semana "+(w.semana||semanaDe(w.fecha))}
};
const BUSQ_MAX = 200;
function busqWOs(b){
  const q=String(b.q||"").trim().toLowerCase();
  return S.wos.filter(w=>{
    if(b.estado ? w.estado!==b.estado : w.estado==="Canceled") return false;   // sin estado elegido: todo menos Canceled
    if(b.desde && !(w.fecha&&w.fecha>=b.desde)) return false;
    if(b.hasta && !(w.fecha&&w.fecha<=b.hasta)) return false;
    if(b.prop && String(w.prop)!==b.prop) return false;
    if(b.unidad && String(w.unidad)!==b.unidad) return false;
    if(b.serv && w.serv!==b.serv) return false;
    if(b.tec && String(w.tec||"")!==b.tec) return false;
    if(q && !`wo-${w.id} ${w.id} ${P(w.prop).nombre} ${U(w.unidad).num} ${w.serv}`.toLowerCase().includes(q)) return false;
    return true;
  }).sort((x,y)=>(y.fecha||"").localeCompare(x.fecha||"")||y.id-x.id);
}
/* Un valor null (WO sin tarifa) se muestra "—" y no suma; así el total no inventa ceros. */
const busqFila = w => ({w, cobro:ingresoWO(w), pago:egresoWO(w), mat:materialWO(w), uti:utilidadWO(w)});
function busqSuma(filas){
  const s=k=>filas.reduce((n,f)=>n+(f[k]||0),0);
  const conPago=filas.filter(f=>f.pago!==null).length;
  return {n:filas.length, cobro:s("cobro"), pago:s("pago"), mat:s("mat"), uti:s("uti"), sinTarifa:filas.filter(f=>f.cobro===null).length,
    promPago:conPago?s("pago")/conPago:null};
}
function busqGrupos(filas, agr){
  const A=BUSQ_AGR[agr], m=new Map();
  filas.forEach(f=>{ const k=A.f(f.w); if(!m.has(k)) m.set(k,[]); m.get(k).push(f); });
  return [...m.entries()].map(([k,fs])=>({k,...busqSuma(fs)}))
    .sort((a,b)=>a.k.localeCompare(b.k,undefined,{numeric:true}));
}
VIEWS.buscar = () => {
  if(!puedeVerUtilidad()) return `<div class="empty">Este módulo es solo para Claudia y Erika.</div>`;
  const b=busq(), filas=busqWOs(b).map(busqFila), T=busqSuma(filas);
  const m$ = v => v===null||v===undefined ? "—" : money(v);
  const col = v => `style="color:${v>=0?"var(--verde)":"var(--rojo)"}"`;
  const unis = b.prop ? S.unidades.filter(u=>String(u.prop)===b.prop) : [];
  const servs = [...new Set(S.wos.map(w=>w.serv).filter(Boolean))].sort();
  const estados = [...new Set(S.wos.map(w=>w.estado).filter(Boolean))].sort();
  const opt = (v,t,sel) => `<option value="${esc(v)}" ${String(sel)===String(v)?"selected":""}>${esc(t)}</option>`;
  const fld = (l,html,w=150) => `<div class="fld" style="margin:0;min-width:${w}px"><label>${l}</label>${html}</div>`;
  const grupos = b.agr && BUSQ_AGR[b.agr] ? busqGrupos(filas,b.agr) : null;
  return `
  <div class="ph"><div><h2>Buscar</h2>
    <p>Encuentra trabajos y mira cuánto se cobró, se pagó y quedó de utilidad.</p></div></div>
  <div class="card"><div class="cp">
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px">
      ${fld("Desde",`<input id="bqDesde" type="date" data-a="busqCambia" value="${esc(b.desde)}">`)}
      ${fld("Hasta",`<input id="bqHasta" type="date" data-a="busqCambia" value="${esc(b.hasta)}">`)}
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn sm" data-a="busqRango" data-r="semana">Esta semana</button>
        <button class="btn sm" data-a="busqRango" data-r="pasada">Semana pasada</button>
        <button class="btn sm" data-a="busqRango" data-r="mes">Mes</button>
        <button class="btn sm" data-a="busqRango" data-r="todo">Todo</button></div>
      ${fld("Buscar",`<input id="bqQ" data-a="busqCambia" value="${esc(b.q)}" placeholder="WO, propiedad, unidad, servicio">`,230)}
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
      ${fld("Propiedad",`<select id="bqProp" data-a="busqCambia"><option value="">Todas</option>${S.propiedades.map(p=>opt(p.id,p.nombre,b.prop)).join("")}</select>`)}
      ${fld("Unidad",`<select id="bqUni" data-a="busqCambia" ${b.prop?"":"disabled"}><option value="">Todas</option>${unis.map(u=>opt(u.id,u.num,b.unidad)).join("")}</select>`,110)}
      ${fld("Servicio",`<select id="bqServ" data-a="busqCambia"><option value="">Todos</option>${servs.map(s=>opt(s,s,b.serv)).join("")}</select>`)}
      ${fld("Técnico",`<select id="bqTec" data-a="busqCambia"><option value="">Todos</option>${S.tecnicos.map(t=>opt(t.id,tecN(t.id),b.tec)).join("")}</select>`)}
      ${fld("Estado",`<select id="bqEst" data-a="busqCambia"><option value="">Todos menos Canceled</option>${estados.map(e=>opt(e,e,b.estado)).join("")}</select>`,170)}
      ${fld("Agrupar",`<select id="bqAgr" data-a="busqCambia"><option value="">Ninguno</option>${Object.entries(BUSQ_AGR).map(([k,v])=>opt(k,v.n,b.agr)).join("")}</select>`,120)}
      <button class="btn" data-a="buscarCSV" ${filas.length?"":"disabled"} style="margin-left:auto">CSV</button>
    </div></div></div>

  ${!filas.length?`<div class="card"><div class="empty">Ningún trabajo con estos filtros.</div></div>`
  : grupos ? `<div class="card" style="overflow-x:auto"><div class="chd"><h3>Por ${esc(BUSQ_AGR[b.agr].n.toLowerCase())}</h3><span class="s">${grupos.length} grupo(s) · ${T.n} WO</span></div>
    <table><thead><tr><th>${esc(BUSQ_AGR[b.agr].n)}</th><th class="num">WO</th><th class="num">Cobro</th><th class="num">Pago</th><th class="num">Material</th><th class="num">Utilidad</th><th class="num">Pago prom.</th></tr></thead>
    <tbody>${grupos.map(g=>`<tr><td style="font-weight:650">${esc(g.k)}</td><td class="num mono">${g.n}</td>
      <td class="num mono">${money(g.cobro)}</td><td class="num mono">${money(g.pago)}</td><td class="num mono">${money(g.mat)}</td>
      <td class="num mono" ${col(g.uti)}>${money(g.uti)}</td><td class="num mono">${m$(g.promPago)}</td></tr>`).join("")}
      <tr style="background:var(--surface-2);font-weight:750"><td>Total</td><td class="num mono">${T.n}</td>
        <td class="num mono">${money(T.cobro)}</td><td class="num mono">${money(T.pago)}</td><td class="num mono">${money(T.mat)}</td>
        <td class="num mono" ${col(T.uti)}>${money(T.uti)}</td><td class="num mono">${m$(T.promPago)}</td></tr></tbody></table></div>`
  : `<div class="card" style="overflow-x:auto"><div class="chd"><h3>Work Orders</h3><span class="s">${T.n} encontrada(s)${T.n>BUSQ_MAX?` · mostrando ${BUSQ_MAX}`:""}</span></div>
    <table><thead><tr><th>WO</th><th>Fecha</th><th>Propiedad</th><th>Unidad</th><th>Servicio</th><th>Técnico</th><th class="num">Cobro</th><th class="num">Pago</th><th class="num">Material</th><th class="num">Utilidad</th></tr></thead>
    <tbody>${filas.slice(0,BUSQ_MAX).map(f=>{const w=f.w; return `<tr class="cl" data-a="woVer" data-id="${w.id}">
      <td class="mono" style="font-weight:700">WO-${w.id}</td><td class="mono">${esc(w.fecha||"—")}</td>
      <td>${esc(P(w.prop).nombre)}</td><td>${esc(U(w.unidad).num)}</td><td>${esc(w.serv)}</td>
      <td>${w.tec?esc(tecN(w.tec)):"—"}</td>
      <td class="num mono">${m$(f.cobro)}</td><td class="num mono">${m$(f.pago)}</td><td class="num mono">${money(f.mat)}</td>
      <td class="num mono" ${f.uti===null?"":col(f.uti)}>${m$(f.uti)}</td></tr>`;}).join("")}
      <tr style="background:var(--surface-2);font-weight:750"><td colspan="6">Total · ${T.n} WO</td>
        <td class="num mono">${money(T.cobro)}</td><td class="num mono">${money(T.pago)}</td><td class="num mono">${money(T.mat)}</td>
        <td class="num mono" ${col(T.uti)}>${money(T.uti)}</td></tr></tbody></table>
    ${T.n>BUSQ_MAX?`<div class="cp" style="border-top:1px solid var(--line);color:var(--faint);font-size:11.5px">Se muestran las ${BUSQ_MAX} más recientes; el total cuenta las ${T.n}. El CSV trae todas.</div>`:""}</div>`}
  ${filas.length&&T.sinTarifa?`<div class="tr">${T.sinTarifa} WO sin tarifa: aparecen con «—» y no suman al cobro ni a la utilidad.</div>`:""}`;
};

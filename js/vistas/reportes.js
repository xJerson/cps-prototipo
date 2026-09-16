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

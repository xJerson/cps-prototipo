"use strict";
/* Finanzas no cambia nómina ni facturas: es un libro de consulta y registro
   de salidas. Cada gasto compartido conserva sus asignaciones para que la
   utilidad de una WO no esconda gasolina u hospedaje. */
function asignadoGastoWO(wid){
  return (S.gastosCompartidos||[]).reduce((n,g)=>n+(g.asignaciones||[]).filter(a=>+a.wo===+wid).reduce((x,a)=>x+(+a.monto||0),0),0);
}
function utilidadNetaWO(w){ return (ingresoWO(w)||0)-(egresoWO(w)||0)-materialWO(w)-asignadoGastoWO(w.id); }
function gastoRows(){
  return (S.gastosCompartidos||[]).slice().reverse().map(g=>`<tr><td class="mono">${esc(g.fecha)}</td><td>${esc(g.tipo)}</td><td><b>${esc(g.concepto)}</b>${g.notas?`<div class="s">${esc(g.notas)}</div>`:""}</td><td>${esc(g.vehiculo||"—")}</td><td>${g.foto?miniRecibo(g.foto):g.evidencia?'<span class="pill v">✓ evidencia</span>':'<span class="pill w">sin evidencia</span>'}</td><td>${(g.asignaciones||[]).length?(g.asignaciones||[]).map(a=>`WO-${a.wo} · ${money(a.monto)}`).join("<br>"):'<span class="pill g">General</span>'}</td><td class="num mono">${money(g.monto)}</td></tr>`).join("");
}
function salidaFinanzas(){
  const gastos=(S.gastosCompartidos||[]).map(g=>({fecha:g.fecha,tipo:g.tipo,concepto:g.concepto,monto:g.monto,origen:g.fijo?"Gasto fijo":"Gasto"}));
  const materiales=(S.movs||[]).filter(m=>m.tipo==="entrada"&&m.costo>0).map(m=>({fecha:m.fecha,tipo:"Inventory",concepto:(by(S.productos,m.prod)||{}).nombre||m.prod,monto:m.costo,origen:"Inventario"}));
  const nomina=(S.nomina||[]).map(n=>({fecha:n.fecha,tipo:"Technician payment",concepto:n.tec?tecN(n.tec):"Nómina",monto:n.total,origen:"Nómina"}));
  return [...gastos,...materiales,...nomina].sort((a,b)=>b.fecha.localeCompare(a.fecha));
}
VIEWS.finanzas=()=>{
  const out=salidaFinanzas(), total=out.reduce((n,x)=>n+(+x.monto||0),0);
  const ro=soloLectura();   // contabilidad: ve y descarga, no captura
  return `<div class="ph"><div><h2>Finanzas</h2><p>${ro?"Vista de solo lectura para contabilidad.":"Salidas de dinero, gastos compartidos y utilidad real por Work Order."}</p></div>
    <div class="act">${ro?"":`<button class="btn" data-a="gastoFijoModal">Gasto fijo</button><button class="btn" data-a="gastoCompartidoModal">+ Gasto compartido</button><button class="btn p" data-a="vehiculoGastoModal">Gasto de vehículo</button>`}<button class="btn" data-a="finanzasExportar">Descargar salidas</button></div></div>
  <div class="note" style="margin-bottom:14px"><b>Regla:</b> utilidad = facturado − pago técnico − materiales − gastos compartidos asignados. Los gastos generales no se reparten hasta que se asignen a una WO.</div>
  <div class="kpis"><div class="kpi"><div class="l">Salidas registradas</div><div class="v mono">${money(total)}</div></div><div class="kpi"><div class="l">Gastos compartidos</div><div class="v">${(S.gastosCompartidos||[]).length}</div></div><div class="kpi"><div class="l">Con evidencia</div><div class="v">${(S.gastosCompartidos||[]).filter(g=>g.evidencia).length}</div></div></div>
  <div class="card"><div class="chd"><h3>Gastos compartidos</h3><span class="s">se asignan manualmente a una o varias WO</span></div><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Vehículo</th><th>Evidencia</th><th>Distribución</th><th class="num">Monto</th></tr></thead><tbody>${gastoRows()||'<tr><td colspan="7">Sin gastos registrados.</td></tr>'}</tbody></table></div>
  <div class="card"><div class="chd"><h3>Utilidad por Work Order</h3><span class="s">incluye el prorrateo de gastos</span></div><table><thead><tr><th>WO</th><th>Propiedad / unidad</th><th class="num">Facturado</th><th class="num">Técnico</th><th class="num">Material</th><th class="num">Compartido</th><th class="num">Utilidad</th></tr></thead><tbody>${S.wos.filter(w=>w.estado==="Completed").map(w=>`<tr><td class="mono">WO-${w.id}</td><td>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)}</td><td class="num mono">${money(ingresoWO(w)||0)}</td><td class="num mono">${money(egresoWO(w)||0)}</td><td class="num mono">${money(materialWO(w))}</td><td class="num mono">${money(asignadoGastoWO(w.id))}</td><td class="num mono" style="font-weight:700">${money(utilidadNetaWO(w))}</td></tr>`).join("")}</tbody></table></div>
  <div class="card"><div class="chd"><h3>Libro de salidas</h3><span class="s">incluye gastos, compras de inventario y nómina</span></div><table><thead><tr><th>Fecha</th><th>Origen</th><th>Tipo</th><th>Concepto</th><th class="num">Monto</th></tr></thead><tbody>${out.map(x=>`<tr><td class="mono">${esc(x.fecha)}</td><td>${esc(x.origen)}</td><td>${esc(x.tipo)}</td><td>${esc(x.concepto)}</td><td class="num mono">${money(x.monto)}</td></tr>`).join("")}</tbody></table></div>`;
};

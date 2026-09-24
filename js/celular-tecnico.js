"use strict";
function renderCelSel(){
  const e = $("#celsel"); if(!e) return;
  /* En modo técnico, un desplegable para elegir DE QUÉ técnico se ve el
     celular — si no, la demo se queda pegada en el primero y no se pueden
     completar los pendientes de los demás. */
  const picker = S.phRol==="tecnico"
    ? `<select id="phTecSel" data-a="phTecPick" title="¿De qué técnico ves el celular?">${
        S.tecnicos.filter(t=>t.activo!==false && !t.esp.includes("Supervisor"))
          .map(t=>`<option value="${t.id}" ${t.id===S.phTec?"selected":""}>${esc(tecN(t.id))}</option>`).join("")
      }</select>` : "";
  e.innerHTML = picker + [["tecnico","Técnico"],["supervisor","Supervisor"]].map(([k,n])=>
    `<button class="${S.phRol===k?"on":""}" data-a="${k==="tecnico"?"verTecnicoCel":"verGustavoCel"}">${n}</button>`).join("");
}

function renderFon(){
  renderCelSel();
  if(S.phRol==="supervisor") return renderFonSup();
  const t = T(S.phTec) || S.tecnicos[0];
  $("#favi").textContent = t.nombre[0]+t.apellido[0];
  /* El nombre y la zona ya los dice el desplegable de la cabecera; acá se
     dejan cortos para que el desplegable + el toggle Técnico/Supervisor
     entren sin apretar. */
  $("#fanm").textContent = "Celular";
  $("#fasu").textContent = t.zona;
  /* Claudia: "el técnico no debe ver [la WO] si no está confirmada porque es
     posible que no quieran ir" — antes aparecía igual, con solo un aviso de
     que la fecha podía moverse. Ahora una WO en Scheduled sin confirmCliente
     directamente no entra en su agenda; en cuanto se confirma (pasa a
     Confirmed) aparece sola, sin que nadie tenga que avisarle. */
  const mias = S.wos.filter(w=>w.tec===t.id && !w.cobrada && w.estado!=="Canceled"
    && !(w.estado==="Scheduled" && !w.confirmCliente));
  const subMias = subWOsDeTec(t.id).filter(a=>{
    const w=W(a.wo); return w && !w.cobrada;
  });
  /* Claudia: el técnico ve el desglose de SU pago, pero nunca lo que se le
     factura al cliente ni el costo de materiales. */
  $("#fnav").innerHTML = [
    {v:"agenda",n:"Agenda",ic:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'},
    {v:"pago",n:"Mi pago",ic:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>'},
    {v:"avisos",n:"Avisos",ic:'<path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>'}
  ].map(b=>`<button class="${S.phView===b.v||(b.v==="agenda"&&["wo","subwo"].includes(S.phView))?"on":""}" data-a="fView" data-v="${b.v}">
    ${b.v==="avisos"&&notiSinLeer()?`<span style="position:absolute;top:1px;right:6px;min-width:14px;height:14px;padding:0 3px;background:#ff5a5f;color:#fff;border-radius:99px;font-size:8.5px;font-weight:800;display:flex;align-items:center;justify-content:center">${notiSinLeer()}</span>`:""}
    <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${b.ic}</svg>${b.n}</button>`).join("");

  let h="";
  if(S.phView==="avisos"){
    h=`<div class="dl" style="margin-top:5px">Avisos</div>`+(S.notis.length?S.notis.map(n=>`
      <div class="dc" style="display:flex;gap:9px;${n.leido?"":"border-color:var(--azul)"}"><div style="width:26px;height:26px;border-radius:7px;background:var(--azul);color:#fff;font-weight:800;font-size:9px;display:flex;align-items:center;justify-content:center;flex:none">CPS</div>
      <div style="min-width:0"><div style="display:flex;justify-content:space-between;font-size:9px;color:var(--faint)"><span>Cordova Ops</span><span>${n.h}</span></div>
      <div style="font-size:12px;font-weight:750">${esc(n.t)}</div><div class="ds">${esc(n.b)}</div></div></div>`).join("")
      :`<div style="text-align:center;padding:40px 14px;color:var(--faint);font-size:11.5px">Sin avisos</div>`);
  }
  else if(S.phView==="pago"){
    const sem=S.semana;
    const ws=S.wos.filter(w=>w.tec===t.id && w.semana===sem && w.estado==="Completed");
    const extra=extrasAprobadosDeWOs(S.wos.filter(w=>w.semana===sem)).filter(x=>tecExtra(x)===t.id);
    const desc=descDe(t.id,sem);
    const base=ws.reduce((a,w)=>a+(egresoWO(w)||0),0);
    const totExtra=extra.reduce((a,x)=>a+(x.monto||0),0);
    const totDesc=desc.reduce((a,x)=>a+x.monto,0);
    const total=base+totExtra-totDesc;
    const fila=(izq,sub,der,col)=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-top:1px solid var(--line)">
      <div style="min-width:0"><div style="font-size:12px;font-weight:650">${izq}</div>${sub?`<div class="ds">${sub}</div>`:""}</div>
      <div class="mono" style="font-size:12.5px;font-weight:700;flex:none;${col?`color:${col}`:""}">${der}</div></div>`;
    h=`<div class="dl" style="margin-top:5px">Mi pago · semana ${sem}</div>
      <div class="dc" style="background:var(--azul);border-color:transparent;color:#fff">
        <div style="font-size:10.5px;opacity:.85">Total a recibir esta semana</div>
        <div class="mono" style="font-size:24px;font-weight:800">${money(total)}</div>
        <div style="font-size:10.5px;opacity:.85">${ws.length} trabajo(s) terminado(s)</div></div>
      <div class="dc"><div class="dl" style="margin:0 0 2px">Trabajos</div>
        ${ws.map(w=>fila(`${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)}`,
            `${esc(w.fecha.slice(5))} · ${esc(w.serv)}${w.touchup&&egresoWO(w)===0?" · corrección, no se paga":""}${w.pagadaTec?" · ya pagado":""}`,
            egresoWO(w)!==null?money(egresoWO(w)):"Por definir", egresoWO(w)===null?"var(--ambar)":"")).join("")
          ||`<div class="ds" style="padding:8px 0">Todavía no tienes trabajos terminados esta semana.</div>`}</div>
      ${extra.length?`<div class="dc"><div class="dl" style="margin:0 0 2px">Pagos adicionales aprobados</div>
        ${extra.map(x=>fila(`Adicional · WO-${x.wo}`,esc((x.motivo||"").slice(0,60)),"+"+money(x.monto),"var(--verde)")).join("")}</div>`:""}
      ${desc.length?`<div class="dc"><div class="dl" style="margin:0 0 2px">Descuentos</div>
        ${desc.map(x=>fila(esc(x.motivo||x.concepto||"Descuento"),x.wo?`WO-${x.wo}`:"","−"+money(x.monto),"var(--rojo)")).join("")}</div>`:""}
      ${ws.some(w=>egresoWO(w)===null)?`<div class="ds" style="text-align:center;margin-top:4px">"Por definir": oficina todavía no carga el pago de ese trabajo.</div>`:""}`;
  }
  else if(S.phView==="subwo" && S.phSub){
    const a=S.adicionales.find(x=>x.id===S.phSub), w=a&&W(a.wo);
    if(!a||!w){ S.phView="agenda"; S.phSub=null; return renderFon(); }
    const p=P(w.prop), u=U(w.unidad), estado=a.estadoTrabajo||"Assigned";
    const col={Unassigned:"#8a97a4",Assigned:"#1f4e79","In progress":"#8a5a00",Completed:"#1e5c3a",Canceled:"#9b2226"}[estado]||"#8a97a4";
    const specs=Object.entries(a.specs||{}).filter(([,v])=>v).map(([k,v])=>`<div class="ds"><b>${esc(k)}:</b> ${esc(v)}</div>`).join("");
    h=`<button class="db g" style="margin:5px 0 9px;padding:7px;font-size:11.5px" data-a="fView" data-v="agenda">‹ Mi agenda</button>
      <div class="dc"><div style="display:flex;justify-content:space-between;gap:7px">
        <div><div style="font-size:9px;font-weight:800;letter-spacing:.06em;color:var(--azul)">SUB-WO · WO-${w.id}</div>
        <div class="dh">${esc(a.concepto)}</div><div class="ds">${esc(p.nombre)} · Unidad ${esc(u.num)}</div></div>
        <span class="dtag" style="background:${col}22;color:${col};height:fit-content">${esc(estado)}</span></div>
        <div style="margin-top:9px;padding-top:9px;border-top:1px solid var(--line)">
          <div class="ds"><b>Fecha:</b> ${esc(fechaSubWO(a)||"Sin fecha")}</div>
          <div class="ds"><b>Dirección:</b> ${esc(p.dir)}</div>
          ${a.ubic?`<div class="ds"><b>Location:</b> ${esc(a.ubic)}</div>`:""}
          <div class="ds"><b>Cantidad:</b> ${a.cant||1}</div>${specs}
          ${a.desc?`<div class="ds" style="margin-top:5px"><b>Notas:</b> ${esc(a.desc)}</div>`:""}
        </div></div>
      ${(a.fotosRefArr||[]).length?`<div class="dc"><div class="dl" style="margin:0 0 6px">Fotos de referencia</div><div style="display:flex;gap:5px;flex-wrap:wrap">${a.fotosRefArr.map(f=>`<img src="${f.url}" style="width:60px;height:45px;object-fit:cover;border-radius:7px">`).join("")}</div></div>`:""}
      ${a.hallazgoFoto?`<div class="dc"><div class="dl" style="margin:0 0 6px">Initial finding</div><img src="${a.hallazgoFoto.url}" style="width:100px;height:72px;object-fit:cover;border-radius:7px"></div>`:""}
      <div class="dc"><div class="dl" style="margin:0 0 6px">Evidencia (${(a.fotosEvidArr||[]).length})</div>
        ${(a.fotosEvidArr||[]).length?`<div style="display:flex;gap:5px;flex-wrap:wrap">${a.fotosEvidArr.map(f=>`<img src="${f.url}" style="width:60px;height:45px;object-fit:cover;border-radius:7px">`).join("")}</div>`:`<div class="ds">Todavía no hay evidencia.</div>`}
      </div>
      ${estado==="Assigned"?`<button class="db p" data-a="fSubIniciar" data-id="${a.id}">Empezar Sub-WO</button>`:""}
      ${["Assigned","In progress"].includes(estado)?`<button class="db g" data-a="fSubFoto" data-id="${a.id}">📷 Agregar evidencia</button>`:""}
      ${["Assigned","In progress"].includes(estado)&&!a.hallazgoFoto?`<button class="db g" data-a="fSubHallazgo" data-id="${a.id}">📷 Registrar initial finding</button>`:""}
      ${estado==="In progress"?`<button class="db v" data-a="fSubTerminar" data-id="${a.id}">✓ Terminar Sub-WO</button>`:""}
      ${estado==="Completed"?`<div class="dc" style="text-align:center;background:var(--verde-cl);border-color:transparent"><div class="dh" style="color:var(--verde)">✓ Sub-WO terminada${a.parcial?" parcialmente":""}</div><div class="ds">${a.parcial?`${a.cantRealizada||0}/${a.cant||1} realizada(s); ${a.cantPendiente||0} pendiente(s) para reasignar.`:"Oficina ya recibió la evidencia."}</div></div>`:""}`;
  }
  else if(S.phView==="wo" && S.phWO){
    const w=W(S.phWO), p=P(w.prop), u=U(w.unidad);
    const ocupacion = u.ocupacion||"Occupied";
    const ads=S.adicionales.filter(a=>a.wo===w.id), sols=solsDe(w.id);
    const col={g:"#8a97a4",a:"#1f4e79",m:"#5b21b6",w:"#8a5a00",v:"#1e5c3a",r:"#9b2226"}[estP(w.estado)];
    const dato = (et,v) => v ? `<div class="ds" style="margin-bottom:3px"><b>${et}:</b> ${esc(v)}</div>` : "";
    /* Antes mostraba "9:00" fijo aunque nadie la haya definido — Claudia:
       "la hora no aparezca a menos de que sí se agende una hora". dato() ya
       omite la fila entera si el valor viene vacío, así que pasarle
       w.horaProg sin el `||"9:00"` de antes alcanza.
       PENDIENTE para el desarrollo real (no aplica a este prototipo, que no
       tiene backend ni push): en cuanto w.horaProg quede definido, ese es el
       momento de programarle al técnico un recordatorio/notificación para
       ese día a esa hora, con las notas de la WO (w.notasTec). */
    h=`<button class="db g" style="margin:5px 0 9px;padding:7px;font-size:11.5px" data-a="fView" data-v="agenda">‹ Mi agenda</button>
    <div class="dc"><div style="display:flex;justify-content:space-between;gap:7px">
      <div style="min-width:0"><div class="dh">${esc(p.nombre)}</div><div class="ds">Unidad ${esc(u.num)} · ${esc(u.rooms)} · ${u.pisos} piso(s)</div></div>
      <span class="dtag" style="background:${col}22;color:${col};flex:none">${esc(w.estado)}</span></div>
      ${fechaSinConfirmar(w)?`<div class="ds" style="margin-top:6px;color:var(--ambar)">⏳ El cliente todavía no confirmó esta fecha — puede moverse.</div>`:""}
      <div style="margin-top:9px;padding-top:9px;border-top:1px solid var(--line)">
        ${dato("Servicio", w.serv)}
        ${w.ubic?dato("Dónde", w.ubic):""}
        ${dato("Dirección", p.dir)}
        ${dato("Hora", w.horaProg)}
        ${dato("Occupancy", ocupacion)}
      </div></div>

    ${ocupacion==="Occupied"?`<div class="dc" style="background:var(--ambar-cl);border-color:var(--ambar)">
      <div class="dh" style="color:var(--ambar)">Unidad ocupada</div>
      <div class="ds" style="margin-top:4px"><b>Toca antes de entrar.</b> No ingreses solo: espera autorización o que alguien te acompañe.</div>
    </div>`:`<div class="dc" style="background:var(--verde-cl);border-color:transparent">
      <div class="ds" style="color:var(--verde)"><b>Unidad desocupada.</b> Sigue las instrucciones de acceso de la propiedad.</div>
    </div>`}

    <!--ACCIONES-->

    <div class="dc" style="background:var(--azul-cl);border-color:transparent">
      <div class="dl" style="margin:0 0 6px;color:var(--azul)">Todo lo que necesitas al llegar</div>
      ${dato("Código de puerta", p.door)}
      ${dato("Dónde está el shop", p.shop)}
      ${dato("Código del shop", p.shopCode)}
      ${dato("Horario", p.horario)}
      ${dato("Al terminar", p.finalExp)}
      ${dato("Ojo", p.notasTec)}
      ${dato("Regla de la propiedad", p.notas)}
      ${w.notasTec?dato("Nota de esta orden", w.notasTec):""}
    </div>

    ${(w.fotosPrevias||[]).length || ["Repair","Cabinet","Resurface"].includes(w.cat)?`<div class="dc">
      <div class="dl" style="margin:0 0 6px">Fotos para prepararte antes de ir</div>
      ${(w.fotosPrevias||[]).length?`<div style="display:flex;gap:5px;flex-wrap:wrap">${w.fotosPrevias.map(f=>
          `<img src="${f.url}" style="width:60px;height:45px;object-fit:cover;border-radius:7px">`).join("")}</div>`
        :`<div class="ds">Todavía no hay fotos de referencia.</div>`}
      <button type="button" class="db g" style="margin-top:7px" data-a="fotoVer" data-tipo="woPrevia" data-id="${w.id}">📷 ${(w.fotosPrevias||[]).length?"Ver / agregar":"Agregar foto"}</button>
      <div class="ds" style="margin-top:2px">Lo que hay que hacer, en foto — no en texto.</div></div>`:""}
    ${sols.map(s=>{
      const e=solEstado(s), cl={Pendiente:"#8a5a00",Aprobado:"#1e5c3a",Rechazado:"#9b2226",Parcial:"#8a5a00"}[e];
      const oks=s.lineas.filter(l=>l.estado==="Aprobado"), nos=s.lineas.filter(l=>l.estado==="Rechazado");
      return `<div class="dc" style="border-color:${cl}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <div style="font-size:10px;font-weight:750;text-transform:uppercase;color:var(--faint)">Sub-Work Order · ${s.lineas.length} concepto(s)</div>
        <span class="dtag" style="background:${cl}22;color:${cl}">${e==="Pendiente"?"esperando":e.toLowerCase()}</span></div>
      <div class="ds">${esc(s.desc)}</div>
      ${s.lineas.map(l=>`<div style="display:flex;justify-content:space-between;gap:7px;font-size:11.5px;padding:3px 0">
        <span>${l.estado==="Aprobado"?"✓":l.estado==="Rechazado"?"✗":"○"} ${esc(l.concepto)}${(l.cant||1)>1?` ×${l.cant}`:""}</span>
        <span style="color:var(--faint)">${l.estado==="Pendiente"?"esperando":l.estado.toLowerCase()}</span></div>`).join("")}
      ${(s.lineas.some(l=>l.hallazgoFoto))?`<div class="dph s" style="margin-top:7px">📷 ${s.lineas.filter(l=>l.hallazgoFoto).length} foto(s) de hallazgo reportadas</div>`:""}
      ${(s.lineas.some(l=>l.fotosRefArr&&l.fotosRefArr.length))?`<div class="dph s" style="margin-top:4px">📷 ${s.lineas.reduce((t,l)=>t+((l.fotosRefArr||[]).length),0)} foto(s) de referencia — mirá antes de empezar</div>`:""}
      ${(s.lineas.some(l=>l.fotosEvidArr&&l.fotosEvidArr.length))?`<div class="dph s" style="margin-top:4px">📷 ${s.lineas.reduce((t,l)=>t+((l.fotosEvidArr||[]).length),0)} foto(s) de evidencia</div>`:""}
      ${e==="Aprobado"?`<div class="ds" style="margin-top:5px;color:var(--verde)"><b>✓ Autorizado</b> — ya puedes hacerlo</div>`:""}
      ${e==="Rechazado"?`<div class="ds" style="margin-top:5px;color:var(--rojo)"><b>No autorizado</b> — no lo ejecutes</div>`:""}
      ${e==="Parcial"?`<div class="ds" style="margin-top:5px;color:var(--ambar)"><b>Haz solo ${esc(oks.map(l=>l.concepto).join(", "))}.</b> ${esc(nos.map(l=>l.concepto).join(", "))} no te lo autorizaron.</div>`:""}</div>`;
    }).join("")}
    ${(w.antesFotos||[]).length?`<div class="dc"><div class="dl" style="margin:0 0 6px">Antes</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">${w.antesFotos.map(f=>
          `<img src="${f.url}" style="width:100px;height:72px;object-fit:cover;border-radius:7px">`).join("")}</div></div>`:""}
    ${w.evid?`<div class="dc"><div class="dl" style="margin:0 0 6px">Evidencia del trabajo (${w.evid})</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">${fotosConRelleno(w.evidFotos,w.evid).map(f=>f.url
          ?`<img src="${f.url}" style="width:60px;height:45px;object-fit:cover;border-radius:7px">`
          :`<div class="dph s" style="width:60px;flex:none;margin:0">📷</div>`).join("")}</div></div>`
      :(w.estado!=="Scheduled"?`<div class="dc" style="border-style:dashed"><div class="ds" style="text-align:center">Todavía sin evidencia del trabajo${ads.some(a=>a.hallazgoFoto||(a.fotosRefArr&&a.fotosRefArr.length)||(a.fotosEvidArr&&a.fotosEvidArr.length))?"<br><span style='font-size:10px'>(la foto de la Sub-Work Order no cuenta para cerrar)</span>":(w.antesFotos||[]).length?"<br><span style='font-size:10px'>(las fotos del antes no cuentan para cerrar)</span>":""}</div></div>`:"")}`;

    /* Los 4 botones de "mientras trabajas" se veían todos iguales — mismo
       gris, solo texto, sin ícono — y había que leer cada uno para saber
       cuál tocar. Ícono + agrupado bajo un rótulo + una línea corta debajo
       de los dos que no se explican solos (Materiales, Necesito aprobación)
       arregla eso sin sacar ni un botón: sigue siendo exactamente el mismo
       set de acciones, solo más fácil de escanear de un vistazo. */
    const IC_FOTO = '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>';
    const IC_CAJA = '<path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>';
    const IC_ALERTA = '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>';
    const IC_CHECK = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>';
    const IC_TICKET = '<path d="M4 3v18l2.5-1.5L9 21l2.5-1.5L14 21l2.5-1.5L19 21V3l-2.5 1.5L14 3l-2.5 1.5L9 3 6.5 4.5Z"/><path d="M8 8h8M8 12h8M8 16h5"/>';
    const icBtn = (ic,extra="") => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"${extra}>${ic}</svg>`;
    /* Reunión 2026-09-09: se sacó "Pausar" — al técnico no se le paga por
       hora, se le paga por trabajo, así que pausar no correspondía a nada
       real ("ese botón no va"). Si de verdad no puede seguir (falta material,
       no hay acceso...), eso lo registra oficina con "Detener" desde
       Work Orders — un mecanismo distinto, que ya existía antes de este
       flujograma y sí viene del Excel original del cliente. */
    const acciones =
      (esAgendada(w.estado) && w.tec
        ? `<button class="db p" data-a="fLlegue" data-id="${w.id}">
             ${icBtn('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>')}
             Ya llegué</button>` : "")
    /* Sección 6 del feedback: «el técnico debería corroborar antes de
       iniciar el trabajo: Unit number, Bedrooms, Bathrooms, Floors,
       Occupancy status — esto ayudaría a evitar errores desde el inicio».
       Se frena "Mientras trabajas" hasta que confirme, una sola vez por WO. */
    + (["In progress","Esperando aprobación"].includes(w.estado) && !w.corroborado
        ? `<div class="dc" style="border-color:var(--ambar)">
             <div class="dl" style="margin:0 0 6px;color:var(--ambar)">Antes de empezar, corrobora la unidad</div>
             ${dato("Unidad", u.num)}
             ${dato("Bedrooms", u.bedrooms!=null?String(u.bedrooms):(u.rooms==="Studio"?"Studio":"—"))}
             ${dato("Bathrooms", u.bathrooms!=null?String(u.bathrooms):"—")}
             ${dato("Floors", u.pisos!=null?String(u.pisos):"No aplica")}
             ${dato("Occupancy", ocupacion)}
             <div class="ds" style="margin:6px 0 8px">¿Coincide con lo que ves en la propiedad?</div>
             <button class="db v" data-a="woCorrobora" data-id="${w.id}">${icBtn(IC_CHECK)}Sí, coincide — empezar</button>
             <button class="db g" data-a="woCorroboraNo" data-id="${w.id}">${icBtn(IC_ALERTA)}No coincide — avisar a oficina</button>
           </div>` : "")
    + (["In progress","Esperando aprobación"].includes(w.estado) && w.corroborado
        ? `<div class="dl" style="margin-top:10px">Mientras trabajas</div>
           <button class="db g" data-a="fFotoAntes" data-id="${w.id}">${icBtn(IC_FOTO)}Foto del antes</button>
           <div class="ds" style="margin:-4px 0 7px;padding:0 2px">Cómo encontraste la unidad — no cuenta para cerrar el trabajo.</div>
           <button class="db g" data-a="fFoto" data-id="${w.id}">${icBtn(IC_FOTO)}Foto de cómo quedó</button>
           <button class="db g" data-a="fMaterial" data-id="${w.id}">${icBtn(IC_CAJA)}Materiales${(S.movs.some(m=>m.wo===w.id&&m.tipo==="salida")?` · registrado`:"")}</button>
           <div class="ds" style="margin:-4px 0 7px;padding:0 2px">Lo que usaste en este trabajo — queda registrado en la orden.</div>
           <button class="db g" data-a="fCompraMaterial" data-id="${w.id}">${icBtn(IC_TICKET)}Compra de materiales</button>
           <div class="ds" style="margin:-4px 0 7px;padding:0 2px">¿Vas a Home Depot/Lowe's con la tarjeta de la empresa? Acá tenés el teléfono para el cajero y subís la foto del ticket.</div>
           <button class="db g" data-a="fAdic" data-id="${w.id}">${icBtn(IC_ALERTA)}Necesito aprobación</button>
           <div class="ds" style="margin:-4px 0 7px;padding:0 2px">Algo que encontraste y no estaba en la orden — le llega a oficina al instante.</div>
           <div class="fld" style="margin:4px 0 9px">
             <label style="font-size:10.5px;font-weight:750;text-transform:uppercase;letter-spacing:.04em;color:var(--faint)">Qué hiciste</label>
             <textarea data-a="fNotaTrabajo" data-id="${w.id}" placeholder="El tipo de reparación y qué usaste — le sirve a Erika para facturar">${esc(w.notas||"")}</textarea>
             <div class="ds" style="margin-top:2px">Opcional, pero sin esto Erika solo tiene el nombre del servicio, no qué se hizo de verdad.</div></div>
           <div class="dl">Cuando termines</div>
           <button class="db v" data-a="fTermine" data-id="${w.id}">${icBtn(IC_CHECK)}Terminé</button>` : "")
    // Sin llegada marcada, todo lo demás queda apagado: la información sí se ve, las acciones no
    + (esAgendada(w.estado) && w.tec && !asisDe(w.id)
        ? `<button class="db g" disabled>${icBtn(IC_FOTO)}Foto del antes</button>
           <button class="db g" disabled>${icBtn(IC_FOTO)}Foto de cómo quedó</button>
           <button class="db g" disabled>${icBtn(IC_ALERTA)}Necesito aprobación</button>
           <button class="db v" disabled>${icBtn(IC_CHECK)}Terminé</button>
           <div class="ds" style="text-align:center;margin-top:2px">Marca tu llegada para poder cerrar el trabajo</div>` : "")
    /* Oficina le pidió lo que faltaba. No se le reabre el trabajo: solo
       aparece lo que falta, y al enviarlo le avisa a quien se lo pidió. */
    + (w.infoPedida
        ? `<div class="dc" style="background:var(--ambar-cl);border-color:var(--ambar)">
             <div class="dh" style="color:var(--ambar)">Te falta completar esto</div>
             <div class="ds" style="margin-top:3px">${esc(w.infoPedida.quien)} lo pidió el ${w.infoPedida.fecha} a las ${esc(w.infoPedida.hora)}.
               Sin esto el trabajo <b>no entra a tu pago</b>.</div>
             ${w.infoPedida.falta.includes("evidencia")?`<div class="ds" style="margin-top:7px">
               <b>Fotos del trabajo:</b> ${w.evid?`${w.evid} cargada(s) ✓`:'<span style="color:var(--rojo)">ninguna</span>'}</div>
               <button class="db g" style="margin-top:5px" data-a="fFoto" data-id="${w.id}">Agregar foto</button>`:""}
             ${w.infoPedida.falta.includes("tarifa")?`<div class="ds" style="margin-top:7px;color:var(--faint)">
               La <b>tarifa</b> la resuelve oficina, no tú.</div>`:""}
             <button class="db p" style="margin-top:9px" data-a="fCompletaInfo" data-id="${w.id}">Ya está, enviar</button>
           </div>` : "")
    + (w.estado==="Completed" && !w.infoPedida
        ? `<div class="dc" style="text-align:center;background:var(--verde-cl);border-color:transparent">
             <div style="font-size:24px">✓</div><div class="dh" style="color:var(--verde)">Trabajo cerrado</div>
             <div class="ds">Oficina ya lo tiene.</div></div>` : "")
    + (asisDe(w.id)
        ? `<div class="dc" style="background:var(--verde-cl);border-color:transparent;margin-top:2px">
             <div class="ds" style="color:var(--verde)"><b>Llegaste ${asisDe(w.id).horaReal}</b> · ${esc(asisDe(w.id).puntualidad)}</div></div>` : "");

    h = h.replace("<!--ACCIONES-->", acciones);
  }
  else {
    h=`<div class="dl" style="margin-top:5px">Mi agenda</div>`+((mias.length||subMias.length)?mias.map(w=>{
      const col={g:"#8a97a4",a:"#1f4e79",m:"#5b21b6",w:"#8a5a00",v:"#1e5c3a",r:"#9b2226"}[estP(w.estado)];
      const a=asisDe(w.id);
      return `<div class="dc" data-a="fAbrir" data-id="${w.id}" style="cursor:pointer;${
        w.infoPedida?"border-color:var(--ambar);box-shadow:0 0 0 2px var(--ambar-cl)"
        :w.nueva?"border-color:var(--azul);box-shadow:0 0 0 2px var(--azul-cl)":""}">
        <div style="display:flex;justify-content:space-between;gap:7px">
          <div style="min-width:0">
            ${w.infoPedida?`<div style="font-size:9px;font-weight:800;letter-spacing:.06em;color:var(--ambar);margin-bottom:2px">TE FALTA ${esc(w.infoPedida.falta.join(" Y ").toUpperCase())}</div>`
             :w.nueva?`<div style="font-size:9px;font-weight:800;letter-spacing:.06em;color:var(--azul);margin-bottom:2px">NUEVO</div>`:""}
            <div class="dh">${esc(P(w.prop).nombre)}</div>
            <div class="ds">${esc(U(w.unidad).num)} · ${esc(w.serv)}</div>
            <div class="ds" style="font-size:10px">${w.fecha}${w.horaProg?` · ${esc(w.horaProg)}`:""}</div></div>
          <span class="dtag" style="background:${col}22;color:${col};flex:none;height:fit-content">${esc(w.estado)}</span></div>
        ${a?`<div class="ds" style="margin-top:5px;color:var(--verde)">Llegaste ${a.horaReal} · ${esc(a.puntualidad)}</div>`:""}
        ${(w.fotosPrevias||[]).length?`<div class="ds" style="margin-top:5px;color:var(--azul);font-weight:700">📷 ${(w.fotosPrevias||[]).length} foto(s) para prepararte antes de ir</div>`:""}
        <div class="ds" style="margin-top:6px;color:var(--azul);font-weight:650">Abrir ›</div></div>`;
    }).join("")+subMias.map(a=>{
      const w=W(a.wo), p=P(w.prop), u=U(w.unidad), estado=a.estadoTrabajo||"Assigned";
      const col={Unassigned:"#8a97a4",Assigned:"#1f4e79","In progress":"#8a5a00",Completed:"#1e5c3a"}[estado]||"#8a97a4";
      return `<div class="dc" data-a="fSubAbrir" data-id="${a.id}" style="cursor:pointer;border-left:4px solid var(--azul)">
        <div style="display:flex;justify-content:space-between;gap:7px"><div style="min-width:0">
          <div style="font-size:9px;font-weight:800;letter-spacing:.06em;color:var(--azul);margin-bottom:2px">SUB-WO · WO-${w.id}</div>
          <div class="dh">${esc(p.nombre)}</div><div class="ds">${esc(u.num)} · ${esc(a.concepto)}</div>
          <div class="ds" style="font-size:10px">${esc(fechaSubWO(a)||"Sin fecha")}${a.ubic?` · ${esc(a.ubic)}`:""}</div></div>
          <span class="dtag" style="background:${col}22;color:${col};height:fit-content">${esc(estado)}</span></div>
        ${(a.fotosRefArr||[]).length?`<div class="ds" style="margin-top:5px;color:var(--azul);font-weight:700">📷 ${(a.fotosRefArr||[]).length} foto(s) de referencia para preparar la visita</div>`:""}
        <div class="ds" style="margin-top:6px;color:var(--azul);font-weight:650">Abrir ›</div></div>`;
    }).join("") : `<div style="text-align:center;padding:40px 14px;color:var(--faint);font-size:11.5px">Sin trabajos asignados</div>`)
    + `<div class="dl">Otras cosas</div>
       <button class="db g" data-a="fPermiso">Pedir permiso o vacaciones</button>`;
  }
  $("#fbody").innerHTML=h;
  $("#fsheet").innerHTML = S.phSheet ? hojaCel(S.phSheet) : "";
}

function renderAvisos(){
  const mios = avisosDe(S.usuario);
  const sinLeer = mios.filter(a=>!a.leido).length;
  const b=$("#campBadge"); if(b) b.style.display = sinLeer? "block":"none";
  document.body.classList.toggle("avisos-open", S.campana);
  $("#panelAvisos").innerHTML = `
    <div class="hd"><h4>Avisos</h4>
      <span class="pill g">${mios.length}</span>
      <span style="margin-left:auto;display:flex;gap:6px">
        ${sinLeer?`<button class="btn sm" data-a="avLeidos">Marcar leídos</button>`:""}
        <button class="btn sm" data-a="campana">Cerrar</button></span></div>
    <div class="ls">${mios.length? mios.map(a=>`
      <div class="av-it ${a.k} ${a.leido?"":"nuevo"}">
        <div class="t">${a.t}<span class="h">${a.hora}</span></div>
        <div class="b">${a.b}</div></div>`).join("")
      : `<div class="empty">Todavía no hay avisos.<br><span style="font-size:11.5px">Aquí queda todo lo que salió abajo a la izquierda, por si se te pasó.</span></div>`}</div>`;
}

/* Igual que en la hoja del adicional: render() reconstruye la hoja entera,
   así que antes de repintarla hay que rescatar lo que ya escribió. */
/* Antes de repintar hay que rescatar lo escrito en las hojas de Gustavo:
   render() rehace la hoja entera y se borraria lo que venia llenando. */
function leerDia(){
  const g=S.gDia; if(!g) return;
  const v = id => { const e=document.getElementById(id); return e? e.value : null; };
  const p=v("dnP"), u=v("dnU"), t=v("dnT");
  if(p!==null) g.prop=p;
  if(u!==null) g.unidad=u||null;
  if(t!==null) g.texto=t;
}
function leerDev(){
  const g=S.gDev; if(!g) return;
  const v = id => { const e=document.getElementById(id); return e? e.value : null; };
  const p=v("dvP"), u=v("dvU"), a=v("dvA"), d=v("dvD"), r=v("dvR"), f=v("dvF"), nv=v("dvV");
  if(p!==null) g.prop=p;
  if(u!==null && u!=="") g.unidad=u;
  if(a!==null) g.area=a;
  if(d!==null) g.desc=d;
  if(r!==null) g.responsable=r;
  if(f!==null) g.fechaLimite=f;
  if(nv!==null) g.nota=nv;
}

function leerSup(){
  const g=S.gRep; if(!g) return;
  const v = id => { const e=document.getElementById(id); return e? e.value : null; };
  const p=v("gP"), u=v("gU"), a=v("gA"), n=v("gN"), m=v("gM"), md=v("gMed");
  if(p!==null) g.prop=p;
  if(u!==null && u!=="") g.unidad=u;
  if(a!==null) g.antesDe=a;
  if(n!==null) g.nota=n;
  if(m!==null) g.material=m;
  if(md!==null) g.medidas=md;
  const sv=v("gSv"), pr=v("gPr"), ad=v("gAd"), mn=v("gMn");
  if(sv!==null) g.servSup=sv;
  if(pr!==null) g.problemas=pr;
  if(ad!==null) g.adicional=ad;
  if(mn!==null) g.mantNombre=mn;
  /* La descripcion de cada lote de fotos */
  (g.lotes||[]).forEach((l,i)=>{ const d=v("loD"+i); if(d!==null) l.desc=d; });
  const tv=v("gTV"), et=v("gET"), rc=v("gRec");
  if(tv!==null) g.tipoVisita=tv;
  if(et!==null) g.estadoTrabajo=et;
  if(rc!==null) g.recom=rc;
  /* El bloque repetible: render() rehace la hoja entera, asi que hay que
     rescatar cada renglon antes de repintar o se le borra lo escrito. */
  (g.items||[]).forEach((it,i)=>{
    const c=v("itC"+i), t=v("itT"+i), u=v("itU"+i), q=v("itQ"+i),
          m=v("itM"+i), mt=v("itMt"+i), x=v("itX"+i);
    if(c!==null)  it.cat=c;
    if(t!==null)  it.trabajo=t;
    if(u!==null)  it.ubic=u;
    if(q!==null)  it.cant=q;
    if(m!==null)  it.medidas=m;
    if(mt!==null) it.materiales=mt;
    if(x!==null)  it.coment=x;
  });
}

/* render() reconstruye la hoja entera, así que antes de agregar o quitar un
   renglón hay que rescatar lo que el técnico ya escribió: si no, se le borra la
   descripción, el concepto y la cantidad que venía llenando. */
function leerAdic(){
  const sh=S.phSheet; if(!sh||sh.t!=="adic") return;
  const t=document.getElementById("paD"); if(t) sh.desc=t.value;
  const u=document.getElementById("paU"); if(u) sh.ubic=u.value;
  sh.filas.forEach((f,i)=>{
    const c=document.getElementById("paC"+i),
          q=document.getElementById("paQ"+i);
    if(c) f.c=c.value; if(q) f.q=q.value;
  });
}
function leerMaterial(){
  const sh=S.phSheet; if(!sh||sh.t!=="material") return;
  const o=document.getElementById("mtObs"); if(o) sh.obs=o.value;
  sh.filas.forEach((f,i)=>{
    const p=document.getElementById("mtP"+i), c=document.getElementById("mtC"+i);
    if(p) f.prod=p.value; if(c) f.cant=c.value;
  });
}
function leerCompra(){
  const sh=S.phSheet; if(!sh||sh.t!=="compra") return;
  const t=document.getElementById("cpTienda"), n=document.getElementById("cpNombre"),
        c=document.getElementById("cpCant"), u=document.getElementById("cpUsado");
  if(t) sh.tienda=t.value; if(n) sh.nombre=n.value; if(c) sh.cant=c.value; if(u) sh.usado=u.value;
}


/* ── EL CELULAR DEL SUPERVISOR ────────────────────────────────────────────
   Gustavo maneja todo el día. No llena formularios: dispara fotos y manda.
   Claudia recibe y decide. Por eso su app no se parece a la del técnico:
   la del técnico ejecuta un trabajo; ésta reporta lo que se ve.

   Cuatro reportes, los cuatro salen de su propio flujograma:
     relevamiento → «tomar fotografías, medidas y notas» para el estimado
     previo       → lo que ya estaba dañado, para cuando el manager reclame
     revision     → «¿cumple los estándares de calidad?»
     material     → «¿faltan materiales o pintura?»                        */
/* `mod` es el número que Claudia le dio en su chat. Los que no lo tienen NO
   los pidió ella: salen del flujograma de Gustavo. Se muestran aparte para que
   nadie los confunda con lo que ella pidió. */
const REP = {
  relevamiento:{n:"Inspección para estimado", mod:2, d:"Lo que hay que hacer en esta unidad", c:"#1f4e79",
                ic:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'},
  previo:{n:"Estado previo", d:"Lo que ya estaba dañado antes de empezar", c:"#8a5a00",
          ic:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'},
  revision:{n:"Informe de supervisión", mod:1, d:"Revisar lo que hizo el técnico", c:"#1e5c3a",
            ic:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'},
  material:{n:"Falta material", d:"Avisar a oficina lo que hace falta", c:"#9b2226",
            ic:'<path d="M20 7h-9M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>'}
};
const fichaRep = k => { const r = REP[k];
  return `<div class="dc" data-a="gRepNuevo" data-t="${k}" style="cursor:pointer;display:flex;gap:10px;align-items:center">
    <div style="width:30px;height:30px;border-radius:8px;background:${r.c};display:flex;align-items:center;justify-content:center;flex:none">
      <svg style="width:15px;height:15px" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${r.ic}</svg></div>
    <div style="min-width:0"><div class="dh" style="font-size:12px">${r.n}</div><div class="ds">${r.d}</div></div>
  </div>`; };
const GUSTAVO = "T6";
const repsDe = q => S.reportes.filter(r=>r.quien===q);
const fotosDe = r => (r.lotes||[]).reduce((t,l)=>t+(l.fotosArr||[]).length,0);
/* El estado previo no se decide: se queda pegado a la unidad para siempre */
const previosDe = uid => S.reportes.filter(r=>r.tipo==="previo" && r.unidad===uid);
const repPend = () => S.reportes.filter(r=>r.estado==="Nuevo");

const HOY_SUP = "2026-08-11";
const MOTIVOS_SUP = ["Supervisar","Inspección para estimado","Reunión con mantenimiento","Revisar reclamo","Otro"];

/* Tipo de visita y estado del trabajo — los pidio Claudia en el formulario 1.
   "No se pudo ingresar" es una condicion real de campo que no estaba. */
const TIPO_VISITA = ["Inicial","Supervisión durante el trabajo","Inspección final"];
const EST_TRABAJO = ["No iniciado","En proceso","Terminado","Requiere corrección","No se pudo ingresar"];
/* Condicion de la unidad al llegar a inspeccionar. "No se pudo ingresar" es
   una condicion real de campo que no estaba modelada en ningun lado. */
const COND_UNIDAD = ["Desocupada","Ocupada","No se pudo ingresar"];
const COND_GENERAL = ["Buena","Regular","Mala"];
/* Las tres etapas de la evidencia. Claudia pidio "descripcion debajo de cada
   foto": una unidad puede llevar 100 fotos, asi que la descripcion va por
   LOTE (ambiente + etapa), que es como de verdad se revisan. */
const ETAPAS = ["Antes","Durante","Final"];
/* Estados de una parada de la ruta. "En camino" y "No completada" los pidio
   Claudia y no estaban: sin ellos, una parada a la que fue y no pudo entrar
   se ve igual que una que ni intento. */
const EST_PARADA = ["Pendiente","En camino","Visitada","No completada"];

const contactosDe  = pid => S.contactos.filter(c=>c.prop===pid);
/* Lo que se puede elegir al armar un estimado: las tarifas generales (siempre
   cargadas) mas las exclusivas de la propiedad elegida (esas si cambian cada
   vez que se cambia de propiedad). */
const tarifasDe = pid => S.tarifas.filter(t=>!t.prop || t.prop===pid);
/* A quien se le manda el estimado: uno o varios contactos de la propiedad —
   no siempre el manager, a veces mantenimiento tambien lo quiere recibir.
   Los estimados sembrados sin "contactos" caen de vuelta al cliente/management. */
const contactosEst = e => {
  const cs = (e.contactos||[]).map(id=>by(S.contactos,id)).filter(Boolean);
  if(cs.length) return cs.map(c=>({nombre:c.nombre, mail:c.mail}));
  const cl = CLI(e.cliente);
  return [{nombre:cl.contacto||cl.nombre, mail:cl.mail}];
};
/* Quien puede trabajar ese dia: lo que Thalia mira mientras habla. */
function libresEse(fecha, prop){
  const p = P(prop);
  return S.tecnicos.filter(t=>t.activo && !t.esp.includes("Supervisor")).map(t=>{
    const b = bloqueo(t.id, fecha), carga = capacidadDia(t.id, fecha);
    return {t, libre: !b && carga < CAP, carga,
            nota: b ? b.motivo : carga>=CAP ? "cupo lleno"
                 : t.zona!==p.zona ? "otra zona" : "disponible"};
  });
}
/* Una linea del relevamiento: es el borrador de una linea del estimado. */
const itemVacio = () => ({cat:activos("categorias")[0], trabajo:"", ubic:activos("ubicaciones")[0],
                          cant:"1", medidas:"", mat:false, materiales:"", coment:"", fotos:0});

/* La causa de la devolucion decide la plata. Sin esto, cada devolucion se
   discute a mano el viernes cuando se arma la nomina. */
const CAUSAS_DEV = {
  "Trabajo mal ejecutado por el técnico":
    {paga:false, cobra:false, ex:"La corrección <b>no se le paga</b> al técnico y no se le cobra al cliente."},
  "Cambio de criterio del dueño o del cliente":
    {paga:true,  cobra:true,  ex:"<b>Sí se le paga</b> al técnico y <b>sí se puede cobrar</b> como adicional."},
  "Daño de un tercero después de terminado":
    {paga:true,  cobra:true,  ex:"<b>Sí se le paga</b> al técnico y se le cobra a quien corresponda."},
  "Material defectuoso o faltante":
    {paga:true,  cobra:false, ex:"<b>Sí se le paga</b> al técnico; al cliente no se le cobra."}
};
const PRIOR_DEV = ["Alta","Media","Baja"];
const causaDe = c => CAUSAS_DEV[c] || {paga:true, cobra:false, ex:""};

/* Tipos de entrada del reporte diario. Los marcados auto:true los pone el
   sistema solo; los demas los escribe Gustavo porque nadie mas los sabe. */
const ENTRADAS_DIA = {
  llegada:     {n:"Llegada a propiedad",  c:"#1f4e79", auto:true},
  supervision: {n:"Supervisión de unidad", c:"#1e5c3a", auto:true},
  estimado:    {n:"Inspección para estimado", c:"#5b3a8a", auto:true},
  devolucion:  {n:"Devolución",           c:"#9b2226", auto:true},
  compra:      {n:"Compra o recibo",      c:"#b45309", auto:false},
  entrega:     {n:"Entrega de material",  c:"#0d9488", auto:false},
  coord:       {n:"Coordinación",         c:"#4b5563", auto:false},
  problema:    {n:"Problema encontrado",  c:"#9b2226", auto:false},
  seguimiento: {n:"Seguimiento",          c:"#5b3a8a", auto:false},
  pendiente:   {n:"Pendiente",            c:"#8a5a00", auto:false}
};

/* ── Helpers de devoluciones ── */
const devAbiertas  = () => S.devoluciones.filter(d=>d.estado!=="Cerrada");
const devDe        = uid => S.devoluciones.filter(d=>d.unidad===uid);
const DV           = id => S.devoluciones.find(d=>d.id===id);
function diasAbierta(d){
  const ms = new Date(HOY_SUP) - new Date(d.fechaRep);
  return Math.max(0, Math.round(ms/86400000));
}
const devVencida = d => d.estado!=="Cerrada" && d.fechaLimite < HOY_SUP;
const devDeTec   = t => S.devoluciones.filter(d=>d.responsable===t);

/* ── Los ocho contadores del panel de Gustavo ──
   Ninguno se digita: los seis primeros salen de datos que ya existen y los
   dos ultimos son estados calculados. Eso responde su pregunta de "de donde
   salen materiales pendientes y unidades listas": de aqui, solos. */
const matPend      = () => S.reportes.filter(r=>r.tipo==="material" && r.estado==="Nuevo");
const porSupervisar= () => S.wos.filter(w=>w.estado==="Completed" && !w.supervisada);
const enProceso    = () => S.wos.filter(w=>["In progress","Esperando aprobaci\u00f3n","Detenido"].includes(w.estado));

/* \u2500\u2500 Modulo 5 de Claudia: control de servicios en proceso \u2500\u2500
   Ella nombro SEIS estados (L179-185) que no son los del Excel. Aqui se
   traduce el estado real al nombre que ella uso, sin tocar el dato. */
const EST_SUP = {
  "Scheduled":  {n:"No iniciado",             c:"#8a97a4"},
  "Confirmed":  {n:"No iniciado",             c:"#8a97a4"},
  "Pending":    {n:"No iniciado",             c:"#8a97a4"},
  "In progress":{n:"En proceso",              c:"#0d9488"},
  "Detenido":   {n:"Detenido",                c:"#8a5a00"},
  "Esperando aprobaci\u00f3n":{n:"Pendiente de supervisi\u00f3n", c:"#5b3a8a"}
};
function estadoSup(w){
  /* Completed se parte en dos segun lo haya visto Gustavo o no: son los dos
     ultimos estados de su lista. */
  if(w.estado==="Completed")
    return w.supervisada ? {n:"Aprobado por Gustavo", c:"#1e5c3a"}
                         : {n:"Terminado por el t\u00e9cnico", c:"#1f4e79"};
  return EST_SUP[w.estado] || {n:w.estado, c:"#8a97a4"};
}
const serviciosEnProceso = () => S.wos.filter(w=>w.estado==="Completed" || !!EST_SUP[w.estado]);
const detenidos    = () => S.wos.filter(w=>w.estado==="Detenido");
const inspPend     = () => agendaHoy().filter(a=>a.motivo==="Inspecci\u00f3n para estimado" && a.estado!=="Visitada");
/* Unidad lista para entregar: todas sus WO terminadas y ninguna devolucion
   abierta. No lo marca nadie a mano — se deduce, que es de lo que se trata. */
function unidadesListas(){
  return S.unidades.filter(u=>{
    const ws = S.wos.filter(w=>w.unidad===u.id && w.estado!=="Canceled");
    if(!ws.length) return false;
    const ok = ws.every(w=>w.supervisada || w.estado==="Completed");
    return ok && !S.devoluciones.some(d=>d.unidad===u.id && d.estado!=="Cerrada");
  });
}
const pendDia = () => { const r=diarioHoy(); return r ? r.entradas.filter(e=>e.tipo==="pendiente") : []; };

/* ── Touch-up, facturacion bloqueada y descuentos ─────────────────
   Claudia: "si se mando a corregir no se cobra al cliente, es nuestra
   responsabilidad corregirlo". Entonces la WO original no se puede facturar
   mientras la devolucion siga abierta, y el touch-up nunca se factura. */
const devAbiertaDeWO = wid => S.devoluciones.find(d=>d.wo===wid && d.estado!=="Cerrada");
const bloqueadaPorDev = w => !!devAbiertaDeWO(w.id);
const esFacturable    = w => w.facturable!==false && !w.touchup;
const puedeFacturar   = w => esFacturable(w) && !bloqueadaPorDev(w);
const touchupDe       = did => S.wos.find(w=>w.devOrigen===did);
/* Servicios que de verdad tienen tarifa para esta propiedad, categoria y
   tipo de unidad. Sin esto el touch-up nace sin precio y el descuento se
   perderia en silencio — que es peor que no descontar. */
function serviciosConTarifa(prop, cat, unidadId){
  const u = U(unidadId); if(!u) return [];
  /* activos("servicios") trae los registros completos ({id,tipo,nombre}), no
     strings — comparar el objeto contra S.tarifas nunca calzaba y esta lista
     salia siempre vacia en silencio. */
  return activos("servicios").filter(sv => !!tarifa(prop, cat, sv.nombre, u.rooms, u.pisos)).map(sv=>sv.nombre);
}
/* Para corregir, lo natural es el "Touch up" de esa categoria si existe. */
function servTouchup(prop, cat, unidadId, servOriginal){
  const ok = serviciosConTarifa(prop, cat, unidadId);
  return ok.find(x=>/touch\s*up/i.test(x)) || (ok.includes(servOriginal)?servOriginal:ok[0]) || servOriginal;
}

/* El descuento se calcula sobre lo que se le pago al que fue a corregir.
   Si corrige el mismo que se equivoco, no hay pago ni descuento: rehace su
   trabajo y ya. */
/* El descuento se crea con la WO de touch-up y se retira si esa WO vuelve
   a manos del responsable. Nunca queda huerfano. */
function aplicarDescuento(dv, w){
  if(!w || w.tec===dv.responsable) return null;     // la corrige el mismo: nada que descontar
  const monto = egresoWO(w);
  /* Sin tarifa no hay monto, y un descuento perdido en silencio es peor que
     no descontar: se levanta excepcion para que alguien la resuelva. */
  if(monto===null){
    if(!S.excepciones.some(x=>x.tipo==="Touch-up sin tarifa" && x.wo===w.id)){
      S.excepciones.push({id:"X"+Date.now(), tipo:"Touch-up sin tarifa", wo:w.id,
        motivo:"El touch-up WO-"+w.id+" no tiene tarifa para "+(U(w.unidad)?U(w.unidad).rooms:"esa unidad")
               +", as\u00ed que no se puede calcular el descuento a "+tecN(dv.responsable)+".",
        monto:null, pide:"Sistema", aprueba:"Claudia", estado:"Pendiente",
        fecha:HOY_SUP, resol:null});
    }
    return null;
  }
  if(monto<=0) return null;
  /* Tope: nunca se le puede descontar mas de lo que gano por el trabajo que
     hizo mal. Si la correccion sale mas cara, la diferencia la absorbe la
     empresa — cobrarle mas de lo que cobro no es una correccion, es una multa. */
  const orig = W(dv.wo);
  const ganoPorEse = orig ? (egresoWO(orig) || 0) : 0;
  let tope = false;
  let montoFinal = monto;
  if(ganoPorEse > 0 && monto > ganoPorEse){ montoFinal = ganoPorEse; tope = true; }

  const d = {id:"DS"+Date.now()+Math.floor(Math.random()*99), tec:dv.responsable,
    wo:w.id, dev:dv.id, monto:montoFinal, montoReal:monto, tope, semana:w.semana, fecha:HOY_SUP,
    motivo:"Correcci\u00f3n de "+dv.area+" en "+(U(dv.unidad)?U(dv.unidad).num:"la unidad")+" — lo corrigi\u00f3 "+tecN(w.tec)
           +(tope?" (limitado a lo que gan\u00f3 por WO-"+dv.wo+")":"")};
  S.descuentos.push(d);
  return d;
}
function quitarDescuento(dv){
  const i = S.descuentos.findIndex(x=>x.dev===dv.id);
  if(i>-1) S.descuentos.splice(i,1);
}
const descDe    = (tec,sem) => S.descuentos.filter(x=>x.tec===tec && x.semana===sem);
const totalDesc = (tec,sem) => descDe(tec,sem).reduce((a,x)=>a+x.monto,0);

/* ── Helpers del reporte diario ── */
const diarioDe     = f => S.repDiario.find(r=>r.fecha===f && r.quien===GUSTAVO);
const diarioHoy    = () => diarioDe(HOY_SUP);
/* Un dia anterior que quedo sin cerrar: el estado "Pendiente de finalizar"
   que ella misma nombro es exactamente para esto. */
const diarioColgado = () => S.repDiario.find(r=>r.quien===GUSTAVO && r.fecha!==HOY_SUP && r.estado!=="Completado");
/* El estado guardado solo distingue En progreso/Completado — "Pendiente de
   finalizar" se calcula en vivo (igual que facVencida con las facturas):
   es un reporte de OTRO día que nunca se cerro. Antes este estado estaba
   solo en el color y nunca se encendia de verdad. */
const diaEstadoTexto = r => (r.estado==="En progreso" && r.fecha!==HOY_SUP) ? "Pendiente de finalizar" : r.estado;
const entradasDe   = r => (r ? r.entradas : []);

function abrirDiario(){
  let r = diarioHoy();
  if(r) return r;
  r = {id:"RD"+Date.now(), fecha:HOY_SUP, quien:GUSTAVO, horaInicio:hora(),
       horaFin:null, estado:"En progreso", entradas:[], comentarioFinal:"",
       notasPost:[], hist:[[hora(),"Reporte del día abierto",tecN(GUSTAVO)]]};
  S.repDiario.push(r);
  return r;
}
/* Todo lo que Gustavo hace en el dia se engancha solo al reporte abierto.
   Si no lo abrio todavia, se abre en ese momento: no se pierde nada. */
function anotarDia(tipo, texto, ref, extra){
  const r = abrirDiario();
  if(r.estado==="Completado") return null;
  const e = {id:"ED"+(S.audSeq+ ++_edSeq), tipo, hora:hora(), texto,
             ref:ref||null, prop:(extra&&extra.prop)||null,
             unidad:(extra&&extra.unidad)||null, fotos:(extra&&extra.fotos)||0,
             auto:!!(ENTRADAS_DIA[tipo]&&ENTRADAS_DIA[tipo].auto)};
  r.entradas.push(e);
  return e;
}
let _edSeq = 0;

const agendaHoy = () => S.agendaSup.filter(a=>a.fecha===HOY_SUP);
const paradaDe = pid => agendaHoy().find(a=>a.prop===pid);

/* La ruta de Gustavo es lo que Claudia le asignó, agrupado por zona.
   Claudia decide A DÓNDE va; el sistema decide EN QUÉ ORDEN, porque el
   traslado quita tiempo. Antes esta ruta se calculaba sola a partir de las
   Work Orders activas — pero su flujograma dice que el día se lo da ella. */
function rutaGustavo(){
  const porZona = {};
  agendaHoy().forEach(a=>{ const z=P(a.prop).zona; (porZona[z]=porZona[z]||[]).push(a); });
  return Object.keys(porZona).sort((a,b)=>porZona[b].length-porZona[a].length)
    .map(z=>({zona:z, paradas:porZona[z],
              props:porZona[z].map(a=>a.prop),
              wos:S.wos.filter(w=>porZona[z].some(a=>a.prop===w.prop) && w.semana===S.semana)}));
}


/* ── Render del celular de Gustavo ──────────────────────────────────────
   Tres pantallas: a dónde voy, qué reporto, qué mandé. Nada más.        */
/* Arma el CONTENIDO de una pantalla de Gustavo (sin el marco de celular ni
   la barra inferior) -- la usan tanto el celular simulado (renderFonSup)
   como la vista web de referencia (VIEWS.gustavoweb), para no repetir la
   logica en dos lados. */
function gustavoScreenHTML(view){
  let h = "";
  const rd = diarioHoy();
  const nEnt = rd ? rd.entradas.length : 0;

  /* ── PANEL PRINCIPAL ──
     "Esta seria la primera pantalla de Gustavo y mostraria solamente lo
     importante" (L208). Son sus ocho indicadores y nada mas: entran en una
     pantalla sin scroll. La ruta es su modulo 4 y vive en su propia pestana
     — estuvieron juntos un tiempo y obligaba a bajar media pantalla para
     ver a donde iba. */
  if(view==="panel"){
    const ag = agendaHoy(), vis = ag.filter(a=>a.estado==="Visitada").length;
    const colgado = diarioColgado();
    const ruta = rutaGustavo();
    const dvPend = devAbiertas(), mat = matPend();

    /* Grid de 2 columnas, \u00edcono + n\u00famero + etiqueta. Los que llevan a otra
       pantalla se distinguen con borde de color y flecha; los que son puro
       conteo van planos, sin flecha, sin cursor de mano. Reemplaza la
       versi\u00f3n anterior (lista + tarjetas en dos cajas separadas), que
       cumpl\u00eda lo mismo pero ocupaba m\u00e1s alto de lo que entra sin scroll
       en un celular real. */
    const panelCell = (ic, n, lab, col, acc, extra) =>
      `<div ${acc?`data-a="${acc}" ${extra||""}`:""} style="background:#fff;border:1px solid var(--line);
        border-radius:10px;padding:9px 10px;${acc?`border-left:3px solid ${col};cursor:pointer`:""}">
        <div style="display:flex;align-items:center;gap:5px">
          <svg viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;flex:none">${ic}</svg>
          <div style="font-size:15px;font-weight:800;color:${col};line-height:1">${n}</div>
          ${acc?`<span style="margin-left:auto;color:var(--faint);font-size:13px;flex:none">\u203a</span>`:""}
        </div>
        <div style="font-size:10.5px;font-weight:600;color:var(--soft);margin-top:4px;line-height:1.25">${lab}</div>
      </div>`;
    const IC_RUTA = '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>';
    const IC_PROCESO = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
    const IC_DEVS = '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>';
    const IC_DIA = '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>';
    const IC_SUPERVISAR = '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>';
    const IC_INSPECCION = '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>';
    const IC_MATERIAL = '<path d="M21 16V8l-9-5-9 5v8l9 5z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/>';
    const IC_LISTA = '<path d="M20 6L9 17l-5-5"/>';

    h = `<div class="dc" style="background:var(--azul-cl);border-color:transparent">
        <div class="dh" style="color:var(--azul)">Martes 11 de agosto</div>
        <div class="ds" style="margin-top:2px">${rd
          ? `Reporte del d\u00eda <b>abierto ${esc(rd.horaInicio)}</b> · ${nEnt} actividad(es)`
          : `Tu reporte del d\u00eda no est\u00e1 abierto \u2014 \u00e1brelo en <b>Mi d\u00eda</b>`}</div>

      </div>`

      + (colgado?`<div class="dc" style="border-color:var(--ambar);background:#fdf5e3">
          <div class="dh" style="color:var(--ambar)">Te qued\u00f3 un reporte sin cerrar</div>
          <div class="ds" style="margin-top:2px">El del <b>${colgado.fecha}</b>. Se guard\u00f3 todo.</div>
          <button class="db g" style="margin:7px 0 0;padding:8px;font-size:11.5px" data-a="gDiaVer" data-id="${colgado.id}">Cerrarlo ahora</button>
        </div>`:"")

      /* Los ocho de su panel, en un solo grid de 2 columnas: se ven de un
         vistazo, sin scroll, y sin ocupar el alto de una lista + tarjetas
         aparte. Los 4 que llevan a otra pantalla, con borde de color y
         flecha; los 4 que son puro conteo, planos. */
      + `<div class="dl" style="margin-top:10px">Lo que tengo hoy</div>
         <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
           ${panelCell(IC_RUTA, `${vis}/${ag.length}`, "Visitas programadas para hoy", "#1f4e79", "fView", 'data-v="ruta"')}
           ${panelCell(IC_PROCESO, enProceso().length, "Servicios en proceso", "#0d9488", "fView", 'data-v="proceso"')}
           ${panelCell(IC_DEVS, dvPend.length, "Devoluciones abiertas", dvPend.length?"#9b2226":"#8a97a4", "fView", 'data-v="devs"')}
           ${panelCell(IC_DIA, pendDia().length, "Actividades pendientes del reporte diario", "#8a5a00", "fView", 'data-v="dia"')}
           ${panelCell(IC_SUPERVISAR, porSupervisar().length, "Unidades pendientes de supervisión", "#1e5c3a")}
           ${panelCell(IC_INSPECCION, inspPend().length, "Inspecciones para estimados", "#5b3a8a")}
           ${panelCell(IC_MATERIAL, mat.length, "Materiales pendientes de compra", "#b45309")}
           ${panelCell(IC_LISTA, unidadesListas().length, "Unidades listas para entregar", "#1f4e79")}
         </div>`

         ;
  }

  /* ── MI RUTA ────────────────────────────
     Modulo 4 de Claudia (L159-169): las paradas en el orden que ella recomendo,
     con el estado de cada visita. Pestana propia: es lo que Gustavo mira todo
     el dia y no puede quedar debajo de ocho contadores. */
  else if(view==="ruta"){
    const ag = agendaHoy();
    const ruta = rutaGustavo();
    const dvPend = devAbiertas(), mat = matPend();

    h = `<div class="dl" style="margin-top:5px">Mi ruta · ${ag.length} parada(s) que te arm\u00f3 Claudia</div>`
      + (ag.length? ruta.map((z,i)=>`
          <div class="dl" style="display:flex;align-items:center;gap:6px;margin-top:8px">
            <span class="dtag" style="background:var(--azul);color:#fff">${i+1}</span> ${esc(z.zona)}</div>
          ${z.paradas.map(pa=>{
            const pr=P(pa.prop);
            const ok = pa.estado==="Visitada", no = pa.estado==="No completada", cam = pa.estado==="En camino";
            const col = ok?"var(--verde)":no?"var(--ambar)":cam?"var(--azul)":"";
            return `<div class="dc" style="${col?`border-color:${col}`:""}">
              <div style="display:flex;justify-content:space-between;gap:7px;align-items:flex-start">
                <div style="min-width:0"><div class="dh">${esc(pr.nombre)}</div>
                  <div class="ds">${esc(pr.dir)}</div></div>
                ${ok?`<span class="dtag" style="background:#1e5c3a22;color:#1e5c3a;flex:none">llegaste ${esc(pa.hora)}</span>`
                 :cam?`<span class="dtag" style="background:#1f4e7922;color:#1f4e79;flex:none">en camino</span>`
                 :no?`<span class="dtag" style="background:#8a5a0022;color:#8a5a00;flex:none">no se pudo</span>`:""}</div>
              <div class="ds" style="margin-top:5px"><b style="color:var(--azul)">${esc(pa.motivo)}</b></div>
              ${pa.nota?`<div class="ds" style="margin-top:3px">«${esc(pa.nota)}»</div>`:""}
              ${no
                ? `<div class="ds" style="margin-top:6px;color:var(--ambar)">${esc(pa.motivoNo||"")}</div>`
                : ok
                ? `<button class="db p" style="margin:8px 0 0;padding:9px;font-size:12px" data-a="gRepPro" data-prop="${pa.prop}">Reportar desde aqu\u00ed</button>`
                : `${!cam?`<button class="db g" style="margin:8px 0 0;padding:9px;font-size:12px" data-a="gEnCamino" data-id="${pa.id}">Voy en camino</button>`:""}
                   <button class="db p" style="margin:${cam?"8px":"0"} 0 0;padding:9px;font-size:12px" data-a="gLlegue" data-id="${pa.id}">Llegu\u00e9</button>
                   <button class="db g" style="margin:0;padding:9px;font-size:12px" data-a="gNoCompleta" data-id="${pa.id}">No pude completarla</button>`}
            </div>`;}).join("")}`).join("")
        : `<div class="dc" style="border-style:dashed"><div class="ds" style="text-align:center">
            Claudia todav\u00eda no te arm\u00f3 la ruta de hoy.</div></div>`)

      /* Lo que también tiene pendiente y no es una parada */
      + ((dvPend.length || mat.length)
        ? `<div class="dl" style="margin-top:12px">Adem\u00e1s tienes que</div>`
          + dvPend.map(d=>`<div class="dc" style="border-left:3px solid ${devVencida(d)?"var(--rojo)":"var(--ambar)"};cursor:pointer"
               data-a="gDevVer" data-id="${d.id}">
              <div style="display:flex;justify-content:space-between;gap:6px;align-items:center">
                <div class="dh" style="font-size:12px">Verificar correcci\u00f3n</div>
                <span class="dtag" style="background:${devVencida(d)?"var(--rojo)":"var(--ambar)"};color:#fff;flex:none">${diasAbierta(d)} d\u00eda(s)</span></div>
              <div class="ds" style="margin-top:3px">${esc(P(d.prop).nombre)} ${U(d.unidad)?esc(U(d.unidad).num):""} · ${esc(d.area)}</div>
            </div>`).join("")
          + mat.map(r=>`<div class="dc" style="border-left:3px solid #b45309">
              <div class="dh" style="font-size:12px">Material por comprar</div>
              <div class="ds" style="margin-top:3px">${esc(P(r.prop).nombre)} · ${esc(r.material||r.nota||"")}</div>
            </div>`).join("")
        : "");
  }

  /* ── QUÉ REPORTO ──
     Primero dónde está, después qué reporta. Al revés termina con 60 fotos
     sin saber a qué unidad pertenecen. Las paradas donde ya marcó llegada
     salen arriba: es el camino natural, no una restricción. */
  else if(view==="reportar"){
    const aqui = agendaHoy().filter(a=>a.estado==="Visitada");
    const falta = agendaHoy().filter(a=>!["Visitada","No completada"].includes(a.estado));
    h = (aqui.length
      ? `<div class="dl" style="margin-top:5px">Estás en</div>`
        + aqui.map(a=>`<div class="dc" data-a="gRepPro" data-prop="${a.prop}" style="cursor:pointer;border-color:var(--verde)">
            <div style="display:flex;justify-content:space-between;gap:7px;align-items:center">
              <div style="min-width:0"><div class="dh">${esc(P(a.prop).nombre)}</div>
                <div class="ds">${esc(a.motivo)} · llegaste ${esc(a.hora)}</div></div>
              <span class="dtag" style="background:#1e5c3a22;color:#1e5c3a;flex:none">Reportar ›</span></div>
          </div>`).join("")
      : `<div class="dc" style="border-style:dashed"><div class="ds" style="text-align:center">
          Todavía no marcaste llegada en ninguna parada.<br>
          <b>Entra a Hoy y toca «Llegué»</b> en la propiedad donde estés.</div></div>`)
      + (falta.length?`<div class="dl" style="margin-top:9px">Te faltan</div>`
        + falta.map(a=>`<div class="dc" style="opacity:.72">
            <div class="dh">${esc(P(a.prop).nombre)}</div>
            <div class="ds">${esc(a.motivo)} · sin llegar</div></div>`).join(""):"")
      /* Los dos formularios que pidio Claudia van primero y con su numero de
         modulo. Los otros dos salen del flujograma de Gustavo y van abajo,
         separados: si no, parecen modulos de ella y no lo son. */
      + ((tira, titulo) => tira.length ? `<div class="dl" style="margin-top:9px">${titulo}</div>` + tira.join("") : "")(
          Object.keys(REP).filter(k=>REP[k].mod).map(k=>fichaRep(k)), "O reportar de otra propiedad")
      + `<div class="dl" style="margin-top:11px">Otros avisos</div>`
      + Object.keys(REP).filter(k=>!REP[k].mod).map(k=>fichaRep(k)).join("")
      + `<div class="dc" style="border-style:dashed"><div class="ds" style="text-align:center">
         Todo lo que mandes le llega a <b>Claudia</b> al instante, con la propiedad, la hora y las fotos ordenadas por ambiente.</div></div>`;
  }

  /* ── MI DÍA ──
     Un solo reporte por dia. No son reportes sueltos: es un contenedor que
     abre en la manana y cierra en la tarde. Lo que el sistema ya sabe entra
     solo (marcado «automático»); lo demas lo escribe el, porque nadie mas
     lo sabe. Una vez finalizado no se edita: solo se le agrega nota. */
  else if(view==="dia"){
    const r = S.phDiaId ? S.repDiario.find(x=>x.id===S.phDiaId) : rd;
    if(!r){
      h = `<div class="dc" style="border-style:dashed;margin-top:5px">
        <div class="dh" style="text-align:center">Tu reporte de hoy no est\u00e1 abierto</div>
        <div class="ds" style="margin-top:6px;text-align:center">Al abrirlo se registra la hora de inicio y todo lo que hagas
          durante el d\u00eda se va guardando ah\u00ed. Si cierras la app, no se pierde nada.</div>
        <button class="db p gcam" style="margin-top:11px" data-a="gDiaAbrir">Abrir mi reporte de hoy</button></div>`;
    } else {
      const cerrado = r.estado==="Completado";
      const col = r.estado==="Completado"?"var(--verde)":diaEstadoTexto(r)==="Pendiente de finalizar"?"var(--ambar)":"var(--azul)";
      h = `<div class="dc" style="border-color:${col}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:7px">
            <div><div class="dh">Reporte del ${r.fecha}</div>
              <div class="ds">abierto ${esc(r.horaInicio)}${r.horaFin?` · cerrado ${esc(r.horaFin)}`:""}</div></div>
            <span class="dtag" style="background:${col};color:#fff;flex:none">${esc(r.estado)}</span></div>
          <div class="ds" style="margin-top:6px"><b>${r.entradas.length}</b> actividad(es)
            · ${r.entradas.filter(e=>e.auto).length} autom\u00e1tica(s)</div>
        </div>`

        + (cerrado?`<div class="dc" style="background:var(--verde-cl);border-color:transparent">
            <div class="ds" style="color:var(--verde)">Este reporte ya se envi\u00f3 y <b>no se puede editar</b>.
            Si falta algo, agrega una nota: queda aparte y no toca el original.</div></div>`:"")

        + (S.borradores.length?`<div class="dl" style="margin-top:10px">Borradores sin enviar (${S.borradores.length})</div>`
            + S.borradores.map(b=>`<div class="dc" style="border-left:3px solid var(--ambar)">
                <div style="display:flex;justify-content:space-between;gap:6px;align-items:center">
                  <div class="dh" style="font-size:12px">${esc((REP[b.tipo]||{n:b.tipo}).n)}</div>
                  <span class="dtag" style="background:var(--ambar);color:#fff;flex:none">guardado ${esc(b.guardado)}</span></div>
                <div class="ds" style="margin-top:3px">${esc(P(b.prop).nombre)}${b.unidad&&U(b.unidad)?" · "+esc(U(b.unidad).num):""}
                  · ${(b.lotes||[]).reduce((t,l)=>t+(l.fotosArr||[]).length,0)} foto(s)</div>
                <div style="display:flex;gap:6px;margin-top:7px">
                  <button class="db p" style="margin:0;padding:8px;font-size:11.5px" data-a="gRepRetomar" data-id="${b.id}">Seguir</button>
                  <button class="db g" style="margin:0;padding:8px;font-size:11.5px" data-a="gRepBorrarBorrador" data-id="${b.id}">Descartar</button>
                </div></div>`).join("")
          :"")
        + `<div class="dl" style="margin-top:10px">Lo que pas\u00f3 hoy</div>`
        + (r.entradas.length ? r.entradas.map(e=>{
            const t = ENTRADAS_DIA[e.tipo] || {n:e.tipo, c:"#8a97a4"};
            return `<div class="dc" style="border-left:3px solid ${t.c};padding-top:8px">
              <div style="display:flex;justify-content:space-between;gap:6px;align-items:center">
                <div style="font-size:9.5px;font-weight:750;text-transform:uppercase;color:${t.c}">${t.n}</div>
                <div style="font-size:10px;color:var(--faint);flex:none">${esc(e.hora)}${e.auto?" · auto":""}</div></div>
              <div class="ds" style="margin-top:3px;color:var(--tinta)">${esc(e.texto)}</div>
              ${e.prop?`<div class="ds" style="margin-top:2px">${esc(P(e.prop).nombre)}${e.unidad&&U(e.unidad)?" · "+esc(U(e.unidad).num):""}${e.fotos?` · ${e.fotos} foto(s)`:""}</div>`:""}
              ${!cerrado&&!e.auto?`<button class="adx" style="height:22px;width:22px;font-size:13px;margin-top:5px" data-a="gDiaQuita" data-id="${e.id}">−</button>`:""}
            </div>`;}).join("")
          : `<div class="dc" style="border-style:dashed"><div class="ds" style="text-align:center">
              Nada todav\u00eda. Lo que hagas se anota solo; abajo agregas lo que el sistema no puede saber.</div></div>`)

        + (r.notasPost.length?`<div class="dl" style="margin-top:9px">Notas agregadas despu\u00e9s</div>`
            + r.notasPost.map(n=>`<div class="dc" style="border-left:3px solid var(--ambar)">
                <div style="font-size:10px;color:var(--faint)">${esc(n[0])}</div>
                <div class="ds" style="color:var(--tinta)">${esc(n[1])}</div></div>`).join(""):"")

        + (cerrado
          ? `<button class="db g" style="margin-top:11px" data-a="gDiaNota">Agregar una nota</button>`
          : `<div class="dl" style="margin-top:11px">Agregar lo que el sistema no sabe</div>`
            + `<div class="gchips">${Object.keys(ENTRADAS_DIA).filter(k=>!ENTRADAS_DIA[k].auto).map(k=>
                `<button class="gchip" data-a="gDiaNueva" data-t="${k}">+ ${ENTRADAS_DIA[k].n}</button>`).join("")}</div>`
            + `<label style="margin-top:11px">Comentarios finales del d\u00eda</label>
               <textarea id="dnCF" placeholder="C\u00f3mo cerr\u00f3 el d\u00eda, qu\u00e9 queda para ma\u00f1ana">${esc(r.comentarioFinal||"")}</textarea>`
            + `<button class="db p" style="margin-top:9px" data-a="gDiaFin">Finalizar y enviar reporte</button>`);
    }
  }

  /* ── DEVOLUCIONES ABIERTAS ──
     La pantalla que pidio Claudia. Una devolucion no se cierra hasta que
     Gustavo verifica con fotos que se corrigio: cruza dias y sigue contando. */
  else if(view==="devs"){
    const ab = devAbiertas(), ce = S.devoluciones.filter(d=>d.estado==="Cerrada");
    const tarj = d => {
      const c = causaDe(d.causa), dias = diasAbierta(d), venc = devVencida(d);
      const col = d.estado==="Cerrada"?"#1e5c3a":venc?"#9b2226":"#8a5a00";
      return `<div class="dc" style="border-left:3px solid ${col};cursor:pointer" data-a="gDevVer" data-id="${d.id}">
        <div style="display:flex;justify-content:space-between;gap:6px;align-items:center">
          <div class="dh" style="font-size:12px">${esc(P(d.prop).nombre)} · ${U(d.unidad)?esc(U(d.unidad).num):"—"}</div>
          <span class="dtag" style="background:${col};color:#fff;flex:none">${esc(d.estado)}</span></div>
        <div class="ds" style="margin-top:3px"><b>${esc(d.area)}</b> — ${esc(d.desc.slice(0,68))}${d.desc.length>68?"…":""}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">
          <span class="dtag" style="background:${d.prioridad==="Alta"?"#9b222222;color:#9b2226":"#f0f2f4;color:#5b6875"}">${esc(d.prioridad)}</span>
          <span class="dtag" style="background:#f0f2f4;color:#5b6875">${esc(tecN(d.responsable))}</span>
          ${d.estado!=="Cerrada"?`<span class="dtag" style="background:${venc?"#9b222222;color:#9b2226":"#f0f2f4;color:#5b6875"}">${dias} d\u00eda(s) abierta</span>`:""}
          ${venc?`<span class="dtag" style="background:#9b2226;color:#fff">venci\u00f3 ${esc(d.fechaLimite)}</span>`:""}
        </div>
        <div class="ds" style="margin-top:5px;font-size:10.5px">${c.paga?"se le paga":"<b>no se le paga</b>"} · ${c.cobra?"se puede cobrar":"no se cobra"}</div>
      </div>`;};

    h = `<div class="dl" style="margin-top:5px">Abiertas (${ab.length})</div>`
      + (ab.length? ab.map(tarj).join("")
         : `<div class="dc" style="border-style:dashed"><div class="ds" style="text-align:center">Ninguna devoluci\u00f3n abierta.</div></div>`)
      + (ce.length?`<div class="dl" style="margin-top:10px">Cerradas (${ce.length})</div>`+ce.map(tarj).join(""):"");
  }

  /* ── UNA DEVOLUCIÓN ── */
  else if(view==="dev"){
    const d = DV(S.phDev);
    if(!d){ return ""; }
    const c = causaDe(d.causa), dias = diasAbierta(d), venc = devVencida(d);
    const nA = (d.lotesAntes||[]).reduce((t,l)=>t+l.n,0);
    const nD = (d.lotesDespues||[]).reduce((t,l)=>t+l.n,0);
    h = `<button class="db g" style="margin:5px 0 9px" data-a="fView" data-v="devs">‹ Todas las devoluciones</button>
      <div class="dc" style="border-color:${d.estado==="Cerrada"?"var(--verde)":venc?"var(--rojo)":"var(--ambar)"}">
        <div style="display:flex;justify-content:space-between;gap:6px;align-items:center">
          <div class="dh">${esc(P(d.prop).nombre)} · ${U(d.unidad)?esc(U(d.unidad).num):"—"}</div>
          <span class="dtag" style="background:${d.estado==="Cerrada"?"var(--verde)":"var(--ambar)"};color:#fff;flex:none">${esc(d.estado)}</span></div>
        <div class="ds" style="margin-top:4px">Área: <b>${esc(d.area)}</b>${d.wo?` · WO-${d.wo}`:""}</div>
        <div class="ds" style="margin-top:5px;color:var(--tinta)">${esc(d.desc)}</div>
      </div>

      <div class="dc"><div class="dl" style="margin:0 0 5px">Por qu\u00e9 pas\u00f3</div>
        <div class="ds" style="color:var(--tinta)"><b>${esc(d.causa)}</b></div>
        <div class="ds" style="margin-top:5px">${c.ex}</div>
        <div class="ds" style="margin-top:6px;font-size:10.5px;color:var(--faint)">
          La causa es lo que decide la plata. Por eso se pregunta al crearla y no el viernes.</div></div>

      <div class="dc"><div class="dl" style="margin:0 0 5px">Seguimiento</div>
        <div class="ds">Responsable de corregir: <b>${esc(tecN(d.responsable))}</b></div>
        <div class="ds">Prioridad: <b>${esc(d.prioridad)}</b></div>
        <div class="ds">Reportada: ${esc(d.fechaRep)} · l\u00edmite ${d.fechaLimite}</div>
        ${d.estado!=="Cerrada"?`<div class="ds" style="color:${venc?"var(--rojo)":"var(--ambar)"}">
          <b>${dias} d\u00eda(s) abierta</b>${venc?" — pas\u00f3 la fecha l\u00edmite":""}</div>`:""}
        ${d.verifica?`<div class="ds" style="color:var(--verde);margin-top:3px">✓ Verificada por ${esc(tecN(d.verifica))}</div>`:""}
      </div>

      <div class="dl" style="margin-top:10px">Fotos</div>
      <div class="dc">
        <div class="ds"><b>Antes:</b> ${nA} foto(s)${(d.lotesAntes||[]).length?" · "+d.lotesAntes.map(l=>esc(l.amb)).join(", "):""}</div>
        <div class="ds" style="margin-top:4px"><b>Despu\u00e9s:</b> ${nD?`${nD} foto(s)`:"<span style='color:var(--ambar)'>todav\u00eda ninguna</span>"}</div>
      </div>

      ${(()=>{ const tu=touchupDe(d.id); if(!tu) return "";
        return `<div class="dl" style="margin-top:10px">Qui\u00e9n la est\u00e1 corrigiendo</div>
          <div class="dc" style="border-left:3px solid var(--azul)">
            <div class="dh">WO-${tu.id} · ${esc(tecN(tu.tec))}</div>
            <div class="ds" style="margin-top:3px">${esc(tu.serv)} · ${tu.fecha} · <b>${esc(tu.estado)}</b></div>
            <div class="ds" style="margin-top:3px;color:var(--faint)">${
              tu.tec===tu.tecOriginal
                ? "Lo corrige el mismo responsable: no se le paga."
                : "Se le paga a "+esc(tecN(tu.tec))+" y se le descuenta a "+esc(tecN(tu.tecOriginal))+"."}</div>
            <div class="ds" style="margin-top:3px;color:var(--faint)">Al cliente no se le cobra.</div>
          </div>`;})()}

      ${d.estado==="Abierta"?`<button class="db p gcam" style="margin-top:11px;background:var(--verde)" data-a="gDevVerif" data-id="${d.id}">
          Verificar y tomar fotos del despu\u00e9s</button>`
       : d.estado==="Corregida"?`<div class="dc" style="background:var(--verde-cl);border-color:transparent">
          <div class="ds" style="color:var(--verde)">Ya tiene fotos del despu\u00e9s. Ci\u00e9rrala para que deje de contar.</div></div>
          <button class="db p" style="margin-top:8px;background:var(--verde)" data-a="gDevCerrar" data-id="${d.id}">Cerrar devoluci\u00f3n</button>`
       : `<div class="dc" style="background:var(--verde-cl);border-color:transparent">
          <div class="ds" style="color:var(--verde)">Cerrada. Queda el historial completo con las fotos de antes y despu\u00e9s.</div></div>`}

      ${(d.hist||[]).length?`<div class="dl" style="margin-top:10px">Historial</div>
        <div class="dc">${d.hist.map(x=>`<div class="ds" style="padding:2px 0">
          <span style="color:var(--faint)">${esc(x[0])}</span> — ${esc(x[1])}
          <span style="color:var(--faint)">(${esc(x[2])})</span></div>`).join("")}</div>`:""}`;
  }

  /* ── CONTROL DE SERVICIOS EN PROCESO ──
     El modulo 5 de Claudia (L170-188), con los campos que ella listo y en su
     orden. El estado se traduce a SU vocabulario: el Excel los tiene en
     ingles y ella nombro otros seis. */
  else if(view==="proceso"){
    const ws = serviciosEnProceso();
    h = `<div class="dl" style="margin-top:5px">Servicios en proceso (${ws.length})</div>`
      + (ws.length ? ws.map(w=>{
        const e = estadoSup(w), av = w.avance||0;
        return `<div class="dc" style="border-left:3px solid ${e.c}">
          <div style="display:flex;justify-content:space-between;gap:6px;align-items:center">
            <div class="dh" style="font-size:12px">${esc(P(w.prop).nombre)} · ${U(w.unidad)?esc(U(w.unidad).num):"—"}</div>
            <span class="dtag" style="background:${e.c};color:#fff;flex:none">${esc(e.n)}</span></div>
          <div class="ds" style="margin-top:3px"><b>${esc(w.serv)}</b> · WO-${w.id}</div>
          <div class="ds" style="margin-top:2px">${esc(tecN(w.tec))}</div>
          <div class="ds" style="margin-top:2px">Inicio ${esc(w.fecha)} · Entrega ${w.fechaEntrega?esc(w.fechaEntrega):"<b>sin fecha</b>"}</div>
          <div style="display:flex;align-items:center;gap:7px;margin-top:6px">
            <div style="flex:1;height:6px;background:#eef1f4;border-radius:99px;overflow:hidden">
              <div style="width:${av}%;height:100%;background:${e.c}"></div></div>
            <span class="dtag" style="background:#f0f2f4;color:#5b6875;flex:none">${av}%</span></div>
          ${w.avanceNota?`<div class="ds" style="margin-top:5px;color:var(--ambar)">«${esc(w.avanceNota)}»</div>`:""}
          <div class="ds" style="margin-top:4px;font-size:10.5px">${w.avanceFotos||0} foto(s) del progreso</div>
        </div>`;}).join("")
        : `<div class="dc" style="border-style:dashed"><div class="ds" style="text-align:center">
            Ningún servicio en proceso ahora mismo.</div></div>`);
  }
  return h;
}

/* ── VISTA DE GUSTAVO, COMO PÁGINA WEB ──────────────────────────────────
   Las mismas 5 pantallas de su celular (gustavoScreenHTML, la misma función
   que usa el celular simulado), pero de ancho completo y sin el marco de
   teléfono — para tenerlas de referencia al construir la app real, sin
   depender de abrir el simulador de celular. */

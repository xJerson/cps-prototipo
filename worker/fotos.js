/* Cloudflare Worker: sube y sirve fotos del prototipo CPS usando un bucket R2.
   Se pega en el editor del Worker (Workers & Pages > el Worker > Edit code).
   Necesita UN binding: R2 bucket con nombre de variable BUCKET.

   POST /subir        cuerpo = bytes de la imagen (image/jpeg|png|webp)  ->  {"url": ".../f/<clave>"}
   GET  /f/<clave>    devuelve la imagen
   GET  /uso          cuánto se lleva gastado de los topes (sin datos privados)

   TOPES PARA NO PASAR DEL PLAN GRATIS. El Worker gratis lo corta Cloudflare solo (100 000 peticiones al día,
   sin cobro). R2 en cambio SÍ cobra al pasarse, así que aquí se bloquean las subidas mucho antes de eso:
     R2 gratis al mes:  10 GB guardados · 1 000 000 de escrituras (Clase A) · 10 000 000 de lecturas (Clase B)
     Cada foto subida gasta 2 escrituras (la foto y el contador). Las lecturas no se pueden pasar: con el tope
     diario del Worker son 3 millones al mes como máximo.
   Al llegar a un tope, responde 429 con {"codigo":"limite"} y NO guarda nada.

   PRODUCCIÓN: sin login cualquiera con la URL puede subir (hasta los topes). En producción se firma cada subida
   por usuario y los contadores viven en una base, no en un archivo (dos subidas simultáneas pueden contarse de menos;
   los topes dejan margen para eso). */
const ORIGENES = ["https://xjerson.github.io", "http://localhost:8811", "http://127.0.0.1:8811"];
const TIPOS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const MAX_BYTES_FOTO = 1024 * 1024;        // 1 MB por foto (el prototipo manda de 150 a 500 KB)
const MAX_FOTOS_DIA = 1500;
const MAX_FOTOS_MES = 20000;               // x2 escrituras = 40 000 de 1 000 000
const MAX_BYTES_TOTAL = 7 * 1024 ** 3;     // 7 GB de los 10 GB gratis
const CLAVE_USO = "_sistema/uso.json";
const CLAVE_FOTO = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

const cors = (req) => {
  const o = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": ORIGENES.includes(o) ? o : ORIGENES[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
};
const json = (req, data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors(req) } });

/* Lee el contador y lo reinicia si cambió el día o el mes. */
async function leerUso(env, ahora) {
  const obj = await env.BUCKET.get(CLAVE_USO);
  let u = {};
  if (obj) { try { u = await obj.json(); } catch (e) { u = {}; } }
  const iso = ahora.toISOString();
  if (u.mes !== iso.slice(0, 7)) { u.mes = iso.slice(0, 7); u.fotosMes = 0; }
  if (u.dia !== iso.slice(0, 10)) { u.dia = iso.slice(0, 10); u.fotosDia = 0; }
  u.fotosMes = u.fotosMes || 0; u.fotosDia = u.fotosDia || 0; u.bytesTotal = u.bytesTotal || 0;
  return u;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });

    if (req.method === "POST" && url.pathname === "/subir") {
      const tipo = (req.headers.get("Content-Type") || "").split(";")[0].trim();
      if (!TIPOS[tipo]) return json(req, { error: "Solo se aceptan imágenes JPG, PNG o WebP." }, 415);
      if ((+req.headers.get("Content-Length") || 0) > MAX_BYTES_FOTO)
        return json(req, { error: "La foto pesa más de 1 MB." }, 413);
      const bytes = await req.arrayBuffer();
      if (!bytes.byteLength) return json(req, { error: "Imagen vacía." }, 400);
      if (bytes.byteLength > MAX_BYTES_FOTO) return json(req, { error: "La foto pesa más de 1 MB." }, 413);

      const uso = await leerUso(env, new Date());
      const motivo = uso.fotosDia >= MAX_FOTOS_DIA ? "dia"
        : uso.fotosMes >= MAX_FOTOS_MES ? "mes"
        : uso.bytesTotal + bytes.byteLength > MAX_BYTES_TOTAL ? "espacio" : null;
      if (motivo) {
        const texto = { dia: "Se llegó al tope de fotos de hoy.", mes: "Se llegó al tope de fotos de este mes.",
          espacio: "Se llenó el espacio gratuito de fotos." }[motivo];
        return json(req, { error: texto + " Se bloquearon las subidas para no salir del plan gratis.", codigo: "limite", motivo }, 429);
      }

      const clave = crypto.randomUUID() + "." + TIPOS[tipo];
      await env.BUCKET.put(clave, bytes, { httpMetadata: { contentType: tipo } });
      uso.fotosDia++; uso.fotosMes++; uso.bytesTotal += bytes.byteLength;
      await env.BUCKET.put(CLAVE_USO, JSON.stringify(uso), { httpMetadata: { contentType: "application/json" } });
      return json(req, { url: url.origin + "/f/" + clave });
    }

    if (req.method === "GET" && url.pathname === "/uso") {
      const u = await leerUso(env, new Date());
      return json(req, {
        fotosHoy: u.fotosDia, topeDia: MAX_FOTOS_DIA,
        fotosMes: u.fotosMes, topeMes: MAX_FOTOS_MES,
        gbUsados: +(u.bytesTotal / 1024 ** 3).toFixed(3), topeGb: +(MAX_BYTES_TOTAL / 1024 ** 3).toFixed(1),
        porcentajeEspacio: +(100 * u.bytesTotal / MAX_BYTES_TOTAL).toFixed(1)
      });
    }

    if (req.method === "GET" && url.pathname.startsWith("/f/")) {
      const clave = decodeURIComponent(url.pathname.slice(3));
      if (!CLAVE_FOTO.test(clave)) return new Response("No existe", { status: 404, headers: cors(req) });
      const obj = await env.BUCKET.get(clave);
      if (!obj) return new Response("No existe", { status: 404, headers: cors(req) });
      const h = new Headers(cors(req));
      obj.writeHttpMetadata(h);
      h.set("Cache-Control", "public, max-age=31536000, immutable");
      h.set("ETag", obj.httpEtag);
      return new Response(obj.body, { headers: h });
    }

    return new Response("CPS fotos", { status: 200, headers: cors(req) });
  }
};

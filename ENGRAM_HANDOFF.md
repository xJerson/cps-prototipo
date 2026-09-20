# Handoff de contexto — CPS Prototipo

Fecha: 2026-09-20

## Estado

- Repositorio: `https://github.com/xJerson/cps-prototipo.git`
- Rama: `main`
- Último commit: `434a1b1 subwo_partial_reassignment`
- Flujo de aprobación del cliente implementado por correo electrónico (sin enlace público).
- El correo se simula en el prototipo; no hay proveedor de email conectado.

## Implementado

- El técnico carga initial finding y fotos post-work.
- Oficina registra el correo enviado con fotos adjuntas.
- La respuesta del cliente se registra con estado, canal, usuario, fecha, hora y texto.
- Nómina/facturación quedan pendientes hasta aprobación o excepción.
- Cada Sub-WO tiene estado operativo independiente.
- El técnico puede registrar avance parcial (por ejemplo 1 de 4 reparaciones).
- El sistema conserva la parte terminada para la nómina del primer técnico.
- El remanente se crea como nueva Sub-WO sin técnico, lista para reasignación.
- La WO principal no se valida mientras existan Sub-WOs pendientes.

## Siguiente paso

Probar visualmente el flujo de técnico: abrir Sub-WO → cargar evidencia → Terminar → indicar cantidad realizada → reasignar el remanente desde oficina.

## Nota de memoria

Engram no está conectado en este entorno. Este archivo funciona como respaldo persistente de contexto para el siguiente agente.

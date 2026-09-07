/**
 * Renderizado genérico de listados en tarjetas y de pestañas dentro de una
 * ficha, reutilizado por todas las páginas de módulo (a través de
 * js/pagina-generica.js). Cada entidad/página solo declara su propia función
 * en js/entidades.js.
 */

/**
 * Clase de badge según el nombre del estado. Genérica para reutilizarla en
 * Vehículos, Ramplas, Contratos y Viajes/Ciclos (cada uno con su propio
 * vocabulario de estados, agrupados aquí en positivo/alerta/negativo/neutro).
 */
function estadoBadgeClase(estado) {
  const positivos = ["Operativo", "Vigente", "Finalizado", "En ruta"];
  const alertas = ["En mantención", "Por iniciar", "Retrasado", "Esperando carga", "Reservado exclusividad", "Detenido autorizado"];
  const negativos = ["Fuera de servicio", "Vencido", "Cancelado", "Detenido no autorizado", "Fuera de ruta"];

  if (positivos.includes(estado)) return "bg-success-subtle text-success-emphasis";
  if (alertas.includes(estado)) return "bg-warning-subtle text-warning-emphasis";
  if (negativos.includes(estado)) return "bg-danger-subtle text-danger-emphasis";
  return "bg-secondary-subtle text-secondary-emphasis";
}

/** Pinta `items` dentro de `#<contenedorId>` usando `plantillaFn(item)` por cada uno. */
function pintarListado(contenedorId, items, plantillaFn, mensajeVacio) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  if (!items || items.length === 0) {
    contenedor.innerHTML = `<p class="text-muted-brand">${mensajeVacio || "No hay registros todavía."}</p>`;
    return;
  }

  contenedor.innerHTML = items.map(plantillaFn).join("");
}

/**
 * Conecta un input de búsqueda (`#<inputId>`) para filtrar `items` por texto,
 * repintando `#<contenedorId>` con `plantillaFn` cada vez que el usuario escribe.
 * `camposFn(item)` debe devolver un arreglo de strings donde buscar.
 */
function activarBuscador(inputId, items, camposFn, contenedorId, plantillaFn, mensajeVacio) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener("input", () => {
    const termino = input.value.trim().toLowerCase();
    const filtrados = items.filter((item) => camposFn(item).join(" ").toLowerCase().includes(termino));
    pintarListado(contenedorId, filtrados, plantillaFn, "No se encontraron registros con ese criterio.");
  });
}

/**
 * Arma pestañas simples dentro de `contenedor`: `tabs` es un arreglo de
 * `{ id, etiqueta, html }`. Pinta la barra de botones + un panel por pestaña
 * (el contenido ya viene armado como HTML) y activa la primera. Reutilizado
 * por la ficha de Cliente (Datos/Contratos/Solicitudes), Contrato
 * (Datos/Rutas) y Viaje (Resumen/Tramos/Gastos/Transferencias).
 */
function pintarPestanas(contenedor, tabs, prefijoId) {
  contenedor.innerHTML = `
    <div class="tabs-nav" role="tablist">
      ${tabs.map((t, i) => `<button type="button" data-tab-btn="${prefijoId}-${t.id}" class="${i === 0 ? "active" : ""}">${t.etiqueta}</button>`).join("")}
    </div>
    ${tabs.map((t, i) => `<div class="tab-panel" id="${prefijoId}-${t.id}" ${i === 0 ? "" : "hidden"}>${t.html}</div>`).join("")}`;

  contenedor.querySelectorAll("[data-tab-btn]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const objetivo = boton.getAttribute("data-tab-btn");
      contenedor.querySelectorAll("[data-tab-btn]").forEach((b) => b.classList.toggle("active", b === boton));
      contenedor.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.hidden = panel.id !== objetivo;
      });
    });
  });
}

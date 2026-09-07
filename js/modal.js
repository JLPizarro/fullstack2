/**
 * Modales de alta/edición y de ficha, implementados a mano con las clases de
 * Bootstrap (`.modal`, `.modal-backdrop`) pero sin depender de
 * `bootstrap.bundle.js` — solo CSS de Bootstrap + este JS propio. Soporta
 * modales anidados (ej. ficha de Contrato abierta desde la ficha de
 * Cliente): cada apertura sube el z-index por encima de lo que ya esté
 * abierto, para que el modal nuevo y su fondo queden siempre arriba.
 */

let zIndiceTope = 1055;

function abrirModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  zIndiceTope += 20;
  modal.style.zIndex = String(zIndiceTope);
  modal.classList.add("show");
  modal.style.display = "block";
  modal.removeAttribute("aria-hidden");
  document.body.classList.add("modal-open");

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop fade show";
  backdrop.style.zIndex = String(zIndiceTope - 10);
  backdrop.dataset.paraModal = id;
  document.body.appendChild(backdrop);
}

function cerrarModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("show");
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
  modal.style.zIndex = "";

  const backdrop = document.querySelector(`.modal-backdrop[data-para-modal="${id}"]`);
  if (backdrop) backdrop.remove();

  if (!document.querySelector(".modal.show")) document.body.classList.remove("modal-open");
}

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("click", (evento) => {
    const botonAbrir = evento.target.closest("[data-abrir-modal]");
    if (botonAbrir) abrirModal(botonAbrir.getAttribute("data-abrir-modal"));

    const botonCerrar = evento.target.closest("[data-cerrar-modal]");
    if (botonCerrar) cerrarModal(botonCerrar.getAttribute("data-cerrar-modal"));
  });
});

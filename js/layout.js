/**
 * Arma el sidebar + topbar + footer (idénticos en toda la plataforma) una
 * sola vez, en vez de que cada página HTML los repita a mano. Cada página
 * solo declara `<body data-page-title="..." data-base="...">` y dos
 * contenedores vacíos (`#app-shell` > `.app-main` > `#app-content`); este
 * script rellena el resto y marca como activo el link que corresponde a la
 * página actual.
 *
 * `data-base` es el prefijo relativo hacia la raíz del sitio: "" en
 * index.html/login.html, "../../" dentro de `modules/<módulo>/página.html`
 * (misma carpeta `modules/<carpeta>/` que usa el frontend real del ERP,
 * ver README) — todos los href/src que este archivo genera (menú, logo,
 * avatar, cerrar sesión) lo anteponen, así el mismo `layout.js` sirve sin
 * importar a qué profundidad esté la página.
 */

const MENU_TCSA = [
  { href: "index.html", icon: "bi-speedometer2", label: "Dashboard" },
  {
    icon: "bi-truck",
    label: "Mantención",
    items: [{ href: "modules/mantencion/vehiculos.html", icon: "bi-truck", label: "Vehículos" }],
  },
  {
    icon: "bi-people",
    label: "RR.LL.",
    items: [{ href: "modules/relaciones-laborales/personal.html", icon: "bi-person-badge", label: "Gestionar personal" }],
  },
  {
    icon: "bi-receipt",
    label: "Facturación",
    items: [
      { href: "modules/facturacion/clientes.html", icon: "bi-building", label: "Clientes" },
      { href: "modules/facturacion/gastos.html", icon: "bi-cash-coin", label: "Gastos" },
      { href: "modules/facturacion/gastos-invariables.html", icon: "bi-receipt-cutoff", label: "Gastos invariables" },
      { href: "modules/facturacion/solicitudes-transferencia.html", icon: "bi-credit-card", label: "Transferencias" },
    ],
  },
  {
    icon: "bi-signpost-split",
    label: "Operación",
    items: [
      { href: "modules/operaciones/viajes.html", icon: "bi-geo-alt", label: "Viajes" },
      { href: "modules/operaciones/preasignacion.html", icon: "bi-person-check", label: "Preasignación" },
      { href: "modules/operaciones/puntos-referencia.html", icon: "bi-pin-map", label: "Puntos de referencia" },
    ],
  },
  { href: "modules/seguridad/usuarios.html", icon: "bi-person-gear", label: "Usuarios" },
];

function baseSitio() {
  return document.body.dataset.base ?? "";
}

function paginaActual() {
  return location.pathname.split("/").pop() || "index.html";
}

function rutaActualRelativa() {
  // "modules/mantencion/vehiculos.html" a partir de la URL real y del prefijo `data-base`
  // (ej. si `data-base` es "../../", la URL vive 2 niveles bajo la raíz) — así se compara
  // en pie de igualdad con los `href` (todos relativos a la raíz) que declara `MENU_TCSA`.
  const profundidad = baseSitio().split("../").length - 1;
  const partes = location.pathname.split("/").filter(Boolean);
  return partes.slice(-1 - profundidad).join("/");
}

function renderizarLinkMenu(item) {
  const activo = item.href === rutaActualRelativa();
  return `<a href="${baseSitio()}${item.href}" class="nav-link${activo ? " active" : ""}"><i class="bi ${item.icon}"></i>${item.label}</a>`;
}

function renderizarMenu() {
  return MENU_TCSA.map((item) => {
    if (!item.items) return renderizarLinkMenu(item);
    const abierto = item.items.some((sub) => sub.href === rutaActualRelativa());
    return `
      <details class="nav-group"${abierto ? " open" : ""}>
        <summary><i class="bi ${item.icon}"></i>${item.label}<i class="bi bi-chevron-down chevron"></i></summary>
        ${item.items.map(renderizarLinkMenu).join("\n        ")}
      </details>`;
  }).join("\n");
}

function sidebarHTML() {
  return `
    <div class="brand">
      <img src="${baseSitio()}assets/img/logo-mono.svg" alt="Consorcio San Antonio Transportes">
    </div>
    <nav>
      ${renderizarMenu()}
    </nav>
    <div class="sidebar-footer">
      <a href="${baseSitio()}login.html"><i class="bi bi-box-arrow-right"></i>Cerrar sesión</a>
    </div>`;
}

function topbarHTML(tituloPagina) {
  return `
    <div class="d-flex align-items-center gap-2">
      <button class="btn btn-sm btn-outline-secondary sidebar-toggle" type="button" aria-label="Abrir menú de navegación">
        <i class="bi bi-list"></i>
      </button>
      <span class="page-title">${tituloPagina}</span>
    </div>
    <div class="user-chip">
      <img src="${baseSitio()}assets/img/avatar.svg" alt="Avatar de Administrador">
      <div class="d-none d-sm-block">
        <div class="fw-semibold small">Administrador</div>
        <div class="text-muted-brand" style="font-size:.75rem;">Administrador</div>
      </div>
    </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  const shell = document.getElementById("app-shell");
  const main = shell ? shell.querySelector(".app-main") : null;
  if (!shell || !main) return;

  const aside = document.createElement("aside");
  aside.className = "app-sidebar";
  aside.id = "sidebar";
  aside.innerHTML = sidebarHTML();
  shell.insertBefore(aside, main);

  const header = document.createElement("header");
  header.className = "app-topbar";
  header.innerHTML = topbarHTML(document.body.dataset.pageTitle || "");
  main.insertBefore(header, main.firstElementChild);

  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.textContent = "© 2026 Consorcio San Antonio Transportes · Plataforma interna de gestión";
  main.appendChild(footer);

  const boton = header.querySelector(".sidebar-toggle");
  boton.addEventListener("click", () => aside.classList.toggle("open"));
  document.addEventListener("click", (evento) => {
    const dentroSidebar = aside.contains(evento.target);
    const esBoton = boton.contains(evento.target);
    if (!dentroSidebar && !esBoton) aside.classList.remove("open");
  });
});

/**
 * Dispatcher único para toda página de módulo: lee `data-pagina` del
 * `<body>` y ejecuta `PAGINAS[esa-clave]()` (declarada en js/entidades.js).
 * Reemplaza a los 4 dispatchers de la fase anterior (listado-generico.js,
 * ficha-generica.js, formulario-generico.js, modal-crud-generico.js): ahora
 * cada página de módulo tiene su propia función porque combina listado +
 * modales + pestañas de forma distinta, no un patrón único repetible.
 */
document.addEventListener("DOMContentLoaded", () => {
  const pagina = document.body.dataset.pagina;
  if (pagina && typeof PAGINAS !== "undefined" && PAGINAS[pagina]) PAGINAS[pagina]();
});

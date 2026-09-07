/**
 * Fuente única de lógica por entidad y por página de módulo, leída por
 * `js/pagina-generica.js` (dispatcher: `PAGINAS[document.body.dataset.pagina]()`).
 *
 * Reorganizado para calcar la estructura real del ERP (`ERP_V1-main/Maqueta ERP/src/modules/*`):
 * pocas páginas por módulo, con la ficha/formulario de cada entidad viviendo como MODAL dentro de
 * su listado (nunca como página aparte) y las entidades "hijas" (Contratos, Rutas, Tarifas,
 * Solicitudes de viaje, Gastos, Transferencias) como pestaña o modal anidado dentro de la ficha de
 * su padre — igual que en `ClienteFicha.jsx`/`ContratoFicha.jsx`/`ViajeFicha.jsx` del sistema real.
 *
 * No hay entidad `Grupo` propia: la lógica de contraturno (2+ conductores titulares del mismo
 * tracto) vive directo en `empleado.vehiculoPreasignadoId`, gestionada desde la página
 * Preasignación — el mismo vehículo puede repetirse en varios empleados a propósito.
 */

const PAGINAS = {};

/* =========================================================================
   Ayudas compartidas por varias páginas
   ========================================================================= */

function nombreEmpleado(e) {
  return e ? `${e.primerNombre} ${e.apellidoPaterno}` : "—";
}

function badgeVencimiento(fecha) {
  const hoy = new Date();
  const limite = new Date(fecha);
  const diffDias = Math.floor((limite - hoy) / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return { clase: "bg-danger-subtle text-danger-emphasis", texto: "Vencida" };
  if (diffDias <= 30) return { clase: "bg-warning-subtle text-warning-emphasis", texto: `Vence en ${diffDias} días` };
  return { clase: "bg-success-subtle text-success-emphasis", texto: "Al día" };
}

function filaDocumento(nombre, fecha) {
  const badge = badgeVencimiento(fecha);
  return `
    <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
      <div>
        <div class="fw-semibold small">${nombre}</div>
        <div class="text-muted-brand small">Vence: ${fecha}</div>
      </div>
      <span class="badge ${badge.clase}">${badge.texto}</span>
    </div>`;
}

function etiquetaRuta(ruta) {
  return ruta ? `${ruta.origen} → ${ruta.destino}` : "Ruta no encontrada";
}

/** Código legible del viaje: "E-0001" (carga de cliente) o "I-0002" (gestión interna). */
function codigoViaje(v) {
  const prefijo = v.motivo === "gestion_interna" ? "I" : "E";
  return `${prefijo}-${String(v.id).padStart(4, "0")}`;
}

/* =========================================================================
   MANTENCIÓN — modules/mantencion/vehiculos.html
   Vehículos y Ramplas en una sola tabla ("Tipo": tracto/camioneta/furgón vs.
   rampla), cada fila abre su propia ficha en modal.
   ========================================================================= */

function filaVehiculo(v) {
  return `
    <tr data-abrir-modal="modal-ficha" data-clase="vehiculo" data-id="${v.id}" style="cursor:pointer;">
      <td class="mono">${v.patente}</td>
      <td>Vehículo</td>
      <td>${v.marca} ${v.modelo}</td>
      <td>${v.anio}</td>
      <td><span class="badge badge-estado ${estadoBadgeClase(v.estado)}">${v.estado}</span></td>
    </tr>`;
}

function filaRampla(r) {
  return `
    <tr data-abrir-modal="modal-ficha" data-clase="rampla" data-id="${r.id}" style="cursor:pointer;">
      <td class="mono">${r.patente}</td>
      <td>Rampla</td>
      <td>${r.ejes} ejes${r.certificada ? " · Certificada" : ""}</td>
      <td>${r.anio}</td>
      <td><span class="badge badge-estado ${estadoBadgeClase(r.estado)}">${r.estado}</span></td>
    </tr>`;
}

function fichaVehiculoHTML(vehiculo) {
  const rampla = vehiculo.ramplaAsignadaId ? obtenerRamplas().find((r) => r.id === vehiculo.ramplaAsignadaId) : null;
  const preasignados = obtenerEmpleados().filter((e) => e.vehiculoPreasignadoId === vehiculo.id);
  return `
    <div class="row g-4">
      <div class="col-lg-5">
        <img src="../../assets/img/truck.svg" alt="Vehículo ${vehiculo.patente}" class="img-fluid rounded-4 border">
      </div>
      <div class="col-lg-7">
        <span class="badge badge-estado ${estadoBadgeClase(vehiculo.estado)} mb-2">${vehiculo.estado}</span>
        <h2 class="h5 mb-1">${vehiculo.patente}</h2>
        <p class="text-muted-brand mb-3">${vehiculo.marca} ${vehiculo.modelo} · Año ${vehiculo.anio}</p>
        <dl class="row mb-0">
          <dt class="col-sm-4 text-muted-brand fw-normal">Conductor asignado</dt>
          <dd class="col-sm-8">${vehiculo.conductor}</dd>
          <dt class="col-sm-4 text-muted-brand fw-normal">Rampla asignada</dt>
          <dd class="col-sm-8">${rampla ? `${rampla.patente} (${rampla.codigo})` : "Sin rampla asignada"}</dd>
          <dt class="col-sm-4 text-muted-brand fw-normal">Conductores titulares</dt>
          <dd class="col-sm-8">${preasignados.length ? preasignados.map(nombreEmpleado).join(", ") : "Sin preasignar — ver Operación → Preasignación"}</dd>
        </dl>
      </div>
    </div>`;
}

function fichaRamplaHTML(rampla) {
  const vehiculoAsignado = obtenerVehiculos().find((v) => v.ramplaAsignadaId === rampla.id);
  return `
    <div class="row g-4">
      <div class="col-lg-5">
        <img src="../../assets/img/truck.svg" alt="Rampla ${rampla.patente}" class="img-fluid rounded-4 border mb-3">
        <div class="nested-card">
          <h3 class="h6 mb-2">Documentación</h3>
          ${filaDocumento("Revisión técnica", rampla.fechaVencimientoRevisionTecnica)}
          ${filaDocumento("Permiso de circulación", rampla.vencimientoPermisoCirculacion)}
          ${filaDocumento("SOAP", rampla.vencimientoSoap)}
        </div>
      </div>
      <div class="col-lg-7">
        <span class="badge badge-estado ${estadoBadgeClase(rampla.estado)} mb-2">${rampla.estado}</span>
        <h2 class="h5 mb-1">${rampla.patente}</h2>
        <p class="text-muted-brand mb-3">Código ${rampla.codigo} · Año ${rampla.anio}</p>
        <dl class="row mb-0">
          <dt class="col-sm-4 text-muted-brand fw-normal">Ejes</dt>
          <dd class="col-sm-8">${rampla.ejes}</dd>
          <dt class="col-sm-4 text-muted-brand fw-normal">Certificación</dt>
          <dd class="col-sm-8">${rampla.certificada ? "Certificada" : "Sin certificar"}</dd>
          <dt class="col-sm-4 text-muted-brand fw-normal">Vehículo asignado</dt>
          <dd class="col-sm-8">${vehiculoAsignado ? `${vehiculoAsignado.patente}` : "Sin vehículo asignado"}</dd>
        </dl>
      </div>
    </div>`;
}

PAGINAS.vehiculos = function () {
  const contenedor = document.getElementById("lista-equipos");
  const buscador = document.getElementById("buscador");

  function pintar(filtro) {
    const vehiculos = obtenerVehiculos();
    const ramplas = obtenerRamplas();
    const termino = (filtro || "").trim().toLowerCase();
    const coincide = (texto) => texto.toLowerCase().includes(termino);

    const filasVehiculos = vehiculos
      .filter((v) => !termino || coincide(`${v.patente} ${v.marca} ${v.modelo} ${v.estado}`))
      .map(filaVehiculo);
    const filasRamplas = ramplas.filter((r) => !termino || coincide(`${r.patente} ${r.estado}`)).map(filaRampla);

    const filas = [...filasVehiculos, ...filasRamplas].join("");
    contenedor.innerHTML = filas || `<tr><td colspan="5" class="text-muted-brand text-center py-4">Sin resultados.</td></tr>`;
  }

  pintar("");
  if (buscador) buscador.addEventListener("input", () => pintar(buscador.value));

  document.getElementById("tabla-equipos").addEventListener("click", (evento) => {
    const fila = evento.target.closest("[data-clase]");
    if (!fila) return;
    const clase = fila.getAttribute("data-clase");
    const id = Number(fila.getAttribute("data-id"));

    const contenedorFicha = document.getElementById("ficha-modal-cuerpo");
    const titulo = document.getElementById("ficha-modal-titulo");
    if (clase === "vehiculo") {
      const vehiculo = obtenerVehiculos().find((v) => v.id === id);
      titulo.textContent = `Ficha del vehículo — ${vehiculo.patente}`;
      contenedorFicha.innerHTML = fichaVehiculoHTML(vehiculo);
    } else {
      const rampla = obtenerRamplas().find((r) => r.id === id);
      titulo.textContent = `Ficha de la rampla — ${rampla.patente}`;
      contenedorFicha.innerHTML = fichaRamplaHTML(rampla);
    }
  });

  document.getElementById("btn-nuevo-vehiculo").addEventListener("click", () => iniciarFormularioVehiculo(null));
  document.getElementById("btn-nueva-rampla").addEventListener("click", () => iniciarFormularioRampla(null));
};

function iniciarFormularioVehiculo(idExistente) {
  const formulario = document.getElementById("form-vehiculo");
  formulario.reset();
  formulario.classList.remove("was-validated");

  const campos = {
    patente: document.getElementById("v-patente"),
    marca: document.getElementById("v-marca"),
    modelo: document.getElementById("v-modelo"),
    anio: document.getElementById("v-anio"),
    estado: document.getElementById("v-estado"),
    conductor: document.getElementById("v-conductor"),
    ramplaAsignadaId: document.getElementById("v-ramplaAsignadaId"),
  };
  Object.values(campos).forEach((input) => limpiarValidacion(input));

  const ANIO_ACTUAL = new Date().getFullYear();
  const PATENTE_REGEX = /^([A-Z]{4}\d{2}|[A-Z]{2}\d{4})$/;
  const vehiculos = obtenerVehiculos();
  const existente = idExistente ? vehiculos.find((v) => v.id === idExistente) : null;

  const ramplasOcupadas = new Set(
    vehiculos.filter((v) => v.ramplaAsignadaId && (!existente || v.id !== existente.id)).map((v) => v.ramplaAsignadaId)
  );
  campos.ramplaAsignadaId.innerHTML =
    '<option value="">Sin rampla asignada</option>' +
    obtenerRamplas()
      .filter((r) => !ramplasOcupadas.has(r.id))
      .map((r) => `<option value="${r.id}">${r.patente} (${r.codigo})</option>`)
      .join("");

  document.getElementById("modal-vehiculo-titulo").textContent = existente ? `Editar ${existente.patente}` : "Añadir vehículo";

  if (existente) {
    campos.patente.value = existente.patente;
    campos.marca.value = existente.marca;
    campos.modelo.value = existente.modelo;
    campos.anio.value = existente.anio;
    campos.estado.value = existente.estado;
    campos.conductor.value = existente.conductor === "—" ? "" : existente.conductor;
    campos.ramplaAsignadaId.value = existente.ramplaAsignadaId || "";
  }

  function validarTodo() {
    const limpio = campos.patente.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    let ok = true;
    if (!campoRequerido(limpio) || !PATENTE_REGEX.test(limpio)) {
      marcarCampo(campos.patente, false, "Formato inválido. Ej: HXKT21 o AB1234.");
      ok = false;
    } else marcarCampo(campos.patente, true);
    if (!campoRequerido(campos.marca.value)) {
      marcarCampo(campos.marca, false, "La marca es obligatoria.");
      ok = false;
    } else marcarCampo(campos.marca, true);
    if (!campoRequerido(campos.modelo.value)) {
      marcarCampo(campos.modelo, false, "El modelo es obligatorio.");
      ok = false;
    } else marcarCampo(campos.modelo, true);
    const anio = Number(campos.anio.value);
    if (Number.isNaN(anio) || anio < 1980 || anio > ANIO_ACTUAL + 1) {
      marcarCampo(campos.anio, false, `Debe estar entre 1980 y ${ANIO_ACTUAL + 1}.`);
      ok = false;
    } else marcarCampo(campos.anio, true);
    if (!campoRequerido(campos.estado.value)) {
      marcarCampo(campos.estado, false, "Selecciona un estado.");
      ok = false;
    } else marcarCampo(campos.estado, true);
    return ok;
  }

  formulario.onsubmit = (evento) => {
    evento.preventDefault();
    if (!validarTodo()) {
      formulario.classList.add("was-validated");
      return;
    }
    const datos = {
      id: existente ? existente.id : siguienteId(vehiculos),
      patente: campos.patente.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
      marca: campos.marca.value.trim(),
      modelo: campos.modelo.value.trim(),
      anio: Number(campos.anio.value),
      estado: campos.estado.value,
      conductor: campos.conductor.value.trim() || "—",
      ramplaAsignadaId: campos.ramplaAsignadaId.value ? Number(campos.ramplaAsignadaId.value) : null,
    };
    guardarVehiculos(existente ? vehiculos.map((v) => (v.id === datos.id ? datos : v)) : [...vehiculos, datos]);
    cerrarModal("modal-vehiculo");
    PAGINAS.vehiculos();
  };

  abrirModal("modal-vehiculo");
}

function iniciarFormularioRampla(idExistente) {
  const formulario = document.getElementById("form-rampla");
  formulario.reset();
  formulario.classList.remove("was-validated");

  const campos = {
    patente: document.getElementById("r-patente"),
    codigo: document.getElementById("r-codigo"),
    anio: document.getElementById("r-anio"),
    ejes: document.getElementById("r-ejes"),
    certificada: document.getElementById("r-certificada"),
    fechaVencimientoRevisionTecnica: document.getElementById("r-fechaVencimientoRevisionTecnica"),
    vencimientoPermisoCirculacion: document.getElementById("r-vencimientoPermisoCirculacion"),
    vencimientoSoap: document.getElementById("r-vencimientoSoap"),
  };
  Object.values(campos).forEach((input) => input.type !== "checkbox" && limpiarValidacion(input));

  const ANIO_ACTUAL = new Date().getFullYear();
  const ramplas = obtenerRamplas();
  const existente = idExistente ? ramplas.find((r) => r.id === idExistente) : null;

  document.getElementById("modal-rampla-titulo").textContent = existente ? `Editar ${existente.patente}` : "Añadir rampla";

  if (existente) {
    campos.patente.value = existente.patente;
    campos.codigo.value = existente.codigo;
    campos.anio.value = existente.anio;
    campos.ejes.value = existente.ejes;
    campos.certificada.checked = existente.certificada;
    campos.fechaVencimientoRevisionTecnica.value = existente.fechaVencimientoRevisionTecnica;
    campos.vencimientoPermisoCirculacion.value = existente.vencimientoPermisoCirculacion;
    campos.vencimientoSoap.value = existente.vencimientoSoap;
  }

  function validarTodo() {
    let ok = true;
    if (!campoRequerido(campos.patente.value)) {
      marcarCampo(campos.patente, false, "La patente es obligatoria.");
      ok = false;
    } else marcarCampo(campos.patente, true);
    if (!campoRequerido(campos.codigo.value)) {
      marcarCampo(campos.codigo, false, "El código es obligatorio.");
      ok = false;
    } else marcarCampo(campos.codigo, true);
    const anio = Number(campos.anio.value);
    if (Number.isNaN(anio) || anio < 1980 || anio > ANIO_ACTUAL + 1) {
      marcarCampo(campos.anio, false, `Debe estar entre 1980 y ${ANIO_ACTUAL + 1}.`);
      ok = false;
    } else marcarCampo(campos.anio, true);
    const ejes = Number(campos.ejes.value);
    if (Number.isNaN(ejes) || ejes < 1 || ejes > 12) {
      marcarCampo(campos.ejes, false, "Debe estar entre 1 y 12.");
      ok = false;
    } else marcarCampo(campos.ejes, true);
    if (!campoRequerido(campos.fechaVencimientoRevisionTecnica.value)) {
      marcarCampo(campos.fechaVencimientoRevisionTecnica, false, "Obligatorio.");
      ok = false;
    } else marcarCampo(campos.fechaVencimientoRevisionTecnica, true);
    if (!campoRequerido(campos.vencimientoPermisoCirculacion.value)) {
      marcarCampo(campos.vencimientoPermisoCirculacion, false, "Obligatorio.");
      ok = false;
    } else marcarCampo(campos.vencimientoPermisoCirculacion, true);
    if (!campoRequerido(campos.vencimientoSoap.value)) {
      marcarCampo(campos.vencimientoSoap, false, "Obligatorio.");
      ok = false;
    } else marcarCampo(campos.vencimientoSoap, true);
    return ok;
  }

  formulario.onsubmit = (evento) => {
    evento.preventDefault();
    if (!validarTodo()) {
      formulario.classList.add("was-validated");
      return;
    }
    const datos = {
      id: existente ? existente.id : siguienteId(ramplas),
      patente: campos.patente.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
      codigo: campos.codigo.value.trim().toUpperCase(),
      anio: Number(campos.anio.value),
      ejes: Number(campos.ejes.value),
      certificada: campos.certificada.checked,
      estado: existente ? existente.estado : "Operativo",
      fechaEmisionRevisionTecnica: existente ? existente.fechaEmisionRevisionTecnica : new Date().toISOString().slice(0, 10),
      fechaVencimientoRevisionTecnica: campos.fechaVencimientoRevisionTecnica.value,
      plantaRevisionTecnica: existente ? existente.plantaRevisionTecnica : "—",
      regionPermisoCirculacion: existente ? existente.regionPermisoCirculacion : "—",
      municipalidadPermisoCirculacion: existente ? existente.municipalidadPermisoCirculacion : "—",
      vencimientoPermisoCirculacion: campos.vencimientoPermisoCirculacion.value,
      vencimientoSoap: campos.vencimientoSoap.value,
    };
    guardarRamplas(existente ? ramplas.map((r) => (r.id === datos.id ? { ...r, ...datos } : r)) : [...ramplas, datos]);
    cerrarModal("modal-rampla");
    PAGINAS.vehiculos();
  };

  abrirModal("modal-rampla");
}

/* =========================================================================
   RELACIONES LABORALES — modules/relaciones-laborales/personal.html
   Empleados; "Gestionar turnos" y "Dotación de hoy" como modales de esta
   misma página (antes turnos.html y asistencia.html).
   ========================================================================= */

function filaEmpleado(e) {
  const vehiculo = e.vehiculoPreasignadoId ? obtenerVehiculos().find((v) => v.id === e.vehiculoPreasignadoId) : null;
  return `
    <tr data-abrir-modal="modal-ficha-empleado" data-id="${e.id}" style="cursor:pointer;">
      <td class="mono">${e.run}</td>
      <td>${e.primerNombre} ${e.apellidoPaterno} ${e.apellidoMaterno}</td>
      <td>${e.cargo}</td>
      <td>${(obtenerTurnos().find((t) => t.id === e.turnoId) || {}).nombre || "—"}</td>
      <td>${vehiculo ? vehiculo.patente : "—"}</td>
    </tr>`;
}

function fichaEmpleadoHTML(empleado) {
  const turno = obtenerTurnos().find((t) => t.id === empleado.turnoId);
  const vehiculo = empleado.vehiculoPreasignadoId ? obtenerVehiculos().find((v) => v.id === empleado.vehiculoPreasignadoId) : null;
  return `
    <div class="row g-4">
      <div class="col-lg-4 text-center">
        <img src="../../assets/img/avatar.svg" alt="Avatar de ${empleado.primerNombre}" style="width:96px;height:96px;" class="rounded-circle mb-3">
        <h2 class="h6 mb-1">${empleado.primerNombre} ${empleado.segundoNombre || ""} ${empleado.apellidoPaterno} ${empleado.apellidoMaterno}</h2>
        <p class="text-muted-brand mb-0">${empleado.cargo}</p>
      </div>
      <div class="col-lg-8">
        <div class="nested-card mb-3">
          <h3 class="h6 mb-3">Datos personales</h3>
          <dl class="row mb-0">
            <dt class="col-sm-4 text-muted-brand fw-normal">RUN</dt>
            <dd class="col-sm-8">${empleado.run}</dd>
            <dt class="col-sm-4 text-muted-brand fw-normal">Teléfono</dt>
            <dd class="col-sm-8">${empleado.telefono}</dd>
            <dt class="col-sm-4 text-muted-brand fw-normal">Fecha de ingreso</dt>
            <dd class="col-sm-8">${empleado.fechaIngreso}</dd>
            <dt class="col-sm-4 text-muted-brand fw-normal">Turno</dt>
            <dd class="col-sm-8">${turno ? turno.nombre : "—"}</dd>
            <dt class="col-sm-4 text-muted-brand fw-normal">Vehículo preasignado</dt>
            <dd class="col-sm-8">${vehiculo ? vehiculo.patente : "Sin vehículo preasignado — ver Operación → Preasignación"}</dd>
          </dl>
        </div>
        ${
          empleado.cargo === "Conductor"
            ? `<div class="nested-card">
                <h3 class="h6 mb-3">Datos de conductor</h3>
                <dl class="row mb-0">
                  <dt class="col-sm-4 text-muted-brand fw-normal">Licencia vence</dt>
                  <dd class="col-sm-8">${empleado.licenciaConducirVencimiento || "—"}</dd>
                  <dt class="col-sm-4 text-muted-brand fw-normal">Certificado Scania</dt>
                  <dd class="col-sm-8">${empleado.certificadoScania ? `Sí (vence ${empleado.vencimientoScania})` : "No"}</dd>
                  <dt class="col-sm-4 text-muted-brand fw-normal">Certificado MAN</dt>
                  <dd class="col-sm-8">${empleado.certificadoMan ? `Sí (vence ${empleado.vencimientoMan})` : "No"}</dd>
                  <dt class="col-sm-4 text-muted-brand fw-normal">Tarjeta de rendición</dt>
                  <dd class="col-sm-8">${empleado.tarjetaRendicionBanco || "—"} · Saldo ${formatearCLP(empleado.tarjetaRendicionSaldo)}</dd>
                </dl>
              </div>`
            : ""
        }
      </div>
    </div>`;
}

PAGINAS.personal = function () {
  function pintar(filtro) {
    const empleados = obtenerEmpleados();
    const termino = (filtro || "").trim().toLowerCase();
    const filtrados = empleados.filter(
      (e) => !termino || `${e.run} ${e.primerNombre} ${e.apellidoPaterno} ${e.cargo}`.toLowerCase().includes(termino)
    );
    document.getElementById("lista-empleados").innerHTML =
      filtrados.map(filaEmpleado).join("") || `<tr><td colspan="5" class="text-muted-brand text-center py-4">Sin resultados.</td></tr>`;
    document.getElementById("kpi-dotacion").textContent = `${obtenerAsistenciasDeHoy().length}/${empleados.length}`;
  }

  pintar("");
  const buscador = document.getElementById("buscador");
  if (buscador) buscador.addEventListener("input", () => pintar(buscador.value));

  document.getElementById("lista-empleados").addEventListener("click", (evento) => {
    const fila = evento.target.closest("[data-id]");
    if (!fila) return;
    const empleado = obtenerEmpleados().find((e) => e.id === Number(fila.getAttribute("data-id")));
    document.getElementById("ficha-empleado-modal-titulo").textContent = `Ficha del empleado — ${nombreEmpleado(empleado)}`;
    document.getElementById("ficha-empleado-modal-cuerpo").innerHTML = fichaEmpleadoHTML(empleado);
  });

  document.getElementById("btn-nuevo-empleado").addEventListener("click", () => iniciarFormularioEmpleado(null));
  document.getElementById("btn-gestionar-turnos").addEventListener("click", iniciarModalTurnos);
  document.getElementById("btn-dotacion-hoy").addEventListener("click", iniciarModalDotacionHoy);
};

function iniciarFormularioEmpleado(idExistente) {
  const formulario = document.getElementById("form-empleado");
  formulario.reset();
  formulario.classList.remove("was-validated");

  const campos = {
    run: document.getElementById("e-run"),
    primerNombre: document.getElementById("e-primerNombre"),
    segundoNombre: document.getElementById("e-segundoNombre"),
    apellidoPaterno: document.getElementById("e-apellidoPaterno"),
    apellidoMaterno: document.getElementById("e-apellidoMaterno"),
    telefono: document.getElementById("e-telefono"),
    fechaIngreso: document.getElementById("e-fechaIngreso"),
    cargo: document.getElementById("e-cargo"),
    turnoId: document.getElementById("e-turnoId"),
    licenciaConducirVencimiento: document.getElementById("e-licenciaConducirVencimiento"),
    certificadoScania: document.getElementById("e-certificadoScania"),
    vencimientoScania: document.getElementById("e-vencimientoScania"),
    certificadoMan: document.getElementById("e-certificadoMan"),
    vencimientoMan: document.getElementById("e-vencimientoMan"),
    tarjetaRendicionBanco: document.getElementById("e-tarjetaRendicionBanco"),
    tarjetaRendicionTipoCuenta: document.getElementById("e-tarjetaRendicionTipoCuenta"),
    tarjetaRendicionNumeroCuenta: document.getElementById("e-tarjetaRendicionNumeroCuenta"),
    tarjetaRendicionEmail: document.getElementById("e-tarjetaRendicionEmail"),
    tarjetaRendicionSaldo: document.getElementById("e-tarjetaRendicionSaldo"),
  };
  const seccionConductor = document.getElementById("e-seccion-conductor");
  Object.values(campos).forEach((input) => input.type !== "checkbox" && limpiarValidacion(input));

  const empleados = obtenerEmpleados();
  const existente = idExistente ? empleados.find((e) => e.id === idExistente) : null;

  campos.cargo.innerHTML = '<option value="" selected disabled>Selecciona un cargo</option>' + CARGOS.map((c) => `<option value="${c}">${c}</option>`).join("");
  campos.turnoId.innerHTML =
    '<option value="" selected disabled>Selecciona un turno</option>' + obtenerTurnos().map((t) => `<option value="${t.id}">${t.nombre}</option>`).join("");
  campos.tarjetaRendicionBanco.innerHTML = '<option value="" selected disabled>Selecciona un banco</option>' + BANCOS_CHILE.map((b) => `<option value="${b}">${b}</option>`).join("");
  campos.tarjetaRendicionTipoCuenta.innerHTML = '<option value="" selected disabled>Selecciona un tipo</option>' + TIPOS_CUENTA.map((t) => `<option value="${t}">${t}</option>`).join("");

  function esConductor() {
    return campos.cargo.value === "Conductor";
  }
  function actualizarSeccion() {
    seccionConductor.classList.toggle("d-none", !esConductor());
  }
  campos.cargo.onchange = actualizarSeccion;

  document.getElementById("modal-empleado-titulo").textContent = existente ? `Editar a ${nombreEmpleado(existente)}` : "Añadir empleado";

  if (existente) {
    campos.run.value = existente.run;
    campos.primerNombre.value = existente.primerNombre;
    campos.segundoNombre.value = existente.segundoNombre || "";
    campos.apellidoPaterno.value = existente.apellidoPaterno;
    campos.apellidoMaterno.value = existente.apellidoMaterno;
    campos.telefono.value = existente.telefono;
    campos.fechaIngreso.value = existente.fechaIngreso;
    campos.cargo.value = existente.cargo;
    campos.turnoId.value = existente.turnoId;
    campos.licenciaConducirVencimiento.value = existente.licenciaConducirVencimiento || "";
    campos.certificadoScania.checked = Boolean(existente.certificadoScania);
    campos.vencimientoScania.value = existente.vencimientoScania || "";
    campos.certificadoMan.checked = Boolean(existente.certificadoMan);
    campos.vencimientoMan.value = existente.vencimientoMan || "";
    campos.tarjetaRendicionBanco.value = existente.tarjetaRendicionBanco || "";
    campos.tarjetaRendicionTipoCuenta.value = existente.tarjetaRendicionTipoCuenta || "";
    campos.tarjetaRendicionNumeroCuenta.value = existente.tarjetaRendicionNumeroCuenta || "";
    campos.tarjetaRendicionEmail.value = existente.tarjetaRendicionEmail || "";
    campos.tarjetaRendicionSaldo.value = existente.tarjetaRendicionSaldo || 0;
  }
  actualizarSeccion();

  function validarTodo() {
    let ok = true;
    const marcar = (campo, cond, msj) => {
      if (!cond) {
        marcarCampo(campo, false, msj);
        ok = false;
      } else marcarCampo(campo, true);
    };
    marcar(campos.run, campoRequerido(campos.run.value) && esRunValido(campos.run.value), "RUN inválido. Ej: 19011022K.");
    marcar(campos.primerNombre, campoRequerido(campos.primerNombre.value), "Obligatorio.");
    marcar(campos.apellidoPaterno, campoRequerido(campos.apellidoPaterno.value), "Obligatorio.");
    marcar(campos.apellidoMaterno, campoRequerido(campos.apellidoMaterno.value), "Obligatorio.");
    marcar(campos.telefono, esTelefonoChilenoValido(campos.telefono.value), "Formato: +56 9 XXXX XXXX.");
    marcar(campos.fechaIngreso, campoRequerido(campos.fechaIngreso.value), "Obligatorio.");
    marcar(campos.cargo, campoRequerido(campos.cargo.value), "Selecciona un cargo.");
    marcar(campos.turnoId, campoRequerido(campos.turnoId.value), "Selecciona un turno.");
    if (esConductor()) {
      marcar(campos.licenciaConducirVencimiento, campoRequerido(campos.licenciaConducirVencimiento.value), "Obligatoria para Conductor.");
      marcar(campos.tarjetaRendicionBanco, campoRequerido(campos.tarjetaRendicionBanco.value), "Selecciona un banco.");
      marcar(campos.tarjetaRendicionTipoCuenta, campoRequerido(campos.tarjetaRendicionTipoCuenta.value), "Selecciona un tipo.");
    }
    return ok;
  }

  formulario.onsubmit = (evento) => {
    evento.preventDefault();
    if (!validarTodo()) {
      formulario.classList.add("was-validated");
      return;
    }
    const conductor = esConductor();
    const datos = {
      id: existente ? existente.id : siguienteId(empleados),
      run: campos.run.value.toUpperCase().replace(/[^0-9K]/gi, ""),
      primerNombre: campos.primerNombre.value.trim(),
      segundoNombre: campos.segundoNombre.value.trim(),
      apellidoPaterno: campos.apellidoPaterno.value.trim(),
      apellidoMaterno: campos.apellidoMaterno.value.trim(),
      telefono: campos.telefono.value.trim(),
      fechaIngreso: campos.fechaIngreso.value,
      cargo: campos.cargo.value,
      turnoId: Number(campos.turnoId.value),
      vehiculoPreasignadoId: existente ? existente.vehiculoPreasignadoId ?? null : null,
      licenciaConducirVencimiento: conductor ? campos.licenciaConducirVencimiento.value : null,
      certificadoScania: conductor ? campos.certificadoScania.checked : false,
      vencimientoScania: conductor && campos.certificadoScania.checked ? campos.vencimientoScania.value : null,
      certificadoMan: conductor ? campos.certificadoMan.checked : false,
      vencimientoMan: conductor && campos.certificadoMan.checked ? campos.vencimientoMan.value : null,
      tarjetaRendicionBanco: conductor ? campos.tarjetaRendicionBanco.value : null,
      tarjetaRendicionTipoCuenta: conductor ? campos.tarjetaRendicionTipoCuenta.value : null,
      tarjetaRendicionNumeroCuenta: conductor ? campos.tarjetaRendicionNumeroCuenta.value.trim() : "",
      tarjetaRendicionEmail: conductor ? campos.tarjetaRendicionEmail.value.trim() : null,
      tarjetaRendicionSaldo: conductor ? Number(campos.tarjetaRendicionSaldo.value) || 0 : 0,
    };
    guardarEmpleados(existente ? empleados.map((e) => (e.id === datos.id ? datos : e)) : [...empleados, datos]);
    cerrarModal("modal-empleado");
    PAGINAS.personal();
  };

  abrirModal("modal-empleado");
}

/* ---- "Gestionar turnos" — modal de personal.html ------------------------ */

const ETIQUETAS_TIPO_TURNO = {
  bloque_horario: "Bloque horario",
  dias_semana: "Días de la semana",
  rango_dias: "Rango de días (rotativo)",
};

function resumenTurno(t) {
  if (t.tipo === "dias_semana") return `${(t.dias || []).join(", ")} · ${t.horaInicio}-${t.horaTermino}`;
  if (t.tipo === "rango_dias") return `${t.diasTrabajo}x${t.diasDescanso} desde ${t.fechaInicioCiclo} · ${t.horaInicio}-${t.horaTermino}`;
  return `Todos los días · ${t.horaInicio}-${t.horaTermino}`;
}

function iniciarModalTurnos() {
  let turnos = obtenerTurnos();

  function pintarLista() {
    document.getElementById("lista-turnos-modal").innerHTML = turnos
      .map(
        (t) => `
      <div class="d-flex justify-content-between align-items-center border-bottom py-2">
        <div>
          <div class="fw-semibold small">${t.nombre}</div>
          <div class="text-muted-brand small">${ETIQUETAS_TIPO_TURNO[t.tipo]} · ${resumenTurno(t)}</div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-primary" data-editar-turno="${t.id}">Editar</button>
      </div>`
      )
      .join("") || '<p class="text-muted-brand small">No hay turnos registrados.</p>';
  }
  pintarLista();

  const contenedorDias = document.getElementById("turno-dias-checkboxes");
  contenedorDias.innerHTML = DIAS_SEMANA.map(
    (dia) => `<div class="form-check"><input class="form-check-input turno-dia" type="checkbox" id="turno-dia-${dia}" value="${dia}"><label class="form-check-label" for="turno-dia-${dia}">${dia}</label></div>`
  ).join("");

  const formulario = document.getElementById("form-turno");
  const campos = {
    id: document.getElementById("turno-id"),
    nombre: document.getElementById("turno-nombre"),
    tipo: document.getElementById("turno-tipo"),
    horaInicio: document.getElementById("turno-horaInicio"),
    horaTermino: document.getElementById("turno-horaTermino"),
    diasTrabajo: document.getElementById("turno-diasTrabajo"),
    diasDescanso: document.getElementById("turno-diasDescanso"),
    fechaInicioCiclo: document.getElementById("turno-fechaInicioCiclo"),
  };
  const seccionDias = document.getElementById("turno-seccion-dias");
  const seccionRango = document.getElementById("turno-seccion-rango");
  const checkboxesDias = () => Array.from(document.querySelectorAll(".turno-dia"));

  function actualizarSecciones() {
    seccionDias.classList.toggle("d-none", campos.tipo.value !== "dias_semana");
    seccionRango.classList.toggle("d-none", campos.tipo.value !== "rango_dias");
  }
  campos.tipo.onchange = actualizarSecciones;

  function limpiarFormulario() {
    formulario.reset();
    formulario.classList.remove("was-validated");
    campos.id.value = "";
    checkboxesDias().forEach((c) => (c.checked = false));
    document.getElementById("turno-form-titulo").textContent = "Nuevo turno";
    actualizarSecciones();
  }
  limpiarFormulario();

  document.getElementById("btn-nuevo-turno").onclick = limpiarFormulario;

  document.getElementById("lista-turnos-modal").onclick = (evento) => {
    const boton = evento.target.closest("[data-editar-turno]");
    if (!boton) return;
    const turno = turnos.find((t) => t.id === Number(boton.getAttribute("data-editar-turno")));
    limpiarFormulario();
    document.getElementById("turno-form-titulo").textContent = "Editar turno";
    campos.id.value = turno.id;
    campos.nombre.value = turno.nombre;
    campos.tipo.value = turno.tipo;
    campos.horaInicio.value = turno.horaInicio;
    campos.horaTermino.value = turno.horaTermino;
    (turno.dias || []).forEach((dia) => {
      const c = document.getElementById(`turno-dia-${dia}`);
      if (c) c.checked = true;
    });
    campos.diasTrabajo.value = turno.diasTrabajo || "";
    campos.diasDescanso.value = turno.diasDescanso || "";
    campos.fechaInicioCiclo.value = turno.fechaInicioCiclo || "";
    actualizarSecciones();
  };

  formulario.onsubmit = (evento) => {
    evento.preventDefault();
    if (!campoRequerido(campos.nombre.value) || !campoRequerido(campos.tipo.value) || !campos.horaInicio.value || !campos.horaTermino.value) {
      formulario.classList.add("was-validated");
      return;
    }
    const tipo = campos.tipo.value;
    const datos = {
      id: campos.id.value ? Number(campos.id.value) : siguienteId(turnos),
      nombre: campos.nombre.value.trim(),
      tipo,
      horaInicio: campos.horaInicio.value,
      horaTermino: campos.horaTermino.value,
      dias: tipo === "dias_semana" ? checkboxesDias().filter((c) => c.checked).map((c) => c.value) : undefined,
      diasTrabajo: tipo === "rango_dias" ? Number(campos.diasTrabajo.value) : undefined,
      diasDescanso: tipo === "rango_dias" ? Number(campos.diasDescanso.value) : undefined,
      fechaInicioCiclo: tipo === "rango_dias" ? campos.fechaInicioCiclo.value : undefined,
    };
    const existe = turnos.some((t) => t.id === datos.id);
    turnos = existe ? turnos.map((t) => (t.id === datos.id ? datos : t)) : [...turnos, datos];
    guardarTurnos(turnos);
    pintarLista();
    limpiarFormulario();
  };

  abrirModal("modal-turnos");
}

/* ---- "Dotación de hoy" — modal de personal.html -------------------------- */

function obtenerAsistenciasDeHoy() {
  const hoy = new Date().toISOString().slice(0, 10);
  return obtenerAsistencias().filter((a) => a.fecha === hoy && a.marcada);
}

function iniciarModalDotacionHoy() {
  const hoy = new Date().toISOString().slice(0, 10);

  function pintar() {
    const empleados = obtenerEmpleados();
    const presentesIds = new Set(obtenerAsistenciasDeHoy().map((a) => a.empleadoId));
    document.getElementById("dotacion-resumen").textContent = `${presentesIds.size} de ${empleados.length} presentes hoy`;
    document.getElementById("lista-dotacion").innerHTML = empleados
      .map((e) => {
        const presente = presentesIds.has(e.id);
        return `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
          <div>
            <div class="fw-semibold small">${nombreEmpleado(e)}</div>
            <div class="text-muted-brand small">${e.cargo}</div>
          </div>
          <button type="button" class="btn btn-sm ${presente ? "btn-outline-secondary" : "btn-success"}" data-toggle-asistencia="${e.id}">
            ${presente ? "Quitar presente" : "Marcar presente"}
          </button>
        </div>`;
      })
      .join("");
  }
  pintar();

  document.getElementById("lista-dotacion").onclick = (evento) => {
    const boton = evento.target.closest("[data-toggle-asistencia]");
    if (!boton) return;
    const empleadoId = Number(boton.getAttribute("data-toggle-asistencia"));
    const asistencias = obtenerAsistencias();
    const yaPresente = obtenerAsistenciasDeHoy().some((a) => a.empleadoId === empleadoId);
    const existente = asistencias.find((a) => a.empleadoId === empleadoId && a.fecha === hoy);
    const actualizadas = existente
      ? asistencias.map((a) => (a === existente ? { ...a, marcada: !yaPresente } : a))
      : [...asistencias, { empleadoId, fecha: hoy, marcada: true }];
    guardarAsistencias(actualizadas);
    pintar();
    PAGINAS.personal();
  };

  abrirModal("modal-dotacion");
}

/* =========================================================================
   FACTURACIÓN — modules/facturacion/clientes.html
   Clientes; ficha con pestañas Datos / Contratos / Solicitudes de viaje.
   Contratos abre, por fila, la ficha de Contrato (modal anidado, pestañas
   Datos / Rutas); Rutas incluye "Gestionar tarifas" (otro modal anidado).
   ========================================================================= */

function filaCliente(c) {
  return `
    <tr data-abrir-modal="modal-ficha-cliente" data-id="${c.id}" style="cursor:pointer;">
      <td class="mono">${c.rut}</td>
      <td>${c.nombre}</td>
      <td><span class="badge bg-primary-subtle text-primary-emphasis">${c.abreviacion}</span></td>
      <td>${c.categorias.join(", ")}</td>
    </tr>`;
}

PAGINAS.clientes = function () {
  function pintar(filtro) {
    const clientes = obtenerClientes();
    const termino = (filtro || "").trim().toLowerCase();
    const filtrados = clientes.filter((c) => !termino || `${c.nombre} ${c.rut} ${c.abreviacion}`.toLowerCase().includes(termino));
    document.getElementById("lista-clientes").innerHTML =
      filtrados.map(filaCliente).join("") || `<tr><td colspan="4" class="text-muted-brand text-center py-4">Sin resultados.</td></tr>`;
  }
  pintar("");
  const buscador = document.getElementById("buscador");
  if (buscador) buscador.addEventListener("input", () => pintar(buscador.value));

  document.getElementById("lista-clientes").addEventListener("click", (evento) => {
    const fila = evento.target.closest("[data-id]");
    if (!fila) return;
    abrirFichaCliente(Number(fila.getAttribute("data-id")));
  });

  document.getElementById("btn-nuevo-cliente").addEventListener("click", () => iniciarFormularioCliente(null));
};

function abrirFichaCliente(clienteId) {
  const cliente = obtenerClientes().find((c) => c.id === clienteId);
  document.getElementById("ficha-cliente-modal-titulo").textContent = cliente.nombre;

  const datosHTML = `
    <dl class="row mb-3">
      <dt class="col-sm-4 text-muted-brand fw-normal">RUT</dt>
      <dd class="col-sm-8">${cliente.rut}</dd>
      <dt class="col-sm-4 text-muted-brand fw-normal">Abreviación</dt>
      <dd class="col-sm-8">${cliente.abreviacion}</dd>
      <dt class="col-sm-4 text-muted-brand fw-normal">Categorías</dt>
      <dd class="col-sm-8">${cliente.categorias.map((cat) => `<span class="badge bg-secondary-subtle text-secondary-emphasis me-1">${cat}</span>`).join("")}</dd>
    </dl>
    <h3 class="h6 mb-2">Turnos del cliente</h3>
    ${
      cliente.turnos.length === 0
        ? '<p class="small text-muted-brand">Sin turnos definidos.</p>'
        : cliente.turnos.map((t) => `<div class="border-bottom py-2"><div class="fw-semibold small">${t.nombre}</div><div class="text-muted-brand small">${t.dias.join(", ")} · ${t.horaInicio}-${t.horaTermino}</div></div>`).join("")
    }
    <button type="button" class="btn btn-primary btn-sm mt-3" id="btn-editar-cliente"><i class="bi bi-pencil-square me-1"></i>Editar cliente</button>`;

  const tabs = [
    { id: "datos", etiqueta: "Datos", html: datosHTML },
    { id: "contratos", etiqueta: "Contratos", html: '<div id="tab-contratos-cuerpo"></div>' },
    { id: "solicitudes", etiqueta: "Solicitudes de viaje", html: '<div id="tab-solicitudes-cuerpo"></div>' },
  ];
  pintarPestanas(document.getElementById("ficha-cliente-modal-cuerpo"), tabs, "cliente-tab");

  document.getElementById("btn-editar-cliente").addEventListener("click", () => iniciarFormularioCliente(cliente.id));
  pintarTabContratos(cliente);
  pintarTabSolicitudes(cliente);
}

function iniciarFormularioCliente(idExistente) {
  const formulario = document.getElementById("form-cliente");
  formulario.reset();
  formulario.classList.remove("was-validated");

  const campos = {
    nombre: document.getElementById("c-nombre"),
    abreviacion: document.getElementById("c-abreviacion"),
    rut: document.getElementById("c-rut"),
  };
  Object.values(campos).forEach(limpiarValidacion);

  const contenedorCategorias = document.getElementById("cliente-categorias");
  contenedorCategorias.innerHTML = CATEGORIAS_CLIENTE.map(
    (cat) => `<div class="form-check"><input class="form-check-input cliente-categoria" type="checkbox" id="categoria-${cat}" value="${cat}"><label class="form-check-label" for="categoria-${cat}">${cat}</label></div>`
  ).join("");

  const clientes = obtenerClientes();
  const existente = idExistente ? clientes.find((c) => c.id === idExistente) : null;

  document.getElementById("modal-cliente-titulo").textContent = existente ? `Editar ${existente.nombre}` : "Añadir cliente";

  if (existente) {
    campos.nombre.value = existente.nombre;
    campos.abreviacion.value = existente.abreviacion;
    campos.rut.value = existente.rut;
    existente.categorias.forEach((cat) => {
      const c = document.getElementById(`categoria-${cat}`);
      if (c) c.checked = true;
    });
  }

  formulario.onsubmit = (evento) => {
    evento.preventDefault();
    let ok = true;
    if (!campoRequerido(campos.nombre.value)) {
      marcarCampo(campos.nombre, false, "Obligatorio.");
      ok = false;
    } else marcarCampo(campos.nombre, true);
    if (!campoRequerido(campos.abreviacion.value)) {
      marcarCampo(campos.abreviacion, false, "Obligatorio.");
      ok = false;
    } else marcarCampo(campos.abreviacion, true);
    if (!esRutValido(campos.rut.value)) {
      marcarCampo(campos.rut, false, "RUT inválido. Formato: 12345678-9.");
      ok = false;
    } else marcarCampo(campos.rut, true);
    if (!ok) {
      formulario.classList.add("was-validated");
      return;
    }

    const categorias = Array.from(document.querySelectorAll(".cliente-categoria:checked")).map((c) => c.value);
    const datos = {
      id: existente ? existente.id : siguienteId(clientes),
      nombre: campos.nombre.value.trim(),
      abreviacion: campos.abreviacion.value.trim().toUpperCase(),
      rut: campos.rut.value.trim(),
      categorias,
      turnos: existente ? existente.turnos : [],
    };
    guardarClientes(existente ? clientes.map((c) => (c.id === datos.id ? datos : c)) : [...clientes, datos]);
    cerrarModal("modal-cliente");
    PAGINAS.clientes();
    if (existente) abrirFichaCliente(datos.id);
  };

  abrirModal("modal-cliente");
}

/* ---- pestaña Contratos (dentro de la ficha de Cliente) -------------------- */

function pintarTabContratos(cliente) {
  const contratos = obtenerContratos().filter((c) => c.clienteId === cliente.id);
  const cuerpo = document.getElementById("tab-contratos-cuerpo");
  cuerpo.innerHTML = `
    <div class="d-flex justify-content-end mb-2">
      <button type="button" class="btn btn-primary btn-sm" id="btn-nuevo-contrato"><i class="bi bi-plus-lg me-1"></i>Nuevo contrato</button>
    </div>
    <table class="mini-table">
      <thead><tr><th>Nombre</th><th>Vigencia</th><th>Exclusivo</th><th>Estado</th></tr></thead>
      <tbody>
        ${
          contratos.length === 0
            ? '<tr><td colspan="4" class="text-muted-brand">Este cliente aún no tiene contratos.</td></tr>'
            : contratos
                .map((c) => {
                  const estado = estadoContrato(c);
                  return `<tr data-abrir-contrato="${c.id}" style="cursor:pointer;">
                    <td>${c.nombre}</td><td>${c.fechaInicio} → ${c.fechaTermino}</td>
                    <td>${c.exclusivo ? "Sí" : "No"}</td>
                    <td><span class="badge badge-estado ${estadoBadgeClase(estado)}">${estado}</span></td>
                  </tr>`;
                })
                .join("")
        }
      </tbody>
    </table>`;

  cuerpo.querySelector("#btn-nuevo-contrato").addEventListener("click", () => iniciarFormularioContrato(cliente, null));
  cuerpo.querySelectorAll("[data-abrir-contrato]").forEach((fila) => {
    fila.addEventListener("click", () => abrirFichaContrato(Number(fila.getAttribute("data-abrir-contrato")), cliente));
  });
}

function iniciarFormularioContrato(cliente, idExistente) {
  const formulario = document.getElementById("form-contrato");
  formulario.reset();
  formulario.classList.remove("was-validated");

  const campos = {
    nombre: document.getElementById("co-nombre"),
    fechaInicio: document.getElementById("co-fechaInicio"),
    fechaTermino: document.getElementById("co-fechaTermino"),
    exclusivo: document.getElementById("co-exclusivo"),
    cantidadVehiculosExclusividad: document.getElementById("co-cantidadVehiculosExclusividad"),
    tieneCompromiso: document.getElementById("co-tieneCompromiso"),
    tipoCompromisoTonelaje: document.getElementById("co-tipoCompromisoTonelaje"),
    tipoCompromisoViajes: document.getElementById("co-tipoCompromisoViajes"),
    toneladasComprometidas: document.getElementById("co-toneladasComprometidas"),
    viajesComprometidos: document.getElementById("co-viajesComprometidos"),
  };
  const seccionExclusivo = document.getElementById("co-seccion-exclusivo");
  const seccionCompromiso = document.getElementById("co-seccion-compromiso");
  const campoToneladas = document.getElementById("co-campo-toneladas");
  const campoViajes = document.getElementById("co-campo-viajes");
  const contenedorTiposCarga = document.getElementById("contrato-tipos-carga");
  Object.values(campos).forEach((input) => input.type !== "checkbox" && input.type !== "radio" && limpiarValidacion(input));

  contenedorTiposCarga.innerHTML = TIPOS_CARGA.map(
    (tipo) => `<div class="form-check"><input class="form-check-input contrato-tipo-carga" type="checkbox" id="tipo-carga-${tipo}" value="${tipo}"><label class="form-check-label" for="tipo-carga-${tipo}">${tipo}</label></div>`
  ).join("");

  function actualizarExclusivo() {
    seccionExclusivo.classList.toggle("d-none", !campos.exclusivo.checked);
  }
  function actualizarCompromiso() {
    seccionCompromiso.classList.toggle("d-none", !campos.tieneCompromiso.checked);
  }
  function actualizarTipoCompromiso() {
    campoToneladas.classList.toggle("d-none", !campos.tipoCompromisoTonelaje.checked);
    campoViajes.classList.toggle("d-none", campos.tipoCompromisoTonelaje.checked);
  }
  campos.exclusivo.onchange = actualizarExclusivo;
  campos.tieneCompromiso.onchange = actualizarCompromiso;
  campos.tipoCompromisoTonelaje.onchange = actualizarTipoCompromiso;
  campos.tipoCompromisoViajes.onchange = actualizarTipoCompromiso;

  const contratos = obtenerContratos();
  const existente = idExistente ? contratos.find((c) => c.id === idExistente) : null;
  document.getElementById("modal-contrato-titulo").textContent = existente ? `Editar ${existente.nombre}` : `Nuevo contrato — ${cliente.nombre}`;

  if (existente) {
    campos.nombre.value = existente.nombre;
    campos.fechaInicio.value = existente.fechaInicio;
    campos.fechaTermino.value = existente.fechaTermino;
    existente.tiposCarga.forEach((tipo) => {
      const c = document.getElementById(`tipo-carga-${tipo}`);
      if (c) c.checked = true;
    });
    campos.exclusivo.checked = existente.exclusivo;
    campos.cantidadVehiculosExclusividad.value = existente.cantidadVehiculosExclusividad || "";
    campos.tieneCompromiso.checked = existente.tieneCompromiso;
    if (existente.tipoCompromiso === "tonelaje") campos.tipoCompromisoTonelaje.checked = true;
    if (existente.tipoCompromiso === "viajes") campos.tipoCompromisoViajes.checked = true;
    campos.toneladasComprometidas.value = existente.toneladasComprometidas || "";
    campos.viajesComprometidos.value = existente.viajesComprometidos || "";
  }
  actualizarExclusivo();
  actualizarCompromiso();
  actualizarTipoCompromiso();

  formulario.onsubmit = (evento) => {
    evento.preventDefault();
    let ok = true;
    if (!campoRequerido(campos.nombre.value)) {
      marcarCampo(campos.nombre, false, "Obligatorio.");
      ok = false;
    } else marcarCampo(campos.nombre, true);
    if (!campos.fechaInicio.value || !campos.fechaTermino.value || campos.fechaTermino.value < campos.fechaInicio.value) {
      marcarCampo(campos.fechaTermino, false, "Debe ser igual o posterior al inicio.");
      ok = false;
    } else marcarCampo(campos.fechaTermino, true);
    const tiposCarga = Array.from(document.querySelectorAll(".contrato-tipo-carga:checked")).map((c) => c.value);
    if (tiposCarga.length === 0) ok = false;
    if (!ok) {
      formulario.classList.add("was-validated");
      return;
    }

    const datos = {
      id: existente ? existente.id : siguienteId(contratos),
      nombre: campos.nombre.value.trim(),
      clienteId: cliente.id,
      fechaInicio: campos.fechaInicio.value,
      fechaTermino: campos.fechaTermino.value,
      tiposCarga,
      exclusivo: campos.exclusivo.checked,
      cantidadVehiculosExclusividad: campos.exclusivo.checked ? Number(campos.cantidadVehiculosExclusividad.value) || null : null,
      vehiculosComprometidos: existente ? existente.vehiculosComprometidos : [],
      ramplasComprometidas: existente ? existente.ramplasComprometidas : [],
      tieneCompromiso: campos.tieneCompromiso.checked,
      tipoCompromiso: campos.tieneCompromiso.checked ? (campos.tipoCompromisoTonelaje.checked ? "tonelaje" : "viajes") : null,
      toneladasComprometidas: campos.tieneCompromiso.checked && campos.tipoCompromisoTonelaje.checked ? Number(campos.toneladasComprometidas.value) || null : null,
      viajesComprometidos: campos.tieneCompromiso.checked && campos.tipoCompromisoViajes.checked ? Number(campos.viajesComprometidos.value) || null : null,
    };
    guardarContratos(existente ? contratos.map((c) => (c.id === datos.id ? datos : c)) : [...contratos, datos]);
    cerrarModal("modal-contrato");
    pintarTabContratos(cliente);
  };

  abrirModal("modal-contrato");
}

/* ---- Ficha de Contrato (modal anidado desde Contratos) -------------------- */

function abrirFichaContrato(contratoId, cliente) {
  const contrato = obtenerContratos().find((c) => c.id === contratoId);
  document.getElementById("ficha-contrato-modal-titulo").textContent = contrato.nombre;

  const estado = estadoContrato(contrato);
  const datosHTML = `
    <span class="badge badge-estado ${estadoBadgeClase(estado)} mb-2">${estado}</span>
    <dl class="row mb-3">
      <dt class="col-sm-4 text-muted-brand fw-normal">Vigencia</dt>
      <dd class="col-sm-8">${contrato.fechaInicio} → ${contrato.fechaTermino}</dd>
      <dt class="col-sm-4 text-muted-brand fw-normal">Tipos de carga</dt>
      <dd class="col-sm-8">${contrato.tiposCarga.join(", ")}</dd>
      <dt class="col-sm-4 text-muted-brand fw-normal">Exclusividad</dt>
      <dd class="col-sm-8">${contrato.exclusivo ? `Sí — ${contrato.cantidadVehiculosExclusividad || "—"} vehículo(s)` : "No"}</dd>
      <dt class="col-sm-4 text-muted-brand fw-normal">Compromiso</dt>
      <dd class="col-sm-8">${
        contrato.tieneCompromiso
          ? contrato.tipoCompromiso === "tonelaje"
            ? `${contrato.toneladasComprometidas} toneladas`
            : `${contrato.viajesComprometidos} viajes`
          : "Sin compromiso"
      }</dd>
    </dl>
    <button type="button" class="btn btn-primary btn-sm" id="btn-editar-contrato"><i class="bi bi-pencil-square me-1"></i>Editar contrato</button>`;

  const tabs = [
    { id: "datos", etiqueta: "Datos", html: datosHTML },
    { id: "rutas", etiqueta: "Rutas", html: '<div id="tab-rutas-cuerpo"></div>' },
  ];
  pintarPestanas(document.getElementById("ficha-contrato-modal-cuerpo"), tabs, "contrato-tab");

  document.getElementById("btn-editar-contrato").addEventListener("click", () => iniciarFormularioContrato(cliente, contrato.id));
  pintarTabRutas(contrato);

  abrirModal("modal-ficha-contrato");
}

/* ---- pestaña Rutas (dentro de la ficha de Contrato) ------------------------ */

function pintarTabRutas(contrato) {
  const rutas = obtenerRutas().filter((r) => r.contratoId === contrato.id);
  const tarifas = obtenerTarifas();
  const cuerpo = document.getElementById("tab-rutas-cuerpo");
  cuerpo.innerHTML = `
    <div class="d-flex justify-content-end gap-2 mb-2">
      <button type="button" class="btn btn-outline-primary btn-sm" id="btn-gestionar-tarifas"><i class="bi bi-tag me-1"></i>Gestionar tarifas</button>
      <button type="button" class="btn btn-primary btn-sm" id="btn-agregar-ruta"><i class="bi bi-plus-lg me-1"></i>Agregar ruta</button>
    </div>
    ${
      rutas.length === 0
        ? '<p class="text-muted-brand small">Este contrato todavía no tiene rutas.</p>'
        : rutas
            .map((r) => {
              const tarifasRuta = tarifas.filter((t) => t.trayectoId === r.id);
              return `<div class="nested-card mb-2">
                <div class="d-flex justify-content-between small fw-semibold"><span>${r.origen} → ${r.destino}</span><span class="text-muted-brand">${r.distanciaKm} km · ${r.duracionEstimadaMin} min</span></div>
                <div class="mt-2 d-flex flex-wrap gap-1">
                  ${contrato.tiposCarga
                    .map((tipo) => {
                      const tarifa = tarifasRuta.find((t) => t.tipoCarga === tipo);
                      return `<span class="badge ${tarifa ? "bg-success-subtle text-success-emphasis" : "bg-secondary-subtle text-secondary-emphasis"}">${tipo}: ${tarifa ? formatearCLP(tarifa.monto) : "sin tarifa"}</span>`;
                    })
                    .join("")}
                </div>
              </div>`;
            })
            .join("")
    }`;

  cuerpo.querySelector("#btn-agregar-ruta").addEventListener("click", () => iniciarFormularioRuta(contrato));
  cuerpo.querySelector("#btn-gestionar-tarifas").addEventListener("click", () => iniciarModalTarifas(contrato));
}

function iniciarFormularioRuta(contrato) {
  const formulario = document.getElementById("form-ruta");
  formulario.reset();
  formulario.classList.remove("was-validated");
  const campos = {
    origen: document.getElementById("ru-origen"),
    destino: document.getElementById("ru-destino"),
    duracionEstimadaMin: document.getElementById("ru-duracionEstimadaMin"),
    distanciaKm: document.getElementById("ru-distanciaKm"),
  };
  Object.values(campos).forEach(limpiarValidacion);
  document.getElementById("modal-ruta-titulo").textContent = `Agregar ruta — ${contrato.nombre}`;

  formulario.onsubmit = (evento) => {
    evento.preventDefault();
    let ok = true;
    if (!campoRequerido(campos.origen.value)) {
      marcarCampo(campos.origen, false, "Obligatorio.");
      ok = false;
    } else marcarCampo(campos.origen, true);
    if (!campoRequerido(campos.destino.value)) {
      marcarCampo(campos.destino, false, "Obligatorio.");
      ok = false;
    } else marcarCampo(campos.destino, true);
    if (!montoPositivo(campos.duracionEstimadaMin.value, 10000)) {
      marcarCampo(campos.duracionEstimadaMin, false, "Mayor a 0, hasta 10.000 min.");
      ok = false;
    } else marcarCampo(campos.duracionEstimadaMin, true);
    if (!montoPositivo(campos.distanciaKm.value, 20000)) {
      marcarCampo(campos.distanciaKm, false, "Mayor a 0, hasta 20.000 km.");
      ok = false;
    } else marcarCampo(campos.distanciaKm, true);
    if (!ok) {
      formulario.classList.add("was-validated");
      return;
    }
    const rutas = obtenerRutas();
    const nuevaRuta = {
      id: siguienteId(rutas),
      origen: campos.origen.value.trim(),
      destino: campos.destino.value.trim(),
      duracionEstimadaMin: Number(campos.duracionEstimadaMin.value),
      distanciaKm: Number(campos.distanciaKm.value),
      contratoId: contrato.id,
    };
    guardarRutas([...rutas, nuevaRuta]);
    cerrarModal("modal-ruta");
    pintarTabRutas(contrato);
  };

  abrirModal("modal-ruta");
}

/* ---- "Gestionar tarifas" — modal anidado desde Rutas ---------------------- */

function iniciarModalTarifas(contrato) {
  let tarifas = obtenerTarifas();
  const rutas = obtenerRutas().filter((r) => r.contratoId === contrato.id);

  function pintarLista() {
    document.getElementById("lista-tarifas-modal").innerHTML = rutas
      .flatMap((r) => contrato.tiposCarga.map((tipo) => ({ ruta: r, tipo, tarifa: tarifas.find((t) => t.trayectoId === r.id && t.tipoCarga === tipo) })))
      .map(
        ({ ruta, tipo, tarifa }) => `
      <div class="d-flex justify-content-between align-items-center border-bottom py-2">
        <div>
          <div class="fw-semibold small">${ruta.origen} → ${ruta.destino}</div>
          <div class="text-muted-brand small">${tipo}</div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="small">${tarifa ? formatearCLP(tarifa.monto) : "sin tarifa"}</span>
          <button type="button" class="btn btn-sm btn-outline-primary" data-editar-tarifa="${ruta.id}|${tipo}">Editar</button>
        </div>
      </div>`
      )
      .join("");
  }
  pintarLista();

  const formulario = document.getElementById("form-tarifa");
  const campoMonto = document.getElementById("tarifa-monto");
  const tituloForm = document.getElementById("tarifa-form-titulo");
  let rutaIdActual = null;
  let tipoActual = null;

  document.getElementById("lista-tarifas-modal").onclick = (evento) => {
    const boton = evento.target.closest("[data-editar-tarifa]");
    if (!boton) return;
    const [rutaId, tipo] = boton.getAttribute("data-editar-tarifa").split("|");
    rutaIdActual = Number(rutaId);
    tipoActual = tipo;
    const ruta = rutas.find((r) => r.id === rutaIdActual);
    const tarifa = tarifas.find((t) => t.trayectoId === rutaIdActual && t.tipoCarga === tipoActual);
    tituloForm.textContent = `${ruta.origen} → ${ruta.destino} · ${tipo}`;
    campoMonto.value = tarifa ? tarifa.monto : "";
    limpiarValidacion(campoMonto);
  };

  formulario.onsubmit = (evento) => {
    evento.preventDefault();
    if (rutaIdActual === null) return;
    if (!montoPositivo(campoMonto.value, 999999999999)) {
      marcarCampo(campoMonto, false, "Ingresa un monto mayor a 0.");
      formulario.classList.add("was-validated");
      return;
    }
    marcarCampo(campoMonto, true);
    const existente = tarifas.find((t) => t.trayectoId === rutaIdActual && t.tipoCarga === tipoActual);
    const datos = { id: existente ? existente.id : siguienteId(tarifas), trayectoId: rutaIdActual, tipoCarga: tipoActual, monto: Number(campoMonto.value) };
    tarifas = existente ? tarifas.map((t) => (t.id === datos.id ? datos : t)) : [...tarifas, datos];
    guardarTarifas(tarifas);
    pintarLista();
    tituloForm.textContent = "Selecciona una ruta y tipo de carga para editar su tarifa";
    campoMonto.value = "";
    rutaIdActual = null;
  };

  abrirModal("modal-tarifas");
}

/* ---- pestaña Solicitudes de viaje (dentro de la ficha de Cliente) --------- */

function pintarTabSolicitudes(cliente) {
  const solicitudes = obtenerViajesSolicitados().filter((s) => s.clienteId === cliente.id && !s.viajeCreadoId);
  const cuerpo = document.getElementById("tab-solicitudes-cuerpo");
  cuerpo.innerHTML = `
    <div class="d-flex justify-content-end mb-2">
      <button type="button" class="btn btn-primary btn-sm" id="btn-nueva-solicitud"><i class="bi bi-plus-lg me-1"></i>Nueva solicitud</button>
    </div>
    <table class="mini-table">
      <thead><tr><th>Ruta</th><th>Tipo de carga</th><th>Monto</th><th>Presentación</th><th></th></tr></thead>
      <tbody>
        ${
          solicitudes.length === 0
            ? '<tr><td colspan="5" class="text-muted-brand">Este cliente aún no tiene solicitudes.</td></tr>'
            : solicitudes
                .map((s) => {
                  const ruta = obtenerRutas().find((r) => r.id === s.rutaId);
                  return `<tr>
                    <td>${etiquetaRuta(ruta)}</td><td>${s.tipoCarga}</td>
                    <td>${s.monto != null ? formatearCLP(s.monto) : "—"}</td>
                    <td>${s.fechaPresentacion}</td>
                    <td><a class="btn btn-sm btn-outline-primary" href="../operaciones/viajes.html?solicitud=${s.id}">Convertir en viaje</a></td>
                  </tr>`;
                })
                .join("")
        }
      </tbody>
    </table>`;

  cuerpo.querySelector("#btn-nueva-solicitud").addEventListener("click", () => iniciarFormularioSolicitud(cliente));
}

function iniciarFormularioSolicitud(cliente) {
  const formulario = document.getElementById("form-solicitud");
  formulario.reset();
  formulario.classList.remove("was-validated");
  const campos = {
    rutaId: document.getElementById("s-rutaId"),
    tipoCarga: document.getElementById("s-tipoCarga"),
    prioridad: document.getElementById("s-prioridad"),
    tonelajeRequerido: document.getElementById("s-tonelajeRequerido"),
    numeroContacto: document.getElementById("s-numeroContacto"),
    fechaPresentacion: document.getElementById("s-fechaPresentacion"),
    horaPresentacion: document.getElementById("s-horaPresentacion"),
    ubicacionCarga: document.getElementById("s-ubicacionCarga"),
    monto: document.getElementById("s-monto"),
  };
  Object.values(campos).forEach(limpiarValidacion);

  campos.rutaId.innerHTML =
    '<option value="" selected disabled>Selecciona una ruta</option>' +
    obtenerRutas()
      .filter((r) => r.contratoId && obtenerContratos().find((c) => c.id === r.contratoId)?.clienteId === cliente.id)
      .map((r) => `<option value="${r.id}">${r.origen} → ${r.destino}</option>`)
      .join("");
  campos.tipoCarga.innerHTML = '<option value="" selected disabled>Selecciona un tipo de carga</option>' + TIPOS_CARGA.map((t) => `<option value="${t}">${t}</option>`).join("");
  campos.prioridad.innerHTML = '<option value="" selected disabled>Selecciona una prioridad</option>' + PRIORIDADES_VIAJE.map((p) => `<option value="${p}">${p}</option>`).join("");

  document.getElementById("modal-solicitud-titulo").textContent = `Nueva solicitud — ${cliente.nombre}`;

  formulario.onsubmit = (evento) => {
    evento.preventDefault();
    let ok = true;
    if (!campoRequerido(campos.rutaId.value)) {
      marcarCampo(campos.rutaId, false, "Selecciona una ruta.");
      ok = false;
    } else marcarCampo(campos.rutaId, true);
    if (!esTelefonoChilenoValido(campos.numeroContacto.value)) {
      marcarCampo(campos.numeroContacto, false, "Formato: +56 9 XXXX XXXX.");
      ok = false;
    } else marcarCampo(campos.numeroContacto, true);
    if (!campos.fechaPresentacion.value) {
      marcarCampo(campos.fechaPresentacion, false, "Obligatoria.");
      ok = false;
    } else marcarCampo(campos.fechaPresentacion, true);
    if (!campoRequerido(campos.ubicacionCarga.value)) {
      marcarCampo(campos.ubicacionCarga, false, "Obligatoria.");
      ok = false;
    } else marcarCampo(campos.ubicacionCarga, true);
    if (!ok) {
      formulario.classList.add("was-validated");
      return;
    }
    const solicitudes = obtenerViajesSolicitados();
    const nueva = {
      id: siguienteId(solicitudes),
      clienteId: cliente.id,
      prioridad: campos.prioridad.value,
      tonelajeRequerido: Number(campos.tonelajeRequerido.value) || null,
      numeroContacto: campos.numeroContacto.value.trim(),
      tipoCarga: campos.tipoCarga.value,
      rutaId: Number(campos.rutaId.value),
      fechaPresentacion: campos.fechaPresentacion.value,
      horaPresentacion: campos.horaPresentacion.value,
      ubicacionCarga: campos.ubicacionCarga.value.trim(),
      monto: campos.monto.value ? Number(campos.monto.value) : null,
      viajeCreadoId: null,
    };
    guardarViajesSolicitados([...solicitudes, nueva]);
    cerrarModal("modal-solicitud");
    pintarTabSolicitudes(cliente);
  };

  abrirModal("modal-solicitud");
}

/* =========================================================================
   FACTURACIÓN — modules/facturacion/gastos.html
   Listado de solo lectura + filtro: el alta ahora vive en la ficha del
   Viaje (pestaña Gastos) — un gasto siempre nace ligado a un viaje puntual.
   ========================================================================= */

function filaGastoSoloLectura(g) {
  const viaje = obtenerViajes().find((v) => v.id === g.viajeId);
  return `
    <tr>
      <td>${viaje ? codigoViaje(viaje) : "—"}</td>
      <td>${g.categoria}</td>
      <td>${g.proveedor}</td>
      <td>${g.fecha}</td>
      <td class="text-end">${formatearCLP(g.monto)}</td>
    </tr>`;
}

PAGINAS.gastos = function () {
  function pintar(filtro) {
    const gastos = obtenerGastos();
    const termino = (filtro || "").trim().toLowerCase();
    const filtrados = gastos.filter((g) => !termino || `${g.categoria} ${g.proveedor} ${g.descripcion}`.toLowerCase().includes(termino));
    document.getElementById("lista-gastos").innerHTML =
      filtrados.map(filaGastoSoloLectura).join("") || `<tr><td colspan="5" class="text-muted-brand text-center py-4">Sin gastos registrados.</td></tr>`;
    document.getElementById("gastos-total").textContent = formatearCLP(filtrados.reduce((suma, g) => suma + g.monto, 0));
  }
  pintar("");
  const buscador = document.getElementById("buscador");
  if (buscador) buscador.addEventListener("input", () => pintar(buscador.value));
};

/* =========================================================================
   FACTURACIÓN — modules/facturacion/gastos-invariables.html
   Catálogo de costos fijos reutilizables, aplicables a una o varias rutas.
   ========================================================================= */

function plantillaGastoInvariable(g) {
  const rutas = obtenerRutas().filter((r) => (g.rutasIds || []).includes(r.id));
  return `
    <div class="col-sm-6 col-lg-4">
      <article class="entity-card p-3 fade-in">
        <div class="d-flex justify-content-between align-items-start mb-1">
          <h2 class="h6 mb-0">${g.nombre}</h2>
          <span class="fw-semibold">${formatearCLP(g.monto)}</span>
        </div>
        <p class="small text-muted-brand mb-1">${g.categoria} · ${g.proveedor}</p>
        <p class="small mb-3">${rutas.length ? `${rutas.length} ruta(s) asociada(s)` : "Sin rutas asociadas"}</p>
        <button type="button" class="btn btn-outline-primary btn-sm w-100" data-editar-gasto-invariable="${g.id}" data-abrir-modal="modal-gasto-invariable">
          <i class="bi bi-pencil-square me-1"></i>Editar
        </button>
      </article>
    </div>`;
}

PAGINAS.gastosInvariables = function () {
  let gastosInvariables = obtenerGastosInvariables();
  pintarListado("lista-gastos-invariables", gastosInvariables, plantillaGastoInvariable, "No hay gastos invariables registrados.");

  document.getElementById("gasto-invariable-categoria").innerHTML =
    '<option value="" selected disabled>Selecciona una categoría</option>' + CATEGORIAS_GASTO.map((c) => `<option value="${c}">${c}</option>`).join("");

  const contenedorRutas = document.getElementById("gasto-invariable-rutas");
  const rutas = obtenerRutas();
  contenedorRutas.innerHTML = rutas
    .map((r) => `<div class="form-check"><input class="form-check-input gasto-invariable-ruta" type="checkbox" id="gir-${r.id}" value="${r.id}"><label class="form-check-label" for="gir-${r.id}">${r.origen} → ${r.destino}</label></div>`)
    .join("");

  const formulario = document.getElementById("form-gasto-invariable");
  const campos = {
    id: document.getElementById("gasto-invariable-id"),
    nombre: document.getElementById("gasto-invariable-nombre"),
    categoria: document.getElementById("gasto-invariable-categoria"),
    monto: document.getElementById("gasto-invariable-monto"),
    proveedor: document.getElementById("gasto-invariable-proveedor"),
  };
  const tituloModal = document.getElementById("gasto-invariable-modal-titulo");

  function limpiarFormulario() {
    formulario.reset();
    formulario.classList.remove("was-validated");
    campos.id.value = "";
    Object.values(campos).forEach(limpiarValidacion);
    contenedorRutas.querySelectorAll(".gasto-invariable-ruta").forEach((c) => (c.checked = false));
    tituloModal.textContent = "Nuevo gasto invariable";
  }
  document.getElementById("btn-nuevo-gasto-invariable").onclick = limpiarFormulario;

  document.getElementById("lista-gastos-invariables").onclick = (evento) => {
    const boton = evento.target.closest("[data-editar-gasto-invariable]");
    if (!boton) return;
    const gasto = gastosInvariables.find((g) => g.id === Number(boton.getAttribute("data-editar-gasto-invariable")));
    limpiarFormulario();
    tituloModal.textContent = "Editar gasto invariable";
    campos.id.value = gasto.id;
    campos.nombre.value = gasto.nombre;
    campos.categoria.value = gasto.categoria;
    campos.monto.value = gasto.monto;
    campos.proveedor.value = gasto.proveedor;
    (gasto.rutasIds || []).forEach((rutaId) => {
      const c = document.getElementById(`gir-${rutaId}`);
      if (c) c.checked = true;
    });
  };

  formulario.onsubmit = (evento) => {
    evento.preventDefault();
    let ok = true;
    if (!campoRequerido(campos.nombre.value)) {
      marcarCampo(campos.nombre, false, "Obligatorio.");
      ok = false;
    } else marcarCampo(campos.nombre, true);
    if (!campoRequerido(campos.categoria.value)) {
      marcarCampo(campos.categoria, false, "Selecciona una categoría.");
      ok = false;
    } else marcarCampo(campos.categoria, true);
    if (!montoPositivo(campos.monto.value, 999999999999)) {
      marcarCampo(campos.monto, false, "Ingresa un monto mayor a 0.");
      ok = false;
    } else marcarCampo(campos.monto, true);
    if (!campoRequerido(campos.proveedor.value)) {
      marcarCampo(campos.proveedor, false, "Obligatorio.");
      ok = false;
    } else marcarCampo(campos.proveedor, true);
    if (!ok) {
      formulario.classList.add("was-validated");
      return;
    }
    const rutasIds = Array.from(contenedorRutas.querySelectorAll(".gasto-invariable-ruta:checked")).map((c) => Number(c.value));
    const datos = {
      id: campos.id.value ? Number(campos.id.value) : siguienteId(gastosInvariables),
      nombre: campos.nombre.value.trim(),
      categoria: campos.categoria.value,
      monto: Number(campos.monto.value),
      proveedor: campos.proveedor.value.trim(),
      rutasIds,
    };
    const existe = gastosInvariables.some((g) => g.id === datos.id);
    gastosInvariables = existe ? gastosInvariables.map((g) => (g.id === datos.id ? datos : g)) : [...gastosInvariables, datos];
    guardarGastosInvariables(gastosInvariables);
    pintarListado("lista-gastos-invariables", gastosInvariables, plantillaGastoInvariable, "No hay gastos invariables registrados.");
    cerrarModal("modal-gasto-invariable");
  };
};

/* =========================================================================
   FACTURACIÓN — modules/facturacion/solicitudes-transferencia.html
   Solo lectura + Aprobar/Rechazar: el alta vive en la ficha del Viaje.
   ========================================================================= */

function plantillaSolicitudTransferencia(s) {
  const viaje = obtenerViajes().find((v) => v.id === s.viajeId);
  const estadoClase =
    s.estado === "Aprobada" ? "bg-success-subtle text-success-emphasis" : s.estado === "Rechazada" ? "bg-danger-subtle text-danger-emphasis" : "bg-warning-subtle text-warning-emphasis";
  return `
    <div class="col-sm-6 col-lg-4">
      <article class="entity-card p-3 fade-in">
        <div class="d-flex justify-content-between align-items-start mb-1">
          <h2 class="h6 mb-0">${formatearCLP(s.monto)}</h2>
          <span class="badge ${estadoClase}">${s.estado}</span>
        </div>
        <p class="small text-muted-brand mb-1">${viaje ? codigoViaje(viaje) : "Viaje no encontrado"} · ${s.tipo}</p>
        <p class="small mb-3">${s.motivo}</p>
        ${
          s.estado === "Pendiente"
            ? `<div class="d-flex gap-2">
                <button type="button" class="btn btn-success btn-sm w-50" data-aprobar-solicitud="${s.id}"><i class="bi bi-check2 me-1"></i>Aprobar</button>
                <button type="button" class="btn btn-outline-danger btn-sm w-50" data-rechazar-solicitud="${s.id}"><i class="bi bi-x-lg me-1"></i>Rechazar</button>
              </div>`
            : s.motivoRechazo
              ? `<p class="small text-muted-brand mb-0">Motivo de rechazo: ${s.motivoRechazo}</p>`
              : ""
        }
      </article>
    </div>`;
}

PAGINAS.solicitudesTransferencia = function () {
  let solicitudes = obtenerSolicitudesTransferencia();

  function repintar() {
    pintarListado("lista-solicitudes-transferencia", solicitudes, plantillaSolicitudTransferencia, "No hay solicitudes de transferencia.");
  }
  repintar();

  document.getElementById("lista-solicitudes-transferencia").addEventListener("click", (evento) => {
    const botonAprobar = evento.target.closest("[data-aprobar-solicitud]");
    const botonRechazar = evento.target.closest("[data-rechazar-solicitud]");
    if (!botonAprobar && !botonRechazar) return;

    const id = Number((botonAprobar || botonRechazar).getAttribute(botonAprobar ? "data-aprobar-solicitud" : "data-rechazar-solicitud"));
    let motivoRechazo = null;
    if (botonRechazar) {
      motivoRechazo = window.prompt("Motivo del rechazo:", "");
      if (motivoRechazo === null) return;
    }

    solicitudes = solicitudes.map((s) =>
      s.id === id ? { ...s, estado: botonAprobar ? "Aprobada" : "Rechazada", motivoRechazo: botonRechazar ? motivoRechazo.trim() : null } : s
    );
    guardarSolicitudesTransferencia(solicitudes);
    repintar();
  });
};

/* =========================================================================
   OPERACIONES — modules/operaciones/viajes.html
   Viajes; ficha con pestañas Resumen / Tramos / Gastos / Transferencias.
   ========================================================================= */

function filaViaje(v) {
  const chofer = obtenerEmpleados().find((e) => e.id === v.choferId);
  const vehiculo = obtenerVehiculos().find((veh) => veh.id === v.vehiculoId);
  return `
    <tr data-abrir-modal="modal-ficha-viaje" data-id="${v.id}" style="cursor:pointer;">
      <td class="mono">${codigoViaje(v)}</td>
      <td>${chofer ? nombreEmpleado(chofer) : "—"}</td>
      <td>${vehiculo ? vehiculo.patente : "—"}</td>
      <td>${v.prioridad}</td>
      <td><span class="badge badge-estado ${estadoBadgeClase(v.estado)}">${v.estado}</span></td>
    </tr>`;
}

PAGINAS.viajes = function () {
  function pintar(filtro) {
    const viajes = obtenerViajes();
    const termino = (filtro || "").trim().toLowerCase();
    const filtrados = viajes.filter((v) => !termino || `${codigoViaje(v)} ${v.estado} ${v.prioridad}`.toLowerCase().includes(termino));
    document.getElementById("lista-viajes").innerHTML =
      filtrados.map(filaViaje).join("") || `<tr><td colspan="5" class="text-muted-brand text-center py-4">Sin resultados.</td></tr>`;
  }
  pintar("");
  const buscador = document.getElementById("buscador");
  if (buscador) buscador.addEventListener("input", () => pintar(buscador.value));

  document.getElementById("lista-viajes").addEventListener("click", (evento) => {
    const fila = evento.target.closest("[data-id]");
    if (!fila) return;
    abrirFichaViaje(Number(fila.getAttribute("data-id")));
  });

  document.getElementById("btn-nuevo-viaje").addEventListener("click", () => iniciarFormularioViaje(null));

  // Llegando desde "Convertir en viaje" (pestaña Solicitudes de la ficha de Cliente).
  const solicitudId = Number(obtenerParametroUrl("solicitud"));
  if (solicitudId) iniciarFormularioViaje(null, solicitudId);
};

function iniciarFormularioViaje(idExistente, solicitudId) {
  const formulario = document.getElementById("form-viaje");
  formulario.reset();
  formulario.classList.remove("was-validated");

  const campos = {
    motivoCargaCliente: document.getElementById("vi-motivoCargaCliente"),
    motivoGestionInterna: document.getElementById("vi-motivoGestionInterna"),
    trayectoId: document.getElementById("vi-trayectoId"),
    motivoInterno: document.getElementById("vi-motivoInterno"),
    choferId: document.getElementById("vi-choferId"),
    coordinadorId: document.getElementById("vi-coordinadorId"),
    vehiculoId: document.getElementById("vi-vehiculoId"),
    funcionVehiculo: document.getElementById("vi-funcionVehiculo"),
    ramplaId: document.getElementById("vi-ramplaId"),
    prioridad: document.getElementById("vi-prioridad"),
    tonelajeRequerido: document.getElementById("vi-tonelajeRequerido"),
    numeroContacto: document.getElementById("vi-numeroContacto"),
    fechaPresentacion: document.getElementById("vi-fechaPresentacion"),
    horaPresentacion: document.getElementById("vi-horaPresentacion"),
    ubicacionCarga: document.getElementById("vi-ubicacionCarga"),
    estado: document.getElementById("vi-estado"),
  };
  const seccionCargaCliente = document.getElementById("vi-seccion-carga-cliente");
  const seccionGestionInterna = document.getElementById("vi-seccion-gestion-interna");
  Object.values(campos).forEach((input) => input.type !== "radio" && limpiarValidacion(input));

  const viajes = obtenerViajes();
  const existente = idExistente ? viajes.find((v) => v.id === idExistente) : null;
  const solicitudOrigen = !existente && solicitudId ? obtenerViajesSolicitados().find((s) => s.id === solicitudId) : null;

  campos.trayectoId.innerHTML = '<option value="" selected disabled>Selecciona una ruta</option>' + obtenerRutas().map((r) => `<option value="${r.id}">${r.origen} → ${r.destino}</option>`).join("");
  const opcionesEmpleados = obtenerEmpleados().map((e) => `<option value="${e.id}">${nombreEmpleado(e)}</option>`).join("");
  campos.choferId.innerHTML = '<option value="" selected disabled>Selecciona un chofer</option>' + opcionesEmpleados;
  campos.coordinadorId.innerHTML = '<option value="" selected disabled>Selecciona un coordinador</option>' + opcionesEmpleados;
  campos.vehiculoId.innerHTML = '<option value="" selected disabled>Selecciona un vehículo</option>' + obtenerVehiculos().map((v) => `<option value="${v.id}">${v.patente} — ${v.marca} ${v.modelo}</option>`).join("");
  campos.ramplaId.innerHTML = '<option value="">Sin rampla</option>' + obtenerRamplas().map((r) => `<option value="${r.id}">${r.patente} (${r.codigo})</option>`).join("");
  campos.prioridad.innerHTML = '<option value="" selected disabled>Selecciona una prioridad</option>' + PRIORIDADES_VIAJE.map((p) => `<option value="${p}">${p}</option>`).join("");
  campos.estado.innerHTML = ESTADOS_VIAJE.map((e) => `<option value="${e}">${e}</option>`).join("");

  function actualizarSecciones() {
    const esCargaCliente = campos.motivoCargaCliente.checked;
    seccionCargaCliente.classList.toggle("d-none", !esCargaCliente);
    seccionGestionInterna.classList.toggle("d-none", esCargaCliente);
  }
  campos.motivoCargaCliente.onchange = actualizarSecciones;
  campos.motivoGestionInterna.onchange = actualizarSecciones;

  document.getElementById("modal-viaje-titulo").textContent = existente ? `Editar ${codigoViaje(existente)}` : "Añadir viaje";

  if (existente) {
    (existente.motivo === "carga_cliente" ? campos.motivoCargaCliente : campos.motivoGestionInterna).checked = true;
    campos.trayectoId.value = existente.trayectoId || "";
    campos.motivoInterno.value = existente.motivoInterno || "";
    campos.choferId.value = existente.choferId;
    campos.coordinadorId.value = existente.coordinadorId;
    campos.vehiculoId.value = existente.vehiculoId;
    campos.funcionVehiculo.value = existente.funcionVehiculo;
    campos.ramplaId.value = existente.ramplaId || "";
    campos.prioridad.value = existente.prioridad;
    campos.tonelajeRequerido.value = existente.tonelajeRequerido;
    campos.numeroContacto.value = existente.numeroContacto;
    campos.fechaPresentacion.value = existente.fechaPresentacion;
    campos.horaPresentacion.value = existente.horaPresentacion;
    campos.ubicacionCarga.value = existente.ubicacionCarga;
    campos.estado.value = existente.estado;
  } else {
    campos.motivoCargaCliente.checked = true;
    campos.estado.value = "Esperando carga";
    if (solicitudOrigen) {
      campos.trayectoId.value = solicitudOrigen.rutaId || "";
      campos.prioridad.value = solicitudOrigen.prioridad || "";
      campos.tonelajeRequerido.value = solicitudOrigen.tonelajeRequerido || "";
      campos.numeroContacto.value = solicitudOrigen.numeroContacto || "";
      campos.fechaPresentacion.value = solicitudOrigen.fechaPresentacion || "";
      campos.horaPresentacion.value = solicitudOrigen.horaPresentacion || "";
      campos.ubicacionCarga.value = solicitudOrigen.ubicacionCarga || "";
    }
  }
  actualizarSecciones();

  formulario.onsubmit = (evento) => {
    evento.preventDefault();
    let ok = true;
    const marcar = (campo, cond, msj) => {
      if (!cond) {
        marcarCampo(campo, false, msj);
        ok = false;
      } else marcarCampo(campo, true);
    };
    const esCargaCliente = campos.motivoCargaCliente.checked;
    if (esCargaCliente) marcar(campos.trayectoId, campoRequerido(campos.trayectoId.value), "Selecciona una ruta.");
    else marcar(campos.motivoInterno, campoRequerido(campos.motivoInterno.value), "Describe el motivo interno.");
    marcar(campos.choferId, campoRequerido(campos.choferId.value), "Selecciona un chofer.");
    marcar(campos.coordinadorId, campoRequerido(campos.coordinadorId.value), "Selecciona un coordinador.");
    marcar(campos.vehiculoId, campoRequerido(campos.vehiculoId.value), "Selecciona un vehículo.");
    marcar(campos.funcionVehiculo, campoRequerido(campos.funcionVehiculo.value), "Selecciona una función.");
    marcar(campos.prioridad, campoRequerido(campos.prioridad.value), "Selecciona una prioridad.");
    marcar(campos.numeroContacto, esTelefonoChilenoValido(campos.numeroContacto.value), "Formato: +56 9 XXXX XXXX.");
    marcar(campos.fechaPresentacion, campoRequerido(campos.fechaPresentacion.value), "Obligatoria.");
    marcar(campos.ubicacionCarga, campoRequerido(campos.ubicacionCarga.value), "Obligatoria.");
    if (!ok) {
      formulario.classList.add("was-validated");
      return;
    }

    const datos = {
      id: existente ? existente.id : siguienteId(viajes),
      motivo: esCargaCliente ? "carga_cliente" : "gestion_interna",
      trayectoId: esCargaCliente ? Number(campos.trayectoId.value) : null,
      motivoInterno: esCargaCliente ? null : campos.motivoInterno.value.trim(),
      choferId: Number(campos.choferId.value),
      coordinadorId: Number(campos.coordinadorId.value),
      vehiculoId: Number(campos.vehiculoId.value),
      funcionVehiculo: campos.funcionVehiculo.value,
      ramplaId: campos.ramplaId.value ? Number(campos.ramplaId.value) : null,
      prioridad: campos.prioridad.value,
      tonelajeRequerido: Number(campos.tonelajeRequerido.value) || 0,
      numeroContacto: campos.numeroContacto.value.trim(),
      fechaPresentacion: campos.fechaPresentacion.value,
      horaPresentacion: campos.horaPresentacion.value,
      ubicacionCarga: campos.ubicacionCarga.value.trim(),
      estado: campos.estado.value,
      tramos: existente ? existente.tramos || [] : [],
    };
    guardarViajes(existente ? viajes.map((v) => (v.id === datos.id ? datos : v)) : [...viajes, datos]);

    if (!existente && solicitudOrigen) {
      guardarViajesSolicitados(obtenerViajesSolicitados().map((s) => (s.id === solicitudOrigen.id ? { ...s, viajeCreadoId: datos.id } : s)));
    }

    cerrarModal("modal-viaje");
    PAGINAS.viajes();
  };

  abrirModal("modal-viaje");
}

/* ---- Ficha de Viaje: pestañas Resumen / Tramos / Gastos / Transferencias -- */

function abrirFichaViaje(viajeId) {
  const viaje = obtenerViajes().find((v) => v.id === viajeId);
  document.getElementById("ficha-viaje-modal-titulo").textContent = codigoViaje(viaje);

  const ruta = obtenerRutas().find((r) => r.id === viaje.trayectoId);
  const chofer = obtenerEmpleados().find((e) => e.id === viaje.choferId);
  const coordinador = obtenerEmpleados().find((e) => e.id === viaje.coordinadorId);
  const vehiculo = obtenerVehiculos().find((v) => v.id === viaje.vehiculoId);
  const rampla = obtenerRamplas().find((r) => r.id === viaje.ramplaId);

  const resumenHTML = `
    <span class="badge badge-estado ${estadoBadgeClase(viaje.estado)} mb-2">${viaje.estado}</span>
    <p class="text-muted-brand mb-3">${viaje.motivo === "carga_cliente" ? etiquetaRuta(ruta) : viaje.motivoInterno}</p>
    <dl class="row mb-0">
      <dt class="col-sm-4 text-muted-brand fw-normal">Chofer</dt><dd class="col-sm-8">${chofer ? nombreEmpleado(chofer) : "—"}</dd>
      <dt class="col-sm-4 text-muted-brand fw-normal">Coordinador</dt><dd class="col-sm-8">${coordinador ? nombreEmpleado(coordinador) : "—"}</dd>
      <dt class="col-sm-4 text-muted-brand fw-normal">Vehículo</dt><dd class="col-sm-8">${vehiculo ? `${vehiculo.patente} (${viaje.funcionVehiculo})` : "—"}</dd>
      <dt class="col-sm-4 text-muted-brand fw-normal">Rampla</dt><dd class="col-sm-8">${rampla ? rampla.patente : "Sin rampla"}</dd>
      <dt class="col-sm-4 text-muted-brand fw-normal">Prioridad</dt><dd class="col-sm-8">${viaje.prioridad}</dd>
      <dt class="col-sm-4 text-muted-brand fw-normal">Tonelaje requerido</dt><dd class="col-sm-8">${viaje.tonelajeRequerido} t</dd>
      <dt class="col-sm-4 text-muted-brand fw-normal">Contacto</dt><dd class="col-sm-8">${viaje.numeroContacto}</dd>
      <dt class="col-sm-4 text-muted-brand fw-normal">Presentación</dt><dd class="col-sm-8">${viaje.fechaPresentacion} · ${viaje.horaPresentacion}</dd>
      <dt class="col-sm-4 text-muted-brand fw-normal">Ubicación de carga</dt><dd class="col-sm-8">${viaje.ubicacionCarga}</dd>
    </dl>
    <button type="button" class="btn btn-primary btn-sm mt-3" id="btn-editar-viaje"><i class="bi bi-pencil-square me-1"></i>Editar viaje</button>`;

  const tabs = [
    { id: "resumen", etiqueta: "Resumen", html: resumenHTML },
    { id: "tramos", etiqueta: "Tramos", html: '<div id="tab-tramos-cuerpo"></div>' },
    { id: "gastos", etiqueta: "Gastos", html: '<div id="tab-gastos-viaje-cuerpo"></div>' },
    { id: "transferencias", etiqueta: "Transferencias", html: '<div id="tab-transferencias-viaje-cuerpo"></div>' },
  ];
  pintarPestanas(document.getElementById("ficha-viaje-modal-cuerpo"), tabs, "viaje-tab");

  document.getElementById("btn-editar-viaje").addEventListener("click", () => iniciarFormularioViaje(viaje.id));
  pintarTabTramos(viaje);
  pintarTabGastosViaje(viaje);
  pintarTabTransferenciasViaje(viaje);
}

function pintarTabTramos(viaje) {
  const rutas = obtenerRutas();
  const tramos = viaje.tramos || [];
  const cuerpo = document.getElementById("tab-tramos-cuerpo");
  cuerpo.innerHTML = `
    <p class="small text-muted-brand">Cada tramo (ida, vuelta, o una ruta repetida) ejecutado dentro de este viaje.</p>
    <table class="mini-table mb-3">
      <thead><tr><th>#</th><th>Ruta</th><th>Peso bruto</th><th>Peso neto</th><th>Guía</th></tr></thead>
      <tbody>
        ${
          tramos.length
            ? tramos
                .map((t) => {
                  const r = rutas.find((x) => x.id === t.rutaId);
                  return `<tr><td>${t.orden}</td><td>${etiquetaRuta(r)}</td><td>${t.pesoBrutoTon ?? "—"}</td><td>${t.pesoNetoTon ?? "—"}</td><td>${t.numeroGuia || "—"}</td></tr>`;
                })
                .join("")
            : '<tr><td colspan="5" class="text-muted-brand">Sin tramos registrados todavía.</td></tr>'
        }
      </tbody>
    </table>
    <form id="form-agregar-tramo" class="row g-2 align-items-end" novalidate>
      <div class="col-sm-5">
        <label class="form-label small mb-1">Ruta</label>
        <select class="form-select form-select-sm" id="tramo-rutaId" required>
          <option value="" selected disabled>Selecciona una ruta</option>
          ${rutas.map((r) => `<option value="${r.id}">${r.origen} → ${r.destino}</option>`).join("")}
        </select>
      </div>
      <div class="col-sm-2"><label class="form-label small mb-1">Peso bruto (t)</label><input type="number" min="0" step="0.1" class="form-control form-control-sm" id="tramo-pesoBruto"></div>
      <div class="col-sm-2"><label class="form-label small mb-1">Peso neto (t)</label><input type="number" min="0" step="0.1" class="form-control form-control-sm" id="tramo-pesoNeto"></div>
      <div class="col-sm-2"><label class="form-label small mb-1">N° guía</label><input type="text" class="form-control form-control-sm" id="tramo-numeroGuia"></div>
      <div class="col-sm-1"><button type="submit" class="btn btn-primary btn-sm w-100" title="Agregar tramo"><i class="bi bi-plus-lg"></i></button></div>
    </form>`;

  cuerpo.querySelector("#form-agregar-tramo").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const rutaId = document.getElementById("tramo-rutaId").value;
    if (!rutaId) return;
    const nuevoTramo = {
      orden: tramos.length + 1,
      rutaId: Number(rutaId),
      pesoBrutoTon: document.getElementById("tramo-pesoBruto").value ? Number(document.getElementById("tramo-pesoBruto").value) : null,
      pesoNetoTon: document.getElementById("tramo-pesoNeto").value ? Number(document.getElementById("tramo-pesoNeto").value) : null,
      numeroGuia: document.getElementById("tramo-numeroGuia").value.trim(),
    };
    const viajes = obtenerViajes();
    guardarViajes(viajes.map((v) => (v.id === viaje.id ? { ...v, tramos: [...(v.tramos || []), nuevoTramo] } : v)));
    viaje.tramos = [...tramos, nuevoTramo];
    pintarTabTramos(viaje);
  });
}

function pintarTabGastosViaje(viaje) {
  const gastos = obtenerGastos().filter((g) => g.viajeId === viaje.id);
  const cuerpo = document.getElementById("tab-gastos-viaje-cuerpo");
  cuerpo.innerHTML = `
    <table class="mini-table mb-3">
      <thead><tr><th>Categoría</th><th>Proveedor</th><th>Fecha</th><th>Monto</th></tr></thead>
      <tbody>
        ${
          gastos.length
            ? gastos.map((g) => `<tr><td>${g.categoria}</td><td>${g.proveedor}</td><td>${g.fecha}</td><td>${formatearCLP(g.monto)}</td></tr>`).join("") +
              `<tr><td colspan="3" class="text-end fw-semibold">Total</td><td class="fw-semibold">${formatearCLP(gastos.reduce((s, g) => s + g.monto, 0))}</td></tr>`
            : '<tr><td colspan="4" class="text-muted-brand">Sin gastos registrados.</td></tr>'
        }
      </tbody>
    </table>
    <form id="form-registrar-gasto" class="row g-2" novalidate>
      <div class="col-sm-3">
        <select class="form-select form-select-sm" id="gasto-categoria" required>
          <option value="" selected disabled>Categoría</option>
          ${CATEGORIAS_GASTO.map((c) => `<option value="${c}">${c}</option>`).join("")}
        </select>
      </div>
      <div class="col-sm-2"><input type="number" min="0" class="form-control form-control-sm" id="gasto-monto" placeholder="Monto" required></div>
      <div class="col-sm-2"><input type="date" class="form-control form-control-sm" id="gasto-fecha" required></div>
      <div class="col-sm-3"><input type="text" class="form-control form-control-sm" id="gasto-proveedor" placeholder="Proveedor" required></div>
      <div class="col-sm-2"><button type="submit" class="btn btn-primary btn-sm w-100">Registrar</button></div>
      <div class="col-12"><input type="text" class="form-control form-control-sm" id="gasto-descripcion" placeholder="Descripción" required></div>
    </form>`;

  cuerpo.querySelector("#form-registrar-gasto").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const categoria = document.getElementById("gasto-categoria").value;
    const monto = Number(document.getElementById("gasto-monto").value);
    const fecha = document.getElementById("gasto-fecha").value;
    const proveedor = document.getElementById("gasto-proveedor").value.trim();
    const descripcion = document.getElementById("gasto-descripcion").value.trim();
    if (!categoria || !montoPositivo(monto, 999999999999) || !fecha || !proveedor || !descripcion) return;
    const gastosActuales = obtenerGastos();
    const nuevo = { id: siguienteId(gastosActuales), viajeId: viaje.id, categoria, monto, fecha, proveedor, descripcion, tramo: "" };
    guardarGastos([...gastosActuales, nuevo]);
    pintarTabGastosViaje(viaje);
  });
}

function pintarTabTransferenciasViaje(viaje) {
  const solicitudes = obtenerSolicitudesTransferencia().filter((s) => s.viajeId === viaje.id);
  const cuerpo = document.getElementById("tab-transferencias-viaje-cuerpo");
  cuerpo.innerHTML = `
    <p class="small text-muted-brand">Aprobar/rechazar vive centralizado en Facturación → Transferencias, no aquí.</p>
    <table class="mini-table mb-3">
      <thead><tr><th>Tipo</th><th>Motivo</th><th>Monto</th><th>Estado</th></tr></thead>
      <tbody>
        ${
          solicitudes.length
            ? solicitudes
                .map((s) => {
                  const clase = s.estado === "Aprobada" ? "bg-success-subtle text-success-emphasis" : s.estado === "Rechazada" ? "bg-danger-subtle text-danger-emphasis" : "bg-warning-subtle text-warning-emphasis";
                  return `<tr><td>${s.tipo}</td><td>${s.motivo}</td><td>${formatearCLP(s.monto)}</td><td><span class="badge ${clase}">${s.estado}</span></td></tr>`;
                })
                .join("")
            : '<tr><td colspan="4" class="text-muted-brand">Sin solicitudes registradas.</td></tr>'
        }
      </tbody>
    </table>
    <form id="form-solicitud-adicional" class="row g-2" novalidate>
      <div class="col-sm-4"><input type="number" min="0" class="form-control form-control-sm" id="transferencia-monto" placeholder="Monto" required></div>
      <div class="col-sm-6"><input type="text" class="form-control form-control-sm" id="transferencia-motivo" placeholder="Motivo (ej: imprevisto en ruta)" required></div>
      <div class="col-sm-2"><button type="submit" class="btn btn-primary btn-sm w-100">Generar</button></div>
    </form>`;

  cuerpo.querySelector("#form-solicitud-adicional").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const monto = Number(document.getElementById("transferencia-monto").value);
    const motivo = document.getElementById("transferencia-motivo").value.trim();
    if (!montoPositivo(monto, 999999999999) || !motivo) return;
    const actuales = obtenerSolicitudesTransferencia();
    const nueva = {
      id: siguienteId(actuales),
      viajeId: viaje.id,
      tipo: "Adicional",
      monto,
      motivo,
      fecha: new Date().toISOString().slice(0, 10),
      estado: "Pendiente",
      motivoRechazo: null,
    };
    guardarSolicitudesTransferencia([...actuales, nueva]);
    pintarTabTransferenciasViaje(viaje);
  });
}

/* =========================================================================
   OPERACIONES — modules/operaciones/preasignacion.html
   Reemplaza a "Grupos": asignación directa conductor→vehículo. El mismo
   vehículo puede quedar preasignado a 2+ conductores (contraturno) — no se
   deshabilita la opción por estar tomada, solo se informa con quién se
   comparte.
   ========================================================================= */

PAGINAS.preasignacion = function () {
  function pintar() {
    const conductores = obtenerEmpleados().filter((e) => e.cargo === "Conductor");
    const vehiculos = obtenerVehiculos();
    const contenedor = document.getElementById("lista-preasignacion");

    if (conductores.length === 0) {
      contenedor.innerHTML = '<p class="text-muted-brand">No hay conductores registrados — agrégalos desde Relaciones Laborales → Gestionar personal.</p>';
      return;
    }

    contenedor.innerHTML = conductores
      .map((conductor) => {
        const otrosConMismoVehiculo = conductores.filter((c) => c.id !== conductor.id && c.vehiculoPreasignadoId && c.vehiculoPreasignadoId === conductor.vehiculoPreasignadoId);
        return `
        <div class="nested-card mb-2 d-flex justify-content-between align-items-center flex-wrap gap-2" data-fila-conductor="${conductor.id}">
          <div>
            <div class="fw-semibold small">${nombreEmpleado(conductor)}</div>
            <div class="text-muted-brand small">${conductor.run}</div>
            ${otrosConMismoVehiculo.length ? `<span class="chip-nota">Comparte tracto (contraturno) con ${otrosConMismoVehiculo.map(nombreEmpleado).join(", ")}</span>` : ""}
          </div>
          <div class="d-flex align-items-center gap-2">
            <select class="form-select form-select-sm" style="width:260px" data-select-vehiculo="${conductor.id}">
              <option value="">Sin preasignar</option>
              ${vehiculos.map((v) => `<option value="${v.id}" ${conductor.vehiculoPreasignadoId === v.id ? "selected" : ""}>${v.patente} — ${v.marca} ${v.modelo}</option>`).join("")}
            </select>
            <button type="button" class="btn btn-sm btn-primary" data-guardar-preasignacion="${conductor.id}">Guardar</button>
          </div>
        </div>`;
      })
      .join("");
  }
  pintar();

  document.getElementById("lista-preasignacion").addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-guardar-preasignacion]");
    if (!boton) return;
    const conductorId = Number(boton.getAttribute("data-guardar-preasignacion"));
    const select = document.querySelector(`[data-select-vehiculo="${conductorId}"]`);
    const vehiculoId = select.value ? Number(select.value) : null;
    const empleados = obtenerEmpleados();
    guardarEmpleados(empleados.map((e) => (e.id === conductorId ? { ...e, vehiculoPreasignadoId: vehiculoId } : e)));
    pintar();
  });
};

/* =========================================================================
   OPERACIONES — modules/operaciones/puntos-referencia.html
   Catálogo de lugares físicos (terminal, bodega, peaje, bencinera).
   ========================================================================= */

function plantillaPuntoReferencia(p) {
  return `
    <div class="col-sm-6 col-lg-4">
      <article class="entity-card p-3 fade-in">
        <div class="d-flex justify-content-between align-items-start mb-1">
          <h2 class="h6 mb-0">${p.nombre}</h2>
          <span class="badge bg-primary-subtle text-primary-emphasis">${p.abreviacion}</span>
        </div>
        <p class="small text-muted-brand mb-1">${p.tipo}</p>
        ${p.tipo === "Parada de peaje" ? `<p class="small mb-3">Peaje: ${formatearCLP(p.montoPeaje)}</p>` : '<p class="small mb-3">&nbsp;</p>'}
        <button type="button" class="btn btn-outline-primary btn-sm w-100" data-editar-punto="${p.id}" data-abrir-modal="modal-punto">
          <i class="bi bi-pencil-square me-1"></i>Editar
        </button>
      </article>
    </div>`;
}

PAGINAS.puntosReferencia = function () {
  let puntos = obtenerPuntosReferencia();
  pintarListado("lista-puntos", puntos, plantillaPuntoReferencia, "No hay puntos de referencia registrados.");

  document.getElementById("punto-tipo").innerHTML =
    '<option value="" selected disabled>Selecciona un tipo</option>' + TIPOS_PUNTO_REFERENCIA.map((t) => `<option value="${t}">${t}</option>`).join("");

  const formulario = document.getElementById("form-punto");
  const campos = {
    id: document.getElementById("punto-id"),
    nombre: document.getElementById("punto-nombre"),
    abreviacion: document.getElementById("punto-abreviacion"),
    tipo: document.getElementById("punto-tipo"),
    montoPeaje: document.getElementById("punto-montoPeaje"),
  };
  const campoMontoPeaje = document.getElementById("campo-punto-montoPeaje");
  const tituloModal = document.getElementById("punto-modal-titulo");

  function actualizarCampoPeaje() {
    campoMontoPeaje.classList.toggle("d-none", campos.tipo.value !== "Parada de peaje");
  }
  campos.tipo.onchange = actualizarCampoPeaje;

  function limpiarFormulario() {
    formulario.reset();
    formulario.classList.remove("was-validated");
    campos.id.value = "";
    Object.values(campos).forEach(limpiarValidacion);
    tituloModal.textContent = "Nuevo punto de referencia";
    actualizarCampoPeaje();
  }
  document.getElementById("btn-nuevo-punto").onclick = limpiarFormulario;

  document.getElementById("lista-puntos").onclick = (evento) => {
    const boton = evento.target.closest("[data-editar-punto]");
    if (!boton) return;
    const punto = puntos.find((p) => p.id === Number(boton.getAttribute("data-editar-punto")));
    limpiarFormulario();
    tituloModal.textContent = "Editar punto de referencia";
    campos.id.value = punto.id;
    campos.nombre.value = punto.nombre;
    campos.abreviacion.value = punto.abreviacion;
    campos.tipo.value = punto.tipo;
    campos.montoPeaje.value = punto.montoPeaje || "";
    actualizarCampoPeaje();
  };

  formulario.onsubmit = (evento) => {
    evento.preventDefault();
    let ok = true;
    if (!campoRequerido(campos.nombre.value)) {
      marcarCampo(campos.nombre, false, "Obligatorio.");
      ok = false;
    } else marcarCampo(campos.nombre, true);
    if (!campoRequerido(campos.abreviacion.value)) {
      marcarCampo(campos.abreviacion, false, "Obligatorio.");
      ok = false;
    } else marcarCampo(campos.abreviacion, true);
    if (!campoRequerido(campos.tipo.value)) {
      marcarCampo(campos.tipo, false, "Selecciona un tipo.");
      ok = false;
    } else marcarCampo(campos.tipo, true);
    if (campos.tipo.value === "Parada de peaje" && !montoPositivo(campos.montoPeaje.value, 999999999999)) {
      marcarCampo(campos.montoPeaje, false, "Ingresa un monto mayor a 0.");
      ok = false;
    } else if (campos.tipo.value === "Parada de peaje") marcarCampo(campos.montoPeaje, true);
    if (!ok) {
      formulario.classList.add("was-validated");
      return;
    }
    const datos = {
      id: campos.id.value ? Number(campos.id.value) : siguienteId(puntos),
      nombre: campos.nombre.value.trim(),
      abreviacion: campos.abreviacion.value.trim().toUpperCase(),
      tipo: campos.tipo.value,
      montoPeaje: campos.tipo.value === "Parada de peaje" ? Number(campos.montoPeaje.value) : null,
    };
    const existe = puntos.some((p) => p.id === datos.id);
    puntos = existe ? puntos.map((p) => (p.id === datos.id ? datos : p)) : [...puntos, datos];
    guardarPuntosReferencia(puntos);
    pintarListado("lista-puntos", puntos, plantillaPuntoReferencia, "No hay puntos de referencia registrados.");
    cerrarModal("modal-punto");
  };
};

/* =========================================================================
   SEGURIDAD — modules/seguridad/usuarios.html
   Ficha y formulario de Usuario fundidos en un solo modal de alta/edición.
   ========================================================================= */

function filaUsuario(u) {
  return `
    <tr data-abrir-modal="modal-usuario" data-id="${u.id}" style="cursor:pointer;">
      <td class="mono">${u.run}</td>
      <td>${u.nombre} ${u.apellidos}</td>
      <td>${u.correo}</td>
      <td><span class="badge bg-primary-subtle text-primary-emphasis">${u.rol}</span></td>
    </tr>`;
}

PAGINAS.usuarios = function () {
  function pintar(filtro) {
    const usuarios = obtenerUsuarios();
    const termino = (filtro || "").trim().toLowerCase();
    const filtrados = usuarios.filter((u) => !termino || `${u.nombre} ${u.apellidos} ${u.correo} ${u.run}`.toLowerCase().includes(termino));
    document.getElementById("lista-usuarios").innerHTML =
      filtrados.map(filaUsuario).join("") || `<tr><td colspan="4" class="text-muted-brand text-center py-4">Sin resultados.</td></tr>`;
  }
  pintar("");
  const buscador = document.getElementById("buscador");
  if (buscador) buscador.addEventListener("input", () => pintar(buscador.value));

  document.getElementById("lista-usuarios").addEventListener("click", (evento) => {
    const fila = evento.target.closest("[data-id]");
    if (!fila) return;
    iniciarFormularioUsuario(Number(fila.getAttribute("data-id")));
  });

  document.getElementById("btn-nuevo-usuario").addEventListener("click", () => iniciarFormularioUsuario(null));
};

function iniciarFormularioUsuario(idExistente) {
  const formulario = document.getElementById("form-usuario");
  formulario.reset();
  formulario.classList.remove("was-validated");

  const campos = {
    run: document.getElementById("u-run"),
    nombre: document.getElementById("u-nombre"),
    apellidos: document.getElementById("u-apellidos"),
    correo: document.getElementById("u-correo"),
    rol: document.getElementById("u-rol"),
    region: document.getElementById("u-region"),
    comuna: document.getElementById("u-comuna"),
    password: document.getElementById("u-password"),
    password2: document.getElementById("u-password2"),
  };
  const seccionPermisos = document.getElementById("u-seccion-permisos");
  const pistaPassword = document.getElementById("u-pista-password");
  Object.values(campos).forEach(limpiarValidacion);

  const DOMINIOS_PERMITIDOS = ["duoc.cl", "profesor.duoc.cl", "gmail.com"];
  const MODULOS_PERMISO = [
    { id: "mantencion", label: "Mantención" },
    { id: "relaciones_laborales", label: "RR.LL." },
    { id: "facturacion", label: "Facturación" },
    { id: "operaciones", label: "Operaciones" },
    { id: "seguridad", label: "Seguridad" },
  ];

  const usuarios = obtenerUsuarios();
  const existente = idExistente ? usuarios.find((u) => u.id === idExistente) : null;

  seccionPermisos.innerHTML = MODULOS_PERMISO.map(
    (m) => `<div class="d-flex justify-content-between align-items-center py-2 border-bottom">
      <span class="small fw-semibold">${m.label}</span>
      <select class="form-select form-select-sm w-auto permiso-modulo" data-modulo="${m.id}">
        <option value="">Sin acceso</option><option value="lectura">Lectura</option><option value="total">Total</option>
      </select>
    </div>`
  ).join("");

  function actualizarSeccionPermisos() {
    seccionPermisos.classList.toggle("d-none", campos.rol.value !== "Operador");
  }
  campos.rol.onchange = actualizarSeccionPermisos;

  function poblarRegiones(seleccionada) {
    campos.region.innerHTML =
      '<option value="" selected disabled>Selecciona una región</option>' +
      Object.keys(REGIONES_COMUNAS).map((r) => `<option value="${r}" ${r === seleccionada ? "selected" : ""}>${r}</option>`).join("");
  }
  function poblarComunas(region, seleccionada) {
    const comunas = REGIONES_COMUNAS[region] || [];
    campos.comuna.disabled = comunas.length === 0;
    campos.comuna.innerHTML =
      '<option value="" selected disabled>Selecciona una comuna</option>' +
      comunas.map((c) => `<option value="${c}" ${c === seleccionada ? "selected" : ""}>${c}</option>`).join("");
  }
  campos.region.onchange = () => poblarComunas(campos.region.value, null);

  document.getElementById("modal-usuario-titulo").textContent = existente ? `Editar a ${existente.nombre} ${existente.apellidos}` : "Añadir usuario";
  campos.password.required = !existente;
  campos.password2.required = !existente;
  pistaPassword.textContent = existente ? "Deja la contraseña en blanco si no quieres cambiarla." : "Entre 6 y 20 caracteres.";

  if (existente) {
    campos.run.value = existente.run;
    campos.nombre.value = existente.nombre;
    campos.apellidos.value = existente.apellidos;
    campos.correo.value = existente.correo;
    campos.rol.value = existente.rol;
    poblarRegiones(existente.region);
    poblarComunas(existente.region, existente.comuna);
    seccionPermisos.querySelectorAll(".permiso-modulo").forEach((select) => {
      const permiso = (existente.permisos || []).find((p) => p.modulo === select.dataset.modulo);
      select.value = permiso ? permiso.nivel : "";
    });
  } else {
    poblarRegiones(null);
    poblarComunas("", null);
  }
  actualizarSeccionPermisos();

  formulario.onsubmit = (evento) => {
    evento.preventDefault();
    let ok = true;
    const marcar = (campo, cond, msj) => {
      if (!cond) {
        marcarCampo(campo, false, msj);
        ok = false;
      } else marcarCampo(campo, true);
    };
    marcar(campos.run, campoRequerido(campos.run.value) && esRunValido(campos.run.value), "RUN inválido.");
    marcar(campos.nombre, campoRequerido(campos.nombre.value), "Obligatorio.");
    marcar(campos.apellidos, campoRequerido(campos.apellidos.value), "Obligatorio.");
    const dominio = (campos.correo.value.split("@")[1] || "").toLowerCase();
    marcar(campos.correo, esCorreoValido(campos.correo.value) && DOMINIOS_PERMITIDOS.includes(dominio), `Usa un correo @${DOMINIOS_PERMITIDOS.join(", @")}.`);
    marcar(campos.rol, campoRequerido(campos.rol.value), "Selecciona un rol.");
    marcar(campos.region, campoRequerido(campos.region.value), "Selecciona una región.");
    marcar(campos.comuna, campoRequerido(campos.comuna.value), "Selecciona una comuna.");
    const necesitaPassword = !existente || campos.password.value.length > 0;
    if (necesitaPassword) marcar(campos.password, longitudEntre(campos.password.value, 6, 20), "Entre 6 y 20 caracteres.");
    if (necesitaPassword || campos.password2.value.length > 0) marcar(campos.password2, coincidenValores(campos.password.value, campos.password2.value), "No coinciden.");
    if (!ok) {
      formulario.classList.add("was-validated");
      return;
    }

    const permisos =
      campos.rol.value === "Operador"
        ? Array.from(seccionPermisos.querySelectorAll(".permiso-modulo"))
            .filter((s) => s.value)
            .map((s) => ({ modulo: s.dataset.modulo, nivel: s.value }))
        : [];

    const datos = {
      id: existente ? existente.id : siguienteId(usuarios),
      run: campos.run.value.toUpperCase().replace(/[^0-9K]/gi, ""),
      nombre: campos.nombre.value.trim(),
      apellidos: campos.apellidos.value.trim(),
      correo: campos.correo.value.trim(),
      rol: campos.rol.value,
      region: campos.region.value,
      comuna: campos.comuna.value,
      permisos,
    };
    guardarUsuarios(existente ? usuarios.map((u) => (u.id === datos.id ? datos : u)) : [...usuarios, datos]);
    cerrarModal("modal-usuario");
    PAGINAS.usuarios();
  };

  abrirModal("modal-usuario");
}

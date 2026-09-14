/**
 * "Base de datos" de la maqueta: arreglos en memoria (sin backend), tal como
 * pide la evaluación para esta entrega. Todas las páginas de listado/ficha/
 * formulario leen y escriben sobre estos arreglos.
 *
 * Los campos y reglas de cada entidad se sacaron de los schemas reales del
 * backend del ERP (Backend ERP/backend/app, un schemas.py por módulo) y del
 * frontend React (Maqueta ERP/src/modules), simplificando solo donde se
 * documenta en el plan (sin RBAC/backend real, sin concurrencia,
 * Cargo/PuntoReferencia como listas fijas o texto libre).
 */

/* =========================================================================
   Fábrica de almacenamiento persistente (localStorage) por entidad
   ========================================================================= */

/**
 * Crea un almacén persistido en localStorage para una entidad: arranca desde
 * `semilla` la primera vez, y de ahí en adelante vive en localStorage bajo
 * `clave`, para que crear/editar/eliminar se refleje al volver al listado
 * (incluso recargando la página).
 */
function crearAlmacen(clave, semilla) {
  function obtener() {
    try {
      const guardado = window.localStorage.getItem(clave);
      if (guardado) return JSON.parse(guardado);
    } catch (error) {
      console.warn(`No se pudo leer "${clave}" de localStorage, se usan los datos de ejemplo.`, error);
    }
    return semilla;
  }

  function guardar(lista) {
    try {
      window.localStorage.setItem(clave, JSON.stringify(lista));
    } catch (error) {
      console.warn(`No se pudo guardar "${clave}" en localStorage.`, error);
    }
  }

  return { obtener, guardar };
}

/** Devuelve el siguiente id disponible para un arreglo de entidades. */
function siguienteId(coleccion) {
  return coleccion.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

/** Lee un parámetro de la query string de la URL actual. */
function obtenerParametroUrl(nombre) {
  return new URLSearchParams(window.location.search).get(nombre);
}

/** Formatea un monto entero como pesos chilenos: 1234567 → "$1.234.567". */
function formatearCLP(monto) {
  return "$" + Number(monto || 0).toLocaleString("es-CL");
}

/* =========================================================================
   Listas de apoyo (selects fijos, no son "entidades" con CRUD propio)
   ========================================================================= */

const CARGOS = ["Conductor", "Mecánico", "Supervisor de patio", "Administrativo"];

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const CATEGORIAS_CLIENTE = ["Portuario", "Minero", "Agroindustrial", "Retail", "Construcción", "Industrial", "Otro"];

const TIPOS_CARGA = ["Carga general", "Contenedor", "Granel", "Refrigerada", "Peligrosa"];

const CATEGORIAS_GASTO = ["Combustible", "Mantención", "Peajes", "Amarres"];

const BANCOS_CHILE = ["Banco de Chile", "Banco Estado", "Banco Santander", "Banco BCI", "Banco Falabella"];

const TIPOS_CUENTA = ["corriente", "vista", "ahorro", "rut"];

const PRIORIDADES_VIAJE = ["Alta", "Media", "Baja"];

const ESTADOS_VIAJE = [
  "Esperando carga",
  "En ruta",
  "Descargando",
  "Retrasado",
  "Detenido autorizado",
  "Detenido no autorizado",
  "Fuera de ruta",
  "Finalizado",
  "Cancelado",
  "Suspendido",
];

const REGIONES_COMUNAS = {
  "Metropolitana de Santiago": ["Santiago", "Maipú", "Puente Alto", "San Bernardo"],
  "Valparaíso": ["Valparaíso", "Viña del Mar", "Quilpué", "San Antonio"],
  "Biobío": ["Concepción", "Talcahuano", "Los Ángeles", "Coronel"],
  "Maule": ["Talca", "Curicó", "Linares"],
  "Los Lagos": ["Puerto Montt", "Osorno", "Castro"],
};

/* =========================================================================
   Mantención: Vehículos y Ramplas
   ========================================================================= */

const VEHICULOS_SEED = [
  { id: 1, patente: "HXKT21", marca: "Volvo", modelo: "FH 460", anio: 2021, estado: "Operativo", conductor: "Marcelo Reyes", ramplaAsignadaId: 1 },
  { id: 2, patente: "JBRT56", marca: "Scania", modelo: "R 450", anio: 2019, estado: "En mantención", conductor: "—", ramplaAsignadaId: null },
  { id: 3, patente: "KLPS10", marca: "Mercedes-Benz", modelo: "Actros 2646", anio: 2022, estado: "Operativo", conductor: "Ana Contreras", ramplaAsignadaId: 3 },
  { id: 4, patente: "FGHT88", marca: "Volvo", modelo: "FMX 500", anio: 2018, estado: "Operativo", conductor: "Pedro Salinas", ramplaAsignadaId: null },
  { id: 5, patente: "RTMK34", marca: "Scania", modelo: "P 320", anio: 2020, estado: "Fuera de servicio", conductor: "—", ramplaAsignadaId: null },
  { id: 6, patente: "ZQWE77", marca: "Mercedes-Benz", modelo: "Actros 2651", anio: 2023, estado: "Operativo", conductor: "Ignacia Soto", ramplaAsignadaId: null },
];
const almacenVehiculos = crearAlmacen("csat_vehiculos", VEHICULOS_SEED);
const obtenerVehiculos = almacenVehiculos.obtener;
const guardarVehiculos = almacenVehiculos.guardar;

const RAMPLAS_SEED = [
  {
    id: 1, patente: "RA-4471", codigo: "RMP01", anio: 2020, ejes: 3, certificada: true,
    estado: "Operativo",
    fechaEmisionRevisionTecnica: "2025-03-10", fechaVencimientoRevisionTecnica: "2026-03-10", plantaRevisionTecnica: "Planta San Antonio",
    regionPermisoCirculacion: "Valparaíso", municipalidadPermisoCirculacion: "San Antonio", vencimientoPermisoCirculacion: "2026-02-28",
    vencimientoSoap: "2026-01-31",
  },
  {
    id: 2, patente: "RA-2290", codigo: "RMP02", anio: 2017, ejes: 2, certificada: false,
    estado: "En mantención",
    fechaEmisionRevisionTecnica: "2024-11-05", fechaVencimientoRevisionTecnica: "2025-11-05", plantaRevisionTecnica: "Planta Valparaíso",
    regionPermisoCirculacion: "Valparaíso", municipalidadPermisoCirculacion: "Valparaíso", vencimientoPermisoCirculacion: "2025-12-15",
    vencimientoSoap: "2025-12-01",
  },
  {
    id: 3, patente: "RA-5518", codigo: "RMP03", anio: 2022, ejes: 3, certificada: true,
    estado: "Operativo",
    fechaEmisionRevisionTecnica: "2025-06-20", fechaVencimientoRevisionTecnica: "2026-06-20", plantaRevisionTecnica: "Planta San Antonio",
    regionPermisoCirculacion: "Metropolitana de Santiago", municipalidadPermisoCirculacion: "San Bernardo", vencimientoPermisoCirculacion: "2026-05-31",
    vencimientoSoap: "2026-04-30",
  },
  {
    id: 4, patente: "RA-9012", codigo: "RMP04", anio: 2019, ejes: 2, certificada: true,
    estado: "Reservado exclusividad", contratoExclusivoId: 1, contratoExclusivoNombre: "Contrato Puerto Central",
    fechaEmisionRevisionTecnica: "2025-01-15", fechaVencimientoRevisionTecnica: "2026-01-15", plantaRevisionTecnica: "Planta San Antonio",
    regionPermisoCirculacion: "Valparaíso", municipalidadPermisoCirculacion: "San Antonio", vencimientoPermisoCirculacion: "2026-01-10",
    vencimientoSoap: "2025-12-20",
  },
];
const almacenRamplas = crearAlmacen("csat_ramplas", RAMPLAS_SEED);
const obtenerRamplas = almacenRamplas.obtener;
const guardarRamplas = almacenRamplas.guardar;

/* =========================================================================
   Relaciones laborales: Turnos, Empleados, Asistencia
   ========================================================================= */

const TURNOS_SEED = [
  { id: 1, nombre: "Turno día", tipo: "bloque_horario", horaInicio: "08:00", horaTermino: "18:00" },
  { id: 2, nombre: "Lunes a viernes", tipo: "dias_semana", dias: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"], horaInicio: "07:30", horaTermino: "17:30" },
  { id: 3, nombre: "Rotativo 7x7", tipo: "rango_dias", diasTrabajo: 7, diasDescanso: 7, fechaInicioCiclo: "2026-01-05", horaInicio: "08:00", horaTermino: "20:00" },
];
const almacenTurnos = crearAlmacen("csat_turnos", TURNOS_SEED);
const obtenerTurnos = almacenTurnos.obtener;
const guardarTurnos = almacenTurnos.guardar;

const EMPLEADOS_SEED = [
  {
    id: 1, run: "152309878", primerNombre: "Marcelo", segundoNombre: "", apellidoPaterno: "Reyes", apellidoMaterno: "Pino",
    telefono: "+56 9 5511 2233", fechaIngreso: "2019-03-01", cargo: "Conductor", turnoId: 1, vehiculoPreasignadoId: 1,
    licenciaConducirVencimiento: "2027-05-20", certificadoScania: true, vencimientoScania: "2026-08-01", certificadoMan: false, vencimientoMan: null,
    tarjetaRendicionBanco: "Banco Estado", tarjetaRendicionTipoCuenta: "vista", tarjetaRendicionNumeroCuenta: "11223344", tarjetaRendicionEmail: "marcelo.reyes@gmail.com", tarjetaRendicionSaldo: 45000,
  },
  {
    id: 2, run: "178234561", primerNombre: "Ana", segundoNombre: "Beatriz", apellidoPaterno: "Contreras", apellidoMaterno: "Díaz",
    telefono: "+56 9 4433 2211", fechaIngreso: "2021-07-15", cargo: "Conductor", turnoId: 2, vehiculoPreasignadoId: 1,
    licenciaConducirVencimiento: "2026-11-10", certificadoScania: false, vencimientoScania: null, certificadoMan: true, vencimientoMan: "2027-02-14",
    tarjetaRendicionBanco: "Banco de Chile", tarjetaRendicionTipoCuenta: "corriente", tarjetaRendicionNumeroCuenta: "998877", tarjetaRendicionEmail: "ana.contreras@profesor.duoc.cl", tarjetaRendicionSaldo: 12000,
  },
  {
    id: 3, run: "141876523", primerNombre: "Pedro", segundoNombre: "", apellidoPaterno: "Salinas", apellidoMaterno: "Vera",
    telefono: "+56 9 7766 5544", fechaIngreso: "2018-01-20", cargo: "Mecánico", turnoId: 1, vehiculoPreasignadoId: null,
    licenciaConducirVencimiento: null, certificadoScania: false, vencimientoScania: null, certificadoMan: false, vencimientoMan: null,
    tarjetaRendicionBanco: null, tarjetaRendicionTipoCuenta: null, tarjetaRendicionNumeroCuenta: "", tarjetaRendicionEmail: null, tarjetaRendicionSaldo: 0,
  },
  {
    id: 4, run: "133045678", primerNombre: "Valentina", segundoNombre: "", apellidoPaterno: "Muñoz", apellidoMaterno: "Rojas",
    telefono: "+56 9 8899 1122", fechaIngreso: "2022-09-05", cargo: "Administrativo", turnoId: 2, vehiculoPreasignadoId: null,
    licenciaConducirVencimiento: null, certificadoScania: false, vencimientoScania: null, certificadoMan: false, vencimientoMan: null,
    tarjetaRendicionBanco: null, tarjetaRendicionTipoCuenta: null, tarjetaRendicionNumeroCuenta: "", tarjetaRendicionEmail: null, tarjetaRendicionSaldo: 0,
  },
];
const almacenEmpleados = crearAlmacen("csat_empleados", EMPLEADOS_SEED);
const obtenerEmpleados = almacenEmpleados.obtener;
const guardarEmpleados = almacenEmpleados.guardar;

const almacenAsistencias = crearAlmacen("csat_asistencias", []);
const obtenerAsistencias = almacenAsistencias.obtener;
const guardarAsistencias = almacenAsistencias.guardar;

/* =========================================================================
   Facturación: Clientes, Contratos, Tarifas, Gastos
   ========================================================================= */

const CLIENTES_SEED = [
  {
    id: 1, nombre: "Puerto Central S.A.", abreviacion: "PCENTRAL", rut: "76543210-9",
    categorias: ["Portuario", "Industrial"],
    turnos: [{ nombre: "Turno recepción", dias: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"], horaInicio: "08:00", horaTermino: "18:00" }],
  },
  {
    id: 2, nombre: "Minera Los Andes Ltda.", abreviacion: "MLANDES", rut: "77123456-5",
    categorias: ["Minero"],
    turnos: [{ nombre: "Turno día", dias: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"], horaInicio: "07:00", horaTermino: "19:00" }],
  },
  {
    id: 3, nombre: "AgroSur Exportaciones", abreviacion: "AGROSUR", rut: "78901234-1",
    categorias: ["Agroindustrial", "Retail"],
    turnos: [],
  },
];
const almacenClientes = crearAlmacen("csat_clientes", CLIENTES_SEED);
const obtenerClientes = almacenClientes.obtener;
const guardarClientes = almacenClientes.guardar;

const CONTRATOS_SEED = [
  {
    id: 1, nombre: "Contrato Puerto Central", clienteId: 1,
    fechaInicio: "2025-01-01", fechaTermino: "2026-12-31",
    tiposCarga: ["Contenedor", "Carga general"],
    exclusivo: true, cantidadVehiculosExclusividad: 2, vehiculosComprometidos: [1, 3], ramplasComprometidas: [4],
    tieneCompromiso: true, tipoCompromiso: "viajes", viajesComprometidos: 40, toneladasComprometidas: null,
  },
  {
    id: 2, nombre: "Contrato Minera Los Andes", clienteId: 2,
    fechaInicio: "2024-06-01", fechaTermino: "2025-06-01",
    tiposCarga: ["Granel"],
    exclusivo: false, cantidadVehiculosExclusividad: null, vehiculosComprometidos: [], ramplasComprometidas: [],
    tieneCompromiso: true, tipoCompromiso: "tonelaje", viajesComprometidos: null, toneladasComprometidas: 5000,
  },
  {
    id: 3, nombre: "Contrato AgroSur", clienteId: 3,
    fechaInicio: "2025-09-01", fechaTermino: "2026-03-01",
    tiposCarga: ["Refrigerada", "Carga general"],
    exclusivo: false, cantidadVehiculosExclusividad: null, vehiculosComprometidos: [], ramplasComprometidas: [],
    tieneCompromiso: false, tipoCompromiso: null, viajesComprometidos: null, toneladasComprometidas: null,
  },
];
const almacenContratos = crearAlmacen("csat_contratos", CONTRATOS_SEED);
const obtenerContratos = almacenContratos.obtener;
const guardarContratos = almacenContratos.guardar;

/** Estado del contrato calculado a partir de sus fechas (no se guarda). */
function estadoContrato(contrato) {
  const hoy = new Date().toISOString().slice(0, 10);
  if (hoy > contrato.fechaTermino) return "Vencido";
  if (hoy < contrato.fechaInicio) return "Por iniciar";
  return "Vigente";
}

const RUTAS_SEED = [
  { id: 1, origen: "Puerto de San Antonio", destino: "Bodega Lo Espejo, Santiago", duracionEstimadaMin: 150, distanciaKm: 120, contratoId: 1 },
  { id: 2, origen: "Faena Los Andes", destino: "Puerto de Valparaíso", duracionEstimadaMin: 210, distanciaKm: 165, contratoId: 2 },
  { id: 3, origen: "Planta AgroSur, Curicó", destino: "Puerto de San Antonio", duracionEstimadaMin: 180, distanciaKm: 145, contratoId: 3 },
];
const almacenRutas = crearAlmacen("csat_rutas", RUTAS_SEED);
const obtenerRutas = almacenRutas.obtener;
const guardarRutas = almacenRutas.guardar;

const TARIFAS_SEED = [
  { id: 1, trayectoId: 1, tipoCarga: "Contenedor", monto: 185000 },
  { id: 2, trayectoId: 2, tipoCarga: "Granel", monto: 240000 },
  { id: 3, trayectoId: 3, tipoCarga: "Refrigerada", monto: 210000 },
];
const almacenTarifas = crearAlmacen("csat_tarifas", TARIFAS_SEED);
const obtenerTarifas = almacenTarifas.obtener;
const guardarTarifas = almacenTarifas.guardar;

/* =========================================================================
   Operaciones: Puntos de referencia
   ========================================================================= */

const TIPOS_PUNTO_REFERENCIA = ["Origen/destino", "Parada de peaje", "Parada de combustible"];

const PUNTOS_REFERENCIA_SEED = [
  { id: 1, nombre: "Puerto de San Antonio", abreviacion: "PSA", tipo: "Origen/destino", montoPeaje: null },
  { id: 2, nombre: "Bodega Lo Espejo", abreviacion: "BLE", tipo: "Origen/destino", montoPeaje: null },
  { id: 3, nombre: "Pórtico Ruta 78 - Melipilla", abreviacion: "R78M", tipo: "Parada de peaje", montoPeaje: 3200 },
  { id: 4, nombre: "Copec San Antonio", abreviacion: "COP-SA", tipo: "Parada de combustible", montoPeaje: null },
];
const almacenPuntosReferencia = crearAlmacen("csat_puntos_referencia", PUNTOS_REFERENCIA_SEED);
const obtenerPuntosReferencia = almacenPuntosReferencia.obtener;
const guardarPuntosReferencia = almacenPuntosReferencia.guardar;

/* =========================================================================
   Operaciones: Viajes (despacho) y sus Tramos (recorridos ejecutados)
   ========================================================================= */

const VIAJES_SEED = [
  {
    id: 1, motivo: "carga_cliente", trayectoId: 1, motivoInterno: null,
    choferId: 1, coordinadorId: 4, vehiculoId: 1, funcionVehiculo: "Tracto", ramplaId: 1,
    prioridad: "Alta", tonelajeRequerido: 28, numeroContacto: "+56 9 5511 2233",
    fechaPresentacion: "2026-03-01", horaPresentacion: "08:00", ubicacionCarga: "Sitio 4, Puerto San Antonio",
    estado: "En ruta",
    tramos: [{ orden: 1, rutaId: 1, pesoBrutoTon: 28, pesoNetoTon: 26.5, numeroGuia: "G-10021" }],
  },
  {
    id: 2, motivo: "carga_cliente", trayectoId: 2, motivoInterno: null,
    choferId: 2, coordinadorId: 4, vehiculoId: 3, funcionVehiculo: "Tracto", ramplaId: 3,
    prioridad: "Media", tonelajeRequerido: 32, numeroContacto: "+56 9 4433 2211",
    fechaPresentacion: "2026-03-02", horaPresentacion: "07:00", ubicacionCarga: "Faena Los Andes, acceso norte",
    estado: "Esperando carga",
    tramos: [],
  },
  {
    id: 3, motivo: "gestion_interna", trayectoId: null, motivoInterno: "Traslado de rampla a mantención programada",
    choferId: 3, coordinadorId: 4, vehiculoId: 4, funcionVehiculo: "Tracto", ramplaId: 2,
    prioridad: "Baja", tonelajeRequerido: 0, numeroContacto: "+56 9 7766 5544",
    fechaPresentacion: "2026-02-20", horaPresentacion: "09:00", ubicacionCarga: "Taller central",
    estado: "Finalizado",
    tramos: [{ orden: 1, rutaId: 3, pesoBrutoTon: null, pesoNetoTon: null, numeroGuia: "" }],
  },
];
const almacenViajes = crearAlmacen("csat_viajes", VIAJES_SEED);
const obtenerViajes = almacenViajes.obtener;
const guardarViajes = almacenViajes.guardar;

const GASTOS_SEED = [
  { id: 1, viajeId: 1, categoria: "Combustible", monto: 65000, fecha: "2026-03-01", proveedor: "Copec San Antonio", descripcion: "Carga de petróleo tramo ida", tramo: "" },
  { id: 2, viajeId: 1, categoria: "Peajes", monto: 8200, fecha: "2026-03-01", proveedor: "Autopista Central", descripcion: "Pórticos ruta 78", tramo: "" },
  { id: 3, viajeId: 3, categoria: "Mantención", monto: 120000, fecha: "2026-02-20", proveedor: "Taller Central CSAT", descripcion: "Revisión de frenos", tramo: "" },
];
const almacenGastos = crearAlmacen("csat_gastos", GASTOS_SEED);
const obtenerGastos = almacenGastos.obtener;
const guardarGastos = almacenGastos.guardar;

const GASTOS_INVARIABLES_SEED = [
  { id: 1, nombre: "Seguro de carga estándar", categoria: "Seguros", monto: 45000, proveedor: "HDI Seguros", rutasIds: [1, 2, 3] },
  { id: 2, nombre: "Peaje fijo Ruta 78", categoria: "Peajes", monto: 3200, proveedor: "Autopista Central", rutasIds: [1] },
];
const almacenGastosInvariables = crearAlmacen("csat_gastos_invariables", GASTOS_INVARIABLES_SEED);
const obtenerGastosInvariables = almacenGastosInvariables.obtener;
const guardarGastosInvariables = almacenGastosInvariables.guardar;

const VIAJES_SOLICITADOS_SEED = [
  {
    id: 1, clienteId: 3, prioridad: "Media", tonelajeRequerido: 24, numeroContacto: "+56 9 6655 4433",
    tipoCarga: "Refrigerada", rutaId: 3, fechaPresentacion: "2026-03-10", horaPresentacion: "08:30",
    ubicacionCarga: "Planta AgroSur, Curicó", monto: 210000, viajeCreadoId: null,
  },
];
const almacenViajesSolicitados = crearAlmacen("csat_viajes_solicitados", VIAJES_SOLICITADOS_SEED);
const obtenerViajesSolicitados = almacenViajesSolicitados.obtener;
const guardarViajesSolicitados = almacenViajesSolicitados.guardar;

const SOLICITUDES_TRANSFERENCIA_SEED = [
  { id: 1, viajeId: 1, tipo: "Automática", monto: 65000, motivo: "Reposición de combustible tramo ida", fecha: "2026-03-01", estado: "Aprobada", motivoRechazo: null },
  { id: 2, viajeId: 2, tipo: "Adicional", monto: 15000, motivo: "Peaje no cubierto por la tarjeta Copec", fecha: "2026-03-02", estado: "Pendiente", motivoRechazo: null },
];
const almacenSolicitudesTransferencia = crearAlmacen("csat_solicitudes_transferencia", SOLICITUDES_TRANSFERENCIA_SEED);
const obtenerSolicitudesTransferencia = almacenSolicitudesTransferencia.obtener;
const guardarSolicitudesTransferencia = almacenSolicitudesTransferencia.guardar;

/* =========================================================================
   Seguridad: Usuarios
   ========================================================================= */

const MODULOS_SISTEMA = ["mantencion", "relaciones_laborales", "facturacion", "operaciones", "seguridad"];

const USUARIOS_SEED = [
  { id: 1, run: "190110223", nombre: "Administrador", apellidos: "", correo: "administrador@duoc.cl", rol: "Administrador", region: "Metropolitana de Santiago", comuna: "Santiago", permisos: [] },
];
const almacenUsuarios = crearAlmacen("csat_usuarios", USUARIOS_SEED);
const obtenerUsuarios = almacenUsuarios.obtener;
const guardarUsuarios = almacenUsuarios.guardar;

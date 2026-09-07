document.addEventListener("DOMContentLoaded", () => {
  const kpiVehiculos = document.getElementById("kpi-vehiculos");
  const kpiOperativos = document.getElementById("kpi-operativos");
  const kpiUsuarios = document.getElementById("kpi-usuarios");
  if (!kpiVehiculos) return;

  const vehiculos = obtenerVehiculos();
  kpiVehiculos.textContent = vehiculos.length;
  kpiOperativos.textContent = vehiculos.filter((v) => v.estado === "Operativo").length;
  kpiUsuarios.textContent = obtenerUsuarios().length;
});

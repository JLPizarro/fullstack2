/**
 * Funciones de validación reutilizadas por todos los formularios del sitio
 * (login.html y usuario-form.html). Puro JS, sin dependencias.
 */

function campoRequerido(valor) {
  return valor !== null && valor !== undefined && valor.toString().trim().length > 0;
}

function longitudEntre(valor, min, max) {
  const largo = (valor || "").toString().trim().length;
  return largo >= min && largo <= max;
}

function esCorreoValido(valor) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return regex.test((valor || "").trim());
}

/**
 * Valida un RUN chileno sin puntos ni guion (ej: 19011022K) usando el
 * dígito verificador módulo 11. Acepta 7 a 9 caracteres (cuerpo + DV).
 */
function esRunValido(valor) {
  const limpio = (valor || "").toString().toUpperCase().replace(/[^0-9K]/g, "");
  if (limpio.length < 7 || limpio.length > 9) return false;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;

  return dv === digitoVerificador(cuerpo);
}

function coincidenValores(valorA, valorB) {
  return (valorA || "") === (valorB || "") && (valorA || "").length > 0;
}

/** Dígito verificador módulo 11, reutilizado por RUN y RUT (mismo algoritmo). */
function digitoVerificador(cuerpo) {
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  return resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
}

/** Valida un RUT chileno con guion (ej: 12345678-9), como lo pide Cliente. */
function esRutValido(valor) {
  const limpio = (valor || "").toString().toUpperCase().replace(/\./g, "").trim();
  if (!/^\d{6,8}-[0-9K]$/.test(limpio)) return false;
  const [cuerpo, dv] = limpio.split("-");
  return digitoVerificador(cuerpo) === dv;
}

/** Valida un teléfono chileno con el formato completo "+56 9 XXXX XXXX". */
function esTelefonoChilenoValido(valor) {
  return /^\+56 9 \d{4} \d{4}$/.test((valor || "").trim());
}

/** ¿La fecha (input type="date", YYYY-MM-DD) es hoy o pasada? Vacía se considera válida. */
function fechaNoFutura(valor) {
  if (!valor) return true;
  return valor <= new Date().toISOString().slice(0, 10);
}

/** ¿`fin` es igual o posterior a `inicio`? Si falta alguna, se considera válida. */
function fechaMayorOIgual(inicio, fin) {
  if (!inicio || !fin) return true;
  return fin >= inicio;
}

/** Monto (CLP u otra unidad) mayor a 0 y hasta un máximo opcional. */
function montoPositivo(valor, max) {
  const numero = Number(valor);
  if (Number.isNaN(numero) || numero <= 0) return false;
  if (max !== undefined && numero > max) return false;
  return true;
}

/** Número entre `min` y `max` (inclusive), a diferencia de montoPositivo acepta 0. Vacío se considera válido (campo opcional). */
function numeroEntreOVacio(valor, min, max) {
  if (!campoRequerido(valor)) return true;
  const numero = Number(valor);
  return !Number.isNaN(numero) && numero >= min && numero <= max;
}

/**
 * Aplica el estado visual (Bootstrap .is-valid / .is-invalid) y escribe el
 * mensaje personalizado en el <div> de feedback asociado al campo.
 * `feedbackId` es opcional: si no se pasa, se busca el siguiente hermano
 * con clase .invalid-feedback / .valid-feedback dentro del mismo form-group.
 */
function marcarCampo(input, esValido, mensajeError) {
  const contenedor = input.closest(".mb-3, .col-12, .col-md-6, .col-sm-6") || input.parentElement;
  const feedback = contenedor ? contenedor.querySelector(".invalid-feedback") : null;
  const feedbackOk = contenedor ? contenedor.querySelector(".valid-feedback") : null;

  input.classList.remove("is-valid", "is-invalid");
  input.classList.add(esValido ? "is-valid" : "is-invalid");

  if (feedback && !esValido) {
    feedback.textContent = mensajeError || "Este campo no es válido.";
  }
  if (feedbackOk && esValido) {
    feedbackOk.style.display = "block";
  } else if (feedbackOk) {
    feedbackOk.style.display = "none";
  }
  return esValido;
}

function limpiarValidacion(input) {
  input.classList.remove("is-valid", "is-invalid");
}

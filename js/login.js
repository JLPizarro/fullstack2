document.addEventListener("DOMContentLoaded", () => {
  const formulario = document.getElementById("form-login");
  const inputCorreo = document.getElementById("correo");
  const inputPassword = document.getElementById("password");
  const botonEntrar = document.getElementById("btn-entrar");

  function validarCorreo() {
    if (!campoRequerido(inputCorreo.value)) {
      return marcarCampo(inputCorreo, false, "Ingresa tu correo institucional.");
    }
    if (!longitudEntre(inputCorreo.value, 1, 100)) {
      return marcarCampo(inputCorreo, false, "El correo no puede superar los 100 caracteres.");
    }
    if (!esCorreoValido(inputCorreo.value)) {
      return marcarCampo(inputCorreo, false, "Formato esperado: nombre@dominio.com");
    }
    return marcarCampo(inputCorreo, true);
  }

  function validarPassword() {
    if (!campoRequerido(inputPassword.value)) {
      return marcarCampo(inputPassword, false, "Ingresa tu contraseña.");
    }
    if (!longitudEntre(inputPassword.value, 4, 20)) {
      return marcarCampo(inputPassword, false, "Debe tener entre 4 y 20 caracteres.");
    }
    return marcarCampo(inputPassword, true);
  }

  inputCorreo.addEventListener("blur", validarCorreo);
  inputPassword.addEventListener("blur", validarPassword);
  inputCorreo.addEventListener("input", () => limpiarValidacion(inputCorreo));
  inputPassword.addEventListener("input", () => limpiarValidacion(inputPassword));

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const correoOk = validarCorreo();
    const passwordOk = validarPassword();

    if (!correoOk || !passwordOk) {
      formulario.classList.add("was-validated");
      return;
    }

    botonEntrar.disabled = true;
    botonEntrar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Ingresando...';

    window.setTimeout(() => {
      window.location.href = "index.html";
    }, 500);
  });
});

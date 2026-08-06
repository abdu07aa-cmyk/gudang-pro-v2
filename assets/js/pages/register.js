import { supabase } from "../core.js";

const form = document.getElementById("register-form");
const errBox = document.getElementById("auth-error");
const btn = document.getElementById("btn-submit");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errBox.style.display = "none";
  btn.disabled = true;
  btn.textContent = "Memproses...";

  const full_name = document.getElementById("full_name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });

  if (error) {
    errBox.textContent = error.message;
    errBox.style.display = "block";
    btn.disabled = false;
    btn.textContent = "Daftar";
    return;
  }

  document.querySelector(".auth-card").innerHTML = `
    <div class="auth-brand">
      <div class="mark">✓</div>
      <h1>Pendaftaran Terkirim</h1>
      <p>Akun kamu menunggu persetujuan admin. Cek email untuk verifikasi, lalu login setelah admin mengaktifkan akun.</p>
    </div>
    <a href="login.html" class="btn btn-primary" style="width:100%;justify-content:center;">Kembali ke Login</a>
  `;
});

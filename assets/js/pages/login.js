import { supabase, logActivity } from "../core.js";

// Kalau sudah login & aktif, langsung lempar ke dashboard
const { data: { session } } = await supabase.auth.getSession();
if (session) window.location.href = "dashboard.html";

const form = document.getElementById("login-form");
const errBox = document.getElementById("auth-error");
const btn = document.getElementById("btn-submit");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errBox.style.display = "none";
  btn.disabled = true;
  btn.textContent = "Memproses...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errBox.textContent = error.message.includes("Invalid")
      ? "Email atau password salah."
      : error.message;
    errBox.style.display = "block";
    btn.disabled = false;
    btn.textContent = "Login";
    return;
  }

  await logActivity("login", "User login ke sistem");
  window.location.href = "dashboard.html";
});

const refs = {
  heroView: document.getElementById("heroView"),
  authView: document.getElementById("authView"),
  openLoginBtn: document.getElementById("openLoginBtn"),
  signupTab: document.getElementById("signupTab"),
  loginTab: document.getElementById("loginTab"),
  switchToLoginBtn: document.getElementById("switchToLoginBtn"),
  switchToSignupBtn: document.getElementById("switchToSignupBtn"),
  loginForm: document.getElementById("loginForm"),
  signupForm: document.getElementById("signupForm"),
  consumerEmail: document.getElementById("consumerEmail"),
  consumerPassword: document.getElementById("consumerPassword"),
  registerName: document.getElementById("registerName"),
  registerEmail: document.getElementById("registerEmail"),
  registerPassword: document.getElementById("registerPassword"),
  landingNotice: document.getElementById("landingNotice")
};

let authMode = "signup";

wireEvents();
setAuthMode(authMode);

function wireEvents() {
  refs.openLoginBtn.addEventListener("click", showAuthScreen);
  refs.signupTab.addEventListener("click", () => setAuthMode("signup"));
  refs.loginTab.addEventListener("click", () => setAuthMode("login"));
  refs.switchToLoginBtn.addEventListener("click", () => setAuthMode("login"));
  refs.switchToSignupBtn.addEventListener("click", () => setAuthMode("signup"));
  refs.loginForm.addEventListener("submit", loginConsumer);
  refs.signupForm.addEventListener("submit", registerConsumer);
  window.addEventListener("keydown", handleKeydown);
}

function showAuthScreen() {
  refs.heroView.classList.add("is-hidden");
  refs.authView.classList.remove("is-hidden");
  setAuthMode("signup");
}

function showHeroScreen() {
  refs.authView.classList.add("is-hidden");
  refs.heroView.classList.remove("is-hidden");
}

function setAuthMode(mode) {
  authMode = mode;
  const isLogin = mode === "login";
  refs.signupTab.classList.toggle("is-active", !isLogin);
  refs.loginTab.classList.toggle("is-active", isLogin);
  refs.signupForm.classList.toggle("is-hidden", isLogin);
  refs.loginForm.classList.toggle("is-hidden", !isLogin);
  refs.landingNotice.textContent = "";
  if (isLogin) {
    refs.consumerEmail.focus();
  } else {
    refs.registerName.focus();
  }
}

function handleKeydown(event) {
  if (event.key === "Escape" && !refs.heroView.classList.contains("is-hidden")) return;
  if (event.key === "Escape" && !refs.authView.classList.contains("is-hidden")) {
    showHeroScreen();
  }
}

async function loginConsumer(event) {
  event.preventDefault();
  const email = refs.consumerEmail.value.trim().toLowerCase();
  if (!email.includes("@")) {
    return showNotice("Customer login needs your registered email ID. Use Create Account if you are new.");
  }
  const payload = {
    email,
    password: refs.consumerPassword.value
  };
  let res;
  let data;
  try {
    res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    data = await res.json();
  } catch {
    return showNotice("Unable to reach server. Please retry.");
  }
  if (!res.ok) return showNotice(data.message || "Consumer login failed. Please check email/password.");
  localStorage.setItem("ck_user", JSON.stringify(data.user));
  showNotice("Consumer login successful. Redirecting...");
  window.location.href = "/customer-react/";
}

async function registerConsumer(event) {
  event.preventDefault();
  const payload = {
    name: refs.registerName.value.trim(),
    email: refs.registerEmail.value.trim(),
    password: refs.registerPassword.value
  };
  let res;
  let data;
  try {
    res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    data = await res.json();
  } catch {
    return showNotice("Unable to reach server. Please retry.");
  }
  if (!res.ok) return showNotice(data.message || "Registration failed.");
  localStorage.setItem("ck_user", JSON.stringify(data.user));
  showNotice("Account created. Redirecting to customer app...");
  window.location.href = "/customer-react/";
}

function showNotice(message) {
  refs.landingNotice.textContent = message;
}

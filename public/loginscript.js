const input = document.getElementById("nicknameInput");
const btn = document.getElementById("startBtn");
const error = document.getElementById("error");

// Cihaz algılama (mobil mi?)
function isMobileDevice() {
  return (
    window.matchMedia("(max-width: 768px)").matches ||
    /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent)
  );
}

// ENTER ile gönder
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") start();
});

btn.addEventListener("click", start);

async function start() {
  const nickname = input.value.trim();

  if (nickname.length < 3) {
    error.textContent = "Takma ad en az 3 karakter olmalı.";
    return;
  }

  error.textContent = "";

  // session'a kaydet
  sessionStorage.setItem("nickname", nickname);

  // mobil / desktop yönlendirme
  const nextPage = isMobileDevice() ? "Mesajlasma.mobile.html" : "Mesajlasma.html";
  window.location.href = nextPage;
}

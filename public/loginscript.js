const input = document.getElementById("nicknameInput");
const btn = document.getElementById("startBtn");
const error = document.getElementById("error");

// ENTER ile gönder
input.addEventListener("keydown", e => {
  if (e.key === "Enter") start();
});

btn.addEventListener("click", start);

async function start(){
  const nickname = input.value.trim();

  if (nickname.length < 3){
    error.textContent = "Takma ad en az 3 karakter olmalı.";
    return;
  }

  // ŞİMDİLİK LOCAL (sonra server'a bağlayacağız)
  sessionStorage.setItem("nickname", nickname);
  window.location.href = "Mesajlasma.html"; // ileride gerçek sohbet sayfası
}

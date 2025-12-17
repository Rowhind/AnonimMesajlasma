// ====== ELEMENTS (desktop + mobile uyumlu) ======
const chat =
  document.getElementById("chat") ||
  document.getElementById("chatBody"); // mobile/desktop farkı için

const input = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");

const userListEl =
  document.getElementById("userList") ||
  document.getElementById("mUsersList"); // WhatsApp mobile list

const userSearch =
  document.getElementById("userSearch") ||
  document.getElementById("mSearchInput");

const chatWithEl = document.getElementById("chatWith");
const startHint = document.getElementById("startHint");

// Mobil WhatsApp akışı için (varsa)
const mobileListView = document.getElementById("mobileListView");
const mobileChatView = document.getElementById("mobileChatView");
const backBtn =
  document.getElementById("mBackBtn") ||
  document.getElementById("backBtn"); // senin önceki mobil HTML'inde backBtn vardı

// Menüler (desktop’ta var, mobile’da yok olabilir)
const leftMenuBtn = document.getElementById("leftMenuBtn");
const leftMenu = document.getElementById("leftMenu");
const logoutBtn = document.getElementById("logoutBtn");

const chatMenuBtn = document.getElementById("chatMenuBtn");
const chatMenu = document.getElementById("chatMenu");
const clearChatBtn = document.getElementById("clearChatBtn");

// ====== helpers: mobile mode ======
function isMobileUI() {
  // mobil whatsapp şablonu varsa
  if (mobileListView || mobileChatView) return true;
  // dosya adı .mobile ise de mobil say
  if (location.pathname.toLowerCase().includes("mobile")) return true;
  return false;
}

function goListMode() {
  if (!isMobileUI()) return;
  document.body.classList.remove("mode-chat");
  document.body.classList.add("mode-list");
}

function goChatMode() {
  if (!isMobileUI()) return;
  document.body.classList.remove("mode-list");
  document.body.classList.add("mode-chat");
}

// back butonu varsa bağla
if (backBtn) backBtn.addEventListener("click", goListMode);

// ====== nickname ======
const myNick = sessionStorage.getItem("nickname");
if (!myNick) {
  const goLogin = isMobileUI() ? "login.mobile.html" : "login.html";
  location.href = goLogin;
}

let activeUser = null;

// ====== DATA ======
let users = []; // server'dan gelecek
const inbox = new Map();  // key: otherNick, value: [{from,to,text,ts}]
const unread = new Map(); // key: otherNick, value: number

// ====== helpers ======
function pad(n) { return String(n).padStart(2, "0"); }
function nowTime() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function avatarUrl(seed) {
  return `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(seed)}`;
}

function closeMenus() {
  if (leftMenu) leftMenu.classList.remove("show");
  if (chatMenu) chatMenu.classList.remove("show");
}

function getThreadKey(m) {
  // konuşmanın "diğer kişi" anahtarı
  return (m.from === myNick) ? m.to : m.from;
}

function renderThread(otherNick) {
  if (!chat) return;

  chat.innerHTML = "";
  const arr = inbox.get(otherNick) || [];

  arr.forEach((m) => {
    if (m.from === myNick) addMyMessage(m.text);
    else addOtherMessage(m.text, m.from);
  });

  chat.scrollTop = chat.scrollHeight;
}

// ====== SOCKET ======
const socket = io({
  auth: { nickname: myNick }
});

socket.on("connect", () => console.log("✅ connected", socket.id));
socket.on("connect_error", (e) => console.log("❌ connect_error", e.message));
socket.on("error_message", (t) => addOtherMessage(t, "Sistem"));

socket.on("users_list", (names) => {
  console.log("📋 users_list geldi:", names);

  users = names
    .filter(n => n.toLowerCase() !== myNick.toLowerCase())
    .map(nickname => ({ nickname }));

  // yeni gelen kullanıcılar için unread default 0
  users.forEach(u => {
    if (!unread.has(u.nickname)) unread.set(u.nickname, 0);
  });

  renderUsers(users);

  // aktif seçili kişi offline olduysa düşür
  if (activeUser && !users.some(u => u.nickname === activeUser)) {
    activeUser = null;
    if (chatWithEl) chatWithEl.textContent = "Kimse seçilmedi";
    if (chat) chat.innerHTML = "";
    if (startHint) startHint.style.display = "block";
    if (isMobileUI()) goListMode();
  }
});

// ====== KARŞIDAN GELEN MESAJLAR ======
socket.on("private_message", (m) => {
  // m = { id, from, to, text, ts }
  const other = getThreadKey(m);

  // inbox'a yaz
  if (!inbox.has(other)) inbox.set(other, []);
  inbox.get(other).push(m);

  // Eğer o kişi seçiliyse, sadece o sohbeti güncelle
  if (activeUser === other) {
    // benim mesajımın echo'sunu iki kere basmayalım
    if (m.from === myNick) return;

    addOtherMessage(m.text, m.from);
    return;
  }

  // başka sohbet açıksa veya kimse seçili değilse: unread artır (sadece karşıdan geldiyse)
  if (m.from !== myNick) {
    unread.set(other, (unread.get(other) || 0) + 1);
    renderUsers(users); // badge güncellensin
  }

  console.log("📩 yeni mesaj (unread arttı):", m);
});

// ====== render users (desktop + mobile) ======
function renderUsers(list) {
  if (!userListEl) return;

  userListEl.innerHTML = "";

  if (list.length === 0) {
    const div = document.createElement("div");
    div.className = "startHint";
    div.innerHTML = `<div class="startHintTitle">Şu an başka kimse yok</div>
                     <div class="startHintSub">Birisi bağlanınca burada görünecek.</div>`;
    userListEl.appendChild(div);
    return;
  }

  const mobile = isMobileUI() && (userListEl.id === "mUsersList" || !!mobileListView);

  list.forEach(u => {
    const row = document.createElement("div");
    const isActive = activeUser === u.nickname;

    // mobilde farklı class’lar (mUserRow/mUserName) daha iyi görünür
    row.className = (mobile ? "mUserRow" : "userRow") + (isActive ? " active" : "");
    row.dataset.nick = u.nickname;

    const count = unread.get(u.nickname) || 0;

    if (mobile) {
      row.innerHTML = `
        <img class="avatarImg" alt="" src="${avatarUrl(u.nickname)}">
        <div class="mUserName">${u.nickname}</div>
        ${count > 0 ? `<div class="badge">${count}</div>` : ``}
      `;
    } else {
      row.innerHTML = `
        <img class="avatarImg" alt="" src="${avatarUrl(u.nickname)}">
        <div class="userName">${u.nickname}</div>
        ${count > 0 ? `<div class="badge">${count}</div>` : ``}
      `;
    }

    row.addEventListener("click", () => {
      // desktop active class temizliği
      document.querySelectorAll(".userRow, .mUserRow").forEach(x => x.classList.remove("active"));
      row.classList.add("active");

      activeUser = u.nickname;
      if (chatWithEl) chatWithEl.textContent = u.nickname;

      if (startHint) startHint.style.display = "none";

      // unread sıfırla + badge temizle
      unread.set(activeUser, 0);
      renderUsers(users);

      // O kişiyle olan mesajları göster
      renderThread(activeUser);

      // WhatsApp mobile: chat ekranına geç
      if (mobile) goChatMode();
    });

    userListEl.appendChild(row);
  });
}

function filterUsers() {
  if (!userSearch) return;
  const q = userSearch.value.trim().toLowerCase();
  const filtered = users.filter(u => u.nickname.toLowerCase().includes(q));
  renderUsers(filtered);
}

// ====== messages UI ======
function addMyMessage(text) {
  if (!chat) return;

  const row = document.createElement("div");
  row.className = "bubbleRow me";
  row.innerHTML = `
    <div class="bubble me">
      <div class="bubbleTop">
        <span class="name">${myNick}</span>
        <span class="time">${nowTime()}</span>
      </div>
      <p class="msg"></p>
    </div>
  `;
  row.querySelector(".msg").textContent = text;
  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
}

function addOtherMessage(text, nick) {
  if (!chat) return;

  const row = document.createElement("div");
  row.className = "bubbleRow other";
  row.innerHTML = `
    <div class="miniAvatar">${(nick || "A").slice(0,1).toUpperCase()}</div>
    <div class="bubble other">
      <div class="bubbleTop">
        <span class="name">${nick || "Anonim"}</span>
        <span class="time">${nowTime()}</span>
      </div>
      <p class="msg"></p>
    </div>
  `;
  row.querySelector(".msg").textContent = text;
  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
}

// ====== send ======
function send() {
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  if (!activeUser) {
    addOtherMessage("Önce bir kullanıcı seçmelisin.", "Sistem");
    input.value = "";
    return;
  }

  // UI'a bas
  addMyMessage(text);

  // inbox'a da yaz
  const m = { from: myNick, to: activeUser, text, ts: Date.now() };
  if (!inbox.has(activeUser)) inbox.set(activeUser, []);
  inbox.get(activeUser).push(m);

  // server'a gönder
  socket.emit("private_message", { to: activeUser, text });

  input.value = "";
  input.focus();
}

// Enter ile gönder
if (input) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  });
}

if (sendBtn) sendBtn.addEventListener("click", send);

// ====== menus (varsa) ======
if (leftMenuBtn && leftMenu) {
  leftMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    leftMenu.classList.toggle("show");
    if (chatMenu) chatMenu.classList.remove("show");
  });
}

if (chatMenuBtn && chatMenu) {
  chatMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    chatMenu.classList.toggle("show");
    if (leftMenu) leftMenu.classList.remove("show");
  });
}

document.addEventListener("click", closeMenus);

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("nickname");
    const goLogin = isMobileUI() ? "login.mobile.html" : "login.html";
    location.href = goLogin;
  });
}

if (clearChatBtn) {
  clearChatBtn.addEventListener("click", () => {
    if (chat) chat.innerHTML = "";
    if (startHint) startHint.style.display = "block";
    closeMenus();
  });
}

// Search
if (userSearch) userSearch.addEventListener("input", filterUsers);

// mobilde sayfa ilk açılınca liste moduna geç
if (isMobileUI()) {
  if (!document.body.classList.contains("mode-chat")) {
    document.body.classList.add("mode-list");
  }
}

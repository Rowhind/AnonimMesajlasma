require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// ✅ Render için doğru PORT kullanımı
const PORT = process.env.PORT || 3000;

// ✅ CORS: Render/Local fark etmeden çalışsın diye "origin: true"
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ✅ public klasörünü tarayıcıya aç
app.use(express.static(path.join(__dirname, "public")));

// health check
app.get("/health", (req, res) => res.json({ ok: true }));

// ✅ Socket.IO CORS aynı mantık
const io = new Server(server, {
  cors: { origin: true, credentials: true }
});

// online user maps
const socketToName = new Map(); // socket.id -> nickname
const nameToSocket = new Map(); // nickname -> socket.id

function getOnlineUsers() {
  const names = Array.from(new Set(socketToName.values()));
  names.sort((a, b) => a.localeCompare(b, "tr"));
  return names;
}

io.on("connection", (socket) => {
  const raw = socket.handshake.auth?.nickname;
  const nickname = (typeof raw === "string" ? raw : "").trim();

  if (!nickname) {
    socket.emit("error_message", "Nickname boş olamaz.");
    socket.disconnect(true);
    return;
  }

  // aynı nickname ile ikinci kez girilirse eskisini düşür (isteğe bağlı ama pratik)
  const oldSocketId = nameToSocket.get(nickname);
  if (oldSocketId && oldSocketId !== socket.id) {
    io.to(oldSocketId).emit("error_message", "Aynı nickname ile başka giriş yapıldı. Çıkış yapıldı.");
    io.sockets.sockets.get(oldSocketId)?.disconnect(true);
  }

  socketToName.set(socket.id, nickname);
  nameToSocket.set(nickname, socket.id);

  // herkese kullanıcı listesini gönder
  io.emit("users_list", getOnlineUsers());

  socket.on("private_message", (payload) => {
    const from = socketToName.get(socket.id);
    if (!from) return;

    const to = (payload?.to || "").toString().trim();
    const text = (payload?.text || "").toString().trim();

    if (!to || !text) return;

    const targetSocketId = nameToSocket.get(to);

    const messageObj = {
      id: makeId(),
      from,
      to,
      text,
      ts: Date.now()
    };

    // gönderen kendi ekranında da görsün
    socket.emit("private_message", messageObj);

    // alıcı online ise ona gönder
    if (targetSocketId) {
      io.to(targetSocketId).emit("private_message", messageObj);
    } else {
      socket.emit("error_message", `${to} şu an çevrimdışı. Mesaj kaydedilmedi.`);
    }
  });

  socket.on("disconnect", () => {
    const name = socketToName.get(socket.id);
    socketToName.delete(socket.id);

    if (name && nameToSocket.get(name) === socket.id) {
      nameToSocket.delete(name);
    }

    io.emit("users_list", getOnlineUsers());
  });
});

function makeId() {
  try {
    return require("crypto").randomBytes(8).toString("hex");
  } catch {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
  }
}

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

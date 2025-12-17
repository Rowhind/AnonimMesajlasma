require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || `http://localhost:${PORT}`;

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

// public klasörünü tarayıcıya aç
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => res.json({ ok: true }));

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true }
});

const socketToName = new Map();
const nameToSocket = new Map();

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

  socketToName.set(socket.id, nickname);
  nameToSocket.set(nickname, socket.id);

  socket.emit("users_list", getOnlineUsers());
  io.emit("users_list", getOnlineUsers());

  socket.on("private_message", (payload) => {
    const from = socketToName.get(socket.id);
    if (!from) return;

    const to = (payload?.to || "").toString().trim();
    const text = (payload?.text || "").toString();

    if (!to || !text.trim()) return;

    const targetSocketId = nameToSocket.get(to);

    const messageObj = {
      id: makeId(),
      from,
      to,
      text,
      ts: Date.now()
    };

    socket.emit("private_message", messageObj);

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
  console.log(`Server running: http://localhost:${PORT}`);
});

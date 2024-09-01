import http from 'http';
import express from 'express';
import SocketIo from 'socket.io';
import { count } from 'console';

const app = express();

app.set('view engine', 'pug');
app.set("views", __dirname + "/public/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));
const handleListen = () => console.log(`Listening on http://localhost:3000`)

const server = http.createServer(app);
const wsServer = SocketIo(server);

const countRoom = (roomName) => wsServer.sockets.adapter.rooms.get(roomName)?.size;

wsServer.on("connection", (socket) => {
  socket.on("join_room", (roomName) => {
    if (countRoom(roomName) === 2) {
      socket.emit("full");
    } else {
      socket.join(roomName);
      socket.to(roomName).emit("welcome");
    }
  });
  socket.on("offer", (offer, roomName) => {
    socket.to(roomName).emit("offer", offer);
  });
  socket.on("answer", (answer, roomName) => {
    socket.to(roomName).emit("answer", answer);
  });
  socket.on("ice", (ice, roomName) => {
    socket.to(roomName).emit("ice", ice);
  });

  socket.on("disconnecting", (roomName) => {
    socket.to(roomName).emit("bye");
  });
});

server.listen(3000, handleListen);

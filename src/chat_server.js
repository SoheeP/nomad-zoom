import http from 'http';
import express from 'express';
import SocketIo from 'socket.io';
import { instrument } from '@socket.io/admin-ui';

const app = express();

app.set('view engine', 'pug');
app.set("views", __dirname + "/public/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));
const handleListen = () => console.log(`Listening on http://localhost:3000`)

const server = http.createServer(app);
const ioServer = SocketIo(server);

const findPublicRooms = () => {
  const { sockets : { adapter : { sids, rooms } } } = ioServer;
  const publicRooms = [];
  rooms.forEach((_, key) => {
    if(sids.get(key) === undefined){
      publicRooms.push(key);
    }
  });
  return publicRooms
}

const countRoom = (roomName) => ioServer.sockets.adapter.rooms.get(roomName)?.size;

ioServer.on("connection", (socket) => {
    socket.on("enterRoom", (roomName, done) => {
        socket.join(roomName);
        done();
        // 본인을 제외한 모두에게 메세지를 보낸다
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
        ioServer.sockets.emit("roomChange", findPublicRooms());
    });
    socket.on("disconnecting", () => {
      // 아직 떠나지 않았기 때문에 나를 포함한 명수를 셈
      socket.rooms.forEach(room => socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1));
    });
    socket.on("disconnect", () => {
      ioServer.sockets.emit("roomChange", findPublicRooms());
    })
    socket.on("newMessage", (msg, roomName, done) => {
        socket.to(roomName).emit("newMessage", `${socket.nickname}: ${msg}`);
        done();
    })
    socket.on("setNickname", ( nickname ) => {
      socket.nickname = nickname
    })
});

server.listen(3000, handleListen);
const socket = io();

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

const room = document.getElementById("room");
let roomName = "";
let userName = "";
room.hidden = true;

const handleMessageSubmit = (event) => {
  event.preventDefault();
  const input = room.querySelector("#message input");
  const value = input.value;
  socket.emit("newMessage", value, roomName, () => {
    addMessage(`You: ${value}`);
  });
  input.value = "";
}
const handleNicknameSubmit = () => {
  const input = welcomeForm.querySelector("#name");
  socket.emit("setNickname", input.value, roomName);
  userName = input.value;
  const p = room.querySelector("p");
  p.innerText = `Your nickName: ${userName}`;
  input.value = "";
}
const showRoom = () => {
  welcomeForm.hidden = true;
  room.hidden = false;
  const h3 = room.querySelector("h3");
  h3.innerText = `Room: ${roomName}`;
  const msgForm = room.querySelector("#message");
  msgForm.addEventListener("submit", handleMessageSubmit);
}
const handleRoomSubmit = () => {
  const input = welcomeForm.querySelector("#roomName")
  socket.emit("enterRoom", input.value, showRoom);
  roomName = input.value
  input.value = "";
}

welcomeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleNicknameSubmit();
  handleRoomSubmit();
})

const addMessage = (msg) => {
  const ul = room.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = msg;
  ul.appendChild(li);
}

const roomNameAndCount = (count) => {
  const h3 = room.querySelector("h3")
  h3.innerText = `Room: ${roomName} (${count})`;
}
socket.on("welcome", (user, newCount) => {
  roomNameAndCount(newCount);
  addMessage(`${user} arrived`);
})

socket.on("bye", (left, newCount) => {
  roomNameAndCount(newCount);
  addMessage(`${left} left ㅠㅠ`);
})

socket.on("newMessage", addMessage);

socket.on("roomChange", (rooms) => {
  const roomList = welcome.querySelector("ul");
  roomList.innerHTML =""
  rooms.forEach(room => {
    if (roomList.length === 0) {
      return
    }
    const li = document.createElement("li");
    li.innerText = room;
    roomList.appendChild(li);
  })
})
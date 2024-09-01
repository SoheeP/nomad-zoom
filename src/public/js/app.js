const socket = io();

const call = document.getElementById("call");
call.hidden = true;

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const exitBtn = document.getElementById("exit");
let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;

const getCameras = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      // 현재 선택된 카메라로 옵션 선택한걸로 표시
      if (currentCamera.label === camera.label) {
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    })
  } catch (e) {
    console.log(e)
  }
}

const getMedia = async (deviceId) => {
  const initialConstrains = {
    audio: true,
    video: { facingMode: "user" },
  }
  const cameraConstraints = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  }
  try {
    myStream = await navigator.mediaDevices.getUserMedia(deviceId ? cameraConstraints : initialConstrains);
    // 카메라가 변경되도 마이크 사용설정 그대로
    myStream.getAudioTracks().forEach((track) => (track.enabled = !muted));
    myFace.srcObject = myStream;
    if (!deviceId) {
      await getCameras();
    }
  } catch(e) {
    console.log(e)
  }
}


const handleMuteClick = () => {
  myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "Unmute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
}
const handleCameraClick = () => {
  myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraBtn.innerText = "Turn Camera Off";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "Turn Camera On";
    cameraOff = true;
  }
}

const handleCameraChange = async () => {
  await getMedia(camerasSelect.value);
  // 다른 deviceId로 stream을 항상 만들고 있으므로, 0번째 videoTrack을 가져와서 replaceTrack을 해줌
  const videoTrack = myStream.getVideoTracks()[0]
  if (myPeerConnection){
    const videSender = myPeerConnection.getSenders().find((sender) => sender.track.kind === "video");
    videSender.replaceTrack(videoTrack);
  }
}
const closeCall = () => {
  myPeerConnection.close();
  socket.close();
  window.location.reload();
}

muteBtn.addEventListener("click", handleMuteClick)
cameraBtn.addEventListener("click", handleCameraClick)
camerasSelect.addEventListener("input", handleCameraChange)
exitBtn.addEventListener("click", closeCall)

//Welcome Form
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

const initCall = async () => {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}
const handleWelcomeSubmit = async(event) => {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  await initCall();
  socket.emit("join_room", input.value);
  roomName = input.value;
  input.value = ""
}
welcomeForm.addEventListener("submit", handleWelcomeSubmit)

// Socket Code
socket.on("welcome", async () => {
  // peer A 브라우저에서 발생하는 코드
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", (event) => {
    makeChatMessage(event.data, "received");

  });
  console.log("made data channel")
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  // 누구에게 offer를 보낼지 정해서 보냄
  socket.emit("offer", offer, roomName);
  console.log("sent an offer")
})

socket.on("offer", async (offer) => {
  // peer B 브라우저에서 발생하는 코드
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) => {
      makeChatMessage(event.data, "received");
    });
  })
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName)
})

socket.on("answer", (answer) => {
  console.log("answer, ", answer)
  // answer 받은 뒤 peer A 브라우저에서 발생하는 코드
  myPeerConnection.setRemoteDescription(answer);
})

socket.on("ice", (ice) => {
  myPeerConnection.addIceCandidate(ice);
})

socket.on("full", () => {
  alert("Room is full!");
  window.location.reload();
})

//RTC Code
const handleIce = (data) => {
  // 브라우저가 candidate를 서로 주고 받음
  console.log("sent candidate")
  socket.emit("ice", data.candidate, roomName)
}
const handleAddStream = (data) => {
  const peerFace = document.getElementById("peerFace");
  peerFace.srcObject = data.stream;
  peerFace.hidden = false;
}

const handleRemoveStream = () => {
  const peerFace = document.getElementById("peerFace");
  peerFace.srcObject = null;
  peerFace.hidden = true;
}
const makeConnection = () => {
  // peer-to-peer connection
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, myStream));
  myPeerConnection.addEventListener("connectionstatechange", () => {
    console.log(myPeerConnection.connectionState)
    if (myPeerConnection.connectionState === "disconnected" || myPeerConnection.connectionState === "failed" || myPeerConnection.connectionState === "closed") {
      handleRemoveStream();
    }
  })
}

// Chat
const messagesDiv = document.getElementById("messages");
const chatForm = document.querySelector("#chat form");
const makeChatMessage = (text, type) => {
  const span = document.createElement("span");
  span.innerText = text;
  span.classList.add(type === "send" ? "send" : "received");
  messagesDiv.appendChild(span);
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const chatInput = chatForm.querySelector("input");
  myDataChannel.send(chatInput.value);
  makeChatMessage(chatInput.value, "send");
  chatInput.value = "";
})

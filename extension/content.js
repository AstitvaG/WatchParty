console.log("Modules loded")
var socket = io("http://localhost:4000");
var peer = new Peer();
var vidStream, myId, roomId;
socket.on('userJoined', id => {
    console.log("new user joined", id)
    console.log("**", vidStream);
    socket.emit("setHost", myId, roomId);
    const call = peer.call(id, vidStream);
    call.on('error', (err) => {
        alert(err);
    })
    call.on('stream', userStream => {
        console.log("Rec also Streaming")
        // addVideo(vid, userStream);
    })
    call.on('close', () => {
        console.log("user disconect")
    })
})
peer.on('open', async (id) => {
    roomId = await fetch('http://localhost:4000/fetchID')
        .then(response => response.json())
    console.log("RoomID : ", roomId)
    try {
        vidStream = window.document.querySelectorAll("video")[0].captureStream();
    }
    catch {
        vidStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });
    }
    myId = id;
    console.log("Peer opened")
    socket.emit("newUser", id, roomId);
    socket.emit("setHost", id, roomId);
    console.log("Starting Stream")
})
peer.on('call', async call => {
    console.log("Rec Called");
    socket.emit("setHost", id, roomId);
    call.answer(vidStream);
})
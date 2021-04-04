const socket = io('/');
const peer = new Peer();
let myVideoStream;
let myId;
var videoGrid = document.getElementById('videoDiv')
var hostDiv = document.getElementById('hostDiv')
var myvideo = document.createElement('video');
var host_id;
myvideo.muted = true;
const peerConnections = {}

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
})
    .then((stream) => {
        myVideoStream = stream;
        addVideo(myvideo, stream);
        peer.on('call', call => {
            call.answer(stream);
            const vid = document.createElement('video');

            call.on('stream', userStream => {
                console.log(call.peer, host_id)
                addVideo(vid, userStream, call.peer == host_id ? 2 : 1);
            })
            call.on('error', (err) => {
                alert(err)
            })
        })
    }).catch(err => {
        alert(err.message)
    })


peer.on('open', (id) => {
    myId = id;
    socket.emit("newUser", id, roomID);
})

peer.on('error', (err) => {
    alert(err.type);
});

socket.on('userJoined', id => {
    console.log("new user joined", id)
    const call = peer.call(id, myVideoStream);
    const vid = document.createElement('video');
    call.on('error', (err) => {
        alert(err);
    })
    call.on('stream', userStream => {
        console.log("Streaming")
        addVideo(vid, userStream, id == host_id ? 2 : 1);
    })
    call.on('close', () => {
        vid.remove();
        console.log("user disconect")
    })
    peerConnections[id] = call;
})

socket.on('setMyHost', id => {
    console.log("Called");
    host_id = id
});

socket.on('userDisconnect', id => {
    if (peerConnections[id]) {
        peerConnections[id].close();
    }
})

function addVideo(video, stream, type = 1) {
    // console.log(window.document.querySelectorAll("video,audio"))
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    if (type === 1) videoGrid.append(video);
    else hostDiv.append(video);
}

function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        console.log('Fallback: Copying text command was ' + msg);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }
    document.body.removeChild(textArea);
}
function copyTextToClipboard(text) {
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }
    navigator.clipboard.writeText(text).then(function () {
        console.log('Async: Copying to clipboard was successful!');
    }, function (err) {
        console.error('Async: Could not copy text: ', err);
    });
}
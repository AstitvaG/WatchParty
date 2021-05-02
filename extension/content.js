console.log("Modules loded")
var socket = io("http://192.168.43.136:3016")

socket.request = function request(type, data = {}) {
    return new Promise((resolve, reject) => {
        socket.emit(type, data, (data) => {
            if (data.error) {
                reject(data.error)
            } else {
                resolve(data)
            }
        })
    })
}

var rc = null
var producer = null;
var room_id = null

function joinRoom(name, room_id) {
    if (rc && rc.isOpen()) {
        console.log('already connected to a room')
    } else {
        var videoGrid = document.createElement('div')
        var audioGrid = document.createElement('div')

        rc = new RoomClient(videoGrid, videoGrid, audioGrid, window.mediasoupClient, socket, room_id, name, () => {
            rc.produce(RoomClient.mediaType.screen)
        })
    }
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

(async () => {
    room_id = await socket.request('getNewRoom');
    console.log(document.name)
    console.log('http://192.168.43.136:3016/' + room_id, document.name)
    chrome.runtime.sendMessage({ cmd: "sendInfo", room_id, name: document.name })
    document.room_id = room_id
    joinRoom(document.name, room_id)
    chrome.runtime.sendMessage({ cmd: "load_html" }, (html) => {
        let chatHost = document.createElement('div');
        chatHost.style.cssText = "width: 100vw;height: 100vh;z-index : 1000000;position: fixed;pointer-events: none;"
        console.log(chatHost)
        chatHost.innerHTML = html
        document.body.append(chatHost);
        document.getElementById('meetLink').href = 'http://192.168.43.136:3016/' + room_id;
        document.getElementById('meetLink').innerHTML = 'http://192.168.43.136:3016/' + room_id;
        document.getElementById('copyLink').addEventListener('click', () => {
            copyTextToClipboard('http://192.168.43.136:3016/' + room_id)
        })
        document.getElementById('newChat').addEventListener("keydown", (e) => {
            if (e.code === "Enter") {  //checks whether the pressed key is "Enter"
                // console.log(document.getElementById('newChat').value);

                if (document.getElementById('newChat').value != '') {
                    socket.emit('sendMsg', { Name: document.name, Room: room_id, Msg: document.getElementById('newChat').value });
                    document.getElementById('newChat').value = ""
                }
            }
        });
    })
})();
console.log("Modules loded")
var socket = io("https://127.0.0.1:3016", {reconnect: false})

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

function joinRoom(name, room_id) {
    if (rc && rc.isOpen()) {
        console.log('already connected to a room')
    } else {
        var videoGrid = document.createElement('div')
        var audioGrid = document.createElement('div')

        rc = new RoomClient(videoGrid, videoGrid, audioGrid, window.mediasoupClient, socket, room_id, name, () => {
            // rc.produce(RoomClient.mediaType.audio, 0)
            // rc.produce(RoomClient.mediaType.video, 0)
            rc.produce(RoomClient.mediaType.screen)

        })
        // addListeners()
    }
}

joinRoom(Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), 'room')
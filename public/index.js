const socket = io()


const dropdowns = document.querySelectorAll('.dropdown');

dropdowns.forEach(dropdown => {
    dropdown.addEventListener('click', (e) => {
        dropdown.classList.toggle('dropdown__options--visible')
    })

    // dropdown.querySelectorAll('.dropdown__options .dropdown__option').forEach(opt => {
    //     opt.addEventListener('click', (e) => {
    //         dropdown.querySelector('.dropdown__selected').innerHTML = opt.innerHTML;
    //         dropdown.querySelector('.dropdown__option--selected').classList.remove('dropdown__option--selected');
    //         opt.classList.add('dropdown__option--selected');
    //     })
    // })
})

if (location.href.substr(0, 5) !== 'https')
    location.href = 'https' + location.href.substr(4, location.href.length - 4)


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


let rc = null
let producer = null;

var videoGrid = document.getElementById('videoDiv')
var audioGrid = document.getElementById('videoDiv')
var hostDiv = document.getElementById('hostDiv')
var audioSelect = document.getElementById('audioSelect')
var videoSelect = document.getElementById('videoSelect')

function joinRoom(name, room_id) {
    if (rc && rc.isOpen()) {
        console.log('already connected to a room')
    } else {
        rc = new RoomClient(videoGrid, hostDiv, audioGrid, window.mediasoupClient, socket, room_id, name, () => {
            // rc.produce(RoomClient.mediaType.audio, 0)
            // rc.produce(RoomClient.mediaType.video, 0)
        })
        addListeners()
    }
}

joinRoom(Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), roomID)


function addListeners() {
    rc.on(RoomClient.EVENTS.startScreen, () => {
        // hide(startScreenButton)
        // reveal(stopScreenButton)
    })

    rc.on(RoomClient.EVENTS.stopScreen, () => {
        // hide(stopScreenButton)
        // reveal(startScreenButton)

    })

    rc.on(RoomClient.EVENTS.stopAudio, () => {
        // hide(stopAudioButton)
        // reveal(startAudioButton)

    })
    rc.on(RoomClient.EVENTS.startAudio, () => {
        // hide(startAudioButton)
        // reveal(stopAudioButton)
    })

    rc.on(RoomClient.EVENTS.startVideo, () => {
        // hide(startVideoButton)
        // reveal(stopVideoButton)
    })
    rc.on(RoomClient.EVENTS.stopVideo, () => {
        // hide(stopVideoButton)
        // reveal(startVideoButton)
    })
    rc.on(RoomClient.EVENTS.exitRoom, () => {
        // hide(control)
        // reveal(login)
        // hide(videoMedia)
    })
}

audioDevice = 0;
videoDevice = 0;

(async () => {
    try {
        let stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach(function (track) {
            track.stop();
        });

        let devices = await navigator.mediaDevices.enumerateDevices();
        devices.forEach(device => {
            let el = null
            if ('audioinput' === device.kind) {
                el = audioSelect
            } else if ('videoinput' === device.kind) {
                el = videoSelect
            }
            if (!el) return

            let option = document.createElement('div')
            option.classList.add('dropdown__option')
            if (el.children.length == 0) {
                el.parentElement.querySelector('.dropdown__selected').innerHTML = device.label;
                option.classList.add('dropdown__option--selected')
            }
            // option.value = device.deviceId
            option.innerHTML = device.label
            option.addEventListener('click', (e) => {
                idx = Array.prototype.indexOf.call(option.parentElement.children, option)
                (el == videoSelect ? videoDevice : audioDevice) = idx 
                el.parentElement.querySelector('.dropdown__selected').innerHTML = option.innerHTML;
                el.parentElement.querySelector('.dropdown__option--selected').classList.remove('dropdown__option--selected');
                option.classList.add('dropdown__option--selected');
            })
            el.appendChild(option)
        })
    }
    catch(e) {
        console.log(e)
        audioSelect.parentElement.querySelector('.dropdown__selected').innerHTML = 'Permission Denied';
        videoSelect.parentElement.querySelector('.dropdown__selected').innerHTML = 'Permission Denied';

        dropdowns.forEach(dropdown => {
            var new_element = dropdown.cloneNode(true);
            dropdown.parentNode.replaceChild(new_element, dropdown);
        })
    }
})();

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
const socket = io()

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
let initdetails = null;

function joinRoom(name, room_id) {
    if (rc && rc.isOpen()) {
        console.log('already connected to a room')
    } else {
        rc = new RoomClient(videoDiv, hostDiv, audioDiv, window.mediasoupClient, socket, room_id, name, () => {
            // rc.produce(RoomClient.mediaType.audio, 0)
            // rc.produce(RoomClient.mediaType.video, 0)
        })
        addListeners()
    }
}

(async () => {
    if (roomID.length != 11) {
        roomID = await socket.request('getNewRoom')
        window.location.replace(roomID)
    }
    let meetlink = document.getElementById('meetLink')
    meetlink.innerHTML = window.location.href
    meetlink.href = window.location.href
    let res = await fetch('https://randomuser.me/api/?results=1&nat=us&inc=name')
        .then(res => res.json())
        .then(res => res.results[0].name)
    var nameInp = document.getElementById('nameInp')
    nameInp.value = res.first
    document.getElementById('joinNow').addEventListener('click', e => {
        var nameInp = document.getElementById('nameInp')
        var roomInp = document.getElementById('roomInp')
        if (nameInp.value !== '' && /[a-z]{3}-[a-z]{3}-[a-z]{3}/.test(roomInp.value)) {
            joinRoom(nameInp.value, roomInp.value)
            document.getElementById('modal').classList.toggle('hidden')
        }
    })
    document.getElementById('newChat').addEventListener("keydown", (e) => {
        if (e.code === "Enter") {  //checks whether the pressed key is "Enter"
            // console.log(document.getElementById('newChat').value);

            if (document.getElementById('newChat').value != '') {
                socket.emit('sendMsg', { Name: nameInp.value, Room: roomInp.value, Msg: document.getElementById('newChat').value });            
                document.getElementById('newChat').value = ""
            }
        }
    });
})()


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
    catch (e) {
        console.log(e)
        audioSelect.parentElement.querySelector('.dropdown__selected').innerHTML = 'Permission Denied';
        videoSelect.parentElement.querySelector('.dropdown__selected').innerHTML = 'Permission Denied';

        dropdowns.forEach(dropdown => {
            var new_element = dropdown.cloneNode(true);
            dropdown.parentNode.replaceChild(new_element, dropdown);
        })
    }
})();

var timeout_evt = null;
controllerDiv.addEventListener('mousemove', () => {
    if (timeout_evt) {
        clearTimeout(timeout_evt);
        timeout_evt = null;
    }
    controllerDiv.classList.add('active');
    timeout_evt = setTimeout(() => controllerDiv.classList.remove('active'), 1000)
})

controllerDiv.addEventListener('mouseleave', () => {
    if (timeout_evt) {
        clearTimeout(timeout_evt);
        timeout_evt = null;
    }
    controllerDiv.classList.remove('active');
})


var time_interval = null;
function startTime(rate = initdetails.rate) {
    if (time_interval) {
        clearInterval(time_interval);
        time_interval = null;
    }
    if (rate !== 0)
        time_interval = setInterval(() => {
            currTime.innerHTML = secondsToTime(1 + Number(timeSelect.value))
            timeSelect.stepUp()
        }, 1000 / rate)
}

function handleInit(details) {
    initdetails = details
    if (details.paused)
        controlDiv.classList.add('paused');
    else
        controlDiv.classList.remove('paused');
    if (details.duration) {
        durationTime.innerHTML = secondsToTime(details.duration)
        timeSelect.max = details.duration
    }
    if (details.time == 0 || details.time) {
        timeSelect.value = Number(details.time)
        currTime.innerHTML = secondsToTime(details.time)
    }
    if (details.rate && !details.paused) {
        startTime();
    }

}

document.addEventListener('keypress', (e) => {
    if (newChat != document.activeElement) {
        if (e.key == "f")
            toggleFullScreen();
        if (e.key == "m") {
            newChat.focus()
            setTimeout(() => newChat.value = "", 1)
        }
        if (e.key == " ")
            controlDiv.classList.contains('paused') ? socket.emit('play') : socket.emit('pause')
        console.log(e)
    }
})

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
function secondsToTime(seconds) {
    var sec_num = parseInt(seconds, 10)
    var hours = Math.floor(sec_num / 3600)
    var minutes = Math.floor(sec_num / 60) % 60
    var seconds = sec_num % 60

    return [hours, minutes, seconds]
        .map(v => v < 10 ? "0" + v : v)
        .filter((v, i) => v !== "00" || i > 0)
        .join(":")
}

function toggleFullScreen() {
    document.getElementById('chatParent').classList.toggle('hidden-x');
    document.getElementById('videoDiv').classList.toggle('hidden-y');
    document.getElementById('hostDiv').classList.toggle('big-host');
    document.getElementById('toggleBtn').classList.toggle('change');
    document.getElementById('sliderDiv').classList.toggle('big-host');
    document.getElementById('controllerDiv').classList.toggle('big-host');
    document.getElementById('controlDiv').classList.toggle('big-host');
}


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

// if (location.href.substr(0, 5) !== 'https')
//     location.href = 'https' + location.href.substr(4, location.href.length - 4)


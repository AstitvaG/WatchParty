const mediaType = {
    audio: 'audioType',
    video: 'videoType',
    screen: 'screenType'
}
const _EVENTS = {
    exitRoom: 'exitRoom',
    openRoom: 'openRoom',
    startVideo: 'startVideo',
    stopVideo: 'stopVideo',
    startAudio: 'startAudio',
    stopAudio: 'stopAudio',
    startScreen: 'startScreen',
    stopScreen: 'stopScreen'
}

var hostStream = new MediaStream();

class RoomClient {

    constructor(localMediaEl, hostVideoEl, remoteAudioEl, mediasoupClient, socket, room_id, name, successCallback) {
        this.name = name
        this.localMediaEl = localMediaEl
        this.hostVideoEl = hostVideoEl
        this.remoteAudioEl = remoteAudioEl
        this.mediasoupClient = mediasoupClient

        this.socket = socket
        this.producerTransport = null
        this.consumerTransport = null
        this.device = null
        this.room_id = room_id

        this.consumers = new Map()
        this.producers = new Map()

        /**
         * map that contains a mediatype as key and producer_id as value
         */
        this.producerLabel = new Map()

        this._isOpen = false
        this.eventListeners = new Map()
        Object.keys(_EVENTS).forEach(function (evt) {
            this.eventListeners.set(evt, [])
        }.bind(this))


        this.createRoom(room_id).then(async function () {
            await this.join(name, room_id)
            this.initSockets()
            this._isOpen = true
            successCallback()
        }.bind(this))




    }

    ////////// INIT /////////

    async createRoom(room_id) {
        await this.socket.request('createRoom', {
            room_id
        }).catch(err => {
            console.log(err)
        })
    }

    async join(name, room_id) {
        await socket.request('join', {
            name,
            room_id
        }).then(async function (e) {
            console.log('Joined', e)
            const data = await this.socket.request('getRouterRtpCapabilities');
            let device = await this.loadDevice(data)
            this.device = device
            await this.initTransports(device)
            this.socket.emit('getProducers')
        }.bind(this)).catch(e => {
            console.log(e)
        })
    }

    async loadDevice(routerRtpCapabilities) {
        let device
        try {
            device = new this.mediasoupClient.Device();
        } catch (error) {
            if (error.name === 'UnsupportedError') {
                console.error('browser not supported');
            }
            console.error(error)
        }
        await device.load({
            routerRtpCapabilities
        })
        return device

    }

    async initTransports(device) {

        // init producerTransport
        {
            const data = await this.socket.request('createWebRtcTransport', {
                forceTcp: false,
                rtpCapabilities: device.rtpCapabilities,
            })
            if (data.error) {
                console.error(data.error);
                return;
            }

            this.producerTransport = device.createSendTransport(data);

            this.producerTransport.on('connect', async function ({
                dtlsParameters
            }, callback, errback) {
                this.socket.request('connectTransport', {
                    dtlsParameters,
                    transport_id: data.id
                })
                    .then(callback)
                    .catch(errback)
            }.bind(this));

            this.producerTransport.on('produce', async function ({
                kind,
                rtpParameters
            }, callback, errback) {
                try {
                    const {
                        producer_id
                    } = await this.socket.request('produce', {
                        producerTransportId: this.producerTransport.id,
                        kind,
                        rtpParameters,
                        isHost: false
                    });
                    callback({
                        id: producer_id
                    });
                } catch (err) {
                    errback(err);
                }
            }.bind(this))

            this.producerTransport.on('connectionstatechange', function (state) {
                switch (state) {
                    case 'connecting':

                        break;

                    case 'connected':
                        //localVideo.srcObject = stream
                        break;

                    case 'failed':
                        this.producerTransport.close();
                        break;

                    default:
                        break;
                }
            }.bind(this));
        }

        // init consumerTransport
        {
            const data = await this.socket.request('createWebRtcTransport', {
                forceTcp: false,
            });
            if (data.error) {
                console.error(data.error);
                return;
            }

            // only one needed
            this.consumerTransport = device.createRecvTransport(data);
            this.consumerTransport.on('connect', function ({
                dtlsParameters
            }, callback, errback) {
                this.socket.request('connectTransport', {
                    transport_id: this.consumerTransport.id,
                    dtlsParameters
                })
                    .then(callback)
                    .catch(errback);
            }.bind(this));

            this.consumerTransport.on('connectionstatechange', async function (state) {
                switch (state) {
                    case 'connecting':
                        break;

                    case 'connected':
                        //remoteVideo.srcObject = await stream;
                        //await socket.request('resume');
                        break;

                    case 'failed':
                        this.consumerTransport.close();
                        break;

                    default:
                        break;
                }
            }.bind(this));
        }

    }

    initSockets() {
        this.socket.on('consumerClosed', function ({
            consumer_id
        }) {
            console.log('closing consumer:', consumer_id)
            this.removeConsumer(consumer_id)
        }.bind(this))

        /**
         * data: [ {
         *  producer_id:
         *  producer_socket_id:
         * }]
         */
        this.socket.on('newProducers', async function (data) {
            let new_hosts = await this.socket.request('getHost')
            // console.log("New MS inst", new_hosts)
            if (this.host_id && this.host_id != new_hosts) {
                if (this.host_id[0] != new_hosts[0]) {
                    hostStream.getVideoTracks().forEach(track => { track.stop(); hostStream.removeTrack(track) });
                    console.log("Changed Video from host");
                }
                if (this.host_id[1] != new_hosts[1]) {
                    hostStream.getAudioTracks().forEach(track => { track.stop(); hostStream.removeTrack(track) });
                    console.log("Changed Audio from host");
                }
            }
            this.host_id = new_hosts;
            handleInit(new_hosts[2]);
            console.log('new producers', data)
            for (let {
                producer_id
            } of data) {
                await this.consume(producer_id)
            }
        }.bind(this))

        this.socket.on('paused', () => {
            console.log("Paused")
            controlDiv.classList.add('paused');
            startTime(0);
        })

        this.socket.on('played', () => {
            console.log("Played")
            controlDiv.classList.remove('paused');
            startTime();
        })

        this.socket.on('ratech', (rate) => {
            initdetails.rate = rate;
            startTime(rate)
            console.log("Rate changed");
        })

        this.socket.on('durationed', (duration) => {
            console.log("Duration Changed")
            if (duration) {
                timeSelect.max = duration;
                durationTime.innerHTML = secondsToTime(duration);
            }
        })

        this.socket.on('timed', (time) => {
            console.log("Timed", time);
            if (time === 0 || time) {
                timeSelect.value = time;
                currTime.innerHTML = secondsToTime(time);
            }
        })

        this.socket.on('sentMsg', data => {
            console.log("sentMsg received", data)
            var newChat = chatMsg.cloneNode(true)
            newChat.style.display = "flex"
            // console.log(newChat)
            newChat.querySelector("#sMsg").innerText  = data.Msg
            newChat.querySelector("#sName").innerHTML  = data.Name
            newChat.querySelector("#sEmoji").innerHTML  = data.Emoji;
            console.log(newChat.querySelector("#sMsg"))
            newChat.id = Math.random(1000);
            // document.getElementById('chatDiv').appe
            chatDiv.scrollTop = chatDiv.scrollHeight;
            chatDiv.append(newChat);
            chatDiv.scrollTop = chatDiv.scrollHeight;
        })

        this.socket.on('disconnect', function () {
            this.exit(true)
        }.bind(this))

    }




    //////// MAIN FUNCTIONS /////////////


    async produce(type, deviceId = null) {
        let mediaConstraints = {}
        let audio = false
        let screen = false
        switch (type) {
            case mediaType.audio:
                mediaConstraints = {
                    audio: true,
                    video: false
                }
                audio = true
                break
            case mediaType.video:
                mediaConstraints = {
                    audio: false,
                    video: {
                        width: {
                            min: 640,
                            ideal: 1920
                        },
                        height: {
                            min: 400,
                            ideal: 1080
                        },
                        // deviceId: deviceId
                        /*aspectRatio: {
                            ideal: 1.7777777778
                        }*/
                    }
                }
                break
            case mediaType.screen:
                mediaConstraints = false
                screen = true
                break;
            default:
        }
        if (!this.device.canProduce('video') && !audio) {
            console.error('cannot produce video');
            return;
        }
        if (this.producerLabel.has(type)) {
            console.log('producer already exists for this type ' + type)
            return
        }
        console.log('mediacontraints:', mediaConstraints)
        let stream;
        try {
            stream = screen ? await navigator.mediaDevices.getDisplayMedia() : await navigator.mediaDevices.getUserMedia(mediaConstraints)
            console.log(navigator.mediaDevices.getSupportedConstraints())


            const track = audio ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0]
            const params = {
                track
            };
            if (!audio && !screen) {
                params.encodings = [{
                    rid: 'r0',
                    maxBitrate: 100000,
                    //scaleResolutionDownBy: 10.0,
                    scalabilityMode: 'S1T3'
                },
                {
                    rid: 'r1',
                    maxBitrate: 300000,
                    scalabilityMode: 'S1T3'
                },
                {
                    rid: 'r2',
                    maxBitrate: 900000,
                    scalabilityMode: 'S1T3'
                }
                ];
                params.codecOptions = {
                    videoGoogleStartBitrate: 1000
                };
            }
            producer = await this.producerTransport.produce(params)

            console.log('producer', producer)

            this.producers.set(producer.id, producer)

            let elem
            if (!audio) {
                elem = document.createElement('video')
                elem.srcObject = stream
                elem.id = producer.id
                elem.addEventListener('loadedmetadata', () => {
                    elem.play()
                })
                // elem.playsinline = false
                // elem.autoplay = true
                // elem.className = "vid"
                this.localMediaEl.appendChild(elem)
            }

            producer.on('trackended', () => {
                this.closeProducer(type)
            })

            producer.on('transportclose', () => {
                console.log('producer transport close')
                if (!audio) {
                    elem.srcObject.getTracks().forEach(function (track) {
                        track.stop()
                    })
                    elem.parentNode.removeChild(elem)
                }
                this.producers.delete(producer.id)

            })

            producer.on('close', () => {
                console.log('closing producer')
                if (!audio) {
                    elem.srcObject.getTracks().forEach(function (track) {
                        track.stop()
                    })
                    elem.parentNode.removeChild(elem)
                }
                this.producers.delete(producer.id)

            })

            this.producerLabel.set(type, producer.id)

            switch (type) {
                case mediaType.audio:
                    this.event(_EVENTS.startAudio)
                    break
                case mediaType.video:
                    this.event(_EVENTS.startVideo)
                    break
                case mediaType.screen:
                    this.event(_EVENTS.startScreen)
                    break;
                default:
                    return
                    break;
            }
        } catch (err) {
            console.log(err)
        }
    }

    async consume(producer_id) {

        //let info = await roomInfo()

        this.getConsumeStream(producer_id).then(function ({
            consumer,
            stream,
            kind
        }) {

            this.consumers.set(consumer.id, consumer)
            console.log(kind, consumer.id);

            let elem;
            if (kind === 'video') {
                if (producer_id == this.host_id[0] && this.hostVideoEl.children.length > 0) {
                    elem = this.hostVideoEl.children[0];
                    hostStream.addTrack(stream.getVideoTracks()[0]);
                    elem.id = consumer.id
                }
                else {
                    elem = document.createElement('video')
                    if (producer_id == this.host_id[0]) {
                        hostStream.addTrack(stream.getVideoTracks()[0]);
                        elem.srcObject = hostStream;
                    }
                    else
                        elem.srcObject = stream

                    elem.id = consumer.id
                    elem.addEventListener('loadedmetadata', elem.play)
                    if (this.host_id[0] == producer_id && this.hostVideoEl.children.length == 0)
                        this.hostVideoEl.appendChild(elem)
                    else
                        this.localMediaEl.appendChild(elem)
                }
            } else {
                try {
                    if (this.host_id[1] != producer_id) throw ""
                    hostStream.getAudioTracks().forEach(track => { track.stop(); hostStream.removeTrack(track); })
                    hostStream.addTrack(stream.getAudioTracks()[0]);
                    console.log("Host stream A/V", stream.getAudioTracks().length);
                }
                catch (e) {
                    console.log("Fallback", e)
                    elem = document.createElement('audio')
                    elem.srcObject = stream
                    elem.id = consumer.id
                    elem.addEventListener('loadedmetadata', () => {
                        elem.play()
                    })
                    this.remoteAudioEl.appendChild(elem)
                }
                // elem.playsinline = false
                // elem.autoplay = true
            }

            consumer.on('trackended', function () {
                this.removeConsumer(consumer.id)
            }.bind(this))
            consumer.on('transportclose', function () {
                this.removeConsumer(consumer.id)
            }.bind(this))



        }.bind(this))
    }

    async getConsumeStream(producerId) {
        const {
            rtpCapabilities
        } = this.device
        const data = await this.socket.request('consume', {
            rtpCapabilities,
            consumerTransportId: this.consumerTransport.id, // might be 
            producerId
        });
        const {
            id,
            kind,
            rtpParameters,
        } = data;

        let codecOptions = {};
        const consumer = await this.consumerTransport.consume({
            id,
            producerId,
            kind,
            rtpParameters,
            codecOptions,
        })
        const stream = new MediaStream();
        stream.addTrack(consumer.track);
        return {
            consumer,
            stream,
            kind
        }
    }

    closeProducer(type) {
        if (!this.producerLabel.has(type)) {
            console.log('there is no producer for this type ' + type)
            return
        }
        let producer_id = this.producerLabel.get(type)
        console.log(producer_id)
        this.socket.emit('producerClosed', {
            producer_id
        })
        this.producers.get(producer_id).close()
        this.producers.delete(producer_id)
        this.producerLabel.delete(type)

        if (type !== mediaType.audio) {
            let elem = document.getElementById(producer_id)
            elem.srcObject.getTracks().forEach(function (track) {
                track.stop()
            })
            elem.parentNode.removeChild(elem)
        }

        switch (type) {
            case mediaType.audio:
                this.event(_EVENTS.stopAudio)
                break
            case mediaType.video:
                this.event(_EVENTS.stopVideo)
                break
            case mediaType.screen:
                this.event(_EVENTS.stopScreen)
                break;
            default:
                return
                break;
        }

    }

    pauseProducer(type) {
        if (!this.producerLabel.has(type)) {
            console.log('there is no producer for this type ' + type)
            return
        }
        let producer_id = this.producerLabel.get(type)
        this.producers.get(producer_id).pause()

    }

    resumeProducer(type) {
        if (!this.producerLabel.has(type)) {
            console.log('there is no producer for this type ' + type)
            return
        }
        let producer_id = this.producerLabel.get(type)
        this.producers.get(producer_id).resume()

    }

    removeConsumer(consumer_id) {
        let elem = document.getElementById(consumer_id)
        console.log("Element", elem, elem.parentElement);
        elem.srcObject.getTracks().forEach(function (track) {
            track.stop()
        })
        console.log("Closing heere", consumer_id, document.getElementById(consumer_id));
        elem.parentNode.removeChild(elem)

        this.consumers.delete(consumer_id)
    }

    exit(offline = false) {

        let clean = function () {
            this._isOpen = false
            this.consumerTransport.close()
            this.producerTransport.close()
            this.socket.off('disconnect')
            this.socket.off('newProducers')
            this.socket.off('consumerClosed')
        }.bind(this)

        if (!offline) {
            this.socket.request('exitRoom').then(e => console.log(e)).catch(e => console.warn(e)).finally(function () {
                clean()
            }.bind(this))
        } else {
            clean()
        }

        this.event(_EVENTS.exitRoom)

    }

    ///////  HELPERS //////////

    async roomInfo() {
        let info = await socket.request('getMyRoomInfo')
        return info
    }

    static get mediaType() {
        return mediaType
    }

    event(evt) {
        if (this.eventListeners.has(evt)) {
            this.eventListeners.get(evt).forEach(callback => callback())
        }
    }

    on(evt, callback) {
        this.eventListeners.get(evt).push(callback)
    }




    //////// GETTERS ////////

    isOpen() {
        return this._isOpen
    }

    static get EVENTS() {
        return _EVENTS
    }
}
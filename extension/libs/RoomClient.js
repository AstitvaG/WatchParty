const mediaType = {
    audio: 'audioType',
    video: 'videoType',
    screen: 'screenType',
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

class RoomClient {

    constructor(localMediaEl, remoteVideoEl, remoteAudioEl, mediasoupClient, socket, room_id, name, successCallback) {
        this.name = name
        this.localMediaEl = localMediaEl
        this.remoteVideoEl = remoteVideoEl
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
                    console.log('Kind : ', kind);
                    var initConfig = {};
                    try {
                        var v = window.document.querySelectorAll("video")[0];
                        initConfig = {
                            duration: v.duration,
                            paused: v.paused,
                            rate: v.playbackRate,
                            time: v.currentTime
                        }
                    } catch { }
                    const { producer_id } = await this.socket.request('produce',
                        {
                            producerTransportId: this.producerTransport.id,
                            kind,
                            rtpParameters,
                            isHost: true,
                            initConfig
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

        this.socket.on('newProducers', async function (data) {
            this.host_id = await this.socket.request('getHost')
            console.log("HostId: ", this.host_id)
            console.log('new producers', data)
            for (let { producer_id } of data) {
                await this.consume(producer_id)
            }
        }.bind(this))

        this.socket.on('play', () => {
            console.log("Remote play called");
            try {
                document.querySelectorAll('video')[0].play()
                this.socket.emit('played')
            } catch { }
        })

        this.socket.on('pause', () => {
            console.log("Remote pause called");
            try {
                document.querySelectorAll('video')[0].pause()
                this.socket.emit('paused')
            } catch { }
        })

        this.socket.on('seekTo', time => {
            console.log('Remote seek called', time);
            try {
                document.querySelectorAll('video')[0].currentTime = time
            } catch { }
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


    async produce(type) {
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
                        }
                    }
                }
                break
            case mediaType.screen:
                mediaConstraints = false
                screen = true
                break;
            default:
                return
        }
        if (!this.device.canProduce('video') && !audio) {
            console.error('cannot produce video');
            return;
        }

        // if (this.producerLabel.has(type)) {
        //     console.log('producer already exists for this type ' + type)
        //     return
        // }

        // console.log('mediacontraints:', mediaConstraints)
        let stream;
        try {
            stream = screen
                ? await (async () => {
                    let vidStream;
                    try {
                        var v = window.document.querySelectorAll("video")[0];
                        vidStream = v.captureStream()

                        // v.addEventListener('abort', (e) => this.closeProducer(type))
                        v.addEventListener('emptied', (e) => {
                            this.closeProducer(mediaType.screen);
                            v.addEventListener('canplaythrough', (e) => {
                                rc.produce(mediaType.screen);
                            }, { once: true });
                        })

                        v.addEventListener('durationchange', (e) => this.socket.emit('durationed', v.duration))
                        v.addEventListener('pause', (e) => this.socket.emit('paused'))
                        v.addEventListener('playing', (e) => this.socket.emit('played'))
                        v.addEventListener('ratechange', (e) => {this.socket.emit('ratech', v.playbackRate);console.log("Ratech");})
                        v.addEventListener('seeked', () => {this.socket.emit('timed', v.currentTime);console.log("Seeked", v.currentTime);});

                        // v.addEventListener('timeupdate', (e) => this.socket.emit('timed', { time: v.currentTime, duration: v.duration, rate: v.playbackRate }))
                        // v.addEventListener('waiting', (e) => this.socket.emit('hostData', { buffer: true, paused: false }))
                    }
                    catch {
                        vidStream = await navigator.mediaDevices.getDisplayMedia({
                            audio: {
                                noiseSuppression: false,
                                autoGainControl: false,
                                echoCancellation: false,
                                latency: 0,
                                sampleRate: 48000
                            },
                            video: {
                                width: 1920,
                                height: 1080,
                                frameRate: 60,
                                latency: 0
                            }
                        });
                    }
                    return vidStream
                })()
                : await navigator.mediaDevices.getUserMedia(mediaConstraints)

            let enc = [{
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

            const tracks = audio
                ? [stream.getAudioTracks()[0]]
                : screen
                    ? [stream.getAudioTracks()[0], stream.getVideoTracks()[0]]
                    : [stream.getVideoTracks()[0]]

            const cb = (producer, idx) => {
                console.log('producer', producer)

                this.producers.set(producer.id, producer)
                this.producerLabel.set(type + '-' + idx, producer.id)
                console.log(this.producerLabel)

                let elem
                if (!audio) {
                    elem = document.createElement('video')
                    elem.srcObject = stream
                    elem.id = producer.id
                    elem.addEventListener('loadedmetadata', elem.play)
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

            }
            tracks.forEach((track, idx) => {
                const params = {
                    track
                };
                if (!audio && !screen) {
                    params.encodings = enc;
                }
                if (!audio) {
                    params.codecOptions = {
                        videoGoogleStartBitrate: 1000
                    };
                }
                this.producerTransport.produce(params).then((producer => cb(producer, idx)));
            })
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

            let elem;
            if (kind === 'video') {
                elem = document.createElement('video')
                elem.srcObject = stream
                elem.id = consumer.id
                elem.addEventListener('loadedmetadata', () => {
                    elem.play()
                })
                // elem.playsinline = false
                // elem.autoplay = true
                // elem.className = "vid"
                this.remoteVideoEl.appendChild(elem)
            } else {
                elem = document.createElement('audio')
                elem.srcObject = stream
                elem.id = consumer.id
                elem.addEventListener('loadedmetadata', () => {
                    elem.play()
                })
                // elem.playsinline = false
                // elem.autoplay = true
                this.remoteAudioEl.appendChild(elem)
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
        if (!this.producerLabel.has(type + '-0') && !this.producerLabel.has(type + '-1')) {
            console.log('there is no producer for this type ' + type)
            return
        }
        const cb = (idx) => {
            let producer_id = this.producerLabel.get(type + "-" + idx)
            console.log("Closing", producer_id)
            this.socket.emit('producerClosed', {
                producer_id
            })
            this.producers.get(producer_id).close()
            this.producers.delete(producer_id)
            this.producerLabel.delete(type)

            if (type !== mediaType.audio) {
                let elem = document.getElementById(producer_id)
                elem && elem.srcObject.getTracks().forEach(function (track) {
                    track.stop()
                })
                elem && elem.parentNode.removeChild(elem)
            }
        }

        if (this.producerLabel.has(type + '-0')) cb(0);
        if (this.producerLabel.has(type + '-1')) cb(1);

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
        elem.srcObject.getTracks().forEach(function (track) {
            track.stop()
        })
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
const express = require('express')

const app = express()
const fs = require('fs')
const mediasoup = require('mediasoup')
const config = require('./config')
const path = require('path')
const Room = require('./Room')
const Peer = require('./Peer')


const options = {
    key: fs.readFileSync(path.join(__dirname, config.sslKey), 'utf-8'),
    cert: fs.readFileSync(path.join(__dirname, config.sslCrt), 'utf-8')
}
// For HTTPS:
// const http = require('https').createServer(options, app);

const http = require('http').Server(app);

// const http = https.S(options, app)
const io = require('socket.io')(http, {
    cors: {
        "origin": "*",
        "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
        "preflightContinue": false,
        "optionsSuccessStatus": 204
    }
});

// app.use(express.static(path.join(__dirname, '..', 'public')))
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.get('/', (req, res) => {
    res.render('index', { RoomId: '' });
});
app.get('/:roomId', (req, res) => {
    res.render('index', { RoomId: req.params.roomId });
});

http.listen(config.listenPort, () => {
    console.log('listening http ' + config.listenPort)
})



// all mediasoup workers
let workers = []
let nextMediasoupWorkerIdx = 0

/**
 * roomList
 * {
 *  room_id: Room {
 *      id:
 *      router:
 *      peers: {
 *          id:,
 *          name:,
 *          master: [boolean],
 *          transports: [Map],
 *          producers: [Map],
 *          consumers: [Map],
 *          rtpCapabilities:
 *      }
 *  }
 * }
 */
let roomList = new Map()

    ;
(async () => {
    await createWorkers()
})()



async function createWorkers() {
    let {
        numWorkers
    } = config.mediasoup

    for (let i = 0; i < numWorkers; i++) {
        let worker = await mediasoup.createWorker({
            logLevel: config.mediasoup.worker.logLevel,
            logTags: config.mediasoup.worker.logTags,
            rtcMinPort: config.mediasoup.worker.rtcMinPort,
            rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
        })

        worker.on('died', () => {
            console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
            setTimeout(() => process.exit(1), 2000);
        })
        workers.push(worker)

    }
}


io.on('connection', socket => {
    socket.on('createRoom', async ({
        room_id
    }, callback) => {
        if (roomList.has(room_id)) {
            callback('already exists')
        } else {
            console.log('---created room--- ', room_id)
            let worker = await getMediasoupWorker()
            roomList.set(room_id, new Room(room_id, worker, io))
            callback(room_id)
        }
    })

    socket.on('getNewRoom', (_, callback) => {
        const getr = () => Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 3)
        const getx = () => getr() + '-' + getr() + '-' + getr()
        let room_id = getx()
        while ((roomList.has(room_id) && roomList.get(room_id).getPeers().size != 0) || room_id.length != 11) room_id = getx()
        callback(room_id);
    })

    socket.on('join', ({
        room_id,
        name
    }, cb) => {
        console.log('---user joined--- \"' + room_id + '\": ' + name)
        if (!roomList.has(room_id)) {
            return cb({
                error: 'room does not exist'
            })
        }
        roomList.get(room_id).addPeer(new Peer(socket.id, name))
        socket.room_id = room_id

        cb(roomList.get(room_id).toJson())
    })

    socket.on('seekTo', (time) => {
        let room = roomList.get(socket.room_id)
        if (room && room.host_socket_id) room.send(room.host_socket_id, 'seekTo', time)
        console.log("Seek Called from Client", time);
    })

    socket.on('play', () => {
        let room = roomList.get(socket.room_id)
        if (room && room.host_socket_id) room.send(room.host_socket_id, 'play', {})
        console.log("Play Called from Client");
    })

    socket.on('pause', () => {
        let room = roomList.get(socket.room_id)
        if (room && room.host_socket_id) room.send(room.host_socket_id, 'pause', {})
        console.log("Pause Called from Client");
    })

    socket.on('played', () => {
        let room = roomList.get(socket.room_id)
        if (room && room.host_socket_id) room.broadCast(room.host_socket_id, 'played', {})
        console.log("Played Called from Host");
    })

    socket.on('paused', () => {
        let room = roomList.get(socket.room_id)
        if (room && room.host_socket_id) room.broadCast(room.host_socket_id, 'paused', {})
        console.log("Paused Called from Host");
    })

    socket.on('durationed', (duration) => {
        let room = roomList.get(socket.room_id)
        if (room && room.host_socket_id) room.broadCast(room.host_socket_id, 'durationed', duration)
        console.log("Durationed Called from Host", duration);
    })

    socket.on('timed', (time) => {
        let room = roomList.get(socket.room_id)
        if (room && room.host_socket_id) room.broadCast(room.host_socket_id, 'timed', time)
        console.log("Timed Called from Host", time);
    })

    socket.on('ratech', (rate) => {
        let room = roomList.get(socket.room_id)
        if (room && room.host_socket_id) room.broadCast(room.host_socket_id, 'ratech', rate)
        console.log("Ratech Called from Host", rate);
    })

    socket.on('getHost', (_, callback) => {
        console.log(`---get host--- name:${roomList.get(socket.room_id).getPeers().get(socket.id).name}::host:${roomList.get(socket.room_id).getHost()}`)
        callback(roomList.get(socket.room_id).getHost());
    })

    socket.on('getProducers', () => {
        console.log(`---get producers--- name:${roomList.get(socket.room_id).getPeers().get(socket.id).name}`)
        // send all the current producer to newly joined member
        if (!roomList.has(socket.room_id)) return
        let producerList = roomList.get(socket.room_id).getProducerListForPeer(socket.id)

        socket.emit('newProducers', producerList)
    })

    socket.on('getRouterRtpCapabilities', (_, callback) => {
        console.log(`---get RouterRtpCapabilities--- name: ${roomList.get(socket.room_id).getPeers().get(socket.id).name}`)
        try {
            callback(roomList.get(socket.room_id).getRtpCapabilities());
        } catch (e) {
            callback({
                error: e.message
            })
        }

    });

    socket.on('createWebRtcTransport', async (_, callback) => {
        console.log(`---create webrtc transport--- name: ${roomList.get(socket.room_id).getPeers().get(socket.id).name}`)
        try {
            const {
                params
            } = await roomList.get(socket.room_id).createWebRtcTransport(socket.id);

            callback(params);
        } catch (err) {
            console.error(err);
            callback({
                error: err.message
            });
        }
    });

    socket.on('connectTransport', async ({
        transport_id,
        dtlsParameters
    }, callback) => {
        console.log(`---connect transport--- name: ${roomList.get(socket.room_id).getPeers().get(socket.id).name}`)
        if (!roomList.has(socket.room_id)) return
        await roomList.get(socket.room_id).connectPeerTransport(socket.id, transport_id, dtlsParameters)

        callback('success')
    })

    socket.on('produce', async ({
        kind,
        rtpParameters,
        producerTransportId,
        isHost,
        initConfig
    }, callback) => {

        if (!roomList.has(socket.room_id)) {
            return callback({ error: 'not is a room' })
        }

        let producer_id = await roomList.get(socket.room_id).produce(socket.id, producerTransportId, rtpParameters, kind, isHost, initConfig)
        console.log(`---produce--- type: ${kind} name: ${roomList.get(socket.room_id).getPeers().get(socket.id).name} id: ${producer_id}`)
        callback({
            producer_id
        })
    })

    socket.on('consume', async ({
        consumerTransportId,
        producerId,
        rtpCapabilities
    }, callback) => {
        //TODO null handling
        let params = await roomList.get(socket.room_id).consume(socket.id, consumerTransportId, producerId, rtpCapabilities)

        console.log(`---consuming--- name: ${roomList.get(socket.room_id) && roomList.get(socket.room_id).getPeers().get(socket.id).name} prod_id:${producerId} consumer_id:${params.id}`)
        callback(params)
    })

    socket.on('resume', async (data, callback) => {

        await consumer.resume();
        callback();
    });

    socket.on('getMyRoomInfo', (_, cb) => {
        cb(roomList.get(socket.room_id).toJson())
    })

    socket.on('disconnect', () => {
        console.log(`---disconnect--- name: ${roomList.get(socket.room_id) && roomList.get(socket.room_id).getPeers().get(socket.id).name}`)
        if (!socket.room_id) return
        roomList.get(socket.room_id).removePeer(socket.id)
    })

    socket.on('producerClosed', ({
        producer_id
    }) => {
        console.log(`---producer close--- name: ${roomList.get(socket.room_id) && roomList.get(socket.room_id).getPeers().get(socket.id).name}`)
        roomList.get(socket.room_id).closeProducer(socket.id, producer_id)
    })

    socket.on('exitRoom', async (_, callback) => {
        console.log(`---exit room--- name: ${roomList.get(socket.room_id) && roomList.get(socket.room_id).getPeers().get(socket.id).name}`)
        if (!roomList.has(socket.room_id)) {
            callback({
                error: 'not currently in a room'
            })
            return
        }
        // close transports
        await roomList.get(socket.room_id).removePeer(socket.id)
        if (roomList.get(socket.room_id).getPeers().size === 0) {
            roomList.delete(socket.room_id)
        }

        socket.room_id = null


        callback('successfully exited room')
    })
})

function room() {
    return Object.values(roomList).map(r => {
        return {
            router: r.router.id,
            peers: Object.values(r.peers).map(p => {
                return {
                    name: p.name,
                }
            }),
            id: r.id
        }
    })
}

/**
 * Get next mediasoup Worker.
 */
function getMediasoupWorker() {
    const worker = workers[nextMediasoupWorkerIdx];

    if (++nextMediasoupWorkerIdx === workers.length)
        nextMediasoupWorkerIdx = 0;

    return worker;
}

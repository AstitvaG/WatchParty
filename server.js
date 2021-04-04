const express = require('express');
const app = express();
const cors = require('cors');
const server = require('http').Server(app);
const io = require('socket.io')(server, {
	cors: {
		"origin": "*",
		"methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
		"preflightContinue": false,
		"optionsSuccessStatus": 204
	}
});
const port = process.env.PORT || 4000;
const { v4: uuidv4 } = require('uuid');
const { ExpressPeerServer } = require('peer')
const peer = ExpressPeerServer(server, { debug: true });

app.use(cors())
app.use('/peerjs', peer);
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.get('/fetchID', async (req, res) => {
	let ans = await uuidv4().toString()
	console.log("ans",ans)
	res.status(200).json(ans);
});
app.get('/:room', (req, res) => {
	res.render('index', { RoomId: req.params.room });
});
io.on("connection", (socket) => {
	socket.on('setHost', (id,room) => {
		console.log("Set Host Called")
		socket.to(room).broadcast.emit('setMyHost', id);
	})
	socket.on('newUser', (id, room) => {
		console.log(room, ": User added", id)
		socket.join(room);
		socket.to(room).broadcast.emit('userJoined', id);
		socket.on('disconnect', () => {
			socket.to(room).broadcast.emit('userDisconnect', id);
		})
	})
})
server.listen(port, () => {
	console.log("Server running on port : " + port);
})

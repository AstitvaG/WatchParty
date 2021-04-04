// Initialize butotn with users's prefered color


let changeColor = document.getElementById("changeColor");

chrome.storage.sync.get("color", ({ color }) => {
	changeColor.style.backgroundColor = color;
});

// When the button is clicked, inject setPageBackgroundColor into current page
changeColor.addEventListener("click", async () => {
	let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	chrome.scripting.executeScript({
		target: { tabId: tab.id },
		files: ['libs/peer.js']
	}, () => chrome.scripting.executeScript({
		target: { tabId: tab.id },
		function: startStreaming
	}))
	// chrome.tabs.executeScript(tab.id, )
});

const startStreaming = () => {
	console.log("Modules loded")
	const socket = io("http://localhost:4000");
	const peer = new Peer();
	var vidStream, myId;
	socket.on('userJoined', id => {
		console.log("new user joined", id)
		console.log("**", vidStream);
		socket.emit("setHost", myId, "viewx");
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
		try {
			vidStream = await navigator.mediaDevices.getDisplayMedia({
				video: {
					cursor: "never"
				},
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					sampleRate: 44100
				}
			});
		}
		catch {
			vidStream = window.document.querySelectorAll("video")[0].captureStream();
		}
		myId = id;
		console.log("Peer opened")
		socket.emit("newUser", id, "viewx");
		socket.emit("setHost", id, "viewx");
		console.log("Starting Stream")
	})
	peer.on('call', async call => {
		console.log("Rec Called");
		socket.emit("setHost", id, "viewx");
		call.answer(vidStream);
	})
}

// The body of this function will be execuetd as a content script inside the
// current page
// function setPageBackgroundColor() {
// 	chrome.storage.sync.get("color", ({ color }) => {
// 		document.body.style.backgroundColor = color;
// 	});
// }

// const replyStream = (call) => {
// 	var vidStream = document.querySelectorAll("video,audio");
// 	console.log("**", vidStream);
// 	call.answer(vidStream);
// }

// const socket = io("http://localhost:4000");

// const peer = new Peer();

// socket.on('userJoined', id => {
// 	console.log("new user joined", id)
// 	var vidStream = window.document.querySelectorAll("video,audio")[0].captureStream();
// 	console.log("**", vidStream);
// 	const call = peer.call(id, vidStream);
// 	const vid = document.createElement('video');
// 	call.on('error', (err) => {
// 		alert(err);
// 	})
// 	call.on('stream', userStream => {
// 		console.log("Rec also Streaming")
// 		// addVideo(vid, userStream);
// 	})
// 	call.on('close', () => {
// 		vid.remove();
// 		console.log("user disconect")
// 	})
// 	// peerConnections[id] = call;
// })
// peer.on('open', (id) => {
// 	myId = id;
// 	console.log("Peer opened")
// 	socket.emit("newUser", id, "viewx");
// 	console.log("Starting Stream")
// })
// peer.on('call', async call => {
// 	console.log("Rec Called");
// 	let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
// 	chrome.scripting.executeScript({
// 		target: { tabId: tab.id },
// 		code: 'var call = '+ call,
// 	}, () => chrome.scripting.executeScript({
// 		target: { tabId: tab.id },
// 		function: replyStream,
// 	}));
// })
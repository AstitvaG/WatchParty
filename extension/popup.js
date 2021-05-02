// Initialize butotn with users's prefered color


var startStreaming = document.getElementById("startStreaming");
var joinExisting = document.getElementById("joinExisting");
var activeTab;


startStreaming.addEventListener("click", async () => {
	console.log("Sending name", document.getElementById("nameInp").value)
	await chrome.tabs.sendMessage(activeTab.id, { name: document.getElementById("nameInp").value })
	chrome.scripting.executeScript({
		target: { tabId: activeTab.id },
		files: ['libs/libs.js']
	}, () => chrome.scripting.executeScript({
		target: { tabId: activeTab.id },
		files: ['libs/RoomClient.js']
	}, () => chrome.scripting.executeScript({
		target: { tabId: activeTab.id },
		files: ['content.js']
	}, () => libsLoaded = true)));
});

let makeRequest = (method, url) => {
	return new Promise(function (resolve, reject) {
		let xhr = new XMLHttpRequest();
		xhr.open(method, url);
		xhr.onload = function () {
			if (this.status >= 200 && this.status < 300) {
				resolve(xhr.response);
			} else {
				reject({
					status: this.status,
					statusText: xhr.statusText
				});
			}
		};
		xhr.onerror = function () {
			reject({
				status: this.status,
				statusText: xhr.statusText
			});
		};
		xhr.send();
	});
}
let chatHtml = null;
(async () => {
	chatHtml = await makeRequest("GET", chrome.runtime.getURL("chatBox.html"));
	console.log(chatHtml);
})();


// Runs when extension starts streaming
chrome.runtime.onMessage.addListener(
	async (req, sender, resp) => {
		if (req.cmd == "sendInfo") {
			document.room_id = req.room_id
			let roomInp = document.getElementById("roomInp")
			roomInp.value = req.room_id
			roomInp.parentElement.classList.toggle('hidden');
			document.getElementById("startStreaming").classList.toggle('hidden');
			document.getElementById("joinExisting").classList.toggle('hidden');
			document.getElementById("copyLink").classList.toggle('hidden');
		}
		else if (req.cmd == "load_html") {
			resp(chatHtml);
		}
	}
);

joinExisting.addEventListener("click", async () => {
	window.open('http:\/\/192.168.43.136:3016', '_blank')
});

document.getElementById("copyLink").addEventListener("click", async () => {
	copyTextToClipboard('http:\/\/192.168.43.136:3016\/' + document.room_id)
});



(async () => {
	let name = await fetch('https://randomuser.me/api/?results=1&nat=us&inc=name')
		.then(res => res.json())
		.then(res => res.results[0].name.first)
	let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	activeTab = tab;
	await chrome.scripting.executeScript({
		target: { tabId: activeTab.id },
		function: () => {
			chrome.runtime.onMessage.addListener((req, sender, resp) => {
				if (req.name) document.name = req.name
				if (req.room_id) {
					console.log("Responding", document.room_id)
					resp({ room_id: document.room_id, name: document.name });
				}
			});
		}
	});
	document.getElementById("nameInp").value = name

	// Runs when Popup is loaded
	chrome.tabs.sendMessage(activeTab.id, { room_id: 'get' }, (resp) => {
		if (resp.room_id && resp.name) {
			document.room_id = resp.room_id
			document.getElementById("nameInp").value = resp.name
			let roomInp = document.getElementById("roomInp")
			roomInp.value = resp.room_id
			roomInp.parentElement.classList.toggle('hidden');
			document.getElementById("startStreaming").classList.toggle('hidden');
			document.getElementById("joinExisting").classList.toggle('hidden');
			document.getElementById("copyLink").classList.toggle('hidden');
			copyTextToClipboard('http:\/\/192.168.43.136:3016\/' + document.room_id)
		}
	});
})()


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
		document.getElementById('linkCopied').classList.remove('hidden')
		setTimeout(() => document.getElementById('linkCopied').classList.add('hidden'), 2000);
	}, function (err) {
		console.error('Async: Could not copy text: ', err);
	});
}
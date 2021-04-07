// Initialize butotn with users's prefered color


let startStreaming = document.getElementById("startStreaming");
let joinExisting = document.getElementById("joinExisting");
var libsLoaded = false;

// When the button is clicked, inject content.js into current page
startStreaming.addEventListener("click", async () => {
	console.log("Libs", libsLoaded)
	let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	if (!window.libsLoaded)
		chrome.scripting.executeScript({
			target: { tabId: tab.id },
			files: ['libs/libs.js']
		}, () => chrome.scripting.executeScript({
			target: { tabId: tab.id },
			files: ['libs/RoomClient.js']
		}, () => chrome.scripting.executeScript({
			target: { tabId: tab.id },
			files: ['content.js']
		}, () => libsLoaded = true)));
	else chrome.scripting.executeScript({
		target: { tabId: tab.id },
		files: ['content.js']
	}, () => libsLoaded = true);
});

joinExisting.addEventListener("click", async () => {
	window.open('https:\/\/localhost:3016', '_blank')
})
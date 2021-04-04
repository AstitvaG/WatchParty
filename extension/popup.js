// Initialize butotn with users's prefered color


let changeColor = document.getElementById("changeColor");
var libsLoaded = false;

// When the button is clicked, inject content.js into current page
changeColor.addEventListener("click", async () => {
	console.log("Libs",libsLoaded)
	let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	if (!window.libsLoaded)
		chrome.scripting.executeScript({
			target: { tabId: tab.id },
			files: ['libs/libs.js']
		}, () => chrome.scripting.executeScript({
			target: { tabId: tab.id },
			files: ['content.js']
		}, () => libsLoaded = true));
	else chrome.scripting.executeScript({
		target: { tabId: tab.id },
		files: ['content.js']
	}, () => libsLoaded = true);
});

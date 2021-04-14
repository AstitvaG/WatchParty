# WatchParty

## Directory Structure
```
WatchParty
│
├── extension : Contains Chrome Extension Related Files
│   ├── content.js : Logic Code for JS injection into current tab
│   ├── images : Images used by Extension, also include 'App Logo'
│   │   ├── get_started128.png
│   │   ├── get_started16.png
│   │   ├── get_started32.png
│   │   └── get_started48.png
│   ├── libs : Libraries used by content.js
│   │   ├── libs.js : Include socket.io, mediasoupclient, EventEmitter 
│   │   └── RoomClient.js : All the tasks related to Room Happen Here
│   ├── manifest.json : Manifest/Info file for chrome extension
│   ├── options.html : Options Page for chrome extension (Currently unuseful, maybe later)
│   ├── options.js : JS for options.html
│   ├── popup.html : Render popup
│   └── popup.js : JS for popup and main wrapper file for calling functions
├── LICENSE
├── package.json
├── package-lock.json
├── public
│   ├── index.js : JS fuction for index.html, main frontend file
│   ├── modules
│   │   └── mediasoupclient.min.js
│   └── RoomClient.js : All the tasks related to Room Happen Here
├── README.md
├── src
│   ├── config.js : SFU config
│   ├── Peer.js : Peer logic here
│   ├── Room.js : Room logic here
│   └── server.js : Server file, main backend file
├── ssl
│   ├── cert.pem : ssl cert
│   └── key.pem : ssl key
└── views
    └── index.ejs : renders frontend
```

## Development folders
- For extension:
  - `extension`
- For backend:
  - `src`
- For frontend:
  - `public` for JS
  - `views` for html, css

### Important and to-be-edited files:
```
WatchPlus
│
├── extension
│   ├── content.js
│   ├── libs
│   │   └── RoomClient.js
│   ├── popup.html
│   └── popup.js
├── public
│   ├── index.js
│   └── RoomClient.js
├── src
│   └── server.js
└── views
    └── index.ejs
```

## Running the code

### Chrome Extension
> Highly recommended to Use Chromium
- Go to [`chrome://extensions`](chrome://extensions)
- Then click `Load Unpacked`
- Go to `WatchParty/extension` in browse folder and select
- Enable the extension if disabled and then pin the extension to the title bar
- Development:
  - The `content.js` logs will be displayed in the website console itself
  - The logs of `popup.js` can be shown by: Right Click > Inspect pop-up > Console

### Backend and Frontend
- run `npm install` then `npm start` to run the application. Then open your browser at `https://localhost:3016` or your own defined port/url in the config file.
- (optional) edit the `src/config.js` file according to your needs and replace the `ssl/key.pem` `ssl/cert.pem` certificates with your own.

## Work left
- [x] Mesh topology peer-to-peer network :: Check branch `Mesh_Network`
- [x] Making extension
- [x] Making client UI
- [x] Making backend SFU server :: SFU lib used : [mediasoup](https://mediasoup.org/) 
- [x] Making Host from extension
- [x] Host/Client name handling
- [x] Seperate rooms
- [x] Extension UX for rooms
- [ ] Chat part
- [x] Chat microinteractions
- [x] Play/Pause part
- [x] Jump to time and Slider part
- [x] Show current time and duration in Client side
- [ ] HTML/CSS injection on Host
- [ ] Deployment and Testing

### Known issues
- [x] There is a de-sync in audio video stream from host
- [x] When directly sharing a video, and either its src changes (ex. yt ads) or the video ends, transmission freezes
- [ ] Extension popup closes when share popup comes, thus link not copied.
- [x] Site on accessable even from within the same network
- [ ] Still on HTTP, so extension can't be run on websites directly.
- [ ] Noise in audio when stream changed multiple times

### Currently, for running on websites,
- Type `chrome://settings/content/insecureContent` in chrome URL bar.
- Select `Add`
- Now add the base Url of the website.
  - Ex for youtube: `[*.]youtube.com`
- Then start streaming on that website using the extension

## Deployment

- in `config.js` replace the `announcedIP` with your public ip address of the server (important) and modify the port you want to serve it in.
- add firewall rules of the port of the webpage (default 3016) and the rtc connections (default udp 10000-10100) for the machine.


Note : 
- Best to run the project on a linux system as the mediasoup installation could have issues by installing on windows. If you have a windows system consider installing WSL to be able to run it. 
- [installing wsl on windows 10](https://docs.microsoft.com/en-us/windows/wsl/install-win10)

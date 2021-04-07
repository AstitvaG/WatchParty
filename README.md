# WatchParty
---

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

- run `npm install` then `npm start` to run the application. Then open your browser at `https://localhost:3016` or your own defined port/url in the config file.
- (optional) edit the `src/config.js` file according to your needs and replace the `ssl/key.pem ssl/cert.pem` certificates with your own.

## Deployment

- in `config.js` replace the `announcedIP` with your public ip address of the server and modify the port you want to serve it in.
- add firewall rules of the port of the webpage (default 3016) and the rtc connections (default udp 10000-10100) for the machine.


Note : 
- Best to run the project on a linux system as the mediasoup installation could have issues by installing on windows. If you have a windows system consider installing WSL to be able to run it. 
- [installing wsl on windows 10](https://docs.microsoft.com/en-us/windows/wsl/install-win10)
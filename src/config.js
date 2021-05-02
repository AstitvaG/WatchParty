const os = require('os')

module.exports = {
  listenIp: '0.0.0.0',
  listenPort: 3016,
  sslCrt: '../ssl/cert.pem',
  sslKey: '../ssl/cert.key',

  mediasoup: {
    // Worker settings
    numWorkers: Object.keys(os.cpus()).length,
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: 'warn',
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp',
        // 'rtx',
        // 'bwe',
        // 'score',
        // 'simulcast',
        // 'svc'
      ],
    },
    // Router settings
    router: {
      mediaCodecs:
        [
          {
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2,
            useinbandfec: 1
          },
          {
            kind: 'video',
            mimeType: 'video/VP9',
            clockRate: 90000,
            'profile-id': 2,
            parameters:
            {
              'x-google-start-bitrate': 1000
            }
          },
        ]
    },
    // WebRtcTransport settings
    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: '192.168.43.136' // replace by public IP address
        }
      ],
      maxIncomingBitrate: 15000000,
      initialAvailableOutgoingBitrate: 1000000
    },
  }
};


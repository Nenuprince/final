const { config } = require("../config/config")
class Client {
     constructor(userName , socket ){
        this.userName = userName,
        this.socket = socket
        // instead of calling it producer Transport  , renaming it to the upStream . This Client's transport for sending data
        this.upstreamTransport = null,
        //we might have audio or video or both
        this.producer = {} // object because we will produce one stream strack with A/V
         // instead of calling it consumer Transport  , renaming it to the downstream . This Client's transport for rec data
        this.downstreamTransport = []
        this.consumer = []  // but consumer is an array cause we might be consuming lot of strems , with each 2 parts [audio and video tracks]
        this.room = null // this will be a room object
     }  
     addTransport(type , audioPid ,VideoPid ){
      return new Promise (async(resolve , reject)=>{
         const transport = await this.room.router.createWebRtcTransport({
            enableUdp: true,
            enableTcp: true, //always use UDP unless we can't
            preferUdp: true,
            listenInfos:config.webRtcTransport.listenIps,
            initialAvailableOutgoingBitrate :config.webRtcTransport.initialAvailableOutgoingBitrate,
        })
        // console.log(transport)
        const clientTransportParams = {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        }

        if(type === "producer"){
         this.upstreamTransport = transport
        }else if(type === "consumer"){
         console.log("video PID",VideoPid)
         console.log("AudioPid ",audioPid)
         this.downstreamTransport.push({
            transport,
            associatedVideoPid:  VideoPid,
            associatedAudioPid: audioPid
         })
        }
        resolve({clientTransportParams})
      })
     }

     // In Client.js
     addProducer(kind, newProducer) {
      // Store the full producer object, not just the ID
      this.producer[kind] = newProducer
      
      // if audio, then add that to the active client
      if (kind === "audio") {
        console.log("from the client js")
        this.room.activeSpeakerObserver.addProducer({
          producerId: newProducer.id, // Use the ID property
        });
      }
    }
}

module.exports = Client
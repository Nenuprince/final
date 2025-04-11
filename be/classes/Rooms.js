const {config} = require('../config/config')
const { newDominant } = require('../mediasoup/newDominant')
class Room {
    constructor(roomID , workerToUse){
        this.roomID = roomID ,
        this.worker = workerToUse,
        this.router = null,
        this.clients = [] ,// all the client objects are in this room
        this.activeSpeakerList = [] // an array of the ids witht the most recent dominant speaker first
    }
    addClient(client){
        this.clients.push(client)
    }

     createRouter(io , mediaCodecs){
        return new Promise(async(resolve,reject)=>{
            // console.log(config.routerMediaCodecs)
            this.router = await this.worker.createRouter({
                mediaCodecs
            })

            this.activeSpeakerObserver = await this.router.createActiveSpeakerObserver({
                interval:200
            })

            console.log('from the roomsJs ')
            // console.log(this.activeSpeakerObserver)
            this.activeSpeakerObserver.on('dominantspeaker' , ds=> newDominant(ds,this,io))
            resolve()
        })

        
    }
}

module.exports = Room;
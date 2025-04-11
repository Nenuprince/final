// intializing the socket.io server over Express app
const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const {Server} = require('socket.io')
const PORT = 3003;

const Client= require('./classes/Client')
const Room= require('./classes/Rooms')
const getWorker = require('./mediasoup/getWorker')
const {config} = require('./config/config')

const {createMediaSoupWorkers}  = require('./mediasoup/createWorker')


const io = new Server(server , {
    cors:{
        origin:"*"
    }
});

//some global var
let workers = null;
let theProducer = null; 
let client = null;
let ioRef = null ;
let socketRef = null ;



//init mediaSoup worker
const initMediaSoup = async() =>{
    workers = await createMediaSoupWorkers()
    // console.log(workers)
}

initMediaSoup()

let MasterRoomArr = [];

io.on('connect' ,(socket)=>{
    ioRef = io;
    socketRef = socket
    console.log(`${socket.id} has been connected`)

    socket.on('disconnect' ,()=>{
        console.log(`${socket.id} is disconnected`)
    })

    socket.on('joinRoom' ,async({roomID,username} ,ack)=>{
        let newRoom = false
        client = new Client(username,socket)
        // console.log(MasterRoomArr)
        let requestedRoom  = MasterRoomArr.find(room=>room.roomID === roomID)
        if(!requestedRoom) {
            newRoom = true
             const workerForRoom = await getWorker(workers);
            //  console.log(workerForRoom)
             requestedRoom = new Room(roomID,workerForRoom)
            //  console.log(requestedRoom)
             const mediaCodecs = [
                {
                  kind: 'audio',
                  mimeType: 'audio/opus',
                  clockRate: 48000,
                  channels: 2
                },
                {
                  kind: 'video',
                  mimeType: 'video/VP8',
                  clockRate: 90000
                }
              ];
              
        
            const router =  await requestedRoom.createRouter(io ,mediaCodecs)
            // console.log(router)
             MasterRoomArr.push(requestedRoom)
        }
        //add the room to the client
        client.room = requestedRoom
        client.room.addClient(client)
        socket.join(client.room.roomID)

        //consuming
        //fetch 5 pids to consume
        //find the video pids and and make an array   
        const audioPIDsToCreate =  client.room.activeSpeakerList.slice(0,5);
        console.log("hi iam audioPDISTOCREate",client.room.activeSpeakerList)
        const videoPidsToCreate = await audioPIDsToCreate.map(aid=>{
            const CLIENT = client.room.clients.find(c=>c?.producer?.audio?.id===aid)
            return CLIENT?.producer?.video?.id

        })
        const associatedUserName = audioPIDsToCreate.map(aid=>{
            const CLIENT = client.room.clients.find(c=>c?.producer?.audio?.id===aid)
            return CLIENT?.userName
 
        })
        ack({
            routerRtpCapabilities : client.room.router.rtpCapabilities,
            newRoom,
            audioPIDsToCreate,
            videoPidsToCreate,
            associatedUserName
        })
    })

    //request - transport [ works for both Consumer and Producer]
    socket.on('request-transport' ,async({type , audioPid},ack)=>{
        console.log('hi iam line number 111')
        let ClientTransportParams = null
        if(type === "producer"){
            ClientTransportParams = await client.addTransport(type)
            // console.log(ClientTransportParams)
        }
        if(type === "consumer"){
            const ProducingClient = client.room.clients.find(c=>c?.producer?.audio?.id === audioPid)
            const VideoPid = ProducingClient?.producer?.video?.id
            ClientTransportParams = await client.addTransport(type,audioPid,VideoPid)
            // console.log(VideoPid)
        }
        ack(ClientTransportParams)
    })

    socket.on('connect-transport' , async({dtlsParameters,type},ack)=>{
        console.log({dtlsParameters})
         if(type === 'producer'){
            try{
              const connect =   await client.upstreamTransport.connect({dtlsParameters})
                console.log(connect)
                ack('success')
            }catch(err){
                console.log(err)
            }
         }
         if(type === ' consume r'){

         }
    })


    socket.on('startProducing' , async({kind, rtpParameters}, ack)=>{
        try{
            const newProducer = await client.upstreamTransport.produce({kind,rtpParameters})
            // add producer to this client object
            console.log('from the server js : newProducer')
            console.log(newProducer.id)
            client.addProducer(kind,newProducer.id)
            ack(newProducer.id)

        }catch(err){
            console.log(err)
        }
    })
    
})



server.listen(PORT , ()=>{
    console.log(`server has been started at the port ${PORT}`)
})
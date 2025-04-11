// intializing the socket.io server over Express app
const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const PORT = 3003;

const Client = require('./classes/Client')
const Room = require('./classes/Rooms')
const getWorker = require('./mediasoup/getWorker')
const { config } = require('./config/config')

const { createMediaSoupWorkers } = require('./mediasoup/createWorker')


const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

//some global var
let workers = null;
let theProducer = null;
let client = null;
let ioRef = null;
let socketRef = null;



//init mediaSoup worker
const initMediaSoup = async () => {
    workers = await createMediaSoupWorkers()
    // console.log(workers)
}

initMediaSoup()

let MasterRoomArr = [];

io.on('connect', (socket) => {
    ioRef = io;
    socketRef = socket
    console.log(`${socket.id} has been connected`)

    socket.on('disconnect', () => {
        console.log(`${socket.id} is disconnected`)
    })

    socket.on('joinRoom', async ({ roomID, username }, ack) => {
        let newRoom = false
        client = new Client(username, socket)
        // console.log(MasterRoomArr)
        let requestedRoom = MasterRoomArr.find(room => room.roomID === roomID)
        if (!requestedRoom) {
            newRoom = true
            const workerForRoom = await getWorker(workers);
            //  console.log(workerForRoom)
            requestedRoom = new Room(roomID, workerForRoom)
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


            const router = await requestedRoom.createRouter(io, mediaCodecs)
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
        const audioPIDsToCreate = client.room.activeSpeakerList.slice(0, 5);
        console.log("hi iam audioPDISTOCREate", client.room.activeSpeakerList)
        const videoPidsToCreate = await audioPIDsToCreate.map(aid => {
            const CLIENT = client.room.clients.find(c => c?.producer?.audio?.id === aid)
            return CLIENT?.producer?.video?.id

        })
        const associatedUserName = audioPIDsToCreate.map(aid => {
            const CLIENT = client.room.clients.find(c => c?.producer?.audio?.id === aid)
            return CLIENT?.userName

        })
        ack({
            routerRtpCapabilities: client.room.router.rtpCapabilities,
            newRoom,
            audioPIDsToCreate,
            videoPidsToCreate,
            associatedUserName
        })
    })

    //request - transport [ works for both Consumer and Producer]
    socket.on('request-transport', async ({ type, audioPid }, ack) => {
        console.log('hi iam line number 111')
        let ClientTransportParams = null
        if (type === "producer") {
            ClientTransportParams = await client.addTransport(type)
            // console.log(ClientTransportParams)
        }
        if (type === "consumer") {
            console.log("Clients with Producers:");
            client.room.clients.forEach(c => {
                console.log(`Client ID: ${c.id}, Audio Producer ID: ${c?.producer?.audio?.id}`);
            });

            const ProducingClient = client.room.clients.find(c => c?.producer?.audio?.id === audioPid)
            console.log("producing client", ProducingClient)
            console.log("producing client , producer ", ProducingClient.producer)
            console.log("producing client , producer  , video", ProducingClient.producer.video)
            console.log("producing client , producer  , video", ProducingClient.producer.video.id)
            const VideoPid = ProducingClient?.producer?.video?.id
            console.log("inside the server , for videoPID", VideoPid)
            ClientTransportParams = await client.addTransport(type, audioPid, VideoPid)
            // console.log(VideoPid)
        }
        ack(ClientTransportParams)
    })

    socket.on('connect-transport', async ({ dtlsParameters, type, audioPid }, ack) => {
        console.log({ dtlsParameters });
        if (type === 'producer') {
            try {
                await client.upstreamTransport.connect({ dtlsParameters });
                ack('success');
            } catch (err) {
                console.log(err);
                ack('error');
            }
        }
        if (type === 'consumer') {
            try {
                // Find the correct transport from the array
                const targetTransport = client.downstreamTransport.find(t =>
                    t.associatedAudioPid === audioPid);

                if (targetTransport) {
                    await targetTransport.transport.connect({ dtlsParameters });
                    ack('success');
                } else {
                    ack('error');
                }
            } catch (err) {
                console.log(err);
                ack('error');
            }
        }
    });

    socket.on('startProducing', async ({ kind, rtpParameters }, ack) => {
        try {
          const newProducer = await client.upstreamTransport.produce({ kind, rtpParameters });
          console.log('from the server js : newProducer');
          console.log(newProducer.id);
          
          // Add the full producer object to the client
          client.addProducer(kind, newProducer);
          ack(newProducer.id);
        } catch (err) {
          console.log(err);
          ack({ error: err.message });
        }
      });
    //consume

    socket.on('consume', async ({ rtpCapabilities, producerAudioId, producerVideoId, transportId }, ack) => {
        try {
            // Check if the device can consume the producer
            if (!client.room.router.canConsume({
                producerId: producerAudioId,
                rtpCapabilities
            })) {
                return ack({ success: false, error: 'Cannot consume audio' });
            }

            // Find the correct transport for this producer
            const targetTransport = client.downstreamTransport.find(t =>
                t.associatedAudioPid === producerAudioId);

            if (!targetTransport) {
                return ack({ success: false, error: 'Transport not found' });
            }

            // Create audio consumer
            const audioConsumer = await targetTransport.transport.consume({
                producerId: producerAudioId,
                rtpCapabilities,
                paused: true,
            });

            // Create video consumer if available
            let videoConsumer = null;
            if (producerVideoId && client.room.router.canConsume({
                producerId: producerVideoId,
                rtpCapabilities
            })) {
                videoConsumer = await targetTransport.transport.consume({
                    producerId: producerVideoId,
                    rtpCapabilities,
                    paused: true,
                });
            }

            // Store consumers in client object
            client.consumer.push({
                audioConsumer: audioConsumer.id,
                videoConsumer: videoConsumer ? videoConsumer.id : null,
                producerAudioId,
                producerVideoId
            });

            // Return consumer parameters to client
            ack({
                success: true,
                audioParams: {
                    id: audioConsumer.id,
                    producerId: audioConsumer.producerId,
                    kind: audioConsumer.kind,
                    rtpParameters: audioConsumer.rtpParameters,
                },
                videoParams: videoConsumer ? {
                    id: videoConsumer.id,
                    producerId: videoConsumer.producerId,
                    kind: videoConsumer.kind,
                    rtpParameters: videoConsumer.rtpParameters,
                } : null
            });

        } catch (err) {
            console.log(err);
            ack({ success: false, error: err.message });
        }
    });


    //consume - resume.

    // Replace the consumer-resume event handler in your server.js
    socket.on('consumer-resume', async ({ consumerId }, ack) => {
        try {
            // Find the consumer in the client's consumers array
            const consumerEntry = client.consumer.find(c =>
                c.audioConsumer === consumerId || c.videoConsumer === consumerId);

            if (!consumerEntry) {
                console.log(`Consumer ${consumerId} not found in client's consumers`);
                return ack('error');
            }

            // Find the associated transport
            let transport;
            if (consumerId === consumerEntry.audioConsumer) {
                transport = client.downstreamTransport.find(t =>
                    t.associatedAudioPid === consumerEntry.producerAudioId);
            } else {
                transport = client.downstreamTransport.find(t =>
                    t.associatedVideoPid === consumerEntry.producerVideoId);
            }

            if (!transport) {
                console.log(`Transport not found for consumer ${consumerId}`);
                return ack('error');
            }

            // Get all consumers on this transport
            // console.log("console of transport before consumers" , transport)
            const consumersMap = await transport?.transport?.consumers;
            console.log("consumer log", consumersMap)
            // Find the consumer with matching ID
            const consumers = Array.from(consumersMap.values());
            const consumer = consumers.find(c => c.id === consumerId);

            if (!consumer) {
                console.log(`Consumer ${consumerId} not found in transport consumers`);
                return ack('error');
            }

            // Resume the consumer
            await consumer.resume();
            ack('success');
        } catch (err) {
            console.log(err);
            ack('error');
        }
    });

})



server.listen(PORT, () => {
    console.log(`server has been started at the port ${PORT}`)
})
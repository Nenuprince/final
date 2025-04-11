import { Device } from 'mediasoup-client'
import { createProducerTransport } from '../mediasoup_Fun/createProducerTransport'
import { createProducer } from '../mediasoup_Fun/createProducer'
import RequestTransportToConsumer from '../mediasoup_Fun/requestTransportToConsumer'

let device = null;
let socketRef = null;
let localStream = null;
let videoProducer = null;
let audioProducer = null;
let remoteRefs = null;

export const joinRoom = (socket, roomID, username, localVideo, remoteVideoRefs) => new Promise(async (resolve, reject) => {
  try {
    socketRef = socket; // socket for ref
    remoteRefs = remoteVideoRefs; // Store refs to remote videos
    
    // Join the room on the server side
    const resp = await socket.emitWithAck('joinRoom', { roomID, username });
    console.log("Room join response:", resp);
    
    // Initialize MediaSoup device
    device = new Device();
    await device.load({
      routerRtpCapabilities: resp.routerRtpCapabilities
    });
    
    // Check if this is a new room (first participant)
    if (!resp.newRoom) {
      // Not a new room, so start consuming from existing participants
      console.log("Joining existing room with participants");
      await RequestTransportToConsumer(resp, socket, device);
    } else {
      console.log("Created new room");
    }
    
    resolve(localVideo);
  } catch (err) {
    console.error("Error joining room:", err);
    reject(err);
  }
})
.then((localVideo) => new Promise(async (resolve, reject) => {
  try {
    // Get user media (camera and microphone)
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    
    // Set the local stream to the video element
    if (localVideo.current) {
      localVideo.current.srcObject = localStream;
      localVideo.current.play().catch(err => 
        console.warn("Auto-play prevented, user interaction needed:", err)
      );
    }
    
    resolve();
  } catch (err) {
    console.error("Error getting user media:", err);
    reject(err);
  }
}))
.then(() => new Promise(async (resolve, reject) => {
  try {
    // Create transport for sending media
    let producerTransport = await createProducerTransport(socketRef, device);
    console.log("Producer transport created:", producerTransport);
    
    // Start producing audio and video
    let producers = await createProducer(localStream, producerTransport);
    videoProducer = producers.videoProducer;
    audioProducer = producers.audioProducer;
    console.log("Producers created:", { videoProducer, audioProducer });
    
    resolve();
  } catch (err) {
    console.error("Error setting up producer:", err);
    reject(err);
  }
}));
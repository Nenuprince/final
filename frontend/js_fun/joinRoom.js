import { Device } from 'mediasoup-client'
import { createProducerTransport } from '../mediasoup_Fun/createProducerTransport'
import { createProducer } from '../mediasoup_Fun/createProducer';
import RequestTransportToConsumer from '../mediasoup_Fun/requestTransportToConsumer';
let device = null;
let socketRef = null;
let localvidRedf = null;
let videoProducer = null ;
let audioProducer = null;

export const joinRoom = (socket, roomID, username, localVideo) => new Promise(async (resolve, reject) => {
  try {
    socketRef = socket; // socket for ref
    const resp = await socket.emitWithAck('joinRoom', { roomID, username })
    // console.log(resp)
    device = new Device()
    await device.load({
      routerRtpCapabilities: resp.routerRtpCapabilities
    })

    // joinRooms contains array for :
      // AudioPIDSToCreate
      // mapped to vidoe PIDS to Create
      //mapped to username
      console.log(resp)
      RequestTransportToConsumer(resp ,socket , device)

    resolve(localVideo)
  } catch (err) {
    console.log(err)
    reject()
  }
}).then((localVideo, socket) => new Promise(async (resolve, reject) => {
  let localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  })
  localvidRedf = localStream
  localVideo.current.srcObject = localStream;
  resolve(socket)
})).then(() => new Promise(async (resolve, reject) => {

  let producerTransport = await createProducerTransport(socketRef, device)
  console.log(producerTransport)
  let createProducerVar = await createProducer(localvidRedf , producerTransport)
  videoProducer=createProducerVar.videoProducer
  audioProducer= createProducerVar.audioProducer
  console.log({videoProducer, audioProducer})

}))


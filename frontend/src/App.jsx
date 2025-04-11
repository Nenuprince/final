import React, { useEffect, useRef, useState } from 'react'
import {io} from 'socket.io-client';
import {joinRoom} from '../js_fun/joinRoom'
const App = () => {
  //ref variables for video src
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const [roomID, setroomId] = useState('')
  const [name, setName] = useState('')
  const socketRef = useRef(null)


  //establish the connection to the server as soon as the component mounts
  useEffect(()=>{
    const socket = io('http://localhost:3003/')
    socketRef.current = socket;

    socket.on('connect',()=>{
      console.log(`${socketRef.current.id} is connected`)
    })

    //cleanUp
    return ()=>{
      socket.disconnect()
    }
  },[])

 

  return (
    <>
      <div id='room- container'>
        <input type="text" placeholder='Enter Room ID' id='room-Id' onChange={(e) => {
          setroomId(e.target.value)
        }} />
        <input type="text" placeholder='Enter Name ' onChange={(e) => {
          setName(e.target.value)
        }} />
        <button onClick={() => {
          joinRoom(socketRef.current , roomID , name , localVideoRef)
        }}>JOin RooM</button>
      </div>
      <div id='video-container' >
        <video ref={localVideoRef}
          autoPlay
          muted
          playsInline
          controls
          style={{ position: 'absolute', top: '60%', border: '5px solid red', zIndex: '2' ,  width:'350px' , height:'300px' }}
        ></video>
        <div id='remote-vide-container' style={{ display: 'flex', justifyContent: 'space-between', zIndex: '0'  }}>
          <video ref={remoteVideoRef}
            id='remote'
            autoPlay
            muted
            playsInline
            controls
            style={{ border: "5px solid green"  }}
          ></video>
          <video ref={remoteVideoRef}
            id='remote1'
            autoPlay
            muted
            playsInline
            controls
            style={{ border: "5px solid green" }}
          ></video>
          <video ref={remoteVideoRef}
            id='remote2'
            autoPlay
            muted
            playsInline
            controls
            style={{ border: "5px solid green" }}
          ></video>
          <video ref={remoteVideoRef}
            id='remote3'
            autoPlay
            muted
            playsInline
            controls
            style={{ border: "5px solid green" }}
          ></video>
        </div>
        <div id='dominant-vid-container'>
          <video ref={remoteVideoRef}
            autoPlay
            muted
            playsInline
            controls
            style={{ width: '70%', zIndex: '1', left: '10%', position: 'absolute', border: "5px solid yellow" }}
          ></video>
        </div>
      </div>

    </>
  )
}

export default App
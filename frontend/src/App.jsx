import React, { useEffect, useRef, useState } from 'react'
import {io} from 'socket.io-client';
import {joinRoom} from '../js_fun/joinRoom'

const App = () => {
  //ref variable for local video
  const localVideoRef = useRef(null)
  
  // Create an array for remote video refs
  const remoteVideoRefs = {
    remote: useRef(null),
    remote1: useRef(null),
    remote2: useRef(null),
    remote3: useRef(null),
    dominant: useRef(null)
  }
  
  const [roomID, setRoomId] = useState('')
  const [name, setName] = useState('')
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)

  //establish the connection to the server as soon as the component mounts
  useEffect(() => {
    const socket = io('http://localhost:3003/')
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`${socketRef.current.id} is connected`)
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    //cleanUp
    return () => {
      socket.disconnect()
    }
  }, [])

  const handleJoinRoom = () => {
    if (!roomID || !name) {
      alert('Please enter both room ID and name')
      return
    }
    
    // Pass the refs object so we can update remote videos from the joinRoom function
    joinRoom(socketRef.current, roomID, name, localVideoRef, remoteVideoRefs)
      .then(() => console.log('Joined room successfully'))
      .catch(err => console.error('Failed to join room:', err))
  }

  return (
    <>
      <div id='room-container' style={{ marginBottom: '20px', padding: '10px' }}>
        <input 
          type="text" 
          placeholder='Enter Room ID' 
          id='room-Id' 
          value={roomID}
          onChange={(e) => setRoomId(e.target.value)} 
          style={{ margin: '5px', padding: '8px' }}
        />
        <input 
          type="text" 
          placeholder='Enter Name' 
          value={name}
          onChange={(e) => setName(e.target.value)} 
          style={{ margin: '5px', padding: '8px' }}
        />
        <button 
          onClick={handleJoinRoom}
          disabled={!isConnected}
          style={{ 
            margin: '5px', 
            padding: '8px 16px', 
            backgroundColor: isConnected ? '#4CAF50' : '#cccccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isConnected ? 'pointer' : 'not-allowed'
          }}
        >
          Join Room
        </button>
        <div style={{ fontSize: '12px', color: isConnected ? 'green' : 'red' }}>
          {isConnected ? 'Connected to server' : 'Disconnected from server'}
        </div>
      </div>
      
      <div id='video-container' style={{ position: 'relative', height: '80vh' }}>
        <video 
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          controls
          style={{ 
            position: 'absolute', 
            bottom: '10px', 
            right: '10px',
            border: '5px solid red', 
            zIndex: '2',
            width: '300px',
            height: '225px'
          }}
        ></video>
        
        <div 
          id='remote-video-container' 
          style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            justifyContent: 'space-around', 
            position: 'absolute',
            top: '10px',
            left: '10px',
            right: '10px',
            zIndex: '1'
          }}
        >
          <video 
            ref={remoteVideoRefs.remote}
            id='remote'
            autoPlay
            playsInline
            controls
            style={{ border: "5px solid green", width: '220px', height: '165px', margin: '5px' }}
          ></video>
          <video 
            ref={remoteVideoRefs.remote1}
            id='remote1'
            autoPlay
            playsInline
            controls
            style={{ border: "5px solid green", width: '220px', height: '165px', margin: '5px' }}
          ></video>
          <video 
            ref={remoteVideoRefs.remote2}
            id='remote2'
            autoPlay
            playsInline
            controls
            style={{ border: "5px solid green", width: '220px', height: '165px', margin: '5px' }}
          ></video>
          <video 
            ref={remoteVideoRefs.remote3}
            id='remote3'
            autoPlay
            playsInline
            controls
            style={{ border: "5px solid green", width: '220px', height: '165px', margin: '5px' }}
          ></video>
        </div>
        
        <div 
          id='dominant-vid-container' 
          style={{ 
            position: 'absolute',
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            width: '70%',
            maxWidth: '960px',
            zIndex: '0'
          }}
        >
          <video 
            ref={remoteVideoRefs.dominant}
            autoPlay
            playsInline
            controls
            style={{ 
              width: '100%', 
              border: "5px solid yellow",
              borderRadius: '4px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }}
          ></video>
        </div>
      </div>
    </>
  )
}

export default App
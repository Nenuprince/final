export const createProducer = (localStream , producerTransport) =>new Promise(async(resolve , reject)=>{
    const videoTrack = localStream.getVideoTracks()[0];
    const audioTrack = localStream.getAudioTracks()[0]; 
    // console.log(audioTrack)
    // const audioTrack = localStream.getAudioTracks()[0];
    // console.log(videoTrack)
    try{
       
      // produce will fire the connect event
      const videoProducer = await producerTransport.produce({track:videoTrack})
      const audioProducer = await producerTransport.produce({track:audioTrack})
      // const audioProducer = await producerTransport.produce({track:audioTrack})
      resolve({videoProducer , audioProducer})
    }catch(err){
      console.log(err)
    }
})
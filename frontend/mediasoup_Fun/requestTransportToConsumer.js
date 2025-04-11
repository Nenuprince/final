const RequestTransportToConsumer = (consumeData, socket, device, remoteRefs) => {
  return new Promise(async (resolve, reject) => {
    try {
      const consumers = [];
      
      // Process each producer to consume
      for (let i = 0; i < consumeData.audioPIDsToCreate.length; i++) {
        const audioPid = consumeData.audioPIDsToCreate[i];
        const videoPid = consumeData.videoPidsToCreate[i];
        const username = consumeData.associatedUserName[i];
        
        if (!audioPid) continue; // Skip if no audio producer ID
        
        // Request a transport for this producer
        const consumerTransportParams = await socket.emitWithAck('request-transport', {
          type: "consumer", 
          audioPid
        });
        
        if (!consumerTransportParams) {
          console.error('Failed to get transport parameters');
          continue;
        }
        
        // Create a receive transport
        const recvTransport = device.createRecvTransport(consumerTransportParams.clientTransportParams);
        
        // Set up transport connection event
        recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
          try {
            const response = await socket.emitWithAck('connect-transport', {
              dtlsParameters,
              type: 'consumer',
              audioPid
            });
            
            if (response === 'success') {
              callback();
            } else {
              errback();
            }
          } catch (err) {
            console.error('Transport connect error:', err);
            errback(err);
          }
        });
        
        // Create consumers for this producer's audio and video
        try {
          const { success, audioParams, videoParams, error } = await socket.emitWithAck('consume', {
            rtpCapabilities: device.rtpCapabilities,
            producerAudioId: audioPid,
            producerVideoId: videoPid,
            transportId: recvTransport.id
          });
          
          if (!success) {
            console.error('Consume request failed:', error);
            continue;
          }
          
          // Create audio consumer
          const audioConsumer = await recvTransport.consume({
            id: audioParams.id,
            producerId: audioParams.producerId,
            kind: audioParams.kind,
            rtpParameters: audioParams.rtpParameters
          });
          
          // Resume the consumer
          await socket.emitWithAck('consumer-resume', {
            consumerId: audioConsumer.id
          });
          
          // Create object with consumer info
          const consumerInfo = {
            username,
            audio: {
              track: audioConsumer.track,
              consumer: audioConsumer
            },
            video: null
          };
          
          // Create video consumer if available
          if (videoParams) {
            const videoConsumer = await recvTransport.consume({
              id: videoParams.id,
              producerId: videoParams.producerId,
              kind: videoParams.kind,
              rtpParameters: videoParams.rtpParameters
            });
            
            // Resume the video consumer
            await socket.emitWithAck('consumer-resume', {
              consumerId: videoConsumer.id
            });
            
            consumerInfo.video = {
              track: videoConsumer.track,
              consumer: videoConsumer
            };
          }
          
          consumers.push(consumerInfo);
          
          // Update the UI with the new stream
          updateVideoElement(consumerInfo, i, remoteRefs);
          
        } catch (err) {
          console.error('Error creating consumer:', err);
        }
      }
      
      resolve(consumers);
    } catch (err) {
      console.error('Error in RequestTransportToConsumer:', err);
      reject(err);
    }
  });
};

// Helper function to update video elements using React refs
function updateVideoElement(consumerInfo, index, remoteRefs) {
  // Create the remote video element ID based on index
  const videoRefKey = index === 0 ? 'remote' : `remote${index}`;
  
  // Get the video element reference from the remoteRefs object
  const videoEl = remoteRefs[videoRefKey]?.current;
  
  if (videoEl && consumerInfo.video) {
    // Create a MediaStream with the consumer's track
    const stream = new MediaStream();
    stream.addTrack(consumerInfo.video.track);
    
    // Set the stream to the video element
    videoEl.srcObject = stream;
    videoEl.play().catch(err => console.error('Error playing video:', err));
    
    // Add username as data attribute
    videoEl.setAttribute('data-username', consumerInfo.username);
  }
  
  // If this is the dominant speaker (first in the list), update the dominant video as well
  if (index === 0 && remoteRefs.dominant?.current && consumerInfo.video) {
    const dominantVideo = remoteRefs.dominant.current;
    const stream = new MediaStream();
    stream.addTrack(consumerInfo.video.track);
    dominantVideo.srcObject = stream;
    dominantVideo.play().catch(err => console.error('Error playing dominant video:', err));
  }
}

export default RequestTransportToConsumer;
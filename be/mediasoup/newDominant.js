const newDominant = async(ds, room, io) => {
    try {
      // Check if producer exists
      if (!ds || !ds.producer || !ds.producer.id) {
        console.warn("Invalid dominant speaker data");
        return;
      }
      
      const producerId = ds.producer.id;
      
      // Find if this producer is already in the active speaker list
      const index = room.activeSpeakerList.findIndex(pid => pid === producerId);
      
      if (index > -1) {
        // Producer is already in the list, move it to the front
        room.activeSpeakerList.splice(index, 1);
        room.activeSpeakerList.unshift(producerId);
      } else {
        // This is a new producer, add it to the front
        room.activeSpeakerList.unshift(producerId);
      }
      
      // Limit the list to the top 5 active speakers
      if (room.activeSpeakerList.length > 5) {
        room.activeSpeakerList = room.activeSpeakerList.slice(0, 5);
      }
      
      console.log("Active speakers updated:", room.activeSpeakerList);
      
      // Find the client associated with this producer
      const speakingClient = room.clients.find(c => {
        // Check both ways of accessing producer ID
        if (c?.producer?.audio?.id === producerId) return true;
        if (c?.producer?.audio === producerId) return true;
        if (c?.producer?.video?.id === producerId) return true;
        if (c?.producer?.video === producerId) return true;
        return false;
      });
      
      if (speakingClient) {
        // Notify all clients in the room about the new dominant speaker
        io.to(room.roomID).emit('dominant-speaker-changed', {
          producerId,
          username: speakingClient.userName
        });
      }
    } catch (err) {
      console.error("Error in newDominant:", err);
    }
  };

  module.exports = newDominant
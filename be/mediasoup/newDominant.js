 const newDominant = async(ds, room , io) => {
const i = room.activeSpeakerList.findIndex(pid=>pid===ds.producer.id)
console.log("from New Dominant",i)
if(i > -1){
    const [pid] = room.activeSpeakerList.splice(i,1);
    room.activeSpeakerList.unshift(pid)
}else{
    // this  is a new Producer , just add that to front
   const log = await room.activeSpeakerList.unshift(ds.producer.id)
   console.log("else part log for active speaker" , room.activeSpeakerList)
}
}

module.exports= {newDominant}
const os = require('os')
const mediasoup = require('mediasoup')
const threads = os.cpus().length
const {config} = require('../config/config')

const createMediaSoupWorkers = () => new Promise(async(resolve , reject)=>{
    let workers = [];
    try{
        for(let i = 0 ; i<threads ; i++){
            const worker = await mediasoup.createWorker({
                 rtcMinPort: config.workerSettings.rtcMinPort,
                 rtcMaxPort: config.workerSettings.rtcMaxPort,
                 logLevel: config.workerSettings.logLevel,
                 logTags: config.workerSettings.logTags,
            })

            worker.on('died',()=>{
                console.log("The worker Died")
                process.exit(1)
            })

            workers.push(worker);
        }
        resolve(workers)
    }catch(err){
        console.log(err)
        reject(err)
    }
})

module.exports = { createMediaSoupWorkers };


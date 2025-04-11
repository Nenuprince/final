export const createProducerTransport = (socket , device)=> new Promise(async(resolve,reject)=>{
    // ask the server to make a transport and send the params
    // console.log(socket)
    const producerTransportParams = await socket.emitWithAck('request-transport',{type:"producer"})
    // console.log(producerTransportParams.clientTransportParams)
    const producerTransport =  device.createSendTransport(producerTransportParams.clientTransportParams)
    // console.log(producerTransport
    producerTransport.on('connect' , async({dtlsParameters},callback,errback)=>{
        console.log(socket)
        const connectResp = await socket.emitWithAck('connect-transport',{dtlsParameters ,type:'producer'})
        console.log(connectResp , " connect resp is back")
        if(connectResp === 'success'){
            console.log('hey success')
            callback()
        }
        if(connectResp === 'error'){
            errback()
        }
    })
    producerTransport.on('produce' , async(parameters , callback  , errback)=>{
        console.log('we reached the produce')
        const {kind , rtpParameters} = parameters
        const produceResp = await socket.emitWithAck('startProducing' , {kind , rtpParameters})
        console.log(produceResp , 'connect resp is back')
        if(produceResp === 'error'){
            errback()
        }else{
            callback({id:produceResp})
        }
    })
    resolve(producerTransport)
})
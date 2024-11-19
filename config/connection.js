const mongoClient=require('mongodb').MongoClient
const state={
    db:null
}

module.exports.connect=function(done){
    const url='mongodb://localhost:27017'
    const dbname='shoego'

    mongoClient.connect(url)
        .then((data)=> {
            state.db=data.db(dbname)
            done()
        })
        .catch((err)=>{
            done(err)
        })
    
}

module.exports.get =() => {return state.db}
//load libraries
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const AWS = require('aws-sdk')
const { MongoClient } = require('mongodb')
const multer = require('multer')
const fs = require('fs')
const mysql = require('mysql2/promise')
const multerS3 = require('multer-s3')

//configure PORT
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000

//configure the databases
//MYSQL Database
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'mario',
    password: process.env.DB_PASSWORD || 'q1w2e3r4',
    database: process.env.DB_NAME || 'bgg',
    connectionLimit: 4,
    timezone: '+08:00'
})

//MONGODB database setup
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017'
const MONGO_DB = 'bgg' //change where necessary: db name
const MONGO_COLLECTION = 'reviews' // collection name
const mongoClient = new MongoClient(MONGO_URL, {
    useNewUrlParser: true, useUnifiedTopology: true
})

//digitalocean database setup
const s3 = new AWS.S3({
    endpoint: new AWS.Endpoint('sfo2.digitaloceanspaces.com'),
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
})


//create app: instentiate express
const app = express()
app.use(morgan('combined'))
app.use(cors())

//application/x-www.form-urlencoded
app.post('/book', express.urlencoded({ extended: true }),
    (req, res) => {
        console.info('>> payload: ', req.body)

        res.status(200).type('application/json')
        res.json({ message: 'accepted' })
    }
)

//upload an image to S3
const upload = multer({
    storage: multerS3({
      s3: s3,
      bucket: process.env.BUCKET_NAME,
      acl: 'public-read',
      metadata: function (req, file, cb) {
        cb(null, {
            fieldName: file.fieldname,
            originalFileName: file.originalname,
            uploadTimeStamp: new Date().toString(),
        });
      },
      key: function (request, file, cb) {
        console.log(file);
        cb(null, new Date().getTime()+'_'+ file.originalname);
      }
    })
  }).single('upload');

  app.post('/upload', (request, response, next)=> {
    upload(request, response, (error)=> {
        if (error) {
          console.log(error);
          response.status(500).json({error: error.message});
        }
        console.log('File uploaded successfully.');
        response.status(200).json({
          message: "uploaded",
          s3_file_key: response.req.file.location
        });
    });
});

async function downloadFromS3(params, res){
    const metaData = await s3.headObject(params).promise();
    console.log(metaData);
    res.set({
        'X-Original-Name': metaData.Metadata.originalfilename,
        'X-Create-Time': metaData.Metadata.uploadtimestamp
      })
    s3.getObject(params, function(err, data) {
        if (err) console.log(err, err.stack);
        let fileData= data.Body.toString('utf-8');
        res.send(fileData);
    });
}

app.get('/blob/:key', (req,res)=>{
    const keyFilename = req.params.key;
    var params = {
        Bucket: process.env.BUCKET_NAME,
        Key: keyFilename
    };
    downloadFromS3(params, res);
});






//start server only if both databases are connected
//IIFE
const p0 = (async () => {   //mysql connection
    const conn = await pool.getConnection()
    await conn.ping()
    conn.release()
    return true
})()

const p1 = (async () => {   //mongo connection
    await mongoClient.connect()
    return true
})()

const p2 = new Promise(
    (resolve, reject) => {
        if ((!!process.env.ACCESS_KEY) && (!!process.env.SECRET_ACCESS_KEY))
                resolve()
        else
                reject('S3 keys not found')
    }
)

Promise.all([ p0, p1, p2 ])
    .then((r) => {
        app.listen(PORT, () => {
            console.info(`Application started on port ${PORT} at ${new Date()}`)
        })
    })
    .catch(err => { console.error('Unable to connect: ', err) })
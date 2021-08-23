const fs = require('fs');
const https = require('https');
const http = require('http');

const port = typeof process.env.PORT !== 'undefined' ? process.env.PORT : 3000;
const useSSL = typeof process.env.USE_SSL !== 'undefined' ? process.env.USE_SSL : false;

const authleteApiServer = typeof process.env.AUTHLETE_API_SERVER !== 'undefined'? process.env.AUTHLETE_API_SERVER : 'api.authlete.com';
const authleteApiPort = typeof process.env.AUTHLETE_API_PORT !== 'undefined'? process.env.AUTHLETE_API_PORT : 443;
const authleteApiKey = process.env.AUTHLETE_API_KEY;
const authleteApiSecret = process.env.AUTHLETE_API_SECRET;

const express = require('express')

const authlete = require('./authlete.js')(authleteApiServer, authleteApiPort, authleteApiKey, authleteApiSecret);

const app = express()

var bodyParser = require('body-parser')


var router = express.Router()


router.use('/*', bodyParser.urlencoded({extended:true}));
router.use('/*', bodyParser.json());
router.use('/*',authlete.middleware);


app.use('/', router)



app.get('/api/authorization', (req, res) => {

    if(req.authleteResponse.action == 'INTERACTION'){

	const issueBody = {
	    ticket : req.authleteResponse.ticket,
	    subject: "domingos.creado@gmail.com",
	    sub:"abc",
	    acr: "loa2",
	    claims: JSON.stringify({
		"name" : "Domingos Creado",
		"cpf" : "1627638361"
	    })
		
	}

	authlete.issue(issueBody, req, res);
	
    } else {
	res.json(req.authleteResponse);
    }
    
    
  //  res.json(req.authleteResponse);
})

app.post('/api/authenticate', (req, res) => {

    
    authlete.issue(req.body, req, res);
    
})

app.post('/api/revoke', (req, res) => {
  res.send('Hello World!')
})

app.get('/', (req, res) => {
    res.send('Hello World!')
})

if(useSSL === 'true'){

   https.createServer(
    {
      cert: fs.readFileSync(process.env.SERVER_CERT),
      key: fs.readFileSync(process.env.SERVER_KEY),
      requestCert: true,
      rejectUnauthorized: false,
      ca: [
         fs.readFileSync(process.env.TLS_CA_CERT)
      ]
    }, app).listen(port);
    
} else {
    app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`)
    })
}




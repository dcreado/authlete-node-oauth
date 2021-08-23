const https = require('https');
const urlencode = require('urlencode');

module.exports = {

    authleteSimpleGetDelegate : function(authleteApiServer, authleteApiPort,
				   authleteApiKey, authleteApiSecret,
				   res, path){
        https.get('https://' + authleteApiServer + ':' + authleteApiPort  + path, {
		auth: authleteApiKey + ":" + authleteApiSecret
	    }, (authleteResponse) => {
		res.statusCode = authleteResponse.statusCode;
		
		authleteResponse.on('data', (d) => {
		    res.write(d);
		});

		authleteResponse.on('end', () => {
		    res.end();
		});
	    }).on('error', (e) => {
		res.error(e);
	    });	  
    },

    authleteGetDelegate : function(authleteApiServer, authleteApiPort,
				   authleteApiKey, authleteApiSecret,
				   req, res, next, path, key){
	
        https.get('https://' + authleteApiServer + ':' + authleteApiPort  + path,
		  {
		      auth: authleteApiKey + ":" + authleteApiSecret
		  },
		  (authleteResponse) => {

		      body = "";
		
		      authleteResponse.on('data', (d) => {
			  body = body + d;
		      });

		      authleteResponse.on('end', () => {
			  req.authleteResponse = body;
			  next();
		      });

		  }).on('error', (e) => {
		      res.error(e);
		  });
    },
    
    authletePostDelegate : function(authleteApiServer, authleteApiPort,
				    authleteApiKey, authleteApiSecret,
				    req, res, next, path, chainResponse){

	
	const params = urlencode.stringify(req.body);
	
	const body = {
	    parameters : params    
	}

	if(req.headers.authorization !== undefined){

	    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
            const [client_id, secret] = Buffer.from(b64auth, 'base64').toString().split(':')

	    body.clientId = client_id;
	    body.clientSecret = secret;
	}

	const cert = req.socket.getPeerCertificate();
	if(cert !== undefined){
	    var prefix = '-----BEGIN CERTIFICATE-----\n';
	    var postfix = '-----END CERTIFICATE-----';
	    var pemText = prefix + cert.raw.toString('base64').match(/.{0,64}/g).join('\n') + postfix;

	    body.clientCertificatePath = pemText
	}

	const data = JSON.stringify(body);
	
	const options = {
	    method: 'POST',
	    hostname: authleteApiServer,
	    port: authleteApiPort,
	    path: path,
	    auth: authleteApiKey + ":" + authleteApiSecret,
	    headers: {
		'Content-Type': 'application/json',
		'Content-Length': data.length
	    }
	}

	const authleteRequest =
	      https.request(options,
			    (authleteResponse) => {
				res.statusCode = authleteResponse.statusCode;

				var body = ""
				authleteResponse.on('data', (d) => {	
				    body = body + d;
				});

				authleteResponse.on('end', () => {

				    
				    req.authleteResponse = JSON.parse(body);
				    if(req.authleteResponse.responseContent){
					req.authleteResponse.responseContent = JSON.parse(req.authleteResponse.responseContent);
				    }
				    
				    if(chainResponse){
					next();
				    } else {
					res.json(req.authleteResponse.responseContent);
					res.end();
				    }})

			    }).on('error', (e) => {
				res.error(e.responseContent);
			    });
	
	authleteRequest.write(data);
	
	
    },
    
};

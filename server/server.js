//

// Server Config
var serverConf = global.serverConf = {};

var Path = require('path'),
	HTTP = require('http'),
	File = require('fs'),
	Util = require('util'),
	
	serverPort = 81,
	appPath = serverConf.appPath = Path.join(Path.dirname(__filename), '../app'),
	staticPath = serverConf.staticPath = Path.join(Path.dirname(__filename), '../app/static'),
	serverPath = serverConf.serverPath = __dirname,
	cachePath = serverConf.cachePath = __dirname + '/cache',
	
	devMode = serverConf.devMode = true,
	silentErrors = false,
	
	paperboy = require('paperboy'),
	loadHTML = require('template'),
	Errors = require('./misc/errors'),
	errorPage = require('error-page').setErrors(Errors);

var manualRoute = {
	// Used for index
	'^/(index\.html)?$': function (res, req) {
		req.url = '/static' + req.url;
		staticResponse(res, req);
	},
	
	'^/static': function (req, res) {
		req.url = req.url.replace(new RegExp('^/static'), '');
		staticResponse(req, res);
	}
};

function staticResponse (req, res) {
  var ip = req.connection.remoteAddress;
  return paperboy
	.deliver(staticPath, req, res)
	.addHeader('Expires', 300)
	.addHeader('X-PaperRoute', 'Node')
	.before(function () {
		// log('req: ', req.url, ip, req.method);
	})
	.after(function(statCode) {
	  // log(statCode, req.url, ip);
	  // console.log('=================== Request Ended ===================');
	})
	.error(function(statCode, msg) {
		if (devMode)
			Util.log(statCode + ' - ' + req.url);
		errorPage(statCode, req, res, msg);
	})
	.otherwise(function(err) {
		if (devMode)
			Util.log('404 - ' + req.url);
		errorPage(404, req, res, err);
	});
}

if (silentErrors) {
	process.on('uncaughtException', function(err) {
		console.log('======================= uncought :(');
		console.log(err, typeof err);
	});
}

var openRequests = [];
HTTP.createServer(function(req, res) {
	var ended = false;
	req.on('end', function() {
		ended = req.ended = true;
	});
	req.on('close', function() {
		ended = req.closed = true;
	});
	
	if (devMode)
		Util.log('Request - ' + req.url);
	
	res.setHeader('custom-server-by', 'Eli Sklar');
	res.setHeader('server', 'Nodejs v' + process.versions.node + ' / V8 v' + process.versions.v8);
	for (var i in manualRoute) {
		var responder = manualRoute[i],
		match = req.url.match(new RegExp(i, 'i'));
		if (match) {
			if (!responder.call({query: match}, req, res)) {
				ended = true;
				return;
			}
		}
	}
	if (!ended) {
		// Check if file exists under /static/
		var filename = appPath + '/static' + req.url,
			fileExists = Path.existsSync(filename),
			isFile = fileExists ? File.statSync(filename).isFile() : false;
		
		if (isFile) {
			req.url = '/static' + req.url;
			staticResponse(req, res);
		} else {
			// var toConsole = Util.format('Server 404 error to: `%s` using URL: `%s`\nRequest Headers: %j', req.connection.remoteAddress, req.url, req.headers);
			var toConsole = Util.format('Server 404 error to: `%s` requested URL: `%s`', req.connection.remoteAddress, req.url);
		  	Util.log(toConsole);
		  	errorPage(404, req, res);
		}
	}
}).listen(serverPort, function() {
	console.log('Server running at http://localhost:'+serverPort);
});

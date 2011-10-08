//



var App = require('./app.js') || {conf: {}},
	Path = require('path'),
	File = require('fs'),
	HTTP = require('http'),
	Url = require('url'),
	Util = require('util'),
	_ = require('underscore'),
	
	paperboy = require('paperboy'),
	loadHTML = require('template'),
	Errors = require('./misc/errors'),
	errorPage = require('error-page').setErrors(Errors);
	
// Server Config
var serverConf = global.serverConf = {};
	serverConf.devMode = true;
	serverConf.port = 81;
	serverConf.serverPath = __dirname;
	serverConf.appPath = Path.join(__dirname, '../app');
	serverConf.staticPath = Path.join(serverConf.appPath, '/static');
	serverConf.cachePath = __dirname + '/cache';
	serverConf.silentErrors = false;

if (typeof App != 'undefined' && typeof App.settings == 'object') {
	_.extend(serverConf, App.settings);
	_.extend(App.settings, serverConf);
}
	

var manualRoute = {
	// Used for index
	'^/(index\.html)?$': function (res, req) {
		console.log('let searching commence');
		req.url = '/static' + req.url;
		staticResponse(res, req);
		return true;
	},
	
	'^/static': function (req, res) {
		req.url = req.url.replace(new RegExp('^/static'), '');
		staticResponse(req, res);
		return true;
	}
};

if (typeof App != 'undefined' && App) {
	_.extend(manualRoute, App.routes);
}

function staticResponse (req, res) {
  var ip = req.connection.remoteAddress;
  return paperboy
	.deliver(serverConf.staticPath, req, res)
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
		if (serverConf.devMode)
			Util.log(statCode + ' - ' + req.url);
		errorPage(statCode, req, res, msg);
	})
	.otherwise(function(err) {
		if (serverConf.devMode)
			Util.log('404 - ' + req.url);
		errorPage(404, req, res, err);
	});
}

if (serverConf.silentErrors) {
	process.on('uncaughtException', function(err) {
		console.log('======================= uncought :(');
		console.log(err, typeof err);
	});
}

var openRequests = [];
try {
	HTTP.createServer(function(req, res) {
		// console.log(req);
		var ended = false;
		req.on('end', function() {
			req.ended = true;
		});
		req.on('close', function() {
			req.closed = ended = true;
		});
		
		if (serverConf.devMode)
			Util.log('Request - ' + req.url);
		
		res.setHeader('custom-server-by', 'Eli Sklar');
		res.setHeader('server', 'Nodejs v' + process.versions.node + ' / V8 v' + process.versions.v8);
		
		// process.nextTick(function() {
			for (var i in manualRoute) {
				var responder = manualRoute[i],
				match = req.url.match(new RegExp(i, 'i'));
				if (match) {
					try {
						var responderThis = {
							query: match,
							request: req,
							response: res
						};
						if (responder.call(responderThis, req, res)) {
							ended = true;
							break;
						}
					} catch (err) {
						console.log(err);
					}
				}
			}
			process.nextTick(function(){
				if (!ended) staticResponse(req, res);
			});
		// });
	}).listen(serverConf.port, function() {
		console.log('Server running at http://localhost:'+serverConf.port);
	});
} catch (err) {
	console.log('Unable to start server (used port?)');
}
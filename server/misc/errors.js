// Company 360 Errors and such
var loadHTML = require('template'),
	Query = require('querystring'),
	Path = require('path'),
	File = require('fs'),
	Util = require('util');

var genericErrorMessage = "Error %d %s",
	tiles;



function generateHTMLError (errorCode, error, req, extra) {
	var filename = serverConf.appPath + '/templates/errors/' + errorCode + '.html',
		fileExists = Path.existsSync(filename),
		data;
	
	if (!fileExists) {
		filename = serverConf.appPath + '/templates/errors/other.html';
		fileExists = Path.existsSync(filename);
	}
	
	
	if (!tiles) {
		 tiles = File.readdirSync(serverConf.appPath + '/static/images/dark-tiles/');
	}
	
	var tile = tiles[Math.floor(Math.random()*tiles.length)];

	if (fileExists && File.statSync(filename).isFile()) {
		data = loadHTML(filename, {
			tile: Query.escape(tile), 
			errorCode: errorCode,
			reasonPhrase: error.reasonPhrase,
			requestURL: req.url,
			extra: extra,
			devMode: global.serverConf.devMode,
			process: global.serverConf.devMode ? JSON.stringify({}) : 'false'
		});
	} else
		data = Util.format(genericErrorMessage, errorCode, error.reasonPhrase);

	return data;
}


var Errors = {
	404: {
		reasonPhrase: "Error: Request not regonized",
		headers: {'Content-Type': 'text/html'},
		data: generateHTMLError
	},
	404.1: {
		reasonPhrase: "Error: Module not found",
		headers: {'Content-Type': 'text/html'},
		data: generateHTMLError
	},
	404.2: {
		reasonPhrase: "Error: Section not found",
		headers: {'Content-Type': 'text/html'},
		data: generateHTMLError
	},
	500: {
		reasonPhrase: "Error: Internal Server Error",
		headers: {'Content-Type': 'text/html'},
		data: generateHTMLError
	},
	500.1: {
		reasonPhrase: "Error: Server Error",
		headers: {'Content-Type': 'text/html'},
		data: generateHTMLError
	},
	500.2: {
		reasonPhrase: "Error: Template Error",
		headers: {'Content-Type': 'text/html'},
		data: generateHTMLError
	},
	501: {
		reasonPhrase: "Error: Not Implemented",
		headers: {'Content-Type': 'text/html'},
		data: generateHTMLError
	},
	512: {
		reasonPhrase: "Error: Unable to load config file",
		headers: {'Content-Type': 'text/html'},
		data: generateHTMLError
	}
};

module.exports = Errors;
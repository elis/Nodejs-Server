var App = module.exports = {};

var Path = require('path'),
	File = require('fs'),
	HTTP = require('http'),
	Url = require('url'),
	Util = require('util'),
	Errors = require('./misc/errors'),
	errorPage = require('error-page').setErrors(Errors),
	Cache = require('./misc/simpleCache'),
	_ = require('underscore'),
	AppModule = require('app.module'),
	AppUtils = require('app.utils'),
	loadHTML = require('template');

_.extend(App, AppUtils);
App.App = true;
App.modules = {}; // Used to store loaded modules
App.Module = function (moduleId, req, res) {
	return AppModule(moduleId, req, res, App);
}
App.settings = {
	port: 91
}

App.routes = {
	'^/(.*)': function (req, res) {
		var purl = req.purl = Url.parse(req.url, true);
	},
	'^/search(/([^/]+)/?(.*))?$': function (req, res) {
		var query = {
			conf: 'search',
			search: this.query[2],
			sectionId: this.query[3],
			moduleId: this.query[4],
			sectionName: this.query[5],
			rest: this.query[6]
		};
		
		return App.loadView(query, req, res);
	},
	
	// Async Requests
	'^/sectionFrame/((\\w+)/(\\w+))/?(.*)$': function (req, res) {
		return false;
		var query = req.query = {
			sectionId: this.query[1],
			moduleId: this.query[2],
			sectionName: this.query[3],
			permid: this.query[4]
		};
		
		if (!App.isSection(query.sectionId))
			return App.errorPage(404.1, req, res, query.sectionId);
					
		return App.loadSection(query.moduleId, query.sectionName, req, res);
	}
}





/*    dP          .8888b                   dP   dP    a88888b.                   .8888b oo          
      88          88   "                   88   88   d8'   `88                   88   "             
.d888b88 .d8888b. 88aaa  .d8888b. dP    dP 88 d8888P 88        .d8888b. 88d888b. 88aaa  dP .d8888b. 
88'  `88 88ooood8 88     88'  `88 88    88 88   88   88        88'  `88 88'  `88 88     88 88'  `88 
88.  .88 88.  ... 88     88.  .88 88.  .88 88   88   Y8.   .88 88.  .88 88    88 88     88 88.  .88 
`88888P8 `88888P' dP     `88888P8 `88888P' dP   dP    Y88888P' `88888P' dP    dP dP     dP `8888P88 
                                                                                                .88 
                                                                                            d8888P  
*/
App.defaultLayout = {
	"leftbar": true, // Show/hide the leftbar
	"rightbar": false, // Show/hide the rightbar
	"contentColumns": 2, // How many content columns to display [1,2,3,4,6,12]
	"columns": [ // For every column in content add 1 array with module names
		["eikon", "tikon", "sicon"],
		["eli", "saar", "clearforst"],
		["p", "a", "d"]
	]
};

App.errorPage = errorPage;





/*                         dP dP     dP oo                     
88                         88 88     88                        
88 .d8888b. .d8888b. .d888b88 88    .8P dP .d8888b. dP  dP  dP 
88 88'  `88 88'  `88 88'  `88 88    d8' 88 88ooood8 88  88  88 
88 88.  .88 88.  .88 88.  .88 88  .d8P  88 88.  ... 88.88b.88' 
dP `88888P' `88888P8 `88888P8 888888'   dP `88888P' 8888P Y8P  
                                                               

Load view based on query
query = {
			conf: {string} Config Name
			search: {string} What we're searching for
			sectionId: {string} Section ID ("moduleId/sectionName")
			moduleId: {string} Module ID
			sectionName: {string} Section Name
			rest: {string} The rest of the URI
		}
	@param {object} Query (see above)
	@param {http.serverRequest}
	@param {http.serverResponse}
*/
	
App.loadView = function (query, Request, Response) {
	var config = App.loadConfig(query.conf);
	App.settings.appURL = '/' + query.conf + '/' + query.search;
	
	if (!App.isConfig(query.conf))
		return App.errorPage(404, Request, Response);
		
	try {
		var data = App.generateView(query, Request, Response);
		
		if (data) {
			Response.writeHead(200, {
				'Content-Length': data.length,
				'Content-Type': 'text/html'
			});
			
			Response.end(data);
			return true;
		}
	} catch (err) {
		App.errorPage(500, Request, Response, err);
		return true;
	}
};





/*                         dP .d88888b                      dP   oo                   
88                         88 88.    "'                     88                        
88 .d8888b. .d8888b. .d888b88 `Y88888b. .d8888b. .d8888b. d8888P dP .d8888b. 88d888b. 
88 88'  `88 88'  `88 88'  `88       `8b 88ooood8 88'  `""   88   88 88'  `88 88'  `88 
88 88.  .88 88.  .88 88.  .88 d8'   .8P 88.  ... 88.  ...   88   88 88.  .88 88    88 
dP `88888P' `88888P8 `88888P8  Y88888P  `88888P' `88888P'   dP   dP `88888P' dP    dP 
                                                                                      
                                                                                      

Load a section of a module asynchronously
	@param {string} 
	@param {string}
	@param {http.ServerRequest}
	@param {http.ServerResult}
	@return {bool}
*/
App.loadSection = function (moduleId, sectionName, req, res) {
	var Module = App.Module(moduleId, req, res, App);
	if (!Module)
		return App.errorPage(404.1, req, res, moduleId);
	
	var section = Module.sections[sectionName] || Module.links[sectionName] || false;
	
	if (section) {
		if (section.request && typeof section.request == 'function') {
			return section.request.call(section, req, res);
		} else if (section.section) {
			var filename = App.settings.appPath + '/modules/' + moduleId + '/sections/' + sectionName + '.html';
			var html = loadHTML(filename);
			res.end(html);
			return true;
		}
		App.errorPage(501, req, res);
	} else {
		App.errorPage(404.2, req, res, sectionName);
	}
	return true;
}




/*                         dP  a88888b.                   .8888b oo          
88                         88 d8'   `88                   88   "             
88 .d8888b. .d8888b. .d888b88 88        .d8888b. 88d888b. 88aaa  dP .d8888b. 
88 88'  `88 88'  `88 88'  `88 88        88'  `88 88'  `88 88     88 88'  `88 
88 88.  .88 88.  .88 88.  .88 Y8.   .88 88.  .88 88    88 88     88 88.  .88 
dP `88888P' `88888P8 `88888P8  Y88888P' `88888P' dP    dP dP     dP `8888P88 
																		 .88 
																	 d8888P  
 
Load configuration file
	@param {string} config name - omit .js suffix
*/
App.loadConfig = function (confName, req, res) {
	var filename = App.settings.appPath + '/conf/' + confName + '.json',
		config = App.defaultConfig,
		raw = '';
	
	if (!App.isConfig(confName)) {
		Util.log('Config `' + confName + '` was not found.\nSearching for '+filename);
		return false;
	}
	try {
		raw = File.readFileSync(filename).toString();
		config = JSON.parse(raw);
	} catch (e) {
		Util.log('Unable to read or parse configuration file');
	}
	return config;
};




/*                         dP     dP oo                     
						   88     88                        
.d8888b. .d8888b. 88d888b. 88    .8P dP .d8888b. dP  dP  dP 
88'  `88 88ooood8 88'  `88 88    d8' 88 88ooood8 88  88  88 
88.  .88 88.  ... 88    88 88  .d8P  88 88.  ... 88.88b.88' 
`8888P88 `88888P' dP    dP 888888'   dP `88888P' 8888P Y8P  
	 .88                                                    
 d8888P                                                     

Generate a view (HTML) based on a config file
	@param {object} configuration object
	@param {http.serverRequest}
	@param {http.serverResponse}
	@param {object} the query object
	@return {string} parsed HTML file
*/
App.generateView = function (query, Request, Response) {
	var layout = App.loadConfig(query.conf);
	if (!layout) return "Layout is required";
	
	var content = '',
		templates = App.settings.appPath + '/templates',
		stat = App.settings.staticPath + '/';
	
	var sharedStuff = {
		title: new Date().toLocaleTimeString(), 
		appURL: App.settings.appURL,
		query: query
	}
	
	var headerStuff = _.extend({}, sharedStuff, {
		title: new Date().toLocaleTimeString(), 
		leftbar: !!layout.leftbar, 
		rightbar: !!layout.rightbar
	});
	var header = loadHTML(templates + '/header.html', headerStuff);
	
	
	// Proccess columns & Modules
	var columnSize = 12 / layout.contentColumns,
		columnsData = '',
		colNum;
	
	// Columns
	for (colNum = 0; colNum < layout.contentColumns; ++colNum) {
		var column = layout.columns[colNum],
			columnData = '',
			modulesCount = layout.columns[colNum].length;
		
		// Modules
		var moduleNum;
		for (moduleNum = 0; moduleNum < modulesCount; ++moduleNum) {
			var moduleName = column[moduleNum],
				Module = App.Module(App.isModule(moduleName) ? moduleName : 'dummy', App);
			
			var moduleData = App.generateModule(Module);
			
			columnData += moduleData;
		}
		
		columnsData += loadHTML(templates + '/grid-column.html', {
			columnSize: columnSize,
			extraClass: colNum == 0 ? 'alpha' : (colNum+1 == layout.contentColumns ? 'omega' : ''),
			columnData: columnData
		});
	}
	
	var contentStuff = _.extend({}, sharedStuff, {
		columnSize: columnSize,
		columnsData: columnsData
	});
	var content = loadHTML(templates + '/content.html', contentStuff);
	
	var sidebarStuff = _.extend({}, sharedStuff, {
		id: 'sidebar', 
		modules: App.modules
	});
	
	var sidebars = '';
	if (layout.leftbar)
		sidebars += loadHTML(templates + '/sidebar.html', _.extend({}, sidebarStuff, {id: 'sidebar'}));
	if (layout.rightbar)
		sidebars += loadHTML(templates + '/sidebar.html', _.extend({}, sidebarStuff, {id: 'otherbar'}));
	
	var footer = loadHTML(templates + '/footer.html', _.extend({}, sharedStuff));
	
	return header + sidebars + content + footer; // (header + sidebars + content + footer);
};




/*                         8888ba.88ba                 dP          dP          
						   88  `8b  `8b                88          88          
.d8888b. .d8888b. 88d888b. 88   88   88 .d8888b. .d888b88 dP    dP 88 .d8888b. 
88'  `88 88ooood8 88'  `88 88   88   88 88'  `88 88'  `88 88    88 88 88ooood8 
88.  .88 88.  ... 88    88 88   88   88 88.  .88 88.  .88 88.  .88 88 88.  ... 
`8888P88 `88888P' dP    dP dP   dP   dP `88888P' `88888P8 `88888P' dP `88888P' 
	 .88                                                                       
 d8888P                                                                        

Generate a module
	@param {string} module to generate
	@param {object} module configuration
	@return {string} parsed HTML
*/
App.generateModule = function (Module) {
	if (typeof Module == 'string')
		Module = App.Module(Module, App);
	
	if (!Module || !Module.id)
		return 'Unable to locate module ' + Module;
	
	var content = '',
		passed = {
			Module: Module
		};
	
	if (!Module.hasHTML)
		return 'Unable to locate HTML module ' + Module.id;
	var html = loadHTML(Module.path + '/module.html', passed);
	
	if (Module.hasClient) {
		var clientScriptData = loadHTML(Module.path + '/client.js', passed);
		html += "<script type='text/javascript'>"+clientScriptData+"</script>";
	}	
	
	return html;
};





/*                         dP        dP .d88888b   .88888.  888888ba   88888888b oo dP          
88                         88        88 88.    "' d8'   `8b 88    `8b  88           88          
88 .d8888b. .d8888b. .d888b88        88 `Y88888b. 88     88 88     88 a88aaaa    dP 88 .d8888b. 
88 88'  `88 88'  `88 88'  `88        88       `8b 88     88 88     88  88        88 88 88ooood8 
88 88.  .88 88.  .88 88.  .88 88.  .d8P d8'   .8P Y8.   .8P 88     88  88        88 88 88.  ... 
dP `88888P' `88888P8 `88888P8  `Y8888'   Y88888P   `8888P'  dP     dP  dP        dP dP `88888P' 
                                                                                                
                                                                                                


Load JSON data from a file
	@param {string} File to use to load data from
	@return {object|bool} On success will return the parsed JSON object on failure will return false
*/
App.loadJSONFile = function (filename) {
	var fileExists = Path.existsSync(filename),
		raw = '';
	
	if (!fileExists) {
		console.log('no file', filename);
		return false;
	}
		
	try {
		raw = File.readFileSync(filename).toString();
		parsed = JSON.parse(raw);
	} catch (e) {
		console.log('error', e);
		return false;
	}
	
	return parsed;
}


/*     dP   dP   oo dP oo   dP   oo                   
88     88   88      88      88                        
88     88 d8888P dP 88 dP d8888P dP .d8888b. .d8888b. 
88     88   88   88 88 88   88   88 88ooood8 Y8ooooo. 
Y8.   .8P   88   88 88 88   88   88 88.  ...       88 
`Y88888P'   dP   dP dP dP   dP   dP `88888P' `88888P' 
                                                      
                                                      
Various Utilities and other useful functions
*/

// Check if a given configuration exists (app/conf/{configName}.json)
App.isConfig = function (configName) {
	var configFilename = App.settings.appPath + '/conf/' + configName + '.json';
	return App.isFile(configFilename);
};

// Check if a given module exists (app/modules/{moduleName})
App.isModule = function (moduleName) {
	var moduleDir = App.settings.appPath + '/modules/' + moduleName;
	return App.isDir(moduleDir);
};

App.isSection = function (sectionId, moduleId) {
	var parsed = sectionId.split('/'),
		sectionName = parsed.length > 1 ? parsed[1] : sectionId,
		moduleId = moduleId || parsed[0],
		Module = App.Module(moduleId);
	
	return (Module && Module.sections.hasOwnProperty(sectionName));
};

// Check if module has server-side script (app/modules/{moduleName}/server.js)
App.moduleHasServer = function (moduleName) {
	var serverFilename = App.settings.appPath + '/modules/' + moduleName + '/server.js';
	return (App.isModule(moduleName) && App.isFile(serverFilename));
};

// Check if module has client-side script (app/modules/{moduleName}/client.js)
App.moduleHasClient = function (moduleName) {
	var clientFilename = App.settings.appPath + '/modules/' + moduleName + '/client.js';
	return (App.isModule(moduleName) && App.isFile(clientFilename));
};

// Check if module has module html file (app/modules/{moduleName}/module.html)
App.moduleHasHTML = function (moduleName) {
	var htmlFilename = App.settings.appPath + '/modules/' + moduleName + '/module.html';
	return (App.isModule(moduleName) && App.isFile(htmlFilename));
};

// Check if module has static section html files (app/modules/{moduleName}/sections)
App.moduleHasSections = function (moduleName) {
	var sectionsDir = App.settings.appPath + '/modules/' + moduleName + '/sections';
	return (App.isModule(moduleName) && App.isDir(sectionsDir));
};

App.setCachePath = (function() {
	var setCachePath = function (cachePath) {
		App.settings.cachePath = cachePath;
		
		if (!Cache.initialized)
			Cache = Cache(cachePath);
	}
	process.nextTick(function() {
		if (App.settings.cachePath) {
			setCachePath(App.settings.cahePath);
		}
	});
	
	return setCachePath;
}());



module.exports = App;
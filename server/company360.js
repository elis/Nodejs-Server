// Company 360 - ClearForest
var C360 = module.exports = {};

var VM = require('vm'),
	Path = require('path'),
	File = require('fs'),
	Util = require('util'),
	Cache = require('./misc/simpleCache'),
	Bake = require('bake'),
	loadHTML = require('./misc/template'),
	Errors = C360.Errors = require('./misc/errors');





/*    dP          .8888b                   dP   dP    a88888b.                   .8888b oo          
      88          88   "                   88   88   d8'   `88                   88   "             
.d888b88 .d8888b. 88aaa  .d8888b. dP    dP 88 d8888P 88        .d8888b. 88d888b. 88aaa  dP .d8888b. 
88'  `88 88ooood8 88     88'  `88 88    88 88   88   88        88'  `88 88'  `88 88     88 88'  `88 
88.  .88 88.  ... 88     88.  .88 88.  .88 88   88   Y8.   .88 88.  .88 88    88 88     88 88.  .88 
`88888P8 `88888P' dP     `88888P8 `88888P' dP   dP    Y88888P' `88888P' dP    dP dP     dP `8888P88 
                                                                                                .88 
                                                                                            d8888P  
*/
C360.defaultConfig = {
	"leftbar": true, // Show/hide the leftbar
	"rightbar": false, // Show/hide the rightbar
	"contentColumns": 2, // How many content columns to display [1,2,3,4,6,12]
	"columns": [ // For every column in content add 1 array with module names
		["eikon", "tikon", "sicon"],
		["eli", "saar", "clearforst"],
		["p", "a", "d"]
	]
};





/*                         dP dP                                              dP   
88                         88 88                                              88   
88 .d8888b. .d8888b. .d888b88 88        .d8888b. dP    dP .d8888b. dP    dP d8888P 
88 88'  `88 88'  `88 88'  `88 88        88'  `88 88    88 88'  `88 88    88   88   
88 88.  .88 88.  .88 88.  .88 88        88.  .88 88.  .88 88.  .88 88.  .88   88   
dP `88888P' `88888P8 `88888P8 88888888P `88888P8 `8888P88 `88888P' `88888P'   dP   
													  .88                          
												  d8888P                           

Load and output a predefined layout based on a config file
	@param {string} the config name to use (omit .js suffix)
	@param {http.ServerRequest}
	@param {http.ServerResponse}
*/
C360.loadLayout = function (confName, req, res) {
	var config = C360.loadConfig(confName);
	
	if (!config) 
		return C360.errorPage(512, req, res, confName); //res.end('Unable to load layout configuration file ' + confName);
	
	var data = C360.generateView(config, req, res);
	
	res.writeHead(200, {
		'Content-Length': data.length,
		'Content-Type': 'text/html'
	});
	
	res.end(data);
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
C360.loadSection = function (moduleId, sectionName, req, res) {
	var Module = C360.Module(moduleId, req, res);
	if (!Module)
		C360.errorPage(404.1, req, res, moduleId);
	
	var section = Module.sections[sectionName] || false;
	
	if (section) {
		if (section.request && typeof section.request == 'function') {
			return section.request(req, res);
		} else if (section.section) {
			
		}
		console.log('\n\n\nSection requested: ', Module.links[sectionName]);
		C360.errorPage(501, req, res);
		return false;
	} else {
		C360.errorPage(404.2, req, res, sectionName);
	}
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
C360.loadConfig = function (confName, req, res) {
	var filename = C360.appPath + '/conf/' + confName + '.json',
		fileExists = Path.existsSync(filename),
		config = C360.defaultConfig,
		raw = '';
	
	if (!fileExists) {
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
	@return {string} parsed HTML file
*/
C360.generateView = function (conf, req, res) {
	if (!conf)
		return 'Need config.';
		
	var content = '',
		base = C360.appPath + '/static/';
	
	var header = loadHTML(base + 'header.html', {
		appURL: C360.appURL,
		mainclass: (conf.rightbar ? 'rightbar' : '')+' '+(conf.leftbar ? 'leftbar' : '')
	});
		
	// Proccess columns & Modules
	var columnSize = 12 / conf.contentColumns,
		columnsData = '',
		colNum;
	
	// Columns
	for (colNum = 0; colNum < conf.contentColumns; ++colNum) {
		var column = conf.columns[colNum],
			columnData = '',
			modulesCount = conf.columns[colNum].length;
		
		// Modules
		var moduleNum;
		for (moduleNum = 0; moduleNum < modulesCount; ++moduleNum) {
			var moduleName = column[moduleNum],
				moduleData = C360.generateModule(moduleName, conf, req, res);
			
			columnData += moduleData;
			C360.Module(moduleName);
		}
		
		columnsData += loadHTML(base + 'grid-column.html', {
			'column-size': columnSize,
			'extra-class': colNum == 0 ? 'alpha' : (colNum+1 == conf.contentColumns ? 'omega' : ''),
			'data': columnData
		});
	}
	
	content = loadHTML(base + 'content.html', {
		grid: columnsData
	});
	
	// End columns/modules/content proccessing
	var sidebars = '';
	if (conf.leftbar)
		sidebars += loadHTML(base + 'left-sidebar.html');
	if (conf.rightbar)
		sidebars += loadHTML(base + 'right-sidebar.html');
		
	var footer = loadHTML(base + 'footer.html');
	
	content = header + sidebars + content + footer;
	return content;
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
C360.generateModule = function (moduleName, conf, req, res) {
	var Module = C360.Module(moduleName) || (conf.devmode ? C360.Module('dummy') : false);
	
	if (!Module)
		return 'Unable to locate module ' + moduleName;
	
	var content = '';
	
	if (!Module.hasHTML)
		return 'Unable to locate HTML module ' + moduleName;
	var html = loadHTML(Module.path + '/module.html', Module);
	
	if (Module.hasClient) {
		var passed = {};
		var clientScriptData = loadHTML(Module.path + '/client.js', passed);
		html += "<script type='text/javascript'>"+clientScriptData+"</script>";
	}	
	
	return html;
};






/*                                            888888ba                             
											  88    `8b                            
.d8888b. 88d888b. 88d888b. .d8888b. 88d888b. a88aaaa8P' .d8888b. .d8888b. .d8888b. 
88ooood8 88'  `88 88'  `88 88'  `88 88'  `88  88        88'  `88 88'  `88 88ooood8 
88.  ... 88       88       88.  .88 88        88        88.  .88 88.  .88 88.  ... 
`88888P' dP       dP       `88888P' dP        dP        `88888P8 `8888P88 `88888P' 
																	  .88          
																  d8888P           
Generate Error Page
	@param {int, stirng} error code - see misc/errors.js
	@param {http.ServerRequest}
	@param {http.ServerResponse}
*/
C360.errorPage = function (errorCode, req, res, extra) {
	var error = Errors[errorCode] || error[500],
		data = isFunc(error.data) ? error.data.call(C360, errorCode, error, req, extra) : error.data || '';
	
	if (false) {
		console.log('\n\n^^^^^^^^^^^^^^^^^^ ERROR ^^^^^^^^^^^^^^^^^^');
		Util.log('C360 Error page issue: ' + errorCode);
		console.log(error.reasonPhrase);
		if (extra)
			console.log(extra);
		
		console.log('___________________________________________\n');
	}
	if (!req.ended) {
		res.writeHead(errorCode, error.reasonPhrase, error.headers);
		res.end(data);
	}
};





/*88ba.88ba                 dP          dP          
88  `8b  `8b                88          88          
88   88   88 .d8888b. .d888b88 dP    dP 88 .d8888b. 
88   88   88 88'  `88 88'  `88 88    88 88 88ooood8 
88   88   88 88.  .88 88.  .88 88.  .88 88 88.  ... 
dP   dP   dP `88888P' `88888P8 `88888P' dP `88888P' 
                                                    
                                                                                                                                           
*/
function C360Module (moduleName, req, res) {
	if (this instanceof C360Module) return new C360Module(moduleName);
	if (typeof moduleName != 'string' || moduleName.length < 1 || !C360.isModule(moduleName))
		return false;
	
	if (C360.modules.hasOwnProperty(moduleName))
		return C360.modules[moduleName];
	
	var self = {},
		moduleDir = C360.appPath + '/modules/' + moduleName;
	
	self.id = moduleName;
	self.path = path = moduleDir;
	self.baseURL = C360.appURL;
	self.cachePath = C360.cachePath;
	self.hasServer = C360.moduleHasServer(moduleName);
	self.hasClient = C360.moduleHasClient(moduleName);
	self.hasHTML = C360.moduleHasHTML(moduleName);
	self.hasSections = C360.moduleHasSections(moduleName);
	self.sections = (function() {
		if (!self.hasSections)
			return false;
			
		var files = File.readdirSync(self.path + '/sections/'),
			i, sections = [];
		if (files) {
			for (i in files) {
				var file = files[i],
					ext = Path.extname(file);
				if (ext && ext == '.html' && isFile(self.path + '/sections/' + file)) {
					sections.push(Path.basename(file, '.html'));
				}
			}
		}
		return sections;
	}());
	
	
	// Server Script Parsing
	if (self.hasServer) {
		var filename = self.path + '/server.js',
			sandbox = {
				Module: self,
				Util: Util,
				Cache: Cache,
				errorPage: C360.errorPage,
				console: console,
				require: require,
				process: process
			};
		
		function loadServerScript (sandbox) {
			var serverScriptData = File.readFileSync(self.path + '/server.js');
			
			try {
				VM.runInNewContext(serverScriptData, sandbox);
			}
			catch (err) {
				var errorPhrase = "Error Parsing module server script" + 
					"\n	ModuleID: " + moduleName + 
					"\n	Exception Error: " + err;
				if (req && (!req.ended || !req.closed)) {
					if (global.serverConf.devMode)
						C360.errorPage(500.1, req, res, errorPhrase);
					else
						C360.errorPage(500, req, res);
				}
				return false;
			}
		}
		
		/*
			Unsuppoerted on Windows
			Not tested on other platforms
			
			Node: v0.5.8
			Date: 1st Oct 2011
			
		File.watchFile(filename, {}, function (curr, prev) {
			console.log('Rerunning server script for module: ', moduleName);
			loadServerScript(sandbox);
		});
		*/
		
		loadServerScript(sandbox);
	}
	
	C360.modules[moduleName] = self;
	return self;
};

C360.Module = C360Module;
C360.modules = {}; // Used to store loaded modules



C360.isConfig = function (configName) {
	var configFilename = C360.appPath + '/conf/' + configName + '.json';
	return isFile(configFilename);
};
/*
Check if module is existing inside appPath/modules
Please note that this is not optimized for large traffic
	@param {string} module name to check
	@return {bool} true if module exists false
*/
C360.isModule = function (moduleName) {
	var moduleDir = C360.appPath + '/modules/' + moduleName;
	return isDir(moduleDir);
};
C360.moduleHasServer = function (moduleName) {
	var serverFilename = C360.appPath + '/modules/' + moduleName + '/server.js';
	return (C360.isModule(moduleName) && isFile(serverFilename));
};
C360.moduleHasClient = function (moduleName) {
	var clientFilename = C360.appPath + '/modules/' + moduleName + '/client.js';
	return (C360.isModule(moduleName) && isFile(clientFilename));
};
C360.moduleHasHTML = function (moduleName) {
	var htmlFilename = C360.appPath + '/modules/' + moduleName + '/module.html';
	return (C360.isModule(moduleName) && isFile(htmlFilename));
};
C360.moduleHasSections = function (moduleName) {
	var sectionsDir = C360.appPath + '/modules/' + moduleName + '/sections';
	return (C360.isModule(moduleName) && isDir(sectionsDir));
};

C360.setCachePath = function (cachePath) {
	C360.cachePath = cachePath;
	
	if (!Cache.initialized)
		Cache = Cache(cachePath);
}


function isFunc (func) {
	return typeof func == 'function';
}
function isDir (dirname) {
	var dirExists = Path.existsSync(dirname);
		dirIsDir = dirExists ? File.statSync(dirname).isDirectory() : false;
	return dirIsDir;
}
function isFile (filename) {
	var fileExists = Path.existsSync(filename),
		file = fileExists ? File.statSync(filename).isFile() : false;
	return file;
}

var _ = require('underscore');

var simpleCache = function(options) {
	var self = {
		get: cacheGet,
		set: cacheSet,
		flush: cacheFlush,
		del: cacheDelete,
		cachePath: __dirname,
		initialized: true,
		dataEncoding: 'base64',
		defaultTTL: 60*30 // 5 Minutes
	};
	
	if (typeof options == 'object') {
		_.extend(self, options)
	}
	
	var cache = {},
		File = require('fs'),
		cacheFile = self.cachePath + '/simpleCache.json'; // 5 Minutes
	
	
	File.readFile(cacheFile, function (err, data) {
		data = data ? data.toString() : false;
		if (typeof data == 'string' && data.length > 0) {
			console.log('\t\t[ Loaded cache file', cacheFile, '\n\t\t[ Cache length:', data.length);
			try {
				cache = JSON.parse(data);
			} catch (error) {
				console.log('unable to parse cache file');
			}
		}
	});
	
	function CacheObj (name, data, expire) {
		var self = {
			name: name,
			data: data,
			expire: expire
		};
		return self;
	}
	
	function cacheGet (name) {
		var item = cache[name];
		// console.log(cache);
		if (item && item.expire) {
			var now = getTimeSeconds();
			if (item.expire >= now) {
				return decode(item.data);
			} else {
				cacheDelete(name);
			}
		}
		return false;
	}
	
	function cacheSet (name, data, ttl) {
		if (typeof name !== 'string')
			throw "Cache name must be a string";
		
		if (typeof data !== 'string')
			throw "Cache data must be a string";
		
		if (typeof ttl == 'undefined')
			ttl = self.defaultTTL;
		else if (typeof ttl !== 'number')
			throw "Cache ttl must be a number";
			
		var expire = ttl + getTimeSeconds();
		
		cache[name] = CacheObj(name, encode(data), expire);
		updateCacheFile();
	}
	
	function cacheDelete (name) {
		delete cache[name];
		updateCacheFile();
	}
	function cacheFlush () {
		cache = {};
	}
	
	function updateCacheFile () {
		var data = JSON.stringify(cache);
		File.writeFile(cacheFile, data, function (err) {
			if (err) 
				console.log('Cache report: ' + err);
		});
	}
	
	function getTimeSeconds () {
		return Math.floor(new Date().getTime()/1000);
	}
	
	
	function encode (data) {
		if (self.dataEncoding) {
			var buffer = new Buffer(data, 'utf8');
			return buffer.toString(self.dataEncoding);
		}
		return data;
	}
	
	function decode (data) {
		if (self.dataEncoding) {
			var buffer = new Buffer(data, self.dataEncoding);
			return buffer.toString('utf8');
		}
		return data;
	}
	
	return self;
};

simpleCache.initialized = false;

module.exports = simpleCache;
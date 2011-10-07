var C360 = window.C360 = {};

function Section (el, sectionId) {
	if (!(this instanceof Section)) return new Section(el);

	var self = this,
		$section = self.$section = $(el),
		id = self.id = sectionId || $section.data('section-id'),
		active = self.active = $section.hasClass('active');

	if (!id) {
		throw "Unable to create section. Please provide section ID";
	}
	
	var sectionPath = id.split('/'),
		sectionName = sectionPath[1];
	self.sectionName = sectionName || sectionPath[0];
	self.moduleId = sectionName ? sectionPath[0] : null;
	
	// Find section navigation leading to this and activate them
	self.activate = self.show = function () {
		$('#content .section.active').removeClass('active');
		self.$section.addClass('active');
		self.active = true;
		// $(self).trigger('activate');
	
		$('.nav .i.active').removeClass('active');
		if (self.moduleId)
			$('.nav .i[data-module-id="' + self.moduleId + '"]').addClass('active');
		
		$('.nav .i[data-section-nav="' + self.id + '"]').addClass('active');
		
		
		setTimeout(function(){
			
			var $iframe = $('iframe.full-section', self.$section),
				$loading = $('.loading', self.$section);
			
			$loading.bind('dblclick', function () {
				$loading.hide();
			})
			
			if ($iframe.length > 0) {
				$iframe.bind('load', function () {
					$loading.fadeOut('fast');
				});
				var height = $('#main').height();
				$iframe.attr('height', height).css('height', height + 'px');
				self.$section.css('height', height + 'px');
			}
		}, 50);
	};
	
	self.deactivate = self.hide = function () {
		self.$section.removeClass('active');
		
		self.active = false;
		// $(self).trigger('deactive');
	};
	
	self.destroy = function () {
		self.$section.remove();
		$(self).trigger('destroy');
	};
}

Section.fromString = function (sectionId, data) {
	var $section = $('<div/>')
		.addClass('section clearfix')
		.attr('data-section-id', sectionId)
		.html(data)
		.appendTo('#content .sections');
		
	return new Section($section);
};

Section.fromNode = function (name, $el) {
	var $section = $('<div/>');
	
	$section.addClass('section clearfix')
		.appendTo('#content .sections')
		.attr('data-section-id', name);
	
	$section.append($el);
	
	
	return new Section($section);
};

(function($){
	var sngl;
	
	
	var api = {
			modules: {},
			sections: {},
			activeSection: null,
			appURL: appURL
		},
		History = window.History;
	
	// Bind DomReady
	$(function() {
		findSections();
		bindNavigation();
		registerModules();
	});
	
	api.navigate = function (sectionName, moduleId, forceReload) {
		if (typeof sectionName != 'string' && sectionName.length < 1) {
			
			return false;
		}
		if (moduleId && (typeof moduleId != 'string' || moduleId.length < 1)) {
			
			return;
		}
		
		var sectionId = (moduleId ? moduleId + '/' : '') + sectionName,
			href = api.appURL + '/' + sectionId,
			section = api.sections[sectionId];
		
		// If the section is already loaded into view
		if (section) {
			if (forceReload) {
				alert('forceReload for ' + sectionName + '!');
				section.destroy();
				api.navigate(sectionName, moduleId);
				return;
			}
			
			section.show();
		} else {
			$.ajax({
				url: '/sectionFrame/'+sectionId,
				dataType: 'html',
				success: function (data) {
					var section = api.sections[sectionId] = Section.fromString(sectionId, data);
					section.show();
				},
				error: function (e,r,s) {
					// console.log('error loading ', sectionId, e,r,s);
				}
			});
		}
	}
	
	
	function makeSectionFrame (sectionId) {
		
		var $iframe = $('<iframe/>');
		$iframe
			.addClass('full-section')
			.attr('src', '/sectionFrame/' + sectionId)
			.bind('load', function (){
				$(api).trigger('createdIframe', {sectionId: sectionId, iframe: this});
				
			});
			
		return $iframe;
	}
	
	function registerModules () {
		var $main = $('#content [data-section-id="main"]'),
			$modules = $('[data-module-id]', $main),
			i;
		
		$modules.each(function (i, module) {
			var $module = $(this),
				moduleId = $module.data('module-id');
			
			api.modules[moduleId] = {$module: $module};
		});
	}
	
	/*
	Find existing (loaded) sections and register them
	*/
	function findSections () {
		$('#content [data-section-id]').each(function (count, el) {
			var section = new Section(el);
			
			// if exists continue
			if (api.sections.hasOwnProperty(section.id)) return true;
			else api.sections[section.id] = section;
			
			$(section).bind('destroy', function() {
				delete api.sections[section.id];
			});
		});
	}
	
	/*
	Bind Links (Navigation)
		links in this app work by reading the HTML and applying events to them
		this app is not designed to work without Javascript, so we'll going to
		heavily rely on Javascript support.
	*/
	function bindNavigation () {
		$('[data-section-nav]').live('click', function (event) {
			
			event.preventDefault();
			var $this = $(this),
				sectionId = $this.data('section-nav'),
				path = typeof sectionId == 'string' ? sectionId.split('/') : false,
				moduleId = path && path[1] ? path[0] : null,
				sectionName = path && path[1] ? path[1] : path[0],
				href = api.appURL + '/' + sectionId;
			
			
			if (sectionId) {
				var hstate = {
					sectionId: sectionId,
					moduleId: moduleId, 
					sectionName: sectionName, 
					forceReload: event.ctrlKey
				};
				History.pushState(hstate, null, href);
				event.preventDefault();
			} else {
				event.preventDefault();
			}
			return false;
		});
		
		var $actualActive;
		
		$('.nav .i.sl').live('click', function (event) {
			var $el = $(this),
				$nav = $el.parents('.nav');
				
			event.preventDefault();
			
			$el.addClass('active');
		})
	}
	
	$(window).bind('statechange', function (event) {
		var state = History.getState(),
			data = state.data,
			sectionId = data.sectionId || 'main';
		
		api.navigate(sectionId);
	});
	
	$(window).bind('resize', function (event) {
		return;
		var iframe = $('.section iframe.full-section').each(function (i, el) {
			var $iframe = $(el),
				$section = $el.parents('.section'),
				height = $section.height();
				
			$iframe.attr('height', height);
		});
	});
	C360 = api;
}(jQuery))
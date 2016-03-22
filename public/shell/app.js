"use strict";

(function () {
	var rootApp, rootWindow, win = window.parent;
	while (win) {
		try {
			if (win.App) {
				rootApp = win.App;
				rootWindow = win;
				break;
			}
			if (win == win.parent) break;
			win = win.parent;
		}
		catch (e) {
		}
	}

	var properties;
	if (!rootApp) {
		properties = {
			contextPath: "/",
			serviceUrlPattern: /^\/?service\/[a-z]+/,
			serviceUrlPrefix: "/",
			htmlSuffix: "",
			defaultRouterPath: "/home",
			mainView: "shell/main-channel-bottom",
			loginPath: "/login",
			longPollingTimeout: 0,
			longPollingInterval: 2000,
			safeEffect: false && cola.os.android && !cola.browser.chrome,

			"service.sysInfo": "service/sys/info",
			"service.login": "service/account/login",
			"service.messagePull": "service/message/pull",
			"service.messageSummary": "service/message/summary"
		};
	}

	var App = window.App = {
		channels: [],

		prop: function (key, value) {
			if (rootApp) {
				return rootApp.prop.apply(rootApp, arguments);
			}
			else {
				if (arguments.length == 1) {
					if (typeof key == "string") {
						return properties[key];
					}
					else if (key) {
						for (var p in key) {
							if (key.hasOwnProperty(p)) properties[p] = key[p];
						}
					}
				}
				else {
					properties[key] = value;
				}
			}
		},

		getRootWindow: function () {
			return (rootApp) ? rootWindow : window;
		},

		getPlus: function() {
			return this.getRootWindow().plus;
		},

		router: function(config) {
			if (rootApp) {
				rootApp.router(config);
			}
			else {
				if (!this._prependingRouters) this._prependingRouters = [];
				this._prependingRouters.push(config);
			}
		},

		channel: function(config) {
			config.level = 0;
			this.router(config);
		},

		open: function (path, config) {
			var target, callback, replace, argument;

			if (config) {
				switch (typeof(config)) {
					case "string":
						target = config;
						break;
					case "function":
						callback = config;
						break;
					case "boolean":
						replace = config;
						break;
					case "object":
						target = config.target;
						callback = config.callback;
						argument = config.argument;
						replace = config.replace;
						break;
				}
			}

			if (typeof target == "function") {
				replace = callback;
				callback = target;
				target = null;
			}
			else if (typeof callback == "function") {
				argument = target;
				target = null;
			}

			var rootWindow = this.getRootWindow();
			if (target && target != "_self") {
				rootWindow.open(path, target);
			}
			else if (path.match(/^https*:/)) {
				var domainRegExp = App.prop("domainRegExp");
				if (this.getPlus()) {
					var match = domainRegExp && path.match(domainRegExp);
					if (match) {
						path = "link/" + encodeURIComponent(path.substring(match[0].length));
						rootWindow.setRoutePath(window, path, argument, callback, replace);
					}
					else {
						rootWindow.setRoutePath(window, "browser/" + encodeURIComponent(path), argument, callback, replace);
					}
				}
				else {
					rootWindow.open(path, "_self");
				}
			}
			else {
				rootWindow.setRoutePath(window, path, argument, callback, replace);
			}
		},

		getArgument: function(model) {
			var layerInfo = this.getRootWindow().getLayerInfo(model);
			if (layerInfo) return layerInfo.argument;
		},

		setReturnValue: function(model, value) {
			var layerInfo = this.getRootWindow().getLayerInfo(model);
			if (layerInfo && value != null) {
				if (this.getRootWindow() != window) {
					value = JSON.stringify(value);
				}
				layerInfo.returnValue = value;
			}
		},

		goLogin: function (nextPath, callback) {
			if (rootApp) {
				return rootApp.goLogin(nextPath, callback);
			}
			else {
				var replace;
				if (typeof nextPath == "function") {
					callback = nextPath;
					nextPath = null;
				}
				else if (typeof nextPath == "boolean") {
					replace = nextPath;
					nextPath = null;
				}

				var path = App.prop("loginPath"), realNextPath = nextPath || cola.getCurrentRoutePath();

				if (realNextPath) path += "?" + encodeURIComponent(realNextPath);
				this.open(path, undefined, callback, replace);
			}
		},

		setTitle: function (model, title) {
			this.getRootWindow().layerTitleChange(model, title);
		},

		boardcastMessage: function(message) {
			if (rootApp) {
				rootApp.boardcastMessage(message);
			}
			else {
				boardcastMessage(message);
			}
		}
	};

	var serviceUrlPrefix = App.prop("serviceUrlPrefix");
	$(document).ajaxError(function (event, jqXHR) {
		if (jqXHR.status == 401) {
			App.goLogin();
			return false;
		}
		else {
			var message = jqXHR.responseJSON;
			if (message) {
				throw new cola.Exception(message);
			}
		}
	});
	$.ajaxPrefilter(function (options) {
		var url = options.url;
		if (serviceUrlPrefix && url.match(App.prop("serviceUrlPattern"))) {
			options.url = cola.util.concatUrl(serviceUrlPrefix, url);
			if (serviceUrlPrefix != "/") options.crossDomain = true;
		}
		//options.contentType = "text/plain";
	});

	cola.defaultAction("setting", function(key) {
		return App.prop(key);
	});
	cola.defaultAction("numberString", function(number) {
		return ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen"][number - 1];
	});

	$(function () {
		$(document.body).delegate("a.state", "click", function (evt) {
			var href = this.getAttribute("href");
			if (href) {
				App.open(href, this.getAttribute("target"));
			}
			evt.stopImmediatePropagation();
			return false;
		});
	});

	var language = $.cookie("_language") || window.navigator.language;
	if (language) {
		document.write("<script src=\"resources/cola-ui/i18n/" + language + "/cola.js\"></script>");
		document.write("<script src=\"resources/i18n/" + language + "/common.js\"></script>");
	}

	window.boardcastMessage = function (message) {
		$(window).trigger(message.type, message.data);
		$("iframe").each(function () {
			try {
				var win = this.contentWindow;
				if (win.boardcastMessage) {
					win.boardcastMessage(message);
				}
			}
			catch (e) {
			}
		});
	};
})();
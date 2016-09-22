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
			serviceUrlReplacePattern: null,
			htmlSuffix: "",
			defaultAuthRequired: false,
			defaultRouterPath: "/home",
			mainView: "shell/main-channel-bottom",
			loginPath: "/login",
			cardLoadingTimeout: 1000 * 10,
			longPollingTimeout: 0,
			longPollingInterval: 2000,
			safeEffect: false && cola.os.android && !cola.browser.chrome,

			"service.sysInfo": "service/sys/info",
			"service.login": "service/account/login",
			"service.logout": "service/account/logout",
			"service.messagePull": "service/message/pull",
			"service.messageSummary": "service/message/summary"
		};
	}

	var App = window.App = {
		channels: [],
		eventHandlers: {},

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

		on: function(event, listener) {
			var listeners = this.eventHandlers[event];
			if (!listeners) {
				this.eventHandlers[event] = listeners = [];
			}
			listeners.push(listener);
		},

		off: function(event, listener) {
			var listeners = this.eventHandlers[event];
			if (listeners) {
				if (listener) {
					var i = listeners.indexOf(listener);
					if (i > -1) listeners.splice(i, 1);
				}
				else {
					delete this.eventHandlers[event];
				}
			}
		},

		trigger: function(event, param) {
			var retValue, listeners = this.eventHandlers[event];
			if (listeners) {
				for (var i = 0, listener; i < listeners.length; i++) {
					listener = listeners[i];
					var ret = listener(param);
					if (ret != undefined) retValue = ret;
					if (retValue === false) break;
				}
			}
			return retValue;
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

			var rootWindow = this.getRootWindow();
			if (target) {
				rootWindow.open(path, target);
			}
			else if (path.match(/^https*:/)) {
				var domainRegExp = App.prop("domainRegExp");
				if (this.getPlus()) {
					var match = domainRegExp && path.match(domainRegExp);
					if (match) {
						path = "link?" + encodeURIComponent(path.substring(match[0].length));
						rootWindow.setRoutePath(window, path, {
							argument: argument,
							callback: callback,
							replace: replace
						});
					}
					else {
						rootWindow.setRoutePath(window, "browser?" + encodeURIComponent(path), {
							argument: argument,
							callback: callback,
							replace: replace
						});
					}
				}
				else {
					rootWindow.open(path, "_self");
				}
			}
			else {
				rootWindow.setRoutePath(window, path, {
					argument: argument,
					callback: callback,
					replace: replace
				});
			}
		},

		getArgument: function(model) {
			var layerInfo = this.getRootWindow().getLayerInfo(model, window);
			if (layerInfo) return layerInfo.argument;
		},

		setReturnValue: function(model, value) {
			var layerInfo = this.getRootWindow().getLayerInfo(model, window);
			if (layerInfo && value != null) {
				if (value instanceof cola.Entity || value instanceof cola.EntityList) {
					value = value.toJSON();
				}
				layerInfo.returnValue = JSON.stringify(value);
			}
		},

		goLogin: function (nextPath, callback) {

			function trimPath(path) {
				if (path)
					if (path.charCodeAt(0) == 47) // `/`
						path = path.substring(1);
				if (path.charCodeAt(path.length - 1) == 47)	// `/`
					path = path.substring(0, path.length - 1);
				return path || "";
			}

			if (trimPath(cola.getCurrentRoutePath()) == trimPath(App.prop("loginPath"))) {
				return;
			}

			if (rootApp) {
				return rootApp.goLogin(nextPath, callback);
			}
			else {
				var replace = true;
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
				this.open(path, {
					callback: callback,
					replace: replace
				});
			}
		},

		logout: function(callback) {
			$.post(App.prop("service.logout"), function() {
				App.boardcastMessage({
					type: "authStateChange",
					data: { authenticated: false }
				});
				if (callback) callback();
			});
		},

		setTitle: function (model, title) {
			this.getRootWindow().layerTitleChange(model, window, title);
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

	$(document).ajaxError(function (event, jqXHR) {
		if (jqXHR.status == 401) {
			App.goLogin(function(authenticated) {
				if (authenticated) {
					(rootWindow || window).location.reload();
				}
			});
			return false;
		}
		else {
			var message = jqXHR.responseJSON;
			if (message) {
				if (typeof message == "object") {
					throw new cola.Exception(message.msg);
				}
				else {
					throw new cola.Exception(message);
				}
			}
		}
	});
	$.ajaxPrefilter(function (options) {
		var serviceUrlPrefix = App.prop("serviceUrlPrefix");
		var serviceUrlReplacePattern = App.prop("serviceUrlReplacePattern");
		var url = options.url;
		if (serviceUrlPrefix && url.match(App.prop("serviceUrlPattern"))) {
			if (serviceUrlReplacePattern) {
				url = url.replace(serviceUrlReplacePattern, "");
			}
			options.url = cola.util.path(serviceUrlPrefix, url);
			if (serviceUrlPrefix != "/") options.crossDomain = true;
		}
		//options.contentType = "text/plain";
	});

	cola.defaultAction("setting", function(key) {
		return App.prop(key);
	});
	cola.defaultAction("number2Word", function(number) {
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

	if (!window._isColaShell) {
		var language = App.prop("language");
		if (language != "none") {
			language = language || window.navigator.language;
			document.write("<script src=\"resources/cola-ui/i18n/" + language + "/cola.js\"></script>");
			var i18nResources = App.prop("i18nResources");
			if (i18nResources) {
				i18nResources = i18nResources.split(/[;,]/);
				for (var i = 0, len = i18nResources.length; i < len; i++) {
					document.write(cola.util.path("<script src=\"resources/i18n", language, i18nResources[i], "></script>"));
				}
			}

		}
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
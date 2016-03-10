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
			version: "",
			domainRegExp: null,
			contextPath: "/",
			servicePrefix: "/",
			htmlSuffix: "",
			longPollingTimeout: 0,
			longPollingInterval: 2000,
			language: "zh-Hans",
			safeEffect: false && cola.os.android && !cola.browser.chrome
		};

		properties.unreadAdviceCount = 0;
		var unreadMessages = JSON.parse(localStorage.getItem("unreadMessages"));
		if (unreadMessages) properties.unreadAdviceCount += unreadMessages.length;
		var notifications = JSON.parse(localStorage.getItem("notifications"));
		if (notifications) properties.unreadAdviceCount += notifications.length;
	}

	var App = window.App = {
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

		openPath: function (path, target, callback, replace) {
			var argument;
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

		setReturnValue: function(value) {
			var layerInfo = this.getRootWindow().getLayerInfo(window);
			if (layerInfo && value != null) layerInfo.returnValue = JSON.stringify(value);
		},

		goSignIn: function (nextPath, callback) {
			if (rootApp) {
				return rootApp.goSignIn(nextPath, callback);
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

				var path = "/sign-in", realNextPath = nextPath || cola.getCurrentRoutePath();

				if (realNextPath) path += "?" + encodeURIComponent(realNextPath);
				this.openPath(path, undefined, callback, replace);
			}
		},

		getLayerInfo: function() {
			return this.getRootWindow().getLayerInfo(window);
		},

		getParentLayerInfo: function() {
			return this.getRootWindow().getParentLayerInfo(window);
		},

		setDocumentTitle: function (title, model) {
			this.getRootWindow().subViewTitleChange(title, model, window);
		},

		boardcastMessage: function(message) {
			if (rootApp) {
				rootApp.boardcastMessage(message);
			}
			else {
				boardcastAppMessage(message);
			}
		},

		authStateChange: function (authState) {
			if (rootApp) {
				rootApp.authStateChange(authState);
			}
			else {
				var oldAuthenticated = this.prop("authenticated");
				if (oldAuthenticated != authState.authenticated) {
					this.prop("authenticated", authState.authenticated);
					this.prop("authInfo", (authState.authenticated) ? authState.authInfo : null);

					this.boardcastMessage({
						type: "authStateChange",
						data: {authenticated: authState.authenticated}
					});
				}
			}
		},

		setUnreadAdviceCount: function (count) {
			if (rootApp) {
				rootApp.setUnreadAdviceCount(count);
			}
			else {
				this.prop("unreadAdviceCount", count);
				this.boardcastMessage({
					type: "unreadAdviceCountChange",
					data: {count: count}
				});
			}
		},

		setCartItemCount: function (count) {
			if (rootApp) {
				rootApp.setCartItemCount(count);
			}
			else {
				this.prop("cartItemCount", count);
				this.boardcastMessage({
					type: "cartItemChange",
					data: {count: count}
				});
			}
		}
	};

	var servicePrefix = App.prop("servicePrefix");
	$(document).ajaxError(function (event, jqXHR) {
		if (jqXHR.status == 401) {
			App.goSignIn();
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
		if (servicePrefix && url.match(/^\/?service\/[a-z]+/)) {
			options.url = cola.util.concatUrl(servicePrefix, url);
			console.log(options.url);
			options.crossDomain = true;
		}
		//options.contentType = "text/plain";
	});

	cola.defaultAction("setting", function(key) {
		return App.prop(key);
	});

	$(function () {
		$(document.body).delegate("a.state", "click", function (evt) {
			var href = this.getAttribute("href");
			if (href) {
				App.openPath(href, this.getAttribute("target"));
			}
			evt.stopImmediatePropagation();
			return false;
		});
	});

	$(window).on("message", function (evt) {
		var data = evt.originalEvent.data;
		if (data) {
			$(window).trigger(data.type, data.data);
		}
	});

	var language = App.prop("language");
	if (language) {
		if (language != "zh-Hans") {
			document.write('<script src="../resources/i18n/zh-Hans/common.js"></script>');
		}
		document.write('<script src="resources/i18n/' + language + '/common.js"></script>');
	}

	window.boardcastAppMessage = function (message) {
		postMessage(message, "*");
		$("iframe").each(function () {
			try {
				var win = this.contentWindow;
				if (win.boardcastAppMessage) {
					win.boardcastAppMessage(message);
				}
			}
			catch (e) {
			}
		});
	};
})();
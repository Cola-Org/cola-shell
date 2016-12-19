"use strict";

(function () {
	var contextPath = App.prop("contextPath"), lastBrowserUrl;

	var defaultPath, path = location.pathname;
	if (path && contextPath) {
		if (path.indexOf(contextPath) == 0) {
			path = path.substring(contextPath.length);
		}
	}
	if (path && path !== "/" && !path.match(/^\/index/)) {
		defaultPath = path;
	}

	cola.setting("routerMode", "state");
	cola.setting("defaultRouterPath", defaultPath || App.prop("defaultRouterPath"));
	cola.setting("routerContextPath", contextPath);

	var appTitle = cola.resource("appTitle", App.prop("appTitle"));
	App.router = function (config) {
		var router = cola.route(config.path, {
			title: config.title || appTitle,
			name: config.name,
			data: {
				type: config.type || "subView",
				level: (config.level == null) ? 1 : config.level,
				class: config.class,
				animation: config.animation,
				authRequired: (config.authRequired == undefined) ? App.prop("defaultAuthRequired") : config.authRequired,
				htmlUrl: config.htmlUrl || function () {
					var path = location.pathname;
					if (contextPath) path = path.substring(contextPath.length);
					path = cola.util.path("card", path);
					if (config.type == "iFrame") path += location.search + location.hash;
					return path;
				},
				cssUrl: config.cssUrl || "$",
				jsUrl: config.jsUrl || "$"
			}
		});

		if (router.data.level == 0) {
			App.channels.push({
				name: router.name,
				path: router.path,
				title: config.title,
				icon: config.icon,
				menuClass: config.menuClass
			});
		}
	};

	if (App._prependingRouters) {
		for (var i = 0, len = App._prependingRouters.length; i < len; i++) {
			App.router(App._prependingRouters[i]);
		}
		delete App._prependingRouters;
	}

	App.router({
		path: "/link",
		type: "iFrame",
		class: "frame",
		htmlUrl: function () {
			return decodeURIComponent(location.search.substring(1));
		}
	});
	App.router({
		path: "/browser",
		type: "iFrame",
		class: "browser",
		htmlUrl: function () {
			return decodeURIComponent(location.search.substring(1));
		}
	});

	var layerStack = [], subViewLayerPool = [], linkLayerPool = [];
	var mainViewLoaded, backToQuit;

	function preprocessHtmlUrl(url, router) {
		if (typeof url == "function") url = url(router);

		if (router.name != "link" && router.name != "browser") {
			var i = url.indexOf("?");
			if (i > 0) {
				url = url.substring(0, i) + App.prop("htmlSuffix") + url.substring(i);
			}
			else {
				url = url + App.prop("htmlSuffix");
			}
		}

		var params = url.match(/{\$*[\w-]+}/g);
		if (params) {
			for (i = 0; i < params.length; i++) {
				var param = params[i];
				param = param.substring(1, param.length - 1);
				var value;
				if (param === "$search") value = location.search;
				else if (param === "$hash") value = location.hash;
				else value = router.param[param];
				url = url.replace(params[i], value);
			}
		}
		return url;
	}

	cola.on("routerSwitch", function (self, arg) {

		function pushLayerInfo(layer, path, url, data) {
			if (layerArgument) {
				if (layerArgument instanceof cola.Entity || layerArgument instanceof cola.EntityList) {
					layerArgument = layerArgument.toJSON();
				}
			}

			layerStack.push({
				type: data.type,
				level: data.level,
				path: path,
				url: url,
				layer: layer,
				class: data.class,
				argument: layerArgument,
				callback: layerCallback
			});
			layerArgument = undefined;
			layerCallback = undefined;
		}

		backToQuit = false;

		var nextRouter = arg.next, path = arg.path, url = location.href;
		if (nextRouter) {
			var data = nextRouter.data;
			if (data.level == 0) {
				if (!mainViewLoaded) {
					mainViewLoaded = true;

					cola.widget("viewMain").load({
						url: preprocessHtmlUrl(App.prop("mainView"), nextRouter),
						jsUrl: "$",
						cssUrl: "$"
					}, function () {
						if (!window._splashClosed) {
							window._splashClosed = true;
							if (window.plus) plus.navigator.closeSplashscreen();
						}

						switchChannel(nextRouter, function (subView) {
							pushLayerInfo(subView, path, url, data);
						});
					});
				}
				else {
					switchChannel(nextRouter, function (subView) {
						pushLayerInfo(subView, path, url, data);
					});
				}
			}
			else if (data.level == 1) {
				var newLayer = true;
				for (var i = 0, len = layerStack.length, layerInfo; i < len; i++) {
					layerInfo = layerStack[i];
					if (layerInfo.url == url) {
						newLayer = false;
						hideLayers(i + 1);
						break;
					}
				}

				if (newLayer) {
					checkAuthState(nextRouter, function () {
						var layer;
						if (data.type == "subView") {
							layer = showSubViewLayer(nextRouter);
						}
						else if (data.type == "iFrame") {
							layer = showIFrameLayer(nextRouter);
						}
						if (layer) pushLayerInfo(layer, path, url, data);
					});
				}
			}
		}
	});

	function checkAuthState(router, callback) {

		if (router.data.authRequired) {
			if (App.prop("sysInfoRetrieved")) {
				if (!App.prop("authenticated")) {
					App.goLogin(true);
				}
				else {
					callback();
				}
			}
			else {
				window.processPrependRouter = function () {
					if (!App.prop("authenticated")) {
						App.goLogin(true);
					}
					else {
						callback();
					}
				}
			}
		}
		else {
			callback();
		}
	}

	var subViewQueryString = ">.v-box >.flex-box >.ui.sub-view";
	var iFrameQueryString = ">.v-box >.flex-box >.ui.iframe";
	var titleQueryString = ">.v-box >.header-bar >.title";

	var currentChannel = null;

	function switchChannel(router, callback) {
		hideLayers(0);

		var data = router.data, index = -1;

		var oldChannel = currentChannel;
		var newChannel = router;
		if (oldChannel == newChannel) return;

		var cardBook = cola.widget("cardBookChannel");
		cardBook.get$Dom().find(">div").each(function (i, card) {
			if (card.id == "subView" + cola.util.capitalize(router.name)) {
				index = i;
				return false;
			}
		});

		if (index >= 0) {
			var menuChannel = cola.widget("menuChannel");
			var oldActiveItem = menuChannel.getActiveItem();
			var activeItem = menuChannel.getItem(index);
			if (oldActiveItem != activeItem) {
				checkAuthState(router, function () {
					currentChannel = router;

					menuChannel.setActiveItem(activeItem);
					cardBook.setCurrentIndex(index);
					var subView = cola.widget("subView" + cola.util.capitalize(router.name));
					data.url = preprocessHtmlUrl(data.htmlUrl, router);
					if (subView.get("url") != data.url) {
						subView.load({
							url: data.url,
							jsUrl: data.jsUrl,
							cssUrl: data.jsUrl
						});
					}

					if (callback) callback(subView);
				});
			}
		}
	}

	function showSubViewLayer(router) {
		var options = $.extend(router.data, null);
		options.param = router.param;
		options.url = preprocessHtmlUrl(options.htmlUrl, router);

		var layer = subViewLayerPool.pop();
		if (!layer) {
			var layerDom = cola.xRender({
				tagName: "div",
				"c-widget": {
					$type: "layer",
					hide: function (self) {
						var subViewDom = self.get$Dom().find(subViewQueryString)[0];
						var subView = cola.widget(subViewDom);
						if (subView) subView.unload();
					}
				},
				content: {
					"class": "v-box",
					content: [
						{
							"class": "box header-bar",
							content: [
								{
									"c-widget": {
										$type: "button",
										"class": "back-button",
										icon: "chevron left",
										click: function () {
											return history.back();
										}
									}
								}, {
									"class": "title",
									click: function () {
										return history.back();
									}
								}
							]
						}, {
							"class": "flex-box",
							content: {
								tagName: "div",
								contextKey: "subView",
								"c-widget": {
									$type: "subView",
									timeout: App.prop("cardLoadingTimeout"),
									loadError: function (self, arg) {
										if (arg.error && arg.error.status == "timeout") {
											return App.trigger("cardTimeout", {
												widget: self,
												error: arg
											});
										}
									}
								}
							}
						}
					]
				}
			});

			var layer = cola.widget(layerDom);
			layer.setTitle = function (title) {
				this.get$Dom().find(titleQueryString).text(title);
			};
			layer.appendTo(document.body);
		}

		var $layer = layer.get$Dom();
		$layer.attr("class", "ui layer transition hidden " + (options.class || "frame"));
		$layer.find(titleQueryString).text(router.title);
		layer.set("animation", options.animation || "slide left").show();

		var $subView = layer.get$Dom().find(subViewQueryString);
		if (router.name) $subView.attr("id", "subView" + cola.util.capitalize(router.name));
		var subView = cola.widget($subView[0]);
		subView.loadIfNecessary(options);
		return layer;
	}

	function showIFrameLayer(router) {
		var options = $.extend(router.data, null);
		options.url = preprocessHtmlUrl(options.htmlUrl, router);

		var layer;
		if (options.class != "browser") {
			layer = linkLayerPool.pop();
			if (!layer) {
				var layerDom = cola.xRender({
					"c-widget": {
						$type: "layer",
						hide: function (self) {
							var iFrameDom = self.get$Dom().find(iFrameQueryString)[0];
							iFrame = cola.widget(iFrameDom);
							if (iFrame) iFrame.open("about:blank");
						}
					},
					content: {
						"class": "v-box",
						content: [
							{
								"class": "box header-bar",
								content: [
									{
										"c-widget": {
											$type: "button",
											"class": "back-button",
											icon: "chevron left",
											click: function () {
												history.back();
											}
										}
									},
									{
										"class": "title"
									}
								]
							}, {
								"class": "flex-box",
								content: {
									contextKey: "iframe",
									"class": "in-layer",
									"c-widget": {
										$type: "iFrame"
									}
								}
							}
						]
					}
				});

				var layer = cola.widget(layerDom);
				layer.setTitle = function (title) {
					this.get$Dom().find(titleQueryString).text(title);
				};
				layer.appendTo(document.body);
			}
			else {
				layer.setTitle(router.title || "");
			}
		}
		else {
			var layerDom = cola.xRender({
				"c-widget": {
					$type: "layer",
					beforeHide: function (self) {
						var webview = layer.webview;
						delete webview.onloaded;
						delete webview.onclose;
						webview.close("slide-out-right", cola.AbstractLayer.attributes.duration.defaultValue);
						delete layer.webview;
					}
				},
				content: [
					{
						"class": "v-box",
						content: [
							{
								"class": "box header-bar",
								content: [
									{
										"c-widget": {
											$type: "button",
											"class": "back-button",
											icon: "chevron left",
											click: function () {
												history.back();
											}
										}
									},
									{
										"class": "title"
									}
								]
							}
						]
					}
				]
			});

			var layer = cola.widget(layerDom);
			layer.setTitle = function (title) {
				this.get$Dom().find(titleQueryString).text(title)
			};
			layer.appendTo(document.body);

			var webview = layer.webview = plus.webview.create();
			webview.onloaded = function () {
				var url = layer.webview.getURL();
				if (url && !(url.match(/^file\:\/\/.*\/error\.\html/))) {
					lastBrowserUrl = url;
					layer.setTitle(url);
				}
			};
			webview.onclose = function () {
				history.back();
			};
			webview.onerror = function (error) {
				var errorPage = "file://" + plus.io.convertLocalFileSystemURL("/error.html");
				webview.loadURL(errorPage + "?" + encodeURIComponent(lastBrowserUrl));
				return false;
			};
		}

		layer.get$Dom().attr("class", "ui layer transition hidden " + (options.class || "frame"));
		layer.set("animation", options.animation || "slide left").show(function () {
			if (options.class == "browser") {
				layer.webview.setStyle({
					top: "38px",
					bottom: "0px"
				});
				layer.webview.show(/*"none"*/);
			}
		});

		if (options.class != "browser") {
			var iFrameDom = layer.get$Dom().find(iFrameQueryString)[0];
			var iFrame = cola.widget(iFrameDom);
			iFrame.open(options.url, function () {
				if (options.class != "browser") {
					try {
						var title = iFrame.getContentWindow().document.title;
						if (title) {
							document.title = title || router.title;
							layer.setTitle(title);
						}
					}
					catch (e) {
						// do nothing
					}
				}
			});
		}
		else {
			layer.setTitle(options.url);
			layer.webview.loadURL(options.url);
		}
		return layer;
	}

	function hideLayers(from, animation, callback) {
		if (animation instanceof Function) {
			callback = animation;
			animation = undefined;
		}

		var len = layerStack.length;
		if (from > len - 1) {
			if (callback) callback();
			return;
		}

		for (var i = from, layerInfo; i < len; i++) {
			layerInfo = layerStack[i];
			var topLayer = (i == len - 1), ani = animation;
			if (ani !== false) ani = topLayer;
			if (topLayer) {
				hideLayer(layerInfo, ani, callback);
			}
			else {
				hideLayer(layerInfo, false);
			}
		}
		layerStack = layerStack.slice(0, from);
	}

	function hideLayer(layerInfo, animation, callback) {
		if (animation instanceof Function) {
			callback = animation;
			animation = undefined;
		}

		function invokeCallback() {
			var value = layerInfo.returnValue;
			if (value) value = JSON.parse(value);
			if (layerInfo.callback) layerInfo.callback(value);
			if (callback) setTimeout(callback, 50);
		}

		var layer = layerInfo.layer;
		if (layerInfo.level > 0) {
			if (animation) {
				layer.hide(invokeCallback);
			}
			else {
				layer.hide({animation: "none"});
				invokeCallback();
			}

			if (layerInfo.type == "subView") {
				subViewLayerPool.push(layer);
			}
			else if (layerInfo.type == "iFrame" && layerInfo.class != "browser") {
				linkLayerPool.push(layer);
			}
		}
	}

	window.getLayerInfo = function (subModel, subWindow) {
		if (layerStack) {
			for (var i = layerStack.length - 1; i >= 0; i--) {
				var layerInfo = layerStack[i];
				if (layerInfo.type == "iFrame") {
					try {
						var $iFrame = layerInfo.layer.get$Dom().find(iFrameQueryString);
						var iFrame = cola.widget($iFrame[0]);
						if (iFrame.getContentWindow() == subWindow) return layerInfo;
					}
					catch (e) {
					}
				}
				else if (i == 0) {
					var subView = layerInfo.layer;
					if (subView.get("model") == subModel) return layerInfo;
				}
				else {
					var $subView = layerInfo.layer.get$Dom().find(subViewQueryString);
					var subView = cola.widget($subView[0]);
					if (subView.get("model") == subModel) return layerInfo;
				}
			}
		}
		return null;
	};

	var layerArgument, layerCallback;
	window.setRoutePath = function (subWindow, path, config) {
		layerArgument = config && config.argument;
		layerCallback = config && config.callback;
		cola.setRoutePath(path, config && config.replace);
	};

	window.layerTitleChange = function (subModel, subWindow, title) {
		var layerInfo = getLayerInfo(subModel, subWindow);
		if (layerInfo) {
			layerInfo.layer.setTitle(title);
			if (i === layerStack.length - 1) {
				document.title = title || "";
			}
		}
	};

	$.get(App.prop("service.sysInfo")).done(function (sysInfo) {
		App.prop("sysInfoRetrieved", true);

		App.prop("availableVersion", sysInfo.availableLatestVersion);

		App.boardcastMessage({
			type: "authStateChange",
			data: {
				authenticated: sysInfo.authenticated,
				authInfo: sysInfo.authInfo
			}
		});

		if (window.processPrependRouter) window.processPrependRouter();

		if (App.prop("availableVersion") > App.prop("version")) {
			App.boardcastMessage({
				type: "newVersionAvailable"
			});
		}
	});

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

	cola(function (model) {
		var hasAuthenticated = false;
		$(window).on("authStateChange", function (event, data) {
			App.prop("authenticated", data.authenticated);
			if (data.authenticated) {
				hasAuthenticated = true;
				App.prop("authInfo", data.authInfo);

				if (App.prop("liveMessage")) {
					$.get(App.prop("service.messageSummary")).done(function (data) {
						App.boardcastMessage({
							type: "unreadChatMessageChange",
							data: {count: data.unreadChatMessages}
						});
						App.boardcastMessage({
							type: "unreadNotificationChange",
							data: {count: data.unreadNotifications}
						});
					});
				}
			}
			else {
				App.prop("authInfo", null);
				if (hasAuthenticated) hideLayers(0, false);
			}
		});

		var errorCount = 0;

		function longPolling() {
			var options = {};
			if (App.prop("longPollingTimeout")) options.timeout = App.prop("longPollingTimeout");

			$.ajax(App.prop("service.messagePull"), options).done(function (messages) {
				if (messages) {
					errorCount = 0;
					for (var i = 0; i < messages.length; i++) {
						App.boardcastMessage(messages[i]);
					}
				}

				setTimeout(longPolling, App.prop("longPollingInterval"));
			}).error(function (xhr, status, ex) {
				if (status == "timeout") {
					setTimeout(longPolling, App.prop("longPollingInterval"));
				}
				else {
					errorCount++;
					setTimeout(longPolling, 5000 * Math.pow(2, Math.min(6, (errorCount - 1))));
				}
			});
		}

		if (App.prop("liveMessage")) setTimeout(longPolling, 1000);

		function plusReady() {
			if (window._splashClosed) {
				window._splashClosed = true;
				plus.navigator.closeSplashscreen();
			}

			if (cola.os.ios) {
				return
			}

			plus.key.addEventListener("backbutton", function () {
				var currentRouter = cola.getCurrentRouter();
				if (!currentRouter || currentRouter.path == "/home") {
					if (backToQuit) {
						plus.runtime.quit();
					}
					else {
						backToQuit = true;
						cola.NotifyTipManager.show({
							description: cola.resource("appBackButtonQuitTip", App.prop("appBackButtonQuitTip")),
							showDuration: 1500
						});
					}
				}
				else {
					history.back();
				}
			}, false);
		}

		if (window.plus) {
			plusReady();
		} else {
			document.addEventListener("plusready", plusReady, false);
		}
	});
})();

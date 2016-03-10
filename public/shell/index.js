"use strict";

(function() {
	var zIndexSeed = 2000, contextPath = App.prop("contextPath"), lastBrowserUrl;

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
	cola.setting("defaultRouterPath", defaultPath || "/home");
	cola.setting("routerContextPath", contextPath);

	var appTitle = cola.resource("appTitle");
	App.router = function(config) {
		cola.route(config.path, {
			title: config.title || appTitle,
			data: {
				type: config.type || "subView",
				name: config.name,
				level: (config.level == null) ? 1 : config.level,
				class: config.class,
				animation: config.animation,
				authRequired: config.authRequired,
				url: config.url || function() {
					var path = location.pathname;
					if (contextPath) path = path.substring(contextPath.length);
					path = cola.util.concatUrl("frame", path);
					if (config.type == "iFrame") path += location.search;
					return path;
				},
				cssUrl: config.cssUrl || "$",
				jsUrl: config.jsUrl || "$"
			}
		});
	};

	if (App._prependingRouters) {
		for(var i = 0, len = App._prependingRouters.length; i < len; i++) {
			App.router(App._prependingRouters[i]);
		}
		delete App._prependingRouters;
	}

	App.router({
		path: "/link/:path",
		type: "iFrame",
		class: "frame",
		url: function (router) {
			return decodeURIComponent(router.param.path);
		}
	});
	App.router({
		path: "/browser/:path",
		type: "iFrame",
		class: "browser",
		url: function (router) {
			return decodeURIComponent(router.param.path);
		}
	});

	var layerStack = [], subViewLayerPool = [], linkLayerPool = [];
	var mainViewLoaded;

	function preprocessUrl(url, router) {
		if (typeof url == "function") url = url(router);
		var i = url.indexOf("?");
		if (i > 0) {
			url = url.substring(0, i) + App.prop("htmlSuffix") + url.substring(i);
		}
		return url;
	}

	cola.on("routerSwitch", function (self, arg) {
		var nextRouter = arg.next;
		if (nextRouter) {
			var data = nextRouter.data;
			if (data.level == 0) {
				if (!mainViewLoaded) {
					mainViewLoaded = true;

					cola.widget("viewMain").load({
						url: preprocessUrl("shell/main"),
						jsUrl: "$",
						cssUrl: "$"
					}, function () {
						hideLayers(0);
						switchChannel(nextRouter);
					});
				}
				else {
					hideLayers(0);
					switchChannel(nextRouter);
				}
			}
			else if (data.level == 1) {
				var path = arg.path, newLayer = true;
				for (var i = 0, len = layerStack.length, layerInfo; i < len; i++) {
					layerInfo = layerStack[i];
					if (layerInfo.path == path) {
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
						if (layer) {
							layerStack.push({
								type: data.type,
								path: path,
								layer: layer,
								class: data.class,
								argument: layerArgument,
								callback: layerCallback
							});
							layerArgument = undefined;
							layerCallback = undefined;
						}
					});
				}
			}
		}
	});

	function checkAuthState(router, callback) {
		if (router.data.authRequired) {
			if (App.prop("sysInfoRetrieved")) {
				if (!App.prop("authenticated")) {
					App.goSignIn(true);
				}
				else {
					callback();
				}
			}
			else {
				window.processPrependRouter = function () {
					if (!App.prop("authenticated")) {
						App.goSignIn(true);
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
	var titleQueryString = ">.v-box >.title-bar >.title";

	var currentChannel = null;
	function switchChannel(router) {
		var data = router.data, index = -1;

		var oldChannel = currentChannel;
		var newChannel = router;
		if (oldChannel == newChannel) return;

		var cardBook = cola.widget("cardBookChannel");
		cardBook.get$Dom().find(">div").each(function(i, card) {
			if (card.id == "view" + cola.util.capitalize(router.name)) {
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
					var subView = cola.widget("view" + cola.util.capitalize(router.name));
					var url = preprocessUrl(data.url, router);
					if (subView.get("url") != url) {
						subView.load({
							url: url,
							jsUrl: data.jsUrl,
							cssUrl: data.jsUrl
						});
					}
				});
			}
		}
	}

	function showSubViewLayer(router) {
		var options = $.extend(router.data, null);
		options.param = router.param;
		options.url = preprocessUrl(options.url, router);

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
							"class": "box title-bar",
							content: [
								{
									"c-widget": {
										$type: "button",
										"class": "back-button",
										icon: "chevron left",
										click: function() {
											return history.back();
										}
									}
								}, {
									"class": "title",
									click: function() {
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
									$type: "subView"
								}
							}
						}
					]
				}
			});

			var layer = cola.widget(layerDom);
			layer.setTitle = function (title) {
				this.get$Dom().find(titleQueryString).text(title);
			}
			layer.appendTo(document.body);
		}

		var $layer = layer.get$Dom();
		$layer.css("zIndex", zIndexSeed++).attr("class", "ui layer transition hidden " + (options.class || "frame"));
		$layer.find(titleQueryString).text(options.title);
		layer.set("animation", options.animation || "slide left").show();

		var $subView = layer.get$Dom().find(subViewQueryString);
		if (router.name) $subView.attr("id", "subView" + cola.util.capitalize(router.name));
		var subView = cola.widget($subView[0]);
		subView.loadIfNecessary(options);
		return layer;
	}

	function showIFrameLayer(router) {
		var options = $.extend(router.data, null);
		options.url = preprocessUrl(options.url, router);

		var layer;
		if (options.class != "browser") {
			layer = linkLayerPool.pop();
			if (!layer) {
				var layerDom = cola.xRender({
					tagName: "div",
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
								"class": "box title-bar",
								content: [
									{
										"c-widget": {
											$type: "button",
											"class": "back-button",
											icon: "chevron left",
											click: function() {
												history.back();
											}
										}
									}, {
										"class": "title",
										click: function() {
											history.back();
										}
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
				layer.setTitle("");
			}
		}
		else {
			var layerDom = cola.xRender({
				tagName: "div",
				"c-widget": {
					$type: "layer",
					beforeHide: function (self) {
						var webview = layer.webview;
						delete webview.onloaded;
						delete webview.onclose;
						webview.close("slide-out-right", cola.AbstractLayer.ATTRIBUTES.duration.defaultValue);
						delete layer.webview;
					}
				},
				content: [
					{
						class: "title-bar",
						content: [
							{
								"c-widget": {
									$type: "button",
									class: "back-button",
									icon: "chevron left",
									click: function () {
										history.back();
									}
								}
							},
							{
								class: "title"
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
			webview.onloaded = function() {
				var url = layer.webview.getURL();
				if (url && !(url.match(/^file\:\/\/.*\/error\.\html/))) {
					lastBrowserUrl = url;
					layer.setTitle(url);
				}
			};
			webview.onclose = function() {
				history.back();
			};
			webview.onerror = function(error) {
				var errorPage = "file://" + plus.io.convertLocalFileSystemURL("/error.html");
				webview.loadURL(errorPage + "?" + encodeURIComponent(lastBrowserUrl));
				return false;
			};
		}

		layer.get$Dom().css("zIndex", zIndexSeed++).attr("class", "ui layer transition hidden " + (options.class || "standard"));
		layer.set("animation", options.animation || "slide left").show(function () {
			if (options.class == "browser") {
				layer.webview.setStyle({
					top: "38px",
					bottom: "0px"
				});
				layer.webview.show("none");
			}
		});

		var url = options.url;
		if (typeof url == "function") {
			url = url(cola.getCurrentRouter());
		}

		if (options.class != "browser") {
			var iFrameDom = layer.get$Dom().find(iFrameQueryString)[0];
			var iFrame = cola.widget(iFrameDom);
			iFrame.open(url, function () {
				if (options.class != "browser") {
					try {
						var title = iFrame.getContentWindow().document.title;
						if (title) {
							document.title = title;
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
			layer.setTitle(url);
			layer.webview.loadURL(url);
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
		if (from == len - 1) {
			layerStack.pop();
		}
		else {
			layerStack = layerStack.slice(0, from);
		}
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

	window.getLayerInfo = function (subWindow) {
		if (layerStack) {
			var layerType = (subWindow == window) ? "subView" : "iFrame";
			for (var i = layerStack.length - 1; i >= 0; i--) {
				var layerInfo = layerStack[i];
				if (layerInfo.type != layerType) continue;
				try {
					if (layerInfo.type == "iFrame") {
						var frameWindow = layerInfo.layer.get$Dom().find(iFrameQueryString)[0].contentWindow;
						if (frameWindow == subWindow) {
							return layerInfo;
						}
					}
					else if (layerInfo.type == "subView") {
						if (cola.util.concatUrl(contextPath, layerInfo.path) == subWindow.location.pathname) {
							return layerInfo;
						}
					}
				}
				catch (e) {
				}
			}
		}
		return null;
	};

	window.getParentLayerInfo = function (subWindow) {
		if (layerStack) {
			var layerInfo = getLayerInfo(subWindow);
			if (layerInfo) {
				var i = layerStack.indexOf(layerInfo);
				if (i > 0) return layerStack[i - 1];
			}
		}
		return null;
	};

	var layerArgument, layerCallback;
	window.setRoutePath = function (subWindow, path, argument, callback, replace) {
		layerArgument = argument;
		layerCallback = callback;
		cola.setRoutePath(path, replace);
	};

	window.subViewTitleChange = function(title, model, subWindow) {
		if (layerStack) {
			try {
				var layerInfos = layerStack;
				var i = layerInfos.length - 1;
				while (i >= 0) {
					var layerInfo = layerInfos[i];
					if (!model && layerInfo.type === "iFrame") {
						var frameWindow = layerInfo.layer.get$Dom().find(iFrameQueryString)[0].contentWindow;
						if (frameWindow === subWindow) {
							layerInfo.layer.setTitle(title);
							break;
						}
					} else if (model && layerInfo.type === "subView") {
						var subView = layerInfo.layer.get$Dom().find(subViewQueryString)[0];
						if (subView && cola.widget(subView).get("model") === model) {
							layerInfo.layer.setTitle(title);
							break;
						}
					}
					i--;
				}
				if (i === layerInfos.length - 1) {
					document.title = title || "";
				}
			} catch (e) {
				// do nothing;
			}
		}
	};

	$.get("service/message/sysInfo").done(function (sysInfo) {
		App.prop("sysInfoRetrieved", true);

		App.prop("availableVersion", sysInfo.availableLatestVersion);
		App.authStateChange(sysInfo.authState);

		if (window.processPrependRouter) window.processPrependRouter();

		if (App.prop("availableVersion") > App.prop("version")) {
			boardcastAppMessage({
				type: "newVersionAvailable"
			});
		}
	});
})();

cola(function (model) {
	var messageProcessors = {
		message: function (data) {
			var unreadMessageCount = (parseInt(localStorage.getItem("unreadMessageCount")) || 0) + data.count;
			localStorage.setItem("unreadMessageCount", unreadMessageCount);
			App.setUnreadAdviceCount(App.prop("unreadAdviceCount") + data.count);
			boardcastAppMessage({
				type: "newMessage",
				data: data
			});
		},
		notification: function (data) {
			var unreadNotificationCount = (parseInt(localStorage.getItem("unreadNotificationCount")) || 0) + data.count;
			localStorage.setItem("unreadNotificationCount", unreadNotificationCount);
			App.setUnreadAdviceCount(App.prop("unreadAdviceCount") + data.count);
		},
		cartItemChange: function (data) {
			App.setCartItemCount(data.count);
		},
		authStateChange: function (data) {
			App.authStateChange(data);

			if (data.authenticated) {
				$.get("service/message/summary").done(function (data) {
					var unreadMessageCount = (parseInt(localStorage.getItem("unreadMessageCount")) || 0) + data.unreadMessages;
					if (data.unreadMessages) localStorage.setItem("unreadMessageCount", unreadMessageCount);

					var unreadNotificationCount = (parseInt(localStorage.getItem("unreadNotificationCount")) || 0) + data.unreadNotifications;
					if (data.unreadNotifications) localStorage.setItem("unreadNotificationCount", unreadNotificationCount);

					if (data.unreadMessages || data.unreadNotifications) {
						App.setUnreadAdviceCount(unreadMessageCount + unreadNotificationCount);
					}

					boardcastAppMessage({
						type: "cartItemChange",
						data: {count: data.cartItems}
					});
				});
			}
		},
		orderPaid: function (data) {
			hideLayers(0, function() {
				App.openPath("my/order/" + data.orderCode);
			});
		}
	};

	var errorCount = 0;

	function longPolling() {
		var options = {
			type: "GET"
		};
		if (App.prop("longPollingTimeout")) options.timeout = App.prop("longPollingTimeout");

		$.ajax("service/message/pull", options).done(function (messages) {
			if (messages) {
				errorCount = 0;
				for (var i = 0; i < messages.length; i++) {
					var message = messages[i];
					var processor = messageProcessors[message.type];
					if (processor) processor(message.data);
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

	setTimeout(longPolling, 1000);

	function plusReady() {
		var timerId = setInterval(function() {
			if (window.applicationCacheReady) {
				clearInterval(timerId);
				plus.navigator.closeSplashscreen();
			}
		}, 50);

		plus.key.addEventListener("backbutton", function () {
			var currentRouter = cola.getCurrentRouter();
			if (!currentRouter || currentRouter.path == "home") {
				plus.runtime.quit();
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
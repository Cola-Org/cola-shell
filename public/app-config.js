/* 系统默认值 */
App.prop({
	// REPLACE_START
	// 开发状态下的默认值，在Build时此段内容将被替换

	// REPLACE_END
});

/* 路由 */
App.router({
	path: "/home",
	level: 0
});
App.router({
	path: "/search",
	level: 0,
	url: "frame/search/search"
});
App.router({
	path: "/my",
	level: 0,
	authRequired: true,
	url: "frame/my/dashboard"
});
App.router({
	path: "/cart",
	level: 0,
	authRequired: true,
	url: "frame/buy/cart"
});
App.router({
	path: "/setting",
	level: 0
});

App.router({
	path: "/sign-in",
	class: "open",
	animation: "slide down",
	url: "frame/account/sign-in"
});
App.router({
	path: "/forgot-password1",
	type: "iFrame",
	url: "frame/account/forgot-password1"
});
App.router({
	path: "/forgot-password2",
	type: "iFrame",
	url: function () {
		return "frame/account/forgot-password2" + location.search
	}
});
App.router({
	path: "/new-password",
	type: "iFrame",
	url: function () {
		return "frame/account/new-password" + location.search
	}
});

App.router({
	path: "/register",
	class: "open",
	url: "frame/account/register"
});
App.router({
	path: "/set-password",
	type: "iFrame",
	url: "frame/account/set-password"
});

App.router({
	path: "/agreement",
	type: "iFrame",
	class: "frame",
	url: "frame/account/agreement.html"
});
App.router({
	path: "/about",
	type: "iFrame",
	class: "frame",
	url: "frame/about.html"
});
App.router({
	path: "/help",
	type: "iFrame",
	url: "frame/help.html"
});

App.router({
	path: "/categories/:id?",
	class: "free",
	url: "frame/item/categories"
});

App.router({
	path: "/search-result",
	class: "free",
	url: "frame/search/search-result"
});

App.router({
	path: "/item/:id",
	class: "free",
	url: function (router) {
		return "frame/item/item?" + router.param.id;
	}
});
App.router({
	path: "/item/:id/detail",
	url: "frame/item/detail"
});
App.router({
	path: "/item/:id/reviews",
	type: "iFrame",
	class: "free",
	url: function (router) {
		return "frame/item/reviews?" + router.param.id;
	}
});

App.router({
	path: "/buy",
	type: "iFrame",
	class: "free",
	url: "frame/buy/buy"
});

App.router({
	path: "/messages",
	type: "iFrame",
	class: "free",
	url: function () {
		return "frame/my/messages" + location.search;
	}
});
App.router({
	path: "/notifications",
	type: "iFrame",
	class: "free",
	url: function () {
		return "frame/my/notifications";
	}
});

App.router({
	path: "/my/addresses",
	type: "iFrame",
	class: "free",
	authRequired: true
});
App.router({
	path: "/my/orders",
	type: "iFrame",
	class: "free",
	authRequired: true
});
App.router({
	path: "/my/order/:code",
	type: "iFrame",
	class: "frame",
	authRequired: true,
	url: function (router) {
		return "frame/my/order?" + router.param.code;
	}
});
App.router({
	path: "/my/write-review/:code",
	type: "iFrame",
	class: "free",
	authRequired: true,
	url: function (router) {
		return "frame/my/write-review?" + router.param.code;
	}
});
App.router({
	path: "/my/wish-list",
	type: "iFrame",
	class: "free",
	authRequired: true
});

App.router({
	path: "/my/:p1",
	type: "iFrame",
	class: "frame",
	authRequired: true
});
App.router({
	path: "/:p1/:p2?",
	type: "iFrame",
	class: "frame"
});
/* 系统默认值 */
App.prop({
	language: "zh",
	appTitle: "Cola-Shell",
	// REPLACE_START
	// 开发状态下的默认值，在Build时此段内容将被替换
	liveMessage: false,
	domainRegExp: /^https*:\/\/shop\.cola-shell\.com\//
	// REPLACE_END
});

/* 频道 */
App.channel({
	path: "/home",
	icon: "home"
});

/* 路由 */
App.router({
	path: "/login",
	class: "open",
	animation: "slide down",
	htmlUrl: "shell/account/login"
});
App.router({
	path: "/forgot-password1",
	type: "iFrame",
	htmlUrl: "shell/account/forgot-password1"
});
App.router({
	path: "/forgot-password2",
	type: "iFrame",
	htmlUrl: function () {
		return "shell/account/forgot-password2" + location.search
	}
});
App.router({
	path: "/new-password",
	type: "iFrame",
	htmlUrl: function () {
		return "shell/account/new-password" + location.search
	}
});
App.router({
	path: "/register",
	class: "open",
	htmlUrl: "shell/account/register"
});
App.router({
	path: "/set-password",
	type: "iFrame",
	htmlUrl: "shell/account/set-password"
});
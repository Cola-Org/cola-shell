cola(function (model) {
	if (!window._sha1Loaded) {
		$.ajax({
			type: "GET",
			url: "resources/sha1.js",
			dataType: "script",
			cache: true,
			success: function () {
				window._sha1Loaded = true;
				var shaObj = new jsSHA("SHA-1", "TEXT");
				shaObj.update(App.prop("token") || "");
				model.set("signature", shaObj.getHash("HEX"));
			}
		});
	}

	model.describe({
		email: {
			validators: ["required", "email"]
		},
		nickname: {
			validators: ["required", function (value) {
				if (value && value.match(/^[a-z][a-z0-9_\-\.\s]{1,18}[a-z0-9]$/i)) {
					return
				}
				return cola.resource("register.invalidNickname");
			}]
		},
		password: {
			validators: ["required", function (value) {
				if (value && value.length >= 8) {
					if (value.match(/[0-9]/) && value.match(/[a-z]/i)) {
						return
					}
				}
				return cola.resource("register.weakPassword");
			}]
		},
		password2: {
			validators: function (value) {
				if (value !== model.get("password")) {
					model.set("password2", null);
					return cola.resource("register.passwordNotMatch");
				}
			}
		},
		captcha: {
			validators: ["required", {
				$type: "length",
				min: 4,
				max: 4
			}]
		}
	});

	model.set({
		agree: true,
		newsLetter: true
	});

	model.action({
		resetCaptcha: function () {
			$("#captcha").attr("src", App.prop("captchaUrl") + "?" + (new Date()).getTime());
		}
	});

	model.widgetConfig({
		buttonSubmit: {
			$type: "button",
			class: "fluid green",
			caption: cola.resource("register.submit"),
			disabled: "{{agree?false:true}}",
			click: function () {
				var data = model.get();
				if (data.validate()) {
					cola.widget("formRegister").showDimmer();
					$.post("service/account/register", data).done(function (result) {
						cola.widget("formRegister").hideDimmer();
						if (result.success) {
							var forward = location.search;
							if (forward && forward.charAt(0) == "?") {
								forward = forward.substring(1);
							}
							App.open(forward || "/");
						}
						else {
							cola.alert(result.message);
						}
					}).fail(function () {
						cola.widget("formRegister").hideDimmer();
					});
				}
			}
		}
	});

	model.action.resetCaptcha();
});
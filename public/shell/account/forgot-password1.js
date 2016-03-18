cola(function (model) {
	model.describe({
		email: {
			validators: ["required", "email"]
		},
		captcha: {
			validators: ["required", {
				$type: "length",
				min: 4,
				max: 4
			}]
		}
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
			caption: cola.resource("forgotPassword.next"),
			click: function () {
				var data = model.get();
				if (data.validate()) {
					cola.widget("formVerify").showDimmer();
					$.post("service/account/sendVerifyEMail", data).done(function (result) {
						cola.widget("formVerify").hideDimmer();
						if (result.success) {
							App.open("forgot-password2?email=" + encodeURIComponent(model.get("email"))
								+ "&token=" + result.token);
						}
						else {
							cola.alert(result.message);
						}
					}).fail(function () {
						cola.widget("formVerify").hideDimmer();
					});
				}
			}
		}
	});

	model.action.resetCaptcha();
});
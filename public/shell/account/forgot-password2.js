cola(function (model) {
	var queryParam = $.parseQuery() || {};

	model.set({
		email: queryParam.email,
		token: queryParam.token
	});
	model.describe("code", {
		validators: ["required", {
			$type: "length",
			min: 6,
			max: 6
		}]
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
					$.post("service/account/verifyEMail", data).done(function (result) {
						cola.widget("formVerify").hideDimmer();
						if (result.success) {
							App.open("new-password?" + encodeURIComponent(result.token));
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
});
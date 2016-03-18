cola(function (model) {
	model.set("token", location.search.substring(1));
	model.describe({
		newPassword: {
			validators: ["required", function (value) {
				if (value && value.length >= 8) {
					if (value.match(/[0-9]/) && value.match(/[a-z]/i)) {
						return
					}
				}
				return cola.resource("register.weakPassword");
			}]
		},
		newPassword2: {
			validators: function (value) {
				if (value !== model.get("newPassword")) {
					model.set("newPassword2", null);
					return cola.resource("register.passwordNotMatch");
				}
			}
		}
	});

	model.widgetConfig({
		buttonSubmit: {
			$type: "button",
			class: "fluid green",
			caption: cola.resource("submit"),
			click: function () {
				var data = model.get();
				if (data.validate()) {
					cola.widget("formPassword").showDimmer();
					$.post("service/account/setPassword", data).done(function (result) {
						cola.widget("formPassword").hideDimmer();
						cola.alert(result.message);
						if (result.success) {
							App.open("login");
						}
					}).fail(function () {
						cola.widget("formPassword").hideDimmer();
					});
				}
			}
		}
	});
});
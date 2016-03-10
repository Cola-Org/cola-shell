cola(function (model) {
	cola.ready(function () {
		$(window).on("unreadAdviceCountChange", function (event, message) {
			var $messageCount = $("#messageCount");
			if (message.count > 0) {
				$messageCount.css("display", "inline-block").transition("bounce").text((message.count > 99) ? "N" : message.count);
			}
			else {
				$messageCount.css("display", "none");
			}
		}).on("cartItemChange", function (event, message) {
			var $cartItemCount = $("#cartItemCount");
			if (message.count > 0) {
				$cartItemCount.css("display", "inline-block").transition("bounce").text((message.count > 99) ? "N" : message.count);
			}
			else {
				$cartItemCount.css("display", "none");
			}
		}).on("newVersionAvailable", function () {
			$("#systemNotificaition").removeClass("hidden");
		});

		if (App.prop("availableVersion") > App.prop("version")) {
			$("#systemNotificaition").removeClass("hidden");
		}
	});
});
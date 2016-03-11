var $ = require("node-httpclient");

module.exports = {
	remotePath: "",

	get: function(path, cb) {
		var url;
		url = this.remotePath + path;
		return $.ajax({
			url: url,
			type: "GET",
			success: function(data, status) {
				return cb(data, status);
			}
		});
	},
	post: function(path, body, cb) {
		var url;
		url = "" + this.remotePath + path;
		console.log(body);
		return $.ajax(url, {
			data: body,
			type: "POST",
			complete: function(data, status, headers) {
				return cb(data, status);
			}
		});
	}
};
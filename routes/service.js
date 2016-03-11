var express = require("express");
var router = express.Router();
var proxy = require("./proxy");

if (proxy.remotePath) {
	router.get("*", function (req, res, next) {
		if (req.originalUrl.indexOf("/service/") >= 0) {
			return proxy.get(req.originalUrl, function (data, status) {
				return res.send(data);
			});
		}
	});
	router.post("*", function (req, res, next) {
		if (req.originalUrl.indexOf("/service/") >= 0) {
			return proxy.post(req.originalUrl, req.body, function (data, status) {
				return res.send(data);
			});
		}
	});
}

module.exports = router;

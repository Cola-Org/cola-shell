var express = require("express");
var router = express.Router();

var paths = [
    "/",
    "/home"
];
router.get(paths, function (req, res, next) {
    res.render("shell/index");
});

router.get("/shell/*", function (req, res, next) {
	var url = req.url, i = req.url.indexOf("?");
	if (i > 0) {
		url = url.substring(1, i);
	}
	res.render(url.substring(1));
});

module.exports = router;

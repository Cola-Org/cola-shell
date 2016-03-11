var express = require("express");
var router = express.Router();

router.get("/*", function (req, res, next) {
	var url = req.url, i = req.url.indexOf("?");
	if (i > 0) {
		url = url.substring(0, i);
	}
    res.render("frame" + url);
});

module.exports = router;

var maxImageSize = 1280;

function compressImage(sourceImgUrl, quality, callback){
	var mimeType = "image/jpeg";
	var quality = quality || 85;

	var sourceImg = new Image();
	sourceImg.src = sourceImgUrl;
	var cvs = document.createElement('canvas');

	setTimeout(function() {
		var w = sourceImg.naturalWidth, h = sourceImg.naturalHeight, ratio = 1;
		if (w > maxImageSize || h > maxImageSize) {
			if (w > h) {
				ratio = maxImageSize / w;
				w = maxImageSize;
				h = Math.round(h * ratio);
			}
			else {
				ratio = maxImageSize / h;
				h = maxImageSize;
				w = Math.round(w * ratio);
			}
		}

		cvs.width = w;
		cvs.height = h;
		cvs.getContext("2d").drawImage(sourceImg, 0, 0, w, h);
		callback(cvs.toDataURL(mimeType, quality / 100));
	}, 100);
}

function parseVideoUrl(url) {
	var s, result;
	if (s = url.match(/(youtu.be|youtube.com)\/([a-z0-9A-Z]+)/)){
		result = {
			type: "youtube",
			code: s[2]
		}
	}
	return result;
}

function viewImage(url) {
	var imageViewerLayer = cola.widget("imageViewerLayer");
	if (!imageViewerLayer) {
		var fragment = cola.xRender({
			id: "imageViewerLayer",
			"c-widget": {
				$type: "layer",
				animation: "scale",
				click: function(self) {
					self.hide();
				}
			},
			content: {
				id: "imageViewer"
			}
		});
		document.body.appendChild(fragment);
		imageViewerLayer = cola.widget("imageViewerLayer");
	}

	$("#imageViewer").css("background-image", "url(" + url + ")");
	imageViewerLayer.show();
}

function playVideo(type, videoCode) {
	var url;
	if (!type || type == "youtube") {
		url = "https://www.youtube.com/embed/" + videoCode + "?autoplay=true";
	}
	if (!url) return;

	var videoPlayerLayer = cola.widget("videoPlayerLayer");
	if (!videoPlayerLayer) {
		var fragment = cola.xRender({
			id: "videoPlayerLayer",
			"c-widget": {
				$type: "layer",
				click: function(self) {
					self.hide(function() {
						cola.widget("videoPlayer").open("about:blank");
					});
				}
			},
			content: {
				class: "v-box",
				style: {
					height: "100%"
				},
				content: [
					{
						class: "box header-bar",
						content: [
							{
								class: "back-button",
								"c-widget": {
									$type: "button",
									icon: "chevron left",
									click: function () {
										videoPlayerLayer.hide();
									}
								}
							},
							{
								class: "title",
								"c-bind": "=resource('video')"
							}
						]
					},
					{
						class: "flex-box",
						content: {
							id: "videoPlayer",
							"c-widget": "iFrame"
						}
					}
				]
			}
		});
		document.body.appendChild(fragment);
		videoPlayerLayer = cola.widget("videoPlayerLayer");
		videoPlayerLayer.get$Dom().find(".ui.iframe").attr("allowfullscreen", true);
	}
	cola.widget("videoPlayer").open(url);
	videoPlayerLayer.show();
}
cola(function (model) {
	model.set("channels", App.channels);
	model.get("channels").each(function(e){
		if(e.get("path") == location.pathname){
			e.set("selected",true);
		}
	});
	model.action({
		getSubViewName: function(name) {
			return "subView" + cola.util.capitalize(name);
		},
		onClick: function(channel){
			model.get("channels").each(function(e){
				e.set("selected",false);
			});
			channel.set("selected",true);
		}
	});
});
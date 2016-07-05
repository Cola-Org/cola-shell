var buildConfig = require("./build-configs");

module.exports = function (grunt) {
	grunt.initConfig({
		build: buildConfig,

		clean: {
			dest: ["dest"]
		},

		jade: {
			compile: {
				options: {
					//pretty: true,
					data: {
						siteRoot: "<%=configure.siteRoot%>",
						contextPath: "<%=configure.contextPath%>",
						servicePrefix: "<%=configure.servicePrefix%>",
						serviceSuffix: "<%=configure.serviceSuffix%>",
						htmlSuffix: "<%=configure.htmlSuffix%>"
					}
				},
				files: [ {
					expand: true,
					cwd: "views/",
					src: "**/*.jade",
					dest: "<%=configure.dest%>",
					ext: ".html"
				}]
			}
		},

		less: {
			compile: {
				files: [{
					expand: true,
					cwd: "public/",
					src: "**/*.less",
					dest: "<%=configure.dest%>",
					ext: ".css"
				}]
			}
		},

		copy: {
			commonjs: {
				expand: true,
				cwd: "public",
				src: "common.js",
				dest: "<%=configure.dest%>",
				options: {
					process: function (content, srcPath) {
						if (srcPath == "public/common.js") {
							var newConfigs = [];
							var configure = grunt.config("configure");

							for (var p in configure) {
								if (configure.hasOwnProperty(p)) {
									var v = configure[p];
									if (typeof v == "string") v = "\"" + v + "\"";
									newConfigs.push(p + " = " + v + ";");
								}
							}

							content.replace(/\/\/ REPLACE_START[\s\S]*\/\/ REPLACE_END/, newConfigs.join("\n\t\t"));
						}
						return content;
					}
				}
			},
			appCacheManifest: {
				expand: true,
				cwd: "public",
				src: "appcache.manifest",
				dest: "<%=configure.dest%>",
				options: {
					process: function (content, srcPath) {
						var configure = grunt.config("configure");
						if (!configure.htmlSuffix) return content;

						var lines = content.split("\n");
						if (lines.length < 2) lines = content.split("\r");
						var i, line;
						for (i = 0; i < lines.length; i++) {
							line = lines[i];
							line = line.replace(/\r/g, "");
							if (line && line.substring(0, 6) === "card/" && line.indexOf(".") < 0) {
								lines[i] = line + configure.htmlSuffix;
							}
						}
						return lines.join("\n");
					}
				}
			},
			css: {
				expand: true,
				cwd: "public",
				src: ["resources/**/*"],
				dest: "<%=configure.dest%>"
			},
			res: {
				expand: true,
				cwd: "public",
				src: ["**/*", "!test/**", "!resources/**",  "!**/*.less", "!**/*.css", "!.**", "!common.js", "!appcache.manifest"],
				dest: "<%=configure.dest%>"
			}
		},

		uglify: {
			all: {
				files: [
					{
						expand: true,
						preserveComments: "some",
						cwd: "<%=configure.dest%>",
						src: "resources/**/*.js",
						dest: "<%=configure.dest%>",
						ext: ".js"
					}
				]
			}
		},

		cssmin: {
			all: {
				files: [
					{
						expand: true,
						cwd: "<%=configure.dest%>",
						src: "**/*.css",
						dest: "<%=configure.dest%>",
						ext: ".css"
					}
				]
			}
		}
	});

	grunt.loadNpmTasks("grunt-contrib-clean");
	grunt.loadNpmTasks("grunt-contrib-jade");
	grunt.loadNpmTasks("grunt-contrib-less");
	grunt.loadNpmTasks("grunt-contrib-copy");
	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks("grunt-contrib-cssmin");
	grunt.loadNpmTasks("grunt-contrib-compress");

	grunt.task.registerMultiTask("build", "Build all...", function() {
		function endWithDelim(path) {
			if (path.charAt(path.length - 1) != "/") path += "/";
			return path;
		}
		function removeLastDelim(path) {
			if (path.charAt(path.length - 1) == "/") path = path.substring(0, path.length - 1);
			return path;

		}

		grunt.log.writeln("# Running \"" + this.target + "\"...");

		var configure = this.data;
		configure.dest = "dest/" + this.target;
		configure.contextPath = removeLastDelim(configure.contextPath);
		configure.servicePrefix = endWithDelim(configure.servicePrefix);
		grunt.config("configure", configure);

		if (!grunt._cleaned) {
			grunt._cleaned = true;
			grunt.task.run("clean");
		}
		grunt.task.run(["jade", "less", "copy", "uglify", "cssmin"]);
	});
};

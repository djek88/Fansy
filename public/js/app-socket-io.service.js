'use strict';

angular
	.module('app')
	.factory('socketIO', socketIO);

function socketIO($rootScope) {
	var streamSocket = null;

	return {
		toStream: streamNsp
	};

	function streamNsp(url, userName) {
		if (streamSocket) {
			if (streamSocket.disconnected) streamSocket.connect();
		} else {
			streamSocket = io(url, {path: '/sockets'});
			injectAngularApply(streamSocket);

			streamSocket.onSuccessAuth = function() {};
			streamSocket.onFailAuth = function() {};

			streamSocket.on('connect', function() {
				this.emit('authentication', {userName: userName});
			});
			streamSocket.on('authenticated', onAuthenticated);
			streamSocket.on('unauthorized', onUnauthorized);
		}

		return streamSocket;
	}

	function onAuthenticated() {
		this.onSuccessAuth();
	}

	function onUnauthorized() {
		this.onFailAuth();
	}

	function injectAngularApply(socket) {
		var on = socket.on;
		var emit = socket.emit;

		socket.on = function() {
			var cb = arguments[arguments.length - 1];

			arguments[arguments.length - 1] = function() {
				var self = this;
				var args = arguments;

				$rootScope.$apply(function() {
					cb.apply(self, args);
				});
			};

			return on.apply(this, arguments);
		};

		socket.emit = function() {
			if ('function' == typeof arguments[arguments.length - 1]) {
				var cb = arguments[arguments.length - 1];

				arguments[arguments.length - 1] = function() {
					var self = this;
					var args = arguments;

					$rootScope.$apply(function() {
						cb.apply(self, args);
					});
				}
			}

			return emit.apply(this, arguments);
		};
	}
}
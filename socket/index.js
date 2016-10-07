var keystone = require('keystone');
var socketAuth = require('socketio-auth');
var async = require('async');

module.exports = Socket;

function Socket(server) {
	var io = require('socket.io')(server, {path: '/sockets'});

	var streamNsp = require('./stream-nsp')(io);

	socketAuth(streamNsp, {authenticate: authenticate});

	return io;

	function authenticate(socket, data, cb) {
		// Stub
		cb(null, true);
	}
}
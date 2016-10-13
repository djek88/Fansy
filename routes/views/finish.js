var keystone = require('keystone');
var Stream = keystone.list('Stream');
var request = require('superagent');

exports = module.exports = function (req, res) {
	var sid = req.params.sid;

	Stream.model.findById(sid).exec(function (err, stream) {
		stream.status = 'finished';
		stream.save();

		// Emit refresh page event for sockets
		var url = process.env.IP + ':' + process.env.PORT + '/dashboard/' + sid + '/refresh';
		setTimeout(function() {
			request.get(url).end(function() {});
		}, 500);

		res.status(301).redirect('/dashboard/');
	});
}
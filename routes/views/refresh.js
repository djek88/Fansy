var keystone = require('keystone');

module.exports = function(req, res) {
	var streamNsp = keystone.get('io').nsps['/stream'];

	streamNsp.emit('refresh_page');
	res.redirect('/dashboard/' + req.params.sid + '/error/0');
}
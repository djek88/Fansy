var keystone = require('keystone');
var Stream = keystone.list('Stream');
var User = keystone.list('User');

var parseCookies = require('../../lib/shared').parseCookies;

exports = module.exports = function(req, res) {
	var view = new keystone.View(req, res);
	var locals = res.locals;
	var cookies = parseCookies(req);

	locals.streamSocketUrl = process.env.APP_DOMAIN + 'stream';
	locals.mixpanel = process.env.MIXPANEL;

	view.on('init', function (next) {
		Stream.model.findOne({'status': 'live'}).populate('game').exec(function (err, stream) {
			if (err || !stream) return next(err);

			locals.stream = stream;
			locals.token = cookies['fansy.token'];

			if (locals.token) {
				User.model.findOne({'token': locals.token})
					.exec(function (err, user) {
						locals.user = user;
						next(err);
					});
			} else {
				locals.user = false;
				next(err);
			}
		});
	});

	view.render('index');
};

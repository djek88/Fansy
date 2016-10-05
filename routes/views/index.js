var keystone = require('keystone');
var Stream = keystone.list('Stream');
var User = keystone.list('User');

function parseCookies(req) {
	var result = {};
	var cookie = req.headers.cookie;
	var cookiesArr = cookie && cookie.split(';');

	cookiesArr.forEach(function(cookie) {
		var parts = cookie.split('=');
		result[parts.shift().trim()] = decodeURI(parts.join('='));
	});

	return result;
}

exports = module.exports = function(req, res) {
	var view = new keystone.View(req, res);
	var locals = res.locals;
	var cookies = parseCookies(req);
	var mixpanel = keystone.get('mixpanel');

	locals.url = process.env.URL;
	locals.mixpanel = process.env.MIXPANEL;

	view.on('init', function (next) {
		Stream.model.findOne({ 'status': 'live' }).populate('game').exec(function (err, stream) {
			if (err || !stream) return next(err);

			locals.stream = stream;
			locals.token = cookies['fansy.token'];

			if (locals.token) {
				User.model.findOne({'token': locals.token })
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

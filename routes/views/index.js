var keystone = require('keystone');
var Template = keystone.list('Template');
var Question = keystone.list('Question');
var Stream = keystone.list('Stream');
var User = keystone.list('User');

function parseCookies (request) {
    var list = {},
        rc = request.headers.cookie;

    rc && rc.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}


exports = module.exports = function (req, res) {

	var view = new keystone.View(req, res);
	var locals = res.locals;
	var cookies = parseCookies(req);
	var socket = keystone.get('io');
	var mixpanel = keystone.get('mixpanel');
	locals.url = process.env.URL;
	locals.mixpanel = process.env.MIXPANEL;
	
	view.on('init', function (next) {

		Stream.model.findOne({ 'status': 'live' }).populate('game').exec(function (err, stream) {
			
			if(stream == null){
				next(err);
			}
			else{
				
				locals.stream = stream;
				locals.token = cookies['fansy.token'];
				
				if(locals.token){
					User.model.findOne({'token': locals.token }).exec(function (err, user) {
						locals.user = user;
						next(err);
					});
				}
				else{
					locals.user = false;
					next(err);
				}
				
			}
			
		});

	});
	
	
	
	view.render('index');
};

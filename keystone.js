// Simulate config options from your production environment by
// customising the .env file in your project's root folder.
require('dotenv').config();

// Require keystone
var keystone = require('keystone');
var Twig = require('twig');
var io = require('socket.io');
var Mixpanel = require('mixpanel');

var randtoken = require('rand-token');
// Initialise Keystone with your project's configuration.
// See http://keystonejs.com/guide/config for available options
// and documentation.
var mixpanel = Mixpanel.init('c4b9a4c39383dbad6336bcca4b258778');

keystone.set('mixpanel', mixpanel);

keystone.init({
	'name': 'fansy.tv',
	'brand': 'fansy.tv',

	'less': 'public',
	'static': 'public',
	'favicon': 'public/favicon.ico',
	'views': 'templates/views',
	'view engine': 'twig',

	'twig options': { method: 'fs' },
	'custom engine': Twig.render,

	'auto update': true,
	'session': true,
	'auth': true,
	'user model': 'Admin',

	//'mongo':'http://localhost:27017'
});

// Load your project's Models
keystone.import('models');

// Setup common locals for your templates. The following are required for the
// bundled templates and layouts. Any runtime locals (that should be set uniquely
// for each request) should be added to ./routes/middleware.js
keystone.set('locals', {
	_: require('lodash'),
	env: keystone.get('env'),
	utils: keystone.utils,
	editable: keystone.content.editable,
});

// Load your project's Routes
keystone.set('routes', require('./routes'));

// Configure the navigation bar in Keystone's Admin UI
keystone.set('nav', {
	users: 'users',
	templates: 'templates',
	streams: 'streams',
});

// Start Keystone to connect to your database and initialise the web server
keystone.start({
	onHttpServerCreated: function(){
		keystone.set('io', io.listen(keystone.httpServer));
		keystone.set('users', {});

		var sio = keystone.get('io');
		var User = keystone.list('User');
		var Prediction = keystone.list('Prediction');
		var Question = keystone.list('Question');
		var users = keystone.get('users');

		sio.sockets.on('connection', function (socket) {

			socket.on('question', function (data) {
				User.model.findOne({ 'token': data.token }).exec(function (err, user) {
					var newPrediction = new Prediction.model({
						user: user.id,
						question: data.question,
						answer: data.answer,
						status: 'active',
						stream: data.stream,
						answerText: data.answerText,
					});

					newPrediction.save(function(err) {
						Prediction.model.find({'stream': data.stream })
							.populate('user')
							.exec(function (err, predictions) {
							socket.emit('leader', predictions);
						});

						User.model.findOne({'token': data.token }).exec(function (err, user) {
							if(user) {
								Prediction.model.find()
									.where({'user': user.id})
									.where({'status': 'active'})
									.where({'stream': data.stream })
									.populate('question')
									.sort( { updated_at: -1 } )
									.exec(function(err, predictions) {
										socket.emit('active_predictions', predictions);
									});

								Prediction.model.find()
									.where({'user': user.id})
									.where({'status': { $ne: 'active'}})
									.where({'stream': data.stream })
									.populate('question')
									.sort( { updated_at: -1 } )
									.exec(function(err, predictions) {
										socket.emit('finished_predictions', predictions);
									});

								Prediction.model.find({}, { question:1, _id:0 })
									.where({ 'user': user.id })
									.where({ 'status': 'active' })
									.where({ 'stream': data.stream })
									.exec(function(err, predictions) {
										predictions = predictions.map(function(e) {
											return e.question;
										});

										Question.model.find({_id: { $in: predictions }}, {goal:1, adminTimer:1, _id:0})
											.where({'timing':'true'})
											.exec(function(err, timers) {
												socket.emit('timer', { 
													timers: timers,
													time: new Date().getTime()
												});
											});
									});
							}
						});
					});
				});
			});

			socket.on('open', function(data) {
				socket.token = data.token;
			});

			socket.on('first', function(data) {
				Prediction.model.find({ 'stream': data.stream })
					.populate('user')
					.exec(function (err, predictions) {
						socket.emit('leader', predictions);
					});

				User.model.findOne({'token': data.token }).exec(function (err, user) {
					if(user){
						Prediction.model.find()
							.where({ 'user': user.id })
							.where({ 'status': 'active' })
							.where({ 'stream': data.stream })
							.populate('question')
							.sort({ updated_at: -1 })
							.exec(function(err, predictions) {
								socket.emit('active_predictions', predictions);
							});

						Prediction.model.find()
							.where({ 'user': user.id })
							.where({ 'status': {$ne: 'active'} })
							.where({ 'stream': data.stream })
							.populate('question')
							.sort({ updated_at: -1 })
							.exec(function(err, predictions) {
								socket.emit('finished_predictions', predictions);
							});

						Prediction.model.find({},{question:1, _id:0})
							.where({'user': user.id})
							.where({'status': 'active'})
							.where({'stream': data.stream })
							.exec(function(err, predictions) {
								predictions = predictions.map(function(e) {
									return e.question;
								});

								Question.model.find(
										{_id: {$in: predictions}},
										{goal: 1, adminTimer: 1, _id: 0}
									)
									.where({'timing':'true'})
									.exec(function(err, timers) {
										socket.emit('timer', {timers: timers, time: new Date().getTime()});
									});
							});
					}
				});
			})

			socket.on('auth', function (data) {
				User.model.findOne({'username': data.username }).exec(function (err, user) {
					if (user){
						socket.emit('auth', {'type': 'error', 'username': data.username});
					} else {
						var newUser = new User.model({
							username: data.username,
							token: randtoken.generate(16)
						});

						newUser.save(function(err) {
							socket.token = newUser.token;
							socket.emit('auth', {'type': 'success', 'token': newUser.token, 'username': data.username});
						});
					}
				});
			});

			socket.on('timer', function(data) {

			});

			socket.on('predictions', function(data) {

			});
		});
	}
});
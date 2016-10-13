// Simulate config options from your production environment by
// customising the .env file in your project's root folder.
require('dotenv').config();

// Require keystone
var keystone = require('keystone');
var Twig = require('twig');
var io = require('socket.io');

// Initialise Keystone with your project's configuration.
// See http://keystonejs.com/guide/config for available options
// and documentation.

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
});

// Load your project's Models
keystone.import('models');

// Setup common locals for your templates. The following are required for the
// bundled templates and layouts. Any runtime locals (that should be set uniquely
// for each request) should be added to ./routes/middleware.js
var env = process.env;
var isProduction = process.env.NODE_ENV === 'production';

keystone.set('locals', {
	env: env.NODE_ENV,
	isProduction: isProduction,
	mixpanel: isProduction ? env.MIXPANEL_PROD : env.MIXPANEL_DEV,
	intercom: isProduction ? env.INTERCOM_PROD : env.INTERCOM_DEV,
	streamSocketUrl: (isProduction ? env.APP_DOMAIN : env.IP + ':' + env.PORT + '/') + 'stream',

	_: require('lodash'),
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
	onHttpServerCreated: function() {
		keystone.set('io', require('./socket')(keystone.httpServer));
	}
});
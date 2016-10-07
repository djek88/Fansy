// Simulate config options from your production environment by
// customising the .env file in your project's root folder.
require('dotenv').config();

// Require keystone
var keystone = require('keystone');
var Twig = require('twig');
var io = require('socket.io');
var Mixpanel = require('mixpanel');

// Initialise Keystone with your project's configuration.
// See http://keystonejs.com/guide/config for available options
// and documentation.

keystone.set('mixpanel', Mixpanel.init('c4b9a4c39383dbad6336bcca4b258778'));

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
	onHttpServerCreated: function() {
		keystone.set('io', require('./socket')(keystone.httpServer));
		keystone.set('users', {});
	}
});
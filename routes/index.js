/**
 * This file is where you define your application routes and controllers.
 *
 * Start by including the middleware you want to run for every request;
 * you can attach middleware to the pre('routes') and pre('render') events.
 *
 * For simplicity, the default setup for route controllers is for each to be
 * in its own file, and we import all the files in the /routes/views directory.
 *
 * Each of these files is a route controller, and is responsible for all the
 * processing that needs to happen for the route (e.g. loading data, handling
 * form submissions, rendering the view template, etc).
 *
 * Bind each route pattern your application should respond to in the function
 * that is exported from this module, following the examples below.
 *
 * See the Express application routing documentation for more information:
 * http://expressjs.com/api.html#app.VERB
 */

var keystone = require('keystone');
var middleware = require('./middleware');
var importRoutes = keystone.importer(__dirname);

// Common Middleware
keystone.pre('routes', middleware.initErrorHandlers);
keystone.pre('routes', middleware.initLocals);
keystone.pre('render', middleware.flashMessages);
 
// Handle 404 errors
keystone.set('404', function(req, res, next) {
	res.notfound();
});

// Handle other errors
keystone.set('500', function(err, req, res, next) {
	var title, message;
	if (err instanceof Error) {
		message = err.message;
		err = err.stack;
	}
	res.err(err, title, message);
});

// Import Route Controllers
var routes = {
	views: importRoutes('./views')
};

// Setup Route Bindings
exports = module.exports = function (app) {
	// Views
	app.get('/', routes.views.index);
	app.get('/dashboard/', middleware.requireUser, routes.views.dashboards);

	app.get('/dashboard/:sid/error/:error', middleware.requireUser, routes.views.dashboard);

	app.get('/dashboard/:sid/finish', middleware.requireUser, routes.views.finish);
	app.get('/dashboard/:sid/start', middleware.requireUser, routes.views.start);
	app.get('/dashboard/:sid/push/:id', middleware.requireUser, routes.views.push);
	// send to sockets refresh event
	app.get('/dashboard/:sid/refresh', routes.views.refresh);
	// route for handle admin answer for question
	app.get('/dashboard/:sid/question/:type/:id', middleware.requireUser, routes.views.question);

	// route for auto close question after question timer finished
	app.get('/front/:sid/question/:type/:id', routes.views.question);

	// For modify template on dashboard page
	app.post('/dashboard/template', middleware.requireUser, routes.views.template);
};

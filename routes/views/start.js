var keystone = require('keystone');
var async = require('async');
var Template = keystone.list('Template');
var Question = keystone.list('Question');
var Stream = keystone.list('Stream');

exports = module.exports = function (req, res) {

	var sid = req.params.sid;
	var flag = true;
	Stream.model.find().exec(function(err, result) {
    	
    	result.forEach(function(e) {
    		if(e.status=='live'){
    			flag = false;
    		}
    	})
    	
    	if(flag){
	    	Stream.model.findById(sid).exec(function (err, stream) {
				stream.status = 'live';
				stream.save();
				res.status(301).redirect('/dashboard/' + sid + '/error/0');
			});
    	}
    	else{
    		res.status(301).redirect('/dashboard/' + sid + '/error/1');
    	}
    	

    	
    })
	
	
}
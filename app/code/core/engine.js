

var     request = require('request')
    ,   assert  = require('assert')
    ,   _       = require('underscore')
    ,	async   = require('async')
    ,	domain  = require('domain')
        
    ,   database    = use('database')
    ,   essence     = use('essence')
    ,	authentication = use('authentication')
    ,	message = use('message')
    ,	email   = use('email')

    ;

var engine = exports;

var _queue;

var _concurrency = 2;

engine.start = 
    function()
    {
        var d = domain.create();
        
        d.on('error', function(err) {
            console.error('Engine error:');
            console.error(err.stack);
            
            // Send error email to daddy
            email.sendErrorMessage(err, 
                function(err) {
                    if (err) {
                    	console.error('Failed to sent error email:');
                        console.error(err.stack);
                    }
                });
        });
        
        d.run(function() {
            setTimeout( _pass, 10 * 1000); // do the first pass if needed...
            
            setInterval( _pass, 60 * 60 * 1000); // every hour
        })
    };
    
function _pass()
{
    engine.pass(
        function(err, results)
        {
            if (err) {
                console.error('engine.pass error:');
                console.error(err);
            }
            else {
                console.log('engine.pass results:');
                console.log(results);
            }
        });
}

function _shouldDeliver(userEntry) // returns options
{
    if (!userEntry.email || 
    	!userEntry.vipList || 
        userEntry.vipList.length == 0) {
        return false;
    }

    if (userEntry.deliveryDate) {
        var now = new Date();
        var lastDeliveryDate = new Date(userEntry.deliveryDate);
        var timediff = now - lastDeliveryDate;

        return (timediff > 23 * 60 * 60 * 1000);
    }
    
    return true;
}

engine.pass = 
    function(callback /* (err, results) */)
    {
        var error       = 0;
        var skipped     = 0;
        var delivered   = 0;

        database.getCursorOnUsers(
            function(err, cursor)
            {
                if (err)
                    return callback(err);
                    
                _processCursor(cursor)
            });
        
        // =====
        
        function _processCursor(cursor)
        {
           cursor.nextObject(
                function(err, userEntry)
                {
                    if (err || userEntry == null) {
                        return callback(null, { 
                                    error:      error
                                ,   skipped:    skipped
                                ,   delivered:  delivered
                                } );
                    }
                    
                    var currentDeliveryDate = new Date();
                    
                    if (!_shouldDeliver(userEntry)) {
                        skipped++;
                        return _processCursor(cursor);
                    }

                    _sendEssence(userEntry, 
                        function(err) {
                            if (err) {
                                if (!userEntry.deliveryError)
                                    userEntry.deliveryError = { count: 0 };
                                    
                                if (err.message)
                                    userEntry.deliveryError.message = err.message;
                                    
                                if (err.stack)
                                    userEntry.deliveryError.message = err.stack;
                                
                                userEntry.deliveryError.count++;
                                error++
                            }
                            else
                            {
                                userEntry.deliveryDate = currentDeliveryDate;
                                delivered++;
                            }
                            
                            console.log('OK ' + userEntry.twitter.user.name );
                            
                            database.saveUserEntry(userEntry, 
                                function(err, userEntry)
                                {
                                    if (err) {
                                        console.error('Failed to save user entry:');
                                        console.error(err.stack);
                                    }
                                    
                                    _processCursor(cursor);
                                });
                        });
                });
        }
    };


function _firstTimeDate()
{
    var result = new Date();
    result.setDate(result.getDate() - 2); // 2 days ago
    return result;    
}


engine.getEssenceMessageForUser =
    function(userEntry, callback /* (err, html) */)
    {
        console.log('-> ' + userEntry.twitter.user.name);
        
        var oauth = authentication.makeOAuth(userEntry.twitter.oauth);
        
        if (!userEntry.email || !userEntry.vipList || userEntry.vipList.length == 0)
            return callback(null);

        var sinceDate;
        
        if (userEntry.deliveryDate)
            sinceDate = userEntry.deliveryDate;
        else
            sinceDate = _firstTimeDate();
            
        essence.getAugmentedVipList(oauth, userEntry, { sinceDate: sinceDate },
            function(err, vipList)
            {
                if (err)
                    return callback(err);
                
                message.make(userEntry, vipList, {}, callback);
            });
    };
    

function _sendEssence(userEntry, callback /* (err) */)
{
    console.log('-> ' + userEntry.twitter.user.name);

    engine.getEssenceMessageForUser(userEntry,
        function(err, htmlMessage)
        {
            if (err)
                return callback(err);
            
            var userEmail = process.env.ADMIN_EMAIL_ADDRESS;
            var userName  = userEntry.twitter.user.name;

            email.sendEssenceTo(userName, userEmail, htmlMessage, callback);
        });
}


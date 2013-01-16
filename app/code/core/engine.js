

var     request = require('request')
    ,   assert  = require('assert')
    ,   _       = require('underscore')
    ,	async   = require('async')
    ,	domain  = require('domain')
    ,	moment  = require('moment')
        
    ,   database    = use('database')
    ,   essence     = use('essence')
    ,	authentication = use('authentication')
    ,	message = use('message')
    ,	email   = use('email')
    
    ,   package = require('./../../package.json')


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
            setTimeout( _pass, 500);
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
                console.log('engine.pass v' + package.version + ' results:');
                console.log(results );
            }
        });
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
                    
                    //_trackStats(userEntry);
                    
                    if (!_shouldDeliverForUser(userEntry)) {
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
                                error++;
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

function _timeElapsedSinceLastDelivery(userEntry)
{
    var nowUTC = moment.utc();
    var lastDelivery = moment( new Date(userEntry.deliveryDate) );
    var deliveryDiff = nowUTC - lastDelivery ;
    
    return deliveryDiff;
}

function _hrFromMilli(milliseconds)
{
    return Math.round(milliseconds / 1000 / 60 / 60, 2);
}

function _milliForHr(hours)
{
    return hours * 1000 * 60 *60;
}

function _shouldDeliverForUser(userEntry)
{
    if (!userEntry.email || 
    	!userEntry.vipList || 
        userEntry.vipList.length == 0) {
        return false;
    }

    var name = userEntry.twitter.user.name;

    var nextDelivery     = _timeUntilNextDelivery(userEntry);
    var pastDeliveryDiff = _timeElapsedSinceLastDelivery(userEntry);
    
/*    
    console.log(name + ':');
    console.log('  | next: ' + _hrFromMilli(nextDelivery)     + ' hours');
    console.log('  | past: ' + _hrFromMilli(pastDeliveryDiff) + ' hours');
*/
    
    var result = ( nextDelivery     > _milliForHr(23) ) && 
                 ( pastDeliveryDiff > _milliForHr(20) );
    
//  console.log('  | should deliver: ' + result );
    
    return result;
}



function _timeUntilNextDelivery(userEntry) // in milliseconds
{
    var userOffsetFromUTC = userEntry.twitter.user.utc_offset;

    var nowUTC = moment.utc();
    var sodUTC = moment.utc().sod();    // Start of day
    
    var whenToFireInDay = 19 * 60 * 60; // 7pm, seconds
    
    var addSeconds = whenToFireInDay - userOffsetFromUTC;
    
    var scheduledFireForUser  = sodUTC.add('seconds', addSeconds);

    var diff = scheduledFireForUser - nowUTC;
    
    if (diff < 0){
        scheduledFireForUser.add('days', 1);
        diff = scheduledFireForUser - nowUTC;
    }
    
    return diff;
}


function _firstTimeDate()
{
    var result = new Date();
    result.setDate(result.getDate() - 2); // 2 days ago
    return result;    
}


function _sendEssence(userEntry, callback /* (err) */)
{
    console.log('-> ' + userEntry.twitter.user.name);

    engine.getEssenceMessageForUser(userEntry,
        function(err, htmlMessage)
        {
            if (err)
                return callback(err);
            
            //var userEmail = process.env.ADMIN_EMAIL_ADDRESS;
            
            var userEmail = userEntry.email;
            var userName  = userEntry.twitter.user.name;
            
            console.log(' => delivery to: ' + userName + ' <' + userEmail + '>');
            
            email.sendEssenceTo(userName, userEmail, htmlMessage, callback);
        });
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


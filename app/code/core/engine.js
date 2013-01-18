
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

if (process.env.SUBDOMAIN == undefined)
{
    engine.debugModeEmail        = true; // send email all to admin, 
    engine.debugModeDeliveryDate = true; // don't change deliveryDate if set to true
}

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
            setInterval( _pass, 30 * 60 * 1000); // every 1/2 hour
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
        var error           = 0;
        var skipped         = 0;
        var delivered       = 0;
        var deliveredTest   = 0;

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
                                    error:      	error
                                ,   skipped:        skipped
                                ,   delivered:      delivered
                                ,   deliveredTest:  deliveredTest
                                } );
                    }
                    
                    _processUserEntry(userEntry, 
                        function(state){
                            if (state == kDeliveryState)
                                delivered++;
                            else if (state == kTestDeliveryState)
                                deliveredTest++;
                            else if (state == kSkipState)
                                skipped++;
                            else if (state == kErrorState)
                                error++;
                            else
                                console.error('Unknown state retured: ' + state);
                                
                            _processCursor(cursor);
                        });
                });
        }
    };


var kDeliveryState      = 'DELIVERY';
var kTestDeliveryState  = 'TEST-DELIVERY';
var kSkipState      = 'SKIP';
var kErrorState     = 'ERROR';

function _processUserEntry(userEntry, callback /* ( state ) */ )
{
    var currentDeliveryDate = new Date();

    if (!_shouldDeliverForUser(userEntry))
        return callback( kSkipState );

/*
    if (process.env.SUBDOMAIN == undefined) {
        console.log('will deliver to ' + userEntry.email);
        return callback(kDeliveryState);
    }
*/

    var deliveryOptions = {};

    var state = kDeliveryState;

    if (engine.debugModeEmail){
        deliveryOptions.email = process.env.ADMIN_EMAIL_ADDRESS;
        state = kTestDeliveryState;
    }

    engine.deliverEssenceToUser(userEntry, deliveryOptions,
        function(err)
        {
            if (err) {
                state = kErrorState;
            
                if (!userEntry.deliveryError)
                    userEntry.deliveryError = { count: 0 };
                    
                if (err.message)
                    userEntry.deliveryError.message = err.message;
                    
                if (err.stack)
                    userEntry.deliveryError.message = err.stack;
                
                userEntry.deliveryError.count++;
            }
            else {
                if (!engine.debugModeDeliveryDate) {
                    userEntry.deliveryDate = currentDeliveryDate;
                    state = kTestDeliveryState;
                }
                    
                delete userEntry.deliveryError;
            }
            
            console.log('Delivered to: ' + userEntry.email );
            
            database.saveUserEntry(userEntry, 
                function(err, userEntry)
                {
                    if (err) {
                        console.error('Failed to save user entry:');
                        console.error(err.stack);
                    }
                    
                    callback(state);
                });
        });
}


function _timeElapsedSinceLastDelivery(userEntry)
{
    var nowUTC = moment.utc();
    var lastDelivery = moment( new Date(userEntry.deliveryDate) );
    var deliveryDiff = nowUTC - lastDelivery ;
    
    return deliveryDiff;
}


function _isTheRightTime(userEntry)
{
    var name = userEntry.twitter.user.name;

    var nowUTC = moment.utc();
    
    var userOffsetFromUTC = userEntry.twitter.user.utc_offset;

    var nowInUserTime = moment.utc();
    nowInUserTime.add('seconds', userOffsetFromUTC);
    
    var hoursInUserTime = nowInUserTime.hours();
    
    var dateFormat = 'HH:mm (D MMM)';
    // Correct delivery time
    if ( hoursInUserTime >= 19 && hoursInUserTime <= 20 )
    {
        console.log('  | Right time: ' + nowInUserTime.format(dateFormat) );
        
        if (!userEntry.deliveryDate){ // we have no delivery date... let's go for it...
            console.log('  | no delivery date');
            return true;
        }
        
        var lastDelivery = moment( new Date(userEntry.deliveryDate) );
        var deliveryDiff = nowUTC - lastDelivery ;
        
        var hoursFromLastDelivery = _hrFromMilli(deliveryDiff);
        
        console.log('  | last delivery was ' + hoursFromLastDelivery + ' hours ago');
        
        // And we haven't just sent it
        return ( hoursFromLastDelivery > 3)
    }
    else
        console.log('  | Not right time: ' + nowInUserTime.format(dateFormat) );

    
    return false;
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
    var name = userEntry.twitter.user.name;

    console.log(name + ':');

    if (!userEntry.email || 
    	!userEntry.vipList || 
        userEntry.vipList.length == 0) {
        console.log('  | not setup');
        return false;
    }

    if (userEntry.disabled) {
        console.log('  | disabled');
        return false;
    }
    
    return _isTheRightTime(userEntry);
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


engine.deliverEssenceToUser =
    function(userEntry, options, callback /* (err) */)
    {
        console.log('Delivering Essence to: ' + userEntry.twitter.user.name);

        engine.getEssenceMessageForUser(userEntry,
            function(err, htmlMessage)
            {
                if (err)
                    return callback(err);
                
                var userEmail = userEntry.email;
                var userName  = userEntry.twitter.user.name;

                // Override user email for debugging and test purposes
                if (options && options.email)
                    userEmail = options.email;

                console.log(' => delivery to: ' + userName + ' <' + userEmail + '>');
                
                email.sendEssenceTo(userName, userEmail, htmlMessage, callback);
            });
    };


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


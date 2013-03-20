
var     request = require('request')
    ,   assert  = require('assert')
    ,   _       = require('underscore')
    ,	domain  = require('domain')
    ,	moment  = require('moment')
        
    ,   database = use('database')
    ,	email    = use('email')
    ,   userly   = use('userly')
    ,	list     = use('list')
    
    ;


var scheduler = exports;

scheduler.debugModeEmail        = false;
scheduler.debugModeDeliveryDate = false;

if (process.env.SUBDOMAIN == undefined) {
    scheduler.debugModeEmail        = true; // send email all to admin, 
    scheduler.debugModeDeliveryDate = true; // don't change deliveryDate if set to true
}

console.log('scheduler.debugModeEmail: '        + scheduler.debugModeEmail);
console.log('scheduler.debugModeDeliveryDate: ' + scheduler.debugModeDeliveryDate);


scheduler.start = 
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
            setTimeout( _performCycle, 500);
            setInterval( _performCycle, 30 * 60 * 1000); // every 1/2 hour
        })
    };

var clycleMutex = false;

function _performCycle()
{
    if (clycleMutex) {
        console.error('!!! Already in delivery cycle !!!');
        return;
    }

    clycleMutex = true;
    
    scheduler.cycle(
        function(err, results)
        {
            if (err) {
                console.error('scheduler.cycle error:');
                console.error(err);
            }
            else {
                console.log('scheduler.cycle v' + global.appVersion + ':' );
                console.log( results );
            }
            
            clycleMutex = false;
        });
}


scheduler.cycle = 
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

    var state = kDeliveryState;
    var deliveryOptions = {};
    
    if (scheduler.debugModeEmail){
        deliveryOptions.email = process.env.ADMIN_EMAIL_ADDRESS;
        state = kTestDeliveryState;
    }
    
    userly.deliverEssenceToUser(userEntry, deliveryOptions,
        function(err, msg)
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
                if (scheduler.debugModeDeliveryDate)
                    state = kTestDeliveryState;
                else
                {
                    userEntry.deliveryDate = currentDeliveryDate;
                    
                    if (userEntry.deliveryIndex)
                        userEntry.deliveryIndex++;
                    else
                        userEntry.deliveryIndex = 1;
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
            
            // Setup the Twitter list for user
            list.setupForUserEntry(userEntry, 
                function(err, list)
                {
                    if (err) {
                        console.error('Failed to setup Essence list for user: ' + userEntry._id);
                        console.error(err.stack);
                    }
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
    
    var deliveryWindowStart = 17;
    var deliveryWindowEnd   = 18;
    
    if ( hoursInUserTime >= deliveryWindowStart && 
         hoursInUserTime <= deliveryWindowEnd )
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
    
    // First user experience
    if (userEntry.deliveryDate == undefined)
    {
        var lastLoginDate = new Date(userEntry.last_login);
        var timediff = new Date() - lastLoginDate;
        
        console.log('last login diff ' + timediff / 1000/ 60 + ' minutes');
        
        if (timediff > 1000 * 60 * 15 ) /* 30 min */
        {
            console.log('Sending first Essence to: ' + userEntry.twitter.user.screen_name );
            
            return true;
        }
    }
    
    return _isTheRightTime(userEntry);
}


function _hrFromMilli(milliseconds)
{
    return Math.round(milliseconds / 1000 / 60 / 60, 2);
}


function _milliForHr(hours)
{
    return hours * 1000 * 60 *60;
}

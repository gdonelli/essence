
var     request = require('request')
    ,   assert  = require('assert')
    ,   _       = require('underscore')
    ,	async   = require('async')
    ,	domain  = require('domain')
    ,	moment  = require('moment')
        
    ,   database = use('database')
    ,	email    = use('email')
    ,   userly   = use('userly')
    
    ,   package = require('./../../package.json')
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


function _performCycle()
{
    scheduler.cycle(
        function(err, results)
        {
            if (err) {
                console.error('scheduler.cycle error:');
                console.error(err);
            }
            else {
                console.log('scheduler.cycle v' + package.version + ':' );
                console.log( results );
            }
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


function _hrFromMilli(milliseconds)
{
    return Math.round(milliseconds / 1000 / 60 / 60, 2);
}


function _milliForHr(hours)
{
    return hours * 1000 * 60 *60;
}

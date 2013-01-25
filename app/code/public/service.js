
/*
 * Service
 */

var		async			= require('async')

	,	authentication  = use('authentication')
    ,	database        = use('database')
    ,   twitter         = use('twitter')
    ,	userly			= use('userly')
    ,	email           = use('email')
    ,	a				= use('a')
    ,	io				= use('io')
    ;


var service = exports;

function _userIdFromSocket(socket)
{
    return authentication.userFromSocket(socket)._id;
}

service.event   = {};
service.socket  = {};

service.event.getTwitterFriends = 'service.getTwitterFriends';

service.socket.getTwitterFriends =
    function(socket, inputData /* { } */, callback /* (err, data) */ )
    {
        var oauth = authentication.oauthFromSocket(socket);
        var user  = authentication.userFromSocket(socket);
        
        console.log('oauthFromSocket:');
        console.log(oauth);
        
        var getFriends =
            twitter.getFriends(oauth, user.id,
                function(err, data)
                {
                    if (err)
                        return callback( err );
                    
                    callback(null, data);
                }, true /* cache is on */);
        
        getFriends.on('progress',
            function(value) {
                console.log('progress - ' + value);
            });
        
        
        // Emit progess with a given event name
        
        if (inputData.progressEvent) {
            getFriends.on('progress',
                function(progressData) {
                    socket.volatile.emit(inputData.progressEvent, progressData);
                });
        }

    };


service.event.removeVip = 'service.removeVip';

service.socket.removeVip =
    function(socket, inputData /* { id: <string> } */, callback /* (err, vipEntry) */ )
    {
        var userId = _userIdFromSocket(socket);
        
        var idToRemove = inputData.id;
        
        database.getUserEntryById(userId,
            function(err, userEntry)
            {
                if (err)
                    return callback(err);
                
                if ( !userEntry.vipList || userEntry.vipList.length == 0)
                    return callback(new Error('user vipList.length == 0'));
                
                var newList = [];
                
                userEntry.vipList.forEach(
                    function(entry) {
                        if (entry.id != idToRemove)
                            newList.push(entry);
                    });

                userEntry.vipList = newList;
                
                _updateUserVipList(userEntry, callback);
            });
    }


service.event.addVip = 'service.addVip';

service.socket.addVip =
    function(socket, inputData /* { friend_id: <string>, friend_screen_name: <string> } */, callback /* (err, vipEntry) */ )
    {
        var userId = _userIdFromSocket(socket);

        var properties = [ 'id', 'name', 'screen_name', 'profile_image_url', 'profile_image_url_https' ];
        properties.forEach(
            function(key) {
                a.assert_def(inputData[key], key);
            });
        
        var friendEntry = _.pick(inputData, properties);
        var friendId = friendEntry.id;
        
        console.log('ADD: ' + friendEntry.screen_name );
        
        database.getUserEntryById(userId,
            function(err, userEntry)
            {
                if (err)
                    return callback(err);

                var vipList = [];
                if (userEntry.vipList)
                    vipList = userEntry.vipList;

                // Make sure we don't have it already
                var vipEntry = _.find(vipList,
                                    function(vip) {
                                        return (vip.id == friendId);
                                    });

                // Already there, we have nothing to do
                if (vipEntry) {
                    console.log('Already vipEntry:');
                    console.log(vipEntry);
                    return callback(null, vipEntry);
                }
                vipEntry = friendEntry;
                
                vipList.splice(0, 0, vipEntry);
                userEntry.vipList = vipList;
                
                console.log('userEntry.vipList:');
                console.log(userEntry.vipList);
                
                _updateUserVipList(userEntry, callback);
            });
    };
    

function _updateUserVipList(userEntry, callback)
{
    database.saveUserEntry(userEntry,
        function(err, userEntry)
        {
            if (err) {
                console.error('failed to save userEntry');
                return callback(err);
            }
            
            io.emitUserEvent( userEntry._id, service.vipListDidChangeEvent, _safeUserEntry(userEntry) );
            
            _emitServiceDidChangeForUser(userEntry);
            
            callback(err, true);
        });
    
}



service.event.getUserEntry = 'service.getUserEntry';

service.socket.getUserEntry =
    function(socket, inputData /* {} */, callback /* (err, userEntry) */ )
    {
        var userId = _userIdFromSocket(socket);

        database.getUserEntryById(userId, 
            function(err, userEntry) {
                callback( err, _safeUserEntry(userEntry) );
            });
    };

// Removes the private property
function _safeUserEntry(userEntry)
{
    if (userEntry) {
        delete userEntry.secret;
        delete userEntry.twitter.oauth;
    }
    
    return userEntry;
}


//!!!: Preview

service.event.preview = 'service.preview';

service.socket.preview =
    function(socket, inputData /* { userid: ... } */, callback /* (err, html) */ )
    {   
        var userId    = _userIdFromSocket(socket);
        
        userly.previewForUserWithId(userId, {}, callback);
    };
    

//!!!: Confirm Email

service.event.confirmEmail = 'service.confirmEmail';

service.socket.confirmEmail =
    function(socket, inputData /* { email: ... } */, callback /* (err, true) */ )
    {   
        var userId    = _userIdFromSocket(socket);
        var userEmail = a.assert_string(inputData.email);
        
        database.getUserEntryById(userId,
            function(err, userEntry)
            {
                if (err)
                    return callback(err);
                
                delete userEntry.email;
                
                // Make sure we send the same verification email all the time to the same address...
                
                if (userEntry.email_to_confirm != userEmail) {
                	userEntry.email_to_confirm = userEmail;
                
                    if (!userEntry.secret)
                        userEntry.secret = {};

                    var emailTicket = Math.round( Math.random() * 1000000000 );
                    userEntry.secret.email_ticket = emailTicket;
                }
                
                database.saveUserEntry(userEntry,
                    function(err, userEntry)
                    {
                        var questHost = socket.session.host;
                		var confirmURL = 'http://' + questHost + '/confirm/' + userEntry._id + '/' + userEntry.secret.email_ticket;
                        
                		email.sendConfirmationMessage(userEntry, confirmURL, 
                            function(err) {
                                if (err)
                                    return callback(err);
                                
                                _emitServiceDidChangeForUser(userEntry);
                                
                                callback(null, true);
                            });
                    });
            });
    };

service.verifyEmail = 
    function(userId, emailTicket, callback /*( err, email ) */)
    {
        database.getUserEntryById(userId,
            function(err, userEntry)
            {
                if (err)
                    return callback( new Error('Invalid User') );
                    
                if (userEntry.email)
                    return callback( new Error(userEntry.email + ' is already confirmed') );
                
                if (!userEntry.hasOwnProperty('secret'))
                    return callback( new Error('no ticket found') );
                
                if (userEntry.secret.email_ticket != emailTicket)
                    return callback( new Error('Cannot confirm email' ) );
                
                if (!userEntry.email_to_confirm || userEntry.email_to_confirm.length < 4)
                    return callback( new Error('Invalid email in user entry' ) );
                    
                // Make email official
                userEntry.email = userEntry.email_to_confirm;
                
                // Clean up
                delete userEntry.email_to_confirm;
                delete userEntry.secret.email_ticket;
                
                database.saveUserEntry(userEntry, 
                    function(err, userEntry)
                    {
                        if (err)
                            return callback( new Error('Failed to confirm user') );
                        else
                        {
                            io.emitUserEvent( userEntry._id, service.emailDidChange, _safeUserEntry(userEntry) );
                            
                            _emitServiceDidChangeForUser(userEntry);
                            
                            return callback(null, userEntry.email);
                        }
                    });
            });
    };

//!!!: Service State

/*
    The possible service states:
        'GOOD'
        'DISABLED'
        'NO-EMAIL'
        'NO-VIP'
*/


service.event.setServiceEnabled = 'service.setServiceEnabled';

service.socket.setServiceEnabled =
    function(socket, inputData /* { enabled:... } */, callback /* (err) */ )
    {   
        var userId = _userIdFromSocket(socket);

        database.getUserEntryById(userId,
            function(err, userEntry) {
                if (err)
                    return callback(err);
                
                if (!inputData.hasOwnProperty('enabled'))
                    return callback( new Error('Expected to have inputData.enabled defined') );
                    
                if (inputData.enabled)
                    delete userEntry.disabled;
                else
                    userEntry.disabled = true;
                    
                database.saveUserEntry(userEntry, 
                    function(err, userEntry)
                    {
                        callback(err)
                        
                        if (!err)
                            _emitServiceDidChangeForUser(userEntry);
                    });
                
                
            });
    };


service.event.serviceState = 'service.serviceState';

service.socket.serviceState =
    function(socket, inputData /* { } */, callback /* (err, state) */ )
    {   
        var userId    = _userIdFromSocket(socket);
        
        service.serviceState(userId, callback);
    };

service.stateForUser = _serviceStateFromUser;

function _serviceStateFromUser(userEntry)
{
    var state = 'GOOD';
    
    if (userEntry.disabled == true)
        state = 'DISABLED';
    
    if (userEntry.email == undefined) 
        state = 'NO-EMAIL';
       
    if (userEntry.vipList == undefined ||
        userEntry.vipList.length  == 0 )
        state = 'NO-VIP';
    
    return state;
}

function _emitServiceDidChangeForUser(userEntry)
{
    io.emitUserEvent( userEntry._id, service.stateDidChange, _serviceStateFromUser(userEntry) );
}

service.serviceState =
    function(userId, callback /* (err, state) */)
    {
        database.getUserEntryById(userId,
            function(err, userEntry) {
                if (err)
                    return callback(err);
                
                var state = _serviceStateFromUser(userEntry);
                
                callback(null, state);
            });
    };


// TODO: Constant using use module

service.vipListDidChangeEvent = 'service.vipListDidChange';
service.emailDidChange        = 'service.emailDidChange';
service.stateDidChange        = 'service.stateDidChange';




/*
 * Service
 */

var		authentication  = use('authentication')
    ,	database        = use('database')
    ,   twitter         = use('twitter')
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
        
        var getFriends =
            twitter.cache.getFriends(oauth, user.id,
                function(err, data)
                {
                    if (err)
                        return callback( err );
                    
                    callback(null, data);
                });
        
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
            
            io.emitUserEvent(
                userEntry._id,
                service.vipListDidChangeEvent,
                userEntry );
            
            callback(err, true);
        });
    
}


service.event.getUserEntry = 'service.getUserEntry';

service.socket.getUserEntry =
    function(socket, inputData /* {} */, callback /* (err, userEntry) */ )
    {
        var userId = _userIdFromSocket(socket);

        database.getUserEntryById(userId, callback);
    };


service.event.confirmEmail = 'service.confirmEmail';

service.socket.confirmEmail =
    function(socket, inputData /* { email: ... } */, callback /* (err, true ) */ )
    {
        var userId    = _userIdFromSocket(socket);
        var userEmail = a.assert_string(inputData.email);
        
        database.getUserEntryById(userId,
            function(err, userEntry)
            {
                if (err)
                    return callback(err);
                
                //FIXME: more secure verification
                
                userEntry.email_to_confirm = userEmail;
                
                //TODO: Send email to confirm...
                
                database.saveUserEntry(userEntry,
                    function(err, userEntry)
                    {
                        callback(err, true);
                    });
            });
    };


// TODO: Constant using use module
service.vipListDidChangeEvent = 'service.vipListDidChange';
service.userDidChangeEvent    = 'service.userDidChangeEvent';


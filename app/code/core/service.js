
/*
 * Service
 */

var		authentication  = use('authentication')
    ,	database        = use('database')
    ,   twitter         = use('twitter')
    ,	a				= use('a');
    ;


var service = exports;

service.event   = {};
service.socket  = {};


service.event.getFriends = 'service.getFriends';

service.socket.getFriends =
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

service.event.addFriend = 'service.addFriend';

service.socket.addFriend =
    function(socket, inputData /* { friend_id: <string>, friend_screen_name: <string> } */, callback /* (err, vipEntry) */ )
    {
        var oauth  = authentication.oauthFromSocket(socket);
        var userId = authentication.userFromSocket(socket)._id;
        
        var friendId = inputData.friend_id;
        var friendScreenName = inputData.friend_screen_name;
        
        a.assert_def('friendId', 'friend_id');
        a.assert_def('friendScreenName', 'friend_screen_name');
        
        console.log('ADD: ' + friendId + ', ' + friendScreenName);
        
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
                                        return (vip.id_str == friendId);
                                    });
                                  
                console.log('already vipEntry:');
                console.log(vipEntry);
                                
                // Already there, we have nothing to do
                if (vipEntry)
                    return callback(null, vipEntry);
                
                vipEntry = database.makeTwitterVIPEntry(friendId, friendScreenName);
                vipList.push(vipEntry);
                userEntry.vipList = vipList;
                
                console.log('userEntry.vipList:');
                console.log(userEntry.vipList);
                
                database.saveUserEntry(userEntry,
                    function(err, userEntry)
                    {
                        if (err) {
                            console.error('failed to save userEntry');
                            return callback(err);
                        }
                        
                        callback(err, vipEntry);
                    });
            });
    };



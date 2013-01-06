
/*
 * Service
 */

var     authentication  = use('authentication')
    ,   twitter         = use('twitter')
    ,	a = use('a');
    ;


var service = exports;

service.event   = {};
service.socket  = {};


service.event.getFriends = 'service.getFriends';

service.socket.getFriends =
    function(socket, inputData /* { } */, callback /* (data) */ )
    {
        var oauth = authentication.oauthFromSocket(socket);
        var user  = authentication.userFromSocket(socket);
        
        var getFriends =
            twitter.cache.getFriends(oauth, user.id,
                function(err, data)
                {
                    if (err) {
                        console.error('twitter.getFriends failed with error:');
                        console.error(err);
                        return callback( { error: err } );
                    }
                    
                    callback(data);
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
    function(socket, inputData /* { friend_id, friend_screen_name } */, callback /* (data) */ )
    {
        var oauth = authentication.oauthFromSocket(socket);
        var user  = authentication.userFromSocket(socket);
        
        var friendId = inputData.friend_id;
        var friendScreenName = inputData.friend_screen_name;
        
        a.assert_def('friendId', 'friend_id');
        a.assert_def('friendScreenName', 'friend_screen_name');
        
        console.log('ADD: ' + friendId + ', ' + friendScreenName);
    };
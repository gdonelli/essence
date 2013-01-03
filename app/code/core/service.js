
/*
 * Service
 */

var     authentication  = use('authentication')
    ,   twitter         = use('twitter')
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
            twitter.getFriends(oauth, user.id,
                function(err, data)
                {
                    if (err)
                        return callback( { error: err } );
                    
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

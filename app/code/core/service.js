
/*
 * Service
 */

var service = exports;

service.event   = {};
service.socket  = {};

service.event.getFriends = 'service.getFriends';

service.socket.getFriends =
    function(socket, inputData /* { } */, callback /* (data) */ )
    {
        callback('Hello service.getFriends');
    };

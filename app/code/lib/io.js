
/*
 *      io.js
 */

var socketio    = require('socket.io')
    _           = require('underscore')
    a           = use('a')
    ;

var io = exports;

var ioserver;

io.sockets = null;

var eventRoutes = {};

io.setup =
    function(expressServer, cookieParser, sessionStore, sessionKey)
    {
        if (io.sockets) {
            console.error('io.sockets has been already initialized');
            return;
        }
        
        var ioserver = socketio.listen(expressServer);
        
        io.sockets = ioserver.sockets;
        
        ioserver.sockets.on('connection',
            function (socket) {
                
                // Create Session for Socket
                socket.session = socket.handshake.session;
//                var user = socket.session.user;
                _socketListen(socket);
            });

        ioserver.configure( /*'development', */
            function () {
                ioserver.set('log level', 0);
            });

        // Setup Session for socket.io
        ioserver.set('authorization',
            function(data, accept) {
                cookieParser(data, {},
                    function(err) {
                        if (err) {
                            console.error('cookieParser failed with error:');
                            console.error(err);
                            return accept(err, false);
                        }

                        var sessionID = data.signedCookies[sessionKey];
                        
                        sessionStore.get(sessionID,
                            function(err, session)
                            {
                                if (err || !session) {
                                    console.error('Cannot find session in the sessionStore:');
                                    console.error(err);
                                    return accept(err, false);
                                }

                                if (session.hasOwnProperty('user')) {
                                    data.session      = session;
                                    data.sessionID    = sessionID;
                                    data.session.user = session.user;
                                    return accept(null, true);
                                }
                                
                                var err = new Error('session looks bad, it has no user property');
                                console.error(err);
                                return accept(err, false);
                            });

                    });
            });
    };

// Socket.io add single event route

io.event =
    function(name, callback /* (data) */)
    {
        if (eventRoutes[name])
            throw new Error('Event name `' + name + '` has already been set');

        eventRoutes[name] = callback;
    };

function _socketListen(socket)
{
    Object.keys(eventRoutes).forEach(
        function(key) {
            socket.on(key,
                function(data, callback)
                {
                    var ioroute = eventRoutes[key];
                    try {
                        ioroute(socket, data,
                            function(err, data)
                            {
                                console.log('route err');
                                console.log(err);
                                
                                if (err) {
                                    var errObject = {};
                                    errObject.error = null;
                                    
                                    if (err.message)
                                        errObject.error = err.message;
                                    if (err.code)
                                        errObject.errorCode = err.code;
                                    
                                    return callback(errObject);
                                }
                                
                                callback(data);
                            });
                    }
                    catch(err) {
                        console.error('Exception in socket.io event: `' + key + '`');
                        console.error(err.stack);
                      
                        if (callback) {
                            var errObject = {};
                      
                            if (err.name)
                                errObject.name = err.name;
                            if (err.message)
                                errObject.message = err.message;
                            if (err.stack)
                                errObject.stack = err.stack;
                      
                            callback( { error: errObject });
                        }
                    }
                });
        });
}


// Socket.io add event routes for module

io.addRoutesFromModule =
    function(moduleName)
    {
        a.assert_def(moduleName,     'moduleName is undefined');
    
        var module = use(moduleName);

        a.assert_def(module,        'module is undefined');
        a.assert_def(module.event,  'module.event is undefined');
        a.assert_def(module.socket, 'module.socket is undefined');

        var routePathDiff = _.difference(Object.keys(module.event), Object.keys(module.socket) );

        if (routePathDiff.length > 0) {
            console.log('miss-match between module.event and module.socket');

            console.log('Check the following routes:');
            console.log( routePathDiff );       
            
            throw new Error('setup route miss-match');
        }

        var moduleKeys = Object.keys(module.event);

        moduleKeys.sort(
            function byEventLength(a, b) {
                return module.event[a].length - module.event[b].length;
            });
        
        console.log(moduleName);
        
        moduleKeys.forEach(
            function (key_i)
            {
                var event_i  = module.event[key_i];
                var socket_i = module.socket[key_i];
                
                a.assert_def(event_i);
                a.assert_def(socket_i);
                
                io.event(event_i, socket_i);
                
                console.log('   ' + event_i + '\t\t(socket.io)');
            });
    };


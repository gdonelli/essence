
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

io.debug = true;

var eventRoutes = {};

io.emitUserEvent =
    function(userIdstr, eventName, data)
    {
        userIdstr = userIdstr + '';
    
        io.sockets.in(userIdstr).emit(eventName, data);
    }

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
                
                var userIdstr = '' + socket.session.user._id;
                
                if (io.debug)
                    console.log('Socket connection from userId: ' + userIdstr );
                
                // Put all user sockets in the same room
                socket.join(userIdstr);
                
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
        
        io.event(io_event_init, io_socket_init);
    };

io.event  = {};
io.socket = {};

var io_event_init  = '__init__';

var io_socket_init =
    function(socket, inputData, callback /* (err, data) */)
    {
        /*
        console.log('socket:');
        console.log(socket);
        
        console.log('inputData:');
        console.log(inputData);
        
        console.log('callback:');
        console.log(callback);
        */
        
        callback( null, {} );
    };

// Socket.io add single event route

io.event =
    function(name, callback /* (socket, inputData, callback(err, data) ) */)
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
                                if (io.debug)
                                    console.log('socket route for event: ' + key);
                                    
                                if (err) {
                                    console.error('Socket.io Route Error:');
                                	console.error(err);

                                    var errObject = {};
                                    errObject.error = null;
                                    
                                    if (err.message)
                                        errObject.error = err.message;
                                        
                                    if (err.code)
                                        errObject.errorCode = err.code;

                                    if (err.meta)
                                        errObject.meta = err.meta;
                                    
                                    console.error('ioroute -> err.code:');
                                    console.error(err.code);

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


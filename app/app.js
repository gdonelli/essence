//
//  Essence
//

// Nodefly
var isApp = ( require.main.filename.indexOf('app.js') > 0 );
if ( isApp ) { // enable profiling
    console.log(' [ nodefly running... ] ');
    require('nodefly').profile(
            process.env.NODEFLY_ID
        ,   ['Essence', process.env.SUBDOMAIN, process.env.NODE_ENV ] );
}

// Use setup
require( __dirname + '/code/lib/use' ).setup([ __dirname + '/code' ]);


// Import
var     express = require('express')
    ,   http    = require('http')
    ,   path    = require('path')
    ,	assert  = require('assert')
    ,	fs      = require('fs')
    ;

var 	authentication  = use('authentication')
    ,   twitter         = use('twitter')
    ,   index           = use('index')
    ,   io              = use('io')
    ;

// Startup

var MongoStore = require('connect-mongo')(express);
var sessionKey = 'essence.session.id'; ;
var app = express();

assert( process.env.SESSION_DB_URL != undefined,    'process.env.SESSION_DB_URL undefined');
assert( process.env.SESSION_SECRET != undefined,    'process.env.SESSION_SECRET undefined');

var cookieParser = express.cookieParser( process.env.SESSION_SECRET);

var sessionStore = new MongoStore({
                            cookie: { maxAge: 60000 * 60 }
                        ,   url: process.env.SESSION_DB_URL
                        ,   auto_reconnect: true
                        });

express.errorHandler.title = 'Oops...'

app.configure(function() {
    app.set('port', process.env.PORT || 3001);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.favicon(__dirname + '/public/images/favicon.ico') );   
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    
    
        // Session
    app.use(cookieParser);
    app.use(express.session({   key:    sessionKey
                            ,   store:  sessionStore			}));

    app.use(app.router);
    app.use(require('stylus').middleware(__dirname + '/public'));
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
    app.use(express.errorHandler());
});

try {
    if (process.env.TMPDIR)
        fs.mkdirSync(process.env.TMPDIR);
}
catch (e) {
    console.log( 'tmp is ' + process.env.TMPDIR  );
}

// ---------------------
//  Routes

var routes = {};
routes[ index.path.index                    ] = index.route.index;
routes[ index.path.confirmEmail             ] = index.route.confirmEmail;

routes[ authentication.path.login           ] = authentication.route.login;
routes[ authentication.path.loginResponse   ] = authentication.route.loginResponse;
routes[ authentication.path.logout          ] = authentication.route.logout;

console.log('Routes:');

Object.keys(routes).forEach(
    function(path)
    {
        app.get(path, authentication.middleware, routes[path]);
        console.log('   ' + path);
    });


// ---------------------
// Http Server

var expressServer = http.createServer(app);

expressServer.listen(app.get('port'),
    function(){
        console.log("Essence server listening on port " + app.get('port'));
    });


// ---------------------
// Socket.io

io.setup(expressServer, cookieParser, sessionStore, sessionKey);

io.addRoutesFromModule('service');


// ---------------------
// Test

app.get( '/friends',
    function(quest, ponse)
    {
        var oauth   = authentication.oauthFromRequest(quest);
        var user    = authentication.userFromRequest(quest);

        twitter.getFriends(oauth, user.id,
            function(err, data) {
                console.log('twitter.getFriends:');
                console.log(data);
                
                ponse.send(data);
            });
        
    });




//
//  Essence
//

global.appPublicPath = __dirname + '/public';

// Nodefly
var isApp = ( require.main.filename.indexOf('app.js') > 0 );

if ( isApp && process.env.SUBDOMAIN != undefined ) { // enable profiling
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
    ,   pages           = use('pages')
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

function _addRoutesFromModule(module)
{
    Object.keys(module.path).forEach(
        function(key)
        {
            var path  = module.path[key];
            var route = module.route[key];
            
            routes[path] = route;
        });
}

_addRoutesFromModule(index);
_addRoutesFromModule(authentication);
_addRoutesFromModule(pages);


var routesKeys = Object.keys(routes);
routesKeys = routesKeys.sort( 
    function(a, b) {
        return a.length > b.length;
    } );

console.log('Routes:');

routesKeys.forEach(
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

// console.log('SUBDOMAIN: ' + process.env.SUBDOMAIN);
// console.log('NODE_ENV: '  + process.env.NODE_ENV);


// var engine  = use('engine');
// engine.start();

/*
if (process.env.SUBDOMAIN != undefined)
{
}
else
    console.log('**** Essence\'s engine module was not started. We are not in production enviroment');
*/


var envVars = [
        'CONSUMER_KEY'
    ,   'CONSUMER_SECRET'
    ,   'NODEFLY_ID'
    ,   'SESSION_SECRET'
    ,   'SESSION_DB_URL'
    ,   'EMAIL_ADDRESS'
    ,   'SMTP_USER'
    ,   'SMTP_PASSWORD'
    ,   'SMTP_HOST'
    ,   'ADMIN_EMAIL_ADDRESS'
    ,   'ADMIN_TWITTER_ID'
    ,   'DB_HOST'
    ,   'DB_PORT'
    ,   'DB_NAME'
    ,   'DB_USERNAME'
    ,   'DB_PASSWORD'
];

envVars.forEach( 
    function(name) {
        assert(process.env[name] != undefined, name + ' not defined' );
    });



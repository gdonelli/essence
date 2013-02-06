
/*
 * Database based on mongo
 */

var     async       = require('async')
    ,   assert      = require('assert')
    ,   mongodb     = require('mongodb')
    ,	ObjectID    = require('mongodb').ObjectID
    ;

var a = use('a');

var database = exports;

database.makeTwitterUserEntry =
    function(user, oauth)
    {
        a.assert_obj(user, 'user');
        a.assert_obj(oauth, 'oauth');
        
        var nomalizedOAuth = {};
        nomalizedOAuth.token        = oauth.token;
        nomalizedOAuth.token_secret = oauth.token_secret;
        
        return {
            twitter: {
                	user: user
                ,   oauth: nomalizedOAuth
                }
            };
   };


database.makeTwitterVIPEntry =
    function(idstr, screen_name)
    {
        a.assert_string(idstr);
        a.assert_string(screen_name);
        
        var result = {};
        
        // result.type = 0;
        result.id_str = idstr;
        result.screen_name = screen_name;
        
        return result;
    };

database.userLogin =
    function( freshUserEntry, callback /* (err, userEntry) */)
    {
        a.assert_obj(freshUserEntry);
        a.assert_f(callback);
        
        var twitterId = freshUserEntry.twitter.user.id;
        a.assert_number(twitterId);
        
        async.waterfall(
            [   function(callback) {        //  Get userEntry
                    _findUserWithTwitterId(twitterId, callback);
                },
                function(userEntry, callback)
                {
                    if (userEntry)
                    {
                        // Make sure we propagate freshUserEntry
                        userEntry.twitter = freshUserEntry.twitter;
                        userEntry.last_login = new Date();
                        
                        return callback(null, userEntry);
                    }
                    
                    freshUserEntry.last_login = new Date();

                    // First user login ever ...
                    _addUser(freshUserEntry, callback);
                },
                database.saveUserEntry
            ],
            callback);
    };

database.getUserEntryById =
    function(idstr, callback /* (err, userEntry) */ )
    {
        var mongoId;
        
        try {
            a.assert_def(idstr);
            mongoId = mongodb.ObjectID(idstr);
        }
        catch(err) {
            return callback(new Error('Invalid UserId given: ' + idstr));
        }
        
        _findUser( { _id: mongoId },
            function(err, userEntry) {
                if (err)
                    return callback(err);
                  
                if (!userEntry)
                    return callback( new Error('Cannot find user with id: `'+ mongoId + '`') );
                  
                callback(null, userEntry);
            } );
    }

database.saveUserEntry =
    function(userEntry, callback /* (err, userEntry) */ )
    {
        _getUserCollection(
            function(err, userCollection)
            {
                if (err)
                    return callback(err);
                    
                userCollection.save( userEntry, { safe: true },
                    function(err, count) {
                        if (err)
                            return callback(err, null);
                        else if (count != 1)
                            return callback(new Error('updated count should be 1, is #' + count), null);
                        
                        callback(err, userEntry);
                    });
            });
    };

//!!!: get Cursor
function _getCursor(getCollection_f, limit, sort, callback)
{
    getCollection_f(
        function(err, collection)
        {
            if (err)
                return callback(err);
                
            var options = {};
            options.limit = limit;
                    
            if (sort)
               options.sort = sort;

            
            collection.find( {}, options, callback);
        });    
}

database.getCursorOnTracking =
    function(callback /* (err, cursor) */ )
    {
        _getCursor(_getTrackingCollection, 200, [ [ 'date' , -1 ] ], callback);
    }
    
database.getCursorOnUsers =
    function(callback /* (err, cursor) */ )
    {
        _getCursor(_getUserCollection, 100, [ [ 'last_activity' , -1 ] ], callback);
    };

database.removeUserWithId =
    function(idstr, callback /* (err) */)
    {
        _getUserCollection(
            function(err, userCollection)
            {
                if (err)
                    return callback(err);
                
                var mongoId;
                try {
                    mongoId = mongodb.ObjectID(idstr);
                }
                catch(err) {
                    return callback(err);
                }
                
                userCollection.remove( { _id: mongoId }, { single: true } , 
                    function(err, numberOfRemovedDocs)
                    {
                        if (numberOfRemovedDocs == 0)
                            return callback(new Error('numberOfRemovedDocs == 0') );
                            
                        callback(err);
                    } );
            });
    };

database.forEachUser =
    function(callback /* (err, user) */)
    {
        database.getCursorOnUsers(
            function(err, cursor)
            {
                if (err)
                    return callback(err);
                
                cursor.each(callback);
            });
    };


database.insertTrackingPoint = 
    function(dataPoint, callback /* (err, data) */)
    {
    	_getTrackingCollection(
            function(err, statsCollection)
            {
                if (err)
                    return callback(err);
                
                statsCollection.insert(dataPoint, 
                    function(err, result)
                    {
                        if (err)
                            return callback(err);
                        
                        if (result.length != 1)
                            return callback( new Error('result.length != 1') );
                        
                        callback(null, result[0]);
                    });
            });
    }

function _addUser(userInfo, callback /* (err, userEntry) */)
{
    _getUserCollection(
        function(err, userCollection)
        {
            if (err)
                return callback(err);
            
            userInfo.created = new Date();
            
            userCollection.insert(userInfo, { safe:true },
                function(err, result)
                {
                    if (err)
                        return callback(err);
                
                    assert(result.length == 1, 'insert expected to return array of length #1, is instead: #' + result.length);
                    callback(null, result[0]);
                });
        });
};

function _findUserWithTwitterId(id, callback)
{
    var longId;
    
    if (_.isString(id) )
        longId = mongodb.Long.fromString(id);
    else if (_.isNumber(id) )
        longId = mongodb.Long.fromNumber(id);
        
    var findProperties = { 'twitter.user.id' : longId };

    _findUser(findProperties, callback);
}

function _findUser(findProperties, callback)
{
    _getUserCollection(
        function(err, userCollection)
        {
            if (err)
                return callback(err);
            
            userCollection.findOne(findProperties, callback);
        });
}



// Private

database._db = null;

function _initDB(callback /* (err, db) */)
{
    if (database._db) {
        console.log('database._db already initialized');
        return database._db;
    }
    
    a.assert_f(callback);
    
    var host = a.assert_def(process.env.DB_HOST);
    var port = a.assert_def(process.env.DB_PORT);
    var name = a.assert_def(process.env.DB_NAME);
    var username = a.assert_def(process.env.DB_USERNAME);
    var password = a.assert_def(process.env.DB_PASSWORD);
    
    var server = new mongodb.Server( host, parseInt(port), { auto_reconnect:true } );

    var db = new mongodb.Db( name, server, { safe:true } );

    db.open(
        function (err, db_p)
        {
            if (err)
                return callback(err);

            db.authenticate(username, password, 
                function (err, result) {
                    if (err)
                        return callback(err);
                    else
                    {
                        database._db =  db;
                        callback(null, db);
                    }
               });
        });
};

function _getCollection(collectionName, callback /* (err, collection) */ )
{
    a.assert_string(collectionName, 'collectionName');
    a.assert_f(callback, 'callback');
    
    async.waterfall(
            [   function(callback) {        //  Get db
                    if (database._db)
                        callback(null, database._db);
                    else
                        _initDB(callback);
         
                }
            ,	function(db, callback) {   // Get collection
                    db.collection( collectionName, callback )
                }
            ]
        ,	callback );
 
}


//!!!: User Collection

function _getUserCollection( callback /* (err, collection) */ )
{
    _getGlobalCollection( 'user', _setupUserCollection, callback );
}

function _setupUserCollection(collection, callback /* (err, collection) */ )
{
    var propertyIndex = {};
    
    propertyIndex['twitter.user.id'] = 1;
    
    collection.ensureIndex(
            propertyIndex
        ,   { unique: true }
        ,   function(err, indexName)
            {
                // console.log('indexName: ' + indexName);
                callback(err, collection);
            });
}


//!!!: Stats Collection

function _getTrackingCollection( callback /* (err, collection) */ )
{
    _getGlobalCollection( 'tracking', _setupTrackingCollection, callback );
}

function _setupTrackingCollection(collection, callback /* (err, collection) */ )
{
    collection.ensureIndex(
            [ ['userid', 1], ['date', -1] ]
        ,   function(err, indexName) {
                callback(err, collection);
            });
}


//!!!: aux

function _getGlobalCollection( collectionName, setupCollection, callback /* (err, collection) */)
{
    var globalName = '_' + collectionName;
    
    if (database[globalName]) {
        process.nextTick(
            function() {
                callback(null, database[globalName]);
            });
        return;
    }

    async.waterfall(
            [   function(callback) { // Get user collection
                    _getCollection(collectionName, callback)
                }
            ,	function(collection, callback) { // Get setup collection
                    setupCollection(collection, callback);
                }
            ]
        ,	function(err, collection)
            {
                if (!err)
                    database[globalName] = collection;
                    
                callback(err, collection);
            });
}


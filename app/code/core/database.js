
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
    }

database.userLogin =
    function( freshUserEntry, callback /* (err, userEntry) */)
    {
        a.assert_obj(freshUserEntry);
        a.assert_f(callback);
        
        var twitterId = freshUserEntry.twitter.user.id;
        a.assert_number(twitterId);
        
        freshUserEntry.last_login = new Date();

        async.waterfall(
            [   function(callback) {        //  Get userEntry
                    _findUserWithTwitterId(twitterId, callback);
                },
                function(userEntry, callback)
                {
                    if (userEntry)
                    {
                        // Make sure we propagate freshUserEntry
                        freshUserEntry._id = userEntry._id;
                        return callback(null, freshUserEntry);
                    }
             
                    // First user login ever ...
                    _addUser(freshUserEntry, callback);
                },
                database.saveUserEntry
            ],
            callback);
    };

database.getUserEntryById =
    function(id, callback /* (err, userEntry) */ )
    {
        a.assert_def(id);
        
        _findUser( { _id: id }, callback);
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

database._userCollection = null;

function _getUserCollection( callback /* (err, collection) */ )
{
    if (database._userCollection) {
        process.nextTick(
            function() {
                callback(null, database._userCollection);
            });
        return;
    }

    async.waterfall(
            [   function(callback) { // Get user collection
                    _getCollection('user', callback)
                }
            ,	function(collection, callback) { // Get setup collection
                    _setupUserCollection(collection, callback);
                }
            ]
        ,	function(err, collection)
            {
                if (!err)
                    database._userCollection = collection;
                    
                callback(err, collection);
            });
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
                console.log('indexName: ' + indexName);
                callback(err, collection);
            });
}




var     request = require('request')
    ,   assert  = require('assert')
    ,   querystring = require('querystring')
    ,   _       = require('underscore')
    ,	async   = require('async')
    ,	path    = require('path')
    ,	fs      = require('fs')
    ,	EventEmitter = require('events').EventEmitter
    ;

var twitter = exports;


twitter.get =
    function(oauth, apiURL, params, callback /* (err, data) */)
    {
        var theURL = apiURL;
        theURL += '?';
        theURL += querystring.stringify(params);
    
        request.get( { url:theURL, oauth:oauth, json:true },
            function(err, ponse, payload)
            {
                if (err) {
                    console.error('twitter.get failed for API:');
                    console.error(theURL);
                    console.error('error:');
                    console.error(err);
                    return callback(err);
                }
                else if (ponse.statusCode != 200)
                {
                    var err;
                    if (ponse.statusCode == 429)
                        err = new Error('Too Many Requests - Rate Limit');
                    else
                        err = new Error('Twitter API GET status: ' + ponse.statusCode);
                    
                    err.code = ponse.statusCode;
                    return callback(err);
                }
                
                callback(null, payload);
            });
    };


twitter.post =
    function(oauth, apiURL, params, callback /* (err, data) */)
    {
        var body = querystring.stringify(params);
        
        request.post( { url:apiURL, oauth:oauth, json:true, body:body },
            function(err, ponse, payload)
            {
                if (err)
                    return callback(err);
                
                callback(null, payload);
            });
    };

// ---

twitter.users = {};

twitter.users.show =
    function(oauth, user_id, screen_name, callback /* (err, userInfo) */)
    {
        var apiURL = 'https://api.twitter.com/1.1/users/show.json';
        var params = {
                screen_name: screen_name
            ,   user_id:	 user_id
            };
        
        twitter.get(oauth, apiURL, params, callback);
    };


function _users_lookup100(oauth, arrayOfUserIds, callback /* (err, data) */)
{
    assert(arrayOfUserIds.length <= 100, 'arrayOfUserIds.length is not <= 100, is #' + arrayOfUserIds.length);
    
    var apiURL = 'https://api.twitter.com/1.1/users/lookup.json';

    var allIds = '';
    arrayOfUserIds.forEach( function(value) { allIds += value + ','; } );
    allIds = allIds.substring(0, allIds.length-1);
    
    var params = { user_id: allIds };
    
    twitter.post(oauth, apiURL, params, callback);
}

twitter.users.lookup =
    function(oauth, arrayOfUserIds, callback /* (err, data) */)
    {
        var progressEmitter = new EventEmitter();
        
        var userSegments = [];
        
        var count = Math.min( 1000, arrayOfUserIds.length );
        for (var i=0; i<count; i+=100 )
        {
            var slice = arrayOfUserIds.slice(i, Math.min(count, i + 100) );
            
            userSegments.push(slice);
        }
        
        var completedSegments = 0;
        
        async.map(userSegments,
            function(slice, lookupCallback) {
                _users_lookup100(oauth, slice,
                    function(err, data){
                        completedSegments++;
                        progressEmitter.emit('progress', (completedSegments / userSegments.length) );
                        lookupCallback(err, data);
                    });
            },
            function(err, results)
            {
                if (err)
                    return callback(err);
                  
                var allUser = _.flatten(results);
                callback(null, allUser);
            } );
        
        return progressEmitter;
    };

twitter.users.search =
    function(oauth, searchString, callback /* (err, data) */)
    {
        var apiURL = 'https://api.twitter.com/1.1/users/search.json';
        var params = { q: searchString };
        
        twitter.get(oauth, apiURL, params, callback);
    };

// ---

twitter.friends = {};

twitter.friends.ids =
    function(oauth, user_id, callback /* (err, data) */ ) {
        var apiURL = 'https://api.twitter.com/1.1/friends/ids.json';
        var params = {  user_id: user_id };
        
        twitter.get(oauth, apiURL, params, callback);
    };

// ---

twitter.getFriends =
    function(oauth, user_id, callback)
    {
        var progressEmitter = new EventEmitter();
        
        process.nextTick(
            function() {
                progressEmitter.emit('progress', 0);
            });
        
        twitter.friends.ids(oauth, user_id,
            function(err, data) {
                if (err)
                    return callback(err);
                else if (data.ids == undefined)
                    return callback(new Error('data.ids is undefined'));

                progressEmitter.emit('progress', 0.25);
                
                var lookup =
                    twitter.users.lookup( oauth, data.ids,
                        function(err, data)
                        {
                            var result = _.map(data,
                                function(userInfo) {
                                    var propertiesToPick =
                                        [   'id'
                                        ,   'name'
                                        ,   'screen_name'
                                        ,   'profile_image_url'
                                        ,   'profile_image_url_https'
                                        ];
                                        
                                    return _.pick(userInfo, propertiesToPick);
                                } );
                            
                            callback(null, result);
                        });
                
                lookup.on('progress',
                    function(value) {
                        progressEmitter.emit('progress', 0.25 + value * 0.75);
                    });

            });
        
        return progressEmitter;
    }

// Cache

twitter.cache = {};

function _cacheDir()
{
    if (process.env.TMPDIR)
        return process.env.TMPDIR;
    else
        return '/tmp';
}

twitter.cache.getFriends =
    function(oauth, user_id, callback)
    {
        var progressEmitter = new EventEmitter();
        
        process.nextTick(
            function() {
                progressEmitter.emit('progress', 0);
            });
        
        var cachePath = _getFriends_cache_file(user_id);
        console.log(cachePath);
        
        fs.readFile(cachePath,
            function (err, data) {
                progressEmitter.emit('progress', 0.1);

                if (err) { // cache miss
                    console.log('cache miss');
                    _getFriends_cache_miss(progressEmitter, oauth, user_id, callback);
                }
                else // Cache hit
                {
                    var resultData;
                    
                    try {
                        var cache = JSON.parse(data);
                        if (!cache.data)
                            throw Error('no cache.data');
                   
                        var timeDiff = new Date() - new Date(cache.created);
                        if (timeDiff > 60 * 1000)
                            throw Error('cache is not fresh');
                    
                        resultData = cache.data;
                    }
                    catch(e) {
                        console.log(e.message);
                    }
                    
                    if (resultData)
                    {
                        progressEmitter.emit('progress', 1);
                        callback(err, resultData);
                    }
                    else
                        _getFriends_cache_miss(progressEmitter, oauth, user_id, callback);
                }
                
            });
        
        return progressEmitter;
    };

function _getFriends_cache_file(user_id)
{
    var cacheName = 'twitter.cache.getFriends_' + user_id + '.json';
    return _cacheDir() + '/' + cacheName;
}

function _getFriends_cache_miss(progressEmitter, oauth, user_id, callback)
{
    var cachePath = _getFriends_cache_file(user_id);
    
    var p = twitter.getFriends(oauth, user_id,
        function(err, data) {
            if (err)
                return callback(err);
            
            console.log('about to save cache');
            var cache = { data: data, created: new Date() };
            
            // save cache
            fs.writeFile(cachePath, JSON.stringify(cache),
                function(err) {
                    if (err) {
                        console.error('Writing cache failed:');
                        console.error(err.stack);
                    }
                    else
                        console.error('Wrote cache to:' + cachePath);
                        
                    callback(null, data);
                });
        });
    
    p.on('progress',
        function(value) {
            progressEmitter.emit('progress', value);
        } );
}



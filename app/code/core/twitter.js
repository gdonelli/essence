

var     request = require('request')
    ,   assert  = require('assert')
    ,   querystring = require('querystring')
    ,   _       = require('underscore')
    ,	async   = require('async')
    ,	path    = require('path')
    ,	fs      = require('fs')
    ,	EventEmitter = require('events').EventEmitter
    ,   crypto  = require('crypto')
    
    ,	cache   =  use('cache')
    ;

var twitter = exports;

twitter.api         = {};
twitter.statuses	= {};
twitter.users		= {};
twitter.friends		= {};
twitter.cache		= {};
twitter.lists		= {};
twitter.lists.members = {};


var TWITTER_TIMEOUT = 15000;

function _cleanJSONStr(string)
{
    return string.replace('{', '').replace('}', '').replace(' ', '');
}


function _twitterAPIHash(method, oauth, apiURL, params)
{
    var oauthStr  = oauth.token + '-' + oauth.token_secret;
    var paramsStr = _cleanJSONStr( JSON.stringify(params) );
    var apiURLStr = apiURL.replace('https://', '').replace('api.twitter.com/1.1/', '');
    
    var sha1 = crypto.createHash('sha1');

    sha1.update(method);    
    sha1.update(oauthStr);
    sha1.update(paramsStr);
    sha1.update(apiURLStr);
    
    return sha1.digest("hex");
}


function _twitter_api(method, oauth, options, callback)
{
    options.timeout = TWITTER_TIMEOUT;
    options.oauth   = oauth;
    options.json    = true;
    
    request[method](options, 
        function(err, ponse, payload)
        {
            if (err) {
                console.error('twitter.get failed for API:');
                console.error(options.url);
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
}


twitter.api.get =
    function(oauth, apiURL, params, callback /* (err, data) */)
    {
        var theURL = apiURL;
        theURL += '?';
        theURL += querystring.stringify(params);
        
        _twitter_api('get', oauth, { url:theURL }, callback);
    };


twitter.api.post =
    function(oauth, apiURL, params, callback /* (err, data) */)
    {
        var body = querystring.stringify(params);

        _twitter_api('post', oauth, { url:apiURL, body:body }, callback);
    };


function _twitter_cache_api(method, oauth, apiURL, params, callback )
{
    var hash        = _twitterAPIHash(method, oauth, apiURL, params);
    var cacheValue  = cache.valueForKey(hash);
    
    if (cacheValue) {
        process.nextTick(
            function() {
                // console.log( method + ': ' + apiURL +' cached');
                callback(null, cacheValue);
            });
    }
    else {
        twitter.api[method](oauth, apiURL, params,
            function(err, data) {
                if (err)
                    return callback(err);
                
                // set cache
                cache.valueForKey(hash, data);
                // console.log( method + ': ' + apiURL +' will cache');
                
                callback(null, data);
            });
    }
}

twitter.get =
    function(oauth, apiURL, params, callback /* (err, data) */, nocache)
    {
        // console.log('twitter.get: ' + apiURL);
        
        if (nocache === true)
            twitter.api.get(oauth, apiURL, params, callback);
        else
            _twitter_cache_api('get', oauth, apiURL, params, callback);
    };


twitter.post =
    function(oauth, apiURL, params, callback /* (err, data) */, nocache)
    {
        // console.log('twitter.post: ' + apiURL);

        if (nocache === true)
            twitter.api.post(oauth, apiURL, params, callback);
        else
        	_twitter_cache_api('post', oauth, apiURL, params, callback, nocache);
    };


function _twitterResponseHandler(err, ponse, payload, theURL, callback)
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
}

// ---

twitter.statuses.home_timeline =
    function(oauth, user_id, max_id, callback /* (err, tweets) */ )
    {
        var apiURL = 'https://api.twitter.com/1.1/statuses/home_timeline.json';
        var params = {
                user_id: user_id
            ,	count: 200
            };
        
        if (max_id)
            params.max_id = max_id;
            
        twitter.get(oauth, apiURL, params, callback);        
    };


twitter.statuses.user_timeline =
    function(oauth, user_id, callback /* (err, tweets) */ )
    {
        // console.log('twitter.statuses.user_timeline');
        
        var apiURL = 'https://api.twitter.com/1.1/statuses/user_timeline.json';
        var params = {
                	user_id: user_id
                ,	count: 100
            };
        
        twitter.get(oauth, apiURL, params, callback);        
    };
    
    

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

twitter.lists.list =
    function(oauth, callback /* (err, lists) */)
    {
        var apiURL = 'https://api.twitter.com/1.1/lists/list.json';
        
        twitter.get(oauth, apiURL, {}, callback);
    };

twitter.lists.destroy =
    function(oauth, list_id, slug, callback /* (err, data) */)
    {
        var apiURL = 'https://api.twitter.com/1.1/lists/destroy.json';
        var params = { 
                list_id: list_id
            ,   slug: slug
            };
        
        twitter.post(oauth, apiURL, params, callback);
    };

twitter.lists.create =
    function(oauth, name, description, callback /* (err, data) */)
    {
        var apiURL = 'https://api.twitter.com/1.1/lists/create.json';
        var params = { 
                name: name
            ,   description: description
            ,   mode: 'private'
            };
        
        twitter.post(oauth, apiURL, params, callback);
    };

twitter.lists.members =
    function(oauth, list_id, callback /* (err, users) */)
    {
        var apiURL = 'https://api.twitter.com/1.1/lists/members.json';
        var params = {
                list_id : list_id
            };

        twitter.get(oauth, apiURL, params, callback);
    };

twitter.lists.statuses =
    function(oauth, list_id, callback /* (err, tweets) */)
    {
        var apiURL = 'https://api.twitter.com/1.1/lists/statuses.json';
        var params = {
                	list_id : list_id
                ,	count: 100
            };

        twitter.get(oauth, apiURL, params, callback);
    };


function _commaSeparatedStringFromArray(array)
{
    var result = '';
    
    array.forEach(
        function(item) {
            result += item + ',';
        });
    
    result.substring(0, result.length-1);
    
    return result;
}

function _lists_members_operation(oauth, apiEndPoint, list_id, arrayOfUserIds, callback)
{
    var apiURL = 'https://api.twitter.com/1.1/lists/members/' + apiEndPoint + '.json';
    var params = { 
            list_id: list_id
    	,	user_id: _commaSeparatedStringFromArray(arrayOfUserIds)
        };
    
    twitter.post(oauth, apiURL, params, callback);
}

twitter.lists.members.create_all =
    function(oauth, list_id, arrayOfUserIds, callback)
    {
        _lists_members_operation(oauth, 'create_all', list_id, arrayOfUserIds, callback);
    };

twitter.lists.members.destroy_all =
    function(oauth, list_id, arrayOfUserIds, callback)
    {
        _lists_members_operation(oauth, 'destroy_all', list_id, arrayOfUserIds, callback);
    };
    

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
                            
                        if (cache.data.length == 0)
                            throw Error('cache is empty');
                            
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



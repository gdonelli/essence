

var     request = require('request')
    ,   assert  = require('assert')
    ,   querystring = require('querystring')
    ,   _       = require('underscore')
    ,	async   = require('async')
    ,	EventEmitter   = require('events').EventEmitter
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
                if (err)
                    return callback(err);
                
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
                progressEmitter.emit('progress', 0.25);
                
                if (err)
                    return callback(err);
                else if (data.ids == undefined)
                    return callback(new Error('data.ids is undefined'));
                
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
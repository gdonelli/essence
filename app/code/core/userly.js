
/*
 * GET home page.
 */


var     _     = require('underscore')
    ,   async = require('async')

    ,   a       = use('a')
    ,	email   = use('email') 
    ,   twitter     = use('twitter')
    ,   database    = use('database')
    ,   presentation    = use('presentation')
    ,   authentication  = use('authentication')
    ;


var userly = exports;

/*
    options:
        preview     [true/false]
        sinceDate   [Date]
        
*/

userly.deliverEssenceToUserWithId =
    function(idstr, options, callback /* (err, msg) */)
    {
        database.getUserEntryById(idstr, 
            function(err, userEntry) {
                if (err)
                    return callback(err);
                    
                userly.deliverEssenceToUser(userEntry, options, callback);
            });
    };

userly.deliverEssenceToUser = 
    function(userEntry, options, callback /* (err, msg) */)
    {
        if (!options)
            options = {};
        
        if (!options.sinceDate)
            options.sinceDate = userEntry.deliveryDate;
        
    	async.waterfall(
            [   function(callback)
                {
                    _getAugmentedVipList(userEntry, options, callback);
                }
            ,   function(augmentedVipList, callback)
                {
                    presentation.makeEmailMessage(userEntry, augmentedVipList, options, callback);
                }
            ,   function(msg, callback)
                {
                    email.send(msg, callback);
                }
            ]
        ,   callback);
    };

//!!!: Private

function _getAugmentedVipList(userEntry, options, callback /* (err, augmentedVipList) */ )
{
    // Copy the VIP list, since we dont want to modify the userEntry
    var vipList = _.map( userEntry.vipList, _.clone );
    
    var cache = (options.preview === true);
    
    var oauth = authentication.oauthFromUserEntry(userEntry);
    
    async.map(vipList
        ,	function(vipEntry, callback)
            {
                _fillUpEssenceForVip(oauth, vipEntry, options, callback, cache); 
            }
        ,	function(err, results)
            {
                if (err)
                    return callback(err);
                
                vipList = vipList.sort(
                    function(a, b){
                        return a.essence.length - b.essence.length;
                    });
                                   
                callback(null, vipList);
            });
}

function _getTweetsSinceDate(tweets, sinceDate)
{
    var lastIndex = tweets.length;
    
    for (var i=0; i<tweets.length; i++) {
        var tweet_i = tweets[i];
        
        var tweetCreated = new Date(tweet_i.created_at);
        var timeDiff = tweetCreated - sinceDate;
        lastIndex = i;
        
        if (timeDiff<0)
            break;
    }
    
    var result = tweets.slice(0, lastIndex);
    
    
    return result;
}

/*  Options:
        includeResponses
        maxCount
        sinceDate
*/

function _filterTweets(tweets, options)
{
    var result = tweets;
    
    if (options.sinceDate)
        result = _getTweetsSinceDate(tweets, options.sinceDate);
    
    if (!options.includeResponses)
        result = _.filter(result, 
            function(tweet) {
                if (tweet.in_reply_to_status_id)
                    return options.includeResponses;
                
                return true;
            });
    
    if (options.maxCount)
        result = _.first(result, options.maxCount);
    
    return result;
}

function _yesterday()
{
    var result = new Date();
    result.setDate(result.getDate() - 1);
    return result;    
}

function _fillUpEssenceForVip(oauth, vipEntry, options, callback /*(err, vipEntry)*/, cache)
{
    a.assert_obj(oauth);
    a.assert_obj(vipEntry);
    a.assert_f(callback);
    a.assert_def(vipEntry.id);

    // console.log('about to twitter.statuses.user_timeline');
    
    twitter.statuses.user_timeline(oauth, vipEntry.id, 
        function(err, tweets) {
            if (err)
                return callback(err);
                
            var filterOptions = {};
            
            filterOptions.includeResponses = false;
            
            if (options && options.preview)
                filterOptions.maxCount = 3;
            else if (options && options.sinceDate)
                filterOptions.sinceDate = options.sinceDate;
            else
                filterOptions.sinceDate =  _yesterday();
                
            var relevantTweets = _filterTweets(tweets, filterOptions);
            
            vipEntry.essence = relevantTweets;
            
            callback(err, vipEntry);
        }, cache);
}

// Adds tweets to vipList



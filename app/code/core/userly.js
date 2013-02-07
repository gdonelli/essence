
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
                    // Make sure we always deliver some tweets
                    var countTweets = 0;
                    augmentedVipList.forEach(
                        function(vipEntry){
                            countTweets += vipEntry.essence.length;
                        });
                    
                    if (countTweets > 0)
                        presentation.makeEmailMessage(userEntry, augmentedVipList, options, callback);
                    else
                        callback(null, null);
                }
            ,   function(msg, callback)
                {
                    if (msg === null) // We have no tweets to deliver
                        return callback(null, null);
                        
                    if (options.email)
                        msg.to = options.email;
                    
                    email.send(msg, callback);
                }
            ]
        ,   callback);
    };

userly.previewForUserWithId = 
    function(idstr, options, callback /* (err, html) */ )
    {
        database.getUserEntryById(idstr, 
            function(err, userEntry) {
                if (err)
                    return callback(err);
                    
                userly.previewForUser(userEntry, options, callback);
            });
    };
    
userly.previewForUser =
    function(userEntry, options, callback /* (err, html) */ )
    {
        if (!options)
            options = {};
        
        options.preview = true;
        
    	async.waterfall(
            [   function(callback) {
                    _getAugmentedVipList(userEntry, options, callback);
                }
            ,   function(augmentedVipList, callback) {
                    presentation.makeHTML(userEntry, augmentedVipList, options, callback);
                }
            ]
        ,   callback);
        
    };

userly.confirmEmailForUserEntry = 
    function(userEntry, callback /* (err, userEntry) */)
    {
        if (!userEntry.email_to_confirm)
            return callback(new Error('no email_to_confirm'));
            
        // Make email official
        userEntry.email = userEntry.email_to_confirm;
        
        // Clean up
        delete userEntry.email_to_confirm;
        delete userEntry.secret.email_ticket;
        
        database.saveUserEntry(userEntry, 
            function(err, userEntry)
            {
                if (err)
                    return callback( new Error('Failed to confirm user') );
                
                callback(null, userEntry);
            });
    };
    
//!!!: Private

function _appVip()
{
    a.assert_string(process.env.APP_TWITTER_ID,          'APP_TWITTER_ID');
    a.assert_string(process.env.APP_TWITTER_SCREEN_NAME, 'APP_TWITTER_SCREEN_NAME');
    
    var appId           = Math.floor(process.env.APP_TWITTER_ID);
    var appScreenName   = process.env.APP_TWITTER_SCREEN_NAME;
    
    return { 
            id:             appId
        ,   screen_name:    appScreenName
    };
}

function _getAugmentedAppVip(oauth, options, callback /* (err, augmentedVip) */)
{
    var appVIP = _appVip();
    
    _fillUpEssenceForVip(oauth, appVIP, options, 
        function(err, augmentedVip) {
            if (err)
                return callback(err);

            callback(null, augmentedVip);
        }, 
        true /* cache */);
}

function _getAugmentedVips(oauth, options, vipList, callback /* (err, vipList) */, cache)
{
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

function _getAugmentedVipList(userEntry, options, callback /* (err, augmentedVipList) */ )
{
    // Copy the VIP list, since we dont want to modify the userEntry
    var vipList = _.map( userEntry.vipList, _.clone );
    
    var cache = (options.preview === true);
    
    var oauth = authentication.oauthFromUserEntry(userEntry);
    
    var theAppVIP = null;
    async.waterfall([
        // First load Essence App announcement
            function(callback)
            {
                if (options.preview === true)
                {
                    callback(null, null);
                }
                else
                    _getAugmentedAppVip(oauth, options, callback);
            }
        // Load VIPs    
        ,   function(appVIP, callback)
            {
                theAppVIP = appVIP;
                
                _getAugmentedVips(oauth, options, vipList, callback, cache);
            }
        // Put List together if needed
        ,   function(vipList, callback)
            {
                if (theAppVIP)
                    vipList.splice(0, 0, theAppVIP);

                callback(null, vipList);
            }
       ],
       callback );
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

function _isDirectTweet(tweet)
{
    if (tweet.text.length >= 4)
    {
        var tweetHead = tweet.text.substring(0, 4).trim();
        
        return tweetHead[0] == '@';
    }
    
    return false;
}

function _filterTweets(tweets, options)
{
    var result = tweets;
    
    if (options.sinceDate)
        result = _getTweetsSinceDate(tweets, options.sinceDate);
    
    // Filter responses and direct messages
    result = _.filter(result, 
        function(tweet) {
            if (tweet.in_reply_to_status_id)
                return options.includeResponses;
            
            if ( _isDirectTweet(tweet) ) {
                // console.log('direct tweet: ' + tweet.text );
                return false;
            }

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



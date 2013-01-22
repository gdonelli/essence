
/*
 * GET home page.
 */

var     async   = require('async')
    ,   _       = require('underscore')

    ,   twitter = use('twitter')
    ,   a       = use('a')
    ;


var essence = exports;


essence.path = {};
essence.route = {};


var _essenceListName        = 'EssenceApp.com';
var _essenceListDesciption  = 'Never miss these tweets (managed by EssenceApp.com)';


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

function _fillUpEssenceForVip(oauth, vipEntry, options, callback /*(err, vipEntry)*/)
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
            
            if (options && options.sinceDate)
                filterOptions.sinceDate = options.sinceDate;
            else
                filterOptions.maxCount = 5;
                
            var relevantTweets = _filterTweets(tweets, filterOptions);
            
            vipEntry.essence = relevantTweets;
            
            callback(err, vipEntry);
        } );
}

// Adds tweets to vipList

essence.getAugmentedVipList =
    function(oauth, userEntry, options, callback /* (err, augmentedVipList) */ )
    {
        var vipList = _.map( userEntry.vipList, _.clone );
        
        async.map(vipList
            ,	function(vipEntry, callback) { 
                    _fillUpEssenceForVip(oauth, vipEntry, options, callback); 
                }
            ,	function(err, results) {
                    // console.log('->essence.getAugmentedVipList err:');
                    // console.error(err);
                    
                    if (err)
                        return callback(err);
                    
                    vipList = vipList.sort(
                        function(a, b){
                            return a.essence.length > b.essence.length;
                        });
                                       
                    callback(err, vipList);
                });
    }


essence.getList =
    function(oauth, createIfNeeded, callback /* (err, list) */)
    {
        twitter.lists.list(oauth,
            function(err, lists)
            {
                if (err)
                    return callback(err);
            
                var foundEssenceList = _.find(lists, 
                    function(list){
                        return list.name == _essenceListName;
                    });
                    
                if (foundEssenceList)
                    callback(null, foundEssenceList);
                else if (createIfNeeded)
                    twitter.lists.create(oauth, _essenceListName, _essenceListDesciption, callback);
                else
                    callback(null, null);
            });
    };

function _userDictionaryFromList(list)
{
    var result = {};
 
    _.each(list,
        function(entry) {
            if (!entry || !entry.id) {
                console.error('Cannot access entry.id, entry: ');
                console.error(entry);
                console.error('list:');
                console.error(list);
                return;
            }
            
            result[entry.id] = entry;
        })
    
    return result;
}


essence.setupList =
    function(oauth, vipList, callback /* (err, list) */)
    {
        a.assert_obj(oauth);
        a.assert_array(vipList);
        a.assert_f(callback);
    
        essence.getList(oauth, true, 
            function(err, list)
            {
                if (err)
                    return callback(err);
                
                var listId = list.id;
                
                console.log('essence.getList- list:');
                console.log(list);

                twitter.lists.members(oauth, listId, 
                    function(err, members) {
                        if (err)
                            return callback(err);
                        
                        var vipDict     = _userDictionaryFromList(vipList);
                        var membersDict = _userDictionaryFromList(members.users);
                        
                        var membersToAdd    = [];
                        var membersToRemove = [];
                         
                        _.each(vipList,
                            function(vipEntry){
                                if (!membersDict[vipEntry.id])
                                    membersToAdd.push(vipEntry);
                            });
                            
                        _.each(members.users,
                            function(member){
                                if (!vipDict[member.id])
                                    membersToRemove.push(member);
                            });
                        
                        var idsToAdd = _.map(membersToAdd,
                            function(member) {
                                return member.id;
                            });
                            
                        var idsToRemove = _.map(membersToRemove,
                            function(member) {
                                return member.id;
                            });
                        
                        async.parallel(
                            [
                                function(_callback) {
                                    if (idsToAdd.length > 0)
                                    {
                                        twitter.lists.members.create_all(oauth, listId, idsToAdd,
                                            function(err) {
                                                if (err) {
                                                    console.error('twitter.lists.members.create_all error:');
                                                    console.error(err);
                                                    return callback(err);
                                                }
                                                _callback(null, 'Added: ' + idsToAdd);
                                            });
                                    }
                                    else
                                        _callback(null, 'No user added');
                                }
                            ,	function(_callback) {
                                    if (idsToRemove.length > 0)
                                    {
                                        twitter.lists.members.destroy_all(oauth, listId, idsToRemove,
                                            function(err) {
                                                if (err) {
                                                    console.error('twitter.lists.members.destroy_all error:');
                                                    console.error(err);
                                                    return callback(err);
                                                }
                                                _callback(null, 'Removed: ' + idsToRemove);
                                            });
                                    }
                                    else
                                        _callback(null, 'No user removed');
                            	}
                            ], 
                            function(err, results) {
                                console.log('Setup results:');
                                console.log(results);
                                callback(err, list);
                            });
                    });
            });
    };

essence.destroyList =
    function(oauth, callback /* (err) */)
    {
        essence.getList(oauth, false,
            function(err, list)
            {
                if (err)
                    return callback(err);
                
                if (!list) {
                    var err = new Error('Nothing to destroy');
                    err.code = 200;
                    return callback( err );
                }
                
                var listId   = list.id;
                var listSlug = list.slug;
                
                twitter.lists.destroy(oauth, listId, listSlug, callback);
            });

    };
    
    
function _getUserTimelineUntilDate(results, sinceDate, oauth, user_id, max_id, callback)
{
    twitter.statuses.home_timeline(oauth, user_id, max_id,
        function(err, tweets)
        {
            if (err) {
                console.error('home_timeline returned an error:');
                console.error(err);
                return callback(err);
            }
            
            if (tweets.length == 0)
                return callback(null, results);
            
            var first = tweets[0];
/*            
            if (max_id) { // remove first entry we have it already
                tweets = _.rest(tweets);
            }
  */
            
            results = results.concat(tweets);
            
            var lastTweet = _.last(tweets);
            
            var lastTweetDate;
            
            if ( lastTweet.hasOwnProperty('created_at') ) {
                
                lastTweetDate = new Date(lastTweet.created_at);
            }
            else
            {	
            	console.log('!!! Doesnt have created_at!!! :');
                console.log('!!! Doesnt have created_at!!! :');
                console.log('!!! Doesnt have created_at!!! :');
                console.log(lastTweet)
                lastTweetDate = new Date(0);
            }
            
            var lastTweetId = lastTweet.id;
            var timeDiff = lastTweetDate - sinceDate;
            
            // console.log('lastTweet:');
            // console.log(lastTweet);
            console.log('timeDiff:');
            console.log(timeDiff / 1000 / 60 / 60 + ' hours');
            
            if (timeDiff > 0)
            {
                _getUserTimelineUntilDate(results, sinceDate, oauth, user_id, lastTweetId, callback);
            }
            else
                callback(null, results);
        })
}



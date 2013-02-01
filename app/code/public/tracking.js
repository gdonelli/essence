
/*
 * GET home page.
 */

var     mongodb = require('mongodb')
    ,	async   = require('async')
    ,   fs      = require('fs')
    ,   _       = require('underscore')

    ,   a        = use('a')
    ,	database = use('database')
    ;


var tracking = exports;

tracking.path  = {};
tracking.route = {};


function _servePublicFile(filePath, contentType, ponse)
{
    var sourceImage = global.appPublicPath + filePath;

    var readStream = fs.createReadStream(sourceImage);

    ponse.writeHead( 200, { 'Content-Type': contentType } );

    readStream.pipe(ponse);
}

tracking.debugTrackLocal = true;


//!!!: Go To

function _nIndexOf(sourceStr, strToFind, num)
{
    var result = -1;
    
    for (var i=0; i<num; i++)
    {
        result++;
        result = sourceStr.indexOf(strToFind, result);
        
        console.log('result: ' + result);
        
        if (result < 0)
            return -1;
    }
    
    return result;
}

tracking.path.goto = '/go/:userId?/:msgIndex?/:tweetId?/*'

tracking.route.goto = 
    function(quest, ponse)
    {
        var userIdStr = quest.params.userId;
        var msgIndex  = quest.params.msgIndex;
        var tweetId   = quest.params.tweetId;
        
        if (! (userIdStr && msgIndex && tweetId) )
            return _gotoError(quest, ponse);
        
        var questURL = quest.url;
        
        var redirectURLIndex = _nIndexOf(questURL, '/', 5);
        if (redirectURLIndex < 0)
            return _gotoError(quest, ponse);

        var urlToGoTo = questURL.substring(redirectURLIndex + 1, questURL.length);
        
        if (urlToGoTo.length < 4)
            return _gotoError(quest, ponse);
       
        if (!urlToGoTo)
            return _gotoError(quest, ponse);
        else
            ponse.redirect(urlToGoTo);
        
        
        var messageIndex;
        if ( msgIndex.isNumber() ) {
            messageIndex = Math.floor(msgIndex);
        }
        else {
            console.error('messageIndex is not valid:' + msgIndex);
            return;
        }
        
        var data = _dataFromHeader(quest);
        data.tweetId = tweetId;
        
        tracking.trackUserWithId(userIdStr, 'msg-goto', messageIndex, data, 
            function(err, entry) {
                if (err) {
                    console.error('Tracking error:');
                    console.error(err);
                }
                else {
                    console.log('Added tracking point:');
                    console.log(entry);
                }
            });
    };

function _gotoError(quest, ponse)
{
    ponse.send('Cannot redirect');
}

//!!!: Logo

function _dataFromHeader(quest)
{
    return _.pick(quest.headers, ['user-agent', 'referer']);
}

tracking.path.logo = '/logo/:userId?/:msgIndex?/image.gif'

tracking.route.logo = 
    function(quest, ponse)
    {
        // First of all serve file
        _servePublicFile( '/images/star192_anim.gif', 'image/gif', ponse );

        var noTracking = false;
        
        // console.log('quest.headers: ');
        // console.log(quest.headers);

        var host = quest.headers['host'];
        
        // console.log('host: ' + host + ' indexOf: ' + host.indexOf('local') );

        if (!tracking.debugTrackLocal)
        {
            if (host.indexOf('local') >= 0 ) {
                console.log('local tracking off');
                noTracking = true;
            }
        }
         
        var userAgent = quest.headers['user-agent'];
        
        if (userAgent) {
            noTracking = noTracking || userAgent.indexOf('EssenceNoTracking') > 0;
        }

        if (noTracking === true)
        {
            console.log('NO TRACKING');
        }
        else
        {
        	var userIdStr = quest.params.userId;
            var msgIndex  = quest.params.msgIndex;

            // console.log('userIdStr: ' + userIdStr);
            // console.log('msgIndex : ' + msgIndex);
            
            var data = _dataFromHeader(quest)
            
            var messageIndex;
            
            if ( msgIndex.isNumber() ) {
                messageIndex = Math.floor(msgIndex);
            }
            else {
                console.error('messageIndex is not valid:' + msgIndex);
                return;
            }

            tracking.trackUserWithId(userIdStr, 'msg-load', messageIndex, data,
                function(err, entry)
                {
                    if (err) {
                    	console.error('Tracking error:');
                    	console.error(err);
                    }
                    else {
                    	// console.log('Added tracking point:');
                    	// console.log(entry);
                    }
                });
        }
    };


tracking.trackUserWithId = 
    function(userIdStr, action, messageIndex, data, callback /* (err, entry) */)
    {
        a.assert_string(action, 'action');
       
        database.getUserEntryById(userIdStr, 
            function(err, userEntry) {
                if (err)
                    return callback(err);

                if (!userEntry)
                    return callback( new Error('Cannot find user with id:' + userIdStr) );

                _addStatPointToUserEntry(userEntry, action, messageIndex, data, callback);
            });
    };


function _addStatPointToUserEntry(userEntry, action, messageIndex, data, callback /* (err, entry) */)
{
    var dataPoint = {};

    userEntry.last_activity = new Date();

    dataPoint.userId      = userEntry._id;
    dataPoint.userTwitter = userEntry.twitter.user.screen_name;
    
    dataPoint.action = action;
    dataPoint.date   = userEntry.last_activity;
    dataPoint.messageIndex =  messageIndex;
    
    dataPoint.data   = data;
    
    
    async.parallel([
        function(callback) {
            database.insertTrackingPoint(dataPoint,
                function(err, entry)
                {
                    if (err) {
                        console.error('database.insertTrackingPoint failed with error:');
                        console.error(err);
                        return callback(err);
                    }

                    // console.log('insertStatPoint entry: ');
                    // console.log(entry);
                    
                    callback(null, entry);
                });
        },
        function(callback) {
            database.saveUserEntry(userEntry, callback);
        } ], 
        
        function(err, results)
        {
            if (err)
                return callback(err);
        
            callback(null, results[0]);
        });
}


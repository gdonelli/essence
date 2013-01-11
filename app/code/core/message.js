
/*
 * GET home page.
 */

var     path    = require('path')
    ,   fs      = require('fs')
    ;

var message = exports;

message.make =
    function(userEntry, vipList, callback /* (err, html) */ )
    {
        _getStylesheet( 
            function(err, stylesheetData)
            {
                if (err)
                    return callback(err);
                
                var result = '';
        
                result += '<html>';
                result += '<head>';
                
                result += '<style type="text/css">';
                result += stylesheetData;
                result += '</style>';

                result += '</head>';

                result += '<body>';

                result += '<div class="header">';
                result += '<h1>Essence</h1>';
                result += '</div>';
                        
                vipList.forEach(
                    function(friendEntry) {
                        result += _htmlEssenceForFriend(friendEntry);
                    });

                result += '<div class="footer">(' + userEntry.twitter.user.name + ')</div>';
                    
                result += '</body>';

                result += '</html>';
                
                callback(null, result);
            });
    };


function _getStylesheet( callback /* (err, data) */ )
{
    var stylePath = __dirname + '/../../public/stylesheets/preview.css';
    
    fs.readFile( stylePath, callback);
}

function _htmlEssenceForFriend(friend)
{
    if (!friend.essence) {
        console.error('friend.essence not defined');
        console.error('for friend:');
        console.error(friend);
        return;
    }
        
    var result = '';
    var sampleTweet = _.first(friend.essence);
    var twitterUser = sampleTweet.user;
    
    result += '<div class="user-essence" style="' + _styleForUser(twitterUser) +'">' ;

    // Badge
    result += '<div class="badge" style="' + _styleForUserBadge(twitterUser) +'">';
    result += '<p class="name">' + twitterUser.name + '</p>';
    result +=  _imgAvatarForUser(twitterUser) ;
    result += '</div>';
    
    result += '<div class="tweets">';
    
    result += _writeTweets(friend.essence);
    
    result += '</div>';

    result += '</div>';
    
    return result;
}

function _imgAvatarForUser(user, className)
{
    var userAvatar = user.profile_image_url; 
    
    if (!className)
        className = 'avatar';
        
    var result = '<img class="' + className + '" src="' + userAvatar + '"></img>';
    
    return result;
}

function _styleForUserBadge(user)
{
    var backgroundColor = user.profile_sidebar_fill_color;
    var borderColor     = user.profile_sidebar_border_color;
    
    var result = '';
    
    result += 'background-color: #' + backgroundColor + '; ';
    // result += 'border: 3px solid #' + borderColor + '; ';
    
    return result;
}

function _styleForUser(user)
{
    // console.log('_styleForUser user:')
    // console.log(user);

    var backgroundImageURL  = user.profile_background_image_url;
    var backgroundColor     = user.profile_background_color;
    
    var result = '';
    
    if (user.profile_use_background_image)
        result += 'background-image: url(' + backgroundImageURL + '); ';
        
    result += 'background-color: #' + backgroundColor + '; ';
    
    if (!user.profile_background_tile){
        result += 'background-repeat: no-repeat;';
        result += 'background-size: cover;';
    }
    
    result += 'color: ' + user.profile_text_color + ';';
    
    
    
    return result; 
}


function _tweetLink(tweet)
{
    return 'https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str;
}

function _retweetToHTML(tweet)
{
    var srcTweet   = tweet.retweeted_status;
    var user       = srcTweet.user;
    var userAvatar = user.profile_image_url; 
    
    var extra = '';

    extra += _imgAvatarForUser(user, 'retweet-avatar');
    extra += '<span class="retweet-name">' + user.name;
    extra += ':&nbsp;</span>';
    
    return _tweetToHTML(srcTweet, extra);
}

function _tweetToHTML(tweet, extra)
{
    if (tweet.retweeted_status) // is a re-tweet
        return _retweetToHTML(tweet);
    
    var style = '';
  
    if (tweet.user.profile_text_color)
        style += 'color: ' + tweet.user.profile_text_color + ';';
      
    var result = '';
    
    result += '<div class="tweet">';
    result += '<a target="_blank" href="' + _tweetLink(tweet) + '" style="' + style + '">';
    
    if (extra)
        result += extra;
    
    result += tweet.text;
    result += '</a>'
    
    result += '</div>'
    
    return result;
}

function _writeTweets(tweets)
{
    if (!tweets)
        return '[ undefined tweets ]';

    if (tweets.length == 0)
        return '[ zero tweets ]';
    
    var result = '';
    
    tweets.forEach(
        function(tweet) {
            var htmlEntry = _tweetToHTML(tweet);
            result += htmlEntry;
        });
    
    return result;
}


    
if (typeof String.prototype.toHTMLString != 'function') {
String.prototype.toHTMLString =
    function (){
        var result = '';

        for (var i=0; i<this.length; i++)
        {
            switch ( this.charCodeAt(i) )
            {
                case 10:    result += '<br>';   break;          
                case 32:    result += '&nbsp;'; break;
                default:    result += this.charAt(i);
            }
        }

        return result;

    };
}



/*
 * GET home page.
 */

var     path    = require('path')
    ,   fs      = require('fs')
    ,   request = require('request')
    ,	stylus  = require('stylus')
    ,	HTMLEncoder = require('node-html-encoder').Encoder
    ;


var message = exports;


message.make =
    function(userEntry, vipList, options, callback /* (err, html) */ )
    {
        _getMessageCSS( 
            function(err, css)
            {
                if (err)
                    return callback(err);
                
                var result = '';
        
                result += '<!DOCTYPE html><html>';
                result += '<head>';
                result += '<meta charset="utf-8">';
                result += '<style type="text/css">';
                result += css;
                result += '</style>';
                result += '</head>';

                result += '<body>';

                result += '<div class="header">';
                result += '<h1>Essence</h1>';
                
                if (options && options.subtitle)
                    result += '<h2>(' + options.subtitle + ')</h2>';
                
                result += '</div>';
                        
                vipList.forEach(
                    function(friendEntry) {
                        result += _htmlEssenceForFriend(friendEntry);
                    });

                result += '<div class="footer">';
                result += '<p>That&rsquo;s it ' + _toHTML(userEntry.twitter.user.name) + '</p>'
                result += '<p>What do you think about Essence?</p>';
                result += '</div>';
                
                result += '</body>';
                result += '</html>';
                
                callback(null, result);
            });
    };
    
var _encoder;

function _htmlEncoder()
{
    if (!_encoder)
        _encoder = new HTMLEncoder('numerical');
        
    return _encoder;
}

function _toHTML(string)
{
    return _htmlEncoder().htmlEncode(string);
}

message.stringToHTML = 
    function(string)
    {
        return _toHTML(string);
    }



var _messageCSS;

function _getMessageCSS(callback /* (err, css) */ )
{
    if (!_messageCSS)
    {
        _getStylesheet( 'message', 
            function(err, css) {
                _messageCSS = css;
                callback(null, _messageCSS);
            } );
    }
    else
        callback(null, _messageCSS);

}

function _getStylesheet( filename, callback /* (err, css) */ )
{
    var stylPath = global.appPublicPath + '/stylesheets/' + filename + '.styl';
    var cssPath  = global.appPublicPath + '/stylesheets/' + filename + '.css';
    
    // console.log('stylPath:' + stylPath);
    // console.log('cssPath:' + cssPath);

    fs.readFile( stylPath, 
        function(err, data) {
            var styl = data.toString(); 
            stylus.render(styl, { filename: stylPath },
                function(err, css){
                    if (err) 
                        return callback(err);

                    callback(null, css);
                });
        });
}

function _file_getStylesheet( callback /* (err, data) */ )
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
        return '';
    }
    
    if (friend.essence.length == 0)
        return '';
        
    var result = '';
    var sampleTweet = _.first(friend.essence);
    var twitterUser = sampleTweet.user;
    
    result += '<div class="user-essence" style="' + _styleForUser(twitterUser) +'">' ;

    // Badge
    result += '<div class="badge" style="' + _styleForUserBadge(twitterUser) +'">';
    result += '<p class="name">' + _toHTML(twitterUser.name) + '</p>';
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
    extra += '<span class="retweet-name">' + _toHTML(user.name);
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
    
    result += _toHTML(tweet.text);
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


/*
 * GET home page.
 */

var     path    = require('path')
    ,   fs      = require('fs')
    ,   request = require('request')
    ,	stylus  = require('stylus')
    ,	HTMLEncoder = require('node-html-encoder').Encoder
    
    ,	email   = use('email')
    ;


var presentation = exports;


function _subjectWithNames(names)
{
    var result = 'Essence of ';

    if (names.length == 1)
        result += names[0];
    else if (names.length == 2)
        result += names[0] + ' and ' + names[1];
    else if (names.length == 3)
        result += names[0] + ', ' + names[1] + ' and ' + names[2];
    else if (names.length > 3)
        result += names[0] + ', ' + names[1] + ' and ' + (names.length - 2) + ' more';
    else
        return 'Essence';
    
    return result;
}



// == Test ===
/*
console.log( _subjectWithNames(['Giovanni']) );
console.log( _subjectWithNames(['Giovanni', 'Eric']) );
console.log( _subjectWithNames(['Giovanni', 'Eric', 'Set']) );
console.log( _subjectWithNames(['Giovanni', 'Eric', 'Set', 'Nils']) );
*/


function _subject(userEntry, vipList, options)
{
    var names = [];
    
    vipList.forEach(
        function(vip)
        {
            if (vip.essence.length > 0)
                names.push(vip.name);
        });
    

    var result = _subjectWithNames(names);
    
    console.log(result);

    return result;
}


presentation.makeEmailMessage = 
    function(userEntry, vipList, options, callback /* (err, msg) */)
    {
        var toName  = userEntry.twitter.user.name;
        var toEmail = userEntry.email;
        
        var msg = {};
        
        msg.subject = _subject(userEntry, vipList, options);
        msg.from    = email.from();
        msg.to      = toName + ' <' + toEmail + '>';
        msg.bcc     = email.bcc();
        msg.text    = presentation.makePlainText(userEntry, vipList, options);

        presentation.makeHTML(userEntry, vipList, options,
            function(err, html)
            {
                if (err)
                    return callback(err);
            
                msg.html = html;
                    
                callback(null, msg);
            });
    };
    

presentation.makePlainText =
    function(userEntry, vipList, options)
    {
        var result = 'Essence\n\n';
        
        vipList.forEach(
            function(friendEntry) {
                result += _plainTextEssenceForFriend(friendEntry);
            });
        
        result += '\n';
        
        var settingsURL = _settingsURL(userEntry);
        result += 'Settings: <' + settingsURL + '>\n';
        
        var feedbackURL = _feedbackURL(userEntry);
        result += 'Feedback: <' + feedbackURL + '>\n';

        var supportURL  = _supportURL(userEntry);
        result += 'Support: <' + supportURL + '>\n';

        var unsubscribeURL = _unsubscribeURL(userEntry);
        result += 'Unsubscribe: <' + unsubscribeURL + '>\n';

        result += '\n\n';
        
        result += 'v' + global.appVersion;
        
        return result;
    };
    
    
presentation.makeHTML =
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

                result += '</head>';

                result += '<body>';
                
                result += _tag('body', '<div>'); // div container

                result += _header(userEntry, options);
                
                if (vipList.length == 0)
                {
                    result += _tag('.warning', '<div>You have no VIPs. Go to settings to add them.</div>')
                }
                else
                {
                    vipList.forEach(
                        function(friendEntry) {
                            result += _htmlEssenceForFriend(userEntry, friendEntry);
                        });
                }
                
                result += _footer(userEntry);

                result += '</div>';
                
                result += '</body>';
                result += '</html>';
                
                callback(null, result);
            });
    };


presentation.stringToHTML = 
    function(string)
    {
        return _toHTML(string);
    }


// TODO: Private


var host;

if (process.env.SUBDOMAIN)
    host = 'essenceapp.com';
else
    host = 'local.essence.com:3001';

function _deliveryIndex(userEntry)
{
    if (userEntry.deliveryIndex)
        return userEntry.deliveryIndex;
    else
        return 0;
}

function _header(userEntry, options)
{
    var result = '';
    var msgIndex = _deliveryIndex(userEntry);
    
    result += '<center>';
    result += '<a href="http://' + host+'">';
    result += _tag('.star', '<img src="http://' + host+ '/logo/' + userEntry._id + '/' + msgIndex+ '/image.gif" width="96" height="96"></img>');
    result += '</a>';
    
    if (options && options.subtitle)
        result += _tag('h2', '<h2>(' + options.subtitle + ')</h2>');
    else if (userEntry.deliveryDate == undefined)
        result += _tag('h2', '<h2>Welcome to Essence</h2>');
    
    result += '</center>';
    
    return result;
}

function _firstNameFromString(fullname)
{
    var parts = fullname.split(' ');
    
    if (parts.length >= 1)
        return parts[0];
    
    return fullname;
}

function _firstName(userEntry)
{
    var fullname = userEntry.twitter.user.name;
    
    return _firstNameFromString(fullname);
}


function _unsubscribeURL(userEntry)
{
    return 'http://' + host + '/delete/' + userEntry._id;
}

function _settingsURL(userEntry)
{
    return 'http://' + host + '/settings';
}

function _feedbackURL(userEntry)
{
    return 'mailto:' + process.env.EMAIL_ADDRESS + '?subject=Feedback v'  + global.appVersion;
}

function _supportURL(userEntry)
{
    return 'mailto:' + process.env.EMAIL_ADDRESS + '?subject=Support v'  + global.appVersion;
}


function _footer(userEntry)
{
    var unsubscribeURL = _unsubscribeURL(userEntry);
    var settingsURL = _settingsURL(userEntry);
    var feedbackURL = _feedbackURL(userEntry);
    var supportURL  = _supportURL(userEntry);

    var result = '';

    result += _tag('.footer', '<div>');

    result += _tag('.thatsit', '<div>That&rsquo;s it ' + _firstName(userEntry) + ', ' + 'what do you think about Essence?</div>');
    result += _tag('.footer-buttons', '<div>'); // Buttons

    result += _tag('.footer-btn', '<a href="' + settingsURL + '" target="_blank">Settings</a>');
    result += _tag('.footer-btn', '<a href="' + feedbackURL + '">Feedback</a>');
    result += _tag('.footer-btn', '<a href="' + supportURL + '">Support</a>');
    
    result += '</div>';
    
    result += _tag('.footer-a', '<a href="' + unsubscribeURL + '" target="_blank">Unsubscribe</a>');
    result += _tag('.version', '<div>v' + global.appVersion + '</div>');
    
    result += '</div>';

    return result;
}

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


function _tag(styleKey, htmlCode)
{
    var closeTagIndex = htmlCode.indexOf('>');
    var fstSpaceIndex = htmlCode.indexOf(' ');
    var breakIndex;
    
    if (fstSpaceIndex < 0)
    {
        if (closeTagIndex >= 0)
            breakIndex = closeTagIndex;
    }
    else
    {
        if (fstSpaceIndex < closeTagIndex)
            breakIndex = fstSpaceIndex;
        else
            breakIndex = closeTagIndex;
    }
    
    if (!breakIndex)
        throw new Error('cannot find where to insert style in: ' + htmlCode);
    
       
    var fstPart = htmlCode.substring(0, breakIndex);
    var sndPart = htmlCode.substring(breakIndex, htmlCode.length);
    
//    console.log('htmlCode: ' + htmlCode);
//    console.log('fstPart: ' + fstPart);
//    console.log('sndPart: ' + sndPart);
    
    return fstPart + ' style=\'' + _getStyle(styleKey) + '\'' + sndPart;
}

function _getStyle(key) // works for css file rendered by styl
{
    var indexOfKey = -1;
    var augmentedKey = key + ' {';

    if (!_messageCSS)
        throw new Error('_messageCSS is undefined');
    
    if ( _messageCSS.indexOf(augmentedKey) == 0)
        indexOfKey = 0;
    else
    {
        augmentedKey = '}\n' + key + ' {';
        indexOfKey = _messageCSS.indexOf(augmentedKey);
    }
    
    if (indexOfKey < 0)
        throw new Error('cannot find style for: ' + key);
    
    var endOfStyle = _messageCSS.indexOf('}', indexOfKey + 1);

    if (endOfStyle < 0)
        throw new Error('cannot endOfStyle for: ' + indexOfKey);

    var css = _messageCSS.substring(indexOfKey + augmentedKey.length, endOfStyle);

    var lines = css.split('\n');
    var lines = _.map(lines, function(str) { return str.trim(); } );
    
    var result = '';
    lines.forEach( function(str) { result += str + ' '; } );
    
    return result.trim();
}


var cacheCSS = true;

var _messageCSS;

function _getMessageCSS(callback /* (err, css) */ )
{
    if (!_messageCSS || !cacheCSS)
    {
        _getStylesheet( 'presentation', 
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
                    
                    process.nextTick(
                            function() {
                                callback(null, css);
                            }
                        );
                });
        });
}

function _file_getStylesheet( callback /* (err, data) */ )
{
    var stylePath = __dirname + '/../../public/stylesheets/preview.css';
    
    fs.readFile( stylePath, callback);
}

function _validEssenceForFriend(friend)
{
    if (!friend.essence) {
        console.error('friend.essence not defined');
        console.error('for friend:');
        console.error(friend);
        return false;
    }
    
    if (friend.essence.length == 0)
        return false;

    return true;
}


function _plainTextEssenceForFriend(friend)
{
    if (!_validEssenceForFriend(friend))
        return '';
        
    var result = '';

    var sampleTweet = _.first(friend.essence);
    var twitterUser = sampleTweet.user;
    
    result += '=[ ' + twitterUser.name + ' ]=\n';

    friend.essence.forEach(
        function(tweet){
            result += tweet.text + '\n';
        });

    result += '\n';

    return result;
}


function _htmlEssenceForFriend(userEntry, friend)
{
    if (!_validEssenceForFriend(friend))
        return '';
        
    var result = '';
    var sampleTweet = _.first(friend.essence);
    var twitterUser = sampleTweet.user;
    
    // class="user-essence"
    result += '<div style="' + _styleForUser(twitterUser) +'">' ;

    // header

    result += _tag('.header', '<div>');

    result += _imgAvatarForUser(twitterUser, '.avatar');
    result += _tag('.name-box', '<div>');
    result += _tag('.name', '<p>' + _toHTML(twitterUser.name) + '</p>');

    result += '</div>';
    
    result += '</div>';

    // class="tweets"
    result += _tag('.tweets', '<div>');
    
    result += _writeTweets(userEntry, friend.essence);
    
    result += '</div>';

    result += '</div>';
    
    return result;
}


function _imgAvatarForUser(user, className)
{
    var userAvatarURL = user.profile_image_url; 
        
    return _tag(className, '<img src="' + userAvatarURL + '"></img>');  
}

function _styleForUser(user)
{
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
    
    result += _getStyle('.user-essence');
    
    return result; 
}

function _isURL(str)
{
    if (str.length < 8)
        return false;
    
    var prefix = str.substring(0, 4);

    //	https:/
    //	http://
    //  0123456
    
    if (prefix != 'http')
        return false;
    
    if (str[4] == 's') {
        if (str[5] != ':')
            return false;
        
        if (str[6] != '/')
            return false;
    }
    else if (str[4] == ':') {
        if (str[5] != '/')
            return false;
        
        if (str[6] != '/')
            return false;
    }
    else
        return false;
    
    
    return true;
}

presentation.tweetURL =
    function(screenName, tweetId)
    {
        return 'https://twitter.com/' + screenName + '/status/' + tweetId;
    };

function _tweetLink(userEntry, tweet)
{
    // console.log(tweet);
    
    var text = tweet.text;
    
    if (!text) {
        console.error('text is empty for tweet:');
        console.error(tweet);
        return '#';
    }
        
    var elements = text.split(' ');
    
    var foundURL;
    for (var i=0; i<elements.length; i++)
    {
        var element_i = elements[i];
        
        if (_isURL(element_i)) {
            foundURL = element_i;
            break;
        }
    }
    
    if (!foundURL)
        foundURL = presentation.tweetURL(tweet.user.screen_name, tweet.id_str);
        
    var result = 'http://' + host + '/go/' + userEntry._id + '/' + _deliveryIndex(userEntry) + '/' + tweet.id_str + '/' + foundURL;
    
    return result;
}

function _retweetToHTML(userEntry, tweet, className)
{
    var srcTweet   = tweet.retweeted_status;
    var user       = srcTweet.user;
    var userAvatar = user.profile_image_url;
    
    var prefix = '';

    prefix += _imgAvatarForUser(user, '.retweet-avatar');
    
    prefix += _tag('.retweet-name', '<span>' + _toHTML(user.name) + ':&nbsp;</span>' );
    
    return _tweetToHTML(userEntry, srcTweet, className, prefix);
}

function _tweetToHTML(userEntry, tweet, className, prefix )
{
    if (tweet.retweeted_status) // is a re-tweet
        return _retweetToHTML(userEntry, tweet, className);
    
    var style = '';
  
    if (tweet.user.profile_text_color)
        style += 'color: ' + tweet.user.profile_text_color + ';';
      
    var result = '';
    
    result += _tag(className, '<div>');
    
    result += _tag('a', '<a target="_blank" href="' + _tweetLink(userEntry, tweet) + '">');
    
    if (prefix)
        result += prefix;
    
    result += _toHTML(tweet.text);
    result += '</a>'
    
    result += '</div>'
    
    return result;
}

function _writeTweets(userEntry, tweets)
{
    if (!tweets)
        return '[ undefined tweets ]';

    if (tweets.length == 0)
        return '[ zero tweets ]';
    
    var result = '';
    
    for (var i = 0; i<tweets.length; i++)
    {
        var tweet_i = tweets[i];
        var className = '.tweet';
        
        if (i == 0)
            className = '.first-tweet';
        if (i == tweets.length-1)
            className = '.last-tweet';
        
        var htmlEntry = _tweetToHTML(userEntry, tweet_i, className);
        result += htmlEntry;
    }
    
    return result;
}

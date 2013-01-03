
/*
 * GET home page.
 */

var querystring = require('querystring')
    ,   request = require('request')
    ,	assert  = require('assert')
    ,   _       = require('underscore')


var authentication = exports;


function _makeOAuth(options)
{
    var result =  {
            consumer_key:       process.env.CONSUMER_KEY
        ,   consumer_secret:    process.env.CONSUMER_SECRET
        };
    
    if (options)
        _.extend(result, options);
    
    return result;
}

authentication.path = {};
authentication.route= {};


authentication.path.login = '/login';

authentication.route.login =
    function(quest, ponse)
    {
        assert( process.env.CONSUMER_KEY != undefined, 'process.env.CONSUMER_KEY undefined');
        assert( process.env.CONSUMER_SECRET != undefined, 'process.env.CONSUMER_SECRET undefined');

        var requestTokenURL = 'https://api.twitter.com/oauth/request_token';
        
        var oauth = _makeOAuth( { callback: 'http://local.essence.com:3001/login-response' } );
        
        request.post({url:requestTokenURL, oauth:oauth},
            function (err, postPonse, body)
            {
                if (err)
                    return ponse.send('Login to Essence failed with error:' + err.stack );
                
                var access_token = querystring.parse(body);
       
                assert(quest.session != undefined, 'quest.session is undefined');
                
                // Store access_token in Session
                quest.session.access_token = access_token;
                
                var authenticateURL = 'https://api.twitter.com/oauth/authenticate?oauth_token=' + access_token.oauth_token;
                
                ponse.redirect(authenticateURL);
            });
    };

authentication.path.loginResponse = '/login-response';

authentication.route.loginResponse =
    function(quest, ponse)
    {
        // quest.query
        var inputQuery = quest.query;
        assert(inputQuery != undefined, 'inputQuery is undefined');
        assert(inputQuery.oauth_token != undefined, 'inputQuery.oauth_token is undefined');
        assert(inputQuery.oauth_verifier != undefined, 'inputQuery.oauth_verifier is undefined');

        // quest.session.access_token
        var sessionAccessToken = quest.session.access_token;
        assert(sessionAccessToken != undefined, 'sessionAccessToken is undefined');
        
        // Validate
        assert(inputQuery.oauth_token == sessionAccessToken.oauth_token, 'oauth_token missmatch');
       
        var access_token = quest.session.access_token;
        
        var oauth = _makeOAuth({	token:          inputQuery.oauth_token
                                ,   verifier:       inputQuery.oauth_verifier
                                ,   token_secret:   access_token.oauth_token_secret
                                });
        
        var accessTokenURL = 'https://api.twitter.com/oauth/access_token';
        
        request.post({url:accessTokenURL, oauth:oauth},
            function (e, r, body) {
                var perm_token = querystring.parse(body);
                quest.session.perm_token = perm_token;
                
                var oauth = _makeOAuth( {   token: perm_token.oauth_token
                                        ,   token_secret: perm_token.oauth_token_secret
                                        });

                var showURL = 'https://api.twitter.com/1/users/show.json?';
                var params =    {   screen_name: perm_token.screen_name
                                ,   user_id: perm_token.user_id
                                };
                
                showURL += querystring.stringify(params);
                
                request.get({url:showURL, oauth:oauth, json:true},
                    function (e, r, userInfo)
                    {
                        var userPropertiesToPick = [
                                    'id'
                                ,   'id_str'
                                ,   'name'
                                ,   'screen_name'
                                ,   'location'
                                ,   'url'
                                ,   'description'
                                ,	'protected'
                                ,   'followers_count'
                                ,   'friends_count'
                                ,	'listed_count'
                                ,   'created_at'
                                ,   'favourites_count'
                                ,   'utc_offset'
                                ,   'time_zone'
                                ,   'geo_enabled'
                                ,   'verified'
                                ,   'statuses_count'
                                ,   'lang'
                                ,   'profile_image_url'
                                ,   'profile_image_url_https'
                                ];
                        
                        quest.session.user = _.pick(userInfo, userPropertiesToPick);
                        
                        console.log(quest.session.user);
                        
//                        ponse.send( perm_token.screen_name + ', welcome to Essence' );

                        ponse.redirect('/');
                    });
    
            });
  
    };

authentication.path.logout = '/logout';

authentication.route.logout =
    function(quest, ponse)
    {
        quest.session.destroy();
               
        ponse.redirect('/');
    };



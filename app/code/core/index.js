
/*
 * GET home page.
 */

var     path    = require('path')
    ,   fs      = require('fs')
    
    ,   authentication  = use('authentication')
    ,	message         = use('message')
    ,	database		= use('database')
    ,   pages           = use('pages') 
    ;

var index = exports;

index.path = {};
index.route = {};

index.path.index = '/';

index.route.index = 
    function(quest, ponse)
    {
        if (!quest.session ||
            !quest.session.version )
        {
            // Outside page

            ponse.render('index', { title: 'Essence' });
        }
        else if (quest.session.version == authentication.version)
        {
            // User index page

            return _userIndex(quest, ponse);
        }
        else
        {
            // Stale user session. Redirect to login
            
            return ponse.redirect(authentication.path.login);
        }
    };


function _userIndex(quest, ponse)
{
    var user = authentication.userFromRequest(quest);

    var title = 'Essence (@' + user.screen_name + ')';
    
    ponse.render('user-index', {
            title: title,
            user: user
        } );        
}


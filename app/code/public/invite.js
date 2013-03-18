
/*
 * GET home page.
 */

var     path    = require('path')
    ,   fs      = require('fs')
    ,   async   = require('async')
    
    ,   authentication  = use('authentication')
    ,	database = use('database')
    ,	referal	 = use('referal')
    ;

var invite = exports;


invite.path   = {};
invite.route  = {};

    
invite.path.index    = '/invite';
invite.route.index   = 
    function(quest, ponse)
    {
        var user = authentication.userFromRequest(quest);

        console.log('user: ');
        console.log(user);
        
        var title = 'Essence (@' + user.screen_name + ')';
        
        ponse.render('invite', {
                    title:      title
                ,   user:       user
                ,   referalURL: referal.URLForUserName(quest, user.id_str)
            } );
    }



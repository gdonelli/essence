
/*
 * GET home page.
 */

var     path  = require('path')
    ,   fs    = require('fs')
    ,   async = require('async')
    ,   jade  = require('jade')
    ,   fs    = require('fs')
    
    ,   authentication  = use('authentication')
    ,	database = use('database')
    ,	referal	 = use('referal')
    ,	email	 = use('email')
    ;

var upgrade = exports;


upgrade.path   = {};
upgrade.route  = {};
upgrade.method  = {};
    
upgrade.path.index  = '/upgrade';
upgrade.route.index = 
    function(quest, ponse)
    {
        var user = authentication.userFromRequest(quest);
        
        var title = 'Essence (@' + user.screen_name + ')';
        
        var maxVipCount = 10;
        
        if (user.maxVipCount)
            maxVipCount = user.maxVipCount;
        
        ponse.render('upgrade', {
                    title:       title
                ,   maxVipCount: maxVipCount
                ,   user:        user
            } );
    };



upgrade.path.buy  = '/buy';
upgrade.route.buy = 
    function(quest, ponse)
    {
        var user = authentication.userFromRequest(quest);
        
        var title = 'Essence (@' + user.screen_name + ')';
        
        ponse.render('buy', {
                    title:       title
                ,   user:        user
            } );
    };




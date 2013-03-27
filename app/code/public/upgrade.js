
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
        
        var msg = {};
        msg.to      = email.bcc();
        msg.from    = email.from();
        msg.subject = 'WANTS-TO-BUY: ' + user.screen_name;
        msg.text    = _dumpObjectIndented(user, '');
        
        email.send(msg, 
            function(err) {
                if (err)
                    console.error('Failed to send `wants to buy message` for ' + user.screen_name);
            });

        ponse.render('buy', {
                    title:       title
                ,   user:        user
            } );
    };


function _dumpObjectIndented(obj, indent)
{
  var result = "";
  if (indent == null) indent = "";

  for (var property in obj)
  {
    var value = obj[property];
    if (typeof value == 'string')
      value = "'" + value + "'";
    else if (typeof value == 'object')
    {
      if (value instanceof Array)
      {
        // Just let JS convert the Array to a string!
        value = "[ " + value + " ]";
      }
      else
      {
        // Recursive dump
        // (replace "  " by "\t" or something else if you prefer)
        var od = DumpObjectIndented(value, indent + "  ");
        // If you like { on the same line as the key
        //value = "{\n" + od + "\n" + indent + "}";
        // If you prefer { and } to be aligned
        value = "\n" + indent + "{\n" + od + "\n" + indent + "}";
      }
    }
    result += indent + "'" + property + "' : " + value + ",\n";
  }
  return result.replace(/,\n$/, "");
}



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
invite.method  = {};
    
invite.path.index  = '/invite';
invite.route.index = 
    function(quest, ponse)
    {
        var user = authentication.userFromRequest(quest);
        
        var title = 'Essence (@' + user.screen_name + ')';
        
        ponse.render('invite', {
                    title:      title
                ,   user:       user
                ,   referalURL: referal.URLForUserName(quest, user.id_str)
            } );
    };


invite.path.testemail  = '/test/testemail';
invite.route.testemail = 
    function(quest, ponse)
    {
        var user = authentication.userFromRequest(quest);
        
        console.log('user:');
        console.log(user);
        
        ponse.render('email-invite-message', {
                    user: user
                ,   referalURL: referal.URLForUserName(quest, user.id_str)
            } );
    }
    
invite.method.send = 'post';
invite.path.send    = '/invite-send-email';
invite.route.send   = 
    function(quest, ponse)
    {
        var user = authentication.userFromRequest(quest);
        
        var text   = quest.body.text;
        var emails = _extractEmails(text);
        
        console.log('text:');
        console.log(text);
        
        console.log('emails:');
        console.log(emails);
        
        if (!emails || ! (emails.length > 0)) {
        	ponse.writeHead(400, {'Content-Type': 'application/json'});
            ponse.end();
            return;
        }
        
        async.map(emails, 
            function(email, callback)
            {
                _sendInvitationToEmail(user, email);
                
                callback(null, email);
            },
            function(err, results)
            {
                if (err) {
                    var result = { error: err.message };
                    ponse.writeHead(500, {'Content-Type': 'application/json'});
                    return ponse.end( JSON.stringify(result) );
                }
                
                var result = results.length;
                ponse.writeHead(200, {'Content-Type': 'application/json'});
                return ponse.end( JSON.stringify(result) );
            } );
        
    };
    
    
function _sendInvitationToEmail(fromUserEntry, email)
{
    console.log('_sendInvitationToEmail: ' + email);
}

function _isEmailValid(email)
{ 
	var regex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    
    return email.match(regex);
} 

function _cleanUpString(value)
{
    var result = '';
    
    for (var i=0; i<value.length; i++)
    {
        var char_i = value[i];
        if (char_i == '<' ||
            char_i == '>' ||
            char_i == ';' ||
            char_i == ',' ||
            char_i == '\n'||
            char_i == '\t'||
            char_i == '\r' )
        {
            // console.log('found ' + char_i);
            char_i = ' ';
        }
        
        result += char_i;
    }
    
    return result;
}

function _extractEmails(string)
{  
    var cleanString = _cleanUpString(string);
    
    var items = cleanString.split(' ');
    var result = [];
    
    items.forEach( 
        function(x) {
            if (_isEmailValid(x))
                result.push(x);
            else
                return null;
        } );
    
    return result;
}


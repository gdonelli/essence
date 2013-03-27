
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


invite.path.testemail  = '/test/invite-message';
invite.route.testemail = 
    function(quest, ponse)
    {
        ponse.render('email-invite-message', 
                     _inviteMessageOptions(quest) );
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
        
        var sentResult = false;
        
        async.map(emails, 
            function(anEmail, callback)
            {
                _sendInvitationToEmail(quest, anEmail, 
                    function(err){
                        callback(err, anEmail);
                    });
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

    
function _inviteMessageOptions(quest)
{
    var user = authentication.userFromRequest(quest);
        
    return {    
        user: user,
        referalURL: referal.URLForUserName(quest, user.id_str)
    };
}


function _sendInvitationToEmail(quest, anEmail, callback)
{
    console.log('_sendInvitationToEmail: ' + anEmail);
    
    var viewPath = global.appPublicPath + '/../views/email-invite-message.jade';
    
    fs.readFile(viewPath, 
        function(err, filedata) {
            if (err) {
                console.error('Failed to load view at path: ' + viewPath);
                return callback(err);
            }

            // console.log('filedata:');
            // console.log(filedata);
            
            var jadePage  = jade.compile( filedata, { filename: viewPath } );
            var finalPage = jadePage( _inviteMessageOptions(quest) );
            
            if (finalPage) {
                // console.log('finalPage: ' + finalPage);
                
                var user = authentication.userFromRequest(quest);
                
                var msg = {};
                msg.to = anEmail;
                
                msg.from = email.from();
                msg.bcc  = email.bcc();
                
                msg.subject = user.name + ' invited you to check out EssenceApp';
                msg.html = finalPage;
                
                email.send(msg, callback);
            }
            
        });
    
}

function _isEmailValid(anEmail)
{ 
	var regex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    
    return anEmail.match(regex);
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


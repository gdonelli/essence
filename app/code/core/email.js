
/*
 * email
 */

var 	emailjs = require('emailjs')
    ,	a       = use('a')
    ;


var email = exports;

var _server;

function _smtpServer()
{
    if (!_server) {
        a.assert_string(process.env.EMAIL_ADDRESS);
        a.assert_string(process.env.SMTP_USER);
        a.assert_string(process.env.SMTP_PASSWORD);
        a.assert_string(process.env.SMTP_HOST);
        
        _server = emailjs.server.connect({
                user:       process.env.SMTP_USER
            ,   password:   process.env.SMTP_PASSWORD
            ,   host:       process.env.SMTP_HOST
            ,   ssl:        true
            });
    }
    
    return _server;
}

email.sendEssenceTo =
    function(userName, userEmail, htmlMessage, callback /* (err) */ )
    {
        if (!userEmail)
            return callback(new Error('No valid email given'));
            
        var msg = {};
        msg.subject = 'Essence';
        msg.from    = _from();
        msg.to      = userName + ' <' + userEmail + '>';
        msg.attachment  = [{ 
                data: htmlMessage 
            ,	alternative:true
            }];
            
        msg.text = 'Essence is delivered as rich HTML attached to this email';
        
        email.send(msg, callback);
    };


email.sendEssence =
    function(userEntry, htmlMessage, callback /* (err) */ )
    {
        var userEmail = userEntry.email;
        var userName  = userEntry.twitter.user.name;
        
        email.sendEssenceTo(userName, userEmail, htmlMessage, callback);
    };

function _from()
{
    a.assert_string(process.env.EMAIL_ADDRESS);
    
    return 'Essence <' + process.env.EMAIL_ADDRESS + '>';
}

email.sendConfirmationMessage = 
    function(userEntry, confirmationURL, callback /* (err, message) */ )
    {
        var userEmail = userEntry.email_to_confirm;
        var userName = userEntry.twitter.user.name;
        
        var subject = 'Please confirm Essence activation';
        var msg = {
            	subject: subject
            ,	from:   _from()
            ,	to:     userName + ' <' + userEmail + '>'
            }
        
        msg.text  = 'Hi ' + userName +',\n' ;
        msg.text += '    to enable Essence, please go to the following address:\n\n'
        msg.text += confirmationURL + '\n';
        msg.text += '\n';
        msg.text += 'Essence will sends you an email once a day containing the tweets from'
        
        var vipList = userEntry.vipList;
        if (!vipList || vipList.length == 0)
            msg.text += ' the people you care the most.\n';
        else {
            msg.text += ':\n\n';
            vipList.forEach(
                function(entry) {
                    msg.text += '    ' + entry.name + ' (@' + entry.screen_name + ')\n';
                } );
        }
        
        msg.text += '\n';
        msg.text += 'Thank you!\n';
        msg.text += 'The Essence team';
        
        email.send(msg, callback);
    };
    
email.send =
    function(msg, callback)
    {
        var server = _smtpServer();

        server.send(msg, 
            function(err, message)
            {
                if (err) {
                    console.error('Failed to Send Email with error:');
                    console.error(err.stack);
                    console.error('message:');
                    console.error(msg);
                    
                    return callback(err);
                }
                
                callback(err, message);
            });    
    };
    
email.sendErrorMessage = 
    function(err, callback)
    {
        var subject = 'Essence error: ' + err.message;
        var msg = {
            	subject: subject
            ,	from:   _from()
            ,	to:     'Daddy <' + process.env.ADMIN_EMAIL_ADDRESS + '>'
            }
        msg.text = err.stack;
        
        email.send(msg, callback);
    };
    
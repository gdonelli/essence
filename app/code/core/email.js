
/*
 * email
 */

var 	emailjs = require('emailjs')
    ,	a       = use('a')
    ;


var email = exports;

var _server;

function _connectToServer()
{
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

_connectToServer();

email.sendConfirmationMessage = 
    function(userEntry, confirmationURL, callback /* (err, message) */ )
    {
        var userEmail = userEntry.email_to_confirm;
        var userName = userEntry.twitter.user.name;
        
        var subject = 'Please confirm Essence activation';
        var msg = {
            	subject: subject
            ,	from:   'Essence <' + process.env.EMAIL_ADDRESS + '>'
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

        _server.send(msg, callback);
    };

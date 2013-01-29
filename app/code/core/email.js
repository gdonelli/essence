
/*
 * email
 */

var 	nodemailer  = require('nodemailer')

    ,	a   = use('a')
    ;


var email = exports;

var _nodemailerTransport;

function _nodemailerServer()
{
    if (!_nodemailerTransport)
    {
        _nodemailerTransport = nodemailer.createTransport("SMTP",{
                service: "Gmail",
                auth: {
                    user: process.env.SMTP_USER + "@gmail.com",
                    pass: process.env.SMTP_PASSWORD
                }
            });
    }
    
    return _nodemailerTransport;
}

function _from()
{
    a.assert_string(process.env.EMAIL_ADDRESS);
    
    return 'Essence <' + process.env.EMAIL_ADDRESS + '>';
}

function _bcc()
{
    a.assert_string(process.env.ADMIN_EMAIL_ADDRESS);
    
    return 'Essence Admin <' + process.env.ADMIN_EMAIL_ADDRESS + '>';
}


email.sendConfirmationMessage = 
    function(userEntry, confirmationURL, callback /* (err, message) */ )
    {
        var userEmail = userEntry.email_to_confirm;
        var userName = userEntry.twitter.user.name;
        
        var subject = userName + ', please activate Essence now';
        var msg = {
            	subject: subject
            ,	from:   _from()
            ,	to:     userName + ' <' + userEmail + '>'
            ,   bcc:	process.env.ADMIN_EMAIL_ADDRESS
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
        var server = _nodemailerServer();
        
        server.sendMail(msg,
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


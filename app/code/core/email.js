
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


email.from =
    function() {
        a.assert_string(process.env.EMAIL_ADDRESS);
        return 'Essence <' + process.env.EMAIL_ADDRESS + '>';
    };


email.bcc =
    function() {
        a.assert_string(process.env.ADMIN_EMAIL_ADDRESS);
        return 'Essence Admin <' + process.env.ADMIN_EMAIL_ADDRESS + '>';
    };


email.send =
    function(msg, callback /* (msg, msg) */)
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
            ,	from:   email.from()
            ,	to:     'Daddy <' + process.env.ADMIN_EMAIL_ADDRESS + '>'
            }
        msg.text = err.stack;
        msg.text += '\n\n v' + global.appVersion;
        
        email.send(msg, callback);
    };



/*
 * email
 */

var     email   = use('email')
    ,	a       = use('a')
    ;

var confirm = exports;

confirm.sendConfirmationMessage = 
    function(userEntry, confirmationURL, callback /* (err, message) */ )
    {
        var userEmail = userEntry.email_to_confirm;
        var userName = userEntry.twitter.user.name;
        
        var subject = userName + ', please activate Essence now';
        var msg = {
            	subject: subject
            ,	from:   email.from()
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


/*
 * GET home page.
 */

var     path    = require('path')
    ,   fs      = require('fs')
    
    ,   authentication  = use('authentication')
    ,	database    = use('database')
    ,	userly      = use('userly')
    ,	a           = use('a')
    ,	email       = use('email')
    ,   tracking    = use('tracking')
    ;

var index = exports;

index.path = {};
index.route = {};
index.method = {}; 


index.path.index  = '/';
index.route.index = 
    function(quest, ponse)
    {
        if (!quest.session ||
            !quest.session.version )
        {
            // Outside page
            ponse.render('index', { 
                	title:   'Essence', 
                    options: {}
                });
        }
        else if (quest.session.version == authentication.version)
        {
            // User index page

            return _userIndex(quest, ponse);
        }
        else
        {
            // Stale user session. Redirect to login
            
            return ponse.redirect(authentication.path.login);
        }
    };


function _userIndex(quest, ponse)
{
    var user = authentication.userFromRequest(quest);

    var title = 'Essence (@' + user.screen_name + ')';
    
    ponse.render('user-index', {
            title:      title,
            user:       user,
        } );        
}


index.path.prettyemail  = '/prettyemail';
index.route.prettyemail = 
    function(quest, ponse)
    {
        var heroUserId = process.env.HERO_ID;
        
        a.assert_string(heroUserId);

        userly.previewForUserWithId(heroUserId, {}, 
            function(err, html)
            {
                if (err)
                    return ponse.send(err.message);

                ponse.writeHead(200, {'Content-Type': 'text/html'});
                ponse.write('<!DOCTYPE html><html><body>');
                
                ponse.write(html);
                
                ponse.end('</body></html>');
                
            });
    };


index.path.feedback  = '/feedback'; // '/feedback/:option?';
index.route.feedback = 
    function(quest, ponse)
    {
    	var user = null;
        try
        {
            user = authentication.userFromRequest(quest);
        }
        catch(e)
        {
        }
        
        var title = 'Essence Feedback';
        
        if (user)
            title += ' (@' + user.screen_name + ')';
        
        ponse.render('feedback', {
                title: title,
                user: user
            } );  
    };


index.method.send = 'post';
index.path.send   = '/feedback/send';
index.route.send  = 
    function(quest, ponse)
    {
    	var user = null;
        try
        {
            user = authentication.userFromRequest(quest);
        }
        catch(e)
        {
        }
        

        var title = 'Essence Feedback';
        if (user)
            title += ' (@' + user.screen_name + ')';
        
        var vote    = quest.body.vote;
        var comment = quest.body.comment;
        var formEmail   = quest.body.email;
        
        if (!vote || vote.length < 5)
            return userPages.route.feedback(quest, ponse);
        
        var userId = user ? user._id : null;
        
        _sendFeedbackWithUser(userId, vote, comment, formEmail,
            function(err, message)
            {
                if (err) {
                    console.error('Send Feedback failed with error:');
                    console.error(err.stack);
                }
            })
        
        ponse.render('thankyou', {
                title: title,
            	user: user,
                comment: comment
            } );
    };


function _sendFeedbackWithUser(userId, vote, comment, formEmail, callback)
{
    if (userId == null)
        sendToUser(null);
    else
        database.getUserEntryById(userId,
            function(err, userEntry) {
                sendToUser(userEntry);
            });
        
    function sendToUser(userEntry)
    {
        var msg = {};
        
        msg.from = email.from();
        msg.to   = email.bcc();
        
        var userName = userEntry ? userEntry.twitter.user.name : 'the Web';
        
        msg.subject = vote + ' Feedback from ' + userName;
        msg.text = 'From:\n';
        
        if (userEntry)
            msg.text += userEntry.email;
        else
            msg.text += formEmail;
            
        msg.text += '\n\nMessage:\n'  + comment;
        msg.text += '\n\n-\nv' + global.appVersion;
        
        email.send(msg, callback);
    }
}


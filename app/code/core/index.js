
/*
 * GET home page.
 */

var     path    = require('path')
    ,   fs      = require('fs')
    
    ,   authentication  = use('authentication')
    ,	message         = use('message')
    ,	database		= use('database')
    ;

var index = exports;

index.path = {};
index.route = {};

index.path.index = '/';

index.route.index = function(quest, ponse)
    {
        if (!quest.session ||
            !quest.session.version )
            return _loginPage(quest, ponse);
        else if (quest.session.version == authentication.version)
            return _userPage(quest, ponse);
        else
            return ponse.redirect(authentication.path.login);
    };


function _loginPage(quest, ponse)
{
    ponse.render('index', { title: 'Essence' });
}

function _userPage(quest, ponse)
{
    var user = authentication.userFromRequest(quest);

    var title = 'Essence (@' + user.screen_name + ')';
    
    ponse.render('index_user', {
            title: title,
            user: user
        } );
}


var service = use('service');

index.path.confirmEmail = '/confirm/:userId?/:ticket?';

index.route.confirmEmail = 
    function(quest, ponse)
    {
        var userId;
        var ticket;
        
        try {
            userId = a.assert_string(quest.params.userId);
            ticket = a.assert_string(quest.params.ticket);
        }
        catch (err) {
            return ponse.send('Wrong input');
        }
        
        console.log('userId: ' + userId);
        console.log('ticket: ' + ticket);
        
        service.verifyEmail(userId, ticket, 
            function(err, email )
            {
                if (err)
                    return ponse.send(err.message);
                    
                ponse.send('Email confirmed: ' + email );
            });
    };


function _userIdFromRequest(quest)
{
    if (quest.params.essenceUserId)
        return quest.params.essenceUserId;
    else
        return authentication.userFromRequest(quest)._id;
}



index.path.destroyList = '/destroyList/:essenceUserId?';

index.route.destroyList = 
    function(quest, ponse)
    {
        var userId = _userIdFromRequest(quest);

        service.destroyEssenceList(userId,
            function(err)
            {
                ponse.send( { error: err } );
            });
    };

    
index.path.preview = '/preview/:essenceUserId?';

index.route.preview = 
    function(quest, ponse)
    {
        var userId = _userIdFromRequest(quest);

        service.getEssence(userId, { preview: true },
            function(err, userEntry, vipList)
            {
                if (err) {
                    // TODO: deal with too many request error
                    return ponse.send( JSON.stringify(err) );
                }

                message.make(userEntry, vipList,
                    function(err, html)
                    {
                        ponse.writeHead(200, {'Content-Type': 'text/html'});
                        ponse.end(html);
                    });
            });
    };


index.path.allusers = '/admin/users';

index.route.allusers = 
    function(quest, ponse)
    {
        database.allUsers(
            function(err, users)
            {
                ponse.writeHead(200, {'Content-Type': 'text/html'});
                
                ponse.write('<html>');
                
                users.forEach(
                    function(user) {
                        var row = '';
                        
                        row += '<div>';
                        
                        row += '<span>' + user.twitter.user.name + ': </span>';
                        
                        row += '<span>vip#:' + (user.vipList ? user.vipList.length : 0) + ' </span>';
                        row += '<a target="_blank" href="/preview/' + user._id + '">preview</a>';
                        
                        row += '</div>';
                        
                        ponse.write(row);

                    });
                    
                ponse.end('</html>');
            });
    };



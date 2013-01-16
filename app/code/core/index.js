
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

        service.getAugmentedVipList(userId, { preview: true },
            function(err, userEntry, vipList)
            {
                if (err) {
                    // TODO: deal with too many request error
                    return ponse.send( JSON.stringify(err) );
                }

                message.make(userEntry, vipList, { subtitle: 'Preview' },
                    function(err, html)
                    {
                        ponse.writeHead(200, {'Content-Type': 'text/html'});
                        ponse.end(html);
                    });
            });
    };


index.path.tz = '/tz';

index.route.tz = 
    function(quest, ponse)
    {
        ponse.send( 'offset: ' + (new Date).getTimezoneOffset() );
    }


index.path.actual = '/actual/:essenceUserId?';

index.route.actual = 
    function(quest, ponse)
    {
        var engine = use('engine');
        var userId = _userIdFromRequest(quest);
        
        database.getUserEntryById(userId,
            function(err, userEntry)
            {
                engine.getEssenceMessageForUser(userEntry, 
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
        ponse.writeHead(200, {'Content-Type': 'text/html'});
        ponse.write('<!DOCTYPE html><html>');

        ponse.write('<table cellpadding="10px">');

        database.forEachUser(
            function(err, user) {
                if (err)
                    ponse.write('<td>Error: ' + err.message + '</td>');
            
                if (err || user == null)
                    return ponse.end('</table></html>');
                    
                var row = '';
                
                row += '<tr>';
                
                row += '<td><strong>' + message.stringToHTML(user.twitter.user.name) + '</strong></td>';
                row += '<td>' + message.stringToHTML(user.email) + '</td>';
                row += '<td>#' + (user.vipList ? user.vipList.length : 0) + ' </td>';
                row += '<td><a target="_blank" href="/preview/' + user._id + '">preview</a></td>';
                row += '<td><a target="_blank" href="/actual/' + user._id + '">actual</a></td>';
                row += '<td><a target="_blank" href="/admin/send/' + user._id + '">send</a></td>';

                row += '</tr>';
                
                ponse.write(row);
            });
    };

index.path.adminSend = '/admin/send/:essenceUserId?';

index.route.adminSend = 
    function(quest, ponse)
    {
        var userId = _userIdFromRequest(quest);
        
        service.sendEssence(userId, {},
            function(err)
            {
                if (err) {
                    var obj = {};
                    obj.message = err.message;
                    obj.stack = err.stack;
                    
                    return ponse.send( obj );
                }
                
                ponse.send('OK');
            });
    };
    

/*
 * GET home page.
 */

var     path    = require('path')
    ,   fs      = require('fs')
    ,   authentication  = use('authentication')
    ,	message         = use('message')
    ,	database		= use('database')
    ,   service         = use('service')
    ;

var pages = exports;


pages.path = {};
pages.route = {};


pages.path.settings = '/settings';

pages.route.settings = 
    function(quest, ponse)
    {
        var user = authentication.userFromRequest(quest);

        var title = 'Essence (@' + user.screen_name + ')';
        
        ponse.render('settings', {
                title: title,
                user: user
            } );        
    }


pages.path.deleteDelete = '/delete-delete/:essenceUserId?';

pages.route.deleteDelete = 
    function(quest, ponse)
    {
        var userId = _userIdFromRequest(quest);
        
        database.removeUserUserWithId(userId,
            function(err)
            {
                if (err)
                {
                    console.error('Failed to remove user with id: ' + userId + ' Error:');
                    console.error(err);
                    
                    ponse.send( err.toString() );
                }
                else
                    authentication.route.logout(quest, ponse);
            });
        
        
    };


pages.path.delete = '/delete/:essenceUserId?';

pages.route.delete = 
    function(quest, ponse)
    {
        var userId = _userIdFromRequest(quest);
        
        database.getUserEntryById(userId,
            function(err, userEntry)
            {
                var user        = userEntry.twitter.user;
                var screen_name = user.screen_name;
                
                user._id = userEntry._id; 
                
                var title = 'Essence (@' + screen_name + ')';
                
                ponse.render('delete',  {
                        title:  title,
                        user:   user
                    }); 
            });
    };


pages.path.confirmEmail = '/confirm/:userId?/:ticket?';

pages.route.confirmEmail = 
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
                    
                ponse.redirect(pages.path.settings);
            });
    };


function _userIdFromRequest(quest)
{
    if (quest.params.essenceUserId)
        return quest.params.essenceUserId;
    else
        return authentication.userFromRequest(quest)._id;
}



pages.path.destroyList = '/destroyList/:essenceUserId?';

pages.route.destroyList = 
    function(quest, ponse)
    {
        var userId = _userIdFromRequest(quest);

        service.destroyEssenceList(userId,
            function(err)
            {
                ponse.send( { error: err } );
            });
    };

pages.path.cleanDeliveryDate = '/admin/cleanDeliveryDate/:essenceUserId?';

pages.route.cleanDeliveryDate = 
    function(quest, ponse)
    {
        var userId = _userIdFromRequest(quest);
        
        database.getUserEntryById(userId,
            function(err, userEntry)
            {
                if (err)
                    return ponse.send(err.message);
                
                delete userEntry.deliveryDate;
                
                database.saveUserEntry(userEntry,
                    function(err, userEntry) 
                    {
                        if (err)
                            return ponse.send(err.message);
                            
                        ponse.send('OK');
                    });
            });
    };

    
pages.path.preview = '/preview/:essenceUserId?';

pages.route.preview = 
    function(quest, ponse)
    {
        var userId = _userIdFromRequest(quest);

        // console.log('About to get service.getAugmentedVipList');

        service.getAugmentedVipList(userId, { preview: true },
            function(err, userEntry, vipList)
            {
                if (err) {
                    // TODO: deal with too many request error
                    return ponse.send( err.message );
                }
                
                // console.log('About to message.make');
                
                message.make(userEntry, vipList, { subtitle: 'Preview' },
                    function(err, html)
                    {
                        ponse.writeHead(200, {'Content-Type': 'text/html'});
                        ponse.end(html);
                    });
            });
    };


pages.path.tz = '/tz';

pages.route.tz = 
    function(quest, ponse)
    {
        ponse.send( 'offset: ' + (new Date).getTimezoneOffset() );
    }


pages.path.actual = '/actual/:essenceUserId?';

pages.route.actual = 
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


pages.path.allusers = '/admin/users';

pages.route.allusers = 
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
                row += '<td><a target="_blank" href="/admin/cleanDeliveryDate/' + user._id + '">clean deliveryDate</a></td>';

                row += '</tr>';
                
                ponse.write(row);
            });
    };

pages.path.adminSend = '/admin/send/:essenceUserId?';

pages.route.adminSend = 
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
    
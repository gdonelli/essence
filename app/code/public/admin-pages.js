
/*
 * GET home page.
 */

var     path    = require('path')
    ,   fs      = require('fs')
    ,   authentication  = use('authentication')
    ,	database		= use('database')
    ,   service         = use('service')
    ;

var admin_pages = exports;


admin_pages.path = {};
admin_pages.route = {};


admin_pages.path.allusers   = '/admin/users';
admin_pages.route.allusers  = 
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
                
                row += '<td><strong>' + presentation.stringToHTML(user.twitter.user.name) + '</strong></td>';
                row += '<td>' + presentation.stringToHTML(user.email) + '</td>';
                row += '<td>#' + (user.vipList ? user.vipList.length : 0) + ' </td>';
                row += '<td><a target="_blank" href="/preview/' + user._id + '">preview</a></td>';
                row += '<td><a target="_blank" href="/actual/' + user._id + '">actual</a></td>';
                row += '<td><a target="_blank" href="/admin/send/' + user._id + '">send</a></td>';
                row += '<td><a target="_blank" href="/admin/cleanDeliveryDate/' + user._id + '">clean deliveryDate</a></td>';

                row += '</tr>';
                
                ponse.write(row);
            });
    };


admin_pages.path.cleanDeliveryDate  = '/admin/cleanDeliveryDate/:userId?';
admin_pages.route.cleanDeliveryDate = 
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


admin_pages.path.tz     = '/tz';
admin_pages.route.tz    = 
    function(quest, ponse)
    {
        ponse.send( 'offset: ' + (new Date).getTimezoneOffset() );
    }
    

admin_pages.path.adminSend  = '/admin/send/:userId?';
admin_pages.route.adminSend = 
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
    

/*
 * GET home page.
 */

var     path    = require('path')
    ,   fs      = require('fs')
    ,	moment  = require('moment')
    ,   uaparser = require('ua-parser') 
    
    ,	database		= use('database')
    ,   service         = use('service')
    ,	userly			= use('userly')
    ,   authentication  = use('authentication')
    ,   presentation    = use('presentation')
    ,   userPages       = use('user-pages')
    ,   list            = use('list')
    ;

var admin_pages = exports;


admin_pages.path = {};
admin_pages.route = {};


//!!!: Users Admin page      

admin_pages.path.allusers   = '/admin/users';
admin_pages.route.allusers  = 
    function(quest, ponse)
    {
        ponse.writeHead(200, {'Content-Type': 'text/html'});
        ponse.write('<!DOCTYPE html><html>');

        ponse.write('<table cellpadding="10px">');
        
        var row = '';
        
        row += '<tr>';
        
        row += '<td>Name</td>';
        row += '<td>Email</td>';
        row += '<td>VIP</td>';
        row += '<td>last_activity</td>';
        row += '<td></td>';
        row += '<td></td>';
        row += '<td></td>';
        row += '<td>DeliveryDate</td>';

        row += '<td>LIST</td>';
        
        row += '<td>delete</td>';
        
        row += '</tr>';
        
        ponse.write(row);
        
        database.forEachUser(
            function(err, user) {
                if (err)
                    ponse.write('<td>Error: ' + err.message + '</td>');
            
                if (err || user == null)
                    return ponse.end('</table></html>');
                    
                row = '';
                
                row += '<tr>';
                
                row += '<td><strong>' + presentation.stringToHTML(user.twitter.user.name) + '</strong> @' + user.twitter.user.screen_name + '</td>';
                
                if (user.email)
                    row += '<td>' + presentation.stringToHTML(user.email) + '</td>';
                else if (user.email_to_confirm)
                    row += '<td style="color:orange;">' + presentation.stringToHTML(user.email_to_confirm) + ' <a href="/admin/confirm-email/' + user._id + '">confirm </a></td>';
                else
                    row += '<td>-</td>';
                
                
                row += '<td>#' + (user.vipList ? user.vipList.length : 0) + ' </td>';
                
                row += '<td>';
                
                if (user.last_activity)
                    row +=  _stringRelativeFromDBDateString(user.last_activity);
                else
                    row += 'no activity';

                row += '</td>';
                
                
                row += '<td><a target="_blank" href="/preview/' + user._id + '">preview</a></td>';
                row += '<td><a target="_blank" href="/actual/' + user._id + '">actual</a></td>';
                row += '<td><a target="_blank" href="/admin/send/' + user._id + '">send</a></td>';
                row += '<td><a target="_blank" href="/admin/cleanDeliveryDate/' + user._id + '">clean</a></td>';

                row += '<td><a target="_blank" href="/admin/list/setup/' + user._id + '">setup</a> | <a target="_blank" href="/admin/list/destroy/' + user._id + '">destroy</a></td>';
                row += '<td><a target="_blank" href="/delete/' + user._id + '">delete</a></td>';

                row += '</tr>';
                
                ponse.write(row);
            });
    };


admin_pages.path.cleanDeliveryDate  = '/admin/cleanDeliveryDate/:userId?';
admin_pages.route.cleanDeliveryDate = 
    function(quest, ponse)
    {
        var userId = userPages.userIdFromRequest(quest);
        
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


admin_pages.path.tz = '/admin/tz';
admin_pages.route.tz= 
    function(quest, ponse)
    {
        ponse.send( 'offset: ' + (new Date).getTimezoneOffset() );
    }
    

admin_pages.path.adminSend  = '/admin/send/:userId?';
admin_pages.route.adminSend = 
    function(quest, ponse)
    {
        var userId = userPages.userIdFromRequest(quest);
        
        userly.deliverEssenceToUserWithId(userId, {},
            function(err, msg) {
                if (err) {
                    var obj = {};
                    obj.message = err.message;
                    obj.stack = err.stack;
                    return ponse.send(obj);
                }
                
                if (msg === null)
                    ponse.send('Nothing to send, Message is null.');
                else
                    ponse.send('Message sent!');
            });
    };

function _stringRelativeFromDBDateString(dateString)
{
    var when = moment( new Date(dateString) );
    
    return when.fromNow();
}

admin_pages.path.tracking  = '/admin/tracking/:options?';
admin_pages.route.tracking = 
    function(quest, ponse)
    {
        ponse.writeHead(200, {'Content-Type': 'text/html'});
        ponse.write('<!DOCTYPE html><html>');

        ponse.write('<table cellpadding="10px" style="width:1000px">');
        
        database.getCursorOnTracking(
            function(err, cursor)
            {
                cursor.each(
                    function(err, dataPoint) {
                        if (err)
                            ponse.write('<td>Error: ' + err.message + '</td>');
                    
                        if (err || dataPoint == null)
                            return ponse.end('</table></html>');
                        
                        if (!quest.params.options && dataPoint.userTwitter == 'gdonelli')
                            return;
                        
                        var row = '';
                        
                        row += '<tr>';
                        
                        row += '<td><strong> @' + presentation.stringToHTML(dataPoint.userTwitter) + '</strong></td>';
                        
                        row += '<td>' + _stringRelativeFromDBDateString(dataPoint.date) + '</td>';

                        row += '<td>' + dataPoint.action + '</td>';
                        
                        row += '<td>';
                        
                        if (dataPoint.messageIndex)
                            row += dataPoint.messageIndex;
                            
                        if (dataPoint.action == 'msg-goto')
                            if (dataPoint.data.tweetId)
                                row += ' <a href="' + presentation.tweetURL(dataPoint.userTwitter, dataPoint.data.tweetId) + '" target="_blank">tweet</a>';
                            else if (dataPoint.data.goto)
                                row += ' <a href="' + dataPoint.data.goto + '" target="_blank">link</a>';
                            else
                                row += '???';
                    
                        row += '</td>';

                        if (dataPoint.data) {
                            var pointUserAgent = dataPoint.data['user-agent'];
                            
                            if (pointUserAgent) {
                                var srcAgent =  uaparser.parse(pointUserAgent);
                                // console.log(srcAgent);
                                
                                if (srcAgent) {
                                    if (srcAgent.userAgent)
                                        row += '<td>' +  srcAgent.userAgent.toString() + '</td>';
                                    
                                    if (srcAgent.os)
                                        row += '<td>' +  srcAgent.os.toString() + '</td>';
                                }
                            }

                            var referer = dataPoint.data['referer'];
                            
                            row += '<td>';
                            
                            if (referer)
                            {
                                row += '<a href="' + referer + '">';
                                var maxLen = 40;
                                if (referer.length > maxLen)
                                    row += referer.substring(0, maxLen) + '...';
                                else
                                    row += referer;
                                    
                                row += '</a>'
                            }
                                 
                                 
                            row += '</td>';
                        }
                        
                        row += '</tr>';
                        
                            
                        ponse.write(row);
                    });

            
            });

    };

function _userCommand(quest, callback /* (err, userEntry, oauth) */)
{
    var userId = userPages.userIdFromRequest(quest);
    
    database.getUserEntryById(userId,
        function(err, userEntry)
        {
            if (err)
                return callback(err);
            
            var oauth = authentication.oauthFromUserEntry(userEntry);

            callback(null, userEntry, oauth);
        });
}


admin_pages.path.confirmEmail  = '/admin/confirm-email/:userId?';
admin_pages.route.confirmEmail = 
    function(quest, ponse)
    {
        _userCommand(quest, 
            function(err, userEntry, oauth)
            {
                if (err)
                    return ponse.send(err.message);
                    
                userly.confirmEmailForUserEntry(userEntry, 
                    function(err, userEntry)
                    {
                        if (err)
                            return ponse.send(err.message);
                        
                        ponse.send(userEntry);
                    });
            });
    };
    

//!!!: List

admin_pages.path.listSetup   = '/admin/list/setup/:userId?';
admin_pages.route.listSetup  = 
    function(quest, ponse)
    {
    	var userId = userPages.userIdFromRequest(quest);
        
        list.setupForUserId(userId, 
            function(err, list)
            {
                if (err)
                    return ponse.send(err.message);
                
                ponse.send(list);
            });
    };

admin_pages.path.listDestroy   = '/admin/list/destroy/:userId?';
admin_pages.route.listDestroy  = 
    function(quest, ponse)
    {
    	var userId = userPages.userIdFromRequest(quest);
        
        list.destroyForUserId(userId, 
            function(err, list)
            {
                if (err)
                    return ponse.send(err.message);
                
                ponse.send(list);
            });
    };


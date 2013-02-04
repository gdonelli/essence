
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
        
        var row = '';
        
        row += '<tr>';
        
        row += '<td>Name</td>';
        row += '<td>Email</td>';
        row += '<td>VIP</td>';
        row += '<td>last_activity</td>';
        row += '<td></td>';
        row += '<td></td>';
        row += '<td></td>';
        row += '<td></td>';
        
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
                
                row += '<td><strong>' + presentation.stringToHTML(user.twitter.user.name) + '</strong></td>';
                row += '<td>' + presentation.stringToHTML(user.email) + '</td>';
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
                row += '<td><a target="_blank" href="/admin/cleanDeliveryDate/' + user._id + '">clean deliveryDate</a></td>';

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

admin_pages.path.tracking  = '/admin/tracking/:userId?';
admin_pages.route.tracking = 
    function(quest, ponse)
    {
        ponse.writeHead(200, {'Content-Type': 'text/html'});
        ponse.write('<!DOCTYPE html><html>');

        ponse.write('<table cellpadding="10px">');
        
        database.getCursorOnTracking(
            function(err, cursor)
            {
                cursor.each(
                    function(err, dataPoint) {
                        if (err)
                            ponse.write('<td>Error: ' + err.message + '</td>');
                    
                        if (err || dataPoint == null)
                            return ponse.end('</table></html>');
                            
                        var row = '';
                        
                        row += '<tr>';
                        
                        row += '<td>' + _stringRelativeFromDBDateString(dataPoint.date) + '</td>';
                        
                        row += '<td><strong>' + presentation.stringToHTML(dataPoint.userTwitter) + '</strong></td>';
                        row += '<td>' + dataPoint.action + '</td>';
                        
                        
                        row += '<td>';
                        
                        if (dataPoint.action == 'msg-goto')
                        {
                            row += dataPoint.messageIndex + ' <a href="' + presentation.tweetURL(dataPoint.userTwitter, dataPoint.data.tweetId) + '" target="_blank">tweet</a>';
                        }
                        else
                        {
                            row += dataPoint.messageIndex;
                        }
                        
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
                                 row += referer;
                                 
                            row += '</td>';
                        }
                        
                        row += '</tr>';
                        
                            
                        ponse.write(row);
                    });

            
            });

    };

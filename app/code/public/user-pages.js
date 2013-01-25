
/*
 * GET home page.
 */

var     path    = require('path')
    ,   fs      = require('fs')
    ,   authentication  = use('authentication')
    ,	database		= use('database')
    ,   service         = use('service')
    ;

var user_pages = exports;


user_pages.path = {};
user_pages.route = {};


user_pages.path.settings    = '/settings';
user_pages.route.settings   = 
    function(quest, ponse)
    {
        var user = authentication.userFromRequest(quest);

        var title = 'Essence (@' + user.screen_name + ')';
        
        ponse.render('settings', {
                title: title,
                user: user
            } );        
    }


user_pages.path.deleteDelete    = '/delete-delete/:userId?';
user_pages.route.deleteDelete   = 
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


user_pages.path.delete  = '/delete/:userId?';
user_pages.route.delete = 
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


user_pages.path.confirmEmail    = '/confirm/:userId?/:ticket?';
user_pages.route.confirmEmail   = 
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
    if (quest.params.userId)
        return quest.params.userId;
    else
        return authentication.userFromRequest(quest)._id;
}


user_pages.path.previewTxt  = '/preview_txt/:userId?';
user_pages.route.previewTxt = 
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
                
                presentation.makePlainText(userEntry, vipList, { subtitle: 'Preview' },
                    function(err, html)
                    {
                        //ponse.writeHead(200, {'Content-Type': 'text/html'});
                        //ponse.end(html);
                        ponse.send(html);
                    });
            });    
    };


user_pages.path.preview     = '/preview/:userId?';
user_pages.route.preview    = 
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
                                
                presentation.makeHTML(userEntry, vipList, { subtitle: 'Preview' },
                    function(err, html)
                    {
                        ponse.writeHead(200, {'Content-Type': 'text/html'});
                        ponse.end(html);
                    });
            });
    };


user_pages.path.actual  = '/actual/:userId?';
user_pages.route.actual = 
    function(quest, ponse)
    {
        var engine = use('engine');
        var userId = _userIdFromRequest(quest);
        
        database.getUserEntryById(userId,
            function(err, userEntry)
            {
                if (err)
                    return ponse.send(err.message);
            
                engine.getEssenceMessageForUser(userEntry, 
                    function(err, html)
                    {
                        if (err)
                            return ponse.send(err.message);
                        
                        ponse.writeHead(200, {'Content-Type': 'text/html'});
                        ponse.end(html);
                    });
            });
    };

    
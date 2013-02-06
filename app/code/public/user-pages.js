
/*
 * GET home page.
 */

var     path    = require('path')
    ,   fs      = require('fs')
    ,   async   = require('async')
    
    
    ,   authentication  = use('authentication')
    ,	database	= use('database')
    ,   service     = use('service')
    ,   tracking    = use('tracking')
    ,	list		= use('list')
    ;

var userPages = exports;


userPages.path = {};
userPages.route = {};


userPages.path.invite    = '/invite';
userPages.route.invite   = 
    function(quest, ponse)
    {
        var user = authentication.userFromRequest(quest);

        var title = 'Essence (@' + user.screen_name + ')';
        
        ponse.render('invite', {
                title: title,
                user: user
            } );        
        
    }
    
userPages.path.settings    = '/settings';
userPages.route.settings   = 
    function(quest, ponse)
    {
        var user = authentication.userFromRequest(quest);

        var title = 'Essence (@' + user.screen_name + ')';
        
        ponse.render('settings', {
                title: title,
                user: user
            } );        
    }


userPages.path.deleteDelete    = '/delete-delete/:userId?';
userPages.route.deleteDelete   = 
    function(quest, ponse)
    {
        var userId = userPages.userIdFromRequest(quest);
        
        async.waterfall(
            [
                function(callback) // Get UserEntry
                {
                    database.getUserEntryById(userId, callback);
                }
            ,	function(userEntry, callback) // Destroy Twitter list
                {
                    list.destroyForUserEntry(userEntry, 
                        function(err)
                        {
                            if (err)
                                console.error('list.destroyForUserEntry failed for ' + userId);
                                
                            callback(null, userEntry);
                        })
                }
            ,   function(userEntry, callback) // Track delete action
                {
                    tracking.trackUserEntry(userEntry, 'delete', null, tracking.dataFromHeader(quest), 
                        function(err)
                        {
                            if (err)
                                console.error('tracking.trackUserEntry failed for ' + userId);

                            callback(null, userEntry);
                        })
                }
            ,   function(userEntry, callback) // Remove User from DB
                {
                    database.removeUserWithId(userId, callback)
                }
            ],
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
            })
    };


userPages.path.delete  = '/delete/:userId?';
userPages.route.delete = 
    function(quest, ponse)
    {
        var userId = userPages.userIdFromRequest(quest);
        
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


userPages.path.confirmEmail    = '/confirm/:userId?/:ticket?';
userPages.route.confirmEmail   = 
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
                    
                ponse.redirect(userPages.path.settings);
            });
    };

userPages.userIdFromRequest = 
    function(quest)
    {
        if (quest.params.userId)
            return quest.params.userId;
        else
            return authentication.userFromRequest(quest)._id;
    };


userPages.path.previewTxt  = '/preview_txt/:userId?';
userPages.route.previewTxt = 
    function(quest, ponse)
    {
        var userId = userPages.userIdFromRequest(quest);

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


userPages.path.preview     = '/preview/:userId?';
userPages.route.preview    = 
    function(quest, ponse)
    {
        var user = authentication.userFromRequest(quest);

        var title = 'Essence Preview (@' + user.screen_name + ')';
        
        ponse.render('preview', {
                title: title,
                user: user
            } );
    };


userPages.path.actual  = '/actual/:userId?';
userPages.route.actual = 
    function(quest, ponse)
    {
        var engine = use('engine');
        var userId = userPages.userIdFromRequest(quest);
        
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

    
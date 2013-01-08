
/*
 * GET home page.
 */

var authentication = use('authentication');

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


var database = use('database');
var io = use('io');
var service = use('service');

index.path.confirmEmail = '/confirm/:userId';

index.route.confirmEmail = function(quest, ponse)
    {
        var userId = a.assert_string(quest.params.userId);
        
        database.getUserEntryById(userId,
            function(err, userEntry)
            {
                if (err)
                    return ponse.send('Invalid User');
                    
                if (userEntry.email)
                    return ponse.send( userEntry.email + ' is already confirmed' );
                    
                database.confirmUserEmail(userEntry, 
                    function(err, userEntry)
                    {
                        if (err)
                            return ponse.send('Failed to confirm user');
                        else
                        {
                            io.emitUserEvent(
                            		userEntry._id,
                                    service.userDidChangeEvent,
                					userEntry );

                            return ponse.send('Great just confirmed: ' + userEntry.email);
                        }
                            
                    });
            });
    }

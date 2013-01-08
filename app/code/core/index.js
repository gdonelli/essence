
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



var service = use('service');

index.path.confirmEmail = '/confirm/:userId?/:ticket?';

index.route.confirmEmail = function(quest, ponse)
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
    }

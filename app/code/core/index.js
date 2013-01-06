
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

/*
 * GET home page.
 */

var index = exports;

index.path = {};
index.route = {};

index.path.index = '/';

index.route.index = function(quest, ponse)
    {
        var user;
        
        if (quest.session)
            user = quest.session.user;
        
        if (user)
        {
            var title = 'Essence (@' + user.screen_name + ')';
            
            ponse.render('index_user', {
                    title: title,
                    user: user
                } );
        }
        else
        {
            ponse.render('index', { title: 'Essence' });
        }
    };
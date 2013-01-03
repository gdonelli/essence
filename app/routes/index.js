
/*
 * GET home page.
 */

exports.index = function(quest, ponse)
    {
        var user;
        
        if (quest.session)
            user = quest.session.user;
        
        if (user)
        {
            var title = '@ ' + user.screen_name + ' welcome to Essence';
            
            ponse.render('index_user', {
                    title: title,
                    username: user.name
                } );
        }
        else
        {
            ponse.render('index', { title: 'Essence' });
        }
    };
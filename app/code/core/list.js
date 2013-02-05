
/*
 * GET home page.
 */

var     async   = require('async')
    ,   _       = require('underscore')
    
    ,   authentication  = use('authentication')
    ,   database        = use('database')
    ,   twitter = use('twitter')
    ,   a       = use('a')
    ;


var list = exports;

list.path = {};
list.route = {};

var _appListName        = 'EssenceApp.com';
var _appListDesciption  = 'List managed by EssenceApp.com';


list.getList =
    function(oauth, createIfNeeded, callback /* (err, list) */)
    {
        twitter.lists.list(oauth,
            function(err, lists)
            {
                if (err)
                    return callback(err);
            
                var foundEssenceList = _.find(lists, 
                    function(list){
                        return list.name == _appListName;
                    });
                    
                if (foundEssenceList)
                    callback(null, foundEssenceList);
                else if (createIfNeeded)
                    twitter.lists.create(oauth, _appListName, _appListDesciption, callback);
                else
                    callback(null, null);
            });
    };


list.setupForUserId =
    function(idstr, callback)
    {
        database.getUserEntryById(idstr, 
            function(err, userEntry) {
                if (err)
                    return callback(err);
                    
                list.setupForUserEntry(userEntry, callback);
            });
    };


list.setupForUserEntry = 
    function(userEntry, callback /* (err, list) */)
    {
        var oauth = authentication.oauthFromUserEntry(userEntry);
        
        _setup(oauth, userEntry.vipList, callback);
    };


function _setup(oauth, vipList, callback /* (err, list) */)
{
    a.assert_obj(oauth);
    a.assert_array(vipList);
    a.assert_f(callback);

    list.getList(oauth, true, 
        function(err, list)
        {
            if (err)
                return callback(err);
            
            var listId = list.id;
            
            console.log('list.getList- list:');
            console.log(list);

            twitter.lists.members(oauth, listId, 
                function(err, members) {
                    if (err)
                        return callback(err);
                    
                    var vipDict     = _userDictionaryFromList(vipList);
                    var membersDict = _userDictionaryFromList(members.users);
                    
                    var membersToAdd    = [];
                    var membersToRemove = [];
                     
                    _.each(vipList,
                        function(vipEntry){
                            if (!membersDict[vipEntry.id])
                                membersToAdd.push(vipEntry);
                        });
                        
                    _.each(members.users,
                        function(member){
                            if (!vipDict[member.id])
                                membersToRemove.push(member);
                        });
                    
                    var idsToAdd = _.map(membersToAdd,
                        function(member) {
                            return member.id;
                        });
                        
                    var idsToRemove = _.map(membersToRemove,
                        function(member) {
                            return member.id;
                        });
                    
                    async.parallel(
                        [
                            function(_callback) {
                                if (idsToAdd.length > 0)
                                {
                                    twitter.lists.members.create_all(oauth, listId, idsToAdd,
                                        function(err) {
                                            if (err) {
                                                console.error('twitter.lists.members.create_all error:');
                                                console.error(err);
                                                return callback(err);
                                            }
                                            _callback(null, 'Added: ' + idsToAdd);
                                        });
                                }
                                else
                                    _callback(null, 'No user added');
                            }
                        ,	function(_callback) {
                                if (idsToRemove.length > 0)
                                {
                                    twitter.lists.members.destroy_all(oauth, listId, idsToRemove,
                                        function(err) {
                                            if (err) {
                                                console.error('twitter.lists.members.destroy_all error:');
                                                console.error(err);
                                                return callback(err);
                                            }
                                            _callback(null, 'Removed: ' + idsToRemove);
                                        });
                                }
                                else
                                    _callback(null, 'No user removed');
                            }
                        ], 
                        function(err, results) {
                            console.log('Setup results:');
                            console.log(results);
                            callback(err, list);
                        });
                });
        });
};


list.destroyForUserId =
    function(idstr, callback)
    {
        database.getUserEntryById(idstr, 
            function(err, userEntry) {
                if (err)
                    return callback(err);
                    
                list.destroyForUserEntry(userEntry, callback);
            });
    };


list.destroyForUserEntry = 
    function(userEntry, callback /* (err, list) */)
    {
        var oauth = authentication.oauthFromUserEntry(userEntry);
        
        _destroy(oauth, callback);
    };


function _destroy(oauth, callback /* (err) */)
{
    list.getList(oauth, false,
        function(err, list)
        {
            if (err)
                return callback(err);
            
            if (!list) {
                var err = new Error('Nothing to destroy');
                err.code = 200;
                return callback( err );
            }
            
            var listId   = list.id;
            var listSlug = list.slug;
            
            twitter.lists.destroy(oauth, listId, listSlug, callback);
        });

}


//!!!: Private


function _userDictionaryFromList(list)
{
    var result = {};
 
    _.each(list,
        function(entry) {
            if (!entry || !entry.id) {
                console.error('Cannot access entry.id, entry: ');
                console.error(entry);
                console.error('list:');
                console.error(list);
                return;
            }
            
            result[entry.id] = entry;
        })
    
    return result;
}

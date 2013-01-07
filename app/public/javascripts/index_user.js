

var serviceAPI = new ServiceAPI();



// Internal

function test()
{
    $('#user-menu').dropdown();
}

function test_2()
{
    console.log('test');
    
    var getFriends = serviceAPI.getFriends(
        function(err, ponse)
        {
            console.log('-getFriends ponse:');
            console.log(ponse);
        });
    
    getFriends.on('progress',
        function(value) {
            console.log('getFriends -progress: ' + value);
        });
}

function _friendTableRows()
{
    return $('#friends-table div[class="_rows"]');
}

function _loadingFriendsProgressBar()
{
    return $('#friends-progress div[class="bar"]');
}

function _friendSearchField()
{
    return $('#friend-search');
}

function _HTMLRowForFriend(friendEntry)
{
    var row = '<div class="_row">';
    
    row += '<button type="button" class="btn btn-small" ';
    row += 'onclick="AddFriend(\''  + friendEntry.id + '\', \'' + friendEntry.screen_name +'\', this)"';
    row += '>';
    
    row += 'Add';
    row += '&nbsp;<i class="icon-arrow-right"></i>';
    row += '</button>';
    
    row += '<img src="' + friendEntry.profile_image_url + '"></img>';
    row += '<h5 class="user-name">' + friendEntry.name + '</h5>';
    row += '<p class="user-screenname">@' + friendEntry.screen_name + '</p>';
    row += '</div>';
    
    return row;
}

function _showFriends(array)
{
    var friendTableRows = _friendTableRows()
    friendTableRows.html('');

    array.forEach(
        function(friendEntry) {
            if (friendEntry.screen_name)
            {
                var row = _HTMLRowForFriend(friendEntry);
                friendTableRows.append( row );
            }
            else
            {
                console.error('friendEntry is not valid:');
                console.error(friendEntry);
            }
        });
    
    // Register callback
    var searchField =  _friendSearchField();
    
    searchField.bind("input propertychange", _seachFriendCallback);
	searchField.keyup(_seachFriendCallback);
}

var _seachFriendEventTimer;

function _seachFriendCallback()
{
    if (_seachFriendEventTimer) {
        clearTimeout(_seachFriendEventTimer);
        _seachFriendEventTimer = null;
    }
    
    _seachFriendEventTimer = setTimeout(
        function() {
            _searchFriend(_friendSearchField().val());
        }, 100);
}

var _friends;

function _searchFriend(value)
{
    var entriesToShow;
    
    if (value.length <= 0){
        entriesToShow = _friends;
    }
    else
    {
        var normalizedValue = value.toLowerCase();
        
        entriesToShow = _.map(_friends,
            function(friendEntry) {
                friendEntry._sort = _matchEntry(friendEntry, normalizedValue);
            });
        
        entriesToShow = _.filter(_friends,
            function(friendEntry) {
                return  friendEntry._sort >= 0;
            });
        
        entriesToShow = entriesToShow.sort(
            function(a, b) {
                return (a._sort - b._sort);
            });
    }

    var entriesToShow = entriesToShow.slice(0, 1000);
    _showFriends(entriesToShow);
    console.log('Showing #' + entriesToShow.length + ' friends');
}

function _matchEntry(friendEntry, seachString)
{
    var name        = friendEntry.name.toLowerCase();
    var screen_name = friendEntry.screen_name.toLowerCase();
    
    var nameMatch = name.indexOf(seachString);
    
    if ( nameMatch >= 0 )
        return nameMatch;
    
    var screenNameMatch = screen_name.indexOf(seachString)
    
    if ( screenNameMatch >= 0 )
        return screenNameMatch;
    
    return -1;
}



function AddFriend(id, screenName, element)
{
    console.log('Add friend with id: ' + id);
    
    serviceAPI.addFriend(id, screenName,
        function(err, ponse) {
            if (err) {
                console.log('addFriend error:');
            	console.log(err);
                $(element).addClass('btn-danger');
                $(element).removeClass('disabled');
                $(element).removeAttr('disabled');
                return;
            }
            
            $(element).addClass('btn-success');
            $(element).html('&nbsp;&nbsp;&nbsp;&nbsp;<i class="icon-ok"></i>&nbsp;&nbsp;&nbsp;&nbsp;');
        });
    
    $(element).addClass('disabled');
    $(element).html('&nbsp;&nbsp;&nbsp;&nbsp;<i class="icon-refresh"></i>&nbsp;&nbsp;&nbsp;&nbsp;');
    $(element).attr('disabled', 'disabled');
    
    console.log(element);
}

function LoadFriends()
{
    $('#error-header').css(   'display', 'none');
    $('#search-header').css(  'display', 'none');
    $('#loading-header').css( 'display', 'block');

    console.log('serviceAPI:');
    console.log( serviceAPI );

    var getFriends = serviceAPI.getFriends(
        function(err, friends)
        {
            console.log('-getFriends:');
            
            if (err)
            {
                console.error('Failed to load friends');
                console.error(err);
                
                $('#error-header-code').text(' (#' + err.code + ')' );
                
                $('#friends-table').css( 'background-color', 'red');

                $('#error-header').css(   'display', 'block');
                $('#search-header').css(  'display', 'none');
                $('#loading-header').css( 'display', 'none');
            }
            else
            {
                _friends = friends;
                _searchFriend('');

                $('#error-header').css(   'display', 'none');
                $('#search-header').css(  'display', 'block');
                $('#loading-header').css( 'display', 'none');
            }
        });
    
    getFriends.on('progress',
        function(value) {
            var percentage = Math.round(value*100) + '%';
            
            var bar = _loadingFriendsProgressBar();
            
            bar.css('width', percentage );
            
            // console.log('bar: ');
            // console.log(bar);
            
        });
}

function LoadVipList()
{
    serviceAPI.on(ServiceAPI.vipListDidChangeEvent,
        function(userEntry)
        {
            console.log('ServiceAPI.vipListDidChangeEvent:');
            console.log(userEntry);
        });
}



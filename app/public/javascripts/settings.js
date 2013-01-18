
function ________private________(){}

var serviceAPI = new ServiceAPI();

serviceAPI.on('disconnect',
    function()
    {
        $('#disconnectModal').modal('show');
    });

serviceAPI.on('connect',
    function()
    {
        $('#disconnectModal').modal('hide');
    });


// Internal

function test()
{
    console.log('test');
}


function _friendTableRows()
{
    return $('#friends-table div[class="peopleTableRows"]');
}

function _vipTableRows()
{
    return $('#vip-table div[class="peopleTableRows"]');
}

function _loadingFriendsProgressBar()
{
    return $('#friends-progress div[class="bar"]');
}

function _emailField()
{
    return $('#email');
}

function _friendSearchField()
{
    return $('#friend-search');
}

function _HTMLRowForPerson(friendEntry, buttonCode)
{
    var row = '<div class="_row">';
    
    row += buttonCode;
    
    row += '<img src="' + friendEntry.profile_image_url + '"></img>';
    row += '<h5 class="user-name">' + friendEntry.name + '</h5>';
    row += '<p class="user-screenname">@' + friendEntry.screen_name + '</p>';
    row += '</div>';
    
    return row;

}

function _HTMLRowForTwitterFriend(friendEntry)
{
    var buttonCode = '';
    
    buttonCode += '<button type="button" class="btn btn-small" ';
    buttonCode += 'onclick="AddVip(\''  + friendEntry.id + '\', this)"';
    buttonCode += '>';
    buttonCode += 'Add';
    buttonCode += '&nbsp;<i class="icon-arrow-right"></i>';
    buttonCode += '</button>';
    
    return _HTMLRowForPerson(friendEntry, buttonCode);
}

function _HTMLRowForVipFriend(friendEntry)
{
    var buttonCode = '';
    
    buttonCode += '<button type="button" class="btn btn-small btn-danger" ';
    buttonCode += 'onclick="RemoveVip(\''  + friendEntry.id + '\', this)"';
    buttonCode += '>';
    buttonCode += '<i class="icon-remove icon-white"></i>';
    buttonCode += '</button>';
    
    return _HTMLRowForPerson(friendEntry, buttonCode);
}

function _showVipList(array)
{
    var vipTableRows =  _vipTableRows();

    if (!array || array.length == 0)
    {
        vipTableRows.html('<div id="vip-placeholder" class="muted">To add friends to your VIP list use the table on the left</div>');
        return;
    }

    vipTableRows.html('');
    
    array.forEach(
        function(vipEntry) {
            if (vipEntry.screen_name) {
                var row = _HTMLRowForVipFriend(vipEntry);
                vipTableRows.append(row);
            }
            else {
                console.error('vipEntry is not valid:');
                console.error(vipEntry);
            }
        });
}

function _showFriends(array)
{
    var friendTableRows = _friendTableRows()
    friendTableRows.html('');

    array.forEach(
        function(friendEntry) {
            if (friendEntry.screen_name) {
                var row = _HTMLRowForTwitterFriend(friendEntry);
                friendTableRows.append( row );
            }
            else {
                console.error('friendEntry is not valid:');
                console.error(friendEntry);
            }
        });
}

var _seachFriendEventTimer;

function _searchFriendCallback()
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

function _saveEmailButton()
{
    return $('#save-email');
}

var _emailEventTimer;

function _emailCallback()
{
    if (_emailEventTimer) {
        clearTimeout(_emailEventTimer);
        _emailEventTimer = null;
    }
    
    _emailEventTimer = setTimeout(
        function() {
            var emailValue = _emailField().val();
            
            console.log( 'emailValue: ' + emailValue);
            
            _saveEmailButton().html('Save');
            _saveEmailButton().removeClass('btn-warning');
            _saveEmailButton().removeClass('btn-success');
            
            if ( _isEmailValid(emailValue) ) {
                _saveEmailButton().removeClass('disabled');
                _saveEmailButton().addClass('btn-primary');
            }
            else {
                _saveEmailButton().addClass('disabled');
                _saveEmailButton().removeClass('btn-primary');
            }
            
            
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

function _emptySearchField()
{
    _searchFriend('');
}

function _listenForEvents()
{
    serviceAPI.on(ServiceAPI.vipListDidChangeEvent,
        function(userEntry) {
            console.log('ServiceAPI.vipListDidChangeEvent:');
            console.log(userEntry.vipList);
            _showVipList(userEntry.vipList);
        });

    serviceAPI.on(ServiceAPI.emailDidChangeEvent,
        function(userEntry) {
            console.log('ServiceAPI.emailDidChangeEvent:');
            console.log(userEntry.email);
            _updateEmail(userEntry);
        });
    
    // Register UI callback
    var searchField =  _friendSearchField();
    searchField.bind("input propertychange", _searchFriendCallback);
	searchField.keyup(_searchFriendCallback);
    
    var emailField = _emailField();
    emailField.bind("input propertychange", _emailCallback);
	emailField.keyup(_emailCallback);

}

function _confirm_alert()
{
    return $('#confirm-alert');
}


function _updateEmail(userEntry)
{
    var emailField = _emailField();
    var confirmAlert = _confirm_alert();
    var saveButton = _saveEmailButton();
    
    if (userEntry.email) {
        emailField.val(userEntry.email);
        
        saveButton.removeClass('btn-warning');
        saveButton.removeClass('btn-primary');
        saveButton.addClass('btn-success');
        saveButton.html('<i class="icon-ok icon-white"></i>');
        saveButton.addClass('disabled');
        
        confirmAlert.hide();
    }
    else if (userEntry.email_to_confirm) {
        emailField.val(userEntry.email_to_confirm);
        
        saveButton.removeClass('btn-success');
        saveButton.removeClass('btn-primary');
        saveButton.addClass('btn-warning');
        saveButton.html('<i class="icon-ok icon-white"></i>');
        saveButton.addClass('disabled');
        
        confirmAlert.show();
    }
    else
    {
        saveButton.removeClass('btn-success');
        saveButton.removeClass('btn-warning');
        saveButton.addClass('btn-primary');
        saveButton.html('Save');
        saveButton.removeClass('disabled');
        
        confirmAlert.hide();
    }    
}

function ________________(){}

function AddVip(id, element)
{
    console.log('Add friend with id: ' + id);
    
    var friendEntry = _.find(_friends, function(entry) { return entry.id == id; } );
    
    serviceAPI.addVip(friendEntry,
        function(err, ponse) {
            if (err) {
                console.log('addVip error:');
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



function RemoveVip(id, element)
{
    serviceAPI.removeVip( { id: id },
        function(err, ponse) {
            if (err) {
                console.error('serviceAPI.removeVip failed:');
                console.error(err);
                return;
            }
            
            _emptySearchField();
            $('#friend-search').val('');
        });
}

function LoadTwitterFriends()
{
    $('#error-header').css(   'display', 'none');
    $('#search-header').css(  'display', 'none');
    $('#loading-header').css( 'display', 'block');

    console.log('serviceAPI:');
    console.log( serviceAPI );

    var getFriends = serviceAPI.getTwitterFriends(
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
                _emptySearchField();

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
        });
}

function SaveEmail()
{
    var saveButton = _saveEmailButton();
    
    saveButton.html('<i class="icon-refresh"></i>');
    saveButton.addClass('disabled');
    saveButton.removeClass('btn-primary');
    
    var confirmAlert = _confirm_alert();
    confirmAlert.hide();
    
    serviceAPI.confirmEmail( _emailField().val(), 
        function(err, success)
        {
            if (err) {
                saveButton.html('<i class="icon-remove icon-white"></i>');
            	saveButton.addClass('btn-danger');
                saveButton.removeClass('disabled');
                console.error('serviceAPI.confirmEmail failed:');
                console.error(err);
                return;
            }

            saveButton.html('<i class="icon-ok icon-white"></i>');
            saveButton.addClass('btn-warning');
            confirmAlert.show();
            
            console.log('serviceAPI.confirmEmail OK!');
        });
}

function SetupUI()
{
    // Load User Entry
    serviceAPI.getUserEntry(
        function(err, userEntry) {
            if (err) {
                console.error('serviceAPI.getUserEntr failed:');
                console.error(err);
                return;
            }
            
            _updateEmail(userEntry);
            _showVipList(userEntry.vipList);
        });
    
    LoadTwitterFriends();
    
    _listenForEvents();
}


function _isEmailValid(email)
{ 
	var regex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    
    return email.match(regex);
} 

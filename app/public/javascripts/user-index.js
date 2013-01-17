
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

function _showSpinner()
{
    var opts = {
      lines: 13, // The number of lines to draw
      length: 7, // The length of each line
      width: 4, // The line thickness
      radius: 10, // The radius of the inner circle
      corners: 1, // Corner roundness (0..1)
      rotate: 0, // The rotation offset
      color: '#000', // #rgb or #rrggbb
      speed: 1, // Rounds per second
      trail: 60, // Afterglow percentage
      shadow: false, // Whether to render a shadow
      hwaccel: true, // Whether to use hardware acceleration
      className: 'spinner', // The CSS class to assign to the spinner
      zIndex: 0, // The z-index (defaults to 2000000000)
      top: 'auto', // Top position relative to parent in px
      left: 'auto' // Left position relative to parent in px
    };
    
    var spinner = new Spinner( opts ).spin();
    $('#home-spinner').append(spinner.el);
}

function _updateState(state)
{
    console.log( state );

    var title;
    var subtitle;
    
    // Reset
    
    $('#disable').css('display', 'none');
    $('#enable').css('display', 'none');
    $('#disable').text('Disable');
    
    $('#settings').removeClass('btn-primary');

    if (state == 'NO-EMAIL' || 
        state == 'NO-VIP'   )
    {
        title    = 'Essence needs your settings...';
        subtitle = 'Go to settings to configure Essence';
        
        $('#settings').addClass('btn-primary');
    }
    else if (state == 'GOOD')
    {
        title    = 'Essence is up and running';
        subtitle = 'Your Essence will be delivered daily in the evening, here&rsquo;s a <a href="/preview" target="_blank">preview</a>';

    	$('#disable').css('display', 'inline');
    }
    else if (state == 'DISABLED')
    {
        title    = 'Essence is disabled';
        subtitle = 'You can enable Essence at anytime, or you may <a href="/delete">delete</a> your account entirely';
        
        $('#enable').css('display', 'inline');
    }

    $('#home-title').text(title);
    $('#home-subtitle').html(subtitle);
    $('#home-spinner').remove();
    $('#home-dashboard').css('visibility', 'visible');
}

function SetupUI()
{
    _showSpinner();

    serviceAPI.on(ServiceAPI.stateDidChangeEvent, _updateState);
    
    serviceAPI.serviceState(
        function(err, state) {
            _updateState(state);
        });
}

function _serviceSwitch(button_jq, enabled)
{
    button_jq.addClass('disabled');
    
    serviceAPI.setServiceEnabled(enabled,
        function(err, ponse)
        {
            button_jq.removeClass('disabled');

            if (err) {
            	console.log('serviceAPI.setServiceEnabled - Error:');
                console.log(err.message);
                
                button_jq.addClass('btn-danger');
                
                return;
            }
            
            button_jq.removeClass('btn-danger');
            button_jq.css('display', 'none');
        });
}

function enable()
{
    _serviceSwitch( $('#enable'), true );
}

function disable()
{
    _serviceSwitch( $('#disable'), false );
}



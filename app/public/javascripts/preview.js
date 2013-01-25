
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


function SetupUI()
{
    _loadPreview();
    
    serviceAPI.on(ServiceAPI.vipListDidChangeEvent, _loadPreview );
}

//!!!: Private

function _previewBox()
{
    return $('#preview-box');
}

function _spinnerBox()
{
    return $('#home-spinner');
}

function _loadPreview()
{
    var loadingHTML = '<h1>Loading preview...</h1><div id="home-spinner"></div>';
    
    _previewBox().html(loadingHTML);

    _showSpinner();
    
    serviceAPI.preview(
        function(err, html) {
            if (err) {
                console.error(err);
                _previewBox().text('Failed to load preview, if the error persist, please contact us' );
                return;
            }
            
            _previewBox().html(html);
        });
}

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
    _spinnerBox().append(spinner.el);
}

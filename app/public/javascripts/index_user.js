

var serviceAPI = new ServiceAPI();

function test()
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
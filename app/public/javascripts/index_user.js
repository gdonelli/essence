

var serviceAPI = new ServiceAPI();

function test()
{
    console.log('test');
    
    serviceAPI.getFriends(
        function(err, ponse)
        {
            console.log('-getFriends ponse:');
            console.log(ponse);
        });
}
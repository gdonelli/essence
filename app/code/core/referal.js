
var referal = exports;

referal.tokenForUserEntry = 
    function(userEntry)
    {
        var md5 = crypto.createHash('md5');

        md5.update( userEntry._id.toString() );    
        md5.update( userEntry.twitter.user.screen_name );

        return md5.digest("hex");
    };


referal.URLForUserEntry = 
    function(userEntry)
    {
        
    };

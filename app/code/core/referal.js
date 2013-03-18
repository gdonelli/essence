
var crypto  = require('crypto');

var referal = exports;


function _ASCIItoHEX(asciiString)
{
    return new Buffer(asciiString).toString('hex');
}

function _HEXtoASCII(string64)
{
    return new Buffer(string64, 'hex').toString('ascii');
}


referal.userIdForToken =
    function(token)
    {
        return parseInt(token, 16);
    };

referal.tokenForUserId = 
    function(id_str)
    {
        return parseInt(id_str).toString(16);
    };


referal.URLForUserName = 
    function(quest, id_str)
    {
        var questHeaders = quest.headers;
        var questHost    = questHeaders.host;

        return 'http://' + questHost + '/invite/' + referal.tokenForUserId(id_str);
    };

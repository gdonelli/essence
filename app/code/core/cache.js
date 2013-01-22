
var cache = exports;

var _cacheData = {};


function _setValueForKey(key, value, ttl)
{  
    var cacheEntry = {
            created: new Date()
        ,   value:   value
        };
    
    if (ttl)
        cacheEntry.ttl = ttl;
        
    _cacheData[key] = cacheEntry;
}

var DEFAULT_TTL = 5 * 60 * 1000; // 1 minute

function _getValueForKey(key) // isValueFresh
{
    var entry = _cacheData[key];
     
    if (entry) {
        var now      = new Date();
        var timediff = now - entry.created;
        
        var ttl = (entry.ttl ? entry.ttl : DEFAULT_TTL);
        
        if (timediff > ttl) {
            // console.log('delete cache entry');
            delete _cacheData[key];
            return null;
        }
        else
            return entry.value;
    }
    
    return null;    
}

function _allKeys()
{
    return Object.keys(_cacheData);
}
    
function _collectGarbage()
{
    console.log(arguments.callee.name);
    
    var startKeys = _allKeys();
    
    startKeys.forEach(
        function(key){
            _getValueForKey(key);
        });

    var endKeys = _allKeys();

    console.log('cache collected ' + (startKeys.length - endKeys.length) + ' entries');
    
    if (endKeys.length > 0) // there are still some keys
        _startGarbageCollection()

    if (endKeys.length == 0)
        console.log('cache is empty');
}

var gcTimer = null;

var GARBAGE_COLLECTION_TIME = DEFAULT_TTL + 1000;

function _startGarbageCollection()
{
    if (!gcTimer)
    {
        gcTimer = setTimeout(
            function() {
                gcTimer = null;
                _collectGarbage();
            },
            GARBAGE_COLLECTION_TIME);    
    }
}

cache.valueForKey =
    function(key, value, ttl)
    {
        if (value)
        {
            _setValueForKey(key, value, ttl);
            _startGarbageCollection();
        }
        else if (key)
            return _getValueForKey(key); 
    }


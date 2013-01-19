
//
// serviceAPI.js
//

function ServiceAPI(didConnectCallback /* (err) */)
{
    this.socket = io.connect();

    this.initSuccess = false;

    var timeout = setTimeout(
        function() {
            var errStr = 'Connection to server timed out. Try to reload the page';
            alert(errStr);
            console.error(errStr);
        }, 10000);
    
    this.socket.emit('__init__', {},
        function(data) {
            this.initSuccess = true;
            clearTimeout(timeout);
        });
    
    this.socket.on('disconnect',
        function() {
            console.error('!!! Server disconnect !!!');
        });
    
    this.identifier = 0;
}


ServiceAPI.prototype._createProgressEvent =
    function()
    {
        return 'progress-' + Math.round(Math.random() * 10000) + '-' + this.identifier++;
    }

ServiceAPI.prototype._peformService =
    function(name, data, callback, progress)
    {
        // console.log('ServiceAPI.prototype._peformService');

        var progressEmitter = new io.EventEmitter();
          
        var progressEvent   = this._createProgressEvent();
        data.progressEvent  = progressEvent;
        
        var didTimeout = false;
        var timeout = setTimeout(
            function()
            {
                didTimeout = true;
                callback( new Error('Timeout') );
            }, 15000);

        // Actual RPC
        
        // console.log('socket.emit: ' + name);
        
        this.socket.emit(name, data,
            function(ponse)
            {
                // console.log('socket.emit back: ' + name);
                 
                this.socket.removeAllListeners(progressEvent);
                
                if (ponse && ponse.hasOwnProperty('error')) {
                    var ponseError = ponse.error;
                                       
                    var err;
                    if (ponseError)
                        err = new Error(ponseError);
                    else
                        err = new Error();
                        
                    if ( ponseError && ponseError.code )
                        err.code = ponseError.code;
                    
                    callback(err);
                }
                else
                    if (!didTimeout)
                        callback(null, ponse);
                        
                clearTimeout(timeout);
            });

        this.socket.on(progressEvent,
            function(progressData) {
                progressEmitter.emit('progress', progressData);
            });
        
        
        return progressEmitter;
    };

ServiceAPI.prototype.getTwitterFriends =
    function(callback /* (err, ponse) */)
    {
        return this._peformService( 'service.getTwitterFriends', { }, callback );
    };

ServiceAPI.prototype.getUserEntry =
    function(callback /* (err, ponse) */)
    {
        return this._peformService( 'service.getUserEntry', { }, callback );
    };


ServiceAPI.prototype.addVip =
    function(friendEntry, callback /* (err, ponse) */)
    {
        return this._peformService( 'service.addVip', friendEntry, callback);
    };

ServiceAPI.prototype.removeVip =
    function(friendEntry, callback /* (err, ponse) */)
    {
        return this._peformService( 'service.removeVip', friendEntry, callback);
    };

ServiceAPI.prototype.confirmEmail =
    function(email, callback /* (err, ponse) */)
    {
        return this._peformService( 'service.confirmEmail', { email: email }, callback);
    };

ServiceAPI.prototype.serviceState =
    function(callback /* (err, ponse) */)
    {
        return this._peformService( 'service.serviceState', {}, callback);
    };

ServiceAPI.prototype.setServiceEnabled =
    function(value, callback /* (err, ponse) */)
    {
        return this._peformService( 'service.setServiceEnabled', { enabled: value }, callback);
    };



// Events

ServiceAPI.vipListDidChangeEvent = 'service.vipListDidChange';
ServiceAPI.emailDidChangeEvent   = 'service.emailDidChange';
ServiceAPI.stateDidChangeEvent   = 'service.stateDidChange';

ServiceAPI.prototype.on =
    function(event, callback)
    {
        this.socket.on(event, callback);
    };


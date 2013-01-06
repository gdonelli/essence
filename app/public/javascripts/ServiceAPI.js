
//
// serviceAPI.js
//

function ServiceAPI()
{
    this.socket = io.connect();
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
        var progressEmitter = new io.EventEmitter();
          
        var progressEvent   = this._createProgressEvent();
        data.progressEvent  = progressEvent;
               
        // Actual RPC
        this.socket.emit(name, data,
            function(ponse)
            {
                this.socket.removeAllListeners(progressEvent);
                
                if (ponse.hasOwnProperty('error')) {
                    var ponseError = ponse.error;
                    var err = new Error();
                    
                    if ( ponseError && ponseError.message )
                        err.message = ponseError.message;
                        
                    if ( ponseError && ponseError.code )
                        err.code = ponseError.code;

                    callback(err);
                }
                else
                    callback(null, ponse);
            });

        this.socket.on(progressEvent,
            function(progressData) {
                progressEmitter.emit('progress', progressData);
            });
        
        return progressEmitter;
    };

ServiceAPI.prototype.getFriends =
    function(callback /* (err, ponse) */)
    {
        return this._peformService( 'service.getFriends', { }, callback );
    };


ServiceAPI.prototype.addFriend =
    function(friend_id, friend_screen_name, callback /* (err, ponse) */)
    {
        var input = {
                friend_id:          friend_id
            ,	friend_screen_name: friend_screen_name
            };
        
        return this._peformService( 'service.addFriend', input, callback);
    };


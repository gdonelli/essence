

function SetupUI()
{
}


function SendEmail()
{
    var textareaVal = $('#email-textarea').val();

    var text = textareaVal;
    
    console.log('text: ');
    console.log(text);

    console.log('inviteSentResult: ');
    console.log($('#inviteSentResult'));

    $('#email-textarea').attr('disabled', 'disabled');
    $('#send-email-btn').attr('disabled', 'disabled');

    $('#inviteSentResult').text('Sending...');
    $('#inviteSentResult').attr('class', '');
    $('#inviteSentResult').css('visibility', 'visible');

    var postCmd = $.post( 
            '/invite-send-email'
        ,   { text: text }
        ,   'json' );
    
    postCmd.done(
        function(data){
            console.log('postCmd.done:');
            console.log(data);
            
            $('#inviteSentResult').text(data + ' invites sent');
            $('#inviteSentResult').attr('class', 'alert alert-success');
        });

    postCmd.fail(
        function(data){
            console.log('postCmd.fail:');
            console.log(data);
            
            $('#inviteSentResult').text('Failed to send invites');
            $('#inviteSentResult').attr('class', 'alert alert-danger');
        });
        
    postCmd.always(
        function(data){
            console.log('postCmd.always: ');
            console.log(data);
            
            $('#send-email-btn').removeAttr('disabled');
            $('#email-textarea').removeAttr('disabled');
            $('#email-textarea').val('');
        });
}

function TweetInvite()
{
    var tweet = 'I just discovered Essence, a service for Twitter that makes it easy to focus on people you care about the most';
    var referalURL = $('#referalURL').text();
    
    var tweetURL = 'https://twitter.com/intent/tweet?text=';
    
    tweetURL += tweet.replace(' ', '%20');
    tweetURL += '%0A';
    tweetURL += referalURL;
    
    window.open(tweetURL, '_blank' );
}

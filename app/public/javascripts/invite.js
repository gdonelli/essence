

function SetupUI()
{
}

function ValidEmail(string)
{
    return (string.split('@').length == 2) && 
           (string.split('.').length > 0);
}

function ExtractEmails(string)
{  
    string = string.replace(',', ' ');
    string = string.replace('<', ' ');
    string = string.replace('>', ' ');
    string = string.replace(';', ' ');
    
    console.log('string: '  + string);
    
    var items = string.split(' ');
    var result = [];
    
    items.forEach( 
        function(x) {
            if (ValidEmail(x))
                result.push(x);
            else
                return null;
        } );
    
    return result;
}

function SendEmail()
{
    var textareaVal = $('#email-textarea').val();
    
    var emails = ExtractEmails(textareaVal);
}


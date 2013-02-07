

function SetupUI()
{
    

}

function YesButton()
{
    console.log('YesButton');
    
    $('#no-vote').removeClass('disabled');
    $('#yes-vote').addClass('disabled');

}

function NoButton()
{
    console.log('NoButton');

    $('#no-vote').addClass('disabled');
    $('#yes-vote').removeClass('disabled');
    
}



function SetupUI()
{
}

function YesButton()
{
    // console.log('YesButton');
    
    $('#no-vote').removeClass('disabled');
    $('#no-vote').removeClass('vote-selection');
    $('#no-vote').css('opacity', 0.33);
    
    $('#yes-vote').css('opacity', 1);
    $('#yes-vote').addClass('disabled');
    $('#yes-vote').addClass('vote-selection');

    $('#vote-comment').css('visibility', 'visible');
    
    $('#vote-input').val('Positive');
}

function NoButton()
{
    // console.log('NoButton');

    $('#yes-vote').css('opacity', 0.33);
    $('#yes-vote').removeClass('disabled');
    $('#yes-vote').removeClass('vote-selection');

    $('#no-vote').addClass('disabled');
    $('#no-vote').addClass('vote-selection');
    $('#no-vote').css('opacity', 1);
    
    $('#vote-comment').css('visibility', 'visible');
    
    $('#vote-input').val('Negative');
}

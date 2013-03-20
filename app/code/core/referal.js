
var     crypto = require('crypto')
    ,   _      = require('underscore')
    ,   async  = require('async')
    
    ,   service  = use('service')
    ,   database = use('database')
    ,   email    = use('email')
    ;

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


function _referralSummaryForUserEntry(referredUserEntry)
{
    var result = {};
    
    result._id         = referredUserEntry._id;
    result.twitterId   = referredUserEntry.twitter.user.id;
    result.name        = referredUserEntry.twitter.user.name;
    result.screen_name = referredUserEntry.twitter.user.screen_name;
    
    return result;
}


referal.rewardUserEntry = 
    function(userEntryToReward)
    {
        if (!userEntryToReward.maxVipCount)
            userEntryToReward.maxVipCount = 10;
            
        userEntryToReward.maxVipCount++;
        
        return userEntryToReward;
    };


referal.emailNotificationToUser =
    function(userEntryToReward, referredUserEntry)
    {
        if (!userEntryToReward.email) {
            console.error('userEntryToReward.email is not valid');
            return;
        }
        
        var msg = {
            from: email.from()
           , bcc: email.bcc()
           ,  to: userEntryToReward.email
        };
        
        msg.subject = referredUserEntry.twitter.user.name + ' joined Essence!';
        msg.text = 'Hi!\n';
        msg.text += '    Good news, ' + referredUserEntry.twitter.user.name 
                               + ' (@' + referredUserEntry.twitter.user.screen_name + '), has just joined Essence.\n';
        msg.text += 'Thank you for your referal. We added space for one more VIP to your account.\n\nYou can have up to ' + userEntryToReward.maxVipCount + ' VIPs now.\n\n';
        msg.text += 'The EssenceApp.com team';
        
        email.send(msg,
            function(err, msg) {
                if (err) {
                    console.error('Failed to referal.emailNotificationToUser error:');
                    console.error(err);
                }
            });
    };
    

referal.rewardReferralWithToken =
    function(referredUserEntry, token)
    {
        var twitterUserId = referal.userIdForToken(token);
        
        database.getUserEntryByTwitterId(twitterUserId, 
            function(err, userToRewardEntry)
            {
                if (userToRewardEntry._id == referredUserEntry._id) {
                	console.log('This is an auto-referal from ' + userToRewardName);
                    return;
                }

                var userToRewardName = userToRewardEntry.twitter.user.screen_name;

                console.log('userToReward:');
                console.log(userToRewardName);
                
                if (!userToRewardEntry.referrals)
                    userToRewardEntry.referrals = [];
                
//                database.saveUserEntry(userToRewardEntry, 
//                    function(err, userEntry)
//                    {});
//                    
//                return;


                var twitterId = referredUserEntry.twitter.user.id;
                var alreadyIn = _.find(userToRewardEntry.referrals, 
                    function(summary) {
                        // console.log('summary.twitterId: ' + summary.twitterId + ' vs twitterId:' + twitterId);
                        return (summary.twitterId == twitterId);
                    });
                
                if (alreadyIn) {
                    console.log('Reward already counted for ' + userToRewardName);
                    return; // NOTHING TO DO, reward is already in
                }
                
                console.log('alreadyIn: ');
                console.log(alreadyIn);
                
                var userSummary = _referralSummaryForUserEntry(referredUserEntry);

                userToRewardEntry.referrals.push(userSummary);
                
                console.log('userToRewardEntry.referrals:');
                console.log(userToRewardEntry.referrals);

                referal.rewardUserEntry(userToRewardEntry);
                referal.emailNotificationToUser(userToRewardEntry, referredUserEntry);
                
                database.saveUserEntry(userToRewardEntry, 
                    function(err, userEntry)
                    {
                        if (err) {
                            console.error('Failed to save userToRewardEntry in db, err:');
                            console.error(err);
                            return;
                        }

                        console.log('Rewarded added to: ' + userEntry.twitter.user.screen_name);
                    });
            } );
    };


//function _validReferralInfo(referralInfo)
//{
//    if (referralInfo)
//    {
//        
//    }
//}
//
//
//referal.applyReferralRewardsToUserEntry =
//    function(userEntry, callback /* (err) */)
//    {
//        if (!userEntry.referrals)
//            return;
//            
//        var arrayOfReferrals = [];
//        
//        for (var userIdKey in userEntry.referrals) {
//            var referralInfo = userEntry.referrals[userIdKey];
//            referralInfo._id = userIdKey;
//            arrayOfReferrals.push(referralInfo);
//        }
//        
//        var save = false;
//        async.map(arrayOfReferrals,
//            function(referralInfo, callback) {
//                console.log('referralInfo: ' + referralInfo);
//                
//                // Nothing to do
//                if (referralInfo.good)
//                    return callback(null, referralInfo);
//                    
//                database.getUserEntryById(referralInfo._id,
//                        function(err, referredEntry) {
//                            if (err) {
//                                save = true;
//                                return callback(null, null);
//                            }
//                            else {
//                                var state = service.stateForUser(referredEntry);
//                                
//                                if (state == 'GOOD')
//                                    referredEntry.good = true;
//                                
//                                return callback(null, referralInfo);
//                            }
//                        });
//            },
//            function(err, results)
//            {
//                console.log('results: ');
//                console.log(results);
//            });
//    };
//
//
//referal.applyReferralRewardsToUserEntry_2 =
//    function(userEntry, callback /* (err) */)
//    {
//        if (userEntry.referrals)
//        {
//            for (var userIdKey in userEntry.referrals)
//            {
//                var referralInfo = userEntry.referrals[userIdKey];
//                
//                if (referralInfo.good) {
//                    console.log('Already awarded the referral for:');
//                    console.log(referralInfo);
//
//                    continue;
//                }
//                else {
//                    database.getUserEntryById(userIdKey,
//                        function(err, referredEntry) {
//                            if (err) {
//                                console.log('Cannot find user. Perhaps he deleted the account:');
//                                console.log(referralInfo);
//                                
//                                delete userEntry.referrals[userIdKey];
//                            }
//                            else {
//                                // console.log(referralInfo);
//                                var state = service.stateForUser(referredEntry);
//                                console.log(referralInfo.screen_name + ' state:' + state);
//                                
//                                if (state == 'GOOD') {
//                                    userEntry.referrals[userIdKey].good = true;
//                                }
//                            }
//
//                            database.saveUserEntry(userEntry,
//                                function(err, userEntry) {
//                                    if (err) {
//                                        console.error('applyReferralRewards database.saveUserEntry failed err:');
//                                        console.error(err);
//                                        return;
//                                    }
//                            
//                                    console.log('updated userEntry:');
//                                    console.log(userEntry);
//                                });
//                        });
//                }
//                
//            }
//        }
//    };


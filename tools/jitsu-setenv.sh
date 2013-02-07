#!/bin/bash

source ../secret/setenv.sh
cd ../app


jitsu env set APP_TWITTER_ID $APP_TWITTER_ID
jitsu env set APP_TWITTER_SCREEN_NAME $APP_TWITTER_SCREEN_NAME


# Twitter App

jitsu env set CONSUMER_KEY $CONSUMER_KEY
jitsu env set CONSUMER_SECRET $CONSUMER_SECRET

jitsu env set NODEFLY_ID $NODEFLY_ID

# Session

jitsu env set SESSION_SECRET $SESSION_SECRET
jitsu env set SESSION_DB_URL $SESSION_DB_URL

# Email

jitsu env set EMAIL_ADDRESS $EMAIL_ADDRESS
jitsu env set SMTP_USER $SMTP_USER
jitsu env set SMTP_PASSWORD $SMTP_PASSWORD
jitsu env set SMTP_HOST $SMTP_HOST

jitsu env set ADMIN_EMAIL_ADDRESS $ADMIN_EMAIL_ADDRESS
jitsu env set ADMIN_TWITTER_ID $ADMIN_TWITTER_ID

# Database

jitsu env set DB_HOST $DB_HOST
jitsu env set DB_PORT $DB_PORT
jitsu env set DB_NAME $DB_NAME
jitsu env set DB_USERNAME $DB_USERNAME
jitsu env set DB_PASSWORD $DB_PASSWORD

jitsu env set HERO_ID $HERO_ID


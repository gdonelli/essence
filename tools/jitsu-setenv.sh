#!/bin/bash

source ../secret/setenv.sh
cd ../app

# Twitter App

jitsu env set CONSUMER_KEY $CONSUMER_KEY
jitsu env set CONSUMER_SECRET $CONSUMER_SECRET

jitsu env set NODEFLY_ID $NODEFLY_ID

# Session

jitsu env set SESSION_SECRET $SESSION_SECRET
jitsu env set SESSION_DB_URL $SESSION_DB_URL

# email

jitsu env set EMAIL_ADDRESS $EMAIL_ADDRESS
jitsu env set SMTP_USER $SMTP_USER
jitsu env set SMTP_PASSWORD $SMTP_PASSWORD
jitsu env set SMTP_HOST $SMTP_HOST


#!/bin/bash

source ../secret/setenv.sh


mongo --host $DB_HOST --port $DB_PORT -u $DB_USERNAME -p $DB_PASSWORD $DB_NAME

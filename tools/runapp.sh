#!/bin/bash

source ../secret/setenv.sh

if [ "$#" -gt 0 ]; then
	echo "Launch Essence.app"
	node ../app/app.js
else
	echo "Run supervisor"
	supervisor --watch ../app/  --poll-interval 1000 ../app/app.js
fi


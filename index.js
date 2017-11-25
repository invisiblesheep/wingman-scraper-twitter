import Koa from 'koa';
import KoaRouter from 'koa-router';
import parse from 'co-body';
import serve from 'koa-static';
import mongoose from 'mongoose';
import cron from 'node-cron';
import { exec } from 'child_process';
const request = require('request');

// console.log("asd");

import config from './config';

const app = new Koa();
const router = new KoaRouter({ prefix: '/api' });

let timeZone = 'Europe/Helsinki';

var regexp = /työnseisaus|mielenilmaus|taistelu|lentokenttälakko|sulkee|sulkeutuu|peruuntuu|peruutus|työmaa|työntekijät|suljettu/;

let twurlUrls = ["Finavia", "Airpro", "Helsinki%20airport", "Finnair", "Trafi", "IAU", "MinnaHelle", "PALTAry",
                    "PAM", "DestiaOy", "LemminkainenCom", "HelCityNews", "VRuutiset"];

let url = "http://localhost:1337/api";


var foundIds = []


let CronJob = require('cron').CronJob;
new CronJob('* * * * *', function() {
    console.log('You will see this message every minute');

    twurlUrls.forEach(function(url) {
        console.log(`twurl "/1.1/search/tweets.json?q=%40${url}%20OR%20%23${url}"`);
        exec(`twurl "/1.1/search/tweets.json?q=%40${url}%20OR%20%23${url}"`, (err, stdout, stderr) => {
            if (err) {
                console.log(err, 'errors');
                return;
            }

            // console.log(`stdout: ${stdout}`);
            // console.log(`stderr: ${stderr}`);
            // console.log(`stdout: ${stdout}`);
            if (stdout) {
                runModelOnTweet(stdout);
            }
        });
    });

}, null, true, timeZone);


app.use(serve(`${__dirname}/../app/build/`));



// router.get('/wings', getWings);
// router.post('/wing', postWing);

app
    .use(router.routes())
    .use(router.allowedMethods());


function startKoa() {
    app.listen(config.koa.port);
    console.log(`Listening on port ${config.koa.port}`);
}

function runModelOnTweet(stdout){

    let jsonTweets = JSON.parse(stdout);
    var matchesArray = [];

    if (jsonTweets !== undefined && jsonTweets['statuses'] !== undefined) {
        console.log("FOUND TWEET");

        // jsonTweets['statuses'].forEach( function(tweet) {
        //     console.log(tweet);
        //     console.log("ASDASD");
        // });


        let latestJsonTweet = jsonTweets['statuses'][0];
        // console.log(latestJsonTweet);


        if (latestJsonTweet !== undefined) {
            // console.log(latestJsonTweet);
            // console.log(jsonTweets['statuses'][0]);
            if (latestJsonTweet['text'].match(regexp)) {

                if (!foundIds.includes(latestJsonTweet['id'])) {
                    foundIds.push(latestJsonTweet['id']);
                    console.log(latestJsonTweet['text']);

                    var wing = {};
                    wing.heading = `Tweet from user ${latestJsonTweet['user']['name']}`;
                    wing.story = latestJsonTweet['text'];
                    wing.url = 'strike';
                    wing.categories = 'strike';
                    wing.impact = "0";
                    wing.source = 'social_media';

                    request({
                            url: `${url}/wing`,
                            method: "POST",
                            json: wing

                        },
                        function (error, response, body) {
                            if (error) {
                                return console.error('upload failed:', error);
                            }
                            console.log('Upload successful!  Server responded with:', body);
                        });
                }
            }
        }

    }
    // JSON.stringify(stdout);
    // console.log(JSON.stringify(stdout));

}

startKoa();
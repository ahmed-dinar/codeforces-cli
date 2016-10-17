'use strict';

import JSONStream from 'JSONStream';
import debug from 'debug';
import request from 'request';
import ora from 'ora';
import _ from 'lodash';
import Table from 'cli-table2';
import chalk from 'chalk';
import { line } from 'cli-spinners';

var debugs = debug('CF:tags');
var spinner = ora({
    text: 'Loading data...',
    spinner: line
});


/**
 * Getting all tags and their count
 *
 * @param callback
 *      if callback given, return tags, otherwise print
 */
export default (callback) => {

    let reqOptions = {
        uri: `http://codeforces.com/api/problemset.problems`,
        json: true
    };


    //
    // Request validators
    //
    let apiFailed= false;
    let apiMsg = '';
    let responseCode = '404';
    let contentType = '';

    let allTags = {};

    spinner.text = "Loading tags...";
    spinner.start();

    request
        .get(reqOptions)
        .on('error', (err) => {

            debugs(`Failed: Request error`);
            debugs(err);

            if( typeof callback === 'function'){
                return callback(err);
            }

            console.log('Failed');

            process.exit(1);
        })
        .on('complete', () => {

            /**
             *  Very messy code, need to update callback logic for clean code
             */

            debugs('parsing completed');
            spinner.stop();

            let isCallback = typeof callback === 'function';


            if( responseCode !== 200 ){

                if(isCallback){
                    return callback(`Failed, HTTP status: ${responseCode}`);
                }
                console.log(`Failed, HTTP status: ${responseCode}`);
                return process.exit(1);
            }

            //
            // Content not json, request failed
            //
            if( contentType.indexOf('application/json;') === -1 ){

                if(isCallback){
                    return callback('Failed.Not valid data.');
                }
                console.log('Failed.Not valid data.');
                return process.exit(1);
            }

            //
            // API reject request
            //
            if( apiFailed ){

                if(isCallback){
                    return callback(apiMsg);
                }
                console.log(apiMsg);
                return process.exit(1);
            }


            //
            // If callback given, return tags
            //
            if(isCallback){
                return callback(null,allTags);
            }


            //
            // Sort tags by problem count, need to update if better way
            //
            allTags = _
                .chain(allTags)
                .map((value, key) => {
                    return {key, value};
                })
                .orderBy('value')
                .reverse()
                .keyBy('key')
                .mapValues('value')
                .value();

            let table = new Table({
                head: [ chalk.green('TAG'), chalk.green('Total Problem')]
            });

            _.forEach(allTags, (value, key) => {
                table.push([key, value]);
            });

            console.log();
            console.log(chalk.bold.green(` Total tag: ${table.length}`));
            console.log(table.toString());

            process.exit(0);
        })
        .on('response', (response) => {

            responseCode = response.statusCode;
            contentType = response.headers['content-type'];

            debugs(`HTTP Code: ${responseCode}`);
            debugs(`Content-Type: ${contentType}`);
        })
        .pipe( JSONStream.parse('result.problems.*') )
        .on('header', (data) => {

            debugs(`API Status: ${data.status}`);

            if( data.status !== 'OK' ){
                apiFailed = true;
                apiMsg = data.comment;
            }
        })
        .on('data', (data) => {

            // debugs('data received');

            //
            // If request failed, tags nay not exists
            //
            if( _.has(data,'tags') ) {
                _.forEach(data.tags,  (tag) => {
                    if (_.has(allTags, tag)) {
                        allTags[tag]++;
                    } else {
                        allTags[tag] = 1;
                    }
                });
            }
        });
}

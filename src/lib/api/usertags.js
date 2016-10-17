'use strict';

import JSONStream from 'JSONStream';
import debug from 'debug';
import request from 'request';
import ora from 'ora';
import _ from 'lodash';
import Table from 'cli-table2';
import chalk from 'chalk';
import { line } from 'cli-spinners';
import qs from 'qs';
import { waterfall } from 'async';

import tags from './tags';

var debugs = debug('CF:usertags');
var spinner = ora({
    text: 'Loading data...',
    spinner: line
});


/**
 * First get all tags status and then user tags status, calculate and concat user tags progress
 *
 * MODIFICAIOTN NEEDED:
 *      The order should change.User may not exists
 *      So first user tags status, if user tag exixts then all tags status
 *
 * @param parameters - { handle: 'user handle' }
 */
export default (parameters = {}) => {

    waterfall([
        (callback) => {
            tags(callback);
        },
        (allTags,callback) => {

            let reqOptions = {
                uri: ``,
                json: true
            };

            let par = qs.stringify(parameters,{ encode: false });
            reqOptions.uri = `http://codeforces.com/api/user.status?${par}`;

            let apiFailed= false;
            let apiMsg = null;
            let responseCode = '404';
            let contentType = '';
            let problemTag = {};
            let myTags = {};
            let totalSubmissions = 0;
            let totalAccepted = 0;

            spinner.text = "Loading user tag data...";
            spinner.start();

            request
                .get(reqOptions)
                .on('error', (err) => {

                    debugs(`Failed: Request error`);
                    debugs(err);

                    return callback(err);
                })
                .on('complete', () => {

                    debugs('parsing completed');

                    if( responseCode !== 200 ){
                        spinner.fail();

                        if( apiMsg !== null ){
                            return callback(apiMsg);
                        }
                        return callback('Failed');
                    }

                    if( contentType.indexOf('application/json;') === -1 ){
                        spinner.fail();
                        return callback('Failed.Not valid data.');
                    }

                    if( apiFailed ){
                        spinner.fail();
                        return callback(apiMsg);
                    }

                    spinner.succeed();

                    let table = new Table({
                        head: [
                            chalk.bold.cyan('TAG'),
                            chalk.bold.cyan('Total Problem'),
                            chalk.bold.cyan('Solved'),
                            chalk.bold.cyan('%'),
                            chalk.bold.cyan('Progress')
                        ]
                    });

                    //
                    //progress bar width, need to test on linux
                    //
                    let width = 20;

                    //
                    // Progress bar colors
                    //
                    let completeColor = `${chalk.styles.bgGreen.open} ${chalk.styles.bgGreen.close}`;
                    let incompleteColor = `${chalk.styles.bgBlack.open} ${chalk.styles.bgBlack.close}`;


                    _.forEach(allTags, (value,tag) => {

                        if( _.has(myTags,tag) && parseInt(myTags[tag]) > 0 ){

                            let ratio = (parseInt(myTags[tag])) / parseInt(value);
                            ratio = Math.min(Math.max(ratio, 0), 1);
                            let percent = ratio * 100;

                            let comLenght = Math.round(width * ratio);
                            let incomLenght = width - comLenght;

                            //
                            // Remove manual loops?
                            //
                            let bar = '';
                            for (let i = 0; i < comLenght; i++) {
                                bar += completeColor;
                            }
                            for (let i = 0; i < incomLenght; i++) {
                                bar += incompleteColor;
                            }

                            table.push([tag, value, myTags[tag], `${percent.toFixed(0)}%`, bar]);

                        }else{

                            //
                            // Remove manual loops?
                            //
                            let bar = '';
                            for(let i=0; i<width; i++){
                                bar += incompleteColor;
                            }

                            table.push([tag, value, 0, '0%', bar]);
                        }
                    });


                    //
                    // Sort table by percentage
                    //
                    table = table.sort( (a,b) => {
                        let p1 = (parseInt(a[2])*100) / parseInt(a[1]);
                        let p2 = (parseInt(b[2])*100) / parseInt(b[1]);
                        return p2 - p1;
                    });

                    console.log();
                    console.log(chalk.bold.green(` User: ${parameters.handle}`));
                    console.log(chalk.green(` Total Submissions: ${totalSubmissions}`));
                    console.log(chalk.green(` Total Accepted: ${totalAccepted}`));
                    console.log(table.toString());

                    return callback();
                })
                .on('response', (response) => {

                    responseCode = response.statusCode;
                    contentType = response.headers['content-type'];

                    debugs(`HTTP Code: ${responseCode}`);
                    debugs(`Content-Type: ${contentType}`);
                })
                .pipe( JSONStream.parse('result.*') )
                .on('header',  (data) => {

                    debugs(`API Status: ${data.status}`);

                    if( data.status !== 'OK' ){
                        apiFailed = true;
                        apiMsg = data.comment;
                    }
                }).on('data', (data) => {

                if( _.has(data,'problem') ) {

                    totalSubmissions++;
                    totalAccepted += data.verdict === 'OK' ? 1 : 0;

                    let { problem } = data;
                    let prob = `${problem.contestId}${problem.index}`;
                    let { tags } = problem;

                    _.forEach(tags,  (tag) => {

                        /**
                         *  OMG!, need to fix the logic below!
                         *
                         */

                        let tagExists = _.has(myTags, tag);
                        if( !tagExists ) {
                            myTags[tag] =  data.verdict === 'OK' ? 1 : 0;
                            problemTag[prob] = {};
                            let k = problemTag[prob];
                            k[tag] = true;
                        }
                        else if ( !_.has(problemTag,prob) && tagExists && data.verdict === 'OK') {
                            myTags[tag] += 1;
                            problemTag[prob] = {};
                            let k = problemTag[prob];
                            k[tag] = true;
                        }else if( _.has(problemTag,prob) && tagExists && data.verdict === 'OK' && !_.has(problemTag[prob],tag) ){
                            myTags[tag] += 1;
                            let k = problemTag[prob];
                            k[tag] = true;
                        }

                    });

                }
            });
        }
    ], (err,result) => {

        if(err){
            console.log(err);
            return process.exit(1);
        }

        process.exit(0);
    });
}

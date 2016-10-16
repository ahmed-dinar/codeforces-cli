'use strict';

import fs from 'fs';
import path from 'path';
import request from 'request';
import inquirer from 'inquirer';
import qs from 'qs';
import _ from 'lodash';
import JSONStream from 'JSONStream';
import debug from 'debug';
import chalk from 'chalk';
import Table from 'cli-table2';
import { line } from 'cli-spinners';
import ora from 'ora';
import { waterfall  } from 'async';
import * as contrib from 'blessed-contrib';
import blessed from 'blessed';
import striptags from 'striptags';

import submit from './lib/crawler/submit';
import languages from './lib/languages';


export default class Cf {

    constructor () {

        this.API_URL = 'http://codeforces.com/api';
        this.DEFAULT_TIMEOUT = 60000; //request timeout, 1minute

        this.reqOptions = {
            uri: "",
            json: true,
            timeout: process.env.CF_TIMEOUT || this.DEFAULT_TIMEOUT
        };

        //
        // Spinner
        //
        this.spinner = ora({
            text: 'Loading data...',
            spinner: line
        });
    }


    /**
     * Getting all tags and their count
     *
     * @param callback
     *      if callback given, return tags, otherwise print
     */
    getTags(callback){

        var debugs = debug('CF:getTags');
        var self = this;

        let reqOptions = self.reqOptions;
        reqOptions.uri = `${self.API_URL}/problemset.problems`;


        //
        // Main tag data
        //
        let allTags = {};


        //
        // Request validators
        //
        let apiFailed= false;
        let apiMsg = '';
        let responseCode = '404';
        let contentType = '';

        self.spinner.text = "Loading tags...";
        self.spinner.start();

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
                self.spinner.stop();

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


    /**
     * First get all tags status and then user tags status, calculate and concat user tags progress
     *
     * MODIFICAIOTN NEEDED:
     *      The order should change.User may not exists
     *      So first user tags status, if user tag exixts then all tags status
     *
     * @param parameters
     */
    userTagStatus(parameters = {}) {

        var debugs = debug('CF:userTagStatus');

        var self = this;

        waterfall([
            (callback) => {
                self.getTags(callback);
            },
            (allTags,callback) => {

                let par = qs.stringify(parameters,{ encode: true });
                let reqOptions = self.reqOptions;
                reqOptions.uri = `${self.API_URL}/user.status?${par}`;

                let apiFailed= false;
                let apiMsg = '';
                let responseCode = '404';
                let contentType = '';
                let problemTag = {};
                let myTags = {};
                let totalSubmissions = 0;
                let totalAccepted = 0;

                self.spinner.text = "Loading user tag data...";
                self.spinner.start();

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
                            self.spinner.fail();
                            return callback('Failed');
                        }

                        if( contentType.indexOf('application/json;') === -1 ){
                            self.spinner.fail();
                            return callback('Failed.Not valid data.');
                        }

                        if( apiFailed ){
                            self.spinner.fail();
                            return callback(apiMsg);
                        }

                        self.spinner.succeed();

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


    /**
     * Get and print user rating of all contests
     *
     * @param handle
     *         - user codefroces handle
     * @param noChart
     *          - if true display table insted of chart
     */
    userRating(handle = '', noChart = false){

        var debugs = debug('CF:userRating');

        var self = this;

        let reqOptions = self.reqOptions;
        reqOptions.uri = `${self.API_URL}/user.rating?${qs.stringify({ handle: handle })}`;

        debugs(reqOptions.uri);

        //
        // Request validators
        //
        let apiFailed= false;
        let apiMsg = '';
        let responseCode = '404';
        let contentType = '';


        //
        // default chart view, only need newRating data
        //
        let jStream = JSONStream.parse('result.*.newRating');

        //
        // Chart's x axis and y axis data
        //
        var axisX = [];
        var axisY = [];

        //
        // No chart,Get all result and make a table.
        // using already declared 'axisX' variable
        //
        if( noChart ){
            jStream = JSONStream.parse('result.*');
            axisX = new Table({
                head: [
                    chalk.bold.cyan('Contest'),
                    chalk.bold.cyan('Rank'),
                    chalk.bold.cyan('Rating change'),
                    chalk.bold.cyan('New rating')
                ]
                // colWidths: [60, 10, 10, 10],
                //  wordWrap:true
            });
        }

        self.spinner.text = "Loading rating...";
        self.spinner.start();


        request
            .get(reqOptions)
            .on('error', (err) => {

                debugs(`Failed: Request error`);
                debugs(err);

                console.log('Failed [Request]');

                process.exit(1);
            })
            .on('complete', () => {

                debugs('parsing completed');

                if( responseCode !== 200 ){
                    self.spinner.fail();
                    console.log('Failed.');
                    return process.exit(1);
                }

                if( contentType.indexOf('application/json') === -1 ){
                    self.spinner.fail();
                    console.log('Failed.Not valid data.');
                    return process.exit(1);
                }

                if( apiFailed ){
                    self.spinner.fail();
                    console.log(apiMsg);
                    return process.exit(1);
                }

                self.spinner.succeed();

                //
                // Show table
                //
                if (noChart) {

                    console.log();
                    console.log(chalk.bold.green(` User: ${handle}`));
                    console.log(chalk.bold.green(` Total contest: ${axisX.length}`));
                    console.log(axisX.toString());

                    process.exit(0);
                }

                //
                // Show fancy chart
                //
                showLineChart(axisX,axisY);

            })
            .on('response', (response) => {

                responseCode = response.statusCode;
                contentType = response.headers['content-type'];

                debugs(`HTTP Code: ${responseCode}`);
                debugs(`Content-Type: ${contentType}`);
            })
            .pipe( jStream )
            .on('header', (data) => {

                debugs(`API Status: ${data.status}`);

                if( data.status !== 'OK' ){
                    apiFailed = true;
                    apiMsg = data.comment;
                }
            })
            .on('data', (data) => {

                // debugs('data received');

                if( noChart ){
                    axisX.push([
                        striptags(data.contestName.toString()),
                        data.rank,
                        (parseInt(data.newRating) - parseInt(data.oldRating)).toString(),
                        data.newRating
                    ]);
                }else{
                    axisY.push(data);
                    axisX.push(data.toString());
                }
            });
    }


    /**
     *
     * @param options
     */
    submitSolution(options){

        let self = this;
        self.debug = debug('CF:submitSolution');

        //
        // Make absolute path
        //
        let codePath = self.getFileDir(options.codeFile);

        self.debug(codePath);


        self.codeFileExists(codePath,(err) => {

            if(err){
                console.log(err);
                return process.exit(1);
            }

            let lang = path.extname(options.codeFile).split('.');
            if( !lang.length ){
                console.log("No extension found.");
                return process.exit(1);
            }

            lang = lang.pop();

            //
            // The given file extension not found in default config file
            // Need to update and add show list of language to enter manually
            //
            if( !_.has(languages.extensions,lang) ){
                console.log("Invalid extension.");
                return process.exit(1);
            }

            options.codePath = codePath;
            options.language = languages.extensions[lang];

            //
            // handle and password options
            //
            let credentials = [{
                name: 'handle',
                message: 'handle: ',
                validate: validateEmpty
            }, {
                name: 'password',
                message: 'password: ',
                type: 'password',
                validate: validateEmpty
            }];

            //
            // ASk for handle and password
            //
            inquirer.prompt(credentials).then( (answers) => {
                options.handle = answers.handle;
                options.password = answers.password;

                submit(options);
            });

        });

    }


    /**
     *
     * @returns {*}
     */
    getFileDir(fileName) {
        return path.join(path.resolve(process.cwd()), fileName);
    }


    /**
     *
     * @param FILE_PATH
     * @param callback
     */
    codeFileExists(FILE_PATH,callback) {

        fs.stat(FILE_PATH, function fsStat(err, stats) {

            if (err) {

                //
                //if path/file not exists
                //
                if (err.code === 'ENOENT') {
                    return callback(new Error('No such file or directory.Please check your file : \'' + err.path + "'"));
                }

                //
                //process error
                //
                return callback(err);
            }

            if( !stats.isFile() ){
                return callback(new Error('Not a file.Please check your file path or extension.'));
            }

            return callback();
        });
    }

}



/**
 * Show user rating chart
 *
 * @param axisX - x axis data (constest ratings)
 * @param axisY - y axis data (constest ratings)
 */
function showLineChart(axisX,axisY) {

    let screen = blessed.screen();

    let chartLine = contrib.line({
        style: {
            line: "white",
            text: "green",
            baseline: "black"
        },
        width: "100%",
        height: "80%",
        top: 3,
        showLegend: false,
        wholeNumbersOnly: false,
        label: ''
    });


    let chartData = {
        x: axisX,
        y: axisY
    };

    screen.append(chartLine);
    chartLine.setData([chartData]);

    //
    // Exit when press esc, q or ctrl+c
    //
    screen.key(['escape', 'q', 'C-c'], function(ch, key) {
        return process.exit(0);
    });

    screen.render();
}


/**
 * Validator for console promt [inquirer]
 * @param inpt
 * @returns {boolean}
 */
function validateEmpty(inpt) {
    return inpt.length > 0;
}
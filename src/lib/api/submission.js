'use strict';

import clear from 'clear';
import path from 'path';
import _ from 'lodash';
import jsonfile from 'jsonfile';
import inquirer from 'inquirer';
import qs from 'qs';
import request from 'request';
import debug from 'debug';
import chalk from 'chalk';
import Table from 'cli-table2';
import { line } from 'cli-spinners';
import ora from 'ora';
import { waterfall, whilst } from 'async';
import verdicts from '../verdicts';
import { log, logr, getHomeDir, validateEmpty } from '../helpers';

var debugs = debug('CF:submission');
var spinner = ora({ spinner: line });
var GN = chalk.green;
var GB = chalk.bold.green;
var RB = chalk.bold.red;

var TIME_OUT = 30000; //30 seconds
var STATUS_DELAY = 5000; //4 seconds
var TOTAL_WATCH = 10; //total submission to fetch


/**
 *
 * @param {Object} configs - {  count, remember,  contest, contestId, delay  }
 */
export default (configs = {}) => {

    let options = {};

    options.config = path.resolve(`${getHomeDir()}/.cfconfig`);
    options.count = configs.count || 1;

    options.remember = _.has(configs,'remember')
        ? configs.remember
        : false;

    options.watch = _.has(configs,'watch')
        ? configs.watch
        : false;

    options.contest = _.has(configs,'contest')
        ? configs.contest
        : false;

    if( configs.contest ){
        options.contestId = configs.contestId;
    }

    if( _.has(configs,'delay') && configs.delay >= 2000 ){
        STATUS_DELAY = configs.delay;
    }

    waterfall([
        (next) => {
            readConfig(options, next);
        },
        getSubmission
    ],(err,res) => {

        if(err){
            spinner.fail();
            return logr(err);
        }

    });
}


/**
 * Reading config file searching saved credentials
 * @param options
 * @param next
 */
function readConfig(options, next) {

    spinner.text = `Reading config file...`;
    spinner.start();

    jsonfile.readFile(options.config, (err, obj) => {

        let askHandle = false;

        if( err ){

            if( err.code === 'EPERM' ){
                return next(`Permission denied config file.`);
            }

            if( err.code !== 'ENOENT' ){
                return next(err);
            }

            debugs(`Config file not found`);
            askHandle = true;
        }

        spinner.stop();

        if( askHandle || !_.has(obj,'user')  ){

            let credentials = [{
                name: 'handle',
                message: 'handle: ',
                validate: validateEmpty
            }];

            inquirer.prompt(credentials).then( (answer) => {

                options.handle = answer.handle;

                jsonfile.writeFileSync(options.config, { user: options.handle });//save handle

                return next(null, options);
            });
            return;
        }

        debugs(`Handle found in config file`);
        spinner.text = `Saved handle found '${obj.user}'`;
        spinner.succeed();

        options.handle = obj.user;
        return next(null, options);
    });
}


/**
 * Get submission status and exit
 *
 * @param options
 * @param next
 */
function getSubmission(options, next) {

    //go to live submssion status
    if( options.watch ){
        return watchRun(options,next);
    }

    let url = generateUrl(options);
    debugs(`URL = ${url}`);

    let reqOptions = {
        uri: url,
        json: true,
        timeout: TIME_OUT
    };

    spinner.text = `Fetching submissions..`;
    spinner.start();

    request
        .get(reqOptions, (error, response, body) => {

            if(error){
                return next(error);
            }

            let { statusCode } = response;
            if( statusCode!==200 ){
                return next(body.comment || 'HTTP error');
            }

            if( body.status !== 'OK' ){
                return next(body.comment);
            }

            spinner.succeed();
            generateTable(body.result);

            return next();
        });
}


/**
 * Getting submission status until testing done
 *
 * @param options
 * @param next
 */
function watchRun(options, next) {

    let params = qs.stringify({
        handle: options.handle,
        from: 1,
        count: options.count <= 10
            ? options.count
            : TOTAL_WATCH
    }, { encode: false });


    let url = generateUrl(options);
    debugs(url);

    let reqOptions = {
        uri: url,
        json: true,
        timeout: TIME_OUT
    };

    var keepWatching = true;
    whilst(
        () => {
            return keepWatching;
        },
        (callback) => {

            spinner.text = `Refreshing..`;
            spinner.start();

            request
                .get(reqOptions, (error, response, body) => {

                    if(error){
                        return callback(error);
                    }

                    let { statusCode } = response;
                    if( statusCode!==200 ){
                        return callback(body.comment || 'HTTP error');
                    }

                    if( body.status !== 'OK' ){
                        return callback(body.comment);
                    }

                    spinner.succeed();
                    keepWatching = generateTable(body.result, true);

                    //
                    // Still testing, Wait x seconds and get status again
                    //
                    if( keepWatching ) {
                        setTimeout(() => {
                            callback();
                         }, STATUS_DELAY);
                        return;
                    }

                    return callback();
                });
        },
        (err, n) => {

            if(err){
                debugs(`Error while watching`);
                return next(err);
            }

            return next();
        }
    );
}


/**
 * Generate and print table
 *
 * @param {Object} runs - submission object
 * @param {boolean} isWatch
 * @returns {boolean} - if still running return true for watch
 */
function generateTable(runs, isWatch = false){

    let table = new Table({
        head: [ GN(`Id`), GN(`Problem`) , GN(`Lang`), GN(`Verdict`), GN(`Time`), GN(`Memory`) ]
    });

    let done = true;
    let who = '';

    _.forEach(runs, (run) => {

        let { id, contestId, problem, programmingLanguage,verdict, passedTestCount, timeConsumedMillis, memoryConsumedBytes, author } = run;
        let memory = parseInt(memoryConsumedBytes) / 1000;
        let passed = parseInt(passedTestCount);
        who = author.members[0].handle;

        debugs(run.testset);

        if( verdict === undefined ){
            done = false;
            verdict = chalk.white.bold(`In queue`);
        }
        else{
            switch (verdict){
                case 'TESTING':
                    done = false;
                    verdict = chalk.white.bold(verdicts[verdict]);
                    break;
                case 'OK':
                    verdict = GB(verdicts[verdict]);
                    break;
                case 'RUNTIME_ERROR':
                case 'WRONG_ANSWER':
                case 'PRESENTATION_ERROR':
                case 'TIME_LIMIT_EXCEEDED':
                case 'MEMORY_LIMIT_EXCEEDED':
                case 'IDLENESS_LIMIT_EXCEEDED':
                    verdict = RB(`${verdicts[verdict]} on test ${passed+1}`);
                    break;
                default:
                    verdict = RB(verdicts[verdict]);
            }
        }

        table.push([
            id,
            `${contestId}${problem.index} - ${problem.name}`,
            programmingLanguage,
            verdict,
            `${timeConsumedMillis} MS`,
            `${memory} KB`
        ]);
    });

    // in live watching mode, clear console in every refresh
    if( isWatch ){
        clear();
    }

    log('');
    log(GB(`User: ${who}`));
    log(table.toString());

    return !done;
}


/**
 * Generate submission status url
 *
 * @param options
 * @returns {string}
 */
function generateUrl(options) {

    if( options.contest ){
        let params = qs.stringify({
            handle: options.handle,
            from: 1,
            count: options.count,
            contestId: options.contestId
        }, { encode: false });
        return `http://codeforces.com/api/contest.status?${params}`;
    }

    let params = qs.stringify({
        handle: options.handle,
        from: 1,
        count: options.count
    }, { encode: false });

    return `http://codeforces.com/api/user.status?${params}`;
}
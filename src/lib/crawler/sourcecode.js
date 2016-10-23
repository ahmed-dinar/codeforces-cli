'use strict';

import path from 'path';
import fs from 'fs';
import request from 'request';
import debug from 'debug';
import cheerio from 'cheerio';
import mkdirp from 'mkdirp';
import JSONStream from 'JSONStream';
import chalk from 'chalk';
import _ from 'lodash';
import { line } from 'cli-spinners';
import ora from 'ora';
import languages from '../languages';
import { waterfall, each, eachLimit, parallel } from 'async';
import { log, logr, checkPath, commonHeaders } from '../helpers';


var debugs = debug('CF:sourcecode');
var spinner = ora({ spinner: line });
var GB = chalk.green.bold;


var headers = commonHeaders();
var problemHeaders = commonHeaders();


/**
 *
 * @param options
 * @param callback
 */
export default (options, callback) => {

    var hrstart = process.hrtime();

    headers['Referer'] = `http://codeforces.com/submissions/${options.handle}`;

    let LIMIT = 10;
    let totalSubmissions = 0;

    if( _.has(options,'limit') && options.limit > 0 ){
        LIMIT = options.limit;
    }

    debugs(`Async limit: ${LIMIT}`);

    waterfall([
        (cb) => {
            createOutputDir(options, cb);
        },
        (dir,cb) => {
            getSubmissions(dir, options,cb);
        },
        (dir, submissions, cb) => {

            totalSubmissions = submissions.length;

            if( options.withProblem ) {
                eachLimit(submissions, LIMIT, getResource.bind(null, dir), cb);
                return;
            }

            eachLimit(submissions, LIMIT, getOnlySource.bind(null, dir), cb);
        }
    ], (err,res) => {

        if( err ){
            spinner.fail();
            logr(err);
            return;
        }

        let hrend = process.hrtime(hrstart);
        log(`  Total ${totalSubmissions} submissions saved`);
        log(`  Execution time: ${hrend[0]}s ${hrend[1] / 1000000}ms`);

        if( typeof callback === 'function' ){
            return callback(err,res);
        }

    });
};

/**
 *
 * @param options
 * @param callback
 */
function createOutputDir(options,callback) {

    let { dir, handle } = options;

    waterfall([
        (cb) => {
            if(dir !== '.'){
                return checkPath(dir,cb);
            }
            return cb();
        },
        (cb) => {

            if( dir === '.' ){
                dir = path.join(path.resolve(process.cwd()), handle);
            }
            else{
                dir = path.join(dir, handle);
            }

            debugs(`creating directory ${dir}....`);
            spinner.text = `creating directory ${dir}....`;
            spinner.start();

            return mkdirp(dir, (err) => {
                if(err){
                    return cb(err);
                }
                spinner.succeed();
                return cb(null,dir);
            });
        }
    ], callback);
}


/**
 *
 * @param dir
 * @param options
 * @param callback
 */
function getSubmissions(dir, options, callback) {

    let { handle , withProblem } = options;
    let url = `http://codeforces.com/api/user.status?handle=${handle}`;

    let apiFailed = false;
    let apiMsg = null;
    let responseCode = 404;
    let contentType = '';
    let acSubmissions = [];

    let reqOptions = {
        uri: url,
        json: true,
        headers: headers,
        timeout: 60000
    };

    debugs('Fetching submissions..');
    spinner.text = 'fetching submissions..';
    spinner.start();

    request
        .get(reqOptions)
        .on('error', (err) => {

            debugs('Failed: Request error');
            debugs(err);

            return callback(err);
        })
        .on('complete', () => {

            debugs('parsing completed');

            if( responseCode !== 200 ){
                if( apiMsg !== null ){
                    return callback(apiMsg);
                }
                return callback('Failed HTTP');
            }

            if( contentType.indexOf('application/json;') === -1 ){
                return callback('Failed.Not valid data.');
            }

            if( apiFailed ){
                return callback(apiMsg);
            }

            spinner.stop();
            spinner.text = `total accepted submission: ${acSubmissions.length}`;
            spinner.succeed();

            debugs(`Total accepted submission: ${acSubmissions.length}`);

            return callback(null, dir, acSubmissions);
        })
        .on('response', (response) => {

            responseCode = response.statusCode;
            contentType = response.headers['content-type'];

            debugs(`HTTP Code: ${responseCode}`);
            debugs(`Content-Type: ${contentType}`);
        })
        .pipe( JSONStream.parse('result.*') )
        .on('header', (data) => {

            debugs(`API Status: ${data.status}`);

            if( data.status !== 'OK' ){
                apiFailed = true;
                apiMsg = data.comment;
            }
        })
        .on('data', (data) => {

            if( _.has(data,'problem') && data.verdict === 'OK' && data.contestId < 10000 ) {

                let { problem, id , contestId, programmingLanguage } = data;
                let { index } = problem;
                let problemId = `${contestId}${index}`;
                let root = contestId > 10000
                    ? 'gym'
                    : 'contest'; //currently gym not working. need authorization
                let submissionUrl = `http://codeforces.com/${root}/${contestId}/submission/${id}`;
                let problemUrl = `http://codeforces.com/${root}/${contestId}/problem/${index}`;

                acSubmissions.push({
                    submissionId: id,
                    contestId: contestId,
                    problemIndex: index,
                    problemId: problemId,
                    submissionUrl: submissionUrl,
                    problemUrl: withProblem
                        ? problemUrl
                        : null,
                    language: programmingLanguage
                });
            }
        });
}

/**
 *
 * @param dir
 * @param submission
 * @param callback
 */
function getResource(dir, submission, callback) {

    let { submissionId, submissionUrl, problemUrl, problemId, language } = submission;
    let outputPath = path.join(dir, `${problemId}`);
    let ext = languages.getExtension(language);

    parallel([
        (cb) => {

            debugs(`fetching sourecode ${problemId}_${submissionId}`);
            log(GB(`  fetching sourecode ${problemId}_${submissionId}`));

            let filePath = path.join(outputPath, `${problemId}_${submissionId}.${ext}`);
            getSourceCode(submissionUrl, filePath, `code ${problemId}_${submissionId}` ,cb);
        },
        (cb) => {

            debugs(`fetching problem ${problemId}`);
            log(GB(`  fetching problem ${problemId}`));

            let filePath = path.join(outputPath, `${problemId}.html`);
            getProblem(problemUrl,filePath, `problem ${problemId}`, cb);
        },
        (cb) => {
            mkdirp(outputPath,cb);
        }
    ], (err, data) => {

        if(err){
            return callback(err);
        }

        if( data.length < 2 ){
            return callback();
        }

        each([ data[0], data[1] ], writeOutputs , callback);
    });
}


/**
 * Only download source code, no problem statement
 * @param dir
 * @param submission
 * @param callback
 */
function getOnlySource(dir, submission, callback) {

    let { submissionId, submissionUrl, problemId, language } = submission;
    let outputPath = path.join(dir, `${problemId}`);
    let ext = languages.getExtension(language);

    parallel([
        (cb) => {

            debugs(`fetching sourecode ${problemId}_${submissionId}`);
            log(GB(`  fetching sourecode ${problemId}_${submissionId}`));

            let filePath = path.join(outputPath, `${problemId}_${submissionId}.${ext}`);
            getSourceCode(submissionUrl, filePath, `code ${problemId}_${submissionId}` , cb);
        },
        (cb) => {
            mkdirp(outputPath,cb);
        }
    ], (err, data) => {

        if(err){
            return callback(err);
        }

        if( !data.length ){
            return callback();
        }

        writeOutputs(data[0], callback);
    });
}


/**
 *
 * @param submissionUrl
 * @param filePath
 * @param callback
 */
function getSourceCode(submissionUrl, filePath, name, callback) {

    let reqOptions = {
        uri: submissionUrl,
        headers: headers
    };

    request.get(reqOptions, (err,response, body) => {

        if( err ){
            return callback(err);
        }

        let $ = cheerio.load(body, {decodeEntities: true} );
        let source = $('.program-source');

        if( !source.length ){
            logr(`  no soure code found ${submissionUrl}`);
            return callback();
        }

        let code = $(source).text();

        return callback(null, { content: code, path: filePath, name: name });
    });
}


/**
 *
 * @param problemUrl
 * @param filePath
 * @param callback
 */
function getProblem(problemUrl, filePath, name, callback) {

    let reqOptions = {
        uri: problemUrl,
        headers: problemHeaders
    };

    request.get(reqOptions, (err,response, body) => {

        if( err ){
            return callback(err);
        }

        let $ = cheerio.load(body, {decodeEntities: true} );
        let pst = $('.problem-statement');

        if( !pst.length ){
            logr(`  no problem statement found ${problemUrl}`);
            return callback();
        }

        let statement = $(pst).html();

        return callback(null, { content: statement, path: filePath, name: name });
    });
}


/**
 *
 * @param output
 * @param callback
 */
function writeOutputs(output, callback) {

    if( typeof output === 'undefined' || output === null ){
        return callback();
    }

    debugs(`saving ${output.name}`);
    log(GB(`  saving ${output.name}`));

    fs.writeFile(output.path, output.content, callback);
}
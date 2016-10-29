'use strict';

import path from 'path';
import fs from 'fs';
import request from 'request';
import debug from 'debug';
import cheerio from 'cheerio';
import mkdirp from 'mkdirp';
import JSONStream from 'JSONStream';
import chalk from 'chalk';
import has from 'has';
import ora from 'ora';
import languages from '../languages';
import { waterfall, eachLimit, series, eachSeries } from 'async';
import { log, logr, checkPath, commonHeaders } from '../helpers';


var debugs = debug('CF:sourcecode');
var spinner = ora({ spinner: 'line' });
const GB = chalk.green.bold;

const TIME_OUT = 60000; //1 minute
var headers = commonHeaders();
var problemHeaders = commonHeaders();


export default class Sourcecode {


    /**
     * @param {String} handle
     * @param {Number} limit - connection (async) limit to during download
     * @param {boolean} withProblem - if true, also download problem statement
     * @param {string} dir - target directory to save code
     */
    constructor({handle = null, limit = 10, withProblem = false, dir = '.'} = {}) {

        if (handle === null || typeof handle != 'string') {
            throw new Error('handle should not be null or empty');
        }

        this.options = { handle, withProblem, limit, dir };
    }

    /**
     * @param callback
     */
    download(callback){

        let self = this;
        let hrstart = process.hrtime();
        let totalSubmissions = 0;
        headers['Referer'] = `http://codeforces.com/submissions/${self.options.handle}`;

        debugs(`Async limit: ${self.limit}`);

        waterfall([
            (next) => {
                self.createOutputDir(self.options, next);
            },
            (dir, next) => {
                self.getSubmissions(dir, self.options, next);
            },
            (dir, submissions, next) => {

                totalSubmissions = submissions.length;

                if (self.options.withProblem) {
                    return eachLimit(submissions, self.options.limit, self.getResource.bind(self, dir), next);
                }

                eachLimit(submissions, self.options.limit, self.getOnlySource.bind(self, dir), next);
            }
        ], (err, res) => {

            if (typeof callback === 'function') {
                spinner.stop();
                return callback(err, res);
            }

            if (err) {
                spinner.fail();
                logr(err);
                return;
            }

            let hrend = process.hrtime(hrstart);
            log(`  Total ${totalSubmissions} submissions saved`);
            log(`  Execution time: ${hrend[0]}s ${Math.round(hrend[1] / 1000000)}ms`);
        });
    }

    /**
     * ceate target directory where sourcecode will download, use handle
     * @param {Object} options
     * @param callback
     */
    createOutputDir(options, callback) {

        let {dir, handle} = options;
        waterfall([
            (next) => {
                if (dir !== '.') {
                    return checkPath(dir, next);
                }
                return next();
            },
            (next) => {

                if (dir === '.') {
                    dir = path.join(path.resolve(process.cwd()), handle);
                }
                else {
                    dir = path.join(dir, handle);
                }

                spinner.text = `creating directory ${dir}`;
                spinner.start();

                return mkdirp(dir, (err) => {
                    if (err) {
                        return next(err);
                    }
                    spinner.succeed();
                    return next(null, dir);
                });
            }
        ], callback);
    }


    /**
     * Get all submission status using Codeforces API
     * @param {string} dir - target directory
     * @param {Object} options
     * @param callback
     */
    getSubmissions(dir, options, callback) {

        let {handle, withProblem} = options;
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
            timeout: TIME_OUT
        };

        spinner.text = 'fetching submissions..';
        spinner.start();

        let reqStream = request.get(reqOptions);
        let jsonStream = reqStream.pipe(JSONStream.parse('result.*'));

        reqStream.on('error', (err) => {
            debugs('Failed: Request error');
            debugs(err);

            return callback(err);
        });


        reqStream.on('complete', () => {
            debugs('parsing completed');

            if (responseCode !== 200) {
                return callback(apiMsg || `HTTP failed with status ${responseCode}`);
            }

            if (contentType.indexOf('application/json;') === -1) {
                return callback('Failed.Not valid data.');
            }

            if (apiFailed) {
                return callback(apiMsg);
            }

            spinner.stop();
            spinner.text = `total accepted submission: ${acSubmissions.length}`;
            spinner.succeed();

            return callback(null, dir, acSubmissions);
        });


        reqStream.on('response', (response) => {
            debugs(`HTTP Code: ${responseCode}`);
            debugs(`Content-Type: ${contentType}`);

            responseCode = response.statusCode;
            contentType = response.headers['content-type'];
        });


        jsonStream.on('header', (data) => {
            debugs(`API Status: ${data.status}`);

            if (data.status !== 'OK') {
                apiFailed = true;
                apiMsg = data.comment;
            }
        });


        jsonStream.on('data', (data) => {

                // `data.contestId < 10000` is for detecting gym.Useless now.Need authorization
            if (has(data, 'problem') && data.verdict === 'OK' && data.contestId < 10000) {

                let {problem, id, contestId, programmingLanguage} = data;
                let {index} = problem;
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
     * Fetch sourcecode and problem statement
     * @param {string} dir - target directory
     * @param {Array} submission - all submission status from API
     * @param callback
     */
    getResource(dir, submission, callback) {

        let self = this;
        let {submissionId, submissionUrl, problemUrl, problemId, language} = submission;
        let outputPath = path.join(dir, `${problemId}`);
        let ext = languages.getExtension(language);

        series([
            (next) => {
                log(GB(`  fetching sourecode ${problemId}_${submissionId}`));

                let filePath = path.join(outputPath, `${problemId}_${submissionId}.${ext}`);
                self.getSourceCode(submissionUrl, filePath, `code ${problemId}_${submissionId}`, next);
            },
            (next) => {
                log(GB(`  fetching problem ${problemId}`));

                let filePath = path.join(outputPath, `${problemId}.html`);
                self.getProblem(problemUrl, filePath, `problem ${problemId}`, next);
            },
            (next) => {
                mkdirp(outputPath, next);
            }
        ], (err, data) => {

            if (err) {
                return callback(err);
            }

            if (data.length < 2) {
                return callback();
            }

            eachSeries([data[0], data[1]], self.writeOutputs, callback);
        });
    }


    /**
     * Only download source code, no problem statement
     * @param {string} dir - target directory
     * @param {Array} submission - all submission status from API
     * @param callback
     */
    getOnlySource(dir, submission, callback) {

        let self = this;
        let {submissionId, submissionUrl, problemId, language} = submission;
        let outputPath = path.join(dir, `${problemId}`);
        let ext = languages.getExtension(language);

        series([
            (next) => {
                log(GB(`  fetching sourecode ${problemId}_${submissionId}`));

                let filePath = path.join(outputPath, `${problemId}_${submissionId}.${ext}`);
                self.getSourceCode(submissionUrl, filePath, `code ${problemId}_${submissionId}`, next);
            },
            (next) => {
                mkdirp(outputPath, next);
            }
        ], (err, data) => {

            if (err) {
                return callback(err);
            }

            if (!data.length) {
                return callback();
            }

            self.writeOutputs(data[0], callback);
        });
    }


    /**
     * Scrape sourcecode
     * @param {string} submissionUrl - the code url
     * @param {string} filePath - code path to save
     * @param {string} name - name of the code, contestid+problemIndex+submissionId
     * @param callback
     */
    getSourceCode(submissionUrl, filePath, name, callback) {

        let reqOptions = {
            uri: submissionUrl,
            headers: headers
        };

        request.get(reqOptions, (err, response, body) => {

            if (err) {
                return callback(err);
            }

            let $ = cheerio.load(body, {decodeEntities: true});
            let source = $('.program-source');

            if (!source.length) {
                logr(`  no soure code found ${submissionUrl}`);
                return callback();
            }

            let code = $(source).text();

            return callback(null, {content: code, path: filePath, name: name});
        });
    }


    /**
     * Scrape problem statement
     * @param problemUrl
     * @param filePath
     * @param name
     * @param callback
     */
    getProblem(problemUrl, filePath, name, callback) {

        let reqOptions = {
            uri: problemUrl,
            headers: problemHeaders
        };

        request.get(reqOptions, (err, response, body) => {

            if (err) {
                return callback(err);
            }

            let $ = cheerio.load(body, {decodeEntities: true});
            let pst = $('.problem-statement');

            if (!pst.length) {
                logr(`  no problem statement found ${problemUrl}`);
                return callback();
            }

            let statement = $(pst).html();

            return callback(null, {content: statement, path: filePath, name: name});
        });
    }


    /**
     * save content to file
     * @param {Object} output
     * @param callback
     */
    writeOutputs(output, callback) {

        //gym contest not permitted
        if (typeof output === 'undefined' || output === null) {
            return callback();
        }

        log(GB(`  saving ${output.name}`));

        fs.writeFile(output.path, output.content, callback);
    }
}
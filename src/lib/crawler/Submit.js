'use strict';

import waterfall from 'async/waterfall';
import request from 'request';
import has from 'has';
import debug from 'debug';
import cheerio from 'cheerio';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import ora from 'ora';
import jsonfile from 'jsonfile';
import CryptoJS from 'crypto-js';
import inquirer from 'inquirer';
import languages from '../languages';
import { getCWD, checkPath, log, logr, getHomeDir, validateEmpty, commonHeaders } from '../helpers';
import submission from '../api/submission';


//
// these Should not be here. should avoid hard coded
//
const HASH_SECRET = 'thisisverysecret';
const TIME_OUT = 30000;

var cookieJar = request.jar();
var debugs = debug('CF:submit');
var spinner = ora({ spinner: 'line' });


export default class Submit {


    /**
     * @param {Number} contestId
     * @param {char} problemIndex - problem index of the contest, [A - Z]
     * @param {string} codeFile - code file path
     * @param {Boolean} watch - if true then show live submission status after submission
     * @param {Number} totalRuns - total submission to display if watch
     * @param {Number} delay - refreshing time of watch [in millisecond]
     * @param {Number} language - language id [see lib/languages.js].If given, use language id, otherwise use given file extension.
     * @param {Boolean} remember - if true , save credentials after successfully login
     * @param {Boolean} logout - if true, delete credentials after successfully login
     * @param {Boolean} gym - if true, submit as gym contest solution
     */
    constructor ({
        contestId = null,
        problemIndex = null,
        codeFile = null,
        watch = false,
        totalRuns = 1,
        delay = 1000,
        language = null,
        remember = false,
        logout = false,
        gym = false
    } = {}) {

        let isMissing = contestId === null || problemIndex === null || codeFile === null;
        if (isMissing) {
            throw new Error('codeFile, contestId and problemIndex required');
        }

        let options = {contestId, problemIndex, codeFile, watch, totalRuns, delay, remember, logout};
        options.codePath = getCWD(options.codeFile);
        options.form = 'http://codeforces.com/enter';   //login url
        options.nextForm = 'http://codeforces.com/problemset/submit';
        options.type = gym
            ? 'gym'
            : 'contest';

        /* istanbul ignore else */
        if (language !== null) {
            options['language'] = language;
        }

        this.options = options;
    }


    /**
     * @param next
     */
    submit(next) {

        let self = this;

        log('');

        waterfall([
            (callback) => {
                checkPath(self.options.codePath, true, callback);
            },
            (callback) => {
                self.prepareInput(self.options, callback);
            },
            self.getCSRFToken,
            self.login,
            self.getCSRFToken,
            self.submitSolution
        ], (err, res) => {

            if( typeof next === 'function' ){
                return next(err,res);
            }

            /* istanbul ignore else */
            if (err) {

                spinner.fail();

                /* istanbul ignore else */
                if (typeof err === 'string') {
                    spinner.text = chalk.bold.red(err);
                    spinner.start();
                    spinner.fail();
                    return;
                }
                logr(err);
                return;
            }

            /* istanbul ignore next */
            if (self.options.watch) {

                let suboptions = {
                    remember: false,
                    count: self.options.totalRuns,
                    watch: true,
                    delay: self.options.delay,
                    contest: true,
                    contestId: self.options.contestId
                };

                return submission(suboptions);
            }
        });
    }


    /**
     * Check config file for credentials if previously saved
     * If not found, ask handle and password from user console input
     * @param {Object} options
     * @param callback
     * @returns {*}
     */
    prepareInput(options, callback) {

        if (has(options, 'language')) {
            let {typeId} = languages;
            let tid = options.language;

            /* istanbul ignore else */
            if (!has(typeId, tid)) {
                return callback(`  Error: Invalid language id '${tid}', Please type 'cf lang' to see supported language list`);
            }
        }
        else {
            let lang = path
                .extname(options.codeFile)
                .split('.')
                .pop();
            let {extensions} = languages;

            if (!has(extensions, lang)) {
                return callback(`  Error: Invalid language extension .${lang}, Please type 'cf lang' to see supported language list`);
            }
            options.language = extensions[lang];
        }

        options.config = path.resolve(`${getHomeDir()}/.cfconfig`);

        waterfall([
            (next) => {

                /* istanbul ignore else */
                if (options.remember) {
                    debugs('remember me, skip reading config file');
                    return next(null, false);
                }/* istanbul ignore next */


                debugs(`Reading config file ${options.config}`);/* istanbul ignore next */
                spinner.text = 'Reading config file...';/* istanbul ignore next */
                spinner.start();/* istanbul ignore next */

                jsonfile.readFile(options.config, (err, obj) => {

                    if (err) {

                        if (err.code === 'EPERM') {
                            return next('Permission denied config file.');
                        }

                        if (err.code === 'ENOENT') {
                            debugs('Config file not found');
                            return next(null, false); //send next step to enter manually
                        }

                        return next(err);
                    }

                    spinner.stop();
                    debugs('Config file found');

                    //
                    // Config file may be corrupted or changed
                    //
                    if (!has(obj, 'user') || !has(obj, 'pass')) {
                        return next(null, false);  //send next step to enter manually
                    }

                    options.handle = obj.user;
                    options.password = CryptoJS.AES.decrypt(obj.pass, HASH_SECRET).toString(CryptoJS.enc.Utf8);

                    debugs('creadentials found!');
                    debugs(obj.pass);
                    debugs(`decrypt pass: ${options.password}`);

                    spinner.text = `Saved handle found '${obj.user}'`;
                    spinner.succeed();

                    return next(null, true);
                });
            },
            (skip, next) => {

                //
                // Already credentials found in config file from previous step
                // Any better approch to skip async step?
                //
                if (skip) {
                    return next(null, options);
                }

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

                spinner.stop();

                //
                // Ask for handle and password
                //
                inquirer.prompt(credentials).then((answers) => {


                    options.handle = answers.handle;
                    options.password = answers.password;

                    return next(null, options);
                });
            }
        ], callback);
    }


    /**
     * Load a url, search for from and scrape the csrf token
     * @param {Object} options
     * @param callback
     */
    getCSRFToken(options, callback) {

        let headers = commonHeaders();

        let opts = {
            headers: headers,
            uri: options.form,
            timeout: TIME_OUT,
            jar: cookieJar
        };

        spinner.text = 'Loading token...';
        spinner.start();

        debugs(`Loading csrf token from ${options.form}...`);

        request.get(opts, (err, httpResponse, body) => {

            if (err) {
                return callback(err);
            }

            let $ = cheerio.load(body, {decodeEntities: false});
            let csrf_token = $('form input[name="csrf_token"]').attr('value');

            if (csrf_token === null || csrf_token === undefined) {
                debugs($.html());
                return callback('token not found');
            }

            debugs('Csrf token found!');

            // TO-DO?
            // Next form is resistration form.This idea works only for two form
            // and hey, in this module we do not need anymore form
            // but need to keep this idea and improve!
            //
            options.form = options.nextForm;
            spinner.succeed();

            return callback(null, csrf_token, options);
        });
    }


    /**
     * @param {String} csrf_token - login form token
     * @param {Object} options
     * @param callback
     */
    login(csrf_token, options, callback) {

        let URL = 'http://codeforces.com/enter';

        let headers = commonHeaders();
        headers['Origin'] = 'http://codeforces.com';
        headers['Referer'] = 'http://codeforces.com/enter';
        headers['Content-Type'] = 'application/x-www-form-urlencoded';


        //
        // Form input fields.Key should match with input fields name
        //
        let form = {
            csrf_token: csrf_token,
            action: 'enter',
            handle: options.handle,
            password: options.password
        };

        let opts = {
            headers: headers,
            form: form,
            url: URL,
            timeout: TIME_OUT,
            jar: cookieJar
        };

        spinner.text = 'Logging in...';
        spinner.start();
        debugs('Sending login request...');

        request.post(opts, (err, httpResponse, body) => {

            if (err) {
                return callback(err);
            }

            var $ = cheerio.load(body, {decodeEntities: false});
            var resHeaders = httpResponse.headers;


            if (!has(resHeaders, 'location') || resHeaders.location !== '/') {

                debugs($.html());

                let logError = $('form .for__password');
                if( logError.length ){
                    return callback($(logError).text());
                }

                return callback('Login failed.Please try again.[Issue?]');
            }


            //
            // Save credentials into config file.HASH the password first.
            //
            if (options.remember) {
                let hashs = {
                    user: options.handle,
                    pass: CryptoJS.AES.encrypt(options.password, HASH_SECRET).toString()
                };
                debugs('Saving credentials in config file...');
                jsonfile.writeFileSync(options.config, hashs); //sync?
            }
            else if (options.logout) { //delete handle and password
                debugs('Deleting credentials from config file...');
                jsonfile.writeFileSync(options.config, {});
            }

            debugs('Successfully logged in');
            spinner.succeed();

            return callback(null, options);
        });
    }


    /**
     * *************** TO-DO ***********************
     *          May be problemset??
     * **********************************************
     * Sumbit code codeforces.com
     * @param {String} csrf_token - submit form token
     * @param {Object} options
     * @param callback
     */
    submitSolution(csrf_token, options, callback) {

        let URL = `http://codeforces.com/${options.type}/${options.contestId}/submit?csrf_token=${csrf_token}`;

        let headers = commonHeaders();
        headers['Origin'] = 'http://codeforces.com';
        headers['Referer'] = `http://codeforces.com/${options.type}/${options.contestId}/submit`;
        headers['Content-Type'] = 'multipart/form-data; boundary=----WebKitFormBoundaryv9DeqLHW1rFHNpiY';

        //
        // Form input fields.Key should match with input fields name
        //
        let formData = {
            csrf_token: csrf_token,
            action: 'submitSolutionFormSubmitted',
            contestId: options.contestId,
            submittedProblemIndex: options.problemIndex,
            programTypeId: options.language,
            source: fs.createReadStream(options.codePath), // give `request` module to handle it
            tabSize: '4',
            sourceFile: ''
        };

        let opts = {
            headers: headers,
            formData: formData,
            url: URL,
            timeout: TIME_OUT,
            jar: cookieJar
        };

        spinner.text = 'Submitting solution...';
        spinner.start();
        debugs(`Submitting solution ${URL}...`);

        request.post(opts, (err, httpResponse, body) => {

            if (err) {
                return callback(err);
            }

            var $ = cheerio.load(body, {decodeEntities: false});
            var location = httpResponse.headers;
            var expectedLocation = `/${options.type}/${options.contestId}/my`;

            if (!has(location, 'location') || location['location'] !== expectedLocation) {

                //
                // Codeforces provided error
                //
                var for__source = $('.for__source');
                if (for__source.length) {
                    return callback($(for__source).text());
                }

                debugs('something wrong!.');
                debugs($.html());
                debugs(location);

                //something wrong!
                return callback('Error: Submission failed.Please check your options.');
            }

            debugs('Solution submitted!');

            spinner.succeed();
            spinner.text = chalk.bold.green(`Submitted at ${location.date}`);
            spinner.start();
            spinner.succeed();

            return callback(null, location.date);
        });
    }
}


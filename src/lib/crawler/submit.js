'use strict';

import _ from 'lodash';
import { waterfall } from 'async';
import request from 'request';
import debug from 'debug';
import cheerio from 'cheerio';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import ora from 'ora';
import { line } from 'cli-spinners';
import jsonfile from 'jsonfile';
import CryptoJS from 'crypto-js';
import inquirer from 'inquirer';
import languages from '../languages';
import { getCWD, checkPath, log, logr, getHomeDir, validateEmpty, commonHeaders } from '../helpers';
import submission from '../api/submission';


//
// HASH_SECRET Should not be here.
//
var HASH_SECRET = 'thisisverysecret';

var cookieJar = request.jar();
var cookieRequest = request.defaults({ jar: cookieJar });
var debugs = debug('CF:submit');
var spinner = ora({ spinner: line });
const TIME_OUT = 30000;


/**
 *
 * @param {Object} options - {  contestId, problemIndex, codeFile }
 *
 */
export default (options = {}) => {

    let isMissing = !_.has(options,'codeFile') || !_.has(options,'contestId') || !_.has(options,'problemIndex');
    if( isMissing ){
        throw new Error('codeFile, contestId and problemIndex required');
    }

    options.codePath = getCWD(options.codeFile);
    options.form = 'http://codeforces.com/enter';   //login url
    options.nextForm = 'http://codeforces.com/problemset/submit';

    log('');

    waterfall([
        (callback) => {
            checkPath(options.codePath, true, callback);
        },
        (callback) => {
            prepareInput(options, callback);
        },
        getCSRFToken,
        login,
        getCSRFToken,
        submitSolution
    ], (err,res) => {

        if(err){

            spinner.fail();

            if( typeof err === 'string' ){
                spinner.text = chalk.bold.red(err);
                spinner.start();
                spinner.fail();
                return;
            }

            logr(err);
            return;
        }

        if( options.watch ){

            let subOptions = {
                remember: false,
                count: options.totalRuns,
                watch: true,
                delay: options.delay,
                contest: true,
                contestId: options.contestId
            };

            return submission(subOptions);
        }

    });
};


/**
 * Check config file for credentials if previously saved
 * If not found, ask handle and password from user console input
 *
 * @param {Object} options - {  contestId, problemIndex, codeFile, codePath, form, nextForm  }
 * @param callback
 * @returns {*}
 */
function prepareInput(options, callback) {

    if( _.has(options,'language') ){
        let { typeId } = languages;
        let tid = options.language;

        if( !_.has(typeId, tid) ){
            return callback(`  Error: Invalid language id '${tid}', Please type 'cf lang' to see supported language list`);
        }
    }
    else {
        let lang = path
			.extname(options.codeFile)
			.split('.')
			.pop();
        let { extensions } = languages;

        if ( !_.has(extensions, lang) ) {
            return callback(`  Error: Invalid language extension .${lang}, Please type 'cf lang' to see supported language list`);
        }

        options.language = extensions[lang];
    }

    options.config = path.resolve(`${getHomeDir()}/.cfconfig`);

    waterfall([
        (next) => {

            if( options.remember ){
                debugs('remember me, skip reading config file');
                return next(null,false);
            }

            debugs(`Reading config file ${options.config}`);
            spinner.text = 'Reading config file...';
            spinner.start();

            jsonfile.readFile(options.config, (err, obj) => {

                if( err ){

                    if( err.code === 'EPERM' ){
                        return next('Permission denied config file.');
                    }

                    if( err.code === 'ENOENT' ){
                        debugs('Config file not found');
                        return next(null,false); //send next step to enter manually
                    }

                    return next(err);
                }

                spinner.stop();
                debugs('Config file found');

                //
                // Config file may be corrupted or changed
                //
                if( !_.has(obj,'user') || !_.has(obj,'pass') ){
                    return next(null,false);  //send next step to enter manually
                }

                options.handle = obj.user;
                options.password = CryptoJS.AES.decrypt(obj.pass, HASH_SECRET).toString(CryptoJS.enc.Utf8);

                debugs('creadentials found!');
                debugs(obj.pass);
                debugs(`decrypt pass: ${options.password}`);

                spinner.text = `Saved handle found '${obj.user}'`;
                spinner.succeed();

                return next(null,true);
            });
        },
        (skip,next) => {

            //
            // Already credentials found in config file from previous step
            // Any better approch to skip async step?
            //
            if( skip ){
                return next(null,options);
            }

             //
             // handle and password options
             //
            let credentials = [{
                name: 'handle',
                message: 'handle: ',
                validate: validateEmpty
            },{
                name: 'password',
                message: 'password: ',
                type: 'password',
                validate: validateEmpty
            }];

            spinner.stop();

             //
             // Ask for handle and password
             //
            inquirer.prompt(credentials).then( (answers) => {

                options.handle = answers.handle;
                options.password = answers.password;

                return next(null,options);
            });
        }
    ], callback);
}


/**
 * Load a url and search for from and scrape the csrf token
 * @param {Object} options
 * @param callback
 */
function getCSRFToken(options,callback) {

    let headers = commonHeaders();

    let opts = {
        headers: headers,
        uri: options.form,
        timeout: TIME_OUT
    };

    spinner.text = 'Loading token...';
    spinner.start();

    debugs(`Loading csrf token from ${options.form}...`);

    cookieRequest.get(opts, (err,httpResponse,body) => {

        if (err) {
            return callback(err);
        }

        let $ = cheerio.load(body, { decodeEntities: false } );
        let csrf_token = $('form input[name="csrf_token"]').attr('value');

        if( csrf_token === null || csrf_token === undefined ){
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

        return callback(null,csrf_token,options);
    });
}


/**
 * Login into Codeforces.com
 *
 * @param {String} csrf_token - login form token
 * @param {Object} options
 * @param callback
 */
function login(csrf_token, options, callback) {

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
        timeout: TIME_OUT
    };

    spinner.text = 'Logging in...';
    spinner.start();
    debugs('Sending login request...');

    cookieRequest.post(opts, (err,httpResponse,body) => {

        if (err) {
            return callback(err);
        }

        var $ = cheerio.load(body, { decodeEntities: false } );
        var resHeaders = httpResponse.headers;



        /************************************/
        /***********  TO-DO *****************/
        /*********** ************************/
        //
        //  May be some other reason exists, (i,e codeforces unavaiable). Need to update.
        //
        if( !_.has(resHeaders,'location') || resHeaders.location !== '/' ){
            debugs($.html());
            return callback('Login failed.Invalid handle or password.');
        }


        //
        // Save credentials into config file.HASH the password first.
        //
        if( options.remember ) {
            let hashs = {
                user: options.handle,
                pass: CryptoJS.AES.encrypt(options.password, HASH_SECRET).toString()
            };
            debugs('Saving credentials in config file...');
            jsonfile.writeFileSync(options.config, hashs); //sync?
        }
        else if( options.logout ){ //delete handle and password
            debugs('Deleting credentials from config file...');
            jsonfile.writeFileSync(options.config, {});
        }

        debugs('Successfully logged in');
        spinner.succeed();

        return callback(null,options);
    });
}


/**
 * *************** TO-DO ***********************
 *   GYM contest not working
 * **********************************************
 *
 *
 * Sumbit code codeforces.com
 * @param {String} csrf_token - submit form token
 * @param {Object} options
 * @param callback
 */
function submitSolution(csrf_token,options,callback) {

    let URL = `http://codeforces.com/contest/${options.contestId}/submit?csrf_token=${csrf_token}`;

    let headers = commonHeaders();
    headers['Origin'] = 'http://codeforces.com';
    headers['Referer'] = 'http://codeforces.com/problemset/submit';
    headers['Content-Type'] = 'multipart/form-data; boundary=----WebKitFormBoundaryv9DeqLHW1rFHNpiY';


    //
    // Form input fields.Key should match with input fields name
    //
    let formData = {
        csrf_token: options.csrf_token,
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
        timeout: TIME_OUT
    };

    spinner.text = 'Submitting solution...';
    spinner.start();
    debugs(`Submitting solution ${URL}...`);

    cookieRequest.post(opts, (err,httpResponse,body) => {

        if (err) {
            return callback(err);
        }

        var $ = cheerio.load(body, { decodeEntities: false } );
        var location = httpResponse.headers;


        if( !_.has(location,'location') || location['location'] !== `/contest/${options.contestId}/my` ){

            //
            // Codeforces provided error
            //
            var for__source = $('.for__source');
            if( for__source.length ){
                return callback($(for__source).text());
            }

            debugs('here.');
            debugs($.html());
            debugs(location);

           // log($.html());

            //something wrong!
            return callback('Error: Submission failed.Please check inputs.');
        }

        debugs('Solution submitted!');

        spinner.succeed();
        spinner.text = chalk.bold.green(`Submitted at ${location.date}`);
        spinner.start();
        spinner.succeed();

        return callback(null,location.date);
    });
}

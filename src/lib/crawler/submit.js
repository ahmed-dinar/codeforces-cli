import _ from 'lodash';
import { waterfall } from 'async';
import request from 'request';
import debug from 'debug';
import cheerio from 'cheerio';
import fs from 'fs';
import chalk from 'chalk';

var cookieJar = request.jar();
var cookieRequest = request.defaults({ jar: cookieJar });

var debugs = debug('CF:submit');


export default (options) => {

    let loginForm = "http://codeforces.com/enter";
    let submitForm = "http://codeforces.com/problemset/submit";

    waterfall([
        (callback) => {
            getCSRFToken(loginForm,callback);
        },
        (csrf_token,callback) => {
            login(options,csrf_token,callback);
        },
        (callback) => {
            getCSRFToken(submitForm,callback);
        },
        (csrf_token,callback) => {
            options.csrf_token = csrf_token;
            submitSolution(options,callback);
        }
    ],function (err,res) {

        if(err){
            console.log(chalk.bold.red(err));
            return process.exit(1);
        }

        process.exit(0);
    });
}


function getCSRFToken(URL,callback) {

   // let URL = "http://codeforces.com/enter";

    let headers = {
        "Host": "codeforces.com",
        "Upgrade-Insecure-cookieRequests": 1,
        "User-Agent": "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.8"
    };

    let opts = {
        headers: headers,
        method: 'GET',
        url: URL
    };

    debugs(`Loading csrf token from ${URL}...`);

    cookieRequest(opts, function(err,httpResponse,body){

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

        return callback(null,csrf_token);
    });
}


/**
 *
 * @param csrf_token
 * @param callback
 */
function login(options,csrf_token,callback) {

    let URL = "http://codeforces.com/enter";

    let headers = {
        "Host": "codeforces.com",
        "Origin": "http://codeforces.com",
        "Referer": "http://codeforces.com/enter",
        "Upgrade-Insecure-cookieRequests": 1,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.8"
    };

    let form = {
        csrf_token: csrf_token,
        action: 'enter',
        handle: options.handle,
        password: options.password
    };


    let opts = {
        headers: headers,
        method: 'POST',
        form: form,
        url: URL
    };

    debugs('Sending login request...');

    cookieRequest(opts, function(err,httpResponse,body){

        if (err) {
            return callback(err);
        }

        var $ = cheerio.load(body, { decodeEntities: false } );

        //console.log(httpResponse.headers);

        var resHeaders = httpResponse.headers;

        if( !_.has(resHeaders,'location') || resHeaders.location !== '/' ){
           // debugs($.html());
            return callback('Submission failed.Invalid handle or password.');
        }

        debugs('Successfully logged in');

        return callback();
    });
}


/**
 *
 * @param options
 * @param callback
 */
function submitSolution(options,callback) {

    let URL = `http://codeforces.com/problemset/submit?csrf_token=${options.csrf_token}`;

    let headers = {
        "Host": "codeforces.com",
        "Origin": "http://codeforces.com",
        "Referer": "http://codeforces.com/problemset/submit",
        "Upgrade-Insecure-cookieRequests": 1,
        "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundaryv9DeqLHW1rFHNpiY",
        "User-Agent": "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.8"
    };


    let srvcc = '#include <stdio.h>\n' +
    'int main(){\n' +
    'int k=0;\n' +
    '' + _.random() + '\n' +
    '' + _.random() + '\n' +
    '' + _.random() + '\n' +
    '' + _.random() + '\n' +
    '' + _.random() + '\n' +
    '' + _.random() + '\n' +
    '' + _.random() + '\n' +
    '' + _.random() + '\n' +
    '' + _.random() + '\n' +
    '' + _.random() + '\n' +
    '' + _.random() + '\n' +
    '' + _.random() + '\n' +
    '' + _.random() + '\n' +
    'return 0;' +
    '}';


    let formData = {
        csrf_token: options.csrf_token,
        action: 'submitSolutionFormSubmitted',
        contestId: options.contestId,
        submittedProblemIndex: options.problemIndex,
        programTypeId: options.language,
        source: fs.createReadStream(options.codePath),
        tabSize: '4',
        sourceFile: ''
    };

    let opts = {
        headers: headers,
        method: 'POST',
        formData: formData,
        url: URL
    };

    debugs('Submitting solution...');

    cookieRequest(opts, function(err,httpResponse,body){

        if (err) {
            return callback(err);
        }

        var $ = cheerio.load(body, { decodeEntities: false } );

        var location = httpResponse.headers;

        if( !_.has(location,'location') ){

            var for__source = $('.for__source');
            if( for__source.length ){
                return callback($(for__source).text());
            }

            debugs($.html());

            return callback('Error');
        }

        debugs('Solution submitted!');

        return callback(null,location.date);
    });
}


/**
 *
 * @param submitTime
 * @param callback
 */
function getStatus(submitTime,callback) {

    var URL = "http://codeforces.com/api/user.status?handle=justoj&from=1&count=2";

    var headers = {
        "Host": "codeforces.com",
        "Upgrade-Insecure-cookieRequests": 1,
        "User-Agent": "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.8"
    };

    var opts = {
        method: 'GET',
        url: URL,
        headers: headers
    };


    cookieRequest(opts, function(err,httpResponse,body){

        if (err) {
            //console.log("error");
            //console.log(httpResponse.code);
            return console.log(err);
        }

        var submissions = JSON.parse(body);


        console.log( submissions );
        console.log( submitTime );

        var d = _.split(submitTime, ' ', 6);
        var tdm = d[2] + '/' + d[1] + '/' + d[3] + ' ' + d[4] + ' ' + d[5];

        console.log( moment(tdm,'MMM/DD/YYYY kk:mm:ss zz').unix() );
        console.log( moment().unix() );

        return callback();
    });
}
#!/usr/bin/env node
'use strict';

var program = require('commander');
import path from 'path';
import has from 'has';
import forEach  from 'lodash/forEach';
import chalk from 'chalk';
import { version } from '../../package.json';
import * as Codeforces from '../..';
import { log, logr } from '../lib/helpers';

var DEFAULT_DELAY = 5000;
var DEFAULT_ASYNC_LIMIT = 10;


/**
 * Make array of comma separated input from console
 * @param val
 * @returns {Array|*}
 */
function list(val){
    return val.split(',');
}


program
    .version(version)
    .option('-r, --remember', 'save handle for future')
    .usage('cf [program] [options]');


program
    .command('runs')
    .option('-r, --remember', 'save handle for future')
    .option('-c, --count <total>', 'total submission status to display')
    .option('-w, --watch', 'watch submission status live')
    .option('--delay <delay>', 'refreshing delay of live submission status [in millisecond]')
    .option('--contest <contestId>', 'specific contest submissions')
    .description('user submission status')
    .action( (prg) => {

        let options = {
            remember: has(prg,'remember'),
            watch: has(prg,'watch'),
            contest: has(prg,'contest'),
            count: has(prg,'count')
                ? parseInt(prg.count)
                : 1,
            delay: has(prg,'delay')
                ? parseInt(prg.delay) : DEFAULT_DELAY,
            contestId: has(prg,'contest')
                ? prg.contest
                : 0
        };

        Codeforces.submission(options);
    });


program
    .command('submit <contest-id> <problem-no> <solution-file>')
    .option('--lang <language>', 'programming language id of the solution')
    .option('-r, --remember', 'save/update password for future login')
    .option('-l, --logout', 'delete saved password')
    .option('-w, --watch', 'watch submission status live')
    .option('-c, --count <total>', 'total live submission status to display [max 10]')
    .option('--delay <delay>', 'refreshing delay of live submission status [in millisecond]')
    .description('submit solution')
    .action( (cid,pnum,codeFile,prg) => {

        let remember = has(prg,'remember');
        let logout = has(prg,'logout');

        if( remember && logout ){
            log('');
            logr(`  Error: Please select either remember or logout`);
            return;
        }

        let total = has(prg,'count')
            ? parseInt(prg.count)
            : 1;

        let delay = has(prg,'delay')
            ? parseInt(prg.delay)
            : DEFAULT_DELAY;

        let options = {
            contestId: cid,
            problemIndex: pnum,
            codeFile: codeFile,
            remember: remember,
            logout: logout,
            totalRuns: total,
            delay: delay,
            watch: has(prg,'watch')
        };

        if( has(prg,'lang') ){
            options.language = prg.lang;
        }

        Codeforces.submit(options);
    });


program
    .command('stat <handle>')
    .description('user tags status')
    .action( (handle,prg) => {
         Codeforces.usertags({ handle: handle });
    });


program
    .command('rating')
    .option('-u, --user <handle>', 'user handle for rating')
    .option('--country <country-name>', 'country name for rating')
    .option('--no-chart', 'disable showing chart for user')
    .option('--org', 'show Organization for country rating')
    .description('User ratings')
    .action( (prg) => {

        if( has(prg,'user') ){
            let noChart = prg.parent.rawArgs.indexOf('--no-chart') !== -1;
            return Codeforces.userrating(prg.user,noChart);
        }

        if( has(prg,'country') ){
            return Codeforces.ratings({
                country: prg.country,
                org: has(prg,'org')
            });
        }

        program.outputHelp();
    });


program
    .command('tags')
    .description('All tags and their status')
    .action( () => {
        Codeforces.tags();
    });

program
    .command('lang')
    .description('All supported languages and typeId')
    .action( () => {
        Codeforces.cfdefault.langs();
    });

program
    .command('ext')
    .description('All supported extensions and language name')
    .action( () => {
        Codeforces.cfdefault.exts();
    });


program
    .command('country')
    .description('All supported country')
    .action( () => {
        Codeforces.cfdefault.countrs();
    });

program
    .command('contests')
    .option('--running', 'for running contests')
    .option('--future', 'for upcoming contests')
    .description('Contest lists')
    .action( (prg) => {

        console.log('Not available yet.');

        if( has(prg,'running') ){
            console.log('Also running');
        }else if( has(prg,'future') ){
            console.log('Also future');
        }

    });


program
    .command('info <handles>')
    .description('User info')
    .action( (handles) => {
        Codeforces.userinfo(handles);
    });


program
    .command('solutions <handle>')
    .option('-d, --directory <directory>','directory to save solutions')
    .option('-p, --problem','also download problem statement')
    .option('--limit <async-limit>','limit async task')
    .description('user solution download')
    .action( (handle,prg) => {

        let options = {
            handle: handle,
            withProblem: has(prg,'problem'),
            dir: has(prg,'directory')
                ? prg.directory
                : '.',
            limit: has(prg,'limit')
                ? parseInt(prg.limit)
                : DEFAULT_ASYNC_LIMIT
        };

        Codeforces.sourcecode(options);
    });


program
    .command('standings <contestId>')
    .description('contest standings')
    .option('--handles <handles>', 'handles for standings')
    .option('--country <country-name>', 'country name for standings')
    .option('-c, --count <total>', 'total standings to display')
    .option('--offset <offset>', 'standings offset')
    .option('--unofficial', 'unofficial standings')
    .action( (contestId,prg) => {

        if( has(prg,'country') ){
            return Codeforces.countrystandings({
                contestId: contestId,
                country: prg.country,
                count: has(prg,'count')
                    ? prg.count
                    : 50
            });
        }

        let options = {
            contestId: contestId,
            unofficial: has(prg,'unofficial'),
            count: has(prg,'count')
                ? parseInt(prg.count)
                : 200,
            from: has(prg,'offset')
                ? parseInt(prg.offset)
                : 1
        };

        if( has(prg,'handles') ){
            options.handles = prg.handles;
        }

        Codeforces.standings(options);
    });


program.parse(process.argv);



//
// Showing custom errors (NOT WORKING, need to modify)
// https://github.com/tj/programer.js/issues/57
//
if (!program.args.length) {
    program.parse([process.argv[0], process.argv[1], '-h']);
} else {

    //warn aboud invalid programs
    var validprograms = program.commands.map(function(cmd){
        return cmd.name;
    });

    var invalidprograms = program.args.filter(function(cmd){
        //if program executed it will be an object and not a string
        return (typeof cmd === 'string' && validprograms.indexOf(cmd) === -1);
    });
    if (invalidprograms.length) {
       // console.log('\n [ERROR] - Invalid program: "%s". See "--help" for a list of available programs.\n', invalidprograms.join(', '));
    }
}



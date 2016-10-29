#!/usr/bin/env node
'use strict';

var program = require('commander');

import figlet from 'figlet';
import has from 'has';
import { version } from '../../../package.json';
import * as CF from '../../..';
import { log, logr } from '../../lib/helpers';

var DEFAULT_DELAY = 5000;
var DEFAULT_ASYNC_LIMIT = 10;


program
    .version(version)
    .usage('[options] [command]');

program.on('--help', () => {
    log('  All options:');
    log('    -r, --remember                save/update handle');
    log('    -c, --count                   total items to fetch and show');
    log('    -w, --watch                   watch submission status live');
    log('    -p, --problem                 also download problem statement');
    log('    -u, --user <handle>           codeforces user handle');
    log('    -l, --language <language-id>  programming language id of the solution');
    log('    -d, --directory <directory>   directory to save solutions');
    log('    --logout                      delete saved password');
    log('    --gym                         gym problem submit');
    log('    --no-chart                    disable showing chart of user rating');
    log('    --org                         show Organization of users');
    log('    --unofficial                  unofficial standings');
    log('    --handles <handles>           comma separated codeforces handles');
    log('    --offset <offset>             offset of the items to fetch from');
    log('    --limit <download-limit>      maximum number of simultaneous downloads');
    log('    --country <country-name>      country name for rating');
    log('    --delay <delay>               refreshing delay of live submission status [in millisecond]');
    log('    --contest <contestId>         specific contest submissions');
});

program
    .command('runs')
    .option('-r, --remember', 'save/update handle')
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
                ? parseInt(prg.count,10)
                : 1,
            delay: has(prg,'delay')
                ? parseInt(prg.delay,10) : DEFAULT_DELAY,
            contestId: has(prg,'contest')
                ? prg.contest
                : 0
        };

        CF.submission(options);
    });


program
    .command('submit <contest-id> <problem-no> <solution-file>')
    .option('-l, --language <language-id>', 'programming language id of the solution')
    .option('-r, --remember', 'save/update password for future login')
    .option('--logout', 'delete saved password')
    .option('-w, --watch', 'watch submission status live')
    .option('-c, --count <total>', 'total live submission status to display [max 10]')
    .option('--delay <delay>', 'refreshing delay of live submission status [in millisecond]')
    .option('--gym', 'gym problem submit')
    .description('submit solution')
    .action( (cid,pnum,codeFile,prg) => {

        let remember = has(prg,'remember');
        let logout = has(prg,'logout');

        if( remember && logout ){
            log('');
            logr('  Error: Please select either remember or logout');
            return;
        }

        let total = has(prg,'count')
            ? parseInt(prg.count,10)
            : 1;

        let delay = has(prg,'delay')
            ? parseInt(prg.delay,10)
            : DEFAULT_DELAY;

        let options = {
            contestId: cid,
            problemIndex: pnum,
            codeFile: codeFile,
            remember: remember,
            logout: logout,
            totalRuns: total,
            delay: delay,
            watch: has(prg,'watch'),
            gym: has(prg,'gym')
        };

        if( has(prg,'language') ){
            options['language'] = prg.language;
        }

        new CF.Submit(options).submit();
    });


program
    .command('stat <handle>')
    .description('user tags status')
    .action( (handle) => {
        CF.usertags({ handle: handle });
    });


program
    .command('rating')
    .option('-u, --user <handle>', 'codeforces user handle')
    .option('--country <country-name>', 'country name for rating')
    .option('--no-chart', 'disable showing chart of user rating')
    .option('--org', 'show Organization of users')
    .description('user ratings')
    .action( (prg) => {

        if( has(prg,'user') ){
            let noChart = prg.parent.rawArgs.indexOf('--no-chart') !== -1;
            return new CF.Userrating(prg.user,noChart).getRating();
        }

        if( has(prg,'country') ){
            return new CF.Ratings({
                country: prg.country,
                org: has(prg,'org')
            }).show();
        }

        program.outputHelp();
    });


program
    .command('tags')
    .description('all tags distribution')
    .action( () => {
        CF.tags();
    });

program
    .command('lang')
    .description('all supported languages and typeId')
    .action( () => {
        CF.cfdefault.langs();
    });

program
    .command('ext')
    .description('all supported extensions and language name')
    .action( () => {
        CF.cfdefault.exts();
    });


program
    .command('country')
    .description('all supported country')
    .action( () => {
        CF.cfdefault.countrs();
    });

/*
program
    .command('contests')
    .option('--running', 'for running contests')
    .option('--future', 'for upcoming contests')
    .description('contest lists')
    .action( (prg) => {

        log('Not available yet.');

        if( has(prg,'running') ){
            log('Also running');
        }else if( has(prg,'future') ){
            log('Also future');
        }

    });*/


program
    .command('info <handles>')
    .description('user info')
    .action( (handles) => {
        CF.userinfo(handles);
    });


program
    .command('solutions <handle>')
    .option('-d, --directory <directory>','directory to save solutions')
    .option('-p, --problem','also download problem statement')
    .option('--limit <download-limit>','maximum number of simultaneous downloads')
    .description('user solution download')
    .action( (handle,prg) => {

        let options = {
            handle: handle,
            withProblem: has(prg,'problem'),
            dir: has(prg,'directory')
                ? prg.directory
                : '.',
            limit: has(prg,'limit')
                ? parseInt(prg.limit,10)
                : DEFAULT_ASYNC_LIMIT
        };

        new CF.Sourcecode(options).download();
    });


program
    .command('standings <contestId>')
    .description('contest standings')
    .option('--handles <handles>', 'comma separated codeforces handles')
    .option('--country <country-name>', 'country name for standings')
    .option('-c, --count <total>', 'total standings to display')
    .option('--offset <offset>', 'standings offset')
    .option('--unofficial', 'unofficial standings')
    .action( (contestId,prg) => {

        if( has(prg,'country') ){
            return new CF.Countrystandings({
                contestId: parseInt(contestId,10),
                country: prg.country,
                total: has(prg,'count')
                    ? prg.count
                    : 50
            }).show();
        }

        let options = {
            contestId: parseInt(contestId,10),
            unofficial: has(prg,'unofficial'),
            count: has(prg,'count')
                ? parseInt(prg.count,10)
                : 200,
            from: has(prg,'offset')
                ? parseInt(prg.offset,10)
                : 1
        };

        if( has(prg,'handles') ){
            options.handles = prg.handles;
        }

        CF.standings(options);
    });


program.parse(process.argv);

/*
if( !program.args.length && has(program,'help') ){
    figlet('CF CLI', function(err, data) {
        log('');
        log('');
        if(!err){
            log(data);
            log('');
        }
        program.outputHelp();
    });
}*/


//
// Showing custom errors (NOT WORKING, need to modify)
// https://github.com/tj/programer.js/issues/57
//
if (!program.args.length) {
    figlet('Codeforces CLI', (err, data) => {
        log('');
        log('');
        if(!err){
            log(data);
            log('');
        }
        program.outputHelp();
    });
} /*else {

    //warn aboud invalid programs
    var validprograms = program.commands.map(function(cmd){
        return cmd._name;
    });

    var invalidprograms = program.args.map(function(cmd){
        return cmd._name;
    });


    if (invalidprograms.length) {
        log('');
        log(`   [ERROR] - Invalid command: ${invalidprograms.join(', ')}. run "cf --help" for a list of available commands.`);
        log('');
    }
}
*/


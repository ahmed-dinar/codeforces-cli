#!/usr/bin/env node
'use strict';

var program = require('commander');
import path from 'path';
import { has } from 'lodash';
import chalk from 'chalk';
import { version } from '../../package.json';
import * as Codeforces from '../..';
import { log } from '../lib/helpers';

var DEFAULT_DELAY = 5000;


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
    .usage('cf [program] [options]');


program
    .command('runs')
    .option('-r, --remember', 'save handle for future')
    .option('-c, --count <total>', 'total submission status to display')
    .option('-w, --watch', 'watch submission status live')
    .option('--delay <delay>', 'refreshing delay of live submission status [in millisecond]')
    .description('user submission status')
    .action( (prg) => {
        let remember = has(prg,'remember');
        let total = has(prg,'count') ? parseInt(prg.count) : 1;
        let watch = has(prg,'watch');
        let delay = has(prg,'delay') ? parseInt(prg.delay) : DEFAULT_DELAY;
        Codeforces.submission(remember, total, watch, delay);
    });


program
    .command('submit <contest-id> <problem-no> <solution-file>')
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
            log( chalk.bold.red(`  Error: Please select either remember or logout`) );
            return;
        }

        let total = has(prg,'count') ? parseInt(prg.count) : 1;
        let delay = has(prg,'delay') ? parseInt(prg.delay) : DEFAULT_DELAY;

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
    .option('--no-chart', 'disable showing chart')
    .description('User ratings')
    .action( (prg) => {

        if( has(prg,'user') ){
            let noChart = prg.parent.rawArgs.indexOf('--no-chart') !== -1;
            return Codeforces.userrating(prg.user,noChart);
        }

        if( has(prg,'country') ){
            console.log(prg.country);
            return;
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
    .command('contests')
    .option('--running', 'for running contests')
    .option('--future', 'for upcoming contests')
    .description('Contest lists')
    .action( (prg) => {

        console.log('Wait for contest list');

        if( has(prg,'running') ){
            console.log('Also running');
        }else if( has(prg,'future') ){
            console.log('Also future');
        }

    });


program
    .command('info <handle>')
    .description('User info')
    .action( (handle) => {

        console.log(handle);
    });

program
    .command('solutions <handle>')
    .option('-d, --directory <directory>','directory to save solutions')
    .option('-p, --problem','also download problem statement')
    .description('User info')
    .action( (handle,prg) => {

        let options = {
            handle: handle,
            withProblem: has(prg,'problem'),
            dir: has(prg,'dir') ? prg.dir : '.'
        };

        Codeforces.sourcecode(options);
    });


program.parse(process.argv);



//
// Showing custom errors (NOT WORKING, need to modify)
// https://github.com/tj/programer.js/issues/57
//
if (!program.args.length) {
    program.parse([process.argv[0], process.argv[1], '-h']);
    process.exit(0);
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



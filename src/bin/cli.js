#!/usr/bin/env node
'use strict';

var program = require('commander');
import path from 'path';
import { has } from 'lodash';
import { version } from '../../package.json';
import  Cf from '../CF';

var CF = new Cf();


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
    .command('submit <contest-id> <problem-no> <code-file-path>')
    .description('submit solution')
    .action( (cid,pnum,codeFile) => {

        let options = {
            contestId: cid,
            problemIndex: pnum,
            codeFile: codeFile
        };

        CF.submitSolution(options);

    });



program
    .command('stat <handle>')
    .description('user tags status')
    .action( (handle,prg) => {
        CF.userTagStatus({ handle: handle });
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
            return CF.userRating(prg.user,noChart);
        }

        if( has(prg,'country') ){
            console.log(prg.country);
            return;
        }

        program.outputHelp();
        process.exit(1);
    });


program
    .command('tags')
    .description('All tags and their status')
    .action( () => {
        CF.getTags();
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

        process.exit(0);
    });


program
    .command('info <handle>')
    .description('User info')
    .action( (handle) => {

        console.log(handle);

        process.exit(0);
    });

program
    .command('solutions <handle>')
    .option('-d, --dir <directory>','directory to save data')
    .description('User info')
    .action( (handle,prg) => {

        console.log(handle);
        if( has(prg,'dir') ){
            console.log(prg.dir);
            console.log(path.resolve(prg.dir));

        }


        process.exit(0);
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



import fs from 'fs';
import debug from 'debug';
import path from 'path';
import chalk from 'chalk';

var debugs = debug('helpers:checkPath');


/**
 * console.error()
 * @param text
 */
export function logr(text) {
    if( typeof text === 'string' ){
        text = chalk.bold.red(text);
    }
    console.error(text);
}


/**
 * console.log()
 * @param text
 */
export function log(text) {
    console.log(text);
}


/**
 * Get system home dir  ( Windows C:/Users/{user}, Unix ~/  )
 * @returns {*}
 */
export function getHomeDir() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}


/**
 * Check a path if exists.Also check if it is file or directory
 * @param {String} directory - target directory
 * @param {boolean} isFile - if true then check if it is a file
 * @param callback
 */
export function checkPath(directory, isFile, callback) {

    if( typeof isFile === 'function' ){
        callback = isFile;
        isFile = false;
    }

    debugs(`checking directory ${directory}...`);

    fs.stat(directory, function(err, stats) {

        if(err){
            if( err.code === 'EPERM' ){
                return callback(`Permission denied.Please make sure you have permission for '${directory}'`);
            }
            else if( err.code === 'ENOENT' ){
                return callback(`No such file or directory '${directory}'`);
            }
            return callback(err);
        }

        if( isFile && !stats.isFile() ){
            return callback(`Not a file '${directory}'.`);
        }

        if( !isFile && !stats.isDirectory() ){
            return callback(`Not a directory '${directory}'.`);
        }

        return callback();
    });
}


/**
 * Get cwd and join a file name
 * @param fileName
 * @returns {string|*}
 */
export function getCWD(fileName) {
    return path.join(path.resolve(process.cwd()), fileName);
}


/**
 * Validator for console promt [inquirer]
 * @param inpt
 * @returns {boolean}
 */
export function validateEmpty(inpt) {
    return inpt.length > 0;
}
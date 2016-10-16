import fs from 'fs';
import debug from 'debug';

/**
 *
 * @param directory
 * @param isFile
 * @param callback
 */
export function checkPath(directory, isFile, callback) {

    let debugs = debug('helpers:checkPath');

    if( typeof isFile === 'function' ){
        callback = isFile;
        isFile = false;
    }

    debugs('checking directory/file...');

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
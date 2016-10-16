const gulp   = require('gulp');
const babel  = require('gulp-babel');

gulp.task('src', () => {
    return gulp.src(['src/**/*.js'])
        .pipe(babel({
            presets: ['es2015'],
            "plugins": [
                "add-module-exports"
            ]
        }))
        .pipe(gulp.dest('build'));
});

gulp.task('default', ['src'] , () => {
    gulp.watch('src/**/*', ['src']);
});
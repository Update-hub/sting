const gulp = require('gulp');
const fileExists = require('file-exists');
const pug = require('gulp-pug');
const favicons = require('gulp-favicons');
const sass = require('gulp-sass');
const imagemin = require('gulp-imagemin');
const cache = require('gulp-cached');
const watch = require('gulp-watch');
const data = require('gulp-data');
const template = require('gulp-template');
const plumber = require('gulp-plumber');
const webpack = require('webpack-stream');
const browserSync = require('browser-sync').create();
const cleanCSS = require('gulp-clean-css');
const getCSV = require('get-csv');
const rename = require('gulp-rename');
const pugLinter = require('gulp-pug-linter');
const notify = require('gulp-notify');
const sassGlob = require('gulp-sass-glob');
const siteData = require('./site.json');

gulp.task('pug', () => {
  gulp.src('./src/pug/pages/**/[^_]*.pug')
    .pipe(plumber())
    .pipe(pugLinter())
    .pipe(pugLinter.reporter((errors) => {
      if (errors.length) {
        notify.onError('Pug Lint Error');
      }
    }))
    .pipe(data((file) => ({site: siteData})))
    .pipe(pug({
      basedir: './src/pug',
    }))
    .pipe(gulp.dest('./public'));
});

gulp.task('sass', () => {
  gulp.src('./src/scss/style.scss')
    .pipe(plumber())
    .pipe(sassGlob())
    .pipe(sass())
    .pipe(cleanCSS({
      level: 2,
    }))
    .pipe(gulp.dest('./public'));
});

gulp.task('js', () => {
  return gulp.src('./src/js/entry.js')
    .pipe(webpack({
      module: {
        loaders: [{
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'babel-loader',
          query: {
            presets: ['es2015'],
          },
        }],
      },
      output: {
        filename: 'script.js',
      },
    }))
    .pipe(gulp.dest('public/'));
});

gulp.task('image-copy', () =>
  gulp.src('./src/images/**/*')
  .pipe(gulp.dest('public/imgs'))
);

gulp.task('image', () =>
  gulp.src('./src/images/**/*')
  .pipe(cache(imagemin({
    progressive: true,
    interlaced: true,
  })))
  .pipe(gulp.dest('public/imgs'))
);

gulp.task('create-blank-pages', () => {
  getCSV('./pages.csv')
    .then((rows) => {
      rows.forEach((page) => {
        page.path += page.path.match(/\/$/) ? '' : '/';
        page.path += 'index.pug';

        if (fileExists.sync('./src/pug/pages' + page.path)) {
          return true;
        }

        gulp.src('./src/pug/lib/_template.pug')
          .pipe(template({
            title: page.title,
          }))
          .pipe(rename(page.path))
          .pipe(gulp.dest('./src/pug/pages', {
            overwrite: false,
          }));
      });
    });
});

gulp.task('favicon', () => {
  gulp.src('./src/favicon*')
    .pipe(favicons(siteData))
    .pipe(gulp.dest('./public'));
});

gulp.task('watch', ['build'], () => {
  watch('./src/scss/**/*.scss', () => {
    gulp.start('sass');
  });
  watch('./src/pug/**/*.pug', () => {
    gulp.start('pug');
  });
  watch('./src/images/**/*', () => {
    gulp.start('image-copy');
  });
  watch('./src/js/**/*.js', () => {
    gulp.start('js');
  });
  watch('./public/**', () => {
    browserSync.reload();
  });
});

gulp.task('serve', ['watch'], () => {
  browserSync.init({
    open: true,
    ghostMode: false,
    server: {
      baseDir: './public',
    },
  });
});

gulp.task('build', ['pug', 'sass', 'js', 'image-copy']);
gulp.task('release', ['build', 'image', 'favicon']);
gulp.task('default', ['serve']);

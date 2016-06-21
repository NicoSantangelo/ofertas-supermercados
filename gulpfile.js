var gulp = require('gulp')
var addsrc = require('gulp-add-src')
var concat = require('gulp-concat')
var uglify = require('gulp-uglify')
var minifyCss  = require('gulp-minify-css')
var imagemin   = require('gulp-imagemin')
var sourcemaps = require('gulp-sourcemaps')
var del = require('del')

var paths = {
  copy: ['js/vendor/*.js', 'css/vendor/*.css'],
  js: ['js/*.js'],
  vendorjs: ['js/vendor/t.min.js', 'js/vendor/socialite.min.js'],
  css: 'css/*.css',
  vendorcss: 'css/vendor/*.css',
  images: 'img/*'
}

gulp.task('clean', function() {
  return del(['dist'])
})

gulp.task('copy', ['clean'], function() {
  return gulp.src(paths.copy, { "base" : "./" })
    .pipe(gulp.dest('dist'))
})

gulp.task('scripts', ['clean'], function() {
  return gulp.src(paths.js)
      .pipe(sourcemaps.init())
        .pipe(uglify().on('error', function(e) {
            console.log('[UglifyError]', e)
         }))
        .pipe(addsrc.prepend(paths.vendorjs))
        .pipe(concat('all.min.js'))
      .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist/js'))
})

gulp.task('styles', ['clean'], function() {
  gulp.src(paths.css)
      .pipe(minifyCss({ keepSpecialComments: 0 }))
      .pipe(addsrc.prepend(paths.vendorcss))
      .pipe(concat('all.min.css'))
    .pipe(gulp.dest('dist/css'))
})

gulp.task('images', ['clean'], function() {
  return gulp.src(paths.images)
    .pipe(imagemin({ optimizationLevel: 5 }))
    .pipe(gulp.dest('dist/img'))
})

gulp.task('watch', function() {
  gulp.watch(paths.js, ['scripts'])
  gulp.watch(paths.images, ['images'])
  gulp.watch(paths.css, ['styles'])
})

gulp.task('fonts', ['clean'], function() {
  return gulp.src('fonts/*')
    .pipe(gulp.dest('dist/fonts'))
})

gulp.task('build', ['scripts', 'images', 'styles', 'fonts', 'copy'])

gulp.task('default', ['watch', 'build'])

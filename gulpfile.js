var gulp = require("gulp"),
    plugins = require('gulp-load-plugins')(),
    source = require('vinyl-source-stream'),
    pngquant = require('imagemin-pngquant'),
    babelify = require("babelify"),
    browserify = require('browserify'),
    wiredep = require("wiredep").stream,
    browserSync = require("browser-sync").create(),
    del = require("del"),
    watchify = require('watchify'),
    runSequence = require("run-sequence"),
    buffer = require('vinyl-buffer'),
    opts = {
        appJs: './src/js/common.js',
        appFolder: './src/js/',
        jsOutfile: 'app.js',
        jsOutFolder: './src/js'
    },
    error = {
      message: "Error: <%= error.message %>",
      sound: false
    };

// BROWSERIFY

gulp.task('browserify', function(){ 
    var bundler = browserify(opts.appJs, watchify.args);
    bundler.transform(babelify).bundle()
    .on('error', plugins.notify.onError(error))
    .pipe(source(opts.jsOutfile))
    .pipe(plugins.plumber({errorHandler: plugins.notify.onError(error)}))
    .pipe(gulp.dest(opts.jsOutFolder));
});

// WIREDEP

gulp.task("wiredep", function(){
  gulp.src("src/*.jade")
  .pipe(plugins.plumber({errorHandler: plugins.notify.onError(error)}))
  .pipe(wiredep({
    ignorePath: /^(\.\.\/)*\.\./
  }))
  .pipe(gulp.dest("src"));
});

// BROWSERSYNC

gulp.task("browsersync", ["jade"], function() {
    browserSync.init({
        server: "src",
        notify: false,
        browser: "Chrome"
        });
});

// JADE

gulp.task("jade", function() {
  return gulp.src("src/*.jade")
    .pipe(plugins.plumber({errorHandler: plugins.notify.onError(error)}))
    .pipe(plugins.jade())
    .pipe(plugins.prettify({indent_size: 2}))
    .pipe(gulp.dest("src"))
    .pipe(browserSync.reload({stream: true}));
});

// SASS

gulp.task("sass", function () {
  gulp.src("src/sass/*.*")
    .pipe(plugins.plumber({errorHandler: plugins.notify.onError(error)}))
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.sass({
    includePaths: require("node-bourbon").includePaths
  }).on("error", plugins.sass.logError))
  .pipe(plugins.rename({suffix: ".min"}))
  .pipe(plugins.autoprefixer({
    browsers: ["last 15 versions"],
    cascade: false
  }))
  .pipe(plugins.sourcemaps.write())
  .pipe(gulp.dest("src/css"))
  .pipe(browserSync.reload({stream: true}));
});

// SPRITESMITH

gulp.task("spritesmith", function () {
  var spriteData = gulp.src("src/img/sprites/*.png")
  .pipe(plugins.plumber({errorHandler: plugins.notify.onError(error)}))
  .pipe(plugins.spritesmith({
    imgName: "spritesheet.png",
    imgPath: "../img/spritesheet.png",
    cssName: "../sass/vendor/sprites.css",
    algorithm: "top-down",
    padding: 2
  }));
  return spriteData.pipe(gulp.dest("src/img"));
});

// RENAME

gulp.task("rename", function(){
  gulp.src("src/sass/vendor/sprites.css")
  .pipe(plugins.plumber({errorHandler: plugins.notify.onError(error)}))
  .pipe(plugins.rename("sprites.scss"))
  .pipe(gulp.dest("src/sass/vendor"));
});
// WATCH
gulp.task("watch", function(){
  gulp.watch("src/**/*.jade", ["jade"]);
  gulp.watch("bower.json", ["wiredep"]);
  gulp.watch("src/sass/*.*", ["sass"]);
  gulp.watch(["src/js/*.*","!./src/js/app.js"], ["browserify"]).on("change", browserSync.reload);
  gulp.watch("src/img/sprites", ["sprite"]);
});

// USEREF

gulp.task("useref", function(){
  var assets = plugins.useref.assets();
  return gulp.src("src/*.html")
  .pipe(plugins.plumber({errorHandler: plugins.notify.onError(error)}))
  .pipe(assets)
  .pipe(plugins.if("*.js", plugins.uglify()))
  .pipe(plugins.if("*.css", plugins.minifyCss({compatibility: "ie8"})))
  .pipe(assets.restore())
  .pipe(plugins.useref())
  .pipe(gulp.dest("dist"));
});

// FONTS

gulp.task("fonts", function(){
  gulp.src("src/fonts/*")
  .pipe(plugins.plumber({errorHandler: plugins.notify.onError(error)}))
  .pipe(plugins.filter(["*.eot","*.svg","*.ttf","*.woff","*.woff2"]))
  .pipe(gulp.dest("dist/fonts"));
});

// IMAGEMIN

gulp.task("imagemin", function () {
    return gulp.src("src/img/**/*.*")
        .pipe(plugins.plumber({errorHandler: plugins.notify.onError(error)}))
        .pipe(plugins.imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        }))
        .pipe(gulp.dest("dist/img"));
});

// CLEAN

gulp.task("clean", function() {
del.sync(["dist"], function (err, paths) {
    console.log("Deleted files/folders:\n", paths.join("\n"));
  });
});

// CMQ

gulp.task("cmq", function () {
  gulp.src("src/css/*.css")
    .pipe(plugins.plumber({errorHandler: plugins.notify.onError(error)}))
    .pipe(plugins.combineMediaQueries({
      log: true
    }))
    .pipe(gulp.dest("dist/css"));
});

// COPY

gulp.task("copy", function(){
  gulp.src([
    "src/*.*",
    "!src/*.jade",
    "!src/index.html",
    "src/.htaccess"
]).pipe(gulp.dest("dist"));
});

// DEFAULT TASK

gulp.task("default", ["browsersync","watch"]);

// SPRITE RENAME

gulp.task("sprite", function(){
  runSequence("spritesmith", "rename", "sass");
});

// DISTRIBUTION

gulp.task("dist", function(){
  runSequence("clean", "useref", "imagemin", "fonts", "copy");
});
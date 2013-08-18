var appy = require('appy');
var async = require('async');
var uploadfs = require('uploadfs')();
var fs = require('fs');
var apos = require('apostrophe')();
var _ = require('underscore');
var extend = require('extend');
var app, db;

// Server-specific settings to be merged with options
// See local.example.js
var local = require('./data/local.js');

local.db = local.db || {};

var options = {

  auth: apos.appyAuth({
    loginPage: function(data) {
      return pages.decoratePageContent({ content: apos.partial('login', data), when: 'anon' });
    },
    adminPassword: 'password'
  }),

  beforeSignin: apos.appyBeforeSignin,

  sessionSecret: 'whatever',

  db: {
    // 127.0.0.1 connects much faster than localhost when offline on macs,
    // goes to the same place
    host: local.db.host || '127.0.0.1',
    port: local.db.port || 27017,
    name: local.db.name || 'apostrophe-blog-demo',
    user: local.db.user || null,
    password: local.db.password || null,
    collections: [
      // Handy way to get appy to create mongodb collection objects for you,
      // see the appy docs
    ]
  },

  // Supplies LESS middleware by default
  static: __dirname + '/public',

  // Where uploaded images go. This can be s3 or any other backend thanks to uploadfs.
  // Note you can't use the local backend with Heroku (Heroku does not have a persistent
  // writable filesystem)
  uploadfs: {
    backend: 'local',
    uploadsPath: __dirname + '/public/uploads',
    uploadsUrl: local.uploadsUrl,
    tempPath: __dirname + '/data/temp/uploadfs',
    // Register Apostrophe's standard image sizes. Notice you could
    // concatenate your own list of sizes if you had a need to
    imageSizes: apos.defaultImageSizes.concat([])
  },

  ready: function(appArg, dbArg)
  {
    app = appArg;
    db = dbArg;

    async.series([ createTemp, initUploadfs, initApos, setRoutes ], listen);
  }
};

// Allow Express locals to come from the options object above or
// from data/local.js

var locals = options.locals || {};
extend(true, locals, local.locals || {});

var demo = locals.demo;
appy.bootstrap(options);

function createTemp(callback) {
  if (!fs.existsSync(__dirname + '/data/temp')) {
    fs.mkdir(__dirname + '/data/temp', callback);
  } else {
    callback(null);
  }
}

function initUploadfs(callback) {
  uploadfs.init(options.uploadfs, callback);
}

// initialize apostrophe

function initApos(callback) {
  async.series([initAposMain, initAposPages, initAposBlog, initAposPageTypesMenu, initAposAppAssets, apos.endAssets], callback);

  function initAposMain(callback) {
    return apos.init({
      db: db,
      app: app,
      uploadfs: uploadfs,
      locals: local.locals,
      // Allows us to extend shared layouts
      partialPaths: [ __dirname + '/views/global' ],
      minify: local.minify
    }, callback);
  }

  function initAposPages(callback) {
    var pageTypes = [
      { name: 'staticPage', label: 'Static Page' },
      { name: 'home', label: 'Home Page' }
    ];
    pages = require('apostrophe-pages')({ apos: apos, app: app, types: pageTypes }, callback);
  }

  // haven't subclassed the blog yet- trying to make it work Vanilla first.
  function initAposBlog(callback) {
    blog = require('apostrophe-blog')({ apos: apos, pages: pages, app: app }, callback);
  }

  function initAposPageTypesMenu(callback) {
    var pageTypesMenu = [
      { name: 'blog', label: 'Blog' },
      { name: 'home', label: 'Home Page' },
      { name: 'staticPage', label: 'Static Page' }
    ];
    pages.setMenu(pageTypesMenu);
    return callback(null);
  }

  function initAposAppAssets(callback) {
    pushAsset('stylesheet', 'site', { when: 'always' });
    pushAsset('script', 'site', { when: 'always' });
    return callback();
    function pushAsset(type, name, options) {
      options.fs = __dirname;
      options.web = '';
      return apos.pushAsset(type, name, options);
    }
  }

}

function setRoutes(callback) {
  var load = [
    'global',
    blog.loader,
    pages.searchLoader
  ];

  app.get('*', pages.serve({
    templatePath: __dirname + '/views/pages',
    tabOptions: { depth: 2 },
    load: load
  }));

  return callback(null);
}

function listen(err) {
  if (err) {
    throw err;
  }
  // Command line tasks
  if (apos.startTask([])) {
    // Chill and let the task run until it's done, don't try to listen or exit
    return;
  }
  appy.listen();
}
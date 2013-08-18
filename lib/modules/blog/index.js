var blog = require('apostrophe-blog');

module.exports = myBlog;

function myBlog(options, callback) {
  return new myBlog.MyBlog(options, callback);
}

myBlog.MyBlog = function(options, callback) {
  var self = this;

  options.modules = (options.modules || []).concat([ { dir: __dirname, name: 'myBlog' } ]);
  return blog.Blog.call(this, options, callback);
};
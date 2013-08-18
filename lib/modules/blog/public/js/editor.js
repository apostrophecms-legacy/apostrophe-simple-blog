function MyBlog(options) {
  var self = this;
  AposBlog.call(self, options);
}

MyBlog.addWidgetType = function(options) {
  AposBlog.addWidgetType(options);
};
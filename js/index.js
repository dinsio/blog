// 为了方便调试操作，将常用对象放在jQuery包外
var conn;
var configs;
var blogs;
var viewData;
var VM;

// 文档加载完成后执行
$(document)
  .ready(function () {
    //
    // 建立wilddog链接
    conn = new Wilddog("https://dinsio-blog.wilddogio.com/");
    console.log(conn);

    // 页面vm
    viewData = {
      // 全局数据
      "configs": {
        "blogName": "",
        "blogIntent": "",
        "blogAvatar": "",
        "blogUrl": ""
      },
      "statistics": {
        "blogs": 0,
        "comments": 0,
        "tags": 0,
        "pageViews": 0
      },
      "user": {
        "author": "",
        "bloggerUID": 0,
        "isBlogger": false,
        "isSiteAdmin": false,
        "blogName": "",
        "blogIntent": "",
        "blogAvatar": "",
        "blogUrl": "",
        "email": "",
        "uptoken": "",
        "blogs": 0,
        "comments": 0
      },
      // 博客列表
      "blogs": []
    };

    // 是否博主身份
    // 自动登录函数
    function autoLogin(){
      if (conn.getAuth()) {
        console.log("auth already exists, msg:",conn.getAuth());
        // 如果已经是博主登录状态则记录
        if (conn.getAuth().provider == "password"){
          viewData.user.isBlogger = true;
          viewData.user.bloggerUID = conn.getAuth().uid.split(":")[1];
          console.log("current blogger uid:", viewData.user.bloggerUID);
        }
      }
      else
      {
        // 无登录信息则以匿名登录
        console.log("start auth in anonymous mode!");
        conn.authAnonymously(
          function(err,data){
            if(err == null){
              console.log("auth success! msg:",data);
            } else {
              console.log("auth failed, msg:",err);
            }
          }
        );
      }
    };
    // 自动登录
    autoLogin();


    // 查询站点数据
    configs = conn.child("configs");
    configs.once("value",function(snap){
      console.log('get configs:', snap.val());
      viewData.configs.blogName = snap.child("siteName").val();
      viewData.configs.blogIntent = snap.child("siteIntent").val();
      viewData.configs.blogAvatar = snap.child("siteAvatar").val();
      viewData.configs.blogUrl = snap.child("siteUrl").val();
    });

    // 站点统计数据
    statistics = conn.child("statistics");
    statistics.once("value",function(snap){
      //console.log('get statistics:', snap.val());
      viewData.statistics.blogs = snap.child("siteBlogs").val();
      viewData.statistics.comments = snap.child("siteComments").val();
      viewData.statistics.tags = snap.child("siteTags").val();
      viewData.statistics.pageViews = snap.child("sitePageViews").val();
    });

    // 查询当前用户信息
    user = conn.child("users/" + viewData.user.bloggerUID);
    user.once("value",function(snap){
      //console.log('get user:', snap.val());
      viewData.user.author = snap.child("name").val();
      viewData.user.blogName = snap.child("blogName").val();
      viewData.user.blogIntent= snap.child("blogIntent").val();
      viewData.user.blogAvatar = snap.child("blogAvatar").val();
      viewData.user.blogUrl = snap.child("blogUrl").val();
      viewData.user.email = snap.child("email").val();
      viewData.user.uptoken = snap.child("uptoken").val();
      viewData.user.blogs = snap.child("blogs").val();
      viewData.user.comments = snap.child("comments").val();
    });

    // 查询全部博文列表
    blogs = conn.child("index");
    blogs.orderByKey().limitToFirst(10).once("value",function(snapshot){
      viewData.blogs = [];
      var blog;
      snapshot.forEach(function(snap){
        blog = conn.child("blogs/" + snap.val() + "/" + snap.key());
        blog.once("value",function(s){
          var postDay = s.child("postDay").val();
          var postMonth = s.child("postMonth").val();
          if (postDay < 10) postDay = "0" + postDay;
          if (postMonth < 10) postMonth = "0" + postMonth;
          viewData.blogs.push({
            "id": s.key(),
            "author": s.child("author").val(),
            "comments": s.child("comments").val(),
            "content": s.child("content").val(),
            "postDay": postDay,
            "postMonth": postMonth,
            "postTime": s.child("postTime").val(),
            "postYear": s.child("postYear").val(),
            "status": s.child("status").val(),
            "tags": s.child("tags").val(),
            "timestamp": s.child("timestamp").val(),
            "title": s.child("title").val(),
            "traffic": s.child("traffic").val()
          });
        });
      });
    });

    // 创建页面VM
    VM = new Vue({
      el: '#indexContainer',
      data: viewData
    });
    

  })
;



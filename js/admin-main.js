$(document)
  .ready(function () {
    //
    // 建立wilddog链接
    var conn = new Wilddog("https://dinsio-blog.wilddogio.com/");
    console.log(conn);

    // 是否博主身份
    var isBlogger = false;
    var bloggerUID = 0;
    // 自动登录函数
    function autoLogin(){
      if (conn.getAuth()) {
        console.log("auth already exists, msg:",conn.getAuth());
        // 如果已经是博主登录状态则记录
        if (conn.getAuth().provider == "password"){
          isBlogger = true;
          bloggerUID = conn.getAuth().uid.split(":")[1];
          console.log("current blogger uid:", bloggerUID);
        }
        else gotoLogin();
      }
      else gotoLogin();
    };
    // 自动登录
    autoLogin();

    // 初始化tab控件
    $('.tab-head .item').tab();

    // 页面vm
    var indexData = {
      // 全局数据
      "blogName": "",
      "blogIntent": "",
      "blogAvatar": "",
      "blogUrl": "",
      // 博客列表
      "blogs": []
    };

    // 查询站点数据
    var configs = conn.child("configs");
    configs.once("value",function(snap){
      console.log('get configs:', snap.val());
      indexData.blogName = snap.child("siteName").val();
      indexData.blogIntent = snap.child("siteIntent").val();
      indexData.blogAvatar = snap.child("siteAvatar").val();
      indexData.blogUrl = snap.child("siteUrl").val();
    });

    // 查询全部博文列表
    var blogs = conn.child("blogs/all");
    var blog;
    blogs.limitToLast(10).once("value",function(snapshot){
      indexData.blogs = [];
      snapshot.forEach(function(snap){
        blog = conn.child("blogs/" + snap.val() + "/" + snap.key());
        blog.once("value",function(s){
          var postDay = s.child("postDay").val();
          var postMonth = s.child("postMonth").val();
          if (postDay < 10) postDay = "0" + postDay;
          if (postMonth < 10) postMonth = "0" + postMonth;
          indexData.blogs.push({
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
    var indexVM = new Vue({
      el: '#indexContainer',
      data: indexData
    });
    

  })
;

// 跳转到登录页面
function gotoLogin(){
  window.location.href = "login.html";
}


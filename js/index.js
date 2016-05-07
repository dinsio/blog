// 为了方便调试操作，将常用对象放在jQuery包外
var conn;
var configs;
var blogs;
var indexData;
var indexVM;

// 文档加载完成后执行
$(document)
  .ready(function () {
    //
    // 建立wilddog链接
    conn = new Wilddog("https://dinsio-blog.wilddogio.com/");
    console.log(conn);

    // 页面vm
    indexData = {
      // 全局数据
      "blogName": "",
      "blogIntent": "",
      "blogAvatar": "",
      "blogUrl": "",
      // 博客列表
      "blogs": []
    };

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

    // 直接获取最终节点对象
    // function getFinalNodeValue(path){
    //   var result = null;
    //   var targetRef = conn.child(path);
    //   targetRef.once("value",function(snap){
    //     console.log(snap.val());
    //     result = snap.val();
    //   });
    //   var clock = setInterval("check()",10);
    //   function check(){
    //     if (result != null)
    //     {
    //       clearInterval(clock);
    //       return result;
    //     }
    //   };
    // }

    // 直接获取复杂对象
    // function getNodeComplexObject(path){
    //   var targetRef = conn.child(path);
    //   var obj = {};
    //   targetRef.once("value",function(snapshot){
    //     snapshot.forEach(function(snap){
    //       var temp;
    //       eval("temp = {'" + snap.key() + "':" + snap.val() + "};");
    //       obj = $.extend(obj,temp);
    //     });
    //     return obj;
    //   });
    // }

    // 获取数组对象
    // function getArrayList(path){
    //   var targetRef = conn.child(path);
    //   var list = [];
    //   targetRef.once("value",function(snapshot){
    //     snapshot.forEach(function(snap){
    //       list.push(snap.val());
    //     });
    //     return list;
    //   });
    // }


    // 查询站点数据
    configs = conn.child("configs");
    configs.once("value",function(snap){
      console.log('get configs:', snap.val());
      indexData.blogName = snap.child("siteName").val();
      indexData.blogIntent = snap.child("siteIntent").val();
      indexData.blogAvatar = snap.child("siteAvatar").val();
      indexData.blogUrl = snap.child("siteUrl").val();
    });

    // 查询全部博文列表
    blogs = conn.child("blogs/all");
    blogs.limitToLast(10).once("value",function(snapshot){
      indexData.blogs = [];
      var blog;
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
    indexVM = new Vue({
      el: '#indexContainer',
      data: indexData
    });
    

  })
;



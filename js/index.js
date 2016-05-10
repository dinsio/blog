// 为了方便调试操作，将常用对象放在jQuery包外
var conn;
var configs;
var blogs;
var viewData;
var VM;
var timer;
var pageSize = 2;
var pageCount = 1;
var currentPage = 1;

// 文档加载完成后执行
$(document)
  .ready(function () {
    //
    // 建立wilddog链接
    conn = new Wilddog("https://dinsio-blog.wilddogio.com/");
    //console.log(conn);

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
      "appPath": {
        "author": "",
        "page": ""
      },
      // 博客列表
      "blogs": [],
      // 本页条数
      "totalNumber": 0,
      "recordNumber": 0
    };

    // 获取hash并解析
    function getHash(){
      var hashstr = window.location.hash.replace("#","");
      if (hashstr == "") viewData.appPath = {"author": 0, "page": 1};
      else if(hashstr.indexOf("/")>0) {
        if (hashstr.split("/")[0]!="") viewData.appPath.author = parseInt(hashstr.split("/")[0]);
        else viewData.appPath.author = 0;
        if (hashstr.split("/")[1]!="") viewData.appPath.page = parseInt(hashstr.split("/")[1]);
        else viewData.appPath.page = 1;
      } else {
        viewData.appPath.author = parseInt(hashstr);
        viewData.appPath.page = 1;
      }
      currentPage = viewData.appPath.page;
    }
    getHash();


    // 是否博主身份
    // 自动登录函数
    function autoLogin(){
      if (conn.getAuth()) {
        //console.log("auth already exists, msg:",conn.getAuth());
        // 如果已经是博主登录状态则记录
        if (conn.getAuth().provider == "password"){
          viewData.user.isBlogger = true;
          viewData.user.bloggerUID = conn.getAuth().uid.split(":")[1];
          //console.log("current blogger uid:", viewData.user.bloggerUID);
        }
      }
      else
      {
        // 无登录信息则以匿名登录
        //console.log("start auth in anonymous mode!");
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


    // 加载页面数据
    function loadData(){
      // 清空blog列表
      viewData.blogs.length = 0;
      if (viewData.appPath.author == "0")
      {
        // 此时获取全局数据
        // 查询站点数据
        configs = conn.child("configs");
        configs.once("value",function(snap){
          //console.log('get configs:', snap.val());
          viewData.configs.blogName = snap.child("siteName").val();
          viewData.configs.blogIntent = snap.child("siteIntent").val();
          viewData.configs.blogAvatar = snap.child("siteAvatar").val();
          viewData.configs.blogUrl = snap.child("siteUrl").val();
        });
        // 站点统计数据
        statistics = conn.child("statistics");
        statistics.on("value",function(snap){
          //console.log('get statistics:', snap.val());
          viewData.statistics.blogs = snap.child("blogs").val();
          viewData.statistics.comments = snap.child("comments").val();
          viewData.statistics.tags = snap.child("tags").val();
          viewData.statistics.pageViews = snap.child("pageViews").val();
        });

        // 查询全部发表的博文列表
        blogs = conn.child("index/status/1");
        // 全部博文数量
        blogs.once("value",function(snapshot){
          viewData.totalNumber = snapshot.numChildren();
        });
        // 当前页博文所需取出的数据
        blogs.limitToLast(pageSize * currentPage).once("value",function(snapshot){
          // 取出需要的全部索引key（包含pageSize * (currentPage - 1)条垃圾数据）
          var allKeys = [], pageKeys = [];
          snapshot.forEach(function(snap){
            allKeys.push({"key": snap.key()});
          });
          //console.log(allKeys);
          // 对allKeys进行倒序排序
          allKeys = sortByKeyValue(allKeys,"key",true);
          //console.log(allKeys);
          // 取出最后的recordNumber条（即为本页的key）
          for (i = 0; i < allKeys.length; i++) {
            if (i >= (pageSize * (currentPage - 1))) {
              pageKeys.push(allKeys[i]);
            }
          }
          // 根据本页的所有key分别取数据
          var blog;
          // 获取本页记录条数
          viewData.recordNumber = snapshot.numChildren() - (pageSize * (currentPage - 1));
          for (i = 0; i < pageKeys.length; i++) {
            blog = conn.child("blogs/" + pageKeys[i].key);
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
                "lead": s.child("content").val().split('<p><img src="wangEditor/static/emotions/default/48.gif">')[0],
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
              // 判断数据是否获取完整
              if (viewData.blogs.length == viewData.recordNumber){
                // 重排序（异步获取的数据有可能不按请求顺序到达）
                viewData.blogs = sortByKeyValue(viewData.blogs,"timestamp",true);
                //console.log(viewData.blogs.length);

                // 必须等待异步数据加载完之后才能计算页码
                // 计算分页页码
                pageCount = Math.ceil(viewData.totalNumber / pageSize);

                // 分页页码导航条
                $('#jqPaginator').jqPaginator({
                    totalCounts: viewData.totalNumber,
                    pageSize: pageSize,
                    visiblePages: 5,
                    currentPage: currentPage,
                    first: '<a class="item" href="#' + viewData.appPath.author + '/1"><i class="step backward icon"><i><a>',
                    prev: '<a class="item" href="javascript:gotoPage(-1);"><i class="arrow left icon"><i><a>',
                    next: '<a class="item" href="javascript:gotoPage(1);"><i class="arrow right icon"><i></a>',
                    last: '<a class="item" href="#' + viewData.appPath.author + '/' + pageCount + '"><i class="step forward icon"><i></a>',
                    page: '<a class="item" href="#' + viewData.appPath.author + '/{{page}}">{{page}}</a>',
                    onPageChange: function (num, type) {
                        //$('#text').html('当前第' + num + '页');
                    }
                });

                setImgAlign();

              }
            });
          }
        });

      } else {

        // 单个作者数据
        // 先查询当前用户信息
        user = conn.child("users/" + viewData.appPath.author);
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
          // 设定站点数据为作者数据
          viewData.configs.blogName = viewData.user.blogName;
          viewData.configs.blogIntent = viewData.user.blogIntent;
          viewData.configs.blogAvatar = viewData.user.blogAvatar;
          viewData.configs.blogUrl = viewData.user.blogUrl;
        });
        // 站点统计数据
        statistics = conn.child("statistics");
        statistics.on("value",function(snap){
          //console.log('get statistics:', snap.val());
          viewData.statistics.blogs = viewData.user.blogs;
          viewData.statistics.comments = viewData.user.comments;
          viewData.statistics.tags = snap.child("tags").val();
          viewData.statistics.pageViews = snap.child("pageViews").val();
        });
        // 查询作者发表的全部博文
        blogs = conn.child("index/user/" + viewData.appPath.author);
        // 全部博文数量
        blogs.once("value",function(snapshot){
          viewData.totalNumber = snapshot.numChildren();
          //console.log(snapshot.numChildren());
        });
        // 当前页博文所需取出的数据
        blogs.limitToLast(pageSize * currentPage).once("value",function(snapshot){
          // 取出需要的全部索引key（包含pageSize * (currentPage - 1)条垃圾数据）
          var allKeys = [], pageKeys = [];
          snapshot.forEach(function(snap){
            allKeys.push({"key": snap.key()});
          });
          //console.log(allKeys);
          // 对allKeys进行倒序排序
          allKeys = sortByKeyValue(allKeys,"key",true);
          //console.log(allKeys);
          // 取出最后的recordNumber条（即为本页的key）
          for (i = 0; i < allKeys.length; i++) {
            if (i >= (pageSize * (currentPage - 1))) {
              pageKeys.push(allKeys[i]);
            }
          }
          //console.log(pageKeys);
          // 根据本页的所有key分别取数据
          var blog;
          // 获取本页记录条数
          viewData.recordNumber = snapshot.numChildren() - (pageSize * (currentPage - 1));
          for (i = 0; i < pageKeys.length; i++) {
            blog = conn.child("blogs/" + pageKeys[i].key);
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
                "lead": s.child("content").val().split('<p><img src="wangEditor/static/emotions/default/48.gif">')[0],
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
              // 判断数据是否获取完整
              if (viewData.blogs.length == viewData.recordNumber){
                // 重排序（异步获取的数据有可能不按请求顺序到达）
                viewData.blogs = sortByKeyValue(viewData.blogs,"timestamp",true);
                //console.log(viewData.blogs.length);

                // 必须等待异步数据加载完之后才能计算页码
                // 计算分页页码
                pageCount = Math.ceil(viewData.totalNumber / pageSize);

                // 分页页码导航条
                $('#jqPaginator').jqPaginator({
                    totalCounts: viewData.totalNumber,
                    pageSize: pageSize,
                    visiblePages: 5,
                    currentPage: currentPage,
                    first: '<a class="item" href="#' + viewData.appPath.author + '/1"><i class="step backward icon"><i><a>',
                    prev: '<a class="item" href="javascript:gotoPage(-1);"><i class="arrow left icon"><i><a>',
                    next: '<a class="item" href="javascript:gotoPage(1);"><i class="arrow right icon"><i></a>',
                    last: '<a class="item" href="#' + viewData.appPath.author + '/' + pageCount + '"><i class="step forward icon"><i></a>',
                    page: '<a class="item" href="#' + viewData.appPath.author + '/{{page}}">{{page}}</a>',
                    onPageChange: function (num, type) {
                        //$('#text').html('当前第' + num + '页');
                    }
                });

                setImgAlign();

              }
            });
          }

        });

      }
    }

    // 页面第一次加载获取数据
    //loadData();

    // 创建页面VM
    VM = new Vue({
      el: '#indexContainer',
      data: viewData,
      ready: function(){
        // 调整文章中图片居中
        $("#indexContainer").removeClass("hide");
        timer = 0;
        setImgAlign();
      }
    });


    function setImgAlign(){
      var limit = 50;
      setTimeout(function(){
        if ($('.content .text p img,.content .text p iframe,.content .text p video').length > 0)
        {
          $('.content .text p img,.content .text p iframe,.content .text p video').each(function(){
            //console.log($(this).attr("src"));
            if ($(this).attr("src").indexOf("wangEditor/static/emotions/") < 0)
              $(this).parent().css("textAlign","center");
          });
          timer = limit;
        }
        else if (timer < limit)
          setImgAlign();
        timer++;
        //console.log(timer);
      }, 100);
    }

    // 根据hash调整界面
    function applyPath(){
      //console.log(currentPage);
      loadData();
      setTimeout(function(){
        $('html,body').animate({scrollTop: '0px'}, 500);
      },500);
    }

    // 监控hash路径变化
    $(window).hashchange( function(){
      //console.log(window.location.hash);
      getHash();
      applyPath();
    })
    
    // 首次页面记载手动运行一次
    $(window).hashchange();

  })
;

// 翻页跳转
function gotoPage(i){
  var logicPage = parseInt(currentPage) + parseInt(i);
  if (logicPage < 1) logicPage = 1;
  if (logicPage > pageCount) logicPage = pageCount;
  currentPage = logicPage;
  window.location.hash = viewData.appPath.author + "/" + logicPage;
}

// 复杂对象数组的排序
function sortByKeyValue(list,key,desc) {
  // 先把key对应的值取出来
  var keyList = [];
  for (i = 0; i < list.length; i++) keyList.push(list[i][key]);
  // 重排序
  if (desc) keyList.sort(asc).reverse();
  else keyList.sort(asc);
  // 创建一个新数组并填充
  var result = [];
  for (i = 0; i < keyList.length; i++) {
    for (j = 0; j < list.length; j++) if (list[j][key] == keyList[i]) result.push(list[j]);
  }
  // 返回结果
  return result;
}
// 升序比较函数
function asc(value1, value2) {
  if (value1 < value2) {
    return -1;
  } else if (value1 > value2) {
    return 1;
  } else {
    return 0;
  }
}


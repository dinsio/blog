// 为了方便调试操作，将常用对象放在jQuery包外
var conn;
var configs;
var viewData;
var VM;
var timer,clock,ticks;
var pageSize = 10;
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
    var now = new Date();
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
      "auth": {
        "isBlogger": false,
        "uid": 0
      },
      "user": {
        "author": "",
        "bloggerUID": 0,
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
        "blogKey": "",
        "page": "",
        "commentkey": ""
      },
      "blog": {
        "id": "",
        "uid": "",
        "author": "",
        "comments": 0,
        "content": "",
        "lead": "",
        "postDay": 0,
        "postMonth": 0,
        "postTime": "",
        "postYear": 0,
        "status": 0,
        "tags": "",
        "timestamp": 0,
        "title": "",
        "traffic": 0
      },
      // 评论列表
      "comments": [],
      "comment": {
        "from": "",
        "content": "",
        "replyTo": "",
        "postAt": ""
      },
      "commentHelper": {
        "preContent": "",
        "inputContent": ""
      },
      "ui": {
        "modalTitle": "",
        "modalInfo": "",
        "modalButton": ""
      },
      // 本页条数
      "totalNumber": 0,
      "recordNumber": 0
    };

    // 获取hash并解析
    function getHash(){
      var hashstr = window.location.hash.replace("#","");
      if (hashstr == "") window.location.href = "index.html";
      var params = hashstr.split('/');
      if (params.length == 1) {
        if (params[0] == "") window.location.href = "index.html";
        else viewData.appPath.blogKey = hashstr.split('/')[0];
        viewData.appPath.page = "1";
      }
      if (params.length == 2) {
        if (params[0] == "") window.location.href = "index.html";
        else viewData.appPath.blogKey = hashstr.split('/')[0];
        if (params[1] == "") viewData.appPath.page = 1;
        else viewData.appPath.page = hashstr.split('/')[1];
      }
      if (params.length == 3) {
        if (params[0] == "") window.location.href = "index.html";
        else viewData.appPath.blogKey = hashstr.split('/')[0];
        if (params[1] == "") viewData.appPath.page = 1;
        else viewData.appPath.page = hashstr.split('/')[1];
        viewData.appPath.commentKey = hashstr.split('/')[2];
      }
      currentPage = parseInt(viewData.appPath.page);
    }
    getHash();


    // 是否博主身份
    // 自动登录函数
    function autoLogin(){
      if (conn.getAuth()) {
        //console.log("auth already exists, msg:",conn.getAuth());
        // 如果已经是博主登录状态则记录
        if (conn.getAuth().provider == "password"){
          viewData.auth.isBlogger = true;
          viewData.auth.uid = conn.getAuth().uid.split(":")[1];
          viewData.comment.from = viewData.auth.uid;
          //console.log("current blogger uid:", viewData.user.bloggerUID);
        } else {
          viewData.auth.isBlogger = false;
          viewData.auth.uid = conn.getAuth().uid.split(":")[1];
          viewData.comment.from = viewData.auth.uid;
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

    // 获取博客与作者信息
    function loadBlog(){
      // 清空评论列表
      viewData.comments = [];
      // 获取单个博客信息
      blog = conn.child("blogs/" + viewData.appPath.blogKey);
      blog.once("value",function(s){
        var postDay = s.child("postDay").val();
        var postMonth = s.child("postMonth").val();
        var content = "", lead = "";
        if (postDay < 10) postDay = "0" + postDay;
        if (postMonth < 10) postMonth = "0" + postMonth;
        content = s.child("content").val();
        var divider = '<p><img src="wangEditor/static/emotions/default/48.gif">';
        if (content.indexOf(divider) >= 0) lead = content.split(divider)[0];
        else lead = content;
        if (s.child("status").val() == 0) {
          content = '<div class="ui warning icon message" style="padding-top:20px;"><i class="inbox icon"></i><div class="content" style="padding-bottom:0;"><div class="header">此篇博文是草稿，内容暂时隐藏</div><p>如果您关于这个话题有何建议，请给作者留言提出，谢谢。</p></div></div>';
          lead = content;
        }        
        viewData.blog.id = s.key();
        viewData.blog.uid = s.child("uid").val();
        viewData.blog.author = s.child("author").val();
        viewData.blog.comments = s.child("comments").val();
        viewData.blog.content = content;
        viewData.blog.postDay = postDay;
        viewData.blog.postMonth = postMonth;
        viewData.blog.postTime = s.child("postTime").val();
        viewData.blog.postYear = s.child("postYear").val();
        viewData.blog.status = s.child("status").val();
        viewData.blog.tags = s.child("tags").val();
        viewData.blog.timestamp = s.child("timestamp").val();
        viewData.blog.title = s.child("title").val();
        viewData.blog.traffic = s.child("traffic").val();

        // 查询作者信息
        user = conn.child("users/" + viewData.blog.uid);
        user.once("value",function(ss){
          //console.log('get user:', snap.val());
          viewData.user.author = ss.child("name").val();
          viewData.user.bloggerUID = viewData.blog.uid;
          viewData.user.blogName = ss.child("blogName").val();
          viewData.user.blogIntent= ss.child("blogIntent").val();
          viewData.user.blogAvatar = ss.child("blogAvatar").val();
          viewData.user.blogUrl = ss.child("blogUrl").val();
          viewData.user.email = ss.child("email").val();
          viewData.user.uptoken = ss.child("uptoken").val();
          viewData.user.blogs = ss.child("blogs").val();
          viewData.user.comments = ss.child("comments").val();
          // 设定站点数据为作者数据
          viewData.configs.blogName = viewData.user.blogName;
          viewData.configs.blogIntent = viewData.user.blogIntent;
          viewData.configs.blogAvatar = viewData.user.blogAvatar;
          viewData.configs.blogUrl = viewData.user.blogUrl;
          // 设定站点统计为作者统计
          viewData.statistics.blogs = viewData.user.blogs;
          viewData.statistics.comments = viewData.user.comments;

          // 全站访问统计
          conn.child("statistics/pageViews").transaction(function (currentValue) {
            return (currentValue || 0) + 1;
          });
          // 作者访问统计
          if (viewData.appPath.author != 0){
            conn.child("users/" + viewData.user.bloggerUID + "/pageViews").transaction(function (currentValue) {
              return (currentValue || 0) + 1;
            });
          }
          // 文章访问统计
          if (viewData.appPath.author != 0){
            conn.child("blogs/" + viewData.blog.id + "/traffic").transaction(function (currentValue) {
              return (currentValue || 0) + 1;
            });
          }

        });

        // 获取评论列表
        comments = conn.child("blogs/" + viewData.appPath.blogKey + "/commentKeys");
        // 全部评论数量
        comments.once("value",function(sss){
          viewData.totalNumber = sss.numChildren();
          if (viewData.totalNumber == 0) $('#jqPaginator').parent().css("display","none");
          //console.log(snapshot.numChildren());

        });

        // 当前页评论所需取出的数据
        //console.log(pageSize * currentPage);
        comments.limitToLast(pageSize * currentPage).once("value",function(ssss){
          // 取出需要的全部索引key（包含pageSize * (currentPage - 1)条垃圾数据）
          var allKeys = [], pageKeys = [];
          ssss.forEach(function(snap){
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
          var comment;
          viewData.comments = [];
          // 获取本页记录条数
          viewData.recordNumber = ssss.numChildren() - (pageSize * (currentPage - 1));
          for (i = 0; i < pageKeys.length; i++) {
            //console.log(pageKeys[i].key);
            var commentKey = pageKeys[i].key;
            comment = conn.child("comments/" + commentKey);
            //console.log(commentKey);
            var avatar = "",fromstr = "";
            comment.once("value",function(sssss){
              // 区分是否博主
              if (sssss.child("from").val() == viewData.user.bloggerUID){
                avatar = "user";
                fromstr = "博主";
              } else {
                avatar = "spy";
                fromstr = "访客";
              }
              viewData.comments.push({
                "key": sssss.key(),
                "from": fromstr,
                "avatar": avatar,
                "postAt": sssss.child("postAt").val(),
                "content": sssss.child("content").val()
              });
              // 判断数据是否获取完整
              //console.log(viewData.recordNumber);
              if (viewData.comments.length == viewData.recordNumber){
                // 重排序（异步获取的数据有可能不按请求顺序到达）
                viewData.comments = sortByKeyValue(viewData.comments,"key",true);
                //console.log(viewData.blogs.length);

                // 必须等待异步数据加载完之后才能计算页码
                // 计算分页页码
                pageCount = Math.ceil(viewData.totalNumber / pageSize);
                //console.log(viewData.blogs.length);
                if (viewData.totalNumber == 0) $('#jqPaginator').parent().css("display","none");
                else {
                  // 分页页码导航条
                  $('#jqPaginator').jqPaginator({
                      totalCounts: viewData.totalNumber,
                      pageSize: pageSize,
                      visiblePages: 5,
                      currentPage: currentPage,
                      first: '<a class="item" href="#' + viewData.appPath.blogKey + '/1"><i class="step backward icon"><i><a>',
                      prev: '<a class="item" href="javascript:gotoPage(-1);"><i class="arrow left icon"><i><a>',
                      next: '<a class="item" href="javascript:gotoPage(1);"><i class="arrow right icon"><i></a>',
                      last: '<a class="item" href="#' + viewData.appPath.blogKey + '/' + pageCount + '"><i class="step forward icon"><i></a>',
                      page: '<a class="item" href="#' + viewData.appPath.blogKey + '/{{page}}">{{page}}</a>',
                      onPageChange: function (num, type) {
                          //$('#text').html('当前第' + num + '页');
                      }
                  });
                  if (viewData.totalNumber > 0) $('#jqPaginator').parent().css("display","");
                }
                // 评论获取完整
                ticks = 0;
                bindEvent();
              }

            });
          }

        });


      });

    }

    // 加载页面数据
    function loadData(){
      loadBlog();
      // 站点统计数据
      statistics = conn.child("statistics");
      statistics.on("value",function(snap){
        //console.log('get statistics:', snap.val());
        viewData.statistics.tags = snap.child("tags").val();
        viewData.statistics.pageViews = snap.child("pageViews").val();
      });
    }

    // 页面第一次加载获取数据
    //loadData();

    // 创建页面VM
    VM = new Vue({
      el: '#indexContainer',
      data: viewData,
      methods: {
        postComment: function(){
          // 提交留言
          if (viewData.comment.replyTo != "") viewData.comment.content = viewData.commentHelper.preContent + viewData.commentHelper.inputContent;
          else viewData.comment.content = viewData.commentHelper.inputContent;
          viewData.comment.postAt = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate() + " " + (now+'').split(' ')[4];
          if (viewData.comment.content != ""){
            //console.log(viewData.comment.content);
            // 数据合法，可以上传
            var commentItem = conn.child("comments").push(viewData.comment,function(err){
              if (err == null){
                // 留言成功
                viewData.commentHelper.inputContent = "";
                viewData.ui.modalTitle = "留言成功";
                viewData.ui.modalInfo = '<i class="thumbs up icon"></i> 感谢您的积极参与。';
                viewData.ui.modalButton = "不客气";
                $('.ui.small.modal').modal('show');
                applyPath();
              } else {
                // 留言失败
                viewData.ui.modalTitle = "留言失败";
                viewData.ui.modalInfo = '<i class="thumbs down icon"></i> 服务器错误，请联系网站管理员！提示信息如下：' + err;
                viewData.ui.modalButton = "知道了";
                $('.ui.small.modal').modal('show');
              }
            });
            // 获得新id
            var commentId = commentItem.key();
            // 写入博文索引
            conn.child("blogs/" + viewData.appPath.blogKey + "/commentKeys/" + commentId).set(Wilddog.ServerValue.TIMESTAMP);
            // 增加文章评论条数
            conn.child("blogs/" + viewData.appPath.blogKey + "/comments").transaction(function (currentValue) {
              return (currentValue || 0) + 1;
            });
            // 写入作者索引
            conn.child("users/" + viewData.blog.uid + "/commentKeys/" + commentId).set(Wilddog.ServerValue.TIMESTAMP);
            // 增加用户评论条数
            conn.child("users/" + viewData.blog.uid + "/comments").transaction(function (currentValue) {
              return (currentValue || 0) + 1;
            });
            // 增加全站评论条数
            conn.child("statistics/comments").transaction(function (currentValue) {
              return (currentValue || 0) + 1;
            });
          }
        },
        replyTo: function(e){
          console.log($(e).attr('data-key'));
        },
        hideModal: function(){
          $('.ui.small.modal').modal('hide'); 
        },
      },
      ready: function(){
        // 调整文章中图片居中
        $("#indexContainer").removeClass("hide");
        timer = 0;
        setImgAlign();
        clock = 0;
        fillTags();
      }
    });

    function bindEvent(){
      var ticksLimit = 50;
      console.log($('a[data-key]').length,viewData.recordNumber);
      setTimeout(function(){
        if ($('a[data-key]').length == viewData.recordNumber){
          $('a[data-key]').click(function(){
            //alert($(this).attr('data-key'));
            var replyAuthor = $($(this).parent().parent().find('a.author')[0]).text();
            var replyContent = $($(this).parent().parent().find('.text')[0]).html();
            viewData.comment.replyTo = $(this).attr('data-key');
            viewData.commentHelper.preContent = '<pre><code class="apache hljs">@' + replyAuthor + ' : ' + replyContent + '</code></pre>';
            $("#commentContent").attr('placeholder',' 回复@' + replyAuthor).focus();
          });
          ticks = ticksLimit;
        }
        else if (ticks < ticksLimit) {
          bindEvent();
        }
        ticks++;
        //console.log(ticks);
      }, 100);
    }

    function setImgAlign(){
      var timerLimit = 50;
      setTimeout(function(){
        if ($('.content .text p img,.content .text p iframe,.content .text p video').length > 0)
        {
          $('.content .text p img,.content .text p iframe,.content .text p video').each(function(){
            //console.log($(this).attr("src"));
            if ($(this).attr("src").indexOf("wangEditor/static/emotions/") < 0)
              $(this).parent().css("textAlign","center");
          });
          timer = timerLimit;
        }
        else if (timer < timerLimit){
          setImgAlign();
        }
        timer++;
        //console.log(timer);
      }, 100);
    }

    function fillTags(){
      var clockLimit = 50;
      setTimeout(function(){
        // 填充标签
        //console.log($('.text[data-tags]').length);
        if ($('.text[data-tags]').length == 1 && $($('.text[data-tags]')[0]).attr('data-tags')) {
          $('.text[data-tags]').each(function(){
            if ($(this).attr('data-tags') && $(this).attr('data-tags') != ""){
              var tagstr = $(this).attr('data-tags');
              //console.log(tagstr);
              if (tagstr.indexOf(",") >= 0){
                var tags = tagstr.split(",");
                for (i = 0; i < tags.length; i++){
                  if (tags[i]!="") $(this).append('<a class="ui tag label">' + tags[i] + '</a> ');
                }
              } else {
                $(this).append('<a class="ui tag label">' + tagstr + '</a> ');
              }
            }
          });
          clock = clockLimit;
        }
        else if (clock < clockLimit) {
          fillTags();
        }
        clock++;
        //console.log(clock);
      }, 100);

    }

    // 根据hash调整界面
    function applyPath(){
      //console.log(currentPage);
      loadData();
      // 滚动到指定位置
      if (window.location.hash.indexOf("/") > 0){
        setTimeout(function(){
          $('html,body').animate({scrollTop: ($('#commentsContainer').offset().top - 10) + 'px'}, 500);
        },500);
      }
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
  window.location.hash = viewData.appPath.blogKey + "/" + logicPage;
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
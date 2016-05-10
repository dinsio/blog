// 为了方便调试操作，将常用对象放在jQuery包外
var conn;
var configs;
var viewData;
var mainVM;
var uptoken;
var editor;

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
        "page": "",
        "tab": ""
      },
      "ui": {
        "navNumberClass": "six",
        "modalTitle": "",
        "modalInfo": "",
      },
      "blog": {
        "author": "",
        "title": "",
        "status": -1,
        "content": "",
        "tags": "",
        "postYear": 0,
        "postMonth": 0,
        "postDay": 0,
        "postTime": "",
        "traffic": 0,
        "comments": 0,
        "timestamp": 0
      }
    };

    // 获取hash并解析
    function getHash(){
      var hashstr = window.location.hash.replace("#","");
      if (hashstr == "") viewData.appPath = {"page": "mblogs", "tab":"newblog"};
      else if(hashstr.indexOf("/")>0) {
        viewData.appPath.page = hashstr.split("/")[0];
        viewData.appPath.tab = hashstr.split("/")[1];
      } else {
        viewData.appPath.page = hashstr;
        viewData.appPath.tab = getTabByPage(viewData.appPath.page);
      }
      //console.log(viewData.appPath.page,"/",viewData.appPath.tab);
    }
    // 根据page获取默认tab
    function getTabByPage(page){
      // 如果tab为空则读取默认
      var result = "";
      var activetabs = $('#' + page + ' .tab.active');
      if (activetabs.length > 0)
        result = $(activetabs[0]).attr('data-tab');
      else if ($('#' + page + ' .tab') > 0)
        result = $($('#' + page + ' .tab')[0]).attr('data-tab');
      else result = "";
      return result;
    }
    getHash();

    // 自动登录函数
    function autoLogin(){
      if (conn.getAuth()) {
        //console.log("auth already exists, msg:",conn.getAuth());
        // 如果已经是博主登录状态则记录
        if (conn.getAuth().provider == "password"){
          viewData.user.isBlogger = true;
          viewData.user.bloggerUID = conn.getAuth().uid.split(":")[1];
          //console.log("current blogger uid:", viewData.configs.bloggerUID);
        }
        else gotoLogin();
      }
      else gotoLogin();
    };
    // 自动登录
    autoLogin();

    // 查询站点数据
    configs = conn.child("configs");
    configs.once("value",function(snap){
      //console.log('get configs:', snap.val());
      viewData.configs.blogName = snap.child("siteName").val();
      viewData.configs.blogIntent = snap.child("siteIntent").val();
      viewData.configs.blogAvatar = snap.child("siteAvatar").val();
      viewData.configs.blogUrl = snap.child("siteUrl").val();
      if (snap.child("siteAdmin").val() == viewData.user.bloggerUID)
        viewData.user.isSiteAdmin = true;
      if (viewData.user.isSiteAdmin) viewData.ui.navNumberClass = "six";
      else viewData.ui.navNumberClass = "four";
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

    // 查询当前用户信息
    user = conn.child("users/" + viewData.user.bloggerUID);
    user.once("value",function(snap){
      //console.log('get user:', snap.val());
      viewData.user.author = snap.child("name").val();
      // 给当前blog作者赋值
      viewData.blog.author = viewData.user.author;
      viewData.user.blogName = snap.child("blogName").val();
      viewData.user.blogIntent= snap.child("blogIntent").val();
      viewData.user.blogAvatar = snap.child("blogAvatar").val();
      viewData.user.blogUrl = snap.child("blogUrl").val();
      viewData.user.email = snap.child("email").val();
      viewData.user.uptoken = snap.child("uptoken").val();
      // 给全局uptoken赋值，以方便上传组件读取
      uptoken = viewData.user.uptoken;
      viewData.user.blogs = snap.child("blogs").val();
      viewData.user.comments = snap.child("comments").val();
    });

    // 创建页面VM
    mainVM = new Vue({
      el: '#mainContainer',
      data: viewData,
      methods: {
        navHeadClick: function(page){
          var tab = getTabByPage(page);
          if (tab != "") window.location.hash = page + "/" + getTabByPage(page);
          else window.location.hash = page;
          //getHash();
          changeNav(page);
        },
        tabHeadClick: function(tab){
          window.location.hash = viewData.appPath.page + "/" + tab;
          //getHash();
          changeTab(tab);
        },
        publishBlog: function(){
          // 发表博客文章
          viewData.blog.status = 1;
          saveBlogData();
        },
        saveBlogToDraft: function(){
          viewData.blog.status = 0;
          saveBlogData();
        },
        hideModal : function(){
          $('.ui.small.modal').modal('hide'); 
        },
        logout: function(){
          conn.unauth();
          gotoLogin();
        }
      },
      ready: function() {
        applyPath();
        window.setTimeout(function(){
          // 生成编辑器
          editor = new wangEditor('editor-trigger');
          editor.config.customUpload = true;
          editor.config.customUploadInit = uploadInit;
          editor.config.menuFixed = false;    // 不吸顶
          editor.create();
          // 清空textarea的值
          viewData.blog.content = "";
          // 修正tips样式
          $('.wangEditor-container .menu-tip').each(function(){
            var textNumber = $(this).text().length;
            var tipWidth = textNumber * 14 + 8;
            $(this).css({
              'width': tipWidth + 'px',
              'margin-left': '-' + tipWidth/2 + 'px'
            });
          });
          // 配置 onchange 事件
          editor.onchange = function () {
              // 编辑区域内容变化时，实时更新model数据
              viewData.blog.content = this.$txt.html();
          };
          // 清空编辑区
          editor.clear();
        },1000);
        
      }
    });

    function getNow(){
      var now = new Date();
      viewData.blog.postYear = now.getFullYear();
      viewData.blog.postMonth = now.getMonth() + 1;
      viewData.blog.postDay = now.getDate();
      viewData.blog.postTime = (now+'').split(' ')[4];
      //console.log(viewData.blog);
    }

    function saveBlogData(){
      getNow();
      // 检查数据合法性
      var isValid = true;
      var iconHtml = '<i class="thumbs down icon"></i>';
      if (viewData.blog.title == "") 
      {
        viewData.ui.modalInfo = iconHtml + ' 博客标题当然不能为空啊！无头尸多难看！';
        isValid = false;
      }
      if (viewData.blog.content == "")
      {
        viewData.ui.modalInfo += '<br/>' + iconHtml + ' 博客内容肯定也不能为空啊！要不然发给鬼看？';
        isValid = false;
      }
      if (!isValid){
        if (viewData.blog.status == 1) viewData.ui.modalTitle = "发表博客出错";
        if (viewData.blog.status == 0) viewData.ui.modalTitle = "保存草稿出错";
        $('.ui.small.modal').modal('show');
      }
      else{
        // 数据合法，可以上传
        var blogItem = conn.child("blogs").push(viewData.blog);
        // 获得新id
        var blogId = blogItem.key();
        // 更新服务器时间
        conn.child("blogs/" + blogId + "/timestamp").set(Wilddog.ServerValue.TIMESTAMP);
        // 写入分页索引
        conn.child("index/status/" + viewData.blog.status + "/" + blogId).set({
          "author": viewData.user.bloggerUID,
          "timestamp": Wilddog.ServerValue.TIMESTAMP,
          "title": viewData.blog.title   //搜索标题时候可以用到
        });
        // 写入用户聚合索引
        conn.child("index/user/" + viewData.user.bloggerUID + "/" + blogId).set({
          "author": viewData.user.bloggerUID,
          "timestamp": Wilddog.ServerValue.TIMESTAMP,
          "title": viewData.blog.title   //搜索标题时候可以用到
        });
        // 写入归档聚合索引
        conn.child("achieve/" + viewData.blog.postYear + "/" + viewData.blog.postMonth + "/" + viewData.blog.postDay + "/" + blogId).set({
          "author": viewData.user.bloggerUID,
          "timestamp": Wilddog.ServerValue.TIMESTAMP,
          "title": viewData.blog.title   //搜索标题时候可以用到
        });
        // 写入标签聚合索引（可能是多个）
        if (viewData.blog.tags != ""){
          // 有分隔符
          if (viewData.blog.tags.indexOf(",") >= 0){
            var list = viewData.blog.tags.split(",");
            for (i = 0; i < list.length; i++){
              var str = list[i].replace(/(^\s+)|(\s+$)/g,"").replace(/\s/g,"");
              if(str != ""){
                // 给tag添加索引
                conn.child("tags/" + str + "/" + blogId).set({
                  "author": viewData.user.bloggerUID,
                  "timestamp": Wilddog.ServerValue.TIMESTAMP,
                  "title": viewData.blog.title   //搜索标题时候可以用到
                });
              }
            }
          }
          else {
            // 无分隔符，视作一个标签
            var str = viewData.blog.tags.replace(/(^\s+)|(\s+$)/g,"").replace(/\s/g,"");
            if (str != ""){
              // 给tag添加索引
              conn.child("tags/" + str + "/" + blogId).set({
                "author": viewData.user.bloggerUID,
                "timestamp": Wilddog.ServerValue.TIMESTAMP,
                "title": viewData.blog.title   //搜索标题时候可以用到
              });
            }
          }
        }
        // 更新作者汇总信息
        conn.child("users/" + viewData.user.bloggerUID + "/blogs").transaction(function (currentValue) {
          return (currentValue || 0) + 1;
        });
        // 更新站点汇总信息
        conn.child("statistics/blogs").transaction(function (currentValue) {
          return (currentValue || 0) + 1;
        });
        //更新站点统计tags
        conn.child("tags").once("value", function(snapshot) {
          conn.child("statistics/tags").transaction(function (currentValue) {
            return (snapshot.numChildren() || 0) + 1;
          });
        });
        // 写入成功
        if (viewData.blog.status == 1) {
          viewData.ui.modalTitle = "发表博客成功";
        }
        if (viewData.blog.status == 0) {
          viewData.ui.modalTitle = "保存草稿成功";
        }
        viewData.ui.modalInfo = iconHtml.replace("thumbs down","thumbs up") + ' 您可以继续发表博客或者预览效果。';
        viewData.blog.title = "";
        viewData.blog.tags = "";
        viewData.blog.content = "";
        editor.clear();
        $('.ui.small.modal').modal('show');
      }
    }

    // 切换页面
    function changeNav(page){
      //console.log("switch to page: ", page);
      $('.item[data-page]').removeClass("active");
      $('.item[data-page=' + page + ']').addClass("active");
      $('.segment[data-page]').addClass("hide");
      $('.segment[data-page=' + page + ']').removeClass("hide");
    }

    // 切换tab
    function changeTab(tab){
      //console.log("switch to tab: ", target);
      // 找到父容器
      var page = $('.tab[data-tab="' + tab + '"]').parent().attr('id');
      $('#' + page + ' .item[data-tab]').removeClass("active");
      $('#' + page + ' .item[data-tab=' + tab + ']').addClass("active");
      $('#' + page + ' .ui.tab[data-tab]').removeClass("active");
      $('#' + page + ' .ui.tab[data-tab=' + tab + ']').addClass("active");
    }

    // 根据hash调整界面
    function applyPath(){
      //console.log(viewData.appPath);
      if (viewData.appPath.page != "") changeNav(viewData.appPath.page);
      if (viewData.appPath.tab != "") changeTab(viewData.appPath.tab);
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

// 跳转到登录页面
function gotoLogin(){
  window.location.href = "login.html";
}

// 封装 console.log 函数
function printLog(title, info) {
    window.console && console.log(title, info);
}

// 初始化七牛上传
function uploadInit() {
    var editor = this;
    var btnId = editor.customUploadBtnId;
    var containerId = editor.customUploadContainerId;

    // 创建上传对象
    var uploader = Qiniu.uploader({
        runtimes: 'html5,flash,html4',
        browse_button: btnId,
        uptoken : uptoken,
        // unique_names: true,
            // 默认 false，key为文件名。若开启该选项，SDK会为每个文件自动生成key（文件名）
        // save_key: true,
            // 默认 false。若在服务端生成uptoken的上传策略中指定了 `sava_key`，则开启，SDK在前端将不对key进行任何处理
        domain: 'http://o6p45r7np.bkt.clouddn.com/', //bucket 域名，下载资源时用到，**必需**
        container: containerId,           //上传区域DOM ID，默认是browser_button的父元素，
        max_file_size: '10mb',           //最大文件体积限制
        flash_swf_url: '../js/plupload/Moxie.swf',  //引入flash,相对路径
        filters: {
          mime_types: [
            //只允许上传图片文件 （注意，extensions中，逗号后面不要加空格）
            { title: "图片文件", extensions: "jpg,gif,png,bmp" }
          ]
        },
        max_retries: 3,                   //上传失败最大重试次数
        dragdrop: true,                   //开启可拖曳上传
        drop_element: 'editor-container',        //拖曳上传区域元素的ID，拖曳文件或文件夹后可触发上传
        chunk_size: '4mb',                //分块上传时，每片的体积
        auto_start: true,                 //选择文件后自动上传，若关闭需要自己绑定事件触发上传
        init: {
            'FilesAdded': function(up, files) {
                plupload.each(files, function(file) {
                    // 文件添加进队列后,处理相关的事情
                    printLog('on FilesAdded');
                });
            },
            'BeforeUpload': function(up, file) {
                // 每个文件上传前,处理相关的事情
                printLog('on BeforeUpload');
            },
            'UploadProgress': function(up, file) {
                // 显示进度条
                editor.showUploadProgress(file.percent);
            },
            'FileUploaded': function(up, file, info) {
                // 每个文件上传成功后,处理相关的事情
                // 其中 info 是文件上传成功后，服务端返回的json，形式如
                // {
                //    "hash": "Fh8xVqod2MQ1mocfI4S4KpRL6D98",
                //    "key": "gogopher.jpg"
                //  }
                printLog(info);
                // 参考http://developer.qiniu.com/docs/v6/api/overview/up/response/simple-response.html
                
                var domain = up.getOption('domain');
                var res = $.parseJSON(info);
                var sourceLink = domain + res.key; //获取上传成功后的文件的Url

                printLog(sourceLink);

                // 插入图片到editor
                editor.command(null, 'insertHtml', '<img src="' + sourceLink + '" style="max-width:100%;"/>')
            },
            'Error': function(up, err, errTip) {
                //上传出错时,处理相关的事情
                printLog('on Error');
            },
            'UploadComplete': function() {
                //队列文件处理完毕后,处理相关的事情
                printLog('on UploadComplete');

                // 隐藏进度条
                editor.hideUploadProgress();
            }
            // Key 函数如果有需要自行配置，无特殊需要请注释
            //,
            // 'Key': function(up, file) {
            //     // 若想在前端对每个文件的key进行个性化处理，可以配置该函数
            //     // 该配置必须要在 unique_names: false , save_key: false 时才生效
            //     var key = "";
            //     // do something with key here
            //     return key
            // }
        }
    });
}


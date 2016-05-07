// 为了方便调试操作，将常用对象放在jQuery包外
var conn;
var configs;
var mainData;
var mainVM;

// 文档加载完成后执行
$(document)
  .ready(function () {
    //
    // 建立wilddog链接
    conn = new Wilddog("https://dinsio-blog.wilddogio.com/");
    //console.log(conn);

    // 页面vm
    mainData = {
      // 全局数据
      "configs": {
        "blogName": "",
        "blogIntent": "",
        "blogAvatar": "",
        "blogUrl": "",
        "blogs": 0,
        "comments": 0,
        "tags": 0,
        "pageViews": 0,
        "isSiteAdmin": false,
        "isBlogger": false,
        "bloggerUID": 0        
      },
      "path": {
        "page": "",
        "tab": ""
      },
      "ui": {
        "navNumberClass": "six"
      }
    };

    // 获取hash并解析
    function getHash(){
      var hashstr = window.location.hash.replace("#","");
      if (hashstr == "") mainData.path = {"page": "mblogs", "tab":"newblog"};
      else if(hashstr.indexOf("/")>0) {
        mainData.path.page = hashstr.split("/")[0];
        mainData.path.tab = hashstr.split("/")[1];
      } else {
        mainData.path.page = hashstr;
        mainData.path.tab = getTabByPage(mainData.path.page);
      }
      //console.log(mainData.path.page,"/",mainData.path.tab);
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
          mainData.configs.isBlogger = true;
          mainData.configs.bloggerUID = conn.getAuth().uid.split(":")[1];
          //console.log("current blogger uid:", mainData.configs.bloggerUID);
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
      mainData.configs.blogName = snap.child("siteName").val();
      mainData.configs.blogIntent = snap.child("siteIntent").val();
      mainData.configs.blogAvatar = snap.child("siteAvatar").val();
      mainData.configs.blogUrl = snap.child("siteUrl").val();
      mainData.configs.blogs = snap.child("siteBlogs").val();
      mainData.configs.comments = snap.child("siteComments").val();
      mainData.configs.tags = snap.child("siteTags").val();
      mainData.configs.pageViews = snap.child("sitePageViews").val();
      if (snap.child("siteAdmin").val() == mainData.configs.bloggerUID)
        mainData.configs.isSiteAdmin = true;
      if (mainData.configs.isSiteAdmin) mainData.ui.navNumberClass = "six";
      else mainData.ui.navNumberClass = "four";
    });


    // 创建页面VM
    mainVM = new Vue({
      el: '#mainContainer',
      data: mainData,
      methods: {
        navHeadClick: function(page){
          var tab = getTabByPage(page);
          if (tab != "") window.location.hash = page + "/" + getTabByPage(page);
          else window.location.hash = page;
          //getHash();
          changeNav(page);
        },
        tabHeadClick: function(tab){
          window.location.hash = mainData.path.page + "/" + tab;
          //getHash();
          changeTab(tab);
        },
        logout: function(){
          conn.unauth();
          gotoLogin();
        }
      },
      ready: function() {
        applyPath();
      }
    });

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
      //console.log(mainData.path);
      if (mainData.path.page != "") changeNav(mainData.path.page);
      if (mainData.path.tab != "") changeTab(mainData.path.tab);
    }

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

// 为了方便调试操作，将常用对象放在jQuery包外
var conn;


// 文档加载完成后执行
$(document)
  .ready(function () {
    //
    // 建立wilddog链接
    conn = new Wilddog("https://dinsio-blog.wilddogio.com/");
    // 自动登录函数
    function autoLogin(){
      if (conn.getAuth()) {
        console.log("auth already exists, msg:",conn.getAuth());
        // 如果已经是博主登录状态则直接跳转
        if (conn.getAuth().provider == "password")
          gotoAdmin();
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


    //
    // Form格式自检
    $('.ui.form')
      .form({
        fields: {
          nickname: {
            identifier: 'email',
            rules: [
              {
                type: 'empty',
                prompt: '邮箱不能为空！'
              },
              {
                type: 'email',
                prompt: '邮箱格式错误！'
              }
            ]
          },
          password: {
            identifier: 'password',
            rules: [
              {
                type: 'empty',
                prompt: '密码不能为空！'
              }
            ]
          }
        }
      })
    ;
    //
    // 表单提交
    $('#loginForm').on('submit',function(event){
      event.preventDefault();
      if ($('.ui.form').form('is valid'))
        checkLogin($('#email').val(),$('#password').val());
    });

    // 博主登录函数
    function checkLogin(email,password){
      conn.authWithPassword({email:email,password:password},
        function(err,data){
          if(err == null){
            console.log("auth success! msg:",data);
            //alert('登录验证成功！');
            gotoAdmin();
          } else {
            console.log("auth failed, msg:",err);
            console.log("current auth msg:",conn.getAuth());
            $('.ui.small.modal').modal('show');
            //alert('登录验证失败！邮箱和密码不匹配！');
          }
        }
      );
    };

    //
    // 弹窗隐藏
    $('#closeButton').on('click',function(){ $('.ui.small.modal').modal('hide'); });
  })
;


// 跳转到博主页面
function gotoAdmin(){
  window.location.href = "admin-main.html";
}

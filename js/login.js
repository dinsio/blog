$(document)
  .ready(function () {
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
    // 登录按钮点击
    $('#check-login').on('click',function(){
      if ($('.ui.form').form('is valid'))
      {
        login($('#email').val(),$('#password').val());
      }
    });
  })
;

//
// 建立wilddog链接
var conn = new Wilddog("https://dinsio-blog.wilddogio.com/");
// 匿名登录函数
function loginAnonymously(){
  conn.authAnonymously(
    function(err,data){
      if(err == null){
        console.log("auth success! msg:",data);
      } else {
        console.log("auth failed, msg:",err);
      }
    }
  );
};
// 自动匿名登录
loginAnonymously();
// 博主登录函数
function login(email,password){
  // 先注销匿名登录
  conn.unauth();
  conn.authWithPassword({email:email,password:password},
    function(err,data){
      if(err == null){
        console.log("auth success! msg:",data);
      } else {
        // 重新匿名登录
        loginAnonymously();
        console.log("auth failed, msg:",err);
      }
    }
  );
};
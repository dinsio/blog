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
        
      }
    });
  })
;
var index=0;
var f_sign = async (ctx, next) => {
    let names = '甲乙丙丁戊己庚辛壬癸';
    let name = names[index % 10];
    ctx.render('signin.html', {
        name: `路人${name}`
    });
}
var p_sign =  async (ctx, next) => {
    index ++;
    let name = ctx.request.body.name || '路人甲';
    let user = {
        id: index,
        name: name,
        image: index % 10
    };
    let value = Buffer.from(JSON.stringify(user)).toString('base64');
    console.log(`Set cookie value: ${value}`);
    ctx.cookies.set('name', value);
    ctx.response.redirect('/');
}
var g_out = async (ctx, next) => {
    ctx.cookies.set('name', '');
    ctx.response.redirect('/signin');
}
module.exports = {
    'GET /signin': f_sign,
    'POST /signin': p_sign,
    'GET /signout': g_out
};
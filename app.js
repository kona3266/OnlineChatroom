const Koa = require('koa');
const router = require('koa-router')();
const bodyParser = require('koa-bodyparser');
const Cookies = require('cookies');
const controller = require('./controller');
const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;
const app = new Koa();
app.use(
    async(ctx,next) =>{
        if(ctx.path =="/favicon.ico"){return};
        console.log(`Process ${ctx.request.method}${ctx.request.url}...`);
        await next();
    }
);
// parse user from cookie:
app.use(async (ctx, next) => {
    ctx.state.user = parseUser(ctx.cookies.get('name') || '');
    await next();
});
//添加koa-bodyparser
app.use(bodyParser());
//添加静态文件处理src请求
let staticFiles = require('./static-files');
app.use(staticFiles('/static/', __dirname + '/static'));
//添加渲染模板中间件
let templating = require('./templating');
const isProduction = process.env.NODE_ENV === 'production';
app.use(templating('views', {
    noCache: !isProduction,
    watch: !isProduction
}));
//写url-router
app.use(controller());
let server = app.listen(3000);
//创建WebSocketServer
let wss = new WebSocketServer(
    {
        server:server
    }
);
//用户身份识别函数
function parseUser(obj) {
    if (!obj) {
        return;
    }
    console.log('try parse: ' + obj);
    let s = '';
    if (typeof obj === 'string') {
        s = obj;
    } else if (obj.headers) {
        let cookies = new Cookies(obj, null);
        s = cookies.get('name');
    }
    if (s) {
        try {
            let user = JSON.parse(Buffer.from(s, 'base64').toString());
            console.log(`User: ${user.name}, ID: ${user.id}`);
            return user;
        } catch (e) {
            // ignore
        }
    }
}


//ws 响应connection 事件，识别用户
wss.on('connection', function (ws) {
    // ws.upgradeReq是一个request对象:
    let user = parseUser(ws.upgradeReq);
    if (!user) {
        // Cookie不存在或无效，直接关闭WebSocket:
        ws.close(4001, 'Invalid user');
    }
    // 识别成功，把user绑定到该WebSocket对象:
    ws.user = user;
    // 绑定WebSocketServer对象:
    ws.wss = wss;
     // 构造用户列表:
    let users = ws.wss.clients.map(function (client) {
        return client.user;
    });

    wss.broadcast(createMessage('list', user, users));
    //传播消息
    ws.on('message', onMessage);
    
});

wss.broadcast = function (data) {
    wss.clients.forEach(function (client) {
        client.send(data);
    });
};
function onMessage(message) {
    console.log(message);
    if (message && message.trim()) {
        let msg = createMessage('chat', this.user, message.trim());
        this.wss.broadcast(msg);
    }
}
var messageIndex = 0;

function createMessage(type, user, data) {
    messageIndex ++;
    return JSON.stringify({
        id: messageIndex,
        type: type,
        user: user,
        data: data
    });
}

console.log('app started at port 3000');
//静态资源服务器
var http = require('http');
var url = require('url');
var fs = require('fs');
var mime = require('./mime').types;
var path = require('path');
var config = require('./config');
var port = 8000;
var rootUrl = "C:/Users/lulu/Desktop/staticServer";
//创建http服务端 
//request代表一个客户端的请求 response代表一个服务器响应对象
//创建一个HTTP服务器
var server = http.createServer(function (request, response){
    //解析pathname. 比如url:'http://example.com:8080/one?a=index&t=article&m=default',
    //pathname:/one
    var pathname = url.parse(request.url).pathname;
    //console.log(pathname);
    if(pathname === '/'){
        //进入index页面
        pathname += config.Expires.index;
    }
    //防止非法访问.比如path是 /../server/server.js 会替换成 /server/server.js
    //输出规范格式的path字符串
    pathname = path.normalize(pathname.replace(/\.\./g, ""));
    var realPath = rootUrl + pathname;
    //测试某个路径下的文件是否存在
    fs.exists(realPath, function (exists){
        if (!exists) {
            //向请求的客户端发送响应头
            response.writeHead(404, {'Content-Type' : 'text/plain'});
            //向请求的客户端发送响应内容
            response.write('this request url ' + realPath + ' was not found on this server');
            response.end();
        }
        else{
            //根据请求的资源MIME类型返回相应的Content-Type
            var ext = path.extname(realPath);
            //路径文件扩展名
            //由于extname返回值包含”.”，所以通过slice方法来剔除掉”.”，
            //对于没有后缀名的文件，我们一律认为是unknown
            ext = ext ? ext.slice(1) : 'unknown';
            var contentType = mime[ext] || 'text/plain';
            response.setHeader('Content-Type', contentType); 
            //获取文件信息
            //异常参数err, 文件信息数组 stats
            fs.stat(realPath, function (err, stat){
                //最后更新时间
                var lastModified = stat.mtime.toUTCString();
                var ifModifiedSince = "If-Modified-Since".toLowerCase();
                response.setHeader('Last-Modified', lastModified);//设置最后修改时间
                if (ext.match(config.Expires.fileMatch)) {
                    var expires = new Date();
                    expires.setTime(expires.getTime() + config.Expires.maxAge * 1000);
                    //设置缓存时长，通常浏览器 Cache-Control高于Expires
                    response.setHeader('Expires', expires.toUTCString());
                    response.setHeader('Cache-Control', "max-age=" + config.Expires.maxAge);
                }
            //http头部有个数组里面有好多信息。。
            //如果请求的对象在该头部指定的时间之后修改了，才执行请求的动作（比如返回对象），
            //否则返回代码304，告诉浏览器该对象没有修改。
                if (request.headers[ifModifiedSince] && request.headers[ifModifiedSince] == lastModified) {
                    console.log("从浏览器cache里取");
                    response.writeHead(304, 'Not Modified');
                    response.end();
                }
                else{
                    //以异步的方式读取文件内容
                    fs.readFile(realPath, 'binary', function (err, file){
                        if (err) {
                            response.writeHead(500, "Internal Server Error" , {'Content-Type': 'text/plain'});
                            response.end(err);
                        }
                        else{
                            response.writeHead('200', 'Ok');
                            response.write(file, "binary");
                            response.end();                    
                        }
                    });
                }

            });
        }
    });
});
server.listen(port);
console.log("Server runing at port:" + port + ".");
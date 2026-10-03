# 部署指南

## 运行结构

仓库根目录是静态网站。浏览器加载index.html、styles.css、角色配置与聊天脚本，再向config/app.js中配置的HTTP地址请求模型回复。没有前端构建框架，也不需要把模型密钥写进网页。

聊天需要可用后台。只发布静态页面，会显示界面，但不会自行产生模型回复。仓库提供Supabase Edge Function参考实现，也可以对接满足下面协议的其他后台。

## 本地预览

在仓库根目录执行：

```bash
node scripts/validate.mjs
python3 -m http.server 8000
```

检查命令使用Node.js 24。浏览器打开`http://localhost:8000`，避免直接双击file://网页。运行静态服务器时保持终端开启。前端开发不需要npm安装依赖。

## 一个明确的接口配置入口

编辑`config/app.js`：

```javascript
window.LIAOTIAN_CONFIG = Object.freeze({
  chatApiUrl: 'https://your-project.supabase.co/functions/v1/role-chat-fast'
});
```

自己的部署填写自己的兼容接口。默认地址用于本站演示，可能受运营方配额、上游限流或维护影响，不应把它当成无限公共服务。正式地址应使用HTTPS。开发时允许localhost、127.0.0.1及IPv6回环的HTTP地址，HTTPS站点也可以使用同源相对路径。

空配置、不合法协议或带用户名密码的地址不会让网页崩溃，发送时会提示接口未配置。不要把API密钥或数据库管理密钥放在这个文件、角色文件或公开仓库中。

## Render静态发布

仓库包含render.yaml，可用Blueprint导入，也可创建Static Site，关联自己的仓库。

| 设置 | 值 |
| --- | --- |
| 服务类型 | Static Site |
| Node版本 | 24，仓库.node-version与Blueprint已指定 |
| 发布分支 | main或自己的发布分支 |
| Build Command | node scripts/validate.mjs |
| Publish Directory | ./ |
| Rewrite | /* 到 /index.html，已有文件优先正常返回 |

先确认角色图片、脚本与docs/index.html都能作为实际文件访问。接口配置改好并提交后再部署。关联仓库开启自动部署时，合并发布分支会自动产生新版本，无需重复触发部署。

PPT文件保存在docs/character-chat-guide.pptx。静态平台应按文件返回，不应把PPT路径重写成聊天首页。上线检查既要打开页面，也要检查脚本、头像、说明书和PPT的实际响应。

## Supabase参考后台

源码：`supabase/functions/role-chat-fast/index.ts`。该函数不依赖数据库表，使用Deno运行时，通过真实模型上游生成回复。当前演示实现有4条流式通道，首批有效内容竞速，取消其他请求。

在自己的Supabase项目部署同名函数，并确认网页跨域访问与请求认证方式一致。当前前端不发送登录令牌，本站现有函数允许匿名调用。若自己的后台要求认证，需要同时实现前端认证或自己的受保护网关，不能只改一个开关后期待匿名聊天继续工作。

使用Supabase CLI时，可参考下面的结构，project-ref替换为自己的项目标识：

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
# 仅适用于有意提供匿名演示接口的项目
supabase functions deploy role-chat-fast --no-verify-jwt
```

密钥型模型服务应把凭据存到后台环境变量，并在后台发请求时读取。仓库里的演示通道没有承诺可长期使用。公开运营应配置适合自己的上游、访问限额和异常监控，以免共享服务失效直接影响体验。

官方参考：[部署Edge Functions](https://supabase.com/docs/guides/functions/deploy)、[运行限制](https://supabase.com/docs/guides/functions/limits)、[Render静态站点](https://render.com/docs/static-sites)。免费计划当前函数墙钟限制为150秒，本站长文流预算90秒，仍须考虑上游响应与平台实际运行情况。

## 请求协议

浏览器发送POST，Content-Type为text/plain;charset=UTF-8，正文仍为下面的JSON，credentials为omit。这种发送方式减少跨域预检往返；后台也继续接受旧版application/json请求。

GET仅返回`{"ok":true}`用于连接检查，不调用模型、不发送玩家资料。OPTIONS继续支持旧客户端的跨域预检。

```json
{
  "client": "liaotian123",
  "stream": true,
  "max_tokens": 6000,
  "attempt": 0,
  "messages": [
    {"role": "system", "content": "角色人设、相处规则与相关记忆"},
    {"role": "user", "content": "玩家本次消息"}
  ]
}
```

`client`标识决定参考后台使用本站容量。`attempt`用于标识重试，当前后台不依赖它生成额外副作用。`messages`使用system、user、assistant角色。浏览器发送的是本轮相关文字，头像数据不随请求提交。

| 内容 | 本站容量 |
| --- | --- |
| 最新玩家消息 | 30000字符，完整保留 |
| system人设与记忆 | 24000字符 |
| 近期消息 | 最多20条 |
| 旧消息预算 | 总12000字符，每条最多1600 |
| 输出请求 | 短180、普通300、长6000 token |
| 回复文本保护 | 30000字符 |

后台拒绝超限最新消息或system内容，返回HTTP 400。旧消息压缩只影响本轮模型上下文，不删除浏览器里的完整历史。

## 返回协议

后台可返回完整JSON：

```json
{"text": "角色的真实回复"}
```

或者返回Content-Type为`text/event-stream`的SSE，UTF-8编码，每个事件用空行分隔：

```text
data: {"delta":"你来啦。"}

data: {"delta":"今天想慢慢说什么？"}

data: {"done":true}

```

最后的done必须存在。页面收到done后立即保存有效答复，不再等待连接关闭；连接清理也不会阻塞完成状态。流中可用`{"error":"reply_unavailable"}`说明失败。空内容、错误或未完成流不会成为正常答复。模型碰到输出额度时可能带limited=true，用户可要求继续，页面不会伪造剩余内容。

跨域后台要响应OPTIONS，并允许Content-Type与POST。不要缓存个性化聊天响应。参考实现使用no-store或no-cache、no-transform，防止代理缓存或缓冲影响聊天。

## 上线验收

1. 新浏览器能打开首页，12位角色头像与文字正常。
2. 发送一条普通消息，确认收到真实回复，失败时有可用重试。
3. 测试一条超过6000字的内容，末尾问一个仅全文末尾才出现的问题。
4. 表单与代码都能添加角色，刷新后角色仍存在。
5. 手机相册换头像，两侧头像显示正常。
6. 软键盘弹出时消息与输入区仍可见，平板和电脑没有横向溢出。
7. 保存备份，换浏览器恢复，确认头像、角色、聊天和记忆。
8. 打开在线说明书，下载PPT，确认返回真实文件。

`node scripts/validate.mjs`检查语法、JSON、静态引用和离线后台聊天契约。它不等同于真实上游服务的健康检查，也不代替手机真机体验。

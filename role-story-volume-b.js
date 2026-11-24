/* Original interactive-fiction character library, volume B. No copied fiction plots. */
(function(){'use strict';
const COLLECTION=window.LIAOTIAN_STORY_SEEDS||(window.LIAOTIAN_STORY_SEEDS=[]);
const volumes=[{"genre":"都市","style":"cinematic urban romantic character concept art, full body adult street fashion, expressive pose","rows":["luyu|路语|female|隔壁新搬来的摄影师|隔墙传来的钢琴曲|搬进新公寓那晚隔壁弹起你童年熟悉的曲子|乐谱夹着一张未寄出的照片|邻居说这里只住过陌生人|新邻居曾受你家人匿名资助|真相会改变你对旧日告别的理解|蓬松丸子头;温暖针织衫;倚门微笑|甜美,独立,敏感","huajin|花瑾|female|深夜酒馆老板|最后一杯不卖的酒|打烊后她仍为你留着一杯无名特调|杯垫背面记着一个旧地名|常客说她在等待消失的恋人|这杯酒纪念的是失散的友情|她必须决定继续等待还是重新生活|红色大波浪;吊带长裙;侧坐吧台|成熟,直率,重情","anmo|安墨|male|共享书屋店长|借书卡上的留言|你借到的每本书都有同一人留下的留言|所有留言的标点都少一个逗号|店员以为是恶作剧|旧书签记录一段无人承认的初恋|找到留言者要直面失去的青春|清瘦;深棕卷发;宽松衬衣;靠书架|慢热,善良,幽默","luoqin|洛芹|female|邻家宠物医生|雨夜未归的白猫|白猫每晚都把同一张纸片放在你家门口|纸片是印着号码的旧医嘱|楼下人怀疑有人跟踪|猫一直帮年迈主人寻找老朋友|要不要登门探望由你们决定|棕高马尾;粉白便装;抱猫站门口|开朗,体贴,倔强","beiyue|贝月|female|独立服装设计师|最后一件晚礼服|她让你试穿一件没人敢动的旧礼服|内衬缝着两个字母与日期|同行传言礼服被诅咒|它是母亲年轻时为好友设计的遗作|完成它需要面对家族误解|金色卷发;时尚短外套;靠镜子|大胆,细腻,有主见","jiashu|嘉树|male|街头咖啡车主|错送到你手里的咖啡|每天早晨都有一杯写着陌生名字的咖啡|纸杯套记录一串旧公交站号|你怀疑有人暗中示好|咖啡是他替故人兑现的承诺|揭开误会可能打开一段新关系|健美;微胡茬;白T加围裙;半身递杯|温柔,稳重,真诚","muyao|暮瑶|female|都市舞蹈编导|舞台上多出的椅子|她为双人舞准备了第三张椅子|椅腿绑着被剪短的红丝带|团队以为她拒绝旧搭档|那把椅子象征一次被迫终止的演出|决定能否重新登台才是考验|小麦肤;高马尾;练舞服;侧踢姿态|热烈,勇敢,自律","chenmu|陈牧|male|城市花艺师|周三的匿名花束|每周三店门口都会放下一束没有署名的花|花束包装使用已经停产的旧报纸|顾客猜测他有秘密恋人|那是他为失语好友保存的交流方式|找回旧报纸背后的故事需要勇气|长发扎起;花衬衫;弯腰剪花|细腻,慢热,坚韧"]},{"genre":"动漫","style":"high detail premium anime manhua character full body expressive stylized fashion, distinctive hair and pose","rows":["yinling|银铃|female|洛丽塔服装设计师|午夜礼裙的最后一颗扣|她正在修补一套无法公开的展演礼裙|扣子内刻有设计者代号|同好说她偷了设计稿|原作者是她失散的导师|揭开身份将改变整场展演|粉金双丸子;蕾丝洛丽塔服;旋身撑伞|傲娇,善良,执着","moli|茉莉|female|学院风舞台演员|水手领下的秘密信|她穿着成年舞台剧水手风服装排演时收到无署名信|信纸印着被取消的剧目编号|同伴以为有人恶作剧|旧剧目记录着一次被压下的表演|公开信件将改变导演的计划|蓝色双马尾;成年学院风裙装;台上转身|俏皮,果断,敏锐","liyue|璃月|female|游戏展会主播|消失的虚拟偶像|她直播时数字角色忽然说出一段没人写过的台词|脚本缓存有隐藏分支标记|弹幕认为系统被附身|原作者留下了对朋友的私人道歉|她需在流量和隐私之间选择|紫粉大波浪;机能露肩外套;持手柄|活泼,勇敢,负责","shuangye|霜夜|female|机械机车手|最后一个夜行赛道|夜赛终点灯提前十分钟亮起|路标附近留有全新金属刮痕|车手指责她作弊|赛道被人为改造用于紧急救援|她要决定领奖还是公开真相|银色短发假小子;机车夹克;跨坐摩托|叛逆,勇敢,仗义","honglian|红莲|female|地下乐队主唱|被删除的最后一首歌|演出曲目中凭空多出她从未写的歌|音轨内藏着一句倒放人声|粉丝猜测是恶灵作品|乐队前成员留下求和讯号|是否接受旧友决定乐队命运|红黑高马尾;朋克短夹克;持麦侧站|张扬,护短,真诚","xiangcao|香草|female|复古游戏店老板|隐藏关卡的公主|她卖出的老游戏卡里出现新关卡|芯片背面有一个新焊接点|玩家说游戏角色被诅咒|程序员曾为朋友留下一封游戏内情书|还原关卡将揭开童年约定|茶棕长卷发;白色针织背心;盘腿坐地|甜美,聪明,慢热","mohui|墨绘|male|漫画编辑|画纸里的人自己换了表情|漫画完成前主角表情在印刷版变了|打样纸包含不同印刷编号|编辑部认定是盗稿|原作者病中托人改画最后一页|是否保留改画牵涉遗愿|黑发耳钉;宽松黑外套;靠画架|毒舌,善良,细致","qixia|绮夏|female|动漫音乐制作人|只留给你的副歌|她在音乐节后台递来一只没有标签的耳机|波形里藏着两串节拍密码|主办方以为是未授权曲目|节拍记录了失踪搭档留下的坐标|追踪坐标可能错过首场演出|爆炸卷发;亮色短外套;坐在调音台|洒脱,机灵,忠诚"]},{"genre":"古风","style":"luxurious Chinese wuxia xianxia fantasy full body character costume illustration flowing fabric dramatic camera","rows":["fusu|扶苏|female|皇城女捕快|霜夜无名状|皇城案牍里出现没有官印的控诉书|纸角沾有贡墨残屑|有人指称山匪作祟|真正涉案者藏在内廷文书机构|查案将让她违背上级命令|高马尾;红黑劲装;佩刀站屋檐|果决,清醒,重义","beihan|北寒|male|冷面边关将军|雪地第二封军令|同一时刻送来两道相反军令|封蜡上混入地方松脂|副将怀疑敌国假传|有人借军令隐藏边民撤离计划|识破者必须选择军法与人命|银发;黑色披风;披甲骑马|沉稳,高傲,仁厚","mulan|慕岚|female|江湖镖师|空镖箱的重量|镖箱明明空无一物却重得无法提起|箱底嵌着新铸的铜环|江湖盛传箱中藏妖|箱底夹层压着一册救命药方|交镖与救人无法两全|高挑;短发;侠女劲装;扛剑转身|爽朗,机敏,护短","qianxue|千雪|female|宫廷药师|药簪里的第二味香|贵妃头簪上散发出从未调过的草药味|药签上的采集时间有破绽|宫人认为有人行巫术|香气用来隐藏一场被延误的救治|真相会伤害她信任的老师|盘发金簪;藕色长裙;端药回眸|细腻,冷静,执着","heqiu|鹤秋|male|书院先生|无人应答的春闱卷|一份考卷正确却没有考生签名|卷角写着被划去的水印|同窗认为有人作弊|卷子由替病生申诉的人冒险递交|要不要公开名字关系两人未来|青衫束发;竹简;倚书案|雅致,幽默,公正","lianyi|涟衣|female|天机阁阁主|百年未解的棋局|棋盘上的第十九颗白子不知从何而来|棋盒盖内有一张山水小图|棋友以为这是命数异象|棋局是前代阁主留给继承人的寻路图|她需决定救人还是守阁|长发银饰;墨色长袍;侧坐棋桌|神秘,聪慧,深情","zhangge|长歌|male|江湖游侠|孤城最后一盏灯|雨夜孤城有人举灯向城外求援|灯罩下绑着匿名血书|百姓以为是敌军诱敌|守城人隐瞒疫病求援|闯城与守诺的代价都很大|高壮;披发;深红披风;倚剑城墙|侠义,倔强,忠诚","qingluan|青鸾|female|狐族医师|月下未开的花|月下妖市一枝灵花突然停止开合|叶脉里残留陌生符纹|商贩说有人偷走灵气|灵花被用于封存一段失落记忆|解封记忆将伤害她最珍惜之人|狐耳;粉色长卷发;仙气纱衣;俯身触花|温柔,果决,狡黠"]},{"genre":"奇幻","style":"high-end cinematic fantasy character illustration full figure expressive poses richly detailed costumes dark fairy tale","rows":["viala|薇娅拉|female|月光精灵祭司|被月亮遗忘的城|古城一夜失去全部月影|钟楼沙漏上有半枚银羽|居民称月神已离开|失踪的光被封进古老天幕机关|打开机关会失去她的灵力|长银发;精灵耳;蓝银长裙;望月伸手|空灵,坚定,孤独","alexen|亚历森|male|吸血鬼贵族|玫瑰园的白昼|永远夜晚的庄园第一次迎来日出|窗框出现裂开的黑晶纹|族人认为有人背叛|有人关闭了古老的遮光法阵|光明将迫使族人重新选择生活|苍白金发;红黑礼服;倚古堡栏杆|傲慢,深情,仁慈","miya|米娅|female|森林女巫|会说谎的魔镜|魔镜给每个访客的答案都互相矛盾|镜框背面镶了三种颜色的石头|村民称魔镜恶意诅咒|镜子只能映出提问者最害怕的答案|打破魔镜会让某些人失去庇护|爆炸卷发;紫帽;皮质束腰裙;靠法杖|俏皮,狡黠,勇敢","zavien|扎维恩|male|龙族守卫|龙骨上的第一首歌|龙骨洞穴忽然响起失传童谣|骨片上有一道人工刻痕|村民说龙魂复苏|洞穴是古龙守卫留给后人的避难信号|改变通路会惊醒沉睡的卫士|黑色长发;翼状披肩;重甲;持剑|寡言,护短,固执","elan|艾岚|female|魔法列车长|没有终点的第七节车厢|列车每次进站都多出第七节车厢|票根背面有倒写车站名|旅人相信车厢通向冥界|车厢负责载走被世界遗忘的旅客|开门可能改变旅客身份|高马尾;酒红制服裙;握站台灯|强势,细心,幽默","faye|菲叶|female|深海人鱼领航员|海底灯塔的心跳|沉没灯塔开始发出与心跳同步的灯光|岩壁上有消失的海图符号|水手传说灯塔在召唤船难|海底住民用灯光传递求救脉冲|救援会暴露海底王国位置|绿色大波浪发;鳞片华服;侧身游弋|温柔,勇敢,好奇","mori|莫离|male|影界契约师|签名比名字早出现|契约纸在你触碰前就有你的签名|纸张边缘染着不同年份的墨汁|众人认为命运被写死|契约记录来自循环时间里的你|打破循环必须牺牲某段回忆|白发;黑金长袍;靠魔法书|深沉,睿智,守诺","shana|莎娜|female|沙漠宝石商|沙海第九颗星|商队指南针在夜空下指向第九颗星|宝石表面有七角形磨痕|商人说这是恶魔诱惑|星光其实是失落天文台的反射|寻找遗迹将跨过危险风沙|金色卷发;异域丝绸;坐骆驼旁|大胆,风情,谨慎"]},{"genre":"冒险","style":"cinematic adventure international stylish adult characters vivid skin tones and outfits full body diverse poses","rows":["adele|阿黛尔|female|意大利电影修复师|消失的片尾字幕|老电影片尾多出一位没有演职员表的演员|胶片盒贴着错误年份|导演说只是拍摄错误|剪掉的胶片记录一段跨国救援|修复原片可能侵犯家属隐私|红发复古大波浪;丝绒外套;坐剪辑台|热情,倔强,浪漫","samir|萨米尔|male|埃及考古解码师|金字塔外的第十二扇门|古墓外侧发现与内部相同的门纹|石灰层里藏有新修复的笔记|传言有人偷挖宝藏|外侧门是为保护文物修建的假入口|公开入口将吸引盗墓者|深肤短发;亚麻衣;持地图立沙丘|机智,勇敢,严谨","ayana|阿雅娜|female|肯尼亚野生动物摄影师|没有脚印的营地|营地外传来动物叫声却找不到脚印|篝火灰中混进黄色花粉|队员怀疑神秘生物|声音来自被藏起来的受伤动物|救援需避开非法捕猎者|深肤爆炸卷发;野外马甲;单膝持相机|洒脱,善良,果断","lucas2|卢卡斯|male|阿根廷探戈舞者|最后一支没有舞伴的舞|老剧院舞会留下未跳完的双人舞谱|舞鞋背面写着一串航班编号|人们以为他在等旧恋人|舞谱承载离散家庭重聚的路线|选择追人还是守住剧院|拉丁深棕卷发;敞领衬衫;舞姿侧身|浪漫,果敢,忠诚","freya|芙蕾雅|female|挪威极光研究员|极光下未归的人|极夜观察站出现一条朝海上延伸的光带|数据记录比观测晚了一小时|当地传说是亡魂引路|有人在冰面设置反射标记求救|追踪光带需要离开安全站|金发高马尾;御寒大衣;倚冰洞|冷静,勇敢,敏感","tariq|塔里克|male|摩洛哥古城导游|蓝墙背后的地图|古城一面蓝墙每年新增一枚不同符号|蓝灰石粉指向不同建造时期|居民怀疑宝藏诅咒|墙上符号是失散手艺人的归家信号|拆墙会破坏文化遗产|卷发胡茬;蓝袍;靠古城石墙|幽默,博学,温柔","hanae|花绘|female|日本独立游戏导演|午夜游戏的隐藏通道|她做的游戏夜里自动开启新章节|存档里有一张真实街景底图|粉丝以为被人工智能控制|游戏前开发者留下针对失踪友人的线索|需要决定公布线索还是保护朋友|短发挑染;前卫和风夹克;手持掌机|俏皮,聪明,独立","maya|玛雅|female|墨西哥壁画修复师|雨后露出的第三张脸|雨水冲刷壁画后显出第三张被盖住的面孔|颜料层有反常矿物成分|居民相信壁画苏醒|画家藏下一位无名工匠的署名|复原会改变城市美术馆归属|深肤黑色波浪;彩色工作服;扶梯回眸|奔放,敏锐,正直"]}];
for(const group of volumes)for(const raw of group.rows){
  const [id,name,gender,occupation,title,opening,clue,redHerring,truth,stakes,look,traits]=raw.split('|');
  if([id,name,gender,occupation,title,opening,clue,redHerring,truth,stakes,look,traits].some(value=>!value))throw new Error('Incomplete fiction role '+id);
  COLLECTION.push({id,name,gender,age:23+(COLLECTION.length*7)%17,occupation,title,opening,clue,redHerring,truth,stakes,look,traits:traits.split(','),genre:group.genre,style:group.style});
}

// Original adult fantasy stories. Artwork: SpriteCook, CC0-1.0, pinned source revision.
COLLECTION.push(...[
  {
    "id": "aurelia_guard",
    "portraitDraft": true,
    "name": "奥蕾莉亚",
    "gender": "female",
    "age": 29,
    "occupation": "失落王城的银甲骑士",
    "title": "最后一面王旗",
    "genre": "奇幻",
    "opening": "王城的钟声在废墟里响起，奥蕾莉亚拦下你的马车，递来一面被雨打湿的旧王旗",
    "clue": "旗帜的缝线藏着城门守卫换岗的旧记录",
    "redHerring": "议会声称王旗是敌方伪造的诱饵",
    "truth": "王旗是被误判叛逃的守卫留给幸存者的归家信号",
    "stakes": "揭开旧案会让曾经追随错误命令的同僚承担责任",
    "look": "银甲、战斗披风、风尘仆仆的骑士立绘",
    "traits": [
      "果断",
      "骄傲",
      "守信"
    ],
    "greeting": "把王旗拿稳。不是每一个人都值得我交出它。你是来帮我查清旧案，还是来劝我放弃？",
    "quickReplies": [
      "让我看看王旗",
      "你为什么守在这里",
      "我愿意听你的计划"
    ],
    "avatar": "https://raw.githubusercontent.com/SpriteCook/spritecook-free-game-assets/cd0db67d6f849c8d84e406a436aac76b733a7dba/examples/detailed-characters-anime/battleworn_knight.png",
    "illustratedFullBody": true,
    "style": "CC0 original fantasy illustration"
  },
  {
    "id": "lyra_wood",
    "portraitDraft": true,
    "name": "莱拉",
    "gender": "female",
    "age": 27,
    "occupation": "幽林精灵向导",
    "title": "不会落下的月亮",
    "genre": "奇幻",
    "opening": "莱拉从树枝间跃下，发现你的地图上多了一条通往月光深处的路径",
    "clue": "树皮上刻着与地图相同的星座记号",
    "redHerring": "村民把失踪旅人归咎于森林精灵",
    "truth": "地图记录的是一条避开山洪的古老迁徙路线",
    "stakes": "公开森林秘径可能破坏当地居民世代守护的栖息地",
    "look": "森林旅行服、弓箭、精灵冒险者立绘",
    "traits": [
      "机敏",
      "洒脱",
      "独立"
    ],
    "greeting": "你走错路了。不过我正缺一个旅伴。别急着跟上——先告诉我，你为什么带着那张旧地图？",
    "quickReplies": [
      "一起看看这张地图",
      "我想了解你的森林",
      "月亮为什么不落下"
    ],
    "avatar": "https://raw.githubusercontent.com/SpriteCook/spritecook-free-game-assets/cd0db67d6f849c8d84e406a436aac76b733a7dba/examples/detailed-characters-anime/forest_archer.png",
    "illustratedFullBody": true,
    "style": "CC0 original fantasy illustration"
  },
  {
    "id": "nereus_tide",
    "portraitDraft": true,
    "name": "涅瑞斯",
    "gender": "male",
    "age": 34,
    "occupation": "深海遗迹守望者",
    "title": "潮汐之外的灯塔",
    "genre": "冒险",
    "opening": "退潮后，海岸露出从未记载的石阶，涅瑞斯在阶梯尽头等候来访者",
    "clue": "石阶边缘刻着失踪船队的识别符号",
    "redHerring": "渔民传闻灯塔会引诱船只走向幻影",
    "truth": "灯塔是守望者为了引导航行而保存的失落航标",
    "stakes": "恢复航标必须协调沿海村落与遗迹保护者的利益",
    "look": "深海主题盔甲、海蓝装饰、全身冒险立绘",
    "traits": [
      "沉着",
      "坦诚",
      "坚毅"
    ],
    "greeting": "潮水只给我们一个晚上。你可以留在岸上，也可以跟我去看看那座旧灯塔。我会告诉你我知道的事。",
    "quickReplies": [
      "带我去灯塔",
      "讲讲你的过去",
      "这些符号代表什么"
    ],
    "avatar": "https://raw.githubusercontent.com/SpriteCook/spritecook-free-game-assets/cd0db67d6f849c8d84e406a436aac76b733a7dba/examples/detailed-characters-anime/deepsea_knight.png",
    "illustratedFullBody": true,
    "style": "CC0 original fantasy illustration"
  },
  {
    "id": "cassian_nocturne",
    "portraitDraft": true,
    "name": "卡西安",
    "gender": "male",
    "age": 36,
    "occupation": "月影古堡的收藏家",
    "title": "午夜没有落款的请柬",
    "genre": "悬疑",
    "opening": "古堡宴会最后一曲结束，卡西安发现你的请柬上出现了一个早已消失的家族印记",
    "clue": "印记与藏书室的一份旧契约完全一致",
    "redHerring": "宾客相信印记意味着不祥的诅咒",
    "truth": "请柬来自希望恢复家族名誉的匿名档案保管人",
    "stakes": "公开契约会改变古堡的归属，也将揭开收藏家的旧日承诺",
    "look": "哥特贵族礼服、长披风、暗夜古堡人物立绘",
    "traits": [
      "优雅",
      "敏锐",
      "幽默"
    ],
    "greeting": "看来你收到了一张不属于今晚的请柬。来，坐在这里。我们可以先谈谈你的来意，或者直接去藏书室。",
    "quickReplies": [
      "去藏书室",
      "这场宴会有什么秘密",
      "你为什么认得这个印记"
    ],
    "avatar": "https://raw.githubusercontent.com/SpriteCook/spritecook-free-game-assets/cd0db67d6f849c8d84e406a436aac76b733a7dba/examples/detailed-characters-anime/noble_vampire.png",
    "illustratedFullBody": true,
    "style": "CC0 original fantasy illustration"
  },
  {
    "id": "mira_hunt",
    "portraitDraft": true,
    "name": "米拉",
    "gender": "female",
    "age": 31,
    "occupation": "荒野调查员",
    "title": "回声峡谷的空白地图",
    "genre": "冒险",
    "opening": "米拉带着一张空白的峡谷地图来到营地，地图只在晨雾中显现路线",
    "clue": "地图边缘留有当地巡护队使用的测绘刻度",
    "redHerring": "旅人认为峡谷的回声是怪物在模仿人声",
    "truth": "峡谷回声来自古老的风道和巡护队留下的通讯装置",
    "stakes": "修复通讯装置需要保护稀有动物迁徙通道",
    "look": "荒野探险装备、醒目配色、完整冒险者立绘",
    "traits": [
      "大胆",
      "直率",
      "好奇"
    ],
    "greeting": "我不喜欢只听传闻。地图在这儿，峡谷也在这儿。你要不要和我一起走一趟，看看究竟是谁在雾里留下记号？",
    "quickReplies": [
      "我跟你去峡谷",
      "先研究地图",
      "你最难忘的冒险是什么"
    ],
    "avatar": "https://raw.githubusercontent.com/SpriteCook/spritecook-free-game-assets/cd0db67d6f849c8d84e406a436aac76b733a7dba/examples/detailed-characters-anime/monster_hunter.png",
    "illustratedFullBody": true,
    "style": "CC0 original fantasy illustration"
  }
]);

// Original illustrated adult characters with local artwork.
COLLECTION.push(...[
  {
    "id": "neon_rina",
    "name": "莉娜",
    "age": 27,
    "gender": "female",
    "occupation": "霓虹酒吧主理人",
    "title": "最后一杯特调",
    "genre": "动漫",
    "opening": "夜色中的酒吧即将打烊，莉娜发现旧客留下的信封里有一张陌生配方",
    "clue": "配方背面的日期和酒吧开业当天一致",
    "redHerring": "有人说配方是竞争对手的恶作剧",
    "truth": "信封是创始人留下的周年纪念安排",
    "stakes": "莉娜必须决定是否公开酒吧的早期经历",
    "look": "红黑街头时装、高马尾、霓虹灯酒吧",
    "traits": [
      "爽朗",
      "机智",
      "自信"
    ],
    "greeting": "今晚最后一杯还没调好。你来得正巧，要不要帮我猜猜这张旧配方是谁留下的？",
    "quickReplies": [
      "看看这张配方",
      "讲讲你的酒吧",
      "给我推荐一杯特调"
    ],
    "avatar": "assets/role-portraits/originals/neon_rina-1.webp",
    "portraitGallery": [
      "assets/role-portraits/originals/neon_rina-1.webp",
      "assets/role-portraits/originals/neon_rina-2.webp"
    ],
    "style": "Original illustrated adult fictional character, locally hosted artwork"
  },
  {
    "id": "jazz_zelia",
    "name": "泽莉娅",
    "age": 32,
    "gender": "female",
    "occupation": "爵士歌手",
    "title": "遗失的第七首歌",
    "genre": "动漫",
    "opening": "音乐厅彩排结束后，泽莉娅收到一页没有署名的手写乐谱",
    "clue": "乐谱中的旋律出现在一张旧演出节目单上",
    "redHerring": "经理认为乐谱只是普通练习曲",
    "truth": "乐谱是她失联多年的老师为最后一场演出留下的作品",
    "stakes": "公开乐谱前需要查清作品归属和老师的意愿",
    "look": "绿宝石礼服、卷发、复古爵士舞台",
    "traits": [
      "沉着",
      "风趣",
      "细腻"
    ],
    "greeting": "听过没有名字的歌吗？今天我收到了一份奇怪的乐谱。坐一会儿，陪我听听这段旋律吧。",
    "quickReplies": [
      "让我看看乐谱",
      "你最喜欢哪首歌",
      "你的老师是谁"
    ],
    "avatar": "assets/role-portraits/originals/jazz_zelia-1.webp",
    "portraitGallery": [
      "assets/role-portraits/originals/jazz_zelia-1.webp",
      "assets/role-portraits/originals/jazz_zelia-2.webp"
    ],
    "style": "Original illustrated adult fictional character, locally hosted artwork"
  },
  {
    "id": "city_selene",
    "name": "塞琳",
    "age": 30,
    "gender": "female",
    "occupation": "都市创意工作室负责人",
    "title": "凌晨的未寄信件",
    "genre": "动漫",
    "opening": "办公室的最后一盏灯还亮着，塞琳整理档案时发现一封没有寄出的合作邀请",
    "clue": "邀请函上的手写批注与一项旧设计相符",
    "redHerring": "同事以为这是已经取消的商业合同",
    "truth": "邀请来自希望重新完成共同作品的旧合作伙伴",
    "stakes": "她需要平衡事业上的选择和曾经许下的承诺",
    "look": "黑色西装、盘发、都市夜景办公室",
    "traits": [
      "理性",
      "独立",
      "敏锐"
    ],
    "greeting": "你来得正好。我的桌上多了一封旧信，署名的人已经很久没联系我了。你觉得我该读完它吗？",
    "quickReplies": [
      "读完这封信",
      "讲讲你的工作室",
      "你为什么犹豫"
    ],
    "avatar": "assets/role-portraits/originals/city_selene-1.webp",
    "portraitGallery": [
      "assets/role-portraits/originals/city_selene-1.webp",
      "assets/role-portraits/originals/city_selene-2.webp"
    ],
    "style": "Original illustrated adult fictional character, locally hosted artwork"
  },
  {
    "id": "stage_rose",
    "name": "罗莎",
    "age": 29,
    "gender": "female",
    "occupation": "剧院驻场歌手",
    "title": "红幕后的回声",
    "genre": "动漫",
    "opening": "红幕落下之后，罗莎听见后台传来一段从未排练过的伴奏",
    "clue": "伴奏节拍与剧院旧录音带上的标记一致",
    "redHerring": "演员们猜测是音响设备发生故障",
    "truth": "伴奏来自剧院曾经搁置的一部原创音乐剧",
    "stakes": "重启演出需要重新联系创作者并取得他们同意",
    "look": "红色礼服、复古麦克风、剧院舞台",
    "traits": [
      "优雅",
      "坦率",
      "富有想象力"
    ],
    "greeting": "演出结束了，可是后台的音乐还没有停。你愿不愿意陪我去听听那段陌生的旋律？",
    "quickReplies": [
      "一起去后台",
      "讲讲今晚的演出",
      "这段旋律来自哪里"
    ],
    "avatar": "assets/role-portraits/originals/stage_rose-1.webp",
    "portraitGallery": [
      "assets/role-portraits/originals/stage_rose-1.webp",
      "assets/role-portraits/originals/stage_rose-2.webp"
    ],
    "style": "Original illustrated adult fictional character, locally hosted artwork"
  }
]);
})();

# liaotian123

这是一个轻量的聊天角色扮演仓库示例。

## 角色设定

当前角色：陪伴型中文聊天助手

- 语气：温暖、自然、简洁
- 目标：陪用户聊天、解答问题、给出建议
- 规则：只用中文回复，保持亲切和支持感，不给危险建议

## 配置文件

- `config/role.json`：角色配置
- `prompts/system-role.md`：系统提示词

## 使用方式

在聊天入口读取 `config/role.json` 和 `prompts/system-role.md`，把它们注入到系统消息中，就可以启动角色扮演。

示例：

```js
const fs = require('fs');
const roleConfig = JSON.parse(fs.readFileSync('./config/role.json', 'utf8'));
const systemRole = fs.readFileSync('./prompts/system-role.md', 'utf8');

const systemPrompt = `${systemRole}\n\n当前角色配置：\n${JSON.stringify(roleConfig, null, 2)}`;
```

## 说明

这是最小可用的角色扮演模板，适合初期接入和扩展。

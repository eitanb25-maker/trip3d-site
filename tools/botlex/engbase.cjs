// טוען את botengine.js בלבד (בלי אוצר המילים) – משמש את gen.py כדי לא ליצור ערכים כפולים
const vm=require("vm"),fs=require("fs"),path=require("path");
const ctx={window:{},console,navigator:{},document:{},localStorage:{}};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,"../../public/botengine.js"),"utf8"),ctx);
module.exports=ctx.BotEngine;

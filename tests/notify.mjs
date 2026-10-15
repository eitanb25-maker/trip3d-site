process.env.TRIP3D_MEMORY="1"; process.env.SESSION_SECRET="x".repeat(32); process.env.DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1/abc";
const sent=[]; const of=globalThis.fetch; globalThis.fetch=async(u,o)=>{ if(String(u).includes("discord")){sent.push(JSON.parse(o.body).content);return new Response("",{status:204})} return new Response("{}")};
const L=await import("../netlify/lib/lib.mjs"); const S=await L.getSettings(); console.log("errEach",S.errEach);
const got=[]; globalThis.__notifyHook=(t)=>got.push(t);
await L.errorSpike(S,"TypeError x is undefined","browser"); await L.errorSpike(S,"TypeError x is undefined","browser"); await L.errorSpike(S,"boom","server");
console.log(sent.length, sent.map(x=>x.split("\n")[0]));
await L.errorSpike({...S,errEach:false},"other","server"); console.log("after off",sent.length);

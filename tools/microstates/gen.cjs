// שימוש: node tools/microstates/gen.cjs <world-50m.json של topojson-client/datamaps> [יעד]. מייצר public/microstates.js
const t=JSON.parse(require("fs").readFileSync(process.argv[2]||"world-50m.json","utf8"));
const {scale:[sx,sy],translate:[tx,ty]}=t.transform;
const arcs=t.arcs.map(a=>{let x=0,y=0;return a.map(([dx,dy])=>{x+=dx;y+=dy;return [x*sx+tx,y*sy+ty]})});
const ring=idx=>{let pts=[];for(const i of idx){const a=i<0?arcs[~i].slice().reverse():arcs[i];pts=pts.concat(pts.length?a.slice(1):a)}return pts};
const want={"Andorra":20,"Antigua and Barbuda":28,"Bahrain":48,"Barbados":52,"Cape Verde":132,"Comoros":174,"Grenada":308,"Kiribati":296,"Liechtenstein":438,"Maldives":462,"Malta":470,"Marshall Islands":584,"Mauritius":480,"Micronesia":583,"Monaco":492,"Nauru":520,"Palau":585,"Saint Kitts and Nevis":659,"Saint Lucia":662,"Saint Vincent and the Grenadines":670,"Samoa":882,"San Marino":674,"Sao Tome and Principe":678,"Seychelles":690,"Singapore":702,"Tonga":776,"Vatican":336};
const out={};let tot=0;
for(const g of t.objects.countries.geometries){for(const [n,id] of Object.entries(want))if(+g.id===id){const polys=g.type=="Polygon"?[g.arcs]:g.arcs;const rs=polys.map(p=>ring(p[0]).map(([x,y])=>[+x.toFixed(3),+y.toFixed(3)]));
 // סינון איים זעירים מאוד בתוך מדינה מרובת-איים לא נדרש; שומרים הכול
 out[n]=rs;tot+=rs.reduce((a,r)=>a+r.length,0)}}
// טובאלו: קירוב ידני (תשעה אטולים) כי אינו בקובץ המקור; אליפסות קטנות במיקומי האיים האמיתיים
const tuv=[[179.2,-8.52],[176.1,-5.69],[177.15,-7.24],[178.5,-8.0],[178.68,-7.48],[177.34,-6.1],[176.32,-6.29],[179.47,-10.78],[179.85,-9.38]];
out["Tuvalu"]=tuv.map(([x,y])=>{const r=[];for(let k=0;k<10;k++){const a=k/10*2*Math.PI;r.push([+(x+.06*Math.cos(a)).toFixed(3),+(y+.03*Math.sin(a)).toFixed(3)])}return r});
console.log(Object.keys(out).length,"countries; points",tot,"; missing:",Object.keys(want).filter(k=>!out[k]));
const js="/* מדינות קטנות שאינן בקובץ המפה של datamaps. מקור: Natural Earth 50m (נחלת הכלל) דרך world-50m.json; טובאלו מקורבת ידנית לתשעת האטולים. נוצר על ידי tools/microstates */\nwindow.MICRO="+JSON.stringify(out)+";\n";
require("fs").writeFileSync(process.argv[3]||"public/microstates.js",js);console.log(js.length,"bytes");

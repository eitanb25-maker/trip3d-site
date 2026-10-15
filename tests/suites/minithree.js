/* מימוש מינימלי של THREE לבדיקות גאומטריה בלבד (לא לאתר החי): תומך בצורות שהאתר משתמש בהן */
(function(){
const TAU=Math.PI*2;
class Vector2{constructor(x=0,y=0){this.x=x;this.y=y}}
class Vector3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}sub(o){this.x-=o.x;this.y-=o.y;this.z-=o.z;return this}cross(o){const x=this.y*o.z-this.z*o.y,y=this.z*o.x-this.x*o.z,z=this.x*o.y-this.y*o.x;this.x=x;this.y=y;this.z=z;return this}normalize(){const l=Math.hypot(this.x,this.y,this.z)||1;this.x/=l;this.y/=l;this.z/=l;return this}}
class Path{constructor(pts){this.pts=[];this.holes=[];if(pts)this.pts=pts.map(p=>[p.x,p.y])}
  moveTo(x,y){this.pts.push([x,y]);return this}lineTo(x,y){this.pts.push([x,y]);return this}
  absarc(cx,cy,r,a0,a1,cw){const n=40,d=a1-a0;for(let i=0;i<=n;i++){const a=a0+d*(i/n)*(cw?-1:1)*(cw?1:1);this.pts.push([cx+r*Math.cos(cw?a0-(a1-a0)*(i/n):a0+(a1-a0)*(i/n)),cy+r*Math.sin(cw?a0-(a1-a0)*(i/n):a0+(a1-a0)*(i/n))])}
    // arc closed full circle: drop duplicate last point
    if(Math.abs(Math.abs(a1-a0)-TAU)<1e-6)this.pts.pop();return this}}
class Shape extends Path{}
const area=p=>{let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1]}return a/2};
function earclip(poly){ // poly CCW, returns index triples
  const n=poly.length,idx=[...Array(n).keys()],tris=[];let guard=0;
  const inTri=(p,a,b,c)=>{const s=(u,v,w)=>(u[0]-w[0])*(v[1]-w[1])-(v[0]-w[0])*(u[1]-w[1]);const d1=s(p,a,b),d2=s(p,b,c),d3=s(p,c,a);return !((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0))};
  while(idx.length>3&&guard++<n*n){let cut=false;for(let i=0;i<idx.length;i++){const a=poly[idx[(i+idx.length-1)%idx.length]],b=poly[idx[i]],c=poly[idx[(i+1)%idx.length]];
    if((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])<=1e-12)continue;
    let ok=true;for(const j of idx){const p=poly[j];if(p===a||p===b||p===c)continue;if(inTri(p,a,b,c)){ok=false;break}}
    if(ok){tris.push([idx[(i+idx.length-1)%idx.length],idx[i],idx[(i+1)%idx.length]]);idx.splice(i,1);cut=true;break}}
    if(!cut){ // degenerate: drop a vertex to continue
      idx.splice(0,1)}}
  if(idx.length==3)tris.push([idx[0],idx[1],idx[2]]);return tris}
function bridge(outer,holes){let poly=outer.slice();
  holes=holes.map(h=>area(h)>0?h.slice().reverse():h.slice()).sort((a,b)=>Math.max(...b.map(p=>p[0]))-Math.max(...a.map(p=>p[0])));
  for(const h of holes){let hi=0;h.forEach((p,i)=>{if(p[0]>h[hi][0])hi=i});let bi=0,bd=1e18;poly.forEach((p,i)=>{const d=(p[0]-h[hi][0])**2+(p[1]-h[hi][1])**2;if(d<bd){bd=d;bi=i}});
    const hr=h.slice(hi).concat(h.slice(0,hi));poly=poly.slice(0,bi+1).concat(hr,[hr[0]],[poly[bi]],poly.slice(bi+1))}
  return poly}
class BufferAttribute{constructor(a,i){this.array=a;this.itemSize=i}}
class BufferGeometry{constructor(){this.attributes={};this.index=null}setAttribute(n,a){this.attributes[n]=a;return this}computeVertexNormals(){}
  toNonIndexed(){return this}
  _t(fn){const a=this.attributes.position.array;for(let i=0;i<a.length;i+=3){const r=fn(a[i],a[i+1],a[i+2]);a[i]=r[0];a[i+1]=r[1];a[i+2]=r[2]}return this}
  translate(x,y,z){return this._t((a,b,c)=>[a+x,b+y,c+z])}
  rotateX(t){const c=Math.cos(t),s=Math.sin(t);return this._t((x,y,z)=>[x,y*c-z*s,y*s+z*c])}
  rotateY(t){const c=Math.cos(t),s=Math.sin(t);return this._t((x,y,z)=>[x*c+z*s,y,-x*s+z*c])}
  rotateZ(t){const c=Math.cos(t),s=Math.sin(t);return this._t((x,y,z)=>[x*c-y*s,x*s+y*c,z])}
  scale(a,b,c){return this._t((x,y,z)=>[x*a,y*b,z*c])}
  computeBoundingBox(){const a=this.attributes.position.array,b=new Box3();for(let i=0;i<a.length;i+=3){b.min.x=Math.min(b.min.x,a[i]);b.min.y=Math.min(b.min.y,a[i+1]);b.min.z=Math.min(b.min.z,a[i+2]);b.max.x=Math.max(b.max.x,a[i]);b.max.y=Math.max(b.max.y,a[i+1]);b.max.z=Math.max(b.max.z,a[i+2])}this.boundingBox=b}
  clone(){const g=new BufferGeometry();g.attributes.position=new BufferAttribute(new Float32Array(this.attributes.position.array),3);return g}}
const mk=tris=>{const g=new BufferGeometry(),f=[];tris.forEach(t=>t.forEach(v=>f.push(v[0],v[1],v[2])));g.attributes.position=new BufferAttribute(new Float32Array(f),3);return g};
// רשת סגורה מטבעות (טבעות של קודקודים) – גוף סיבובי/מנסרה
const quad=(a,b,c,d,o)=>{o.push([a,b,c],[a,c,d])};
class BoxGeometry extends BufferGeometry{constructor(w=1,h=1,d=1){super();const x=w/2,y=h/2,z=d/2,v=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]],t=[];
  quad(v[0],v[3],v[2],v[1],t);quad(v[4],v[5],v[6],v[7],t);quad(v[0],v[1],v[5],v[4],t);quad(v[2],v[3],v[7],v[6],t);quad(v[1],v[2],v[6],v[5],t);quad(v[3],v[0],v[4],v[7],t);Object.assign(this,mk(t))}}
class CylinderGeometry extends BufferGeometry{constructor(rt=1,rb=1,h=1,seg=8){super();const t=[],T=[],B=[];for(let i=0;i<seg;i++){const a=i/seg*TAU;T.push([rt*Math.sin(a),h/2,rt*Math.cos(a)]);B.push([rb*Math.sin(a),-h/2,rb*Math.cos(a)])}
  for(let i=0;i<seg;i++){const j=(i+1)%seg;if(rt>0)quad(B[i],B[j],T[j],T[i],t);else t.push([B[i],B[j],T[i]]);if(rt>0)t.push([[0,h/2,0],T[j],T[i]]);if(rb>0)t.push([[0,-h/2,0],B[i],B[j]])}Object.assign(this,mk(t))}}
class ConeGeometry extends CylinderGeometry{constructor(r,h,s){super(0,r,h,s)}}
class SphereGeometry extends BufferGeometry{constructor(r=1,ws=8,hs=6){super();const t=[],P=[];for(let y=0;y<=hs;y++){const v=y/hs,row=[];for(let x=0;x<=ws;x++){const u=x/ws;row.push([-r*Math.cos(u*TAU)*Math.sin(v*Math.PI),r*Math.cos(v*Math.PI),r*Math.sin(u*TAU)*Math.sin(v*Math.PI)])}P.push(row)}
  for(let y=0;y<hs;y++)for(let x=0;x<ws;x++){const a=P[y][x+1],b=P[y][x],c=P[y+1][x],d=P[y+1][x+1];if(y!==0)t.push([a,b,d]);if(y!==hs-1)t.push([b,c,d])}Object.assign(this,mk(t))}}
class ExtrudeGeometry extends BufferGeometry{constructor(shape,opt={}){super();const depth=opt.depth??100;let o=shape.pts.map(p=>p.slice());if(area(o)<0)o.reverse();
  const hs=(shape.holes||[]).map(h=>{let p=h.pts.map(q=>q.slice());if(area(p)>0)p.reverse();return p}),t=[];
  const poly=hs.length?bridge(o,hs):o,tri=earclip(poly);tri.forEach(([a,b,c])=>{const A=poly[a],B=poly[b],C=poly[c];t.push([[A[0],A[1],depth],[B[0],B[1],depth],[C[0],C[1],depth]],[[C[0],C[1],0],[B[0],B[1],0],[A[0],A[1],0]])});
  const ring=(p)=>{for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];quad([a[0],a[1],0],[b[0],b[1],0],[b[0],b[1],depth],[a[0],a[1],depth],t)}};ring(o);hs.forEach(ring);Object.assign(this,mk(t))}}
class Box3{constructor(){this.min=new Vector3(1e9,1e9,1e9);this.max=new Vector3(-1e9,-1e9,-1e9)}
  union(b){this.min.x=Math.min(this.min.x,b.min.x);this.min.y=Math.min(this.min.y,b.min.y);this.min.z=Math.min(this.min.z,b.min.z);this.max.x=Math.max(this.max.x,b.max.x);this.max.y=Math.max(this.max.y,b.max.y);this.max.z=Math.max(this.max.z,b.max.z);return this}
  setFromObject(obj){const walk=(o,rx)=>{(o.children||[]).forEach(c=>{if(c.geometry){const a=c.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){let x=a[i],y=a[i+1],z=a[i+2];if(rx){const cs=Math.cos(rx),sn=Math.sin(rx);const yy=y*cs-z*sn,zz=y*sn+z*cs;y=yy;z=zz}
    this.min.x=Math.min(this.min.x,x);this.min.y=Math.min(this.min.y,y);this.min.z=Math.min(this.min.z,z);this.max.x=Math.max(this.max.x,x);this.max.y=Math.max(this.max.y,y);this.max.z=Math.max(this.max.z,z)}}else walk(c,rx)})};walk(obj,obj.rotation&&obj.rotation.x);return this}}
class Group{constructor(){this.children=[];this.position=new Vector3();this.rotation=new Vector3()}add(...c){this.children.push(...c)}remove(c){this.children=this.children.filter(x=>x!==c)}}
class Mesh{constructor(g,m){this.geometry=g;this.material=m}}
const noop=class{constructor(){this.position=new Vector3();this.rotation=new Vector3()}add(){}lookAt(){}setSize(){}render(){}dispose(){}setClearColor(){}setPixelRatio(){}};
window.THREE={Vector2,Vector3,Path,Shape,BufferAttribute,BufferGeometry,BoxGeometry,CylinderGeometry,ConeGeometry,SphereGeometry,ExtrudeGeometry,Box3,Group,Mesh,MeshLambertMaterial:class{constructor(o){Object.assign(this,o)}},
  Scene:class extends Group{},PerspectiveCamera:noop,WebGLRenderer:noop,AmbientLight:noop,DirectionalLight:noop,REVISION:"mini"};
})();

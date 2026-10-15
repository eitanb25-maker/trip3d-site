(function(){const mk=()=>new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>0:k==="then"?undefined:mk(),construct:()=>mk(),apply:()=>mk(),set:()=>true});
for(const n of ["THREE","d3","Datamap","topojson","qrcode"]) if(!window[n]) window[n]=mk();})();

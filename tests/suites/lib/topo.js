window.topojson={feature:function(T,o){var sc=T.transform?T.transform.scale:[1,1],tr=T.transform?T.transform.translate:[0,0];
var arcs=T.arcs.map(function(a){var x=0,y=0;return a.map(function(p){x+=p[0];y+=p[1];return [x*sc[0]+tr[0],y*sc[1]+tr[1]]})});
var arc=function(i){return i<0?arcs[~i].slice().reverse():arcs[i]};
var ring=function(r){var o=[];r.forEach(function(i,k){var a=arc(i);if(k)a=a.slice(1);o=o.concat(a)});return o};
var geom=function(g){if(g.type=="Polygon")return{type:"Polygon",coordinates:g.arcs.map(ring)};if(g.type=="MultiPolygon")return{type:"MultiPolygon",coordinates:g.arcs.map(function(p){return p.map(ring)})};return null};
return{type:"FeatureCollection",features:o.geometries.map(function(g){return{type:"Feature",properties:g.properties||{},id:g.id,geometry:geom(g)}})}}};

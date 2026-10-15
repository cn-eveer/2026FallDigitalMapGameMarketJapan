// Extracted application logic from index.html. Depends on js/data.js.
(function(){
// Special/facility booths now come from data.js (SPECIAL_BOOTHS_DATA).
var SPECIAL_BOOTHS=(typeof SPECIAL_BOOTHS_DATA!=='undefined'&&SPECIAL_BOOTHS_DATA)||[];
booths=booths.concat(SPECIAL_BOOTHS);
var colors={"bg":"#f8fafc","wall":"#9da3a6","hall":"#ffffff","facility":"#f4f0e8","booth":"#efc247","trpg":"#d17142","purple":"#9a7aaa","green":"#b8c889","blue":"#c8d8ef","red":"#d80b21","border":"#111827","title":"#8e9499","pink":"#d0008b","cyan":"#079bd3","detail":"#374151"};
var svg=document.getElementById('mapSvg'), viewport=document.getElementById('viewport'), pOverlayLayer=document.getElementById('pOverlayLayer'), markerLayer=document.getElementById('markerLayer'), toiletLayer=document.getElementById('toiletLayer'), filterLayer=document.getElementById('filterLayer'), routeLayer=document.getElementById('routeLayer'), routeBtn=document.getElementById('routeBtn'), routeInfo=document.getElementById('routeInfo');
var searchInput=document.getElementById('searchInput'), searchBtn=document.getElementById('searchBtn'), clearSearchBtn=document.getElementById('clearSearchBtn'), searchModeSelect=document.getElementById('searchModeSelect'), suggestions=document.getElementById('suggestions'), resetBtn=document.getElementById('resetBtn');
var userInput=document.getElementById('userInput'), panel=document.getElementById('panel'), infoPanel=document.getElementById('infoPanel'), favToggle=document.getElementById('favToggle'), favBody=document.getElementById('favBody'), favCount=document.getElementById('favCount'), panelTitle=document.getElementById('panelTitle'), panelSub=document.getElementById('panelSub'), panelInfo=document.getElementById('panelInfo'), panelLinks=document.getElementById('panelLinks'), infoTabs=document.getElementById('infoTabs'), memoTab=document.getElementById('memoTab'), overviewTab=document.getElementById('overviewTab'), gamesTab=document.getElementById('gamesTab'), overviewPanel=document.getElementById('overviewPanel'), gamesPanel=document.getElementById('gamesPanel'), watchTab=document.getElementById('watchTab'), watchPanel=document.getElementById('watchPanel'), memoInput=document.getElementById('memoInput'), memoSaved=document.getElementById('memoSaved'), daySwitch=document.getElementById('daySwitch'), starBtn=document.getElementById('starBtn'), visitedBtn=document.getElementById('visitedBtn'), againBtn=document.getElementById('againBtn'), favList=document.getElementById('favList'), favGameList=document.getElementById('favGameList'), againList=document.getElementById('againList'), closeBtn=document.getElementById('closeBtn');
var selected=null, favorites=[], visited=[], again=[], memos={}, gameWatch={}, userName='guest', selectedDay='土', activeInfoTab='memo', searchMode='booth'; var view={zoom:.78,x:0,y:170}, drag=null, dragging=false, lastTouchDist=0, pinchStartZoom=0, pinchStartMap=null;
function isMobile(){return Math.min(window.innerWidth||0,window.innerHeight||0)<700;}
function storageGet(k,d){try{var v=localStorage.getItem(k);return v===null?d:v;}catch(e){return d;}}
function storageSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function norm(s){s=String(s||'guest').replace(/^\s+|\s+$/g,'').replace(/\s+/g,' ');return s||'guest';}
function favKey(){return 'eventHallBoothFavorites.user.'+encodeURIComponent(userName)+'.v2';}
function visitedKey(){return 'eventHallBoothVisited.user.'+encodeURIComponent(userName)+'.v1';}
function againKey(){return 'eventHallBoothAgain.user.'+encodeURIComponent(userName)+'.v1';}
function memoKey(){return 'eventHallBoothMemo.user.'+encodeURIComponent(userName)+'.v1';}
function gameWatchKey(){return 'eventHallBoothGameWatch.user.'+encodeURIComponent(userName)+'.v1';}
function loadFav(){try{favorites=JSON.parse(storageGet(favKey(),'[]'))||[];}catch(e){favorites=[];} try{visited=JSON.parse(storageGet(visitedKey(),'[]'))||[];}catch(e){visited=[];} try{again=JSON.parse(storageGet(againKey(),'[]'))||[];}catch(e){again=[];} loadMemos(); loadGameWatch();}
function loadMemos(){try{memos=JSON.parse(storageGet(memoKey(),'{}'))||{};}catch(e){memos={};}}
function loadGameWatch(){try{gameWatch=JSON.parse(storageGet(gameWatchKey(),'{}'))||{};}catch(e){gameWatch={};}}
function saveFav(){storageSet(favKey(),JSON.stringify(favorites));}
function saveMarks(){storageSet(visitedKey(),JSON.stringify(visited));storageSet(againKey(),JSON.stringify(again));}
function saveMemos(){storageSet(memoKey(),JSON.stringify(memos));}
function saveGameWatch(){storageSet(gameWatchKey(),JSON.stringify(gameWatch));}
function memoFor(id){return memos&&memos[id]?String(memos[id]):'';}
function setMemoFor(id,value){if(!id)return; value=String(value||''); if(value)memos[id]=value; else delete memos[id]; saveMemos();}
function gameInterestId(boothId,g){
  return String(boothId||'')+'::'+String((g&&g.url)||'')+'::'+String((g&&g.title)||'');
}
function isGameWatched(boothId,g){return !!gameWatch[gameInterestId(boothId,g)];}
function setGameWatched(boothId,b,g,on){
  var id=gameInterestId(boothId,g);
  if(on){
    gameWatch[id]={boothId:boothId,boothLabel:panelTitleTextFor(b),title:String((g&&g.title)||'無題'),url:String((g&&g.url)||''),place:String((g&&g.place)||''),publisher:String((g&&g.publisher)||''),memo:''};
    if(boothId&&favorites.indexOf(boothId)<0){favorites.push(boothId);saveFav();}
  }else{
    delete gameWatch[id];
  }
  saveGameWatch();
}
function panelTitleTextFor(b){
  var was=selected; selected=b;
  var t=panelTitleText();
  selected=was;
  return t;
}
function watchedGamesForSelected(){
  var out=[];
  for(var id in gameWatch){if(gameWatch.hasOwnProperty(id)&&(!selected||gameWatch[id].boothId===selected.id))out.push({id:id,item:gameWatch[id]});}
  out.sort(function(a,b){return String(a.item.title).localeCompare(String(b.item.title),'ja');});
  return out;
}

function isFav(id){return favorites.indexOf(id)>=0;}
function isVisited(id){return visited.indexOf(id)>=0;}
function isAgain(id){return again.indexOf(id)>=0;}
function toggleIn(list,id){var i=list.indexOf(id); if(i>=0)list.splice(i,1); else list.push(id);}
function resetView(){var w=window.innerWidth||document.documentElement.clientWidth||390;var h=window.innerHeight||document.documentElement.clientHeight||844;var z=isMobile()?0.58:0.78;view.zoom=z;view.x=(w-MAP_W*z)/2;view.y=isMobile()?210:150;applyView();}
function applyView(){var tf='translate('+view.x+' '+view.y+') scale('+view.zoom+')'; viewport.setAttribute('transform',tf); if(pOverlayLayer)pOverlayLayer.setAttribute('transform',tf); if(toiletLayer)toiletLayer.setAttribute('transform',tf); if(filterLayer)filterLayer.setAttribute('transform',tf); markerLayer.setAttribute('transform',tf); if(routeLayer)routeLayer.setAttribute('transform',tf); if(view.zoom>=1.6) svg.classList.add('zoomed'); else svg.classList.remove('zoomed'); drawMarkers();}
function sx(px){return px/view.zoom;}
function escAttr(v){return String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function markerGroup(b,body){return '<g transform="translate('+b.pinX+' '+b.pinY+') scale('+(1/view.zoom)+')" data-marker-for="'+escAttr(b.id)+'">'+body+'</g>';}
function drawMarkers(){
  var s='';
  for(var i=0;i<booths.length;i++){
    var b=booths[i];
    var marks=[];
    var ri=routeIndexOf(b.id);
    if(ri>=0)marks.push('route');
    else if(isFav(b.id))marks.push('star');
    if(isVisited(b.id))marks.push('visited');
    if(isAgain(b.id))marks.push('again');
    if(marks.length){
      var body='';
      var gap=10;
      var startX=-(marks.length-1)*gap/2;
      /* Put all status marks in one centered row directly above the booth number.
         The group is anchored to the booth center; only the symbols use fixed screen-size units. */
      var y=-8;
      for(var mi=0;mi<marks.length;mi++){
        var x=startX+mi*gap;
        if(marks[mi]==='star'){
          body+='<text x="'+x+'" y="'+y+'" font-size="12" font-weight="900" fill="#dc2626" stroke="#fff" stroke-width="1.8" paint-order="stroke" text-anchor="middle" dominant-baseline="middle">★</text>';
        }else if(marks[mi]==='route'){
          body+='<circle cx="'+x+'" cy="'+y+'" r="7" fill="#2563eb" stroke="#fff" stroke-width="1.8"></circle><text x="'+x+'" y="'+(y+.5)+'" font-size="9" font-weight="900" fill="#fff" text-anchor="middle" dominant-baseline="middle">'+(ri+1)+'</text>';
        }else if(marks[mi]==='visited'){
          body+='<circle cx="'+x+'" cy="'+y+'" r="4.4" fill="rgba(255,255,255,.88)" stroke="#16a34a" stroke-width="1.9"></circle>';
        }else if(marks[mi]==='again'){
          body+='<text x="'+x+'" y="'+y+'" font-size="13" font-weight="900" fill="#dc2626" stroke="#fff" stroke-width="1.9" paint-order="stroke" text-anchor="middle" dominant-baseline="middle">!</text>';
        }
      }
      s+=markerGroup(b,body);
    }
  }
  if(selected){
    var b=selected;
    /* Selected pin: the sharp tip is exactly at the booth center. */
    s+=markerGroup(b,'<path d="M0 0C-7.35 -9.45,-7.56 -18.9,0 -18.9C7.56 -18.9,7.35 -9.45,0 0Z" fill="#2563eb" stroke="#fff" stroke-width="1.8"></path><circle cx="0" cy="-13.0" r="2.55" fill="#fff"></circle>');
  }
  if(routeOn&&routeData&&routeData.legs.length){
    s=routeArrowsSvg()+s;
    var sp=routeStartPoint();
    s+='<g transform="translate('+sp.x+' '+sp.y+') scale('+(1/view.zoom)+')"><circle r="8" fill="#16a34a" stroke="#fff" stroke-width="2"></circle><text y=".5" font-size="8" font-weight="900" fill="#fff" text-anchor="middle" dominant-baseline="middle">出発</text></g>';
  }
  markerLayer.innerHTML=s;
  drawRoute();
}
function clientToMap(x,y){return {x:(x-view.x)/view.zoom,y:(y-view.y)/view.zoom};}
function pick(x,y){
  /* 1) exact hit, last booth wins (row cells sit above facility/zone boxes) */
  for(var i=booths.length-1;i>=0;i--){var b=booths[i]; if(x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h)return b;}
  /* 2) near miss: the smallest cells are only a few screen px tall, so fall back
     to the closest booth within ~14 screen px of the tap. */
  var tol=14/(view.zoom||1), best=null, bd=tol*tol;
  for(var j=0;j<booths.length;j++){
    var c=booths[j];
    if(c.type==='facility')continue;
    var dx=x<c.x?c.x-x:(x>c.x+c.w?x-(c.x+c.w):0);
    var dy=y<c.y?c.y-y:(y>c.y+c.h?y-(c.y+c.h):0);
    var d=dx*dx+dy*dy;
    if(d<bd){bd=d;best=c;}
  }
  return best;
}
function boothUrlValue(b){
  if(!b)return '';
  return String(cleanDisplay(b)||b.id||'').replace(/\s+/g,'').replace(/^\s+|\s+$/g,'');
}
function updateBoothUrl(b,replace){
  if(!b||!window.history||!window.URLSearchParams)return;
  try{
    var url=new URL(window.location.href);
    url.searchParams.set('booth',boothUrlValue(b));
    var next=url.pathname+url.search+url.hash;
    var current=window.location.pathname+window.location.search+window.location.hash;
    if(next===current)return;
    if(replace)window.history.replaceState({boothId:b.id},'',next);
    else window.history.pushState({boothId:b.id},'',next);
  }catch(e){}
}
function findBoothFromQueryValue(value){
  var raw=String(value||'').replace(/^\s+|\s+$/g,'');
  if(!raw)return null;
  var normRaw=normalizeSearchText(raw);
  var compactRaw=normalizeSearchText(raw.replace(/\s+/g,''));
  for(var i=0;i<booths.length;i++){
    var b=booths[i];
    if(String(b.id)===raw)return b;
    if(normalizeSearchText(boothUrlValue(b))===compactRaw)return b;
    var parts=boothSearchParts(b);
    for(var p=0;p<parts.length;p++){
      var part=String(parts[p]||'');
      if(normalizeSearchText(part)===normRaw || normalizeSearchText(part.replace(/\s+/g,''))===compactRaw)return b;
    }
  }
  for(var j=0;j<booths.length;j++){
    if(boothSearchHaystack(booths[j]).indexOf(normRaw)>=0 || boothSearchHaystack(booths[j]).indexOf(compactRaw)>=0)return booths[j];
  }
  return null;
}
function openBoothFromUrl(){
  try{
    var params=new URLSearchParams(window.location.search);
    var v=params.get('booth');
    if(!v)return false;
    var b=findBoothFromQueryValue(v);
    if(!b)return false;
    selectBooth(b,true,true);
    searchInput.value=boothSuggestionText(b);
    return true;
  }catch(e){return false;}
}
function selectBooth(b,center,replaceUrl){selected=b; if(infoPanel)infoPanel.className='show'; if(center)centerBooth(b); updatePanel(); drawMarkers(); updateBoothUrl(b,!!replaceUrl);}
function centerBooth(b){var w=window.innerWidth||390,h=window.innerHeight||844; view.x=w*.58-b.pinX*view.zoom; view.y=h*.58-b.pinY*view.zoom; applyView();}

function cleanInfoRowCode(row){
  var r=String(row||'');
  r=r.replace(/[！-～]/g,function(ch){return String.fromCharCode(ch.charCodeAt(0)-0xFEE0);});
  r=r.replace(/列/g,'').replace(/[左右]/g,'').replace(/\s+/g,'');
  return r.toUpperCase();
}
/* Zero-pad to two digits WITHOUT truncating longer numbers.
   ('0'+num).slice(-2) turned M149 into M49 and made M100-M148 collide with
   M00-M48 — the autumn map has rows of 111 and 149 booths. */
function pad2(n){n=String(n||'');return n.length<2?('0'+n):n;}
function cleanInfoNumber(num){
  var n=String(num||'');
  n=n.replace(/[！-～]/g,function(ch){return String.fromCharCode(ch.charCodeAt(0)-0xFEE0);});
  n=n.replace(/\s+/g,'').replace(/^0+(?=\d)/,'');
  return n;
}
function infoKeyVariantsFromPlace(place){
  var s=String(place||'');
  s=s.replace(/[！-～]/g,function(ch){return String.fromCharCode(ch.charCodeAt(0)-0xFEE0);});
  s=s.replace(/^([土日両])\s*[-ー－]\s*/,'');
  s=s.replace(/列/g,'').replace(/[左右]/g,'').replace(/[-ー－]/g,'').replace(/\s+/g,'');
  var keys=[];
  function add(k){k=String(k||'').toUpperCase(); if(k&&keys.indexOf(k)<0)keys.push(k);}
  var m=s.match(/^エリア0*(\d+)$/);
  if(m){var n=String(parseInt(m[1],10)); add('AREA'+n); add('エリア'+n); return keys;}
  m=s.match(/^特設0*(\d+)$/);
  if(m){var sp=String(parseInt(m[1],10)); add('SPECIAL'+sp); add('特設'+sp); return keys;}
  m=s.match(/^([A-Za-z]|[にろいはほへと横])0*(\d+)$/);
  if(m){var row=cleanInfoRowCode(m[1]); var num=cleanInfoNumber(m[2]); add(row+num); add(row+pad2(num)); return keys;}
  m=s.match(/^0*(\d+)$/);
  if(m){var an=String(parseInt(m[1],10)); add('AREA'+an); add('エリア'+an); return keys;}
  add(s);
  return keys;
}
function normalizeBoothInfoKey(s){
  var keys=infoKeyVariantsFromPlace(s);
  return keys.length?keys[0]:String(s||'').toUpperCase();
}
var BOOTH_INFO_INDEX={};
(function(){
  for(var i=0;i<BOOTH_INFO_ROWS.length;i++){
    var r=BOOTH_INFO_ROWS[i];
    var keys=infoKeyVariantsFromPlace(r[0]);
    for(var k=0;k<keys.length;k++){
      var key=keys[k];
      if(!BOOTH_INFO_INDEX[key])BOOTH_INFO_INDEX[key]=[];
      BOOTH_INFO_INDEX[key].push({place:r[0],name:r[1],cat:r[2],sub:r[3],url:r[4],games:r[5]});
    }
  }
})();
var BOOTH_DETAIL_INDEX={}, GAME_DETAIL_INDEX={};
(function(){
  var rows=(typeof BOOTH_DETAIL_ROWS!=='undefined'&&BOOTH_DETAIL_ROWS)||[];
  for(var i=0;i<rows.length;i++){
    var r=rows[i], keys=infoKeyVariantsFromPlace(r[0]);
    for(var k=0;k<keys.length;k++){
      var key=keys[k];
      if(!BOOTH_DETAIL_INDEX[key])BOOTH_DETAIL_INDEX[key]=[];
      BOOTH_DETAIL_INDEX[key].push({place:r[0],name:r[1],url:r[2],games:r[3],overview:r[4],gamesCount:r[5]});
    }
  }
  var grows=(typeof GAME_DETAIL_ROWS!=='undefined'&&GAME_DETAIL_ROWS)||[];
  for(var gi=0;gi<grows.length;gi++){
    var gr=grows[gi], gkeys=infoKeyVariantsFromPlace(gr[0]);
    for(var gk=0;gk<gkeys.length;gk++){
      var gkey=gkeys[gk];
      if(!GAME_DETAIL_INDEX[gkey])GAME_DETAIL_INDEX[gkey]=[];
      GAME_DETAIL_INDEX[gkey].push({place:gr[0],title:gr[1],description:gr[2],price:gr[3],players:gr[4],time:gr[5],age:gr[6],tags:gr[7],publisher:gr[8],url:gr[9],timeBucket:gr[10]||'',genre:gr[11]||'',genre2:gr[12]||'',playerTags:gr[13]||'',form:gr[14]||'',expansion:gr[15]||''});
    }
  }
})();
function boothInfoKeys(b){
  var keys=[];
  function add(k){k=String(k||'').toUpperCase(); if(k&&keys.indexOf(k)<0)keys.push(k);}
  if(!b||!b.num)return keys;
  if(b.special){
    var sp=String(parseInt(cleanInfoNumber(b.special),10));
    add('SPECIAL'+sp);
    add('特設'+sp);
    add('特設'+pad2(sp));
    return keys;
  }
  if(b.row){
    var row=cleanInfoRowCode(b.row);
    var num=cleanInfoNumber(b.num);
    add(row+num);
    add(row+pad2(num));
    return keys;
  }
  var n=cleanInfoNumber(b.num);
  add('AREA'+n);
  add('エリア'+n);
  return keys;
}
function boothInfosFor(b){
  var out=[], seen={};
  var keys=boothInfoKeys(b);
  for(var i=0;i<keys.length;i++){
    var arr=BOOTH_INFO_INDEX[keys[i]]||[];
    for(var j=0;j<arr.length;j++){
      var sig=arr[j].place+'|'+arr[j].name;
      if(!seen[sig]){seen[sig]=1;out.push(arr[j]);}
    }
  }
  return out;
}
function boothDetailsFor(b){
  var out=[], seen={};
  var keys=boothInfoKeys(b);
  for(var i=0;i<keys.length;i++){
    var arr=BOOTH_DETAIL_INDEX[keys[i]]||[];
    for(var j=0;j<arr.length;j++){
      var sig=arr[j].place+'|'+arr[j].name+'|'+arr[j].url;
      if(!seen[sig]){seen[sig]=1;out.push(arr[j]);}
    }
  }
  return out;
}
function gameDetailsFor(b){
  var out=[], seen={};
  var keys=boothInfoKeys(b);
  for(var i=0;i<keys.length;i++){
    var arr=GAME_DETAIL_INDEX[keys[i]]||[];
    for(var j=0;j<arr.length;j++){
      var sig=arr[j].title+'|'+arr[j].url;
      if(!seen[sig]){seen[sig]=1;out.push(arr[j]);}
    }
  }
  return out;
}
function selectedDetails(){
  if(!selected)return [];
  var details=boothDetailsFor(selected).filter(infoMatchesDay);
  if(!details.length)details=boothDetailsFor(selected);
  return details;
}
function selectedInfos(){
  if(!selected)return [];
  var infos=boothInfosFor(selected).filter(infoMatchesDay);
  if(!infos.length)infos=boothInfosFor(selected);
  return infos;
}
function escapeHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function linkHtml(url,label){return url?'<a target="_blank" rel="noopener" href="'+escapeHtml(url)+'">'+escapeHtml(label)+'</a>':'';}
function activateInfoTab(tab){
  activeInfoTab=tab||'memo';
  var panels={memo:memoTab,games:gamesTab};
  for(var p in panels){if(panels[p])panels[p].className='tabPanel'+(p===activeInfoTab?' active':'');}
  if(infoTabs){var bs=infoTabs.getElementsByTagName('button');for(var i=0;i<bs.length;i++){bs[i].className=(bs[i].getAttribute('data-tab')===activeInfoTab)?'active':'';}}
}
function infoDay(r){
  var p=String((r&&r.place)||'');
  var m=p.match(/^([土日両])\s*[-ー－]\s*/);
  return m?m[1]:'';
}
function displayInfoPlace(place){
  return String(place||'').replace(/^[土日両]\s*[-ー－]\s*/,'');
}
function infoMatchesDay(r){
  var d=infoDay(r);
  return !d || d==='両' || d===selectedDay;
}
function updateDaySwitch(){
  if(!daySwitch)return;
  var buttons=daySwitch.getElementsByTagName('button');
  for(var i=0;i<buttons.length;i++){
    buttons[i].className=(buttons[i].getAttribute('data-day')===selectedDay)?'active':'';
  }
}
function renderPanelInfo(){
  updateDaySwitch();
  if(!selected){
    if(panelLinks){panelLinks.className='boothTopLinks empty';panelLinks.textContent='ブースを選択すると詳細を表示';}
    if(overviewPanel){overviewPanel.className='overviewPanel empty';overviewPanel.textContent='概要データ未登録';}
    if(gamesPanel){gamesPanel.className='gamesPanel empty';gamesPanel.textContent='ゲームデータ未登録';}
    return;
  }
  var details=selectedDetails();
  var infos=selectedInfos();
  var d=details[0]||{};
  var fallback=infos[0]||{};
  var boothUrl=d.url||fallback.url||'';
  var gamesUrl=d.games||fallback.games||'';
  if(panelLinks){
    var links='';
    links+=linkHtml(boothUrl,'最新のブース情報をチェック');
    links+=linkHtml(gamesUrl,'最新のゲーム一覧をチェック');
    panelLinks.className=links?'boothTopLinks':'boothTopLinks empty';
    panelLinks.innerHTML=links||'リンク未登録';
  }
  if(overviewPanel){
    var overview='';
    for(var i=0;i<details.length;i++){
      if(details[i].overview){overview+=(overview?'\n\n':'')+details[i].overview;}
    }
    overviewPanel.className=overview?'overviewPanel':'overviewPanel empty';
    overviewPanel.innerHTML='<div class="overviewHeading">ブース概要</div><div class="overviewText">'+escapeHtml(overview||'概要データ未登録')+'</div>';
  }
  if(gamesPanel){
    var games=gameDetailsFor(selected).filter(infoMatchesDay);
    if(!games.length)games=gameDetailsFor(selected);
    if(!games.length){
      gamesPanel.className='gamesPanel empty';
      gamesPanel.textContent='ゲームデータ未登録';
    }else{
      gamesPanel.className='gamesPanel';
      var html='';
      for(var g=0;g<games.length;g++){
        var x=games[g];
        var meta=[];
        if(x.price)meta.push(x.price);
        if(x.players)meta.push(x.players+'人');
        if(x.time)meta.push(x.time+'分');
        if(x.age)meta.push(x.age);
        if(x.tags)meta.push(x.tags);
        var gid=gameInterestId(selected.id,x);
        var watched=isGameWatched(selected.id,x);
        html+='<div class="gameItem" data-game-id="'+escAttr(gid)+'"><div class="gameTitleRow"><div class="gameTitle">'+(x.url?linkHtml(x.url,x.title):escapeHtml(x.title||'無題'))+'</div><button type="button" class="gameWatchBtn '+(watched?'active':'')+'" data-game-id="'+escAttr(gid)+'">'+(watched?'★ 気になる':'☆ 気になる')+'</button></div>'+
          (meta.length?'<div class="gameMeta">'+escapeHtml(meta.join(' / '))+'</div>':'')+
          (x.description?'<div class="gameDescription">'+escapeHtml(x.description)+'</div>':'')+'</div>';
      }
      gamesPanel.innerHTML=html;
    }
  }
  activateInfoTab(activeInfoTab);
}
function renderWatchPanel(){
  if(!watchPanel)return;
  var watched=watchedGamesForSelected();
  if(!watched.length){watchPanel.className='watchPanel empty';watchPanel.textContent='気になるゲームはありません';return;}
  watchPanel.className='watchPanel';
  var html='';
  for(var i=0;i<watched.length;i++){
    var it=watched[i].item;
    html+='<div class="watchItem" data-watch-id="'+escAttr(watched[i].id)+'" data-booth-id="'+escAttr(it.boothId)+'"><div class="watchTitle">'+(it.url?'<a target="_blank" rel="noopener" href="'+escapeHtml(it.url)+'">'+escapeHtml(it.title)+'</a>':escapeHtml(it.title))+'</div><div class="watchMeta">'+escapeHtml(it.boothLabel||it.place||'')+'</div><button type="button" class="watchRemoveBtn" data-watch-id="'+escAttr(watched[i].id)+'">解除</button></div>';
  }
  watchPanel.innerHTML=html;
}

function updateMemoUi(){
  if(!memoInput)return;
  if(!selected){
    memoInput.value='';
    memoInput.disabled=true;
    memoInput.placeholder='ブースを選択するとメモできます';
  }else{
    memoInput.disabled=false;
    memoInput.placeholder='このブースのメモを入力';
    memoInput.value=memoFor(selected.id);
  }
  if(memoSaved)memoSaved.textContent='入力すると自動保存されます';
}

function favoriteLabel(b){
  var infos=boothInfosFor(b).filter(infoMatchesDay);
  if(infos.length){
    return displayInfoPlace(infos[0].place)+' / '+infos[0].name;
  }
  return cleanDisplay(b);
}
function panelTitleText(){
  if(!selected)return 'ブース未選択';
  var details=selectedDetails();
  if(details.length&&details[0].name){
    return displayInfoPlace(details[0].place)+' '+details[0].name;
  }
  var infos=selectedInfos();
  if(infos.length&&infos[0].name){
    return displayInfoPlace(infos[0].place)+' '+infos[0].name;
  }
  return cleanDisplay(selected);
}
function updatePanel(){
  panelTitle.textContent=panelTitleText();
  panelSub.textContent='';
  renderPanelInfo();
  updateMemoUi();
  if(selected){
    starBtn.textContent=isFav(selected.id)?'★ お気に入り':'☆ お気に入り';
    starBtn.className=isFav(selected.id)?'active':'';
    visitedBtn.textContent=isVisited(selected.id)?'● 行った':'○ 行った';
    visitedBtn.className=isVisited(selected.id)?'active':'';
    againBtn.textContent=isAgain(selected.id)?'! もう一度':'! もう一度';
    againBtn.className=isAgain(selected.id)?'active':'';
  } else {
    starBtn.className=''; visitedBtn.className=''; againBtn.className='';
  }
  if(routeOn)computeRoute();
  updateRouteUi();
  if(favCount)favCount.textContent=favorites.length+'件 '+((panel&&panel.className.indexOf('open')>=0)?'▴':'▾');
  favList.innerHTML='';
  if(!favorites.length){
    favList.innerHTML='<div style="font-size:9px;color:#64748b;font-weight:800;padding:2px 0">お気に入りはありません</div>';
  } else {
    for(var i=0;i<favorites.length;i++){
      var b=findById(favorites[i]); if(!b)continue;
      var item=document.createElement('div'); item.className='favItem'; item.setAttribute('data-id',b.id);
      var fri=routeIndexOf(b.id);
      item.innerHTML='<span>'+(fri>=0?'<i class="routeNo">'+(fri+1)+'</i>':'')+escapeHtml(favoriteLabel(b))+'</span><span class="favActions"><span class="visitDot '+(isVisited(b.id)?'done':'')+'" title="'+(isVisited(b.id)?'行った':'未訪問')+'" aria-label="'+(isVisited(b.id)?'行った':'未訪問')+'"></span><button>削除</button></span>';
      favList.appendChild(item);
    }
  }
  if(favGameList){
    var favGames=[];
    for(var gk in gameWatch){if(gameWatch.hasOwnProperty(gk))favGames.push({id:gk,item:gameWatch[gk]});}
    favGames.sort(function(a,b){return String(a.item.title).localeCompare(String(b.item.title),'ja');});
    if(!favGames.length){
      favGameList.innerHTML='<div style="font-size:9px;color:#64748b;font-weight:800;padding:2px 0">お気に入りゲームはありません</div>';
    } else {
      var gh='';
      for(var k=0;k<favGames.length;k++){
        var fg=favGames[k].item, gd=favGameDetail(favGames[k].id,fg), gm=[], gt='';
        if(gd){
          var tm=favRange(gd.time,'分'), pl=favRange(gd.players,'人'), pr=String(gd.price||'').replace(/^\s*-\s*$/,'');
          if(tm)gm.push('⏱'+tm); if(pr)gm.push(pr); if(pl)gm.push('👥'+pl);
          if(gd.genre)gt+='<span class="favGameGenre">'+escapeHtml(gd.genre)+'</span>';
          if(gd.genre2)gt+='<span class="favGameGenre">'+escapeHtml(gd.genre2)+'</span>';
        }
        gh+='<div class="favGameItem" data-booth-id="'+escAttr(fg.boothId)+'"><span><span class="favGameName">'+escapeHtml(fg.title||'無題')+'</span><small>'+escapeHtml(fg.boothLabel||fg.place||'')+'</small>'+(gm.length?'<span class="favGameMeta">'+escapeHtml(gm.join(' ・ '))+'</span>':'')+(gt?'<span class="favGameGenres">'+gt+'</span>':'')+'</span><button type="button" data-watch-id="'+escAttr(favGames[k].id)+'">解除</button></div>';
      }
      favGameList.innerHTML=gh;
    }
  }
  if(againList){
    againList.innerHTML='';
    if(!again.length){
      againList.innerHTML='<div style="font-size:9px;color:#64748b;font-weight:800;padding:2px 0">もう一回行くブースはありません</div>';
    } else {
      for(var j=0;j<again.length;j++){
        var ab=findById(again[j]); if(!ab)continue;
        var ai=document.createElement('div'); ai.className='againItem'; ai.setAttribute('data-id',ab.id);
        ai.innerHTML='<span>'+escapeHtml(favoriteLabel(ab))+'</span><button>解除</button>';
        againList.appendChild(ai);
      }
    }
  }
  fitFavPanel();
}
// お気に入りゲームの詳細（時間・価格・人数・ジャンル）は保存時ではなく表示時にゲームデータから引く
function favGameDetail(id,item){
  var b=findById(item.boothId); if(!b)return null;
  var games=gameDetailsFor(b);
  for(var i=0;i<games.length;i++)if(gameInterestId(b.id,games[i])===id)return games[i];
  return null;
}
// "-150" → "〜150分", "480-540" → "480〜540分", "120-120" → "120分", "-" → ""
function favRange(v,unit){
  var m=String(v||'').replace(/\s/g,'').split('-'), a=m[0]||'', z=m.length>1?(m[1]||''):'';
  if(!a&&!z)return '';
  if(a&&!z)return m.length>1?a+unit+'〜':a+unit;
  if(a===z)return a+unit;
  return a+'〜'+z+unit;
}
// ===== ルート検索: お気に入りブース（行った済みを除く）を回る最短ルート =====
// 会場をマス目に区切り、ブース・施設・トイレなどを通れないマスにして通路だけを歩く。
// 通路の中央を歩くよう壁際のマスは少し割高にし、各ブース間の距離から回る順番を最適化する。
var ROUTE_CELL=5;
var ROUTE_ENTRANCE={x:736.8,y:215,label:'キッチンカー出入口'}; // 出発地点（会場内側の通路上）
var routeOn=false, routeData=null, routeKey='', routeGrid=null, routeStartId='';
// ブースを開いて「そのブースから出発」を選ぶと、パネルを閉じてもそのブースを出発点にし続ける
function routeStartBooth(){return routeStartId?findById(routeStartId):null;}
function routeOpenBooth(){return (selected&&infoPanel&&infoPanel.className.indexOf('show')>=0)?selected:null;}
function buildRouteGrid(){
  var x0=183.42, y0=148.17, W=Math.ceil(1578.44/ROUTE_CELL), H=Math.ceil(834.83/ROUTE_CELL), N=W*H, block=new Uint8Array(N), pad=1.5;
  function mark(x,y,w,h){
    var c0=Math.max(0,Math.floor((x-pad-x0)/ROUTE_CELL)), c1=Math.min(W-1,Math.floor((x+w+pad-x0)/ROUTE_CELL));
    var r0=Math.max(0,Math.floor((y-pad-y0)/ROUTE_CELL)), r1=Math.min(H-1,Math.floor((y+h+pad-y0)/ROUTE_CELL));
    for(var r=r0;r<=r1;r++)for(var c=c0;c<=c1;c++){
      var cx=x0+(c+.5)*ROUTE_CELL, cy=y0+(r+.5)*ROUTE_CELL;
      if(cx>=x-pad&&cx<=x+w+pad&&cy>=y-pad&&cy<=y+h+pad)block[r*W+c]=1;
    }
  }
  for(var i=0;i<booths.length;i++){var b=booths[i]; if(b.w&&b.h)mark(b.x,b.y,b.w,b.h);}
  // 地図に描かれた色付きの区画（ブース列・トイレ・バックヤードなど）も通れない
  var skip={'#ffffff':1,'#f8fafc':1,'none':1,'':1};
  var rects=svg.querySelectorAll('#viewport rect, #toiletLayer rect');
  for(var j=0;j<rects.length;j++){
    var e=rects[j], f=(e.getAttribute('fill')||'').toLowerCase();
    if(skip[f]||e.getAttribute('class')==='rowBadgeRect')continue;
    var w=parseFloat(e.getAttribute('width'))||0, h=parseFloat(e.getAttribute('height'))||0, rx=parseFloat(e.getAttribute('x'))||0, ry=parseFloat(e.getAttribute('y'))||0;
    if(w<3&&h<3)continue;
    if(isRowBackground(rx,ry,w,h))continue;
    mark(rx,ry,w,h);
  }
  // 壁からの距離（マス数, 最大4）。通路の中央ほど大きい
  var clr=new Uint8Array(N), q=[], k;
  for(k=0;k<N;k++){if(block[k]){clr[k]=0;q.push(k);}else clr[k]=255;}
  for(var qi=0;qi<q.length;qi++){
    var u=q[qi], uc=u%W, ur=(u-uc)/W;
    if(clr[u]>=4)continue;
    for(var dr=-1;dr<=1;dr++)for(var dc=-1;dc<=1;dc++){
      var nr=ur+dr, nc=uc+dc; if(nr<0||nc<0||nr>=H||nc>=W)continue;
      var v=nr*W+nc; if(clr[v]>clr[u]+1){clr[v]=clr[u]+1;q.push(v);}
    }
  }
  return {x0:x0,y0:y0,W:W,H:H,block:block,clr:clr};
}
// ブース列の色付き背景（列全体に塗られた長方形）。ブースが無い部分は通れるので壁にせず、ブース1つ1つだけを壁にする
function isRowBackground(x,y,w,h){
  for(var i=0;i<booths.length;i++){var b=booths[i];if(b.type!=='row')continue;var cx=b.x+b.w/2,cy=b.y+b.h/2;if(cx>x&&cx<x+w&&cy>y&&cy<y+h)return true;}
  return false;
}
function routeCellOf(g,x,y){return Math.min(g.H-1,Math.max(0,Math.floor((y-g.y0)/ROUTE_CELL)))*g.W+Math.min(g.W-1,Math.max(0,Math.floor((x-g.x0)/ROUTE_CELL)));}
function routeCellXY(g,i){return {x:g.x0+(i%g.W+.5)*ROUTE_CELL,y:g.y0+(Math.floor(i/g.W)+.5)*ROUTE_CELL};}
// (tx,ty) に一番近い通れるマス。ブース矩形の周りを1マスずつ広げて探す
function routeNearestFree(g,x,y,w,h,tx,ty){
  var c0=Math.floor((x-g.x0)/ROUTE_CELL), c1=Math.floor((x+w-g.x0)/ROUTE_CELL), r0=Math.floor((y-g.y0)/ROUTE_CELL), r1=Math.floor((y+h-g.y0)/ROUTE_CELL);
  for(var k=0;k<40;k++){
    var best=-1, bd=Infinity;
    for(var r=r0-k;r<=r1+k;r++)for(var c=c0-k;c<=c1+k;c++){
      if(r!==r0-k&&r!==r1+k&&c!==c0-k&&c!==c1+k)continue;
      if(r<0||c<0||r>=g.H||c>=g.W||g.block[r*g.W+c])continue;
      var p=routeCellXY(g,r*g.W+c), d=(p.x-tx)*(p.x-tx)+(p.y-ty)*(p.y-ty);
      if(d<bd){bd=d;best=r*g.W+c;}
    }
    if(best>=0)return best;
  }
  return -1;
}
// ブースの入口候補。普通のブースは正面の1か所、エリアや施設など大きい区画は四辺それぞれから入れる
function routeAccessCells(g,b){
  var cx=b.x+b.w/2, cy=b.y+b.h/2, out=[routeNearestFree(g,b.x,b.y,b.w,b.h,cx,cy)];
  if(b.w>30||b.h>30){
    var sides=[[cx,b.y-ROUTE_CELL],[cx,b.y+b.h+ROUTE_CELL],[b.x-ROUTE_CELL,cy],[b.x+b.w+ROUTE_CELL,cy]];
    for(var i=0;i<sides.length;i++){
      var c=routeNearestFree(g,b.x,b.y,b.w,b.h,sides[i][0],sides[i][1]), p;
      if(c<0||out.indexOf(c)>=0)continue;
      p=routeCellXY(g,c);
      if(Math.abs(p.x-sides[i][0])+Math.abs(p.y-sides[i][1])<ROUTE_CELL*4)out.push(c);
    }
  }
  return out.filter(function(c){return c>=0;});
}
// 1点から全マスへの通路距離（上下左右のみ・ダイクストラ）。壁際1〜2マスは少し割高にして通路中央を通す
function routeDijkstra(g,src){
  var N=g.W*g.H, dist=new Float32Array(N), prev=new Int32Array(N), heap=[], PEN=[0,.45,.12,0,0];
  for(var i=0;i<N;i++){dist[i]=Infinity;prev[i]=-1;}
  function push(n,d){heap.push([d,n]);var k=heap.length-1;while(k>0){var p=(k-1)>>1;if(heap[p][0]<=heap[k][0])break;var t=heap[p];heap[p]=heap[k];heap[k]=t;k=p;}}
  function pop(){var top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;var k=0;for(;;){var l=2*k+1,r=l+1,m=k;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===k)break;var t=heap[m];heap[m]=heap[k];heap[k]=t;k=m;}}return top;}
  var DIRS=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1]];
  dist[src]=0; push(src,0);
  while(heap.length){
    var it=pop(), u=it[1]; if(it[0]>dist[u])continue;
    var uc=u%g.W, ur=(u-uc)/g.W;
    for(var q=0;q<4;q++){
      var nc=uc+DIRS[q][0], nr=ur+DIRS[q][1];
      if(nc<0||nr<0||nc>=g.W||nr>=g.H)continue;
      var v=nr*g.W+nc; if(g.block[v])continue;
      var nd=dist[u]+DIRS[q][2]*(1+PEN[Math.min(4,g.clr[v])]); if(nd<dist[v]){dist[v]=nd;prev[v]=u;push(v,dist[v]);} // Float32 に丸めた値で積む（比較のずれで展開漏れしないように）
    }
  }
  return {dist:dist,prev:prev};
}
// 回る順番と各ブースの入口を決める。C[a][b] は入口候補a→bの距離、own[a] は候補aのブース番号（0=出発点）。
// 候補の総数が少なければ全探索(DP)で厳密に最短、多いときは 2-opt＋Or-opt で順番を磨いてから入口を最適化。
function routeSolve(C,own,n){
  var K=own.length, i, j, k, s;
  var byStop=[]; for(i=0;i<=n;i++)byStop.push([]); for(k=0;k<K;k++)byStop[own[k]].push(k);
  if(n<=0)return [];
  if(n<=13&&(1<<n)*(K-1)*(K-1)<=4e7){
    var S=1<<n, dp=new Float64Array(S*K), par=new Int32Array(S*K);
    for(i=0;i<S*K;i++){dp[i]=Infinity;par[i]=-1;}
    for(k=1;k<K;k++)dp[(1<<(own[k]-1))*K+k]=C[0][k];
    for(s=1;s<S;s++)for(k=1;k<K;k++){
      var cur=dp[s*K+k]; if(cur===Infinity)continue;
      for(j=1;j<K;j++){var bit=1<<(own[j]-1);if(s&bit)continue;var ns=s|bit,v=cur+C[k][j];if(v<dp[ns*K+j]){dp[ns*K+j]=v;par[ns*K+j]=k;}}
    }
    var full=S-1, last=-1; for(k=1;k<K;k++)if(dp[full*K+k]<Infinity&&(last<0||dp[full*K+k]<dp[full*K+last]))last=k;
    if(last>0){
      var seq=[], st=full; while(last>0){seq.unshift(last);var pk=par[st*K+last];st&=~(1<<(own[last]-1));last=pk;}
      return seq;
    }
  }
  // ブース間の最短（入口の組み合わせの最小）で順番を決める
  var M=[]; for(i=0;i<=n;i++){M.push([]);for(j=0;j<=n;j++){var m=Infinity;byStop[i].forEach(function(a){byStop[j].forEach(function(b){if(C[a][b]<m)m=C[a][b];});});M[i].push(m);}}
  function len(p){var t=0;for(var x=0;x<p.length-1;x++)t+=M[p[x]][p[x+1]];return t;}
  var left=[], p=[0], at=0; for(i=1;i<=n;i++)left.push(i);
  while(left.length){var bi=0;for(i=1;i<left.length;i++)if(M[at][left[i]]<M[at][left[bi]])bi=i;at=left.splice(bi,1)[0];p.push(at);}
  var best=len(p), improved=true;
  while(improved){
    improved=false;
    for(i=0;i<p.length-2;i++)for(k=i+2;k<p.length;k++){ // 2-opt
      var q=p.slice(0,i+1).concat(p.slice(i+1,k+1).reverse(),p.slice(k+1)), L=len(q);
      if(L<best-1e-6){p=q;best=L;improved=true;}
    }
    for(var segLen=1;segLen<=3;segLen++)for(i=1;i+segLen<=p.length;i++){ // Or-opt: 1〜3か所をまとめて別の位置へ
      var seg=p.slice(i,i+segLen), rest=p.slice(0,i).concat(p.slice(i+segLen));
      for(j=1;j<=rest.length;j++){
        if(j===i)continue;
        var q2=rest.slice(0,j).concat(seg,rest.slice(j)), L2=len(q2);
        if(L2<best-1e-6){p=q2;best=L2;improved=true;break;}
        q2=rest.slice(0,j).concat(seg.slice().reverse(),rest.slice(j)); L2=len(q2);
        if(L2<best-1e-6){p=q2;best=L2;improved=true;break;}
      }
    }
  }
  // 決まった順番に対して入口の選び方を厳密に最適化（ビタビ）
  var layers=p.map(function(st){return byStop[st];}), cost=[[0]], back=[[-1]];
  for(i=1;i<layers.length;i++){
    cost.push([]);back.push([]);
    for(j=0;j<layers[i].length;j++){
      var bc=Infinity, bb=-1;
      for(k=0;k<layers[i-1].length;k++){var v2=cost[i-1][k]+C[layers[i-1][k]][layers[i][j]];if(v2<bc){bc=v2;bb=k;}}
      cost[i].push(bc);back[i].push(bb);
    }
  }
  var li=layers.length-1, bj=0; for(j=1;j<cost[li].length;j++)if(cost[li][j]<cost[li][bj])bj=j;
  var out=[]; for(i=li;i>0;i--){out.unshift(layers[i][bj]);bj=back[i][bj];}
  return out;
}
// 2点間の道順（描画用）。上下左右だけで進み、曲がるたびに割増しして曲がり角の少ない道を選ぶ。
// 状態=(マス, 進行方向) の A*。距離は表と同じ重み＋曲がり1回あたり ROUTE_TURN マス分。
var ROUTE_TURN=4;
function routeLegPath(g,src,dst){
  var N=g.W*g.H, dist=new Float32Array(N*4), prev=new Int32Array(N*4), heap=[], PEN=[0,.45,.12,0,0], DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
  var tc=dst%g.W, tr=(dst-tc)/g.W, i;
  for(i=0;i<N*4;i++){dist[i]=Infinity;prev[i]=-1;}
  function h(n){var c=n%g.W, r=(n-c)/g.W;return Math.abs(c-tc)+Math.abs(r-tr);}
  function push(st,d){heap.push([d+h((st/4)|0),d,st]);var k=heap.length-1;while(k>0){var p=(k-1)>>1;if(heap[p][0]<=heap[k][0])break;var t=heap[p];heap[p]=heap[k];heap[k]=t;k=p;}}
  function pop(){var top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;var k=0;for(;;){var l=2*k+1,r=l+1,m=k;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===k)break;var t=heap[m];heap[m]=heap[k];heap[k]=t;k=m;}}return top;}
  for(i=0;i<4;i++){dist[src*4+i]=0;push(src*4+i,0);}
  var end=-1;
  while(heap.length){
    var it=pop(), st=it[2]; if(it[1]>dist[st])continue;
    var u=(st/4)|0, du=st%4; if(u===dst){end=st;break;}
    var uc=u%g.W, ur=(u-uc)/g.W;
    for(var q=0;q<4;q++){
      var nc=uc+DIRS[q][0], nr=ur+DIRS[q][1];
      if(nc<0||nr<0||nc>=g.W||nr>=g.H)continue;
      var v=nr*g.W+nc; if(g.block[v])continue;
      var ns=v*4+q, nd=dist[st]+(1+PEN[Math.min(4,g.clr[v])])+(q!==du&&u!==src?ROUTE_TURN:0);
      if(nd<dist[ns]){dist[ns]=nd;prev[ns]=st;push(ns,dist[ns]);}
    }
  }
  if(end<0)return [src,dst];
  var cells=[]; for(var x=end;x>=0;x=prev[x])cells.push((x/4)|0);
  cells.reverse();
  // 同じ向きに続くマスはまとめて、曲がり角だけ残す
  var out=[cells[0]];
  for(i=1;i<cells.length-1;i++){var a0=cells[i]-cells[i-1], a1=cells[i+1]-cells[i];if(a0!==a1)out.push(cells[i]);}
  if(cells.length>1)out.push(cells[cells.length-1]);
  return out;
}
function routeStops(){
  var out=[];
  var sb=routeStartBooth();
  for(var i=0;i<favorites.length;i++){var b=findById(favorites[i]);if(b&&!isVisited(b.id)&&b!==sb)out.push(b);}
  return out;
}
function computeRoute(){
  var stops=routeStops(), sb=routeStartBooth(), key=(sb?sb.id:'kitchen')+'|'+stops.map(function(b){return b.id;}).join(',');
  if(key===routeKey)return;
  routeKey=key; routeData=null;
  if(!stops.length)return;
  if(!routeGrid)routeGrid=buildRouteGrid();
  var g=routeGrid, i, j;
  var start=sb?routeNearestFree(g,sb.x,sb.y,sb.w,sb.h,sb.pinX,sb.pinY):routeNearestFree(g,ROUTE_ENTRANCE.x,ROUTE_ENTRANCE.y,1,1,ROUTE_ENTRANCE.x,ROUTE_ENTRANCE.y);
  if(start<0)return;
  var tree0=routeDijkstra(g,start), cells=[start], own=[0], trees=[tree0], ok=[], skipped=[];
  for(i=0;i<stops.length;i++){
    var cand=routeAccessCells(g,stops[i]).filter(function(c){return tree0.dist[c]<Infinity;});
    if(!cand.length){skipped.push(stops[i]);continue;}
    ok.push(stops[i]);
    for(j=0;j<cand.length;j++){cells.push(cand[j]);own.push(ok.length);trees.push(routeDijkstra(g,cand[j]));}
  }
  if(!ok.length){routeData={stops:[],legs:[],skipped:skipped};return;}
  var C=[]; for(i=0;i<cells.length;i++){C.push([]);for(j=0;j<cells.length;j++)C[i].push(trees[i].dist[cells[j]]);}
  var seq=[0].concat(routeSolve(C,own,ok.length)), legs=[];
  for(i=0;i<seq.length-1;i++){
    legs.push(routeLegPath(g,cells[seq[i]],cells[seq[i+1]]).map(function(c){return routeCellXY(g,c);}));
  }
  routeData={stops:seq.slice(1).map(function(k){return ok[own[k]-1];}),legs:legs,skipped:skipped};
}
function routeIndexOf(id){if(!routeOn||!routeData)return -1;for(var i=0;i<routeData.stops.length;i++)if(routeData.stops[i].id===id)return i;return -1;}
function routePathD(){
  var d='';
  for(var i=0;i<routeData.legs.length;i++){var L=routeData.legs[i];for(var j=0;j<L.length;j++)d+=((i||j)?'L':'M')+L[j].x.toFixed(1)+' '+L[j].y.toFixed(1);}
  return d;
}
function drawRoute(){
  if(!routeLayer)return;
  if(!routeOn||!routeData||!routeData.legs.length){routeLayer.innerHTML='';return;}
  var d=routePathD();
  routeLayer.innerHTML='<path d="'+d+'" fill="none" stroke="#fff" stroke-width="8" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity=".95"/>'+
    '<path d="'+d+'" fill="none" stroke="#2563eb" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'+
    '<path class="routeFlow" d="'+d+'" fill="none" stroke="#bfdbfe" stroke-width="2" stroke-dasharray="2 10" stroke-linecap="round" vector-effect="non-scaling-stroke"/>';
}
// 進行方向の矢印（画面上で一定の大きさ）。線に沿って一定間隔に置く
function routeArrowsSvg(){
  var pts=[]; routeData.legs.forEach(function(L,i){(i?L.slice(1):L).forEach(function(p){pts.push(p);});});
  var gap=110/Math.max(.5,Math.min(2,view.zoom)), acc=gap*.5, s='';
  for(var i=1;i<pts.length;i++){
    var a=pts[i-1], b=pts[i], dx=b.x-a.x, dy=b.y-a.y, L=Math.sqrt(dx*dx+dy*dy), t=acc;
    while(t<L){
      var x=a.x+dx*t/L, y=a.y+dy*t/L, ang=Math.atan2(dy,dx)*180/Math.PI;
      s+='<g transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+') rotate('+ang.toFixed(0)+') scale('+(1/view.zoom)+')"><path d="M-3.5 -4.5L2.5 0L-3.5 4.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>';
      t+=gap;
    }
    acc=t-L;
  }
  return s;
}
function routeStartPoint(){var p=routeData&&routeData.legs.length?routeData.legs[0][0]:null;return p||ROUTE_ENTRANCE;}
function updateRouteUi(){
  if(routeBtn){routeBtn.className=routeOn?'active':''; routeBtn.textContent=routeOn?'ルート非表示':'ルート表示';}
  if(!routeInfo)return;
  if(!routeOn){routeInfo.className='';routeInfo.innerHTML='';return;}
  var html='', pickHtml, sb=routeStartBooth(), open=routeOpenBooth()||sb, fromB=!!(sb&&open===sb);
  if(open)pickHtml='<div class="routeEntry">出発</div><div class="routeStartPick" role="group" aria-label="出発地点"><button type="button" data-start="kitchen" class="'+(fromB?'':'active')+'">'+escapeHtml(ROUTE_ENTRANCE.label)+'</button><button type="button" data-start="booth" class="'+(fromB?'active':'')+'">'+escapeHtml(favoriteLabel(open))+'</button></div>';
  else pickHtml='<div class="routeEntry">出発: '+escapeHtml(ROUTE_ENTRANCE.label)+'</div>';
  if(!routeData||!routeData.stops.length)html='回るブースがありません（お気に入りのうち「行った」以外が対象）'+(routeData&&routeData.skipped.length?'<br>通路から届かず除外: '+escapeHtml(routeData.skipped.map(favoriteLabel).join('、')):'');
  else{
    html=routeData.stops.length+'ブースを番号順に回ります';
    if(routeData.skipped.length)html+='<br>通路から届かず除外: '+escapeHtml(routeData.skipped.map(favoriteLabel).join('、'));
  }
  routeInfo.className='show'; routeInfo.innerHTML=pickHtml+'<div class="routeSummary">'+html+'</div><div class="routeHint">「行った」ブースは除外</div>';
}
function findById(id){for(var i=0;i<booths.length;i++)if(booths[i].id===id)return booths[i]; return null;}
function escapeHtml(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function cleanDisplay(b){
  if(b&&b.special)return '特設'+('0'+String(parseInt(cleanInfoNumber(b.special),10))).slice(-2);
  var s=String((b&&b.display)||'');
  s=s.replace(/列/g,'').replace(/[左右]/g,'');
  // Remove day prefix before matching booth place to map booth id.
  // Examples: 土-A22 / 日-P68 / 両-に02 -> A22 / P68 / に02
  s=s.replace(/^[土日両]\s*[-ー－]\s*/,'');
  s=s.replace(/\s+/g,' ').replace(/^\s+|\s+$/g,'');
  if(b&&b.row&&b.num){
    var r=String(b.row).replace(/列/g,'').replace(/[左右]/g,'').replace(/\s+/g,'').replace(/^\s+|\s+$/g,'');
    return r? r+' '+b.num : String(b.num);
  }
  return s;
}
function normalizeSearchText(s){
  s=String(s||'').toLowerCase();
  s=s.replace(/[！-～]/g,function(ch){return String.fromCharCode(ch.charCodeAt(0)-0xFEE0);});
  s=s.replace(/列/g,'').replace(/[左右]/g,'');
  // Remove day prefix before matching booth place to map booth id.
  // Examples: 土-A22 / 日-P68 / 両-に02 -> A22 / P68 / に02
  s=s.replace(/^[土日両]\s*[-ー－]\s*/,'');
  s=s.replace(/\s+/g,'');
  return s;
}
function boothSearchParts(b){
  var parts=[];
  function add(v){if(v!==undefined&&v!==null&&String(v)!=='')parts.push(String(v));}
  var row=String((b&&b.row)||'').replace(/列/g,'').replace(/[左右]/g,'');
  var num=String((b&&b.num)||'');
  add(b&&b.display);
  add(cleanDisplay(b));
  if(b&&b.special){
    var sp=String(parseInt(cleanInfoNumber(b.special),10));
    add('特設'+sp);
    add('特設'+pad2(sp));
    add('SPECIAL'+sp);
    add('special'+sp);
    add(num);
  }else{
    add(row+num);
    add(row+' '+num);
    add(num);
    add(row);
  }
  var infos=boothInfosFor(b).filter(infoMatchesDay);
  if(!infos.length)infos=boothInfosFor(b);
  for(var i=0;i<infos.length;i++){
    add(infos[i].name);
    add(infos[i].place);
    add(displayInfoPlace(infos[i].place));
  }
  var details=boothDetailsFor(b).filter(infoMatchesDay);
  if(!details.length)details=boothDetailsFor(b);
  for(var di=0;di<details.length;di++){add(details[di].name); add(details[di].place);}
  var games=gameDetailsFor(b);
  for(var gi=0;gi<games.length;gi++){
    add(games[gi].title);
    add(games[gi].description);
    add(games[gi].publisher);
    add(games[gi].tags);
  }
  return parts;
}
function boothSearchHaystack(b){
  return boothSearchParts(b).map(normalizeSearchText).join('|');
}
function boothSuggestionText(b){
  var infos=boothInfosFor(b).filter(infoMatchesDay);
  if(!infos.length)infos=boothInfosFor(b);
  if(infos.length)return displayInfoPlace(infos[0].place)+' / '+infos[0].name;
  return cleanDisplay(b);
}
function gameSearchHaystack(g){
  var parts=[];
  function add(v){if(v!==undefined&&v!==null&&String(v)!=='')parts.push(String(v));}
  add(g&&g.title);
  add(g&&g.description);
  add(g&&g.publisher);
  add(g&&g.tags);
  add(g&&g.price);
  add(g&&g.players);
  add(g&&g.time);
  add(g&&g.age);
  add(g&&g.place);
  return parts.map(normalizeSearchText).join('|');
}
function gameSearchLabel(g){
  return String((g&&g.title)||'無題').replace(/^\[|\]$/g,'');
}
function cssEscapeValue(v){
  if(window.CSS&&CSS.escape)return CSS.escape(v);
  return String(v).replace(/["\\]/g,'\\$&');
}
function searchGameResults(q,limit){
  var results=[], seen={};
  for(var i=0;i<booths.length;i++){
    var b=booths[i];
    var games=gameDetailsFor(b);
    for(var gi=0;gi<games.length;gi++){
      var g=games[gi];
      var hay=gameSearchHaystack(g);
      if(hay.indexOf(q)<0)continue;
      var id=gameInterestId(b.id,g);
      if(seen[id])continue;
      seen[id]=1;
      results.push({booth:b,game:g,exact:hay.split('|').indexOf(q)>=0});
    }
  }
  results.sort(function(a,b){
    if(a.exact!==b.exact)return a.exact?-1:1;
    return gameSearchLabel(a.game).localeCompare(gameSearchLabel(b.game),'ja');
  });
  return results.slice(0,limit||30);
}
function selectGameResult(b,g){
  if(!b)return;
  suggestions.className='';
  searchInput.value=g?gameSearchLabel(g):boothSuggestionText(b);
  activeInfoTab='games';
  selectBooth(b,true);
  if(g&&gamesPanel){
    setTimeout(function(){
      try{
        var gid=gameInterestId(b.id,g);
        var el=gamesPanel.querySelector('[data-game-id="'+cssEscapeValue(gid)+'"]');
        if(el&&el.scrollIntoView)el.scrollIntoView({block:'nearest'});
      }catch(e){}
    },0);
  }
}
function updateSearchModeUi(){
  if(searchInput){
    searchInput.placeholder=searchMode==='game'?'ゲーム名・説明を検索':'ブース番号・サークル名を検索';
  }
  if(searchModeSelect)searchModeSelect.value=searchMode;
}
function setSearchMode(mode){
  searchMode=(mode==='game')?'game':'booth';
  updateSearchModeUi();
  suggestions.className='';
  suggestions.innerHTML='';
  if(searchInput)searchInput.focus();
}
function showBoothSuggestions(q){
  var n=0;
  for(var i=0;i<booths.length&&n<30;i++){
    var b=booths[i];
    if(boothSearchHaystack(b).indexOf(q)>=0){
      var btn=document.createElement('button');
      btn.className='suggestion';
      btn.setAttribute('data-id',b.id);
      btn.setAttribute('data-result-type','booth');
      btn.innerHTML='<span>'+escapeHtml(boothSuggestionText(b))+'</span><small>'+escapeHtml(cleanDisplay(b))+'</small>';
      suggestions.appendChild(btn);
      n++;
    }
  }
  return n;
}
function showGameSuggestions(q){
  var games=searchGameResults(q,30);
  var n=0;
  for(var i=0;i<games.length;i++){
    var r=games[i];
    var btn=document.createElement('button');
    btn.className='suggestion';
    btn.setAttribute('data-id',r.booth.id);
    btn.setAttribute('data-result-type','game');
    btn.setAttribute('data-game-key',gameInterestId(r.booth.id,r.game));
    btn.innerHTML='<span>'+escapeHtml(gameSearchLabel(r.game))+'</span><small>'+escapeHtml(boothSuggestionText(r.booth))+'</small>';
    suggestions.appendChild(btn);
    n++;
  }
  return n;
}
function showSuggestions(){
  var q=normalizeSearchText(searchInput.value);
  suggestions.innerHTML='';
  if(!q){suggestions.className='';return;}
  var n=searchMode==='game'?showGameSuggestions(q):showBoothSuggestions(q);
  suggestions.className=n?'show':'';
}
function findBoothSearchResult(q){
  var b=null;
  for(var i=0;i<booths.length;i++){
    var x=booths[i];
    var hx=boothSearchHaystack(x).split('|');
    for(var k=0;k<hx.length;k++){if(hx[k]===q){b=x;break;}}
    if(b)break;
  }
  if(!b){
    for(var j=0;j<booths.length;j++){
      var y=booths[j];
      if(boothSearchHaystack(y).indexOf(q)>=0){b=y;break;}
    }
  }
  return b;
}
function doSearch(){
  var q=normalizeSearchText(searchInput.value);
  if(!q)return;
  if(searchMode==='game'){
    var games=searchGameResults(q,1);
    if(games.length){
      selectGameResult(games[0].booth,games[0].game);
    }
    return;
  }
  var b=findBoothSearchResult(q);
  if(b){
    suggestions.className='';
    searchInput.value=boothSuggestionText(b);
    selectBooth(b,true);
  }
}
svg.addEventListener('mousedown',function(e){drag={sx:e.clientX,sy:e.clientY,vx:view.x,vy:view.y};dragging=false;});
window.addEventListener('mousemove',function(e){if(!drag)return;var dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;if(Math.abs(dx)+Math.abs(dy)>5)dragging=true;if(dragging){view.x=drag.vx+dx;view.y=drag.vy+dy;applyView();}});
window.addEventListener('mouseup',function(e){if(!drag)return;var was=dragging;drag=null;dragging=false;if(!was){var p=clientToMap(e.clientX,e.clientY),b=pick(p.x,p.y); if(b)selectBooth(b,false);}});
svg.addEventListener('touchstart',function(e){if(e.touches.length===1){var t=e.touches[0];drag={sx:t.clientX,sy:t.clientY,vx:view.x,vy:view.y};dragging=false;lastTouchDist=0;pinchStartZoom=0;pinchStartMap=null; pinchStartZoom=0; pinchStartMap=null;}else if(e.touches.length===2){drag=null;var a=e.touches[0],b=e.touches[1];lastTouchDist=Math.sqrt(Math.pow(a.clientX-b.clientX,2)+Math.pow(a.clientY-b.clientY,2)); pinchStartZoom=view.zoom; pinchStartMap=clientToMap((a.clientX+b.clientX)/2,(a.clientY+b.clientY)/2);}},{passive:false});
svg.addEventListener('touchmove',function(e){e.preventDefault(); if(e.touches.length===1&&drag){var t=e.touches[0],dx=t.clientX-drag.sx,dy=t.clientY-drag.sy;if(Math.abs(dx)+Math.abs(dy)>5)dragging=true;if(dragging){view.x=drag.vx+dx;view.y=drag.vy+dy;applyView();}}else if(e.touches.length===2){var a=e.touches[0],b=e.touches[1],d=Math.sqrt(Math.pow(a.clientX-b.clientX,2)+Math.pow(a.clientY-b.clientY,2)); if(lastTouchDist&&pinchStartZoom&&pinchStartMap){var nz=Math.max(.42,Math.min(8,pinchStartZoom*d/lastTouchDist)); var cx=(a.clientX+b.clientX)/2,cy=(a.clientY+b.clientY)/2;view.zoom=nz;view.x=cx-pinchStartMap.x*nz;view.y=cy-pinchStartMap.y*nz;applyView();}}},{passive:false});
svg.addEventListener('touchend',function(e){if(drag&&!dragging&&e.changedTouches.length){var t=e.changedTouches[0],p=clientToMap(t.clientX,t.clientY),b=pick(p.x,p.y); if(b)selectBooth(b,false);} drag=null;dragging=false;lastTouchDist=0;pinchStartZoom=0;pinchStartMap=null;});
svg.addEventListener('wheel',function(e){e.preventDefault();var old=view.zoom,nz=Math.max(.45,Math.min(7,old*(e.deltaY<0?1.14:.88)));var m=clientToMap(e.clientX,e.clientY);view.zoom=nz;view.x=e.clientX-m.x*nz;view.y=e.clientY-m.y*nz;applyView();},{passive:false});

// Keep map gestures independent from the iPhone file/Safari preview UI.
document.addEventListener('gesturestart',function(e){e.preventDefault();},{passive:false});
document.addEventListener('gesturechange',function(e){e.preventDefault();},{passive:false});
document.addEventListener('gestureend',function(e){e.preventDefault();},{passive:false});
function stopUi(e){e.stopPropagation();}
var uiEls=[document.querySelector('.controls'),resetBtn,suggestions,panel,infoPanel];
for(var uiI=0;uiI<uiEls.length;uiI++){if(uiEls[uiI]){uiEls[uiI].addEventListener('mousedown',stopUi);uiEls[uiI].addEventListener('touchstart',stopUi,{passive:true});}}

function clearSearch(){searchInput.value='';suggestions.className='';suggestions.innerHTML='';selected=null;if(infoPanel)infoPanel.className='';drawMarkers();searchInput.focus();}
searchInput.oninput=showSuggestions; searchInput.onkeydown=function(e){if(e.key==='Enter')doSearch();}; searchBtn.onclick=doSearch; if(searchModeSelect){searchModeSelect.onchange=function(){setSearchMode(searchModeSelect.value);};} if(clearSearchBtn)clearSearchBtn.onclick=clearSearch; resetBtn.onclick=resetView; closeBtn.onclick=function(){if(infoPanel)infoPanel.className='';}; if(favToggle)favToggle.onclick=function(){if(!panel)return; if(panel.className.indexOf('open')>=0)panel.className='favPanel'; else panel.className='favPanel open'; updatePanel();}; if(daySwitch){daySwitch.onclick=function(e){var n=e.target; if(n&&n.getAttribute&&n.getAttribute('data-day')){selectedDay=n.getAttribute('data-day'); updatePanel();}};} starBtn.onclick=function(){if(!selected)return;var idx=favorites.indexOf(selected.id); if(idx>=0)favorites.splice(idx,1); else favorites.push(selected.id); saveFav(); updatePanel(); drawMarkers();}; visitedBtn.onclick=function(){if(!selected)return;toggleIn(visited,selected.id);saveMarks();updatePanel();drawMarkers();}; againBtn.onclick=function(){if(!selected)return;toggleIn(again,selected.id);saveMarks();updatePanel();drawMarkers();};
if(infoTabs){infoTabs.onclick=function(e){var n=e.target;if(n&&n.getAttribute&&n.getAttribute('data-tab'))activateInfoTab(n.getAttribute('data-tab'));};}
if(gamesPanel){gamesPanel.onclick=function(e){var n=e.target;if(!n||!n.getAttribute||!n.getAttribute('data-game-id'))return;var gid=n.getAttribute('data-game-id');var games=gameDetailsFor(selected).filter(infoMatchesDay);if(!games.length)games=gameDetailsFor(selected);for(var i=0;i<games.length;i++){if(gameInterestId(selected.id,games[i])===gid){setGameWatched(selected.id,selected,games[i],!isGameWatched(selected.id,games[i]));updatePanel();drawMarkers();break;}}};}
if(watchPanel){watchPanel.onclick=function(e){var n=e.target;if(!n||!n.getAttribute)return;var wid=n.getAttribute('data-watch-id');if(wid&&n.className.indexOf('watchRemoveBtn')>=0){delete gameWatch[wid];saveGameWatch();updatePanel();drawMarkers();return;}var item=n;while(item&&item!==watchPanel&&!item.getAttribute('data-booth-id'))item=item.parentNode;if(item&&item.getAttribute('data-booth-id')){var b=findById(item.getAttribute('data-booth-id'));if(b)selectBooth(b,true);}};}
if(routeInfo){routeInfo.onclick=function(e){var n=e.target;while(n&&n!==routeInfo&&!(n.getAttribute&&n.getAttribute('data-start')))n=n.parentNode;if(!n||n===routeInfo)return;var ob=routeOpenBooth()||routeStartBooth();routeStartId=(n.getAttribute('data-start')==='booth'&&ob)?ob.id:'';updatePanel();drawMarkers();};}
if(routeBtn){routeBtn.onclick=function(){routeOn=!routeOn; routeStartId=''; routeKey=''; routeData=null; updatePanel(); drawMarkers();};}
if(favGameList){favGameList.onclick=function(e){var n=e.target;if(!n||!n.getAttribute)return;var wid=n.getAttribute('data-watch-id');if(wid){delete gameWatch[wid];saveGameWatch();updatePanel();drawMarkers();return;}var item=n;while(item&&item!==favGameList&&!item.getAttribute('data-booth-id'))item=item.parentNode;if(item&&item!==favGameList){var b=findById(item.getAttribute('data-booth-id'));if(b)selectBooth(b,true);}};}
if(memoInput){memoInput.oninput=function(){if(!selected)return;setMemoFor(selected.id,memoInput.value);if(memoSaved){memoSaved.textContent='保存しました';clearTimeout(memoSaved._t);memoSaved._t=setTimeout(function(){if(memoSaved)memoSaved.textContent='入力すると自動保存されます';},1200);}};}
suggestions.onclick=function(e){var n=e.target; while(n&&n!==suggestions&&!n.getAttribute('data-id'))n=n.parentNode; if(n&&n.getAttribute('data-id')){var b=findById(n.getAttribute('data-id')); if(!b)return; var gameKey=n.getAttribute('data-game-key'); if(gameKey){var games=gameDetailsFor(b); for(var gi=0;gi<games.length;gi++){if(gameInterestId(b.id,games[gi])===gameKey){selectGameResult(b,games[gi]);return;}}} searchInput.value=boothSuggestionText(b);suggestions.className='';selectBooth(b,true);}};
favList.onclick=function(e){var item=e.target; while(item&&item!==favList&&!item.getAttribute('data-id'))item=item.parentNode; if(!item)return; var id=item.getAttribute('data-id'); if(e.target.tagName==='BUTTON'){var ix=favorites.indexOf(id); if(ix>=0)favorites.splice(ix,1); saveFav(); updatePanel(); drawMarkers();}else{var b=findById(id); if(b)selectBooth(b,true);}}; if(againList){againList.onclick=function(e){var item=e.target; while(item&&item!==againList&&!item.getAttribute('data-id'))item=item.parentNode; if(!item)return; var id=item.getAttribute('data-id'); if(e.target.tagName==='BUTTON'){var ix=again.indexOf(id); if(ix>=0)again.splice(ix,1); saveMarks(); updatePanel(); drawMarkers();}else{var b=findById(id); if(b)selectBooth(b,true);}};}
userName=norm(storageGet('eventHallCurrentUserName.v1','guest')); userInput.value=userName; loadFav(); userInput.onchange=function(){userName=norm(userInput.value); userInput.value=userName; storageSet('eventHallCurrentUserName.v1',userName); loadFav(); updatePanel(); drawMarkers();};
window.addEventListener('popstate',function(){
  if(!openBoothFromUrl()){
    selected=null;
    if(infoPanel)infoPanel.className='';
    if(searchInput)searchInput.value='';
    updatePanel();
    drawMarkers();
  }
});
// お気に入りパネルは空いている高さまで伸ばす。スマホでは下のブース情報パネルの上端で止め、
// 地図が見えなくならないよう画面の高さの 55% を上限にする。
function fitFavPanel(){
  if(!panel||!favBody||panel.className.indexOf('open')<0)return;
  var top=favBody.getBoundingClientRect().top, vh=window.innerHeight, limit=vh;
  var tb=document.getElementById('tabBar'); if(tb&&tb.offsetParent!==null)limit=Math.min(limit,tb.getBoundingClientRect().top);
  if(infoPanel&&infoPanel.className.indexOf('show')>=0&&window.innerWidth<=700){var ir=infoPanel.getBoundingClientRect(); if(ir.top>top)limit=Math.min(limit,ir.top);}
  limit=Math.min(limit-8,top+vh*.55);
  favBody.style.maxHeight=Math.max(120,Math.floor(limit-top))+'px';
}
if(infoPanel&&window.MutationObserver)new MutationObserver(function(){if(routeOn){updatePanel();drawMarkers();}else fitFavPanel();}).observe(infoPanel,{attributes:true,attributeFilter:['class']});
window.addEventListener('resize',fitFavPanel);
// ブースリスト / ゲームリストの見出しで開閉。開閉状態はこの端末に保存する。
(function(){
  var KEY='eventHallFavSectionsCollapsed.v1', collapsed={};
  try{collapsed=JSON.parse(storageGet(KEY,'{}'))||{};}catch(e){collapsed={};}
  var btns=favBody?favBody.querySelectorAll('.favSectionToggle'):[];
  function apply(btn){
    var id=btn.getAttribute('data-target'), list=document.getElementById(id), shut=!!collapsed[id];
    if(list)list.style.display=shut?'none':'';
    btn.setAttribute('aria-expanded',shut?'false':'true');
    var arrow=btn.querySelector('.favSectionArrow'); if(arrow)arrow.textContent=shut?'▾':'▴';
  }
  for(var i=0;i<btns.length;i++){
    apply(btns[i]);
    btns[i].onclick=function(){var id=this.getAttribute('data-target'); collapsed[id]=!collapsed[id]; storageSet(KEY,JSON.stringify(collapsed)); apply(this);};
  }
})();
window.onresize=resetView; resetView(); updatePanel(); updateSearchModeUi(); openBoothFromUrl();

/* ======================================================================
   ゲーム一覧タブ
   GAME_DETAIL_ROWS (build_genres.py が付けた time_bucket / genre 付き) を
   一覧表示し、プレイ時間とジャンルで絞り込む。項目をタップすると地図タブに
   切り替わり、そのゲームのブースを選択して中心に寄せる。
   ====================================================================== */
var TAX=(typeof GAME_TAXONOMY!=='undefined'&&GAME_TAXONOMY)||{families:[],time:[]};
var appEl=document.getElementById('app'),
    tabBar=document.getElementById('tabBar'),
    glList=document.getElementById('glList'), glTime=document.getElementById('glTime'),
    glGenres=document.getElementById('glGenres'), glGenreToggle=document.getElementById('glGenreToggle'),
    glGenreCount=document.getElementById('glGenreCount'), glCount=document.getElementById('glCount'),
    glSearchEl=document.getElementById('glSearch'), glClearEl=document.getElementById('glClear'),
    glReset=document.getElementById('glReset');
var GL_PAGE=60;
var glFilter={time:{},genre:{},q:''}, glRows=[], glMatches=[], glShown=0;
var PLACE_BOOTH=null, BOOTH_NAME_CACHE={};

function placeBoothIndex(){
  if(PLACE_BOOTH)return PLACE_BOOTH;
  PLACE_BOOTH={};
  for(var i=0;i<booths.length;i++){
    var ks=boothInfoKeys(booths[i]);
    for(var k=0;k<ks.length;k++)if(!PLACE_BOOTH[ks[k]])PLACE_BOOTH[ks[k]]=booths[i];
  }
  return PLACE_BOOTH;
}
function boothForPlace(place){
  var idx=placeBoothIndex(), ks=infoKeyVariantsFromPlace(place);
  for(var i=0;i<ks.length;i++)if(idx[ks[i]])return idx[ks[i]];
  return null;
}
function circleNameForPlace(place){
  if(BOOTH_NAME_CACHE[place]!==undefined)return BOOTH_NAME_CACHE[place];
  var name='', b=boothForPlace(place);
  if(b){var infos=boothInfosFor(b); if(infos.length&&infos[0].name)name=infos[0].name;}
  BOOTH_NAME_CACHE[place]=name;
  return name;
}
function buildGlRows(){
  var rows=(typeof GAME_DETAIL_ROWS!=='undefined'&&GAME_DETAIL_ROWS)||[];
  for(var i=0;i<rows.length;i++){
    var r=rows[i];
    if(!r[1])continue;
    glRows.push({place:r[0],title:r[1],desc:r[2]||'',price:r[3]||'',players:r[4]||'',
                 time:r[5]||'',url:r[9]||'',tb:r[10]||'',g1:r[11]||'',g2:r[12]||'',q:''});
  }
}
function glHaystack(row){
  if(!row.q){
    row.q=normalizeSearchText([row.title,row.desc,displayInfoPlace(row.place),circleNameForPlace(row.place)].join(' '));
  }
  return row.q;
}
function timeLabel(tb){
  for(var i=0;i<TAX.time.length;i++)if(TAX.time[i][0]===tb)return TAX.time[i][1];
  return '';
}
function groupLists(state){
  var inc=[],exc=[],k;
  for(k in state){if(state[k]===1)inc.push(k);else if(state[k]===-1)exc.push(k);}
  return {inc:inc,exc:exc};
}
/* Within a group, include chips are OR'd and exclude chips are a NOT: a row is
   dropped when it carries any excluded value, even if it also matches an
   included one. Groups are AND'd with each other. */
function groupMatch(lists,vals){
  var i;
  for(i=0;i<lists.exc.length;i++)if(vals.indexOf(lists.exc[i])>=0)return false;
  if(!lists.inc.length)return true;
  for(i=0;i<lists.inc.length;i++)if(vals.indexOf(lists.inc[i])>=0)return true;
  return false;
}
function glMatch(row,tl,gl){
  if(!groupMatch(tl,[row.tb]))return false;
  if(!groupMatch(gl,row.g2?[row.g1,row.g2]:[row.g1]))return false;
  if(glFilter.q&&glHaystack(row).indexOf(glFilter.q)<0)return false;
  return true;
}
function activeCount(state){var n=0,k;for(k in state)if(state[k])n++;return n;}
/* Three states per chip: 未選択 → 含む(✓) → 除外(✕) → 未選択 */
function chipHtml(group,value,label){
  var st=glFilter[group][value]||0;
  var cls='glChip'+(st===1?' on':(st===-1?' off':''));
  var mark=st===1?'<span class="glChipTick">✓</span>':(st===-1?'<span class="glChipTick">✕</span>':'');
  return '<button type="button" class="'+cls+'" aria-pressed="'+(st===1?'true':'false')+'"'+
         ' title="'+(st===1?'含む':(st===-1?'除外':'未選択'))+'"'+
         ' data-g="'+escAttr(group)+'" data-v="'+escAttr(value)+'">'+mark+escapeHtml(label)+'</button>';
}
function renderGlChips(){
  var h='';
  for(var i=0;i<TAX.time.length;i++)h+=chipHtml('time',TAX.time[i][0],TAX.time[i][1]);
  if(glTime)glTime.innerHTML=h;
  var g='';
  for(var f=0;f<TAX.families.length;f++){
    var fam=TAX.families[f];
    g+='<div class="glFam"><div class="glFamLabel">'+escapeHtml(fam.name)+'</div><div class="glFamChips">';
    for(var j=0;j<fam.genres.length;j++)g+=chipHtml('genre',fam.genres[j],fam.genres[j]);
    g+='</div></div>';
  }
  if(glGenres)glGenres.innerHTML=g;
  if(glGenreCount)glGenreCount.textContent=activeCount(glFilter.genre)?'('+activeCount(glFilter.genre)+')':'';
  var active=activeCount(glFilter.time)+activeCount(glFilter.genre);
  if(glReset)glReset.className=active?'show':'';
}
function glItemHtml(row,i){
  var meta=displayInfoPlace(row.place);
  var cn=circleNameForPlace(row.place);
  if(cn)meta+=' / '+cn;
  var sub=[];
  if(row.players&&row.players!=='-')sub.push(row.players+'人');
  if(row.time&&row.time!=='-')sub.push(row.time+'分');
  if(row.price&&row.price!=='¥0')sub.push(row.price);
  var tags='';
  if(row.tb)tags+='<span class="glTag t-'+row.tb+'">'+escapeHtml(timeLabel(row.tb))+'</span>';
  if(row.g1)tags+='<span class="glTag g">'+escapeHtml(row.g1)+'</span>';
  if(row.g2)tags+='<span class="glTag g">'+escapeHtml(row.g2)+'</span>';
  /* The card is a <div>, not a <button>: the game-page link has to be a real
     <a>, and an anchor inside a button is invalid. Only the inner button
     carries data-i, so tapping the link never triggers the map jump. */
  return '<div class="glItem">'+
    '<button type="button" class="glItemMain" data-i="'+i+'">'+
      '<div class="glTitle">'+escapeHtml(row.title)+'</div>'+
      (row.desc?'<div class="glDesc">'+escapeHtml(row.desc)+'</div>':'')+
      '<div class="glMeta"><b>'+escapeHtml(meta)+'</b>'+(sub.length?' ・ '+escapeHtml(sub.join(' ・ ')):'')+'</div>'+
      (tags?'<div class="glTags">'+tags+'</div>':'')+
    '</button>'+
    '<div class="glLinks">'+
      (row.url?'<a class="glLink" href="'+escAttr(row.url)+'" target="_blank" rel="noopener">ゲーム情報 ↗</a>':'')+
      '<span class="glGoMap" data-i="'+i+'">地図で見る →</span>'+
    '</div>'+
    '</div>';
}
function renderGlPage(reset){
  if(!glList)return;
  if(reset){glList.innerHTML='';glShown=0;}
  var end=Math.min(glShown+GL_PAGE,glMatches.length), h='';
  for(var i=glShown;i<end;i++)h+=glItemHtml(glMatches[i],i);
  if(!glMatches.length){glList.innerHTML='<div class="glEmpty">条件に合うゲームがありません</div>';}
  else{glList.insertAdjacentHTML('beforeend',h);}
  glShown=end;
}
/* 「もっと見る」は押さずに済むよう、スクロールで自動的に続きを足す。
   タブが非表示のうちは clientHeight が 0 なので、そのときは足さない
   (0 <= 0 が永久に成り立ち、全件を一度に描いてしまうため)。 */
function glAutoFill(){
  if(!glList)return;
  var guard=0;
  while(glShown<glMatches.length&&glList.clientHeight>0&&
        glList.scrollHeight<=glList.clientHeight+8&&guard++<60)renderGlPage(false);
}
function glOnScroll(){
  if(!glList||glShown>=glMatches.length)return;
  if(glList.scrollTop+glList.clientHeight>=glList.scrollHeight-600)renderGlPage(false);
}
function applyGlFilter(){
  glMatches=[];
  var tl=groupLists(glFilter.time), gl=groupLists(glFilter.genre);
  for(var i=0;i<glRows.length;i++)if(glMatch(glRows[i],tl,gl))glMatches.push(glRows[i]);
  if(glCount)glCount.textContent=glMatches.length+'件'+(glRows.length!==glMatches.length?' / 全'+glRows.length+'件':'');
  renderGlPage(true);
  if(glList)glList.scrollTop=0;
  glAutoFill();
}
function switchTab(name){
  if(!appEl)return;
  var cls=appEl.className.replace(/\btab-games\b/,'').trim();
  appEl.className=(name==='games')?(cls+' tab-games').trim():cls;
  if(tabBar){
    var bs=tabBar.getElementsByTagName('button');
    for(var i=0;i<bs.length;i++)bs[i].className=(bs[i].getAttribute('data-tab')===name)?'active':'';
  }
  if(name==='games'){
    if(!glShown&&glMatches.length===0&&glRows.length)applyGlFilter();
    glAutoFill();
  }
}
function openGameOnMap(row){
  var b=boothForPlace(row.place);
  if(!b)return;
  switchTab('map');
  if(view.zoom<1.5){view.zoom=1.8;}
  var games=gameDetailsFor(b), hit=null;
  for(var i=0;i<games.length;i++){
    if((row.url&&games[i].url===row.url)||games[i].title===row.title){hit=games[i];break;}
  }
  selectGameResult(b,hit);
}
if(tabBar){
  tabBar.onclick=function(e){
    var n=e.target;
    while(n&&n!==tabBar&&!n.getAttribute('data-tab'))n=n.parentNode;
    if(n&&n!==tabBar)switchTab(n.getAttribute('data-tab'));
  };
}
function glChipClick(e){
  var n=e.target;
  while(n&&!n.getAttribute&&n.parentNode)n=n.parentNode;
  while(n&&n.getAttribute&&!n.getAttribute('data-g'))n=n.parentNode;
  if(!n||!n.getAttribute)return;
  var g=n.getAttribute('data-g'), v=n.getAttribute('data-v');
  if(!g)return;
  var st=glFilter[g][v]||0;
  st=(st===0)?1:((st===1)?-1:0);
  if(st)glFilter[g][v]=st; else delete glFilter[g][v];
  renderGlChips();
  applyGlFilter();
}
if(glTime)glTime.onclick=glChipClick;
if(glGenres)glGenres.onclick=glChipClick;
if(glGenreToggle)glGenreToggle.onclick=function(){
  var open=appEl.className.indexOf('gl-genres-open')>=0;
  appEl.className=open?appEl.className.replace(/\s*gl-genres-open/,''):(appEl.className+' gl-genres-open').trim();
};
if(glList)glList.onclick=function(e){
  var n=e.target;
  while(n&&n!==glList&&!(n.getAttribute&&n.getAttribute('data-i')))n=n.parentNode;
  if(!n||n===glList)return;
  var row=glMatches[parseInt(n.getAttribute('data-i'),10)];
  if(row)openGameOnMap(row);
};
if(glList)glList.onscroll=glOnScroll;
if(glReset)glReset.onclick=function(){glFilter.time={};glFilter.genre={};renderGlChips();applyGlFilter();};
if(glSearchEl)glSearchEl.oninput=function(){glFilter.q=normalizeSearchText(glSearchEl.value);applyGlFilter();};
if(glClearEl)glClearEl.onclick=function(){if(glSearchEl)glSearchEl.value='';glFilter.q='';applyGlFilter();};
buildGlRows();
renderGlChips();
applyGlFilter();
})();

(function(){
  function lockWidth(){
    var h=(window.visualViewport&&window.visualViewport.height?window.visualViewport.height:window.innerHeight)+'px';
    document.documentElement.style.width='100vw';
    document.documentElement.style.maxWidth='100vw';
    document.documentElement.style.height=h;
    document.documentElement.style.overflow='hidden';
    document.body.style.width='100vw';
    document.body.style.maxWidth='100vw';
    document.body.style.height=h;
    document.body.style.overflow='hidden';
    var app=document.getElementById('app');
    if(app){app.style.height=h;app.style.overflow='hidden';}
    window.scrollTo(0,0);
  }

  document.addEventListener('touchmove',function(e){
    var t=e.target;
    while(t&&t!==document.body){
      if(t.id==='mapSvg'||t.id==='panel'||t.id==='infoPanel'||t.id==='suggestions'||t.id==='gameListView'||(t.classList&&(t.classList.contains('controls')||t.classList.contains('searchRow')||t.classList.contains('userRow')))||t.tagName==='INPUT'||t.tagName==='TEXTAREA')return;
      t=t.parentNode;
    }
    e.preventDefault();
  },{passive:false});
  window.addEventListener('load',lockWidth);
  window.addEventListener('resize',lockWidth);
  if(window.visualViewport)window.visualViewport.addEventListener('resize',lockWidth);
  window.addEventListener('orientationchange',function(){setTimeout(lockWidth,80);});
  lockWidth();
})();


(function(){
  var btn=document.getElementById('downloadHtmlBtn');
  var hint=document.getElementById('offlineHint');
  var hintText=document.getElementById('offlineHintText');
  var hintClose=document.getElementById('offlineHintClose');
  var fileName='event_hall_booth_map_offline.html';
  function showHint(msg){
    if(!hint||!hintText)return;
    hintText.textContent=msg;
    hint.className='show';
    clearTimeout(showHint._t);
    showHint._t=setTimeout(function(){hint.className='';},7000);
  }
  if(hintClose)hintClose.onclick=function(e){e.stopPropagation(); if(hint)hint.className='';};
  function currentHtml(){
    var clone=document.documentElement.cloneNode(true);
    var h=clone.querySelector('#offlineHint');
    if(h)h.className='';
    return '<!doctype html>\n'+clone.outerHTML;
  }
  async function saveOfflineCopy(){
    var html=currentHtml();
    var blob=new Blob([html],{type:'text/html;charset=utf-8'});
    var file=null;
    try{ file=new File([blob],fileName,{type:'text/html'}); }catch(_){ file=null; }
    // iPhone/iPad: Web Share with files is the most reliable way to save to Files.
    if(file && navigator.canShare && navigator.canShare({files:[file]}) && navigator.share){
      try{
        await navigator.share({files:[file],title:'ゲムマ2026春 デジタルマップ',text:'オフラインHTMLコピー'});
        showHint('共有メニューから「ファイルに保存」を選ぶと、オフラインで開けます。');
        return;
      }catch(err){
        // User cancellation falls through to normal download.
      }
    }
    // Android/desktop: direct download.
    try{
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a');
      a.href=url;
      a.download=fileName;
      a.rel='noopener';
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){URL.revokeObjectURL(url); if(a&&a.parentNode)a.parentNode.removeChild(a);},1500);
      showHint('HTMLを保存しました。スマホではダウンロード/ファイルアプリから開けます。');
      return;
    }catch(err2){}
    // Last fallback: open a new tab. The user can save/share from the browser UI.
    try{
      var reader=new FileReader();
      reader.onload=function(){
        window.open(reader.result,'_blank','noopener');
        showHint('新しい画面を開きました。共有/保存からファイルに保存してください。');
      };
      reader.readAsDataURL(blob);
    }catch(err3){
      alert('保存できませんでした。ブラウザの共有メニューからページを保存してください。');
    }
  }
  if(btn){
    btn.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      saveOfflineCopy();
    },false);
  }
  // GitHub Pages offline support: upload this HTML together with sw.js and manifest.webmanifest.
  if('serviceWorker' in navigator && location.protocol.indexOf('http')===0){
    window.addEventListener('load',function(){
      navigator.serviceWorker.register('./sw.js').then(function(reg){
        showHint('このページはオフライン用にキャッシュされます。ホーム画面に追加すると使いやすいです。');
      }).catch(function(){
        // Single HTML still works; the download button can save an offline copy.
      });
    });
  }






})();

// Prevent browser/page zoom; keep zooming limited to the SVG canvas controls.
document.addEventListener('gesturestart', function(e){ e.preventDefault(); }, {passive:false});
document.addEventListener('gesturechange', function(e){ e.preventDefault(); }, {passive:false});
document.addEventListener('gestureend', function(e){ e.preventDefault(); }, {passive:false});
window.addEventListener('wheel', function(e){ if(e.ctrlKey || e.metaKey){ e.preventDefault(); } }, {passive:false});
window.addEventListener('keydown', function(e){
  var k=e.key || '';
  if((e.ctrlKey || e.metaKey) && (k==='+' || k==='-' || k==='=' || k==='0')) e.preventDefault();
}, {passive:false});

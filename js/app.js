// Extracted application logic from index.html. Depends on js/data.js.
(function(){
// Special/facility booths now come from data.js (SPECIAL_BOOTHS_DATA).
var SPECIAL_BOOTHS=(typeof SPECIAL_BOOTHS_DATA!=='undefined'&&SPECIAL_BOOTHS_DATA)||[];
booths=booths.concat(SPECIAL_BOOTHS);
var colors={"bg":"#f8fafc","wall":"#9da3a6","hall":"#ffffff","facility":"#f4f0e8","booth":"#efc247","trpg":"#d17142","purple":"#9a7aaa","green":"#b8c889","blue":"#c8d8ef","red":"#d80b21","border":"#111827","title":"#8e9499","pink":"#d0008b","cyan":"#079bd3","detail":"#374151"};
var svg=document.getElementById('mapSvg'), viewport=document.getElementById('viewport'), pOverlayLayer=document.getElementById('pOverlayLayer'), markerLayer=document.getElementById('markerLayer'), toiletLayer=document.getElementById('toiletLayer');
var searchInput=document.getElementById('searchInput'), searchBtn=document.getElementById('searchBtn'), clearSearchBtn=document.getElementById('clearSearchBtn'), searchModeSelect=document.getElementById('searchModeSelect'), suggestions=document.getElementById('suggestions'), resetBtn=document.getElementById('resetBtn');
var userInput=document.getElementById('userInput'), panel=document.getElementById('panel'), infoPanel=document.getElementById('infoPanel'), favToggle=document.getElementById('favToggle'), favBody=document.getElementById('favBody'), favCount=document.getElementById('favCount'), panelTitle=document.getElementById('panelTitle'), panelSub=document.getElementById('panelSub'), panelInfo=document.getElementById('panelInfo'), panelLinks=document.getElementById('panelLinks'), infoTabs=document.getElementById('infoTabs'), memoTab=document.getElementById('memoTab'), overviewTab=document.getElementById('overviewTab'), gamesTab=document.getElementById('gamesTab'), overviewPanel=document.getElementById('overviewPanel'), gamesPanel=document.getElementById('gamesPanel'), watchTab=document.getElementById('watchTab'), watchPanel=document.getElementById('watchPanel'), memoInput=document.getElementById('memoInput'), memoSaved=document.getElementById('memoSaved'), daySwitch=document.getElementById('daySwitch'), starBtn=document.getElementById('starBtn'), visitedBtn=document.getElementById('visitedBtn'), againBtn=document.getElementById('againBtn'), favList=document.getElementById('favList'), againList=document.getElementById('againList'), closeBtn=document.getElementById('closeBtn');
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
function applyView(){var tf='translate('+view.x+' '+view.y+') scale('+view.zoom+')'; viewport.setAttribute('transform',tf); if(pOverlayLayer)pOverlayLayer.setAttribute('transform',tf); if(toiletLayer)toiletLayer.setAttribute('transform',tf); markerLayer.setAttribute('transform',tf); if(view.zoom>=1.6) svg.classList.add('zoomed'); else svg.classList.remove('zoomed'); drawMarkers();}
function sx(px){return px/view.zoom;}
function escAttr(v){return String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function markerGroup(b,body){return '<g transform="translate('+b.pinX+' '+b.pinY+') scale('+(1/view.zoom)+')" data-marker-for="'+escAttr(b.id)+'">'+body+'</g>';}
function drawMarkers(){
  var s='';
  for(var i=0;i<booths.length;i++){
    var b=booths[i];
    var marks=[];
    if(isFav(b.id))marks.push('star');
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
  markerLayer.innerHTML=s;
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
      GAME_DETAIL_INDEX[gkey].push({place:gr[0],title:gr[1],description:gr[2],price:gr[3],players:gr[4],time:gr[5],age:gr[6],tags:gr[7],publisher:gr[8],url:gr[9]});
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
  if(favCount)favCount.textContent=favorites.length+'件 '+((panel&&panel.className.indexOf('open')>=0)?'▴':'▾');
  favList.innerHTML='';
  if(!favorites.length){
    favList.innerHTML='<div style="font-size:9px;color:#64748b;font-weight:800;padding:2px 0">お気に入りはありません</div>';
  } else {
    for(var i=0;i<favorites.length;i++){
      var b=findById(favorites[i]); if(!b)continue;
      var item=document.createElement('div'); item.className='favItem'; item.setAttribute('data-id',b.id);
      item.innerHTML='<span>'+escapeHtml(favoriteLabel(b))+'</span><span class="favActions"><span class="visitDot '+(isVisited(b.id)?'done':'')+'" title="'+(isVisited(b.id)?'行った':'未訪問')+'" aria-label="'+(isVisited(b.id)?'行った':'未訪問')+'"></span><button>削除</button></span>';
      favList.appendChild(item);
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
window.onresize=resetView; resetView(); updatePanel(); updateSearchModeUi(); openBoothFromUrl();
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
      if(t.id==='mapSvg'||t.id==='panel'||t.id==='infoPanel'||t.id==='suggestions'||(t.classList&&(t.classList.contains('controls')||t.classList.contains('searchRow')||t.classList.contains('userRow')))||t.tagName==='INPUT'||t.tagName==='TEXTAREA')return;
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


/* ===== MONO PLANNER 추가 기능: 순수 로직/렌더 ===== */
/* MPCore — 순수 로직 (DOM/Firebase 의존 없음). 브라우저(window.MPCore)와 node 테스트 양쪽에서 사용 */
(function(root){
'use strict';
var C = {};

/* ───────── 날짜/시간 ───────── */
function p2(n){ return (n<10?'0':'')+n; }
C.p2 = p2;
C.minToHHMM = function(m){ if(m==null||isNaN(m)) return ''; m=Math.max(0,Math.min(1439,Math.round(m))); return p2(Math.floor(m/60))+':'+p2(m%60); };
C.hhmmToMin = function(s){ if(!s) return null; var m=/^(\d{1,2}):(\d{2})$/.exec(String(s).trim()); if(!m) return null; var h=+m[1],mi=+m[2]; if(h>23||mi>59) return null; return h*60+mi; };
C.parseDate = function(s){ var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||''); if(!m) return null; return new Date(Date.UTC(+m[1],+m[2]-1,+m[3])); };
C.fmtDate = function(d){ return d.getUTCFullYear()+'-'+p2(d.getUTCMonth()+1)+'-'+p2(d.getUTCDate()); };
C.addDays = function(s,n){ var d=C.parseDate(s); if(!d) return s; d.setUTCDate(d.getUTCDate()+n); return C.fmtDate(d); };
C.diffDays = function(a,b){ var da=C.parseDate(a),db=C.parseDate(b); if(!da||!db) return 0; return Math.round((db-da)/86400000); };
C.dow = function(s){ var d=C.parseDate(s); return d?d.getUTCDay():0; };            // 0=일
C.weekStart = function(s){ var w=C.dow(s); return C.addDays(s, -((w+6)%7)); };       // 월요일 시작
C.monthStart = function(s){ return s.slice(0,8)+'01'; };
C.monthEnd = function(s){ var d=C.parseDate(s); var e=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)); return C.fmtDate(e); };
C.rangeDates = function(a,b,cap){ var out=[],cur=a,n=0; cap=cap||400; while(cur<=b && n<cap){ out.push(cur); cur=C.addDays(cur,1); n++; } return out; };
var DOWK=['일','월','화','수','목','금','토'];
C.dowKo = function(s){ return DOWK[C.dow(s)]; };
C.mdLabel = function(s){ return (+s.slice(5,7))+'/'+(+s.slice(8,10)); };
C.mdKo = function(s){ return (+s.slice(5,7))+'월 '+(+s.slice(8,10))+'일'; };

/* 학습시간 문자열 "H:MM:SS" ↔ 초 */
C.parseHMS = function(t){ if(!t||typeof t!=='string') return 0; var p=t.split(':'); if(p.length<2) return 0; var h=parseInt(p[0],10)||0,m=parseInt(p[1],10)||0,s=parseInt(p[2],10)||0; return h*3600+m*60+s; };
C.fmtHMS = function(sec){ sec=Math.max(0,Math.round(sec||0)); var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60; return h+':'+p2(m)+':'+p2(s); };
C.fmtHM = function(sec){ sec=Math.max(0,Math.round(sec||0)); var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60); if(h&&m) return h+'h '+p2(m)+'m'; if(h) return h+'h'; return m+'m'; };

/* ───────── 일정(스케줄) ───────── */
var MIN_START = 6*60, MAX_START = 23*60;
C.START_MIN = MIN_START; C.START_MAX = MAX_START;
C.effStart = function(s){ return (s.studentStartMin!=null && !isNaN(s.studentStartMin)) ? s.studentStartMin : (s.startMin!=null?s.startMin:null); };
C.effEnd = function(s){ var st=C.effStart(s); if(st==null) return null; return st+(s.durationMin||60); };
C.clampStart = function(min){ min=Math.round(min/10)*10; return Math.max(MIN_START,Math.min(MAX_START,min)); };

/* 같은 날 시간이 겹치는 일정 찾기. cand: {studentUid,date,startMin|studentStartMin,durationMin,id?} */
C.findCollisions = function(list, cand, ignoreId){
  var cs=C.effStart(cand), ce=C.effEnd(cand); if(cs==null) return [];
  return list.filter(function(s){
    if(s.id && (s.id===ignoreId || s.id===cand.id)) return false;
    if(s.studentUid!==cand.studentUid || s.date!==cand.date) return false;
    var ss=C.effStart(s), se=C.effEnd(s); if(ss==null) return false;
    return cs<se && ss<ce;
  });
};
/* 같은 날 같은 학생에게 시간 미지정 일정이 이미 있어도 "같은 날 2개 이상"은 알려줌 */
C.sameDayOthers = function(list, cand, ignoreId){
  return list.filter(function(s){ return s.id!==ignoreId && s.id!==cand.id && s.studentUid===cand.studentUid && s.date===cand.date; });
};

/* 학생이 시작 시각을 바꿀 수 있는가 */
C.canStudentEdit = function(s, session, today, nowMin){
  if(s.timeLocked) return {ok:false, reason:'선생님이 시간을 고정했어요'};
  if(session && ['in_progress','break','waiting','submitted','graded'].indexOf(session.status)>=0) return {ok:false, reason:'이미 시험을 시작했어요'};
  if(s.date<today) return {ok:false, reason:'지난 일정이에요'};
  if(s.date===today){ var st=C.effStart(s); if(st!=null && nowMin>=st) return {ok:false, reason:'시작 시간이 지나서 바꿀 수 없어요'}; }
  return {ok:true};
};
/* 학생이 고른 새 시작 시각의 유효성 */
C.validateStudentStart = function(s, newMin, today, nowMin){
  if(newMin==null||isNaN(newMin)) return {ok:false, reason:'시간을 확인해 주세요'};
  if(newMin<MIN_START||newMin>MAX_START) return {ok:false, reason:'06:00 ~ 23:00 사이로 골라 주세요'};
  if(s.date===today && newMin<=nowMin) return {ok:false, reason:'이미 지난 시간이에요'};
  return {ok:true};
};

/* 한 일정의 상태. session: 해당 학생·시험의 examSession(없을 수 있음) */
C.scheduleStatus = function(s, session, today, nowMin){
  var st = session && session.status;
  if(st==='graded'||st==='submitted') return {key:'done', label:'응시 완료', color:'green'};
  if(st==='in_progress'||st==='break') return {key:'inprogress', label:'응시 중', color:'yellow'};
  if(st==='waiting') return {key:'waiting', label:'대기 중', color:'yellow'};
  if(s.date<today) return {key:'overdue', label:'기한 지남', color:'red'};
  if(s.date===today){
    var es=C.effStart(s);
    if(es!=null && nowMin>es) return {key:'late', label:'시간 지남', color:'orange'};
    return {key:'today', label:'오늘 예정'+(es!=null?' '+C.minToHHMM(es):''), color:'yellow'};
  }
  return {key:'upcoming', label:'예정', color:'grey'};
};
/* 일정 없는 시험(배정만 됨) */
C.noScheduleStatus = function(session){
  var st = session && session.status;
  if(st==='graded'||st==='submitted') return {key:'done', label:'응시 완료', color:'green'};
  if(st==='in_progress'||st==='break') return {key:'inprogress', label:'응시 중', color:'yellow'};
  if(st==='waiting') return {key:'waiting', label:'대기 중', color:'yellow'};
  return {key:'assigned', label:'배정됨', color:'blue'};
};
/* 다음 시험(D-Day): 완료되지 않은 일정 중 가장 가까운 것 */
C.nextExam = function(items, today){
  var open = items.filter(function(it){ return it.status && ['done'].indexOf(it.status.key)<0 && it.s.date>=today; });
  open.sort(function(a,b){ return a.s.date<b.s.date?-1:a.s.date>b.s.date?1:((C.effStart(a.s)||0)-(C.effStart(b.s)||0)); });
  return open[0]||null;
};
C.dDayLabel = function(date, today){ var n=C.diffDays(today,date); return n===0?'D-DAY':(n>0?'D-'+n:'D+'+(-n)); };

/* ───────── 일정 → 투두 / 시간 합산 ───────── */
C.todoIdForSchedule = function(id){ return 'sch_'+id; };
C.buildScheduleTodo = function(s, uid, branch, subjectKey){
  return { uid:uid, title:'📝 '+(s.examTitle||'모의고사'), subject:subjectKey||'ko', status:'none', studyTime:null,
    certified:false, date:s.date, branch:branch||s.branch||null, scheduleId:s.id, examId:s.examId||null, isExam:true, examSec:0, extraSec:0 };
};
/* 시험 결과(과목별)에서 실제 응시 시간(초) 합산. durations: 과목별 최대 분(선택) */
C.examSecFromResults = function(results, durationsMin){
  var tot=0;
  (results||[]).forEach(function(r,i){
    if(!r) return;
    var a=r.startedAtMs, b=r.submittedAtMs; if(typeof a!=='number'||typeof b!=='number') return;
    var sec=Math.max(0,(b-a)/1000);
    var cap = durationsMin && durationsMin[i] ? durationsMin[i]*60 : 4*3600;
    tot += Math.min(sec,cap);
  });
  return Math.round(tot);
};
/* 시험 투두를 "완료"로 만들 때의 필드. 기존 추가 학습시간(extraSec)은 보존하고 합산 */
C.examDoneFields = function(prevTodo, examSec){
  var extra = (prevTodo && prevTodo.extraSec) || 0;
  return { status:'done', examSec:examSec, extraSec:extra, studyTime:C.fmtHMS(examSec+extra) };
};
/* 완료된 투두에서 타이머를 다시 돌려 추가 학습 → 시험시간에 더함. 일반 투두면 null(기존 동작 유지) */
C.additiveFinalize = function(todo, addMs){
  if(!todo || !(todo.examSec>0 || todo.isExam)) return null;
  var extra=(todo.extraSec||0)+Math.max(0,addMs)/1000;
  var tot=(todo.examSec||0)+extra;
  return { studyTime:C.fmtHMS(tot), extraSec:Math.round(extra*1000)/1000 };
};

/* ───────── 주의 학생(시간 체크) ───────── */
/* todos: [{uid,date,status,studyTime}], planners: [{uid,date,submitted}] */
C.checkStudentTimeUse = function(todos, planners, days, today){
  var done = todos.filter(function(t){return t.status==='done';});
  var tracked = done.filter(function(t){return C.parseHMS(t.studyTime)>0;});
  var shortOnes = tracked.filter(function(t){return C.parseHMS(t.studyTime)<180;});
  var sec = tracked.reduce(function(s,t){return s+C.parseHMS(t.studyTime);},0);
  var dates = {}; todos.forEach(function(t){dates[t.date]=1;});
  var activeDays = Object.keys(dates).length;
  var subDays = {}; (planners||[]).forEach(function(p){ if(p.submitted) subDays[p.date]=1; });
  var compliance = done.length ? Math.round(tracked.length/done.length*100) : null;
  var flags=[];
  if(done.length>=5 && compliance!=null && compliance<60) flags.push({key:'nocheck', text:'완료 항목 중 시간 체크한 비율 '+compliance+'%'});
  if(tracked.length>=5 && shortOnes.length/tracked.length>=0.5) flags.push({key:'short', text:'3분 미만 체크가 '+shortOnes.length+'건 ('+Math.round(shortOnes.length/tracked.length*100)+'%)'});
  var perDay = activeDays? sec/activeDays : 0;
  if(done.length>=days*2 && perDay<3600) flags.push({key:'low', text:'완료 항목은 많은데 하루 평균 체크 시간 '+C.fmtHM(perDay)});
  var noPlan = days - Object.keys(subDays).length;
  if(days>=5 && Object.keys(subDays).length===0) flags.push({key:'noplan', text:'최근 '+days+'일 플래너 제출 0회'});
  var level = (flags.length>=2 || (compliance!=null && compliance<40 && done.length>=5)) ? 'red' : (flags.length===1 ? 'yellow' : 'ok');
  return { doneCount:done.length, trackedCount:tracked.length, compliance:compliance, totalSec:sec, activeDays:activeDays, submitDays:Object.keys(subDays).length, flags:flags, level:level };
};

/* ───────── 별자리 리포트 분석 엔진 ───────── */
function clip(s,n){ s=String(s==null?'':s); return s.length>n? s.slice(0,n-1)+'…' : s; }
C.clip = clip;

var CORE_ORDER=['ko','ma','en','hi','sc','so'];
C.analyzeReport = function(inp){
  var start=inp.startDate, end=inp.endDate, today=inp.today||end;
  var names=inp.subjectNames||{ko:'국어',ma:'수학',en:'영어',hi:'한국사',sc:'과학탐구',so:'사회탐구'};
  function nm(k){ return names[k]||k; }
  var elapsedEnd = end<today? end : today;
  var days = C.rangeDates(start,end,120);
  var elapsedDays = C.rangeDates(start,elapsedEnd,120).length || 1;
  var todos=(inp.todos||[]).filter(function(t){return t.date>=start&&t.date<=end;});
  var secByDate={}; days.forEach(function(d){secByDate[d]=0;});
  var bySubj={}, doneCount=0, trackedDone=0;
  todos.forEach(function(t){
    var s=C.parseHMS(t.studyTime);
    if(t.status==='done'){ doneCount++; if(s>0) trackedDone++; }
    if(s>0){ secByDate[t.date]=(secByDate[t.date]||0)+s; bySubj[t.subject||'etc']=(bySubj[t.subject||'etc']||0)+s; }
  });
  var daily = days.map(function(d){return {date:d, sec:secByDate[d]||0};});
  var total = daily.reduce(function(s,x){return s+x.sec;},0);
  var activeDays = daily.filter(function(x){return x.sec>=600;}).length;
  var avgActive = activeDays? total/activeDays : 0;
  var avgAll = total/elapsedDays;
  var best = daily.reduce(function(b,x){return (!b||x.sec>b.sec)?x:b;}, null);
  var streak=0,cur=0; daily.forEach(function(x){ if(x.sec>=600){cur++; if(cur>streak)streak=cur;} else cur=0; });
  var dowSum=[0,0,0,0,0,0,0], dowCnt=[0,0,0,0,0,0,0];
  daily.forEach(function(x){ if(x.date<=elapsedEnd){ var w=C.dow(x.date); dowSum[w]+=x.sec; dowCnt[w]++; } });
  var bestDow=-1,bestDowAvg=0; for(var w=0;w<7;w++){ var a=dowCnt[w]?dowSum[w]/dowCnt[w]:0; if(a>bestDowAvg){bestDowAvg=a;bestDow=w;} }

  var subs = Object.keys(bySubj).map(function(k){return {key:k,name:nm(k),sec:bySubj[k],pct:total?bySubj[k]/total:0};}).sort(function(a,b){return b.sec-a.sec;});

  var span = days.length;
  var prevStart=C.addDays(start,-span), prevEnd=C.addDays(start,-1);
  var prevTotal=0, prevHas=false;
  (inp.prevTodos||inp.todos||[]).forEach(function(t){ if(t.date>=prevStart&&t.date<=prevEnd){ var s=C.parseHMS(t.studyTime); if(s>0){prevTotal+=s;prevHas=true;} } });
  var deltaPct = (prevHas&&prevTotal>0)? Math.round((total-prevTotal)/prevTotal*100) : null;

  var submitted={}; (inp.planners||[]).forEach(function(p){ if(p.submitted && p.date>=start && p.date<=elapsedEnd) submitted[p.date]=1; });
  var submitRate = Math.round(Object.keys(submitted).length/elapsedDays*100);
  var compliance = doneCount? Math.round(trackedDone/doneCount*100) : null;
  var completion = todos.length? Math.round(doneCount/todos.length*100) : null;

  /* ── 성적 ── */
  var gr=(inp.grades||[]).filter(function(g){return g.examDate&&g.examDate>=start&&g.examDate<=end;}).sort(function(a,b){return a.examDate<b.examDate?-1:a.examDate>b.examDate?1:0;});
  var series={}; // group -> [{date,score,grade,exam,source,label}]
  gr.forEach(function(g){
    Object.keys(g.scores||{}).forEach(function(k){
      var v=g.scores[k]||{}; var grp=v.group||k;
      if(v.score==null && !v.grade) return;
      (series[grp]=series[grp]||[]).push({date:g.examDate,score:v.score!=null?Number(v.score):null,grade:v.grade?parseInt(v.grade,10):null,exam:g.examName,source:g.examSource||'',label:v.label||nm(grp)});
    });
  });
  var gstats = Object.keys(series).map(function(k){
    var arr=series[k], f=arr[0], l=arr[arr.length-1];
    var sameSrc = arr.filter(function(x){return x.source===l.source;});
    var base = sameSrc.length>=2 ? sameSrc[0] : null;
    var scoreDelta = (base&&base.score!=null&&l.score!=null)? l.score-base.score : null;
    var gradeDelta = (base&&base.grade!=null&&l.grade!=null)? base.grade-l.grade : null; // +면 향상
    return {key:k,name:nm(k),n:arr.length,series:arr,first:f,last:l,scoreDelta:scoreDelta,gradeDelta:gradeDelta,lastGrade:l.grade,lastScore:l.score,
      study: bySubj[k]||0};
  }).sort(function(a,b){ var ia=CORE_ORDER.indexOf(a.key),ib=CORE_ORDER.indexOf(b.key); return (ia<0?99:ia)-(ib<0?99:ib); });

  /* ── 학습 × 성적 통합 해석 (규칙 기반) ── */
  var good=[], focus=[];
  var studyVals = subs.map(function(s){return s.sec;});
  var avgSubjSec = studyVals.length? studyVals.reduce(function(a,b){return a+b;},0)/studyVals.length : 0;
  function add(arr,w,subject,head,tail){ arr.push({w:w,subject:subject,head:head,tail:tail,text:tail?head+' — '+tail:head}); }
  gstats.forEach(function(g){
    var improved = (g.gradeDelta!=null && g.gradeDelta>0) || (g.gradeDelta==null && g.scoreDelta!=null && g.scoreDelta>=3);
    var declined = (g.gradeDelta!=null && g.gradeDelta<0) || (g.gradeDelta==null && g.scoreDelta!=null && g.scoreDelta<=-3);
    var gradeTxt = g.gradeDelta!=null ? (g.first.grade+'→'+g.last.grade+'등급') : (g.scoreDelta!=null? (g.scoreDelta>0?'+':'')+g.scoreDelta+'점' : '');
    var hrs = C.fmtHM(g.study);
    var hiStudy = g.study>=avgSubjSec && g.study>0;
    var head = g.name+' '+gradeTxt;
    if(improved && hiStudy) add(good,3,g.key,head,'학습 '+hrs+' 투자가 성적으로 이어졌어요');
    else if(improved) add(good,2,g.key,head,'적은 시간에도 효율이 좋았어요');
    else if(g.lastGrade!=null && g.lastGrade<=2) add(good,1,g.key,g.name+' '+g.lastGrade+'등급','안정적으로 유지 중이에요');
    if(declined && !hiStudy) add(focus,3,g.key,head,'학습 '+hrs+', 시간 확보가 먼저예요');
    else if(declined) add(focus,3,g.key,head,'학습 '+hrs+', 오답·풀이 방식을 점검해요');
    else if(!improved && hiStudy && g.n>=2 && g.lastGrade!=null && g.lastGrade>=3) add(focus,2,g.key,g.name+' '+g.lastGrade+'등급 정체','학습 '+hrs+', 공부 방법을 바꿔볼 때예요');
  });
  if(submitRate>=90 && elapsedDays>=5) add(good,2,null,'플래너 제출 '+submitRate+'%','꾸준함이 가장 큰 힘이에요');
  else if(submitRate<50 && elapsedDays>=5) add(focus,2,null,'플래너 제출 '+submitRate+'%','매일 제출하는 습관부터 잡아요');
  if(compliance!=null){
    if(compliance>=90) add(good,2,null,'시간 체크 준수율 '+compliance+'%','기록이 정확해요');
    else if(compliance<70) add(focus,3,null,'시간 체크 준수율 '+compliance+'%','완료한 공부의 시간 기록을 챙겨요');
  }
  var actRate = Math.round(activeDays/elapsedDays*100);
  if(actRate>=80 && elapsedDays>=7) add(good,2,null,'공부한 날 '+actRate+'%','기간 대부분을 공부로 채웠어요');
  else if(actRate<40 && elapsedDays>=7) add(focus,2,null,'공부한 날 '+actRate+'%','주 4일 이상을 목표로 이어가요');
  if(deltaPct!=null){
    if(deltaPct>=10) add(good,2,null,'순공시간 '+deltaPct+'% 증가','이전 기간보다 늘었어요');
    else if(deltaPct<=-15) add(focus,2,null,'순공시간 '+(-deltaPct)+'% 감소','이전 기간보다 줄었어요');
  }
  if(streak>=5) add(good,1,null,'최장 '+streak+'일 연속 학습','리듬이 좋아요');
  if(subs.length>=2){
    var top=subs[0], low=subs[subs.length-1];
    if(top.pct>=0.5) add(focus,1,null,top.name+' 비중 '+Math.round(top.pct*100)+'%','과목 균형을 맞춰봐요');
    else if(subs.length>=3 && low.pct<0.08) add(focus,1,null,low.name+' 비중 '+Math.round(low.pct*100)+'%','조금 더 늘려봐요');
  }
  good.sort(function(a,b){return b.w-a.w;}); focus.sort(function(a,b){return b.w-a.w;});
  var brightItems = good.slice(0,3).map(function(x){return {head:x.head,tail:x.tail};});
  var risingItems = focus.slice(0,3).map(function(x){return {head:x.head,tail:x.tail};});
  var fb={bright:false,rising:false};
  if(!brightItems.length){ brightItems=[ total>0? {head:'이번 기간 '+C.fmtHM(total),tail:'학습을 기록했어요'} : {head:'새로운 별',tail:'켤 준비가 됐어요'} ]; fb.bright=true; }
  if(!risingItems.length){ risingItems=[{head:'지금의 흐름',tail:'그대로 이어가요'}]; fb.rising=true; }
  var bright=brightItems.map(function(x){return x.tail?x.head+' — '+x.tail:x.head;});
  var rising=risingItems.map(function(x){return x.tail?x.head+' — '+x.tail:x.head;});

  /* 다음 달 목표 제안 (선생님이 수정 가능) */
  var goals=[];
  var wf = focus.filter(function(x){return x.subject;})[0];
  if(wf) goals.push(nm(wf.subject)+' 오답 정리 주 3회');
  if(compliance!=null && compliance<90) goals.push('시간 체크 준수율 90% 이상');
  if(avgActive>0) goals.push('일 평균 순공 '+C.fmtHM(Math.round((avgActive+1800)/600)*600));
  if(submitRate<90 && goals.length<3) goals.push('플래너 매일 제출하기');
  if(!goals.length) goals.push('지금의 학습 리듬 유지하기');

  var autoComment = '';
  if(good.length||focus.length){
    autoComment = (good[0]? good[0].head+', '+good[0].tail+'. ' : '') + (focus[0]? '다음에는 '+focus[0].head+' 부분을 함께 챙겨 봐요.' : '이 흐름을 그대로 이어가요.');
  } else autoComment = '꾸준히 기록을 쌓아 가는 모습이 좋아요. 다음 기간에도 함께 이어가요.';

  return {
    period:{start:start,end:end,days:span,elapsedDays:elapsedDays},
    kpi:{totalSec:total,avgActiveSec:avgActive,avgAllSec:avgAll,activeDays:activeDays,submitRate:submitRate,compliance:compliance,completion:completion,streak:streak,deltaPct:deltaPct},
    weekdayAvg:[1,2,3,4,5,6,0].map(function(w){return dowCnt[w]?dowSum[w]/dowCnt[w]:0;}), daily:daily, best:(best&&best.sec>0)?best:null, bestDow:bestDow>=0?DOWK[bestDow]:null,
    subjects:subs, grades:gstats, examCount:gr.length,
    bright:bright, rising:rising, brightItems:brightItems, risingItems:risingItems, fallback:fb, goals:goals.slice(0,3), autoComment:clip(autoComment,160),
    hasStudy: total>0, hasGrades: gstats.length>0
  };
};

/* 과목별 한 줄 진단 (리포트 성적 표) */
C.diagLine = function(g){
  var hrs=C.fmtHM(g.study||0);
  var imp=(g.gradeDelta!=null&&g.gradeDelta>0)||(g.gradeDelta==null&&g.scoreDelta!=null&&g.scoreDelta>=3);
  var dec=(g.gradeDelta!=null&&g.gradeDelta<0)||(g.gradeDelta==null&&g.scoreDelta!=null&&g.scoreDelta<=-3);
  if(g.n<2 && g.lastGrade!=null) return '이번 기간 첫 기록';
  if(g.n<2) return '이번 기간 첫 기록';
  if(imp) return (g.study>0?hrs+' 학습, ':'')+'꾸준히 오르는 중';
  if(dec) return g.study>0?'학습 '+hrs+', 오답 점검':'학습 시간 확보 필요';
  return g.lastGrade!=null&&g.lastGrade<=2?'좋은 흐름 유지':'안정적, 한 단계 도전';
};

/* ───────── 성적표 페이지 레이아웃 ─────────
   내지 콘텐츠 박스 좌표계(스케일 적용 전) 기준 높이(px).
   순서: [info] → exam들 → chart → comment → memo(남는 공간) / 차트는 남는 공간만큼 확대 */
C.CARD_H = { head1:131, headN:40, info:98, exam:function(rows){ return 66+rows*28; }, chartMin:240, chartMax:420, comment:150, memoMin:120, gap:0 };
C.cardAvail = function(topPx, scale){ return Math.floor((1123 - topPx - 78)/scale); };
/* exams: [{rows:n}] , opt:{avail, chart:bool, comment:bool, memo:bool, info:bool} → pages:[{blocks:[{t,h,i?}], free}] */
C.layoutCard = function(exams, opt){
  var H=C.CARD_H, avail=opt.avail, pages=[], cur=null;
  function newPage(){ var first=pages.length===0; cur={blocks:[],used:(first?H.head1:H.headN)}; pages.push(cur); }
  function fits(h){ return cur.used+h<=avail; }
  function put(t,h,i){ cur.blocks.push({t:t,h:h,i:i}); cur.used+=h+H.gap; }
  newPage();
  if(opt.info!==false){ put('info',H.info); }
  exams.forEach(function(e,i){
    var h=H.exam(e.rows);
    if(!fits(h) && cur.blocks.length) newPage();
    put('exam',h,i);
  });
  var chartBlock=null;
  if(opt.chart){
    if(!fits(H.chartMin)) newPage();
    chartBlock={t:'chart',h:H.chartMin}; cur.blocks.push(chartBlock); cur.used+=H.chartMin+H.gap;
  }
  var commentBlock=null;
  if(opt.comment){
    if(!fits(H.comment)){ // 코멘트가 안 들어가면 새 페이지(차트는 그 전 페이지에 남김)
      newPage();
    }
    commentBlock={t:'comment',h:H.comment}; cur.blocks.push(commentBlock); cur.used+=H.comment+H.gap;
  }
  // 마지막 페이지의 남는 공간 활용: 차트 확대 → 메모 칸
  var last=pages[pages.length-1], free=avail-last.used;
  if(chartBlock && last.blocks.indexOf(chartBlock)>=0){
    var grow=Math.max(0,Math.min(free-(opt.memo?H.memoMin+H.gap:0), H.chartMax-H.chartMin));
    if(grow<0) grow=0; chartBlock.h+=grow; last.used+=grow; free=avail-last.used;
  } else if(chartBlock){
    // 차트가 이전 페이지에 있으면 그 페이지에서 확대
    for(var pi=0;pi<pages.length-1;pi++){ if(pages[pi].blocks.indexOf(chartBlock)>=0){ var f2=avail-pages[pi].used; var g2=Math.max(0,Math.min(f2,H.chartMax-H.chartMin)); chartBlock.h+=g2; pages[pi].used+=g2; } }
  }
  if(opt.memo && free>=H.memoMin+H.gap){ last.blocks.push({t:'memo',h:free-H.gap}); last.used+=free; free=0; }
  pages.forEach(function(p){ p.free=avail-p.used; });
  return pages;
};

/* 등급 → y 위치, 점수 → y 위치 */
C.gradeColor = function(g){ return g<=1?'#7B1D1D':g<=2?'#B8841A':'#1d2a4a'; };

/* ───────── 시간표 (종소리 알림용 순수 로직) ───────── */
/* type: class(교시) / break(휴식) / meal(식사) / check(체크·입퇴실) / task(과제) */
C.TT_DEFAULT = [
  {s:'07:30',e:'07:55',label:'입실 및 휴대폰 제출',type:'check'},
  {s:'08:00',e:'08:30',label:'플래너 작성 및 일일 Test 응시',type:'task'},
  {s:'08:30',e:'08:40',label:'휴식',type:'break'},
  {s:'08:40',e:'10:00',label:'1교시',type:'class'},
  {s:'10:00',e:'10:15',label:'휴식',type:'break'},
  {s:'10:15',e:'11:55',label:'2교시',type:'class'},
  {s:'11:55',e:'13:05',label:'점심시간',type:'meal'},
  {s:'13:05',e:'13:10',label:'오전 학습 플래너 체크',type:'check'},
  {s:'13:10',e:'14:30',label:'3교시',type:'class'},
  {s:'14:30',e:'14:45',label:'휴식',type:'break'},
  {s:'14:45',e:'16:05',label:'4교시',type:'class'},
  {s:'16:05',e:'16:20',label:'휴식',type:'break'},
  {s:'16:20',e:'18:00',label:'5교시',type:'class'},
  {s:'18:00',e:'19:10',label:'저녁시간',type:'meal'},
  {s:'19:10',e:'19:15',label:'오후 학습 플래너 체크',type:'check'},
  {s:'19:15',e:'20:35',label:'6교시',type:'class'},
  {s:'20:35',e:'20:50',label:'휴식',type:'break'},
  {s:'20:50',e:'22:00',label:'7교시',type:'class'},
  {s:'22:00',e:'22:10',label:'플래너 제출 및 1차 퇴실 및 휴식',type:'check'},
  {s:'22:10',e:'23:00',label:'8교시',type:'class'},
  {s:'23:00',e:'23:10',label:'퇴실 및 추가 학습 인원 체크 및 정리',type:'check'}
];
C.ttMin = function(hhmm){ var m=/^(\d{1,2}):(\d{2})$/.exec(hhmm||''); return m? (+m[1])*60+(+m[2]) : null; };
C.ttDur = function(b){ return C.ttMin(b.e)-C.ttMin(b.s); };
/* nowSec: 오늘 0시부터 흐른 초(KST). 반환: phase before/during/gap/after */
C.ttState = function(blocks, nowSec){
  var L=(blocks||[]).slice().sort(function(a,b){return C.ttMin(a.s)-C.ttMin(b.s);});
  if(!L.length) return {phase:'none',blocks:L};
  var i, s0=C.ttMin(L[0].s)*60, eN=C.ttMin(L[L.length-1].e)*60;
  if(nowSec<s0) return {phase:'before',idx:-1,next:L[0],nextIdx:0,untilSec:s0-nowSec,blocks:L};
  if(nowSec>=eN) return {phase:'after',idx:L.length,blocks:L};
  for(i=0;i<L.length;i++){
    var a=C.ttMin(L[i].s)*60, b=C.ttMin(L[i].e)*60;
    if(nowSec>=a&&nowSec<b) return {phase:'during',idx:i,cur:L[i],next:L[i+1]||null,nextIdx:i+1,remainSec:b-nowSec,elapsedSec:nowSec-a,progress:(nowSec-a)/(b-a),blocks:L};
    if(nowSec<a) return {phase:'gap',idx:i-0.5,next:L[i],nextIdx:i,untilSec:a-nowSec,blocks:L};
  }
  return {phase:'after',idx:L.length,blocks:L};
};
/* 지금 울려야 할 시작종: 시작 시각이 [now-windowSec, now] 안에 있는 블록 중 가장 최근 것 */
C.ttDue = function(blocks, nowSec, windowSec){
  var L=(blocks||[]).slice().sort(function(a,b){return C.ttMin(a.s)-C.ttMin(b.s);}), hit=null;
  L.forEach(function(b){ var a=C.ttMin(b.s)*60; if(nowSec>=a && nowSec-a<=windowSec) hit=b; });
  return hit;
};
C.ttBellText = function(b, next){
  var d=C.ttDur(b), range=b.s+'~'+b.e;
  var icon={class:'bell',break:'coffee',meal:'utensils',check:'clipcheck',task:'edit'}[b.type]||'bell';
  var t={icon:icon,title:b.label+(b.type==='class'?' 시작':''), body:range+' · '+d+'분'};
  if(b.type==='break'||b.type==='meal'){ if(next) t.body+=' · '+next.s+'에 '+next.label+' 시작'; }
  return t;
};
C.ttValidate = function(blocks){
  var err=[], L=(blocks||[]).map(function(b,i){return {b:b,i:i};});
  L.forEach(function(x){ var a=C.ttMin(x.b.s), e=C.ttMin(x.b.e);
    if(a==null||e==null) err.push((x.i+1)+'번째 줄: 시간 형식이 올바르지 않아요');
    else if(e<=a) err.push((x.i+1)+'번째 줄('+x.b.label+'): 끝나는 시간이 시작보다 늦어야 해요');
    if(!(x.b.label||'').trim()) err.push((x.i+1)+'번째 줄: 이름을 입력해 주세요'); });
  if(err.length) return err;
  var S=L.slice().sort(function(a,b){return C.ttMin(a.b.s)-C.ttMin(b.b.s);});
  for(var k=1;k<S.length;k++){ if(C.ttMin(S[k].b.s)<C.ttMin(S[k-1].b.e)) err.push('「'+S[k-1].b.label+'」와 「'+S[k].b.label+'」 시간이 겹쳐요'); }
  return err;
};

/* ───────── 자동 배정 알고리즘 ─────────
   목표: 수능 준비에 효율적인 배치 — 단순 등간격이 아니라 아래를 함께 고려한다.
   [순서] order
     chrono(기본) : 기출은 시행 시점순(과거→최근, 같은 해는 3·4월→6월→7월→9월→10월→수능), 사설·자체 시험은 회차순,
                    기출과 사설이 섞이면 기출 먼저(평가원 기준 기본기 → 사설로 응용·고난도)
     recent       : 최근 기출부터(기간이 짧거나 중간에 끊길 수 있어 최근 경향을 먼저 확보해야 할 때)
     title        : 시험 이름 순(예전 방식)
     과목별 시험 수가 달라도 각 과목이 기간 전체에 고르게 퍼지도록, 과목 안 진행률(순위/개수)로 전체 순서를 섞는다.
   [밀도] pace
     even   균등형     : 간격 일정 — 응시·복기 리듬이 일정해 장기 계획에 적합
     ramp   후반 집중형 : 마감(실제 시험)에 가까울수록 촘촘 — 앞쪽은 약점 보완 시간, 뒤쪽은 실전 감각
     front  전반 집중형 : 초반에 촘촘 — 빨리 진단하고 후반은 오답·약점 보완(학기 초·새 과정 진입)
     weekend 주말 실전형: 주말(쉬는 날)에 몰아 응시, 평일은 복기 — 학교 다니는 학생에게 현실적인 응시-복기 주기
     set    실전 세트형 : 같은 회차(같은 시행 시점) 여러 과목을 하루에 수능 시간표대로 — 수능 하루 체력·전환 훈련
   [공통]
   1) 같은 과목 시험은 서로 멀리(복기·오답 정리 시간 확보), 서로 다른 과목은 번갈아(교차 학습)
   2) 하루 부담 분산(설정 한도 안에서 가급적 적게), 긴 시험(≥100분) 연속일 회피
   3) 시험 시각은 수능 시간대(국어 08:40·수학 10:30·영어 13:10·한국사 14:50·탐구 15:35)에 맞춤
   4) 평일 학교 가는 학생은 하교 후 시간대만 사용, 긴 시험·같은 날 2개 시험은 주말 우선
   5) 마감일 당일은 가급적 비워 복기 시간 확보, 오늘 이미 지난 시각은 사용 안 함
   6) 학생의 기존 일정(시간 겹침·같은 날·같은 과목 간격)을 반영 */
var SUNEUNG_T = {ko:520, ma:630, en:790, hi:890, sc:935, so:935};
C.SUNEUNG_T = SUNEUNG_T;
C.isSchoolGrade = function(g){ g=String(g||''); return g.indexOf('중학교')===0 || g.indexOf('고등학교')===0; };
C.gradeShort = function(g){ g=String(g||''); if(g==='N수') return 'N수'; if(g==='성인') return '성인'; if(g.indexOf('고등학교')===0) return '고'+g.replace(/[^0-9]/g,''); if(g.indexOf('중학교')===0) return '중'+g.replace(/[^0-9]/g,''); return g||'-'; };
function ceil10(m){ return Math.ceil(m/10)*10; }
/* 시험 이름에서 시행 시점을 읽는다 → {t:연*12+월, ym:'2023.11', kind:'P'(평가원형)|'O'(교육청형)} 또는 null
   - '2025학년도 수능' → 2024.11 시행 / '2025학년도 6월 모의평가' → 2024.06 시행
   - 연도만 있으면: 수능·모평(평가원)은 학년도로, 학력평가(교육청)는 시행연도로 본다(흔한 표기 관례)
   - '24학년도'처럼 두 자리도 인식 */
C.examTime = function(title, src){
  var t=String(title||''), m, hy=null, y=null, mon=null;
  var isSuneung=/수능|대학수학능력/.test(t), isMopyeong=/모의평가|모평|평가원/.test(t)||src==='pyeongga'||src==='평가원';
  var isHakpyeong=/학력평가|학평|교육청|전국연합/.test(t)||src==='office'||src==='교육청';
  if((m=t.match(/(20\d{2}|\d{2})\s*학년도/))) hy=+m[1]<100?2000+(+m[1]):+m[1];
  else if((m=t.match(/(?:^|[^\d])(20\d{2})(?!\d)/))) y=+m[1];
  else if((m=t.match(/(?:^|[^\d])(\d{2})\s*(?:년|수능|모평)/))) y=2000+(+m[1]);
  if(isSuneung) mon=11; else if((m=t.match(/(?:^|[^\d])(1[0-2]|[1-9])\s*월/))) mon=+m[1];
  if(mon==null) return null;
  if(hy==null&&y==null) return isSuneung?null:{t:mon, ym:mon+'월', kind:'M'};  /* 연도 없는 월별 사설(더프 10월 등): 월 순서만 */
  if(hy==null){ hy=(isHakpyeong&&!isSuneung&&!isMopyeong)?null:y; if(hy==null) return {t:y*12+mon, ym:y+'.'+String(mon).padStart(2,'0'), kind:'O'}; }
  var yy=hy-1; /* 학년도 → 시행연도 */
  return {t:yy*12+mon, ym:yy+'.'+String(mon).padStart(2,'0'), kind:(isHakpyeong&&!isMopyeong&&!isSuneung)?'O':'P'};
};
/* 회차: '서바이벌 9회' → {series:'서바이벌', round:9} */
C.examRound = function(title){
  var t=String(title||''), m=t.match(/(\d+)\s*회/); if(!m) return null;
  var series=t.replace(/\[[^\]]*\]|\([^)]*\)/g,' ').replace(/\d+\s*회.*$/,'').replace(/국어|수학|영어|한국사|탐구|사회|과학|화법과\s*작문|언어와\s*매체|확률과\s*통계|미적분|기하|\s+/g,' ').trim();
  return {series:series, round:+m[1]};
};
/* 같은 과목 안의 정렬 기준 */
C.examSortKey = function(e, order){
  var tm=C.examTime(e.title, e.src), rd=tm?null:C.examRound(e.title);
  if(order==='title') return [0, 0, String(e.title||'')];
  if(tm&&tm.kind==='M') return [1, tm.t, String(e.title||'')];
  if(tm) return [0, order==='recent'?-tm.t:tm.t, String(e.title||'')];
  if(rd) return [1, rd.round, rd.series+'|'+String(e.title||'')];
  return [2, 0, String(e.title||'')];
};
function cmpKey(a,b){ for(var i=0;i<a.length;i++){ if(a[i]===b[i]) continue; if(typeof a[i]==='number') return a[i]-b[i]; return String(a[i]).localeCompare(String(b[i]),'ko',{numeric:true}); } return 0; }
/* 과목별로 정렬한 뒤, 과목 안 진행률((순위+0.5)/개수) 순으로 전체를 섞는다 → 시험 수가 다른 과목도 기간 전체에 고르게 */
C.interleaveExams = function(exams, order){
  var groups={}, keys=[];
  exams.forEach(function(e){ var k=e.subj||'x'; if(!groups[k]){ groups[k]=[]; keys.push(k); } groups[k].push(e); });
  keys.forEach(function(k){ groups[k].sort(function(a,b){ return cmpKey(C.examSortKey(a,order),C.examSortKey(b,order)); }); });
  keys.sort(function(a,b){ return groups[b].length-groups[a].length; });
  var out=[];
  keys.forEach(function(k,ki){ var n=groups[k].length; groups[k].forEach(function(e,i){ out.push({e:e, f:(i+0.5)/n, ki:ki}); }); });
  out.sort(function(a,b){ return a.f-b.f || a.ki-b.ki; });
  return out.map(function(x){ return x.e; });
};
/* 실전 세트형: 같은 시행 시점(또는 같은 회차)의 여러 과목을 한 묶음으로 */
C.examSetKey = function(e){
  var tm=C.examTime(e.title, e.src); if(tm) return 'T'+tm.kind+tm.t;
  var rd=C.examRound(e.title); if(rd) return 'R'+rd.series+'#'+rd.round;
  return 'X'+e.id;
};
/* 밀도 곡선: 순서상 위치 x(0~1) → 기간상 위치(0~1) */
C.paceWarp = function(x, pace){
  if(pace==='ramp') return Math.pow(x, 0.6);      /* 뒤로 갈수록 간격이 좁아짐 */
  if(pace==='front') return Math.pow(x, 1.65);    /* 앞쪽이 촘촘 */
  return x;
};
/* opt: {exams:[{id,title,subj,dur}], start,end,today,nowMin, school(bool), schoolStart(min), late(min), excluded[], existing:[{date,startMin,durationMin,subj}], prefer:{examId:date},
          maxPerDay, vacation(bool)} → {items:[{examId,date,startMin,notes[]}], unplaced:[{examId,reason}], days:n} */
C.autoPlan = function(opt){
  var today=opt.today||opt.start, from=opt.start>today?opt.start:today;
  var ex={}; (opt.excluded||[]).forEach(function(d){ ex[d]=1; });
  var days=C.rangeDates(from,opt.end,400).filter(function(d){ return !ex[d]; });
  var maxPer=opt.maxPerDay||2, schoolStart=opt.schoolStart!=null?opt.schoolStart:19*60, late=opt.late!=null?opt.late:22*60+30, openFree=8*60;
  var schoolish=!!opt.school && !opt.vacation;
  var info={}, idxOf={};
  days.forEach(function(d,i){
    var w=C.dow(d), weekend=(w===0||w===6), sch=schoolish&&!weekend;
    var wo=sch?schoolStart:openFree;
    if(d===today && opt.nowMin!=null) wo=Math.max(wo,ceil10(opt.nowMin+30));
    info[d]={d:d,weekend:weekend,school:sch,wo:wo,wc:late,list:[],cap:sch?(opt.maxPerDaySchool||1):maxPer}; idxOf[d]=i;
  });
  (opt.existing||[]).forEach(function(s){ if(info[s.date]&&s.startMin!=null) info[s.date].list.push({s:s.startMin,e:s.startMin+(s.durationMin||60),dur:s.durationMin||60,subj:s.subj,ex:true}); });
  var all=(opt.existing||[]).filter(function(s){return s.subj;}).map(function(s){return {date:s.date,subj:s.subj};});
  var res={items:[],unplaced:[],days:days.length};
  if(!days.length){ (opt.exams||[]).forEach(function(e){ res.unplaced.push({examId:e.id,reason:'배정 가능한 날짜가 없어요(기간·제외 날짜 확인)'}); }); return res; }
  var pace=opt.pace||'even', order=opt.order||'chrono';
  if(pace==='set') return C.autoPlanSets(opt, days, info, idxOf, all, res);
  var seq=C.interleaveExams(opt.exams||[], order), M=seq.length, N=days.length;
  var cntSubj={}; seq.forEach(function(e){ cntSubj[e.subj]=(cntSubj[e.subj]||0)+1; });
  var hasWeekend=days.some(function(d){ return info[d].weekend; });
  /* 같은 과목 안 순위 → 그 과목의 기대 간격(밀도 곡선 반영). 같은 과목은 순서를 반드시 지킨다(앞 회차보다 늦게). */
  var rankIn={}, seen={}; seq.forEach(function(e){ seen[e.subj]=(seen[e.subj]||0); rankIn[e.id]=seen[e.subj]++; });
  var lastIdx={};
  seq.forEach(function(e,i){
    var ideal=(opt.prefer&&opt.prefer[e.id]&&idxOf[opt.prefer[e.id]]!=null)?idxOf[opt.prefer[e.id]]:Math.min(N-1,Math.floor(C.paceWarp((i+0.5)/M, M<3?'even':pace)*N));
    var perSub=(cntSubj[e.subj]||1)+all.filter(function(a){return a.subj===e.subj;}).length;
    var nS=cntSubj[e.subj]||1, rk=rankIn[e.id], wp=M<3?'even':(pace==='weekend'?'even':pace);
    var localGap=(C.paceWarp(Math.min(1,(rk+1.5)/nS),wp)-C.paceWarp((rk+0.5)/nS,wp))*N;
    if(nS<2) localGap=N/perSub;
    var minGap=Math.max(localGap>=3?2:1,Math.min(7,Math.floor(localGap*0.7)));
    var after=lastIdx[e.subj]!=null?lastIdx[e.subj]:-1;   /* 같은 과목 앞 회차가 놓인 날 */
    var best=null;
    days.forEach(function(d,di){
      var D=info[d]; if(D.list.length>=D.cap) return;

      /* 시각 후보 */
      var pref=D.school?D.wo:(SUNEUNG_T[e.subj]!=null?SUNEUNG_T[e.subj]:9*60), s=null, t;
      function fits(st){ if(st<D.wo||st+e.dur>D.wc) return false; return D.list.every(function(x){ return st+e.dur+20<=x.s || x.e+20<=st; }); }
      if(fits(ceil10(Math.max(pref,D.wo)))) s=ceil10(Math.max(pref,D.wo));
      else { for(t=ceil10(Math.max(pref,D.wo)); t+e.dur<=D.wc; t+=10){ if(fits(t)){ s=t; break; } } if(s==null){ for(t=ceil10(D.wo); t+e.dur<=D.wc; t+=10){ if(fits(t)){ s=t; break; } } } }
      if(s==null) return;
      /* 비용 */
      var c=3*Math.abs(di-ideal);
      all.concat(res.items.filter(function(it){return it._subj===e.subj;}).map(function(it){return {date:it.date,subj:it._subj};})).forEach(function(a){
        if(a.subj!==e.subj) return; var g=Math.abs(C.diffDays(a.date,d)); if(g<minGap) c+=(minGap-g)*12+(g===0?40:0); });
      c+=D.list.length*14;
      if(di<=after) c+=25;   /* 같은 과목 앞 회차보다 앞서면 감점(최종 순서는 아래에서 바로잡음) */
      var load=D.list.reduce(function(a,x){return a+x.dur;},0)+e.dur; if(load>300) c+=40;
      if(D.school) c+=(e.dur>=100?6:0)+(D.list.length?25:0);
      if(opt.school&&!D.school&&e.dur>=100) c-=8;
      [-1,1].forEach(function(k){ var nb=days[di+k]; if(nb&&C.diffDays(d,nb)===k&&info[nb].list.some(function(x){return x.dur>=100;})&&e.dur>=100) c+=6; });
      if(d===days[N-1]&&N>1) c+=10;
      if(d===today) c+=4;
      if(pace==='weekend'&&hasWeekend&&!D.weekend) c+=30;   /* 주말 실전형: 평일은 복기용으로 비움 */
      c+=di*0.01;
      if(!best||c<best.c) best={c:c,d:d,s:s,di:di,pref:pref};
    });
    if(!best){ res.unplaced.push({examId:e.id,reason:'남은 날에 시간이 없어요 — 기간을 늘리거나 하루 최대 시험 수를 늘려 보세요'}); return; }
    var D=info[best.d]; D.list.push({s:best.s,e:best.s+e.dur,dur:e.dur,subj:e.subj});
    lastIdx[e.subj]=Math.max(best.di, lastIdx[e.subj]!=null?lastIdx[e.subj]:-1);
    var notes=[];
    if(D.school) notes.push('평일 하교 후 '+C.minToHHMM(best.s)+' 시작');
    else if(best.s===best.pref&&SUNEUNG_T[e.subj]!=null) notes.push((D.weekend?'주말 ':'')+'수능 시간대('+C.minToHHMM(best.s)+')');
    else notes.push(C.minToHHMM(best.s)+' 시작');
    res.items.push({examId:e.id,date:best.d,startMin:best.s,notes:notes,_subj:e.subj,_dur:e.dur});
  });
  /* 같은 과목은 정한 순서(시행 시점·회차)대로: 그 과목이 차지한 날짜·시각 칸을 순서대로 다시 나눠 준다(시험 시간이 같을 때) */
  var seqPos={}; seq.forEach(function(e,i){ seqPos[e.id]=i; });
  var bySub={}; res.items.forEach(function(it){ (bySub[it._subj]=bySub[it._subj]||[]).push(it); });
  Object.keys(bySub).forEach(function(k){
    var L=bySub[k]; if(L.length<2) return;
    var durs={}; L.forEach(function(it){ durs[it._dur]=1; }); if(Object.keys(durs).length>1) return;
    var slots=L.map(function(it){ return {date:it.date,startMin:it.startMin,notes:it.notes}; }).sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:a.startMin-b.startMin; });
    var ex=L.slice().sort(function(a,b){ return seqPos[a.examId]-seqPos[b.examId]; });
    ex.forEach(function(it,i){ it.date=slots[i].date; it.startMin=slots[i].startMin; it.notes=slots[i].notes; });
  });
  /* 설명: 같은 과목 사이 간격 */
  res.items.forEach(function(it){
    var near=null; res.items.concat((opt.existing||[]).map(function(s){return {date:s.date,_subj:s.subj,ex:true};})).forEach(function(o){ if(o===it||o._subj!==it._subj) return; var g=Math.abs(C.diffDays(o.date,it.date)); if(near==null||g<near) near=g; });
    if(near!=null&&near>0) it.notes.push('같은 과목 최소 '+near+'일 간격');
    if(info[it.date].list.length>1) it.notes.push('같은 날 시험 '+info[it.date].list.length+'개');
  });
  res.items.sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:a.startMin-b.startMin; });
  return res;
};
/* 실전 세트형: 같은 시행 시점·회차의 여러 과목 시험을 하루에 수능 시간표 순서로 배치
   - 묶음끼리는 기간 전체에 고르게(같은 과목 간격은 자연히 확보)
   - 학교 가는 평일은 하루에 여러 과목을 볼 수 없으므로 주말·쉬는 날 우선
   - 하루에 다 안 들어가면(시간·한도) 남는 과목은 가까운 날에 따로 배치 */
C.autoPlanSets = function(opt, days, info, idxOf, all, res){
  var N=days.length, groups={}, gkeys=[], order=opt.order||'chrono';
  (opt.exams||[]).forEach(function(e){
    var k=C.examSetKey(e), j=0;
    /* 같은 묶음에 같은 과목이 또 있으면(중복 시험) 다음 묶음으로 */
    while(groups[k+(j?'#'+j:'')]&&groups[k+(j?'#'+j:'')].some(function(x){return x.subj===e.subj;})) j++;
    var kk=k+(j?'#'+j:''); if(!groups[kk]){ groups[kk]=[]; gkeys.push(kk); } groups[kk].push(e);
  });
  function gsort(k){ var e=groups[k][0]; return C.examSortKey(e, order).concat([k.indexOf('#')>=0?+k.split('#').pop():0]); }
  gkeys.sort(function(a,b){ return cmpKey(gsort(a),gsort(b)); });
  var subjT=function(e){ return SUNEUNG_T[e.subj]!=null?SUNEUNG_T[e.subj]:9*60; };
  var G=gkeys.length, lastIdx={}, remain={};
  (opt.exams||[]).forEach(function(e){ remain[e.subj]=(remain[e.subj]||0)+1; });
  function slotIn(D, e, trial){
    var p=Math.max(D.school?D.wo:subjT(e), D.wo), t;
    function fits(st){ if(st<D.wo||st+e.dur>D.wc) return false; return trial.every(function(x){ return st+e.dur+20<=x.s||x.e+20<=st; }); }
    for(t=ceil10(p); t+e.dur<=D.wc; t+=10){ if(fits(t)) return t; }
    for(t=ceil10(D.wo); t+e.dur<=D.wc; t+=10){ if(fits(t)) return t; }
    return null;
  }
  function put(e, d, di, st, notes){
    var D=info[d]; D.list.push({s:st,e:st+e.dur,dur:e.dur,subj:e.subj});
    lastIdx[e.subj]=di; remain[e.subj]--;
    res.items.push({examId:e.id,date:d,startMin:st,notes:notes,_subj:e.subj,_dur:e.dur});
  }
  gkeys.forEach(function(k,gi){
    var mem=groups[k].slice().sort(function(a,b){ return subjT(a)-subjT(b); });
    var pref=opt.prefer&&mem.map(function(e){return opt.prefer[e.id];}).filter(Boolean)[0];
    var ideal=(pref&&idxOf[pref]!=null)?idxOf[pref]:Math.min(N-1,Math.floor((gi+0.5)/G*N));
    var after=Math.max.apply(null,[-1].concat(mem.map(function(e){ return lastIdx[e.subj]!=null?lastIdx[e.subj]:-1; })));
    var need=Math.max.apply(null,[0].concat(mem.map(function(e){ return remain[e.subj]-1; })));
    var best=null;
    days.forEach(function(d,di){
      if(di<=after) return;
      if(di>N-1-need&&di>after+1) return;
      var D=info[d], cap=D.school?D.cap:Math.max(D.cap, mem.length), room=cap-D.list.length; if(room<=0) return;
      var trial=D.list.slice(), slots=[];
      mem.forEach(function(e){ if(slots.length>=room) return; var st=slotIn(D,e,trial); if(st==null) return; trial.push({s:st,e:st+e.dur}); slots.push({e:e,s:st}); });
      if(!slots.length) return;
      var c=3*Math.abs(di-ideal)+(mem.length-slots.length)*40+D.list.length*14;
      if(d===days[N-1]&&N>1) c+=10;
      if(D.school&&mem.length>1) c+=20;
      if(!best||c<best.c) best={c:c,d:d,di:di,slots:slots};
    });
    if(!best){
      /* 순서를 지킬 수 있는 날이 없으면, 순서보다 배정을 우선해 남은 날 중 가장 알맞은 날로 */
      days.forEach(function(d,di){
        var D=info[d], cap=D.school?D.cap:Math.max(D.cap, mem.length), room=cap-D.list.length; if(room<=0) return;
        var trial=D.list.slice(), slots=[];
        mem.forEach(function(e){ if(slots.length>=room) return; var st=slotIn(D,e,trial); if(st==null) return; trial.push({s:st,e:st+e.dur}); slots.push({e:e,s:st}); });
        if(!slots.length) return;
        var c=3*Math.abs(di-ideal)+(mem.length-slots.length)*40+D.list.length*14;
        if(!best||c<best.c) best={c:c,d:d,di:di,slots:slots};
      });
    }
    if(!best){ mem.forEach(function(e){ res.unplaced.push({examId:e.id,reason:'남은 날에 시간이 없어요 — 기간을 늘리거나 하루 최대 시험 수를 늘려 보세요'}); remain[e.subj]--; }); return; }
    var done={};
    best.slots.forEach(function(x){ done[x.e.id]=1; put(x.e, best.d, best.di, x.s, ['실전 세트('+best.slots.length+'과목)', (info[best.d].school?'하교 후 ':'수능 시간대 ')+C.minToHHMM(x.s)]); });
    /* 세트 날에 다 못 들어간 과목: 순서를 지키며 가장 가까운 뒷날에 */
    mem.forEach(function(e){
      if(done[e.id]) return;
      var b2=null;
      days.forEach(function(d,di){
        var D=info[d]; if(D.list.length>=D.cap) return;
        var st=slotIn(D,e,D.list); if(st==null) return;
        var c=Math.abs(di-best.di)*3+D.list.length*14+(di<=(lastIdx[e.subj]!=null?lastIdx[e.subj]:-1)?60:0);
        if(!b2||c<b2.c) b2={c:c,d:d,di:di,s:st};
      });
      if(!b2){ res.unplaced.push({examId:e.id,reason:'세트 날에 시간이 없고 다른 날도 비어 있지 않아요'}); remain[e.subj]--; return; }
      put(e, b2.d, b2.di, b2.s, ['세트 날에 다 못 들어가 따로 배치', C.minToHHMM(b2.s)+' 시작']);
    });
  });
  res.items.sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:a.startMin-b.startMin; });
  return res;
};
/* 배치 방식·순서 설명(화면 안내용) */
C.PACE_INFO = {
  even:{name:'균등형', when:'기간이 2주 이상이고 꾸준한 리듬이 필요할 때(기본 추천)', why:'시험 사이 간격이 일정해 매번 같은 양의 복기 시간이 생깁니다. 응시→채점→오답 정리→다음 응시의 순환이 안정적으로 돌아가 장기 계획에 가장 무난합니다.'},
  ramp:{name:'후반 집중형', when:'마감일이 실제 시험(수능·학평) 직전일 때', why:'앞쪽은 간격을 넓혀 약점 보완에 시간을 쓰고, 시험이 가까워질수록 촘촘하게 풀어 실전 감각과 시간 운영을 끌어올립니다. 직전 몇 주의 회복 시간이 짧아지므로 체력·복기 여유를 함께 확인하세요.'},
  front:{name:'전반 집중형', when:'학기·방학 초, 새로 관리하는 학생, 약점을 빨리 찾아야 할 때', why:'초반에 여러 회를 몰아 풀어 현재 실력과 약점을 빨리 진단하고, 후반은 간격을 넓혀 오답·개념 보완에 씁니다. 후반에 양이 몰리지 않는 방식입니다.'},
  weekend:{name:'주말 실전형', when:'학교 다니는 학생, 평일엔 긴 시험이 어려울 때', why:'긴 실전은 주말·쉬는 날에 보고 평일은 채점·오답 정리에 씁니다. 주 단위로 응시→복기 주기가 반복되어 현실적으로 지키기 쉽습니다.'},
  set:{name:'실전 세트형', when:'수능 1~2개월 전, 실전 하루 체력과 과목 전환 연습이 필요할 때', why:'같은 회차(같은 시행 시점)의 여러 과목을 하루에 수능 시간표 순서대로 봅니다. 과목 사이 집중력 전환과 하루 전체 체력 배분을 실제와 같이 훈련합니다. 세트 사이 간격은 고르게 둡니다.'}
};
C.ORDER_INFO = {
  chrono:{name:'시행 순서 (과거 → 최근)', why:'기출은 과거부터 풀어 최근 출제 경향을 마지막(실제 시험에 가장 가까운 때)에 만나게 합니다. 같은 해는 3·4월→6월→9월→수능 순, 사설·자체 시험은 회차 순이며, 기출과 사설이 섞이면 기출을 먼저 둡니다.'},
  recent:{name:'최근 기출부터', why:'기간이 짧거나 중간에 계획이 끊길 수 있을 때, 가장 최근 경향의 기출을 먼저 확보합니다.'},
  title:{name:'시험 이름 순', why:'시험 이름의 글자·숫자 순서대로 배정합니다(예전 방식).'}
};
/* 기본안 → 학생별 조정안 비교 */
C.diffPlans = function(base, mine){
  var bm={}; base.forEach(function(b){ bm[b.examId]=b; });
  return mine.map(function(m){ var b=bm[m.examId]; var ch=!b||b.date!==m.date||b.startMin!==m.startMin; return Object.assign({}, m, {changed:ch, from:b?{date:b.date,startMin:b.startMin}:null}); });
};

if(typeof module!=='undefined' && module.exports) module.exports = C;
else root.MPCore = C;
})(typeof window!=='undefined'?window:this);

/* MPRender — 별자리 리포트 / 성적표 페이지 HTML 생성 (DOM·Firebase 비의존, 데이터 스냅샷 → 문자열) */
(function(root){
'use strict';
var C=root.MPCore, R={};
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
R.esc=esc;
var SUBJ_COLORS={ko:'#7B1D1D',ma:'#B8841A',en:'#1d2a4a',hi:'#6b8a76',sc:'#7a5a9a',so:'#8a6a4a'};
var PALETTE=['#7B1D1D','#B8841A','#1d2a4a','#6b8a76','#7a5a9a','#8a6a4a'];
function colorOf(k,i){ return SUBJ_COLORS[k]||PALETTE[i%PALETTE.length]; }
var SCHOOL='멘토즈 스터디카페 울산송정점';
var CONTACT='카카오톡 채널 “멘토즈 울산송정점” · 010-2848-8317';
R.THEME_BASE='assets/theme/';
function img(n){ return R.THEME_BASE+String(n).padStart(2,'0')+'.jpg'; }
R.img=img;

/* 둥근 5각 별 (확정 디자인 #5) */
function star(cx,cy,r,fill,rot){
  var f=fill||'#B8841A',p=[],Ro=r*.8,Ri=r*.38;
  for(var i=0;i<10;i++){ var a=-Math.PI/2+i*Math.PI/5,rr=i%2?Ri:Ro; p.push((cx+rr*Math.cos(a)).toFixed(1)+','+(cy+rr*Math.sin(a)).toFixed(1)); }
  var g='<polygon points="'+p.join(' ')+'" fill="'+f+'" stroke="'+f+'" stroke-width="'+(r*.3).toFixed(1)+'" stroke-linejoin="round"/>';
  if(r>5) g+='<circle cx="'+(cx-r*.2).toFixed(1)+'" cy="'+(cy-r*.22).toFixed(1)+'" r="'+(r*.11).toFixed(1)+'" fill="#FDFBF7" opacity=".75"/>';
  return rot?'<g transform="rotate('+rot+' '+cx+' '+cy+')">'+g+'</g>':g;
}
R.star=star;
function seedRnd(str){ var s=0; for(var i=0;i<str.length;i++) s=(s*31+str.charCodeAt(i))>>>0; s=s||11; return function(){ s=(s*9301+49297)%233280; return s/233280; }; }
function ymdDot(s){ return s.replace(/-/g,'.'); }
function periodWord(days){ return days>=25?'달':days<=8?'주':'기간'; }
function dayWord(days){ return days>=25?'이번 달':days<=8?'이번 주':'이번 기간'; }
function frame(){ return '<div class="fr"></div><div class="fr2"></div>'; }
function foot(a,b){ return '<div class="ft"><span>'+esc(a)+'</span><span>'+esc(b)+'</span></div>'; }

/* ───────── 별자리 리포트 ───────── */
/* payload: {name, periodStart, periodEnd, analysis, comment, goals[], nextWord?} */
R.reportPages=function(P){
  var A=P.analysis, days=A.period.days;
  return [reportCover(P,A,days), reportInner1(P,A,days), reportInner2(P,A,days), reportBack(P,A,days)];
};
function reportCover(P,A,days){
  var rnd=seedRnd(P.name||'mono'), s='', G='#B8841A', N='#1d2a4a', B='#7B1D1D', PG='#EFDFAE', PR='#E8C6C6', PN='#C9D0E0';
  for(var i=0;i<46;i++){ var x=90+rnd()*614,y=110+rnd()*560,r=3+rnd()*6,c=[PG,PR,PN][i%3]; if(i%3===0) s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(1+rnd()*1.6).toFixed(1)+'" fill="'+G+'" opacity=".5"/>'; else s+=star(x,y,r,c,rnd()*72); }
  s+='<circle cx="150" cy="215" r="30" fill="'+G+'"/><circle cx="164" cy="205" r="27" fill="#FDFBF7"/>';
  // 실제 학습 데이터: 가장 많이 공부한 7일 → 별(크기=시간), 날짜순으로 이어 별자리
  var top=A.daily.slice().sort(function(a,b){return b.sec-a.sec;}).slice(0,7).filter(function(d){return d.sec>0;}).sort(function(a,b){return a.date<b.date?-1:1;});
  var pos=[[160,600],[245,470],[340,545],[395,385],[500,450],[575,300],[655,400]], cols=[PG,B,N,N,PG,B,N], maxs=top.reduce(function(m,d){return Math.max(m,d.sec);},1);
  if(top.length>=2){
    s+='<polyline fill="none" stroke="'+G+'" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0.1 9" points="'+top.map(function(d,i){return pos[i][0]+','+pos[i][1];}).join(' ')+'"/>';
  }
  top.forEach(function(d,i){ var r=(14+16*d.sec/maxs)*1.25; s+=star(pos[i][0],pos[i][1],r,cols[i],[0,12,-8,6,-12,10,-6][i]); });
  if(!top.length){ [[245,470],[395,385],[575,300]].forEach(function(p,i){ s+=star(p[0],p[1],18+i*4,PG,0); }); }
  s+=star(560,610,46,G,-8);
  [[200,360],[610,520],[300,660],[690,250]].forEach(function(p){ s+='<path d="M'+p[0]+','+(p[1]-9)+' V'+(p[1]+9)+' M'+(p[0]-9)+','+p[1]+' H'+(p[0]+9)+'" stroke="'+G+'" stroke-width="2.4" stroke-linecap="round"/>'; });
  return '<div class="mpr-pg mpr-rep">'+frame()+'<svg viewBox="0 0 794 1123" width="794" height="1123" style="position:absolute;left:0;top:0">'+s+'</svg>'
   +'<div style="position:absolute;top:60px;left:0;right:0;text-align:center"><span style="display:inline-block;border:1.2px solid var(--gold);color:var(--gold);font-size:10px;letter-spacing:4px;font-weight:700;padding:6px 18px;border-radius:99px">MONO PLANNER · CONSTELLATION</span></div>'
   +'<div style="position:absolute;top:772px;left:0;right:0;text-align:center"><div style="font-size:54px;font-weight:800;color:var(--navy);letter-spacing:3px"><span style="background:linear-gradient(transparent 62%,#F3E3B0 62%);padding:0 6px">별자리</span> 리포트</div>'
   +'<div style="margin:26px auto 12px;display:inline-block;border:1.4px solid var(--burg);border-radius:99px;padding:9px 34px;font-size:20px;color:var(--burg);font-weight:700;letter-spacing:8px">'+esc(P.name)+'</div>'
   +'<div class="sub" style="letter-spacing:2px;font-size:12px">'+ymdDot(A.period.start)+' — '+ymdDot(A.period.end)+' · 나의 '+days+'일 학습 기록</div></div>'
   +'<div style="position:absolute;bottom:58px;left:0;right:0;text-align:center;font-size:10px;letter-spacing:3px;color:var(--mut)">'+SCHOOL+'</div></div>';
}
function lineChartStudy(A){
  var W=680,H=230,pl=26,pr=10,pt=26,pb=34, d=A.daily, n=d.length;
  if(!A.hasStudy){
    var e='';
    for(var g=0;g<=3;g++){ var y=pt+(H-pt-pb)*g/3; e+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="#e8e0d0" stroke-dasharray="2 4"/>'; }
    e+=star(W/2,H/2-18,18,'#EFDFAE',0)+'<text x="'+W/2+'" y="'+(H/2+24)+'" text-anchor="middle" font-size="12" fill="#8a8478">이 기간에는 아직 학습 기록이 없어요. 오늘 첫 별을 켜 볼까요?</text>';
    return '<svg viewBox="0 0 '+W+' '+H+'" width="682" height="'+H+'">'+e+'</svg>';
  }
  var maxH=Math.max.apply(null,d.map(function(x){return x.sec/3600;})), max=Math.max(2,Math.ceil(maxH/2)*2), s='';
  for(var g2=0;g2<=3;g2++){ var y2=pt+(H-pt-pb)*g2/3; s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y2+'" y2="'+y2+'" stroke="#e8e0d0" stroke-dasharray="2 4"/><text x="0" y="'+(y2-3)+'" font-size="8" fill="#8a8478">'+Math.round(max-g2*max/3)+'h</text>'; }
  var span=W-pl-pr-20, pts=d.map(function(x,i){ var h=x.sec/3600; return [pl+10+(n>1?i*span/(n-1):span/2), pt+(H-pt-pb)*(1-h/max), h]; });
  s+='<polyline fill="none" stroke="#1d2a4a" stroke-width="1" points="'+pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ')+'"/>';
  var mx=A.best?A.best.sec/3600:0, k=n>45?0.8:1.5, bestDone=false;
  pts.forEach(function(p){
    var h=p[2], r=Math.min(9,2.5+h*k); if(h<=0){ s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="1.4" fill="#cfc6b0"/>'; return; }
    if(!bestDone && h===mx){ bestDone=true; s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="'+(r+7)+'" fill="none" stroke="#B8841A" stroke-width=".8" stroke-dasharray="2 2"/>'+star(p[0],p[1],r+2,'#B8841A',0)+'<text x="'+Math.min(W-40,Math.max(40,p[0])).toFixed(1)+'" y="'+(p[1]-r-13).toFixed(1)+'" font-size="9" text-anchor="middle" fill="#B8841A" font-weight="700">최고 '+C.fmtHM(A.best.sec)+'</text>'; }
    else s+=star(p[0],p[1],r,h>=maxH*0.75?'#7B1D1D':'#1d2a4a',0);
  });
  var ticks=Math.min(5,n); for(var t=0;t<ticks;t++){ var idx=ticks===1?0:Math.round(t*(n-1)/(ticks-1)); s+='<text x="'+pts[idx][0].toFixed(1)+'" y="'+(H-10)+'" font-size="9" fill="#8a8478" text-anchor="middle">'+C.mdLabel(d[idx].date)+'</text>'; }
  return '<svg viewBox="0 0 '+W+' '+H+'" width="682" height="'+H+'">'+s+'</svg>';
}
function radarSvg(A){
  var subs=A.subjects.slice(0,6);
  if(subs.length<3){
    return '<svg viewBox="-130 -132 260 262" width="320" height="274"><circle r="80" fill="none" stroke="#e0d3ac" stroke-dasharray="2 4"/><circle r="45" fill="none" stroke="#e0d3ac" stroke-dasharray="2 4"/>'+star(0,-4,14,'#EFDFAE',0)+'<text y="40" text-anchor="middle" font-size="10" fill="#8a8478">과목이 3개 이상 기록되면</text><text y="54" text-anchor="middle" font-size="10" fill="#8a8478">별자리가 그려져요</text></svg>';
  }
  var n=subs.length, r=95, t='', mx=subs[0].sec||1;
  [1,.66,.33].forEach(function(k){ var pp=subs.map(function(_,i){var a=-Math.PI/2+i*2*Math.PI/n; return (r*k*Math.cos(a)).toFixed(1)+','+(r*k*Math.sin(a)).toFixed(1);}).join(' '); t+='<polygon points="'+pp+'" fill="none" stroke="#e0d3ac" stroke-width=".8"/>'; });
  subs.forEach(function(_,i){ var a=-Math.PI/2+i*2*Math.PI/n; t+='<line x1="0" y1="0" x2="'+(r*Math.cos(a)).toFixed(1)+'" y2="'+(r*Math.sin(a)).toFixed(1)+'" stroke="#e8e0d0"/>'; });
  var vp=subs.map(function(s,i){ var v=Math.max(.15,s.sec/mx), a=-Math.PI/2+i*2*Math.PI/n; return [r*v*Math.cos(a),r*v*Math.sin(a)]; });
  t+='<polygon points="'+vp.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ')+'" fill="rgba(184,132,26,.12)" stroke="#B8841A" stroke-width="1.4"/>';
  vp.forEach(function(p){ t+=star(p[0],p[1],8,'#7B1D1D',0); });
  subs.forEach(function(s,i){ var a=-Math.PI/2+i*2*Math.PI/n; t+='<text x="'+(r*1.24*Math.cos(a)).toFixed(1)+'" y="'+(r*1.24*Math.sin(a)+3).toFixed(1)+'" font-size="10" text-anchor="middle" fill="#1d2a4a" font-weight="700">'+esc(C.clip(s.name,5))+'</text>'; });
  return '<svg viewBox="-130 -132 260 262" width="320" height="274">'+t+'</svg>';
}
function subjBars(A){
  var subs=A.subjects.slice(0,5); if(!subs.length) return '<div class="sub" style="padding:8px 0">기록된 과목이 없어요</div>';
  var mx=subs[0].sec||1;
  return subs.map(function(x,i){ return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:9px;font-size:11px"><span style="width:40px;font-weight:700;white-space:nowrap">'+esc(C.clip(x.name,4))+'</span><div style="flex:1;height:6px;background:#efe8d8;position:relative"><i style="display:block;height:6px;width:'+(x.sec/mx*100).toFixed(0)+'%;background:'+colorOf(x.key,i)+'"></i></div><span style="width:52px;text-align:right">'+C.fmtHM(x.sec)+'</span></div>'; }).join('');
}
function weekdayBlock(A){
  var v=A.weekdayAvg||[], mx=Math.max.apply(null,v.concat([1])), W=680,H=126,s='', names=['월','화','수','목','금','토','일'], bi=v.indexOf(Math.max.apply(null,v));
  if(!A.hasStudy) return '<div class="cardx" style="text-align:center;color:#8a8478">학습 기록이 쌓이면 요일별 공부 패턴이 이곳에 그려져요</div>';
  v.forEach(function(x,i){ var cx=60+i*(W-120)/6, h=Math.max(3,(x/mx)*56), y=100-h; s+='<rect x="'+(cx-14)+'" y="'+y.toFixed(1)+'" width="28" height="'+h.toFixed(1)+'" rx="4" fill="'+(i===bi?'#B8841A':'#e7dfca')+'"/>'+(i===bi?star(cx,y-12,9,'#B8841A',0):'')+'<text x="'+cx+'" y="118" text-anchor="middle" font-size="10" fill="#1d2a4a" font-weight="700">'+names[i]+'</text><text x="'+cx+'" y="'+(y-(i===bi?24:5)).toFixed(1)+'" text-anchor="middle" font-size="9" fill="#8a8478">'+(x>0?C.fmtHM(x):'')+'</text>'; });
  return '<svg viewBox="0 0 '+W+' '+H+'" width="682" height="'+H+'">'+s+'</svg>';
}
function reportInner1(P,A,days){
  var K=A.kpi, dw=dayWord(days);
  var kp=[[C.fmtHM(K.totalSec)||'0m','누적 순공시간'],[K.activeDays?C.fmtHM(K.avgActiveSec):'–','공부한 날 평균'],[K.submitRate+'%','플래너 제출률'],[K.compliance==null?'–':K.compliance+'%','시간 체크 준수율']];
  var stat='';
  stat+='<div class="it">✦ 가장 빛난 날 <b>'+(A.best?C.mdKo(A.best.date)+' ('+C.fmtHM(A.best.sec)+')':'–')+'</b></div>';
  stat+='<div class="it">✦ 최장 연속 학습 <b>'+(K.streak?K.streak+'일':'–')+'</b></div>';
  stat+='<div class="it">✦ 가장 많이 공부한 요일 <b>'+(A.bestDow?A.bestDow+'요일':'–')+'</b></div>';
  stat+='<div class="it">✦ 이전 '+days+'일 대비 <b>'+(K.deltaPct==null?'비교 기록 없음':(K.deltaPct>0?'+':'')+K.deltaPct+'%')+'</b></div>';
  return '<div class="mpr-pg mpr-rep">'+frame()+'<div class="in"><div class="num">01 — THIS '+(days>=25?'MONTH':days<=8?'WEEK':'PERIOD')+'</div><div class="h2">'+dw+'에 켜진 별</div><div class="sub">'+days+'일 동안 쌓은 순공시간으로 그린 나의 학습 별자리</div>'
   +'<div class="sec kp">'+kp.map(function(x){return '<div><b>'+esc(x[0])+'</b><span>'+x[1]+'</span></div>';}).join('')+'</div>'
   +'<div class="sec"><div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:6px">학습 별자리 <span class="sub" style="font-weight:400">· 별이 클수록 오래 공부한 날</span></div>'+lineChartStudy(A)+'</div>'
   +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px" class="sec"><div><div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px">과목 별자리</div>'+radarSvg(A)+'</div>'
   +'<div><div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:10px">과목별 학습시간</div>'+subjBars(A)+'<div class="cardx" style="margin-top:14px">'+stat+'</div></div></div>'
   +'<div class="sec" style="margin-top:14px"><div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:2px">요일별 평균 학습 <span class="sub" style="font-weight:400">· 금색 막대가 가장 열심히 공부한 요일</span></div>'+weekdayBlock(A)+'</div></div>'
   +foot('MONO PLANNER · '+P.name,'1 / 4')+'</div>';
}
function gradeChart(A){
  var W=680,H=330,pl=44,pr=64,pt=20,pb=36;
  var gs=A.grades.filter(function(g){return g.series.length;}).slice(0,6);
  if(!gs.length){
    return '<svg viewBox="0 0 '+W+' '+H+'" width="682" height="'+H+'">'+[0,1,2,3].map(function(g){var y=pt+(H-pt-pb)*g/3; return '<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="#e8e0d0" stroke-dasharray="2 4"/>';}).join('')
      +star(W/2,H/2-20,20,'#EFDFAE',0)+'<text x="'+W/2+'" y="'+(H/2+26)+'" text-anchor="middle" font-size="12" fill="#8a8478">이 기간에는 응시한 시험이 없어요.</text><text x="'+W/2+'" y="'+(H/2+44)+'" text-anchor="middle" font-size="12" fill="#8a8478">다음 시험에서 첫 별을 켜 볼까요?</text></svg>';
  }
  // x축: 시험 날짜(중복 제거) 시간순
  var keys={}, xs=[]; gs.forEach(function(g){ g.series.forEach(function(p){ if(!keys[p.date]){ keys[p.date]=1; xs.push(p.date); } }); }); xs.sort(); if(xs.length>8) xs=xs.slice(-8);
  var gradeMode=gs.every(function(g){return g.series.every(function(p){return p.grade!=null;});}) || gs.reduce(function(a,g){return a+g.series.filter(function(p){return p.grade!=null;}).length;},0) >= gs.reduce(function(a,g){return a+g.series.length;},0)*0.6;
  var vals=[]; gs.forEach(function(g){ g.series.forEach(function(p){ var v=gradeMode?p.grade:p.score; if(v!=null) vals.push(v); }); });
  var lo,hi,ticks=[];
  if(gradeMode){ lo=1; hi=Math.max(5,Math.max.apply(null,vals)); for(var t=lo;t<=hi;t++) ticks.push(t); }
  else { lo=Math.max(0,Math.floor((Math.min.apply(null,vals)-5)/10)*10); hi=Math.min(100,Math.ceil((Math.max.apply(null,vals)+3)/10)*10); if(hi-lo<20) hi=lo+20; for(var t2=lo;t2<=hi;t2+=10) ticks.push(t2); }
  var Y=function(v){ return gradeMode? pt+(H-pt-pb)*(v-lo)/(hi-lo) : pt+(H-pt-pb)*(1-(v-lo)/(hi-lo)); };
  var X=function(i){ return pl+30+(xs.length>1?i*(W-pl-pr-40)/(xs.length-1):(W-pl-pr-40)/2); };
  var s='';
  ticks.forEach(function(t){ var y=Y(t); s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="#e8e0d0" stroke-dasharray="2 4"/><text x="'+(pl-10)+'" y="'+(y+3).toFixed(1)+'" font-size="9" fill="#8a8478" text-anchor="end">'+t+(gradeMode?'등급':'')+'</text>'; });
  xs.forEach(function(d,i){ s+='<text x="'+X(i).toFixed(1)+'" y="'+(H-12)+'" font-size="9" fill="#8a8478" text-anchor="middle">'+C.mdLabel(d)+'</text>'; });
  var labelY=[];
  gs.forEach(function(g,gi){
    var col=colorOf(g.key,gi), pts=[];
    xs.forEach(function(d,i){ var p=g.series.filter(function(q){return q.date===d;})[0]; if(!p) return; var v=gradeMode?p.grade:p.score; if(v==null) return; pts.push([X(i),Y(v)]); });
    if(!pts.length) return;
    if(pts.length>1) s+='<polyline fill="none" stroke="'+col+'" stroke-width="1.6" points="'+pts.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1);}).join(' ')+'"/>';
    pts.forEach(function(q){ s+=star(q[0],q[1],8,col,0); });
    var l=pts[pts.length-1], ly=l[1]+3; while(labelY.some(function(y){return Math.abs(y-ly)<11;})) ly+=11; labelY.push(ly);
    s+='<text x="'+(l[0]+13).toFixed(1)+'" y="'+ly.toFixed(1)+'" font-size="10" font-weight="700" fill="'+col+'">'+esc(C.clip(g.name,4))+'</text>';
  });
  return '<svg viewBox="0 0 '+W+' '+H+'" width="682" height="'+H+'">'+s+'</svg>';
}
function changeCell(g){
  if(g.gradeDelta!=null){ if(g.gradeDelta>0) return '<span style="color:#2e7d4f;font-weight:700">▲ '+g.gradeDelta+'</span>'; if(g.gradeDelta<0) return '<span style="color:#b91c1c;font-weight:700">▼ '+(-g.gradeDelta)+'</span>'; return '―'; }
  if(g.scoreDelta!=null){ if(g.scoreDelta>0) return '<span style="color:#2e7d4f;font-weight:700">▲ '+g.scoreDelta+'점</span>'; if(g.scoreDelta<0) return '<span style="color:#b91c1c;font-weight:700">▼ '+(-g.scoreDelta)+'점</span>'; return '―'; }
  return '―';
}
function valCell(p){ if(!p) return '–'; return p.grade!=null?p.grade+'등급':(p.score!=null?p.score+'점':'–'); }
function itemsHtml(items){ return items.map(function(x){ return '<div class="it">✦ <b>'+esc(x.head)+'</b>'+(x.tail?' <span style="color:#555">'+esc(x.tail)+'</span>':'')+'</div>'; }).join(''); }
function reportInner2(P,A,days){
  var rows=A.grades.slice(0,7), comment=(P.comment&&P.comment.trim())||A.autoComment;
  var table = rows.length? '<table><tr><th style="width:13%">과목</th><th style="width:15%">학습 시간</th><th style="width:12%">첫 기록</th><th style="width:12%">최근</th><th style="width:10%">변화</th><th>한 줄 진단</th></tr>'
    +rows.map(function(g){ return '<tr><td><b>'+esc(C.clip(g.name,6))+'</b></td><td>'+(g.study>0?C.fmtHM(g.study):'–')+'</td><td>'+valCell(g.first)+'</td><td class="gd">'+valCell(g.last)+'</td><td>'+changeCell(g)+'</td><td style="text-align:left">'+esc(C.diagLine(g))+'</td></tr>'; }).join('')+'</table>'
    : '<div class="cardx" style="text-align:center;color:#8a8478">성적 기록이 쌓이면 과목별 변화와 진단이 이곳에 표시돼요</div>';
  return '<div class="mpr-pg mpr-rep">'+frame()+'<div class="in"><div class="num">02 — GRADE CONSTELLATION</div><div class="h2">성적의 별자리</div><div class="sub">'+ymdDot(A.period.start)+' ~ '+ymdDot(A.period.end)+' 응시한 시험 '+A.examCount+'회 · 학습 시간과 함께 읽은 변화</div>'
   +'<div class="sec" style="margin-top:12px">'+gradeChart(A)+'</div><div class="sec" style="margin-top:12px">'+table+'</div>'
   +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="sec"><div class="cardx" style="min-height:104px"><div class="num" style="font-size:10px">BRIGHT STARS</div><b>밝게 빛나는 별</b>'+itemsHtml(A.brightItems)+'</div>'
   +'<div class="cardx" style="min-height:104px"><div class="num" style="font-size:10px;color:var(--burg)">RISING STARS</div><b>더 키울 별</b>'+itemsHtml(A.risingItems)+'</div></div>'
   +'<div class="sec cardx" style="border-left:3px solid var(--gold)"><b class="mpr-ser" style="color:var(--navy)">선생님의 한마디</b><br>'+esc(C.clip(comment,170))+'</div>'
   +(rows.length<=5?'<div class="sec" style="margin-top:16px"><div style="font-size:11px;color:var(--mut);letter-spacing:2px">✎ 나의 한 줄 회고</div><div class="ln"></div><div class="ln"></div><div class="ln"></div></div>':'')+'</div>'+foot('MONO PLANNER · '+P.name,'2 / 4')+'</div>';
}
function reportBack(P,A,days){
  var goals=(P.goals&&P.goals.length?P.goals:A.goals).filter(function(x){return x&&x.trim();}).slice(0,3);
  var nw=periodWord(days), s='<g fill="none" stroke="#E6D6A8" stroke-width=".8"><circle cx="397" cy="300" r="210"/><circle cx="397" cy="300" r="160" stroke-dasharray="2 5"/></g>';
  var p=[[300,350],[350,260],[430,290],[470,210],[540,270]]; s+='<polyline fill="none" stroke="#B8841A" stroke-width="1.2" points="'+p.map(function(q){return q.join(',');}).join(' ')+'"/>';
  p.forEach(function(q,i){ s+=star(q[0],q[1],7+i%3*2,'#B8841A',0); });
  [[250,230],[560,390],[330,420]].forEach(function(q){ s+='<path d="M'+q[0]+','+(q[1]-7)+' Q'+q[0]+','+q[1]+' '+(q[0]+7)+','+q[1]+' Q'+q[0]+','+q[1]+' '+q[0]+','+(q[1]+7)+' Q'+q[0]+','+q[1]+' '+(q[0]-7)+','+q[1]+' Q'+q[0]+','+q[1]+' '+q[0]+','+(q[1]-7)+'Z" fill="#B8841A"/>'; });
  return '<div class="mpr-pg mpr-rep">'+frame()+'<svg viewBox="0 0 794 1123" width="794" height="1123" style="position:absolute;left:0;top:0">'+s+'</svg>'
   +'<div style="position:absolute;top:530px;left:90px;right:90px;text-align:center"><div class="eyebrow">NEXT CONSTELLATION</div><div class="mpr-ser" style="font-size:26px;font-weight:700;color:var(--navy);margin:10px 0 16px">다음 '+nw+', 새로운 별을 이어가요</div>'
   +'<div style="text-align:left;display:inline-block;font-size:12.5px;line-height:2.3">'+goals.map(function(g){return '<div>✦ &nbsp;'+esc(C.clip(g,26))+'</div>';}).join('')+'</div></div>'
   +'<div style="position:absolute;top:740px;left:120px;right:120px"><div style="font-size:11px;color:var(--mut);margin-bottom:2px;letter-spacing:2px">✎ 나의 다짐</div><div class="ln"></div><div class="ln"></div><div class="ln"></div><div class="ln"></div></div>'
   +'<div style="position:absolute;bottom:80px;left:0;right:0;text-align:center"><div class="mpr-ser" style="font-size:13px;color:var(--mut);line-height:2;margin-bottom:16px">“흩어진 하루하루도 이어 놓으면<br>하나의 별자리가 됩니다.”</div><div style="width:40px;height:1px;background:var(--gold);margin:0 auto 14px"></div><div class="mpr-ser" style="font-size:14px;color:var(--burg);font-weight:700">MONO PLANNER</div><div style="font-size:10px;color:var(--mut);margin-top:6px;line-height:1.9;letter-spacing:1px">'+SCHOOL+'<br>'+CONTACT+'</div></div></div>';
}

/* ───────── 성적표 (v2 · 2026.10 리뉴얼: 회화풍 테마 6종 · 성적 분석) ───────── */
var SERIF="'Noto Serif KR','Noto Serif CJK KR',serif";
R.CATCH='너의 꾸준함과 우리의 치열함이<br>기적을 이루길';
R.THEMES=[
{n:7,k:'lh',nm:'등대',en:'Steady Light',ink:'#2E4258',ac:'#C9805F',top:.075,bot:.78,bk:330,phrase:'같은 자리에서 매일 켜 둔 불빛이,<br>결국 길이 된다'},
{n:8,k:'rd',nm:'구름 위의 능선',en:'Step by Step',ink:'#33495A',ac:'#B8935A',top:.065,bot:.855,bk:250,phrase:'보이지 않던 정상도,<br>한 걸음씩 가까워진다'},
{n:9,k:'ch',nm:'봄, 꽃가지',en:'After Winter',ink:'#58474A',ac:'#C27C86',top:.165,bot:.945,bk:430,phrase:'겨울을 견딘 가지에,<br>가장 먼저 봄이 온다'},
{n:10,k:'lib',nm:'아침 서재',en:'Pages of Time',ink:'#463E33',ac:'#7E8654',top:.07,bot:.80,bk:330,phrase:'쌓인 시간은 사라지지 않는다,<br>실력이 될 뿐'},
{n:11,k:'ar',nm:'아치와 계단',en:'The Open Door',ink:'#4E4034',ac:'#B0704F',top:.065,bot:.93,bk:270,phrase:'문은, 끝까지 걸어온 사람에게 열린다'},
{n:12,k:'dn',nm:'새벽 직전',en:'Before Dawn',ink:'#46446A',ac:'#CF8D6E',top:.13,bot:.865,bk:200,phrase:'밤을 지나온 사람이,<br>가장 먼저 새벽을 본다'}];
R.THEMES.forEach(function(t){ t.cov='v2/'+t.k+'_cov'; t.bkImg='v2/'+t.k+'_bk'; t.paper='v2/'+t.k+'_in'; });
R.theme=function(id){ return R.THEMES.filter(function(t){return t.n===+id;})[0]||R.THEMES[0]; };
R.isOldTheme=function(id){ return +id>=1&&+id<=6; };
function bg(n){ return '<div class="mpr-bgi" style="background-image:url('+img(n)+')"></div>'; }
function oneLine(s){ return String(s).replace(/<br>/g,' '); }
function vars(c){ return '--ink:'+c.ink+';--ac:'+c.ac+';color:'+c.ink; }
var BRAND='MENTORS STUDY CAFE · ULSAN SONGJEONG';

function cardCover(c,P){
  var nm=esc(P.student.name), sub=esc([P.student.grade,P.coverLabel||P.periodLabel].filter(Boolean).join(' · '));
  var who='<div class="who"><b>'+nm+'</b>'+sub+'</div>', who2='<div class="who"><b>'+nm+'</b><br>'+sub+'</div>';
  var eb='<div class="eb">'+esc(c.en)+' · '+esc(P.year||'')+' Report</div>', T='<div class="ttl">성적 리포트</div>', ph='<div class="ph">';
  var t='';
  if(c.k==='lh') t='<div class="ab" style="left:0;right:0;top:832px;text-align:center">'+eb+'<div class="ttl" style="font-size:44px;margin:10px 0">성적 리포트</div>'+ph+oneLine(c.phrase)+'</div><div class="rl" style="margin:16px auto 12px"></div>'+who+'</div><div class="ab br" style="left:0;right:0;bottom:40px;text-align:center">'+BRAND+'</div>';
  else if(c.k==='rd') t='<div class="ab" style="left:72px;right:72px;top:110px">'+eb+'<div class="ttl" style="font-size:48px;margin:16px 0 18px">성적 리포트</div>'+ph+c.phrase+'</div></div><div class="ab" style="left:72px;right:72px;top:812px;display:flex;justify-content:space-between;align-items:flex-end">'+who2+'<div class="br" style="text-align:right;line-height:2">MENTORS STUDY CAFE<br>ULSAN SONGJEONG</div></div>';
  else if(c.k==='ch') t='<div class="ab" style="left:76px;top:760px;width:480px">'+eb+'<div class="ttl" style="font-size:46px;margin:14px 0 16px">성적 리포트</div>'+ph+c.phrase+'</div><div class="rl" style="margin:22px 0 14px"></div>'+who+'</div><div class="ab br" style="right:60px;bottom:40px">'+BRAND+'</div>';
  else if(c.k==='lib') t='<div class="ab" style="left:452px;right:40px;top:120px"><div class="eb">'+esc(c.en)+'</div><div class="ttl" style="font-size:44px;margin:18px 0 6px;line-height:1.3">성적<br>리포트</div><div style="font-size:11px;letter-spacing:.2em;opacity:.6">'+esc(P.year||'')+' REPORT</div><div class="rl" style="margin:30px 0 26px"></div>'+ph+'쌓인 시간은<br>사라지지 않는다,<br>실력이 될 뿐</div></div><div class="ab" style="left:452px;right:40px;top:880px">'+who2+'<div class="br" style="margin-top:26px;line-height:2">MENTORS STUDY CAFE<br>ULSAN SONGJEONG</div></div>';
  else if(c.k==='ar') t='<div class="ab" style="left:0;right:0;top:78px;text-align:center">'+eb+'<div class="ttl" style="font-size:44px;margin:12px 0">성적 리포트</div>'+ph+c.phrase+'</div></div><div class="ab" style="left:50%;transform:translateX(-50%);top:985px;background:rgba(250,245,236,.85);padding:14px 30px;text-align:center;white-space:nowrap">'+who+'<div class="br" style="margin-top:4px">'+BRAND+'</div></div>';
  else t='<div class="ab" style="left:0;right:0;top:812px;text-align:center">'+eb+'<div class="ttl" style="font-size:44px;margin:12px 0">성적 리포트</div>'+ph+oneLine(c.phrase)+'</div><div class="rl" style="margin:18px auto 14px"></div>'+who+'</div><div class="ab br" style="left:0;right:0;bottom:34px;text-align:center">'+BRAND+'</div>';
  return '<div class="mpr-pg mpr-c2" style="'+vars(c)+'">'+bg(c.cov)+t+'</div>';
}
function cardBack(c){
  var logo='<img src="'+R.THEME_BASE+'v2/logo_'+c.k+'.png" style="width:34px;height:34px;opacity:.85;display:block;margin:0 auto" alt="">';
  var top=(c.k==='ar'||c.k==='lib');
  return '<div class="mpr-pg mpr-c2" style="'+vars(c)+'">'+bg(c.bkImg)
   +'<div class="ab" style="left:0;right:0;top:'+c.bk+'px;text-align:center">'+(top?'<div style="margin-bottom:22px">'+logo+'</div>':'')+'<div class="rl" style="width:28px;margin:0 auto 26px"></div><div class="ph" style="font-size:19px;line-height:2;opacity:1">'+R.CATCH+'</div><div class="rl" style="width:28px;margin:26px auto 0"></div></div>'
   +'<div class="ab" style="left:0;right:0;bottom:42px;text-align:center">'+(top?'':'<div style="margin-bottom:9px">'+logo+'</div>')+'<div class="br">'+BRAND+' · TEAM MONO</div></div></div>';
}
/* ── 내지 부품 ── */
var DEFMAX={ko:100,ma:100,en:100,hi:50,sc:50,so:50}, DEFN={ko:45,ma:30,en:45,hi:20,sc:20,so:20};
function rmax(r){ return (r.an&&r.an.max)||DEFMAX[r.key]||100; }
function dot(d){ return String(d||'').replace(/-/g,'.'); }
function delta(r,prev){ if(!prev||r.score==null) return null; var p=prev.rows.filter(function(x){return x.label===r.label;})[0]; return p&&p.score!=null?r.score-p.score:null; }
function dh(d,u){ if(d==null) return ''; if(d===0) return '<span style="opacity:.6">― 유지</span>'; return d>0?'<span class="up">▲ '+d+(u||'')+'</span>':'<span class="dn">▼ '+(-d)+(u||'')+'</span>'; }
function sh(n,k,e){ return '<div class="sh"><span class="n">'+n+'</span><span class="k">'+k+'</span><span class="ln"></span><span class="e">'+e+'</span></div>'; }
function pad(n){ return (n<10?'0':'')+n; }
function wn(r){ return r.wrongNums||[]; }
function barH(r){ if(r.score==null) return ''; var p=Math.max(0,Math.min(100,r.score/rmax(r)*100)); return '<div class="bar"><i style="width:'+p.toFixed(1)+'%"></i><u style="left:'+p.toFixed(1)+'%"></u></div>'; }
function heroH(r,prev){
  var m=rmax(r), d=delta(r,prev), w=wn(r), wc=w.length||r.wrong;
  return '<div class="card hero"><div style="padding-right:26px"><div style="display:flex;align-items:baseline;gap:10px"><span style="font-family:'+SERIF+';font-weight:700;font-size:16px;letter-spacing:.06em">'+esc(sp(r.label)[0])+'</span>'+(sp(r.label)[1]?'<span style="font-size:11.5px;opacity:.75;letter-spacing:.02em">'+esc(sp(r.label)[1])+'</span>':'')+'<span class="cap">Raw Score</span></div>'
   +'<div class="big">'+(r.score==null?'–':r.score)+'<small>/ '+m+'</small></div>'+barH(r)+((r.unkNums||[]).length?'<div style="font-size:10.5px;margin-top:10px;color:var(--ac)">모름(?) 표시 <span style="font-family:'+SERIF+';margin-left:4px">'+r.unkNums.join(' · ')+'</span></div>':'')+'</div>'
   +'<div class="stats"><div class="st"><span>등급</span><b>'+(r.grade!=null?r.grade+'<em>등급</em>':'–')+'</b></div>'
   +'<div class="st"><span>오답</span><b>'+(wc!=null?wc+'<em>문항</em>':'–')+'</b></div>'
   +'<div class="st"><span>'+(d==null?'놓친 점수':'지난 시험 대비')+'</span><b>'+(d==null?(r.score==null?'–':(m-r.score)+'<em>점</em>'):dh(d,'<em>점</em>'))+'</b></div></div></div>';
}
function cardH(r,prev,dense){
  var d=delta(r,prev), w=wn(r);
  return '<div class="card sc'+(dense?' dz':'')+'"><div class="top"><span class="lb">'+subjH(r.label)+'</span><span class="gd">'+(r.grade!=null?'<b>'+r.grade+'</b>등급':'')+'</span></div>'
   +'<div class="num">'+(r.score==null?'–':r.score)+'<small>/ '+rmax(r)+'</small><span class="dl">'+dh(d,'')+'</span></div>'+barH(r)
   +'<div class="wl"><span class="wk">오답</span><span style="font-family:'+SERIF+';letter-spacing:.03em">'+(w.length?w.join(' · '):(r.wrong!=null?(r.wrong?r.wrong+'문항':'없음'):'–'))+'</span></div>'
   +((r.unkNums||[]).length?'<div class="wl uk"><span class="wk">모름</span><span style="font-family:'+SERIF+';letter-spacing:.03em">'+r.unkNums.join(' · ')+'</span></div>':'')+'</div>';
}
/* 오답 지도 난이도 색: 테마와 무관하게 확실히 구분되는 3색(초록·주황·진홍) */
var DCOL={'하':'#3E9B6E','중':'#E39A1F','상':'#B8323F'};
/* "수학 (확률과 통계)" → ['수학','확률과 통계'] : 과목명은 크게, 선택과목은 아래 작은 글씨로(잘림 방지) */
function sp(label){ var m=/^(.+?)\s*\((.+)\)\s*$/.exec(String(label||'')); return m?[m[1],m[2]]:[String(label||''),'']; }
function subjH(label,elCls){ var p=sp(label); return esc(p[0])+(p[1]?'<span class="'+(elCls||'el')+'">'+esc(p[1])+'</span>':''); }
function dc(c,d){ return DCOL[d]||c.ink; }
function strip(r,c,W,H,lab){
  var an=r.an||{}, N=an.N||Math.max.apply(null,[DEFN[r.key]||20].concat(wn(r))), pl=6,pr=6, X=function(i){return pl+(i-1)*(W-pl-pr)/Math.max(1,N-1);}, g='', cy=lab?(H-14)/2+4:H/2;
  var segs=an.segs||[], wm={}; wn(r).forEach(function(n){ wm[n]=(an.w&&an.w[n])||['']; });
  segs.forEach(function(s,j){ if(j){ var x=(X(s[0]-1)+X(s[0]))/2; g+='<line x1="'+x+'" x2="'+x+'" y1="'+(cy-12)+'" y2="'+(cy+8)+'" stroke="#000" stroke-opacity=".2" stroke-dasharray="2 2"/>'; } if(lab&&s[2]) g+='<text x="'+((X(s[0])+X(s[1]))/2)+'" y="'+(H-2)+'" font-size="9" text-anchor="middle" fill="'+c.ink+'" fill-opacity=".6">'+esc(s[2])+' '+s[0]+'–'+s[1]+'</text>'; });
  g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+cy+'" y2="'+cy+'" stroke="#000" stroke-opacity=".12"/>';
  var um={}; (r.unkNums||[]).forEach(function(n){ um[n]=1; });
  for(var i=1;i<=N;i++){ var w=wm[i]; if(um[i]) g+='<circle cx="'+X(i)+'" cy="'+cy+'" r="'+(lab?8:5.6)+'" fill="none" stroke="'+c.ink+'" stroke-width="1.3"'+(w?'':' stroke-dasharray="2 1.5"')+'/>'+(!w&&lab?'<text x="'+X(i)+'" y="'+(cy-11)+'" font-size="8.5" text-anchor="middle" fill="'+c.ink+'">'+i+'?</text>':'');
    if(w) g+='<circle cx="'+X(i)+'" cy="'+cy+'" r="'+(lab?5:3.6)+'" fill="'+dc(c,w[0])+'"'+(w[0]?'':' fill-opacity=".75"')+'/>'+(lab?'<text x="'+X(i)+'" y="'+(cy-9)+'" font-size="8.5" text-anchor="middle" fill="'+c.ink+'" fill-opacity=".85">'+i+'</text>':''); else g+='<line x1="'+X(i)+'" x2="'+X(i)+'" y1="'+(cy-2.5)+'" y2="'+(cy+2.5)+'" stroke="#000" stroke-opacity=".22"/>'; }
  return '<svg width="100%" viewBox="0 0 '+W+' '+H+'" style="display:block">'+g+'</svg>';
}
function leg(c){ return '<span class="leg2"><span><i style="background:'+DCOL['하']+'"></i>쉬움</span><span><i style="background:'+DCOL['중']+'"></i>보통</span><span><i style="background:'+DCOL['상']+'"></i>어려움</span></span>'; }
function nextOf(r){ var a=r.an; if(r.grade===1) return {keep:1}; if(!a||!a.next||r.score==null) return null; var need=a.next.min-r.score; return need>0?{need:need,g:a.next.g,min:a.next.min}:null; }
function cntD(r,d){ var a=r.an, n=0; if(!a||!a.w) return 0; wn(r).forEach(function(x){ var w=a.w[x]; if(w&&w[0]===d) n++; }); return n; }
function ptsD(r,d){ var a=r.an, n=0; if(!a||!a.w) return 0; wn(r).forEach(function(x){ var w=a.w[x]; if(w&&w[0]===d) n+=(w[2]||2); }); return n; }
function anal1(r,c){
  var a=r.an||{}, nx=nextOf(r), tiles=[];
  if(nx) tiles.push(['To Next Grade',nx.keep?'유지':nx.need+'<em>점</em>',nx.keep?'1등급 유지 중':nx.g+'등급 컷 '+nx.min+'점']);
  if(a.pack){ tiles.push(['Easy Misses',ptsD(r,'하')+'<em>점</em>','쉬운 문항 '+cntD(r,'하')+'개에서 놓친 점수']); tiles.push(['Hard Items',(a.hard-cntD(r,'상'))+'<em>/ '+a.hard+'</em>','고난도 문항 중 맞힌 개수']); }
  var h='<div class="card">';
  if(tiles.length) h+='<div class="tiles" style="grid-template-columns:repeat('+tiles.length+',1fr)">'+tiles.map(function(t){return '<div class="tile"><span class="cap">'+t[0]+'</span><b>'+t[1]+'</b><small>'+t[2]+'</small></div>';}).join('')+'</div>';
  if(wn(r).length) h+='<div class="amap"'+(tiles.length?'':' style="border-top:0"')+'><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span class="cap">Wrong Item Map · 오답 지도</span>'+(a.pack?leg(c):'')+'</div>'+strip(r,c,620,62,true)+'<div class="howto">읽는 법 · 가로줄은 1번부터 '+((r.an&&r.an.N)||'마지막')+'번까지 문항을 차례로 놓은 것이에요. 점이 찍힌 자리가 틀린 문항(위 숫자가 문항 번호)'+(a.pack?'이고, 점 색은 그 문항의 난이도예요':'이에요')+'.'+(a.segs&&a.segs.length>1?' 점선은 영역이 바뀌는 곳이에요.':'')+((r.unkNums||[]).length?' 동그라미 고리는 시험 중 모름(?)으로 표시한 문항이에요(점선 고리는 맞혔지만 모름).':'')+'</div></div>';
  if(a.pack&&a.segs&&a.segs.length>1&&wn(r).length){
    var tot=wn(r).length;
    h+='<div class="areas" style="grid-template-columns:repeat('+a.segs.length+',1fr)">'+a.segs.map(function(s){ var cn=0,pt=0; wn(r).forEach(function(x){ if(x>=s[0]&&x<=s[1]){ cn++; pt+=((a.w[x]||[])[2]||2); } }); return '<div class="ar"><b>'+esc(s[2])+'</b><span>'+cn+'문항 · '+pt+'점</span><div class="tr"><i style="width:'+(tot?cn/tot*100:0).toFixed(0)+'%"></i></div></div>'; }).join('')+'</div>';
  }
  return h+'</div>';
}
function analN(rows,c){
  var hasNext=rows.some(function(r){return nextOf(r);}), hasPack=rows.some(function(r){return r.an&&r.an.pack;}), hasW=rows.some(function(r){return wn(r).length;});
  var th='<th style="width:16%">과목</th>'+(hasNext?'<th style="width:15%">다음 등급까지</th>':'')+(hasPack?'<th style="width:15%">쉬운 문항 실점</th><th style="width:13%">고난도 적중</th>':'')+(hasW?'<th style="text-align:left;padding-left:10px">오답 지도'+(hasPack?'<span style="float:right;padding-right:10px">'+leg(c)+'</span>':'')+'</th>':'');
  return '<div class="card" style="padding:2px 0 8px"><table><tr>'+th+'</tr>'+rows.map(function(r){
    var nx=nextOf(r), a=r.an||{};
    return '<tr><td><b style="font-size:12px">'+subjH(r.label,'el2')+'</b></td>'
     +(hasNext?'<td>'+(nx?(nx.keep?'<i style="margin:0">1등급 유지</i>':'<b>'+nx.need+'</b><i>점</i>'):'<i style="margin:0">–</i>')+'</td>':'')
     +(hasPack?(a.pack?'<td><b>'+ptsD(r,'하')+'</b><i>점</i></td><td><b>'+(a.hard-cntD(r,'상'))+'</b><i>/ '+a.hard+'</i></td>':'<td><i style="margin:0">–</i></td><td><i style="margin:0">–</i></td>'):'')
     +(hasW?'<td class="mp">'+(wn(r).length?strip(r,c,300,20,false):'<i style="margin:0">'+(r.wrong===0?'오답 없음':'–')+'</i>')+'</td>':'')+'</tr>';
  }).join('')+'</table>'+(hasW?'<div class="howto" style="padding:8px 12px 0">오답 지도 읽는 법 · 가로줄은 1번부터 마지막 번호까지의 문항, 점이 찍힌 자리가 틀린 문항이에요'+(hasPack?'(색은 난이도)':'')+'. 점선은 영역이 바뀌는 곳이에요.'+(rows.some(function(r){return (r.unkNums||[]).length;})?' 고리는 시험 중 모름(?)으로 표시한 문항이에요(점선 고리는 맞혔지만 모름).':'')+'</div>':'')+'</div>';
}
function minreqH(M,c){
  if(!M||!M.items||!M.items.length) return '';
  var body;
  if(!M.full) body='<div class="howto" style="padding:10px 14px 4px;font-size:10.5px">이번 시험은 국어·수학·영어·탐구 2과목 등급이 모두 있어야 판정할 수 있어요. 등록된 수시 최저 기준만 보여 드려요.</div>';
  body=(body||'')+'<table><tr><th style="width:30%">대학 · 학과</th><th>수능최저 기준</th>'+(M.full?'<th style="width:17%">이번 시험</th><th style="width:16%">충족 여부</th>':'')+'</tr>'+M.items.map(function(it){
    return '<tr><td><b style="font-size:12px">'+esc(C.clip(it.school,10))+'</b><br><i style="margin:0">'+esc(C.clip([it.dept,it.type].filter(Boolean).join(' · '),18))+'</i></td><td style="font-size:10.5px">'+esc(it.req)+'</td>'
     +(M.full?'<td>'+(it.sum!=null?'<b>'+it.sum+'</b><i>'+it.target+'합 · '+esc(it.picked||'')+'</i>':'–')+'</td><td>'+(it.ok==null?'–':(it.ok?'<span class="mrq ok">충족</span>':'<span class="mrq no">미충족</span>'+(it.why?'<br><i style="margin:0;font-size:9px">'+esc(it.why)+'</i>':'')))+'</td>':'')+'</tr>';
  }).join('')+'</table>';
  return '<div class="card" style="padding:2px 0 6px">'+body+'</div>';
}
function hasAnal(rows){ return rows.some(function(r){ return wn(r).length||nextOf(r)||(r.an&&r.an.pack); }); }
function trendChart(ex,c){
  var labs=[]; ex.forEach(function(e){ e.rows.forEach(function(r){ if(labs.indexOf(r.label)<0) labs.push(r.label); }); }); labs=labs.slice(0,5);
  var all=[],gc=0; ex.forEach(function(e){ e.rows.forEach(function(r){ all.push(r); if(r.grade!=null) gc++; }); });
  var gm=gc>=all.length*0.6, W=666,H=230,pl=44,pr=84,pt=14,pb=26,n=ex.length, vals=[];
  function val(r){ return gm?r.grade:(r.score==null?null:Math.round(r.score/rmax(r)*100)); }
  all.forEach(function(r){ var v=val(r); if(v!=null) vals.push(v); }); if(!vals.length) return '';
  var lo,hi,ticks=[]; if(gm){ lo=1; hi=Math.max(5,Math.max.apply(null,vals)); for(var t=lo;t<=hi;t++) ticks.push(t); } else { lo=Math.max(0,Math.floor((Math.min.apply(null,vals)-5)/10)*10); hi=Math.min(100,Math.ceil((Math.max.apply(null,vals)+3)/10)*10); if(hi-lo<20) lo=Math.max(0,hi-20); for(var t2=lo;t2<=hi;t2+=10) ticks.push(t2); }
  var X=function(i){return pl+20+(n>1?i*(W-pl-pr-40)/(n-1):(W-pl-pr-40)/2);}, Y=function(v){return gm?pt+(H-pt-pb)*(v-lo)/(hi-lo):pt+(H-pt-pb)*(1-(v-lo)/(hi-lo));};
  var cols=[c.ink,c.ac,'#8f8a80','#6f8a7a','#9a7a8a'], s='', used=[], step=Math.ceil(n/8);
  ticks.forEach(function(t){ s+='<line x1="'+pl+'" x2="'+(W-pr+40)+'" y1="'+Y(t).toFixed(1)+'" y2="'+Y(t).toFixed(1)+'" stroke="#000" stroke-opacity=".08"/><text x="'+(pl-10)+'" y="'+(Y(t)+3.5).toFixed(1)+'" font-size="9.5" text-anchor="end" fill="'+c.ink+'" fill-opacity=".55">'+t+(gm?'등급':'%')+'</text>'; });
  ex.forEach(function(e,i){ if(i%step===0||i===n-1) s+='<text x="'+X(i).toFixed(1)+'" y="'+(H-6)+'" font-size="9.5" text-anchor="middle" fill="'+c.ink+'" fill-opacity=".65">'+C.mdLabel(e.date)+'</text>'; });
  labs.forEach(function(L,j){ var pts=[]; ex.forEach(function(e,i){ var r=e.rows.filter(function(x){return x.label===L;})[0]; var v=r?val(r):null; if(v!=null) pts.push([X(i),Y(v)]); }); if(!pts.length) return;
    if(pts.length>1) s+='<polyline fill="none" stroke="'+cols[j]+'" stroke-width="1.7" points="'+pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ')+'"/>';
    pts.forEach(function(p){ s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="3" fill="#fbf8f2" stroke="'+cols[j]+'" stroke-width="1.5"/>'; });
    var l=pts[pts.length-1], ly=l[1]+3.5; while(used.some(function(u){return Math.abs(u-ly)<12;})) ly+=12; used.push(ly);
    s+='<text x="'+(l[0]+12).toFixed(1)+'" y="'+ly.toFixed(1)+'" font-size="10" fill="'+cols[j]+'" font-weight="700">'+esc(C.clip(L,6))+'</text>'; });
  return '<svg width="100%" viewBox="0 0 '+W+' '+H+'" style="display:block">'+s+'</svg>';
}
function matrixH(ex){
  var labs=[]; ex.slice().reverse().forEach(function(e){ e.rows.forEach(function(r){ if(labs.indexOf(r.label)<0) labs.push(r.label); }); }); labs=labs.slice(0,6);
  return '<table><tr><th>시험</th>'+labs.map(function(l){return '<th>'+subjH(l,'el2')+'</th>';}).join('')+'</tr>'+ex.slice().reverse().map(function(e,i){
    return '<tr class="'+(i===0?'now':'')+'"><td>'+esc(C.clip(e.name.replace(/^20\d\d학년도\s*/,''),16))+'<i>'+dot(e.date).slice(5)+'</i></td>'+labs.map(function(L){ var r=e.rows.filter(function(x){return x.label===L;})[0]; return '<td>'+(r&&r.score!=null?'<b>'+r.score+'</b>'+(r.grade!=null?'<i>'+r.grade+'등급</i>':''):'–')+'</td>'; }).join('')+'</tr>'; }).join('')+'</table>';
}
function headH(c,P,cur,ex,pg){
  return '<div class="hd"><div><div class="cap">'+esc(c.en)+' · Academic Report'+(pg?' · '+pg:'')+'</div><h1>성적 리포트</h1></div><div class="r"><b>'+esc(C.clip(cur.name,28))+'</b><span>'+dot(cur.date)+' 시행'+(ex.length>1?' · 누적 '+ex.length+'회':'')+'</span></div></div><div class="dbl"></div>';
}
function metaH(P){
  var m=[['Name',P.student.name],['Grade',P.student.grade||'–'],['Branch',P.school||'울산송정점'],['Mentor',P.teacher||'–'],['Issued',String(P.issueLabel||'').replace(' 발급','')]];
  return '<div class="meta">'+m.map(function(x){return '<div><span class="cap">'+x[0]+'</span><b>'+esc(x[1])+'</b></div>';}).join('')+'</div>';
}
function noteH(P,no){ return '<div class="sec" style="margin-bottom:0">'+sh(pad(no),'선생님 한마디',"MENTOR'S NOTE")+'<div class="card cm"><span class="q">“</span>'+esc(P.comment).replace(/\n/g,'<br>')+(P.teacher?'<div class="sg">담당 '+esc(P.teacher)+'</div>':'')+'</div></div>'; }
function footH(c){ return '<div style="flex:1"></div><div class="brandft"><span>MENTORS STUDY CAFE · TEAM MONO</span><span>'+esc(c.nm)+'</span></div>'; }
function pageH(c,inner){ return '<div class="mpr-pg mpr-c2" style="'+vars(c)+'">'+bg(c.paper)+'<div class="c2box" data-h="'+Math.round((c.bot-c.top)*1123)+'" data-w="'+(c.w||666)+'" style="left:'+(c.left||64)+'px;width:'+(c.w||666)+'px;top:'+Math.round(c.top*1123)+'px;height:'+Math.round((c.bot-c.top)*1123)+'px">'+inner+'</div></div>'; }
R.cardInner=function(c,P){
  var inc=P.include||{}, ex=P.exams, cur=ex[ex.length-1], prev=ex.length>1?ex[ex.length-2]:null, rows=cur.rows, n=rows.length, multi=ex.length>1;
  var chart=multi&&inc.chart!==false, comment=inc.comment!==false&&P.comment&&String(P.comment).trim(), anal=hasAnal(rows);
  var mr=inc.minreq!==false&&P.minreq&&P.minreq.items&&P.minreq.items.length;
  var cols=n<=3?n:n===4?2:3, wW=c.w||666;
  /* 섹션: [제목, 영문, 본문 함수, 예상 높이(px)] — 예상 높이로 쪽을 나누고, 남는 오차는 R.fit이 살짝 줄여 맞춘다 */
  var S=[];
  S.push(['이번 시험'+(multi?'':''),multi?'THIS EXAM':'RESULTS',function(){ return n===1?heroH(rows[0],prev):'<div class="grid" style="grid-template-columns:repeat('+cols+',1fr)">'+rows.map(function(r){return cardH(r,prev,n>3);}).join('')+'</div>'; }, n===1?142:Math.ceil(n/cols)*((n>3?102:118)+(rows.some(function(r){return (r.unkNums||[]).length;})?16:0)+(rows.some(function(r){return sp(r.label)[1];})?13:0))+(Math.ceil(n/cols)-1)*12]);
  if(!multi) S[0][0]='과목별 성적';
  if(chart){ var tc=trendChart(ex,c); if(tc) S.push(['성적 흐름',/등급<\/text>/.test(tc)?'GRADE TREND':'SCORE TREND',function(){ return '<div class="card" style="padding:18px 14px 8px">'+tc+'</div>'; },236*(wW/666)]); }
  if(multi) S.push(['시험별 기록','RECORDS',function(){ return '<div class="card" style="padding:2px 0 0">'+matrixH(ex)+'</div>'; },22+30*ex.length]);
  if(anal) S.push(['성적 분석','ANALYSIS',function(){ return n===1?anal1(rows[0],c):analN(rows,c); }, n===1?(((nextOf(rows[0])||(rows[0].an&&rows[0].an.pack))?92:0)+(wn(rows[0]).length?160:0)+((rows[0].an&&rows[0].an.segs&&rows[0].an.segs.length>1)?56:0)):(46+33*n+rows.filter(function(r){return sp(r.label)[1];}).length*11+(rows.some(function(r){return wn(r).length;})?22:0))]);
  if(mr) S.push(['수시 수능최저','MINIMUM REQUIREMENTS',function(){ return minreqH(P.minreq,c); },30+44*P.minreq.items.length+(P.minreq.full?0:34)]);
  if(comment) S.push(['선생님 한마디',"MENTOR'S NOTE",function(){ return '<div class="card cm"><span class="q">“</span>'+esc(P.comment).replace(/\n/g,'<br>')+(P.teacher?'<div class="sg">담당 '+esc(P.teacher)+'</div>':'')+'</div>'; },36+Math.ceil(String(P.comment).length/(wW/11.5))*22+(P.teacher?22:0)]);
  var H=(c.bot-c.top)*1123, HEAD1=136, HEAD2=78, FOOT=22, SEC=42, TOL=1.2, hs=S.map(function(x){return SEC+x[3];}), sum=function(a,b){ var t=0; for(var i=a;i<b;i++) t+=hs[i]; return t; }, m=S.length, pages;
  /* 한 쪽에 80% 이상 크기로 들어가면 한 쪽, 아니면 두 쪽이 고르게 차도록 나눈다(한쪽만 텅 비지 않게) */
  if(HEAD1+sum(0,m)+FOOT<=H*TOL||m<2) pages=[S];
  else {
    var best=-1,bv=1e9; for(var k=1;k<m;k++){ var a1=(HEAD1+sum(0,k)+FOOT)/H, a2=(HEAD2+sum(k,m)+FOOT)/H, v=Math.max(a1,a2)+Math.abs(a1-a2)*0.15; if(v<bv){bv=v;best=k;} }
    if(Math.max((HEAD1+sum(0,best)+FOOT)/H,(HEAD2+sum(best,m)+FOOT)/H)<=TOL) pages=[S.slice(0,best),S.slice(best)];
    else { pages=[[]]; var used=HEAD1+FOOT; S.forEach(function(x,i){ if(pages[pages.length-1].length&&used+hs[i]>H*1.05){ pages.push([]); used=HEAD2+FOOT; } pages[pages.length-1].push(x); used+=hs[i]; }); }
  }
  var no=1, tot=pages.length;
  return pages.map(function(list,pi){
    var body=headH(c,P,cur,ex,tot>1?(pi+1)+' / '+tot:'')+(pi===0?metaH(P):'<div style="height:18px"></div>');
    list.forEach(function(x,i){ body+='<div class="sec"'+(i===list.length-1?' style="margin-bottom:0"':'')+'>'+sh(pad(no++),x[0],x[1])+x[2]()+'</div>'; });
    return pageH(c,body+footH(c));
  });
};
/* 페이지가 DOM에 붙은 뒤 내용이 넘치면 비율 그대로 축소 */
R.fit=function(root){
  [].forEach.call((root||document).querySelectorAll('.c2box'),function(b){
    var H=+b.getAttribute('data-h'), W0=+(b.getAttribute('data-w')||666); b.style.transform=''; b.style.width=W0+'px'; b.style.height=H+'px';
    var need=b.scrollHeight; if(need>H+1){ var k=H/need; b.style.height=need+'px'; b.style.width=(W0/k).toFixed(1)+'px'; b.style.transform='scale('+k.toFixed(4)+')';
      var need2=b.scrollHeight; if(need2>need+1){ k=H/need2; b.style.height=need2+'px'; b.style.width=(W0/k).toFixed(1)+'px'; b.style.transform='scale('+k.toFixed(4)+')'; } }
  });
};
var OLD_EN={1:'Lighthouse',2:'Above the Clouds',3:'Spring Path',4:'Morning Library',5:'Arch & Stairs',6:'Quiet Night'};
/* 기존 디자인(1~6): 표지·뒷표지는 예전 그대로, 내지는 새 레이아웃을 예전 편지지 위에 */
function oldAdapter(t){ return {n:t.n,k:'old'+t.n,nm:t.nm,en:OLD_EN[t.n]||'Academic Record',ink:t.lay==='night'?'#2f3550':t.tc,ac:t.ac,paper:t.paper,top:t.top/1123,bot:(1123-70)/1123,left:92,w:610}; }
R.cardPages=function(P){
  var old=R.isOldTheme(P.themeId)&&R.oldTheme, c=old?oldAdapter(R.oldTheme(P.themeId)):R.theme(P.themeId), inc=P.include||{}, out=[];
  if(!P.year) P.year=String(P.issueLabel||'').slice(0,4);
  if(!P.coverLabel) P.coverLabel=P.exams.length===1?P.exams[0].name:P.periodLabel;
  if(inc.cover!==false) out.push(old?R.oldCover(P):cardCover(c,P));
  if(inc.inner!==false&&P.exams.length) out=out.concat(R.cardInner(c,P));
  if(inc.back!==false) out.push(old?R.oldBack(P):cardBack(c));
  return out;
};
/* ───────── 성적표 (기존 디자인 · 1~6) ───────── */
(function(){

var THEMES=[
{n:1,nm:'등대',cov:1,bk:2,paper:5,top:104,sc:.98,hr:1,ac:'#4b6a8a',tc:'#2f4560',sub:'#4a627c',fr:'rgba(255,255,255,.75)',lay:'top',btc:'#2f4560',bpos:'top',scrim:'rgba(255,255,255,.5)',tag:'길을 비추는 한 학기의 기록'},
{n:2,nm:'구름 위의 능선',cov:6,bk:8,paper:9,top:106,sc:.92,hr:0,ac:'#4f7084',tc:'#2e4656',sub:'#3f5a6b',fr:'rgba(255,255,255,.7)',lay:'left',btc:'#2e4656',bpos:'top',scrim:'rgba(255,255,255,.45)',tag:'구름 위로 오르는<br>한 걸음의 기록'},
{n:3,nm:'봄, 벚꽃길',cov:10,bk:16,paper:17,top:186,sc:.84,hr:1,ac:'#b0566c',tc:'#5a2a38',sub:'#7d4a58',fr:'rgba(255,255,255,.85)',lay:'bottom',btc:'#5a2a38',bpos:'top',scrim:'rgba(255,255,255,.5)',tag:'봄처럼 피어나는 노력의 기록'},
{n:4,nm:'아침 도서관',cov:3,bk:7,paper:4,top:140,sc:.86,hr:0,ac:'#5f7a52',tc:'#34452a',sub:'#58694e',fr:'rgba(255,255,255,.8)',lay:'top',btc:'#34452a',bpos:'top',scrim:'rgba(255,255,255,.4)',tag:'한 장 한 장 쌓아 온 시간'},
{n:5,nm:'아치와 계단',cov:18,bk:15,paper:14,top:100,sc:.88,hr:1,ac:'#8a7448',tc:'#3a3626',sub:'#5a5642',fr:'rgba(255,255,255,.7)',lay:'arch',btc:'#3b3626',bpos:'card',card:'rgba(255,253,246,.82)',tag:'열린 문 너머의 내일'},
{n:6,nm:'고요한 밤',cov:13,bk:11,paper:12,top:108,sc:.9,hr:1,ac:'#34508a',tc:'#fff',sub:'#fff',fr:'rgba(255,255,255,.5)',lay:'night',btc:'#fff',bpos:'top',scrim:'rgba(10,18,50,.5)',tag:'밤이 깊을수록 또렷해지는 불빛',dark:true}];
var theme=function(id){ return THEMES.filter(function(t){return t.n===+id;})[0]||THEMES[0]; };
function bg(n){ return '<div class="mpr-bgi" style="background-image:url('+img(n)+')"></div>'; }
function cardCover(c,P){
  var tc=c.tc,sub=c.sub,t='';
  var info='<div style="display:inline-flex;gap:18px;align-items:center;font-size:14px;letter-spacing:2px;white-space:nowrap"><span class="mpr-ser" style="font-size:22px;letter-spacing:6px">'+esc(P.student.name)+'</span><span style="opacity:.5">|</span><span>'+esc(P.student.grade||SCHOOL.replace('멘토즈 스터디카페 ',''))+'</span><span style="opacity:.5">|</span><span>'+esc(P.issueLabel)+'</span></div>';
  var frame='<div class="mpr-ab" style="left:30px;top:30px;right:30px;bottom:30px;border:1px solid '+c.fr+'"></div><div class="mpr-ab" style="left:38px;top:38px;right:38px;bottom:38px;border:.6px solid '+c.fr+';opacity:.6"></div>';
  var year=(P.issueLabel||'').slice(0,4);
  if(c.lay==='top') t=frame+'<div class="mpr-ab" style="left:0;right:0;top:92px;text-align:center;color:'+tc+';font-size:13px;letter-spacing:8px">'+year+' · ACADEMIC RECORD</div><div class="mpr-ab mpr-ser" style="left:0;right:0;top:128px;text-align:center;font-size:118px;font-weight:700;color:'+tc+';letter-spacing:8px;text-indent:8px">성적표</div><div class="mpr-ab" style="left:0;right:0;top:290px;text-align:center;color:'+sub+';font-size:16px;letter-spacing:4px">'+c.tag+'</div><div class="mpr-ab" style="left:0;right:0;bottom:84px;text-align:center"><div style="display:inline-block;padding:16px 32px;background:rgba(255,255,255,.7);color:#2b3a4a;border:1px solid rgba(255,255,255,.8)">'+info+'</div></div>';
  if(c.lay==='left') t=frame+'<div class="mpr-ab" style="left:78px;top:96px;color:'+tc+';font-size:13px;letter-spacing:6px;line-height:2">'+year+'<br>ACADEMIC RECORD</div><div class="mpr-ab mpr-ser" style="left:70px;top:176px;font-size:132px;font-weight:700;color:'+tc+';letter-spacing:2px">성적표</div><div class="mpr-ab" style="left:80px;top:350px;color:'+sub+';font-size:16px;line-height:2.1;letter-spacing:4px;border-left:1.5px solid '+tc+';padding-left:16px">'+c.tag+'</div><div class="mpr-ab" style="left:78px;bottom:90px;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.35)">'+info+'</div>';
  if(c.lay==='bottom') t=frame+'<div class="mpr-ab" style="left:60px;right:60px;bottom:74px;padding:26px 30px;background:rgba(255,250,248,.86);border:1px solid rgba(255,255,255,.9);text-align:center;color:'+tc+'"><div style="font-size:12px;letter-spacing:8px;margin-bottom:6px">'+year+' · ACADEMIC RECORD</div><div class="mpr-ser" style="font-size:92px;font-weight:700;letter-spacing:8px;text-indent:8px;line-height:1.2">성적표</div><div style="color:'+sub+';font-size:14px;letter-spacing:4px;margin:4px 0 14px">'+c.tag+'</div><div style="border-top:1px solid rgba(0,0,0,.2);padding-top:14px;color:#3a2a30">'+info+'</div></div>';
  if(c.lay==='arch') t='<div class="mpr-ab" style="left:0;right:0;top:150px;text-align:center;color:'+tc+';font-size:12px;letter-spacing:8px">'+year+' · ACADEMIC RECORD</div><div class="mpr-ab mpr-ser" style="left:0;right:0;top:180px;text-align:center;font-size:100px;font-weight:700;color:'+tc+';letter-spacing:6px;text-indent:6px">성적표</div><div class="mpr-ab" style="left:0;right:0;top:318px;text-align:center;color:'+sub+';font-size:14px;letter-spacing:4px">'+c.tag+'</div><div class="mpr-ab" style="left:60px;right:60px;bottom:60px;text-align:center"><div style="display:inline-block;padding:14px 28px;background:rgba(255,253,246,.88);color:#3b3626">'+info+'</div></div>';
  if(c.lay==='night') t=frame+'<div class="mpr-ab" style="left:0;right:0;top:190px;text-align:center;color:#fff;font-size:12px;letter-spacing:9px;opacity:.9">'+year+' · ACADEMIC RECORD</div><div class="mpr-ab mpr-ser" style="left:0;right:0;top:220px;text-align:center;font-size:112px;font-weight:700;color:#fff;letter-spacing:8px;text-indent:8px;text-shadow:0 0 30px rgba(170,190,255,.45)">성적표</div><div class="mpr-ab" style="left:0;right:0;top:372px;text-align:center;color:rgba(255,255,255,.92);font-size:15px;letter-spacing:5px">'+c.tag+'</div><div class="mpr-ab" style="left:60px;right:60px;bottom:70px;text-align:center"><div style="display:inline-block;padding:14px 30px;background:rgba(18,24,58,.62);border:1px solid rgba(255,255,255,.55);color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.5)">'+info+'</div></div>';
  return '<div class="mpr-pg mpr-card">'+bg(c.cov)+t+'</div>';
}
function cardBack(c){
  var tc=c.btc,t='';
  var msg='<div class="mpr-ser" style="font-size:24px;line-height:2;letter-spacing:3px">지금의 기록이<br>더 멀리, 더 높은 내일을 만듭니다.</div><div style="font-size:10.5px;letter-spacing:6px;margin-top:14px;opacity:.85;line-height:2">YOUR TODAY CREATES<br>A BRIGHTER TOMORROW</div>';
  var sch='<div class="mpr-ser" style="font-size:20px;letter-spacing:3px">'+SCHOOL+'</div><div style="font-size:10px;letter-spacing:5px;margin-top:6px;opacity:.85">MENTORS STUDY CAFE · ULSAN SONGJEONG</div>';
  if(c.bpos==='top') t='<div class="mpr-ab" style="left:0;right:0;top:0;height:560px;background:linear-gradient('+c.scrim+',transparent)"></div><div class="mpr-ab" style="left:0;right:0;bottom:0;height:300px;background:linear-gradient(to top,rgba(0,0,0,.5),transparent)"></div><div class="mpr-ab" style="left:0;right:0;top:150px;text-align:center;color:'+tc+'">'+msg+'</div><div class="mpr-ab" style="left:0;right:0;bottom:70px;text-align:center;color:#fff;text-shadow:0 1px 10px rgba(0,0,0,.5)">'+sch+'</div>';
  else t='<div class="mpr-ab" style="left:90px;right:90px;top:120px;padding:34px 20px;text-align:center;background:'+c.card+';color:'+tc+';border:1px solid rgba(255,255,255,.7)">'+msg+'</div><div class="mpr-ab" style="left:90px;right:90px;bottom:70px;padding:18px;text-align:center;background:'+c.card+';color:'+tc+'">'+sch+'</div>';
  return '<div class="mpr-pg mpr-card">'+bg(c.bk)+t+'</div>';
}
/* 성적 추이 차트 (시험 순서대로, 과목별 선) — exams: [{name,date,rows:[{key,label,score,grade}]}] */
function cardChart(exams,h,ac){
  var W=630,H=h,px=44,py=18,pb=28, ex=exams, n=ex.length;
  var keys=[], lab={}; ex.forEach(function(e){ e.rows.forEach(function(r){ if(keys.indexOf(r.key)<0){ keys.push(r.key); lab[r.key]=r.label; } }); });
  keys=keys.slice(0,5);
  var gradeMode=ex.every(function(e){return e.rows.every(function(r){return r.grade!=null;});});
  var vals=[]; ex.forEach(function(e){ e.rows.forEach(function(r){ var v=gradeMode?r.grade:r.score; if(v!=null) vals.push(v); }); });
  if(!vals.length) return '';
  var lo,hi,ticks=[];
  if(gradeMode){ lo=1; hi=Math.max(4,Math.max.apply(null,vals)); for(var t=lo;t<=hi;t++) ticks.push(t); }
  else { lo=Math.max(0,Math.floor((Math.min.apply(null,vals)-5)/10)*10); hi=Math.min(100,Math.ceil((Math.max.apply(null,vals)+3)/10)*10); if(hi-lo<20) hi=lo+20; for(var t2=lo;t2<=hi;t2+=10) ticks.push(t2); }
  var Y=function(v){ return gradeMode? py+(H-py-pb)*(v-lo)/(hi-lo) : py+(H-py-pb)*(1-(v-lo)/(hi-lo)); };
  var X=function(i){ return px+14+(n>1?i*(W-px-60)/(n-1):(W-px-60)/2); };
  var cols=[ac,'#B8841A','#8a8a8a','#2f6d5b','#8a4a6a'], s='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">';
  ticks.forEach(function(t){ var y=Y(t); s+='<path d="M'+px+' '+y.toFixed(1)+'H'+(W-30)+'" stroke="rgba(0,0,0,.18)" stroke-width=".8" stroke-dasharray="3 4"/><text x="'+(px-8)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end" font-size="10.5" fill="#666">'+t+(gradeMode?'등급':'')+'</text>'; });
  var step=Math.ceil(n/8);
  ex.forEach(function(e,i){ if(i%step===0||i===n-1) s+='<text x="'+X(i).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10.5" fill="#666">'+C.mdLabel(e.date)+'</text>'; });
  keys.forEach(function(k,j){
    var pts=[]; ex.forEach(function(e,i){ var r=e.rows.filter(function(x){return x.key===k;})[0]; if(!r) return; var v=gradeMode?r.grade:r.score; if(v==null) return; pts.push([X(i),Y(v)]); });
    if(!pts.length) return;
    if(pts.length>1) s+='<polyline points="'+pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ')+'" fill="none" stroke="'+cols[j]+'" stroke-width="2.2" stroke-linejoin="round"/>';
    pts.forEach(function(p){ s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="3.8" fill="#fff" stroke="'+cols[j]+'" stroke-width="2"/>'; });
    s+='<rect x="'+(W-30-(keys.length-j)*64)+'" y="2" width="12" height="3" fill="'+cols[j]+'"/><text x="'+(W-14-(keys.length-j)*64)+'" y="8" font-size="10.5" font-weight="700" fill="'+cols[j]+'">'+esc(C.clip(lab[k],4))+'</text>';
  });
  return s+'</svg>';
}
function examBlock(e,showWrong){
  return '<div class="blk" style="margin-bottom:12px"><h3><span style="font-family:inherit;font-size:14.5px;font-weight:700;color:#2b2b2b"><i>●</i>'+esc(C.clip(e.name,26))+'</span><span>'+esc(e.date)+'</span></h3><table><tr><th>과목</th><th>원점수</th><th>등급</th>'+(showWrong?'<th>오답</th>':'')+'</tr>'
   +e.rows.map(function(r){ return '<tr><td class="l">'+esc(C.clip(r.label,12))+'</td><td>'+(r.score==null?'–':r.score)+'</td><td>'+(r.grade!=null?'<span class="gp">'+r.grade+'</span>':'–')+'</td>'+(showWrong?'<td>'+(r.wrong==null?'–':r.wrong+'개')+'</td>':'')+'</tr>'; }).join('')+'</table></div>';
}
/* 페이지 높이 추정치와 실제가 어긋나지 않도록 exam.rows 개수만 사용 */
var cardLayout=function(P){
  var c=theme(P.themeId), avail=C.cardAvail(c.top,c.sc);
  var inc=P.include||{};
  var exams=P.exams.map(function(e){ return {rows:e.rows.length}; });
  var chart=inc.chart!==false && P.exams.length>=2 && P.exams.some(function(e){return e.rows.some(function(r){return r.score!=null||r.grade!=null;});});
  var comment=!!(inc.comment&&P.comment&&P.comment.trim());
  return {avail:avail,chart:chart,comment:comment,pages:C.layoutCard(exams,{avail:avail,chart:chart,comment:comment,memo:inc.memo!==false,info:true})};
};
R.oldCardPages=function(P){
  var c=theme(P.themeId), inc=P.include||{}, L=cardLayout(P), out=[];
  if(inc.cover!==false) out.push(cardCover(c,P));
  if(inc.inner!==false){
    var sorted=P.exams;
    L.pages.forEach(function(pg,pi){
      var body='';
      pg.blocks.forEach(function(b){
        if(b.t==='info') body+='<div class="blk"><h3><span style="font-family:inherit;font-size:14.5px"><i>01</i>학생 기본 정보</span></h3><table><tr><td class="l" style="width:14%">소속</td><td style="width:36%">'+esc(P.school||SCHOOL.replace('멘토즈 ',''))+'</td><td class="l" style="width:14%">학년</td><td>'+esc(P.student.grade||'–')+'</td></tr><tr><td class="l">이름</td><td>'+esc(P.student.name)+'</td><td class="l">담당</td><td>'+esc(P.teacher||'담당 선생님')+'</td></tr></table></div>';
        else if(b.t==='exam') body+=examBlock(sorted[b.i],P.showWrong);
        else if(b.t==='chart') body+='<div class="blk"><h3><span style="font-family:inherit;font-size:14.5px"><i>●</i>성적 변화 추이</span></h3><div class="chartbox">'+cardChart(sorted,b.h-54,c.ac)+'</div></div>';
        else if(b.t==='comment') body+='<div class="blk"><h3><span style="font-family:inherit;font-size:14.5px"><i>●</i>종합 의견</span></h3><div class="cm">'+esc(P.comment).replace(/\n/g,'<br>')+'<div class="sg">담당 선생님 '+esc(P.teacher||'')+'</div></div></div>';
        else if(b.t==='memo'){ var lines=Math.max(1,Math.floor((b.h-66)/30)); body+='<div class="blk" style="margin-bottom:0"><h3><span style="font-family:inherit;font-size:14.5px"><i>✎</i>다음 시험 목표</span></h3><div class="memo" style="height:'+(b.h-40)+'px;overflow:hidden">'+new Array(lines+1).join('<div class="ml"></div>')+'</div></div>'; }
      });
      var first=pi===0, hd=first?'<div class="hd"><div><small>'+esc(P.periodLabel||'')+'</small><h1>성적표</h1></div><div class="r" style="'+(c.hr?'visibility:hidden':'')+'">ACADEMIC<br>REPORT CARD</div></div>'
        : '<div class="hd" style="padding-bottom:6px"><div><small>'+esc(P.student.name)+' · '+(pi+1)+'쪽</small></div><div class="r" style="'+(c.hr?'visibility:hidden':'')+'">REPORT CARD</div></div>';
      out.push('<div class="mpr-pg mpr-card" style="--ac:'+c.ac+'">'+bg(c.paper)+'<div class="box" style="top:'+c.top+'px;width:'+(610/c.sc).toFixed(1)+'px;transform:scale('+c.sc+')">'+hd+body+'</div></div>');
    });
  }
  if(inc.back!==false) out.push(cardBack(c));
  return out;
};
R.OLD_THEMES=THEMES;
R.oldCover=function(P){ return cardCover(theme(P.themeId),P); };
R.oldBack=function(P){ return cardBack(theme(P.themeId)); };
R.oldTheme=theme;
})();
root.MPRender=R;
if(typeof module!=='undefined'&&module.exports) module.exports=R;
})(typeof window!=='undefined'?window:this);


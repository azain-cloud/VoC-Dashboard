/* ════════════════════════════════════════════════════
   Rewaa VoC Insights Portal — voc-app.js
   ════════════════════════════════════════════════════ */

var CFG = {
  CLIENT_ID:  "11249982937-ru4m3a85dkr6a7errjlj5hcljoujmr18.apps.googleusercontent.com",
  DOMAIN:     "rewaa.com",
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbx6DY-ARq_96Qi7BblTbGarICq_aACInWK96Dx1TuAcf-OMHdEomQ_sIWzOhwTlIj0V/exec",
  DATE_MIN:   "2022-10-27",
};

/* runtime config — populated after auth from the backend */
var RUNTIME = { ideasScript: null };

/* ── STATE ── */
var LANG = "en";
var DARK = false;
var RTL  = false;
var IDEAS_RAW = [];
var ideasPage = 1;
var IDEAS_PER_PAGE = 20;
var activeIdeasTab = "ideas";

/* multi-select state */
var msState = {
  msIS: [], msIM: [],
  msAS: [], msAM: [],
  msTS: [], msTM: [],
};

/* chart refs */
var charts = {};

/* NPS comment filter */
var npsComFilter = "all";
var trComFilter  = "all";

/* ════════════════════════════════════════════════════
   GOOGLE SIGN-IN
   ════════════════════════════════════════════════════ */
function initGSI() {
  var saved = localStorage.getItem("voc_token");
  if (saved) { applyAuth(saved); return; }
  google.accounts.id.initialize({
    client_id:   CFG.CLIENT_ID,
    callback:    handleGSI,
    auto_select: true,
    hd:          "rewaa.com",   // restrict account picker to @rewaa.com at OAuth level
  });
  google.accounts.id.renderButton(document.getElementById("gsiButton"), {
    theme: "filled_black", size: "large", width: 280, shape: "rectangular",
  });
  google.accounts.id.prompt();
}

function handleGSI(response) {
  var p = JSON.parse(atob(response.credential.split(".")[1]));
  var domain = (p.email || "").split("@")[1] || "";
  if (domain !== CFG.DOMAIN) {
    document.getElementById("lboxErr").style.display = "block";
    google.accounts.id.disableAutoSelect();
    return;
  }
  localStorage.setItem("voc_token", response.credential);
  applyAuth(response.credential);
}

function applyAuth(token) {
  var p    = JSON.parse(atob(token.split(".")[1]));
  var name = (p.given_name || p.name || p.email || "").split(" ")[0];
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("app").style.display = "block";
  document.getElementById("userBadge").textContent = "👤 " + name;

  var script = document.createElement("script");
  script.src = CFG.SCRIPT_URL + "?action=getConfig&token=" + encodeURIComponent(token) + "&cb=" + Date.now() + "&callback=onConfig";
  document.head.appendChild(script);
}

function onConfig(data) {
  if (data && data.ideasScript) RUNTIME.ideasScript = data.ideasScript;
  bootApp();
}

function signOut() {
  localStorage.removeItem("voc_token");
  google.accounts.id.disableAutoSelect();
  location.reload();
}

/* ════════════════════════════════════════════════════
   NAVIGATION
   ════════════════════════════════════════════════════ */
function goto(sec) {
  ["home","ideas","nps","training"].forEach(function(s) {
    document.getElementById("sec" + s.charAt(0).toUpperCase() + s.slice(1)).classList.remove("act");
    document.getElementById("nav" + s.charAt(0).toUpperCase() + s.slice(1)).classList.remove("act");
  });
  document.getElementById("sec" + sec.charAt(0).toUpperCase() + sec.slice(1)).classList.add("act");
  document.getElementById("nav" + sec.charAt(0).toUpperCase() + sec.slice(1)).classList.add("act");
  window.scrollTo(0, 0);
  refreshIndicators();
}

/* ════════════════════════════════════════════════════
   THEME & LANGUAGE
   ════════════════════════════════════════════════════ */
function toggleTheme() {
  DARK = !DARK;
  document.body.classList.toggle("dark", DARK);
  document.getElementById("themeBtn").textContent = DARK ? "☀️" : "🌙";
  redrawCharts();
}

function setLang(lang) {
  LANG = lang;
  RTL  = (lang === "ar");
  document.body.classList.toggle("rtl", RTL);
  document.getElementById("lbAr").classList.toggle("act", lang === "ar");
  document.getElementById("lbEn").classList.toggle("act", lang === "en");
  document.getElementById("logoAr").style.display = lang === "ar" ? "" : "none";
  document.getElementById("logoEn").style.display = lang === "en" ? "" : "none";
  applyTranslations();
  refreshIndicators();
}

var T = {
  en: {
    /* nav */
    navHome:"Home", navIdeas:"Customer Ideas", navNps:"NPS Insights", navTraining:"Training Feedback",
    hdrTitle:"VoC Insights", hdrSub:"Voice of Customer Portal",
    /* login */
    lboxTitle:"VoC Insights Portal", lboxSub:"Sign in with your Rewaa Google account to access the dashboard",
    /* hero */
    heroBadge:"🎯 Voice of Customer", heroTitle:"Insights that Shape Our Product",
    heroSub:"One unified portal for customer ideas, NPS scores, and training feedback.",
    heroBtn1:"Explore Ideas", heroBtn2:"View NPS Trends",
    hstat1l:"Customer Ideas", hstat2l:"NPS Score", hstat3l:"Training Satisfaction", hstat4l:"Ideas Launched",
    /* about */
    aboutTag:"ABOUT THIS PORTAL", aboutTitle:"Understanding Our Customers, Better",
    aboutBody:"At Rewaa, our customers are at the heart of everything we build. This portal consolidates three key feedback streams to help the product and success teams make data-driven decisions.",
    af1t:"Product Ideas", af1d:"Customers submit and vote on feature requests, helping prioritize the roadmap based on real demand.",
    af2t:"NPS Measurement", af2d:"Regular surveys capture loyalty trends, segment performance, and verbatim customer sentiment.",
    af3t:"Training Quality", af3d:"Post-training surveys track satisfaction per module, helping improve delivery and content quality.",
    avTitle:"Live Dashboard Metrics",
    av1l:"Customer Ideas", av1s:"Total submitted via Frill",
    av2l:"Launched Features", av2s:"From customer requests",
    av3l:"NPS Score", av3s:"Q2 2026 average",
    av4l:"Training Rating", av4s:"Average out of 5",
    /* docs */
    docsTag:"USEFUL DOCS", docsTitle:"Resources & References", docsSub:"Quick links to documents, sheets, and tools used by the team.",
    /* dashboard cards */
    dashTag:"DASHBOARDS", dashTitle:"Choose a Feedback Channel",
    dashSub:"Dive into each VoC stream to uncover insights and track progress over time.",
    dc1title:"Customer Ideas", dc1desc:"Browse, filter, and analyze over 2,400 product ideas. Track status, votes, and launch rates by module.",
    dc2title:"NPS Insights", dc2desc:"Track NPS trends across customer segments. Understand promoters, passives, and detractors with verbatim feedback.",
    dc3title:"Training Feedback", dc3desc:"Measure training session quality across onboarding, POS, inventory, and more. Identify modules needing improvement.",
    dc1arrow:"Open Dashboard →", dc2arrow:"Open Dashboard →", dc3arrow:"Open Dashboard →",
    /* ideas */
    tIdeasLbl:"Ideas", tAnalysisLbl:"Analysis", tTrendsLbl:"Trends",
    kpiTotalLbl:"Total Ideas", kpiLaunchedLbl:"Launched", kpiVotesLbl:"Total Votes", kpiPendingLbl:"Pending",
    msISLbl:"Status", msIMLbl:"Module", sortV:"Most Voted", sortD:"Newest",
    iFromLbl:"From:", iToLbl:"To:", iResetBtn:"Reset",
    msASLbl:"Status", msAMLbl:"Module", aFromLbl:"From:", aToLbl:"To:", aResetBtn:"Reset",
    aTitleStatus:"Ideas by Status", aSubStatus:"Click to filter",
    aTitleModule:"Ideas by Module", aSubModule:"Click to filter",
    aTitle20:"🏆 Top 20 Ideas by Votes", aSub20:"Click to open in Frill",
    aTitle5:"👥 Top 5 Customers",
    aTitleLR:"📦 Launch Rate by Module",
    msTSLbl:"Status", msTMLbl:"Module", tFromLbl:"From:", tToLbl:"To:", tResetBtn:"Reset",
    tIvLbl:"Interval:", ivM:"Monthly", ivQ:"Quarterly", ivY:"Yearly",
    tTitle1:"Trend Over Time", tSub1:"Monthly", tTitle2:"Trend by Module", tTitle3:"Trend by Status",
    /* nps */
    npsPageTitle:"📊 NPS Insights", npsPageSub:"1,847 responses · May 2026",
    nkpi1l:"NPS Score", nkpi1s:"Good · Target: 50",
    nkpi2l:"Promoters (9-10)", nkpi3l:"Passives (7-8)", nkpi4l:"Detractors (0-6)",
    npsDistTitle:"NPS Distribution", npsDistSub:"1,847 survey responses · May 2026",
    gaugeLbl:"Net Promoter Score", gaugeZoneText:"Good",
    nbl1:"😊 Promoters", nbl2:"😐 Passives", nbl3:"😞 Detractors",
    npsFormLabel:"NPS = % Promoters − % Detractors",
    npsTrendTitle:"NPS Trend", npsTrendSub:"Jan 2025 – May 2026",
    npsDistScoreTitle:"Score Distribution (0–10)", npsDistScoreSub:"How respondents rated Rewaa",
    npsSegTitle:"NPS by Segment", npsSegSub:"Performance across merchant categories",
    npsComTitle:"Customer Verbatims", npsComSub:"Recent NPS responses",
    /* training */
    trPageTitle:"🎓 Training Feedback", trPageSub:"423 respondents · H1 2026",
    tkpi1l:"Overall Rating", tkpi2l:"Completion Rate", tkpi2s:"368 of 423",
    tkpi3l:"Sessions Delivered", tkpi4l:"Would Recommend", tkpi4s:"Would recommend to peers",
    trTrendTitle:"Rating Trend", trTrendSub:"Jan – Jun 2026",
    trRadarTitle:"Satisfaction by Dimension", trRadarSub:"Average score per dimension",
    trSessTitle:"Rating by Module", trSessSub:"All training modules",
    trBarTitle:"Module Comparison", trBarSub:"Rating and completion rate per module",
    trSatTitle:"Satisfaction Dimensions", trSatSub:"Detailed quality breakdown",
    trComTitle:"Participant Feedback", trComSub:"Post-training survey comments",
    footerCopy:"© 2026 Rewaa · VoC Insights Portal · Internal Use Only",
  },
  ar: {
    navHome:"الرئيسية", navIdeas:"أفكار العملاء", navNps:"مؤشر NPS", navTraining:"تقييم التدريب",
    hdrTitle:"بوابة صوت العميل", hdrSub:"منصة ملاحظات العملاء",
    lboxTitle:"بوابة صوت العميل", lboxSub:"سجّل دخولك بحساب Rewaa Google للوصول إلى لوحة التحكم",
    heroBadge:"🎯 صوت العميل", heroTitle:"رؤى تُشكّل منتجنا",
    heroSub:"منصة موحدة للأفكار ونتائج NPS وتقييمات التدريب.",
    heroBtn1:"استعرض الأفكار", heroBtn2:"اطّلع على اتجاهات NPS",
    hstat1l:"أفكار العملاء", hstat2l:"مؤشر NPS", hstat3l:"رضا التدريب", hstat4l:"أفكار أُطلقت",
    aboutTag:"عن البوابة", aboutTitle:"نفهم عملاءنا بشكل أعمق",
    aboutBody:"في رواء، العميل هو محور كل ما نبنيه. تجمع هذه البوابة ثلاثة مصادر رئيسية للملاحظات لمساعدة فرق المنتج والنجاح في اتخاذ قرارات مبنية على البيانات.",
    af1t:"أفكار المنتج", af1d:"يقدم العملاء اقتراحات الميزات ويصوتون عليها، مما يساعد على تحديد أولويات خارطة الطريق بناءً على الطلب الفعلي.",
    af2t:"قياس NPS", af2d:"تلتقط الاستطلاعات الدورية اتجاهات الولاء وأداء الشرائح وملاحظات العملاء الحرفية.",
    af3t:"جودة التدريب", af3d:"تتتبع استطلاعات ما بعد التدريب الرضا لكل وحدة، مما يساعد على تحسين التقديم وجودة المحتوى.",
    avTitle:"مقاييس مباشرة",
    av1l:"أفكار العملاء", av1s:"إجمالي المقدمة عبر Frill",
    av2l:"الميزات المُطلقة", av2s:"من طلبات العملاء",
    av3l:"مؤشر NPS", av3s:"متوسط الربع الثاني 2026",
    av4l:"تقييم التدريب", av4s:"متوسط من 5",
    docsTag:"مستندات مفيدة", docsTitle:"الموارد والمراجع", docsSub:"روابط سريعة للمستندات والجداول والأدوات التي يستخدمها الفريق.",
    dashTag:"لوحات التحكم", dashTitle:"اختر قناة التغذية الراجعة",
    dashSub:"انغمس في كل تدفق لاكتشاف الرؤى وتتبع التقدم.",
    dc1title:"أفكار العملاء", dc1desc:"تصفح وفلتر وحلل أكثر من 2400 فكرة للمنتج. تتبع الحالة والأصوات ومعدلات الإطلاق حسب الوحدة.",
    dc2title:"مؤشر NPS", dc2desc:"تتبع اتجاهات NPS عبر شرائح العملاء. افهم المروجين والسلبيين والمعارضين مع التغذية الراجعة الحرفية.",
    dc3title:"تقييم التدريب", dc3desc:"قِس جودة جلسات التدريب عبر الإعداد ونقاط البيع والمخزون وغيرها.",
    dc1arrow:"فتح لوحة التحكم ←", dc2arrow:"فتح لوحة التحكم ←", dc3arrow:"فتح لوحة التحكم ←",
    tIdeasLbl:"الأفكار", tAnalysisLbl:"التحليل", tTrendsLbl:"الاتجاهات",
    kpiTotalLbl:"إجمالي الأفكار", kpiLaunchedLbl:"مُطلق", kpiVotesLbl:"إجمالي الأصوات", kpiPendingLbl:"قيد الانتظار",
    msISLbl:"الحالة", msIMLbl:"الوحدة", sortV:"الأكثر تصويتاً", sortD:"الأحدث",
    iFromLbl:"من:", iToLbl:"إلى:", iResetBtn:"إعادة تعيين",
    msASLbl:"الحالة", msAMLbl:"الوحدة", aFromLbl:"من:", aToLbl:"إلى:", aResetBtn:"إعادة تعيين",
    aTitleStatus:"الأفكار حسب الحالة", aSubStatus:"انقر للفلترة",
    aTitleModule:"الأفكار حسب الوحدة", aSubModule:"انقر للفلترة",
    aTitle20:"🏆 أفضل 20 فكرة حسب الأصوات", aSub20:"انقر للفتح في Frill",
    aTitle5:"👥 أفضل 5 عملاء",
    aTitleLR:"📦 معدل الإطلاق حسب الوحدة",
    msTSLbl:"الحالة", msTMLbl:"الوحدة", tFromLbl:"من:", tToLbl:"إلى:", tResetBtn:"إعادة تعيين",
    tIvLbl:"الفترة:", ivM:"شهري", ivQ:"ربعي", ivY:"سنوي",
    tTitle1:"الاتجاه عبر الزمن", tSub1:"شهري", tTitle2:"الاتجاه حسب الوحدة", tTitle3:"الاتجاه حسب الحالة",
    npsPageTitle:"📊 مؤشر NPS", npsPageSub:"1,847 استجابة · مايو 2026",
    nkpi1l:"مؤشر NPS", nkpi1s:"جيد · الهدف: 50",
    nkpi2l:"المروجون (9-10)", nkpi3l:"السلبيون (7-8)", nkpi4l:"المعارضون (0-6)",
    npsDistTitle:"توزيع NPS", npsDistSub:"1,847 استجابة استطلاع · مايو 2026",
    gaugeLbl:"مؤشر صافي الترويج", gaugeZoneText:"جيد",
    nbl1:"😊 المروجون", nbl2:"😐 السلبيون", nbl3:"😞 المعارضون",
    npsFormLabel:"NPS = % المروجين − % المعارضين",
    npsTrendTitle:"اتجاه NPS", npsTrendSub:"يناير 2025 – مايو 2026",
    npsDistScoreTitle:"توزيع النتائج (0–10)", npsDistScoreSub:"كيف قيّم المستجيبون رواء",
    npsSegTitle:"NPS حسب الشريحة", npsSegSub:"الأداء عبر فئات التجار",
    npsComTitle:"تعليقات العملاء", npsComSub:"ردود NPS الأخيرة",
    trPageTitle:"🎓 تقييم التدريب", trPageSub:"423 مستجيب · النصف الأول 2026",
    tkpi1l:"التقييم الإجمالي", tkpi2l:"معدل الإتمام", tkpi2s:"368 من 423",
    tkpi3l:"الجلسات المقدمة", tkpi4l:"سيوصي بنا", tkpi4s:"سيوصي للزملاء",
    trTrendTitle:"اتجاه التقييم", trTrendSub:"يناير – يونيو 2026",
    trRadarTitle:"الرضا حسب البُعد", trRadarSub:"متوسط الدرجة لكل بُعد",
    trSessTitle:"التقييم حسب الوحدة", trSessSub:"جميع وحدات التدريب",
    trBarTitle:"مقارنة الوحدات", trBarSub:"معدل التقييم والإتمام لكل وحدة",
    trSatTitle:"أبعاد الرضا", trSatSub:"تفاصيل تحليل الجودة",
    trComTitle:"ملاحظات المشاركين", trComSub:"تعليقات استبيان ما بعد التدريب",
    footerCopy:"© 2026 رواء · بوابة صوت العميل · للاستخدام الداخلي فقط",
  }
};

function applyTranslations() {
  var t = T[LANG];
  Object.keys(t).forEach(function(k) {
    var el = document.getElementById(k);
    if (el) el.textContent = t[k];
  });
  animateHeroTitle();
}

/* ════════════════════════════════════════════════════
   BOOT
   ════════════════════════════════════════════════════ */
function bootApp() {
  applyTranslations();
  renderDocsGrid();
  buildNpsGauge();
  loadNpsCharts();
  loadTrainingCharts();
  loadIdeas();
  document.addEventListener("click", closeMsOnOutside);
  initSpotlight();
  initReveal();
  initIndicators();
}

/* ════════════════════════════════════════════════════
   DOCS GRID (Home)
   ════════════════════════════════════════════════════ */
var DOCS = [
  { icon:"📊", title:"Frill Ideas Board", desc:"Live customer idea submissions and votes", cat:"Product", url:"https://rewaa.frill.co/b/ideas" },
  { icon:"📋", title:"NPS Survey Sheet", desc:"Raw NPS response data from surveys", cat:"NPS", url:"#" },
  { icon:"🎓", title:"Training Schedule", desc:"H1 2026 training calendar and sessions", cat:"Training", url:"#" },
  { icon:"📈", title:"Product Roadmap", desc:"Quarterly product priorities and milestones", cat:"Product", url:"#" },
  { icon:"📝", title:"VoC Playbook", desc:"How we collect and act on customer feedback", cat:"Process", url:"#" },
  { icon:"🔗", title:"Intercom Inbox", desc:"Customer support conversation history", cat:"Support", url:"#" },
];

function renderDocsGrid() {
  var g = document.getElementById("docsGrid");
  g.innerHTML = DOCS.map(function(d) {
    return '<a class="doc-card" href="' + d.url + '" target="_blank" rel="noopener">'
      + '<div class="doc-icon">' + d.icon + '</div>'
      + '<div><div class="doc-title">' + d.title + '</div>'
      + '<div class="doc-desc">' + d.desc + '</div>'
      + '<div class="doc-cat">' + d.cat + '</div></div></a>';
  }).join("");
}

/* ════════════════════════════════════════════════════
   IDEAS — DATA LOAD
   ════════════════════════════════════════════════════ */
function loadIdeas() {
  if (!RUNTIME.ideasScript) { loadIdeasFallback(); return; }
  document.getElementById("syncStatus").textContent = "🔄 Loading...";
  var script = document.createElement("script");
  script.src = RUNTIME.ideasScript + "?action=getIdeas&cb=" + Date.now() + "&callback=onIdeasData";
  script.onerror = function() { loadIdeasFallback(); };
  document.head.appendChild(script);
  setTimeout(function() { if (!IDEAS_RAW.length) loadIdeasFallback(); }, 8000);
}

function onIdeasData(data) {
  if (data && data.ideas && data.ideas.length) {
    IDEAS_RAW = data.ideas;
  } else {
    IDEAS_RAW = buildDemoIdeas();
  }
  afterIdeasLoaded();
}

function loadIdeasFallback() {
  IDEAS_RAW = buildDemoIdeas();
  afterIdeasLoaded();
}

function afterIdeasLoaded() {
  document.getElementById("syncStatus").textContent = "✅ " + IDEAS_RAW.length + " ideas";
  buildMsDropdowns();
  updateIdeasKPIs();
  renderIdeas();
  runAnalysis();
  runTrends();
}

/* ── demo data ── */
var STATUS_LIST = ["Under Review","Planned","In Progress","Launched","Closed"];
var MODULE_LIST = ["POS","Inventory","Purchasing","E-commerce","Reports","HR","Accounting","CRM","Integrations","Settings"];
var CUSTOMERS   = ["AlDawaa","Jarir","Panda Retail","Extra Stores","Noon","The Shoemaker","LuLu","Danube","BinDawood","Saco"];

function buildDemoIdeas() {
  var ideas = [];
  var seed = 42;
  function rand(n) { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed % n; }
  var titles = [
    "Bulk product import via Excel","Auto-reorder when stock falls below threshold","Multi-branch inventory sync",
    "WhatsApp integration for order notifications","Arabic POS receipt printing","Customer loyalty points system",
    "Real-time sales dashboard on mobile","Purchase order approval workflow","VAT report by branch",
    "Barcode scanner for stock-take","Employee shift scheduling","Supplier price comparison tool",
    "Automated end-of-day cash report","Customer credit limit management","Gift card module",
    "Delivery tracking integration","Product expiry date alerts","Multi-currency support",
    "Sales target tracking per rep","Returns and exchange workflow","Bundle pricing feature",
    "Offline POS mode","Customer segmentation by purchase history","Integrated payroll processing",
    "API for third-party ERP sync","Warehouse zone management","Franchise management module",
    "Digital shelf labels","Smart demand forecasting","Marketplace listing sync",
  ];
  for (var i = 0; i < 240; i++) {
    var st  = STATUS_LIST[rand(STATUS_LIST.length)];
    var mo  = MODULE_LIST[rand(MODULE_LIST.length)];
    var cu  = CUSTOMERS[rand(CUSTOMERS.length)];
    var d   = new Date(2022, rand(10) + 2, rand(28) + 1);
    var yr  = 2022 + rand(4);
    d.setFullYear(yr);
    ideas.push({
      id:       i + 1,
      title:    titles[rand(titles.length)] + (rand(8) > 5 ? " (" + mo + ")" : ""),
      votes:    rand(300) + 1,
      status:   st,
      module:   mo,
      customer: cu,
      date:     d.toISOString().slice(0,10),
      url:      "https://rewaa.frill.co/b/ideas",
    });
  }
  ideas.sort(function(a,b) { return b.votes - a.votes; });
  return ideas;
}

/* ════════════════════════════════════════════════════
   IDEAS — MULTI-SELECT DROPDOWNS
   ════════════════════════════════════════════════════ */
function buildMsDropdowns() {
  var statuses = STATUS_LIST;
  var modules  = Array.from(new Set(IDEAS_RAW.map(function(x) { return x.module; }))).sort();
  [
    ["msIS", "msISDrop", statuses, "msIS"],
    ["msIM", "msIMDrop", modules,  "msIM"],
    ["msAS", "msASDrop", statuses, "msAS"],
    ["msAM", "msAMDrop", modules,  "msAM"],
    ["msTS", "msTSDrop", statuses, "msTS"],
    ["msTM", "msTMDrop", modules,  "msTM"],
  ].forEach(function(cfg) {
    buildOneMsDrop(cfg[0], cfg[1], cfg[2], cfg[3]);
  });
}

function buildOneMsDrop(wrapperId, dropId, opts, stateKey) {
  var drop = document.getElementById(dropId);
  drop.innerHTML = '<div class="ms-all" id="' + dropId + 'All" onclick="msAll(\'' + wrapperId + '\',\'' + dropId + '\',\'' + stateKey + '\')">'
    + (LANG === "ar" ? "الكل" : "All") + '</div>'
    + opts.map(function(o) {
      return '<div class="ms-opt" onclick="msClick(\'' + wrapperId + '\',\'' + dropId + '\',\'' + stateKey + '\',\'' + o.replace(/'/g,"&#39;") + '\')">'
        + '<span class="ms-chk"></span><span>' + o + '</span></div>';
    }).join("");
  syncMsDrop(dropId, stateKey);
}

function msToggle(wrapperId) {
  var drop = document.getElementById(wrapperId).querySelector(".ms-drop");
  var wasOpen = drop.classList.contains("open");
  document.querySelectorAll(".ms-drop.open").forEach(function(d) { d.classList.remove("open"); });
  if (!wasOpen) drop.classList.add("open");
}

function closeMsOnOutside(e) {
  if (!e.target.closest(".ms")) {
    document.querySelectorAll(".ms-drop.open").forEach(function(d) { d.classList.remove("open"); });
  }
}

function msAll(wrapperId, dropId, stateKey) {
  msState[stateKey] = [];
  syncMsDrop(dropId, stateKey);
  afterMsChange(stateKey);
}

function msClick(wrapperId, dropId, stateKey, val) {
  var arr = msState[stateKey];
  var idx = arr.indexOf(val);
  if (idx > -1) arr.splice(idx, 1); else arr.push(val);
  syncMsDrop(dropId, stateKey);
  afterMsChange(stateKey);
}

function syncMsDrop(dropId, stateKey) {
  var arr  = msState[stateKey];
  var drop = document.getElementById(dropId);
  if (!drop) return;
  var allEl = document.getElementById(dropId + "All");
  if (allEl) allEl.classList.toggle("sel", arr.length === 0);
  drop.querySelectorAll(".ms-opt").forEach(function(el) {
    var val = el.querySelector("span:last-child").textContent;
    el.classList.toggle("sel", arr.indexOf(val) > -1);
    el.querySelector(".ms-chk").textContent = arr.indexOf(val) > -1 ? "✓" : "";
  });
}

function afterMsChange(stateKey) {
  if (stateKey === "msIS" || stateKey === "msIM") { ideasPage = 1; renderIdeas(); }
  if (stateKey === "msAS" || stateKey === "msAM") { runAnalysis(); }
  if (stateKey === "msTS" || stateKey === "msTM") { runTrends(); }
}

/* ════════════════════════════════════════════════════
   IDEAS — FILTER HELPERS
   ════════════════════════════════════════════════════ */
function filteredIdeas(stateSt, stateMo, dateFromId, dateToId, searchId) {
  var st     = msState[stateSt] || [];
  var mo     = msState[stateMo] || [];
  var dFrom  = dateFromId ? (document.getElementById(dateFromId)||{}).value || "" : "";
  var dTo    = dateToId   ? (document.getElementById(dateToId)||{}).value   || "" : "";
  var search = searchId   ? (document.getElementById(searchId)||{}).value.toLowerCase() || "" : "";
  return IDEAS_RAW.filter(function(idea) {
    if (st.length && st.indexOf(idea.status) < 0) return false;
    if (mo.length && mo.indexOf(idea.module) < 0) return false;
    if (dFrom && idea.date < dFrom) return false;
    if (dTo   && idea.date > dTo)   return false;
    if (search && idea.title.toLowerCase().indexOf(search) < 0
        && idea.customer.toLowerCase().indexOf(search) < 0) return false;
    return true;
  });
}

/* ════════════════════════════════════════════════════
   IDEAS — KPIs
   ════════════════════════════════════════════════════ */
function updateIdeasKPIs() {
  var total     = IDEAS_RAW.length;
  var launched  = IDEAS_RAW.filter(function(x) { return x.status === "Launched"; }).length;
  var votes     = IDEAS_RAW.reduce(function(a,x) { return a + x.votes; }, 0);
  var pending   = IDEAS_RAW.filter(function(x) { return x.status === "Under Review" || x.status === "Planned"; }).length;
  var launchPct = total ? Math.round(launched / total * 100) : 0;
  var avgVotes  = total ? Math.round(votes / total) : 0;

  document.getElementById("kpiTotal").textContent     = total.toLocaleString();
  document.getElementById("kpiLaunched").textContent  = launched.toLocaleString();
  document.getElementById("kpiLaunchSub").textContent = launchPct + "% launch rate";
  document.getElementById("kpiVotes").textContent     = votes.toLocaleString();
  document.getElementById("kpiAvgSub").textContent    = "avg " + avgVotes + " per idea";
  document.getElementById("kpiPending").textContent   = pending.toLocaleString();

  /* hero stats sync */
  document.getElementById("hstat1v").textContent = total.toLocaleString() + "+";
  document.getElementById("av1v").textContent    = total.toLocaleString() + "+";

  /* animate the data-driven counters */
  ["kpiTotal","kpiLaunched","kpiVotes","kpiPending","hstat1v","av1v"].forEach(function(id) {
    countUp(document.getElementById(id));
  });
}

/* ════════════════════════════════════════════════════
   IDEAS — LIST & PAGINATION
   ════════════════════════════════════════════════════ */
var STATUS_COLORS = {
  "Under Review":"#2563EB","Planned":"#8B5CF6","In Progress":"#F59E0B",
  "Launched":"#1BBE6E","Closed":"#6A7279",
};

function renderIdeas() {
  var ideas = filteredIdeas("msIS","msIM","iDateFrom","iDateTo","iSearch");
  var sort  = document.getElementById("sortSel").value;
  if (sort === "votes") ideas.sort(function(a,b) { return b.votes - a.votes; });
  else ideas.sort(function(a,b) { return b.date.localeCompare(a.date); });

  var total = ideas.length;
  var pages = Math.max(1, Math.ceil(total / IDEAS_PER_PAGE));
  if (ideasPage > pages) ideasPage = 1;

  document.getElementById("iCount").textContent = total + " ideas";

  var slice = ideas.slice((ideasPage-1)*IDEAS_PER_PAGE, ideasPage*IDEAS_PER_PAGE);
  var list  = document.getElementById("ideasList");
  if (!slice.length) { list.innerHTML = '<div style="padding:32px;text-align:center;color:var(--sub)">No ideas match your filters.</div>'; }
  else {
    list.innerHTML = slice.map(function(idea) {
      var col = STATUS_COLORS[idea.status] || "#6A7279";
      return '<div class="idea-row" onclick="window.open(\'' + idea.url + '\',\'_blank\')">'
        + '<div class="ivote"><div class="ivnum" style="color:var(--p)">' + idea.votes + '</div><div class="ivlbl">votes</div></div>'
        + '<div class="ibody">'
        + '<div class="itxt">' + escHtml(idea.title) + '</div>'
        + '<div class="itags">'
        + '<span class="tag" style="background:' + col + '22;color:' + col + '">' + idea.status + '</span>'
        + '<span class="tag" style="background:var(--pg);color:var(--p)">' + idea.module + '</span>'
        + '<span class="tmeta">👤 ' + idea.customer + ' · 📅 ' + idea.date + '</span>'
        + '</div></div></div>';
    }).join("");
  }

  /* pagination */
  var pag = document.getElementById("ideaPag");
  if (pages <= 1) { pag.innerHTML = ""; return; }
  var html = "";
  if (ideasPage > 1) html += '<button class="pb" onclick="ideasPage--; renderIdeas()">‹</button>';
  for (var i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - ideasPage) <= 2) {
      html += '<button class="pb' + (i===ideasPage?" act":"") + '" onclick="ideasPage=' + i + '; renderIdeas()">' + i + '</button>';
    } else if (Math.abs(i - ideasPage) === 3) {
      html += '<span style="padding:4px 6px;color:var(--sub)">…</span>';
    }
  }
  if (ideasPage < pages) html += '<button class="pb" onclick="ideasPage++; renderIdeas()">›</button>';
  pag.innerHTML = html;
}

function resetIdeas() {
  msState.msIS = []; msState.msIM = [];
  syncMsDrop("msISDrop","msIS"); syncMsDrop("msIMDrop","msIM");
  document.getElementById("iSearch").value    = "";
  document.getElementById("iDateFrom").value  = "";
  document.getElementById("iDateTo").value    = "";
  document.getElementById("sortSel").value    = "votes";
  ideasPage = 1; renderIdeas();
}

/* ════════════════════════════════════════════════════
   IDEAS — TABS
   ════════════════════════════════════════════════════ */
function ideasTab(name) {
  activeIdeasTab = name;
  ["ideas","analysis","trends"].forEach(function(t) {
    document.getElementById("iPanel-" + t).style.display = t === name ? "" : "none";
    document.getElementById("tab" + t.charAt(0).toUpperCase() + t.slice(1)).classList.toggle("act", t === name);
  });
  if (name === "analysis") runAnalysis();
  if (name === "trends")   runTrends();
  refreshIndicators();
}

/* ════════════════════════════════════════════════════
   IDEAS — ANALYSIS TAB
   ════════════════════════════════════════════════════ */
function resetAnalysis() {
  msState.msAS = []; msState.msAM = [];
  syncMsDrop("msASDrop","msAS"); syncMsDrop("msAMDrop","msAM");
  document.getElementById("aDateFrom").value = "";
  document.getElementById("aDateTo").value   = "";
  runAnalysis();
}

function runAnalysis() {
  var ideas = filteredIdeas("msAS","msAM","aDateFrom","aDateTo",null);
  document.getElementById("aCount").textContent = ideas.length + " ideas";

  /* status pie */
  var stCounts = {};
  STATUS_LIST.forEach(function(s) { stCounts[s] = 0; });
  ideas.forEach(function(x) { if (stCounts[x.status] !== undefined) stCounts[x.status]++; });
  var stLabels = STATUS_LIST.filter(function(s) { return stCounts[s] > 0; });
  var stVals   = stLabels.map(function(s) { return stCounts[s]; });
  var stColors = ["#2563EB","#8B5CF6","#F59E0B","#1BBE6E","#6A7279"];

  destroyChart("cvStatus");
  charts.cvStatus = new Chart(document.getElementById("cvStatus"), {
    type: "doughnut",
    data: { labels: stLabels, datasets: [{ data: stVals, backgroundColor: stColors, borderWidth: 2, borderColor: DARK ? "#001433" : "#fff" }] },
    options: { responsive:true, plugins: { legend:{ display:false } } },
  });

  /* status legend */
  document.getElementById("statusLeg").innerHTML = stLabels.map(function(s,i) {
    return '<div class="sleg-item"><div class="sleg-dot" style="background:' + stColors[i] + '"></div>'
      + '<span class="sleg-lbl">' + s + '</span>'
      + '<span class="sleg-val">' + stCounts[s] + '</span></div>';
  }).join("");

  /* module bar */
  var moCounts = {};
  MODULE_LIST.forEach(function(m) { moCounts[m] = 0; });
  ideas.forEach(function(x) { if (moCounts[x.module] !== undefined) moCounts[x.module]++; });
  var moLabels = MODULE_LIST.filter(function(m) { return moCounts[m] > 0; });
  var moVals   = moLabels.map(function(m) { return moCounts[m]; });

  destroyChart("cvModule");
  charts.cvModule = new Chart(document.getElementById("cvModule"), {
    type: "bar",
    data: { labels: moLabels, datasets: [{ data: moVals, backgroundColor: "#00A4A6", borderRadius:4 }] },
    options: { indexAxis:"y", responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{ x:{ grid:{ color: DARK?"rgba(255,255,255,.05)":"rgba(0,0,0,.05)" }, ticks:{ color: DARK?"#99A6BE":"#6A7279", font:{size:10} } },
               y:{ grid:{ display:false }, ticks:{ color: DARK?"#99A6BE":"#6A7279", font:{size:10} } } },
    },
  });

  /* top 20 table */
  var sorted = ideas.slice().sort(function(a,b) { return b.votes - a.votes; }).slice(0,20);
  var maxV   = sorted[0] ? sorted[0].votes : 1;
  document.getElementById("t20").innerHTML =
    '<thead><tr><th>#</th><th>Title</th><th>Module</th><th>Status</th><th>Votes</th></tr></thead>'
    + '<tbody>' + sorted.map(function(x,i) {
      var col = STATUS_COLORS[x.status] || "#6A7279";
      var pct = Math.round(x.votes / maxV * 100);
      return '<tr onclick="window.open(\'' + x.url + '\',\'_blank\')">'
        + '<td style="color:var(--sub);font-weight:700">' + (i+1) + '</td>'
        + '<td>' + escHtml(x.title) + '</td>'
        + '<td><span class="tag" style="background:var(--pg);color:var(--p)">' + x.module + '</span></td>'
        + '<td><span class="tag" style="background:' + col + '22;color:' + col + '">' + x.status + '</span></td>'
        + '<td><span class="barmini" style="width:' + pct + 'px"></span> <strong>' + x.votes + '</strong></td>'
        + '</tr>';
    }).join("") + '</tbody>';

  /* top 5 customers */
  var custMap = {};
  ideas.forEach(function(x) {
    if (!custMap[x.customer]) custMap[x.customer] = { ideas:0, votes:0 };
    custMap[x.customer].ideas++;
    custMap[x.customer].votes += x.votes;
  });
  var top5 = Object.keys(custMap).sort(function(a,b) { return custMap[b].ideas - custMap[a].ideas; }).slice(0,5);
  document.getElementById("top5").innerHTML = top5.map(function(c) {
    var d = custMap[c];
    var custIdeas = ideas.filter(function(x) { return x.customer === c; }).slice(0,5);
    return '<div class="cust-card">'
      + '<div class="cust-hdr" onclick="toggleCust(this)">'
      + '<div class="cavatar">' + c.charAt(0) + '</div>'
      + '<div><div class="cname">' + c + '</div><div class="cmeta">' + d.ideas + ' ideas · ' + d.votes + ' votes</div></div>'
      + '<div style="flex:1"></div>'
      + '<div class="cbadges"><span class="tag" style="background:var(--pg);color:var(--p)">' + d.ideas + ' ideas</span></div>'
      + '<div class="carr">▼</div></div>'
      + '<div class="cust-body">' + custIdeas.map(function(x) {
        return '<div class="cidea-row" onclick="window.open(\'' + x.url + '\',\'_blank\')">'
          + '<div class="ivnum" style="font-size:13px;color:var(--p);min-width:32px">' + x.votes + '</div>'
          + '<div style="font-size:11px;flex:1">' + escHtml(x.title) + '</div>'
          + '<span class="tag" style="background:var(--pg);color:var(--p)">' + x.module + '</span>'
          + '</div>';
      }).join("") + '</div></div>';
  }).join("");

  /* launch rate by module */
  var lrData = {};
  MODULE_LIST.forEach(function(m) { lrData[m] = { total:0, launched:0 }; });
  ideas.forEach(function(x) {
    if (lrData[x.module]) {
      lrData[x.module].total++;
      if (x.status === "Launched") lrData[x.module].launched++;
    }
  });
  document.getElementById("lrGrid").innerHTML = MODULE_LIST.filter(function(m) { return lrData[m].total > 0; }).map(function(m) {
    var pct = lrData[m].total ? Math.round(lrData[m].launched / lrData[m].total * 100) : 0;
    var col = pct >= 60 ? "#1BBE6E" : pct >= 30 ? "#F59E0B" : "#E5484D";
    return '<div class="lr-item"><div class="lr-hdr"><span class="lr-name">' + m + '</span><span class="lr-pct" style="color:' + col + '">' + pct + '%</span></div>'
      + '<div class="lr-track"><div class="lr-fill" style="width:' + pct + '%;background:' + col + '"></div></div>'
      + '<div class="lr-sub">' + lrData[m].launched + ' of ' + lrData[m].total + ' launched</div></div>';
  }).join("");
}

function toggleCust(hdr) {
  var body = hdr.nextElementSibling;
  var arr  = hdr.querySelector(".carr");
  body.classList.toggle("open");
  arr.classList.toggle("open");
}

/* ════════════════════════════════════════════════════
   IDEAS — TRENDS TAB
   ════════════════════════════════════════════════════ */
function resetTrends() {
  msState.msTS = []; msState.msTM = [];
  syncMsDrop("msTSDrop","msTS"); syncMsDrop("msTMDrop","msTM");
  document.getElementById("tDateFrom").value = "";
  document.getElementById("tDateTo").value   = "";
  document.getElementById("ivSel").value     = "monthly";
  runTrends();
}

function runTrends() {
  var ideas    = filteredIdeas("msTS","msTM","tDateFrom","tDateTo",null);
  var interval = document.getElementById("ivSel").value;

  function bucket(d) {
    var dt = new Date(d);
    if (interval === "yearly")    return dt.getFullYear().toString();
    if (interval === "quarterly") return dt.getFullYear() + "-Q" + (Math.floor(dt.getMonth()/3)+1);
    return d.slice(0,7);
  }

  var allBuckets = Array.from(new Set(ideas.map(function(x) { return bucket(x.date); }))).sort();

  /* overall trend */
  var bCount = {};
  allBuckets.forEach(function(b) { bCount[b] = 0; });
  ideas.forEach(function(x) { bCount[bucket(x.date)]++; });

  destroyChart("cvTrend");
  charts.cvTrend = new Chart(document.getElementById("cvTrend"), {
    type: "line",
    data: { labels: allBuckets, datasets: [{ label:"Ideas", data: allBuckets.map(function(b) { return bCount[b]; }),
      borderColor:"#00A4A6", backgroundColor:"rgba(0,164,166,.08)", fill:true, tension:.4, pointRadius:3 }] },
    options: trendOpts(DARK),
  });

  /* by module */
  var mods  = Array.from(new Set(ideas.map(function(x) { return x.module; }))).sort();
  var mColors = ["#00A4A6","#2563EB","#8B5CF6","#F59E0B","#1BBE6E","#E5484D","#EC4899","#14B8A6","#F97316","#6366F1"];
  destroyChart("cvModLine");
  charts.cvModLine = new Chart(document.getElementById("cvModLine"), {
    type: "line",
    data: {
      labels: allBuckets,
      datasets: mods.map(function(m,i) {
        var mc = {};
        ideas.filter(function(x) { return x.module === m; }).forEach(function(x) {
          var b = bucket(x.date); mc[b] = (mc[b]||0) + 1;
        });
        return { label:m, data: allBuckets.map(function(b) { return mc[b]||0; }),
          borderColor: mColors[i % mColors.length], backgroundColor:"transparent", tension:.4, pointRadius:2 };
      }),
    },
    options: trendOpts(DARK),
  });

  /* by status */
  destroyChart("cvStLine");
  charts.cvStLine = new Chart(document.getElementById("cvStLine"), {
    type: "line",
    data: {
      labels: allBuckets,
      datasets: STATUS_LIST.map(function(s,i) {
        var sc = {};
        ideas.filter(function(x) { return x.status === s; }).forEach(function(x) {
          var b = bucket(x.date); sc[b] = (sc[b]||0) + 1;
        });
        return { label:s, data: allBuckets.map(function(b) { return sc[b]||0; }),
          borderColor:["#2563EB","#8B5CF6","#F59E0B","#1BBE6E","#6A7279"][i],
          backgroundColor:"transparent", tension:.4, pointRadius:2 };
      }),
    },
    options: trendOpts(DARK),
  });
}

function trendOpts(dark) {
  var gc = dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.05)";
  var tc = dark ? "#99A6BE" : "#6A7279";
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ labels:{ color:tc, font:{size:10}, boxWidth:10 } } },
    scales:{
      x:{ grid:{ color:gc }, ticks:{ color:tc, font:{size:9}, maxRotation:45 } },
      y:{ grid:{ color:gc }, ticks:{ color:tc, font:{size:10} }, beginAtZero:true },
    },
  };
}

/* ════════════════════════════════════════════════════
   NPS
   ════════════════════════════════════════════════════ */
function buildNpsGauge() {
  var score  = 42;
  var pct    = (score + 100) / 200;
  var arcLen = Math.PI * 90;
  var filled = (pct * arcLen).toFixed(1);
  var color  = score >= 50 ? "#1BBE6E" : score >= 0 ? "#00A4A6" : score >= -30 ? "#F59E0B" : "#E5484D";
  var fill   = document.getElementById("npsGaugeFill");
  if (fill) {
    fill.setAttribute("stroke-dasharray", filled + " " + arcLen.toFixed(1));
    fill.setAttribute("stroke", color);
  }
}

var NPS_TREND = [
  { m:"Jan '25", s:35 }, { m:"Feb '25", s:33 }, { m:"Mar '25", s:37 }, { m:"Apr '25", s:36 },
  { m:"May '25", s:38 }, { m:"Jun '25", s:39 }, { m:"Jul '25", s:40 }, { m:"Aug '25", s:38 },
  { m:"Sep '25", s:41 }, { m:"Oct '25", s:39 }, { m:"Nov '25", s:43 }, { m:"Dec '25", s:42 },
  { m:"Jan '26", s:40 }, { m:"Feb '26", s:41 }, { m:"Mar '26", s:44 }, { m:"Apr '26", s:43 }, { m:"May '26", s:42 },
];

var NPS_DIST = [
  { score:0,  count:12 }, { score:1,  count:8  }, { score:2,  count:15 }, { score:3,  count:22 },
  { score:4,  count:18 }, { score:5,  count:45 }, { score:6,  count:178 }, { score:7,  count:210 },
  { score:8,  count:269 }, { score:9,  count:440 }, { score:10, count:630 },
];

var NPS_SEGMENTS = [
  { name:"Enterprise (50+ locations)", score:58,  promoters:65, passives:28, detractors:7,  n:312 },
  { name:"Mid-Market (10-49)",         score:44,  promoters:59, passives:26, detractors:15, n:687 },
  { name:"SMB (2-9)",                  score:38,  promoters:55, passives:28, detractors:17, n:621 },
  { name:"Micro (1 location)",         score:29,  promoters:51, passives:27, detractors:22, n:227 },
  { name:"Retail",                     score:48,  promoters:63, passives:22, detractors:15, n:534 },
  { name:"F&B",                        score:35,  promoters:53, passives:29, detractors:18, n:412 },
  { name:"Pharmacy",                   score:55,  promoters:68, passives:19, detractors:13, n:224 },
  { name:"Fashion",                    score:41,  promoters:57, passives:27, detractors:16, n:294 },
  { name:"Electronics",               score:39,  promoters:56, passives:27, detractors:17, n:183 },
];

var NPS_COMMENTS = [
  { name:"Ahmed Al-Ghamdi",    type:"promoter",   score:10, text:"رواء غيّر طريقة إدارة مخزوني تمامًا. الدعم الفني ممتاز وسريع الاستجابة.", date:"2026-05-18" },
  { name:"Sara Al-Otaibi",     type:"promoter",   score:9,  text:"The multi-branch feature saved us hours daily. Highly recommend to any retail chain.", date:"2026-05-17" },
  { name:"Mohammed Al-Zahrani",type:"passive",    score:7,  text:"Good system but the reports module still needs improvement. Loading is sometimes slow.", date:"2026-05-16" },
  { name:"Nora Al-Qahtani",    type:"promoter",   score:10, text:"Best POS system we've used. Seamless integration with our e-commerce store.", date:"2026-05-15" },
  { name:"Khalid Al-Shehri",   type:"detractor",  score:4,  text:"We've been waiting months for the purchase order approval feature. Very frustrating.", date:"2026-05-14" },
  { name:"Fatima Al-Dossari",  type:"promoter",   score:9,  text:"التقارير المالية دقيقة جداً وساعدتنا في تحضير التدقيق السنوي بشكل أسرع.", date:"2026-05-13" },
  { name:"Omar Al-Mutairi",    type:"passive",    score:8,  text:"Works well overall. Would love better Arabic font support on POS receipts.", date:"2026-05-12" },
  { name:"Lina Al-Juhani",     type:"detractor",  score:3,  text:"System crashes during peak hours. We lost sales three times last week.", date:"2026-05-11" },
  { name:"Saud Al-Harbi",      type:"promoter",   score:10, text:"Inventory management is outstanding. Real-time stock updates across all branches.", date:"2026-05-10" },
  { name:"Reem Al-Shamrani",   type:"passive",    score:7,  text:"Good product but onboarding was a bit complex. Training helped a lot though.", date:"2026-05-09" },
];

function loadNpsCharts() {
  var dark = DARK;
  var gc   = dark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)";
  var tc   = dark ? "#99A6BE" : "#6A7279";

  destroyChart("cvNpsTrend");
  charts.cvNpsTrend = new Chart(document.getElementById("cvNpsTrend"), {
    type: "line",
    data: {
      labels: NPS_TREND.map(function(x) { return x.m; }),
      datasets: [{
        label: "NPS",
        data:  NPS_TREND.map(function(x) { return x.s; }),
        borderColor: "#00A4A6", backgroundColor: "rgba(0,164,166,.08)", fill:true, tension:.4, pointRadius:3,
      }],
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false }, annotation:{} },
      scales:{
        x:{ grid:{ color:gc }, ticks:{ color:tc, font:{size:9} } },
        y:{ grid:{ color:gc }, ticks:{ color:tc, font:{size:10} }, min:0, max:100 },
      },
    },
  });

  var distColors = NPS_DIST.map(function(x) {
    return x.score >= 9 ? "#1BBE6E" : x.score >= 7 ? "#F59E0B" : "#E5484D";
  });
  destroyChart("cvNpsDist");
  charts.cvNpsDist = new Chart(document.getElementById("cvNpsDist"), {
    type: "bar",
    data: {
      labels: NPS_DIST.map(function(x) { return x.score.toString(); }),
      datasets: [{ data: NPS_DIST.map(function(x) { return x.count; }), backgroundColor: distColors, borderRadius:4 }],
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ grid:{ color:gc }, ticks:{ color:tc, font:{size:10} } },
        y:{ grid:{ color:gc }, ticks:{ color:tc, font:{size:10} }, beginAtZero:true },
      },
    },
  });

  /* segments table */
  var tbl = document.getElementById("npsSegTable");
  tbl.innerHTML = '<thead><tr><th>Segment</th><th>NPS</th><th>Promoters</th><th>Passives</th><th>Detractors</th><th>Responses</th></tr></thead>'
    + '<tbody>' + NPS_SEGMENTS.map(function(s) {
      var col = s.score >= 50 ? "#1BBE6E" : s.score >= 30 ? "#00A4A6" : s.score >= 0 ? "#F59E0B" : "#E5484D";
      return '<tr><td>' + s.name + '</td>'
        + '<td><span class="score-chip" style="background:' + col + '22;color:' + col + '">' + s.score + '</span></td>'
        + '<td style="color:var(--green)">' + s.promoters + '%</td>'
        + '<td style="color:var(--orange)">' + s.passives + '%</td>'
        + '<td style="color:var(--red)">' + s.detractors + '%</td>'
        + '<td style="color:var(--sub)">' + s.n.toLocaleString() + '</td></tr>';
    }).join("") + '</tbody>';

  renderNpsComments();
}

function npsFilter(f) {
  npsComFilter = f;
  document.getElementById("ncfAll").classList.toggle("act", f==="all");
  document.getElementById("ncfPro").classList.toggle("act", f==="promoter");
  document.getElementById("ncfPas").classList.toggle("act", f==="passive");
  document.getElementById("ncfDet").classList.toggle("act", f==="detractor");
  refreshIndicators();
  renderNpsComments();
}

function renderNpsComments() {
  var q   = (document.getElementById("npsSearch").value || "").toLowerCase();
  var list = NPS_COMMENTS.filter(function(c) {
    if (npsComFilter !== "all" && c.type !== npsComFilter) return false;
    if (q && c.text.toLowerCase().indexOf(q) < 0 && c.name.toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
  var el = document.getElementById("npsComList");
  el.innerHTML = list.map(function(c) {
    var cls = c.type === "promoter" ? "hi" : c.type === "passive" ? "md" : "lo";
    var lbl = c.type === "promoter" ? "Promoter" : c.type === "passive" ? "Passive" : "Detractor";
    return '<div class="cmt-card">'
      + '<div class="cmt-hdr">'
      + '<div class="cmt-av">' + c.name.charAt(0) + '</div>'
      + '<div><div class="cmt-name">' + c.name + '</div><div class="cmt-meta">' + c.date + ' · Score: ' + c.score + '</div></div>'
      + '<span class="rbadge ' + cls + '">' + lbl + '</span>'
      + '</div>'
      + '<div class="cmt-txt">' + escHtml(c.text) + '</div></div>';
  }).join("") || '<div style="padding:24px;text-align:center;color:var(--sub)">No comments match.</div>';
}

/* ════════════════════════════════════════════════════
   TRAINING
   ════════════════════════════════════════════════════ */
var TR_SESSIONS = [
  { name:"POS & Sales",        icon:"🖥️",  rating:4.5, comp:92, color:"#00A4A6" },
  { name:"Inventory Mgmt",     icon:"📦",  rating:4.3, comp:88, color:"#2563EB" },
  { name:"Purchasing",         icon:"🛒",  rating:4.1, comp:85, color:"#8B5CF6" },
  { name:"Reports & Analytics",icon:"📊",  rating:3.9, comp:79, color:"#F59E0B" },
  { name:"E-Commerce Setup",   icon:"🌐",  rating:4.4, comp:91, color:"#1BBE6E" },
  { name:"HR & Payroll",       icon:"👥",  rating:3.7, comp:74, color:"#EC4899" },
  { name:"Accounting & VAT",   icon:"💰",  rating:4.0, comp:82, color:"#F97316" },
];

var TR_TREND = [
  { m:"Jan",s:3.9 },{ m:"Feb",s:4.0 },{ m:"Mar",s:4.1 },{ m:"Apr",s:4.2 },{ m:"May",s:4.3 },{ m:"Jun",s:4.2 },
];

var TR_DIMS = [
  { name:"Content Relevance",   val:4.4 },
  { name:"Trainer Knowledge",   val:4.6 },
  { name:"Session Pace",        val:4.0 },
  { name:"Hands-on Practice",   val:3.8 },
  { name:"Material Quality",    val:4.2 },
  { name:"Q&A Satisfaction",    val:4.5 },
];

var TR_COMMENTS = [
  { name:"Tariq Al-Aqeel",     rating:5, text:"Excellent trainer! Very practical examples that directly applied to our store setup.", date:"2026-06-10" },
  { name:"Hessa Al-Bloushi",   rating:5, text:"المحتوى شامل جداً والمدرب كان متجاوباً مع جميع أسئلتنا. أنصح بهذا التدريب بشدة.", date:"2026-06-09" },
  { name:"Waleed Al-Rashidi",  rating:4, text:"Very helpful session on inventory management. Would like more time on bulk import scenarios.", date:"2026-06-08" },
  { name:"Maha Al-Subaie",     rating:3, text:"Training was okay but too fast. We needed more time for the HR module especially.", date:"2026-06-07" },
  { name:"Faisal Al-Otaibi",   rating:5, text:"Best onboarding experience. The Rewaa team made sure we were fully ready before going live.", date:"2026-06-06" },
  { name:"Dina Al-Anazi",      rating:4, text:"Good session overall. The VAT configuration part was very clear and helped avoid mistakes.", date:"2026-06-05" },
  { name:"Rayan Al-Shammari",  rating:2, text:"The session was too generic. We needed more customization for our pharmacy workflow specifically.", date:"2026-06-04" },
];

function loadTrainingCharts() {
  var dark = DARK;
  var gc   = dark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)";
  var tc   = dark ? "#99A6BE" : "#6A7279";

  /* rating trend */
  destroyChart("cvTrTrend");
  charts.cvTrTrend = new Chart(document.getElementById("cvTrTrend"), {
    type: "line",
    data: {
      labels: TR_TREND.map(function(x) { return x.m; }),
      datasets: [{ label:"Rating", data: TR_TREND.map(function(x) { return x.s; }),
        borderColor:"#00A4A6", backgroundColor:"rgba(0,164,166,.08)", fill:true, tension:.4, pointRadius:4 }],
    },
    options: { responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{ x:{ grid:{ color:gc }, ticks:{ color:tc, font:{size:10} } },
               y:{ grid:{ color:gc }, ticks:{ color:tc, font:{size:10} }, min:1, max:5 } },
    },
  });

  /* radar */
  destroyChart("cvTrRadar");
  charts.cvTrRadar = new Chart(document.getElementById("cvTrRadar"), {
    type: "radar",
    data: {
      labels: TR_DIMS.map(function(x) { return x.name; }),
      datasets: [{ label:"Score", data: TR_DIMS.map(function(x) { return x.val; }),
        borderColor:"#00A4A6", backgroundColor:"rgba(0,164,166,.12)", pointBackgroundColor:"#00A4A6" }],
    },
    options: { responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{ r:{ min:0, max:5, ticks:{ color:tc, font:{size:9}, stepSize:1 },
        grid:{ color:gc }, angleLines:{ color:gc }, pointLabels:{ color:tc, font:{size:9} } } },
    },
  });

  /* sessions grid */
  document.getElementById("trSessGrid").innerHTML = TR_SESSIONS.map(function(s) {
    var stars = "⭐".repeat(Math.round(s.rating));
    return '<div class="sess-card">'
      + '<div class="sess-icon" style="background:' + s.color + '22">' + s.icon + '</div>'
      + '<div class="sess-name">' + s.name + '</div>'
      + '<div class="sess-rat"><span class="sess-rat-v" style="color:' + s.color + '">' + s.rating + '</span><span style="font-size:12px">' + stars + '</span></div>'
      + '<div class="comp-bar"><div class="comp-fill" style="width:' + s.comp + '%;background:' + s.color + '"></div></div>'
      + '<div class="comp-lbl">' + s.comp + '% completion</div></div>';
  }).join("");

  /* bar chart */
  destroyChart("cvTrBar");
  charts.cvTrBar = new Chart(document.getElementById("cvTrBar"), {
    type: "bar",
    data: {
      labels: TR_SESSIONS.map(function(x) { return x.name; }),
      datasets: [
        { label:"Rating", data: TR_SESSIONS.map(function(x) { return x.rating; }), backgroundColor:"#00A4A6", borderRadius:4, yAxisID:"y" },
        { label:"Completion %", data: TR_SESSIONS.map(function(x) { return x.comp; }), backgroundColor:"rgba(0,164,166,.25)", borderRadius:4, yAxisID:"y2" },
      ],
    },
    options: { responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:tc, font:{size:10}, boxWidth:10 } } },
      scales:{
        x:{ grid:{ display:false }, ticks:{ color:tc, font:{size:9}, maxRotation:30 } },
        y:{ grid:{ color:gc }, ticks:{ color:tc, font:{size:10} }, min:0, max:5, position:"left" },
        y2:{ grid:{ display:false }, ticks:{ color:tc, font:{size:10} }, min:0, max:100, position:"right" },
      },
    },
  });

  /* satisfaction dimensions */
  document.getElementById("trSatGrid").innerHTML = TR_DIMS.map(function(d) {
    var col = d.val >= 4.3 ? "#1BBE6E" : d.val >= 3.8 ? "#F59E0B" : "#E5484D";
    return '<div class="sat-row">'
      + '<div class="sat-lbl">' + d.name + '</div>'
      + '<div class="sat-wrap">'
      + '<div class="sat-track"><div class="sat-fill" style="width:' + (d.val/5*100) + '%;background:' + col + '"></div></div></div>'
      + '<div class="sat-val" style="color:' + col + '">' + d.val + '</div></div>';
  }).join("");

  renderTrComments();
}

function trFilter(f) {
  trComFilter = f;
  document.getElementById("tcfAll").classList.toggle("act", f==="all");
  document.getElementById("tcf5").classList.toggle("act",   f==="5");
  document.getElementById("tcf4").classList.toggle("act",   f==="4");
  document.getElementById("tcf3").classList.toggle("act",   f==="3");
  refreshIndicators();
  renderTrComments();
}

function renderTrComments() {
  var q    = (document.getElementById("trSearch").value || "").toLowerCase();
  var list = TR_COMMENTS.filter(function(c) {
    if (trComFilter === "5" && c.rating !== 5) return false;
    if (trComFilter === "4" && c.rating !== 4) return false;
    if (trComFilter === "3" && c.rating > 3)   return false;
    if (q && c.text.toLowerCase().indexOf(q) < 0 && c.name.toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
  var stars = ["","⭐","⭐⭐","⭐⭐⭐","⭐⭐⭐⭐","⭐⭐⭐⭐⭐"];
  var el = document.getElementById("trComList");
  el.innerHTML = list.map(function(c) {
    var cls = c.rating >= 5 ? "hi" : c.rating >= 4 ? "md" : "lo";
    return '<div class="cmt-card">'
      + '<div class="cmt-hdr">'
      + '<div class="cmt-av">' + c.name.charAt(0) + '</div>'
      + '<div><div class="cmt-name">' + c.name + '</div><div class="cmt-meta">' + c.date + '</div></div>'
      + '<span class="rbadge ' + cls + '">' + (stars[c.rating]||c.rating) + '</span>'
      + '</div>'
      + '<div class="cmt-txt">' + escHtml(c.text) + '</div></div>';
  }).join("") || '<div style="padding:24px;text-align:center;color:var(--sub)">No comments match.</div>';
}

/* ════════════════════════════════════════════════════
   UTILS
   ════════════════════════════════════════════════════ */
function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function redrawCharts() {
  var dark = DARK;
  if (charts.cvNpsTrend)  { loadNpsCharts(); }
  if (charts.cvTrTrend)   { loadTrainingCharts(); }
  if (activeIdeasTab === "analysis") runAnalysis();
  if (activeIdeasTab === "trends")   runTrends();
}

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* ════════════════════════════════════════════════════
   MOTION — Rewaa-themed animation layer (no dependencies)
   ════════════════════════════════════════════════════ */
function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* count-up animation for numeric labels — parses the element's existing text */
function countUp(el) {
  if (!el || prefersReducedMotion()) return;
  var raw = (el.textContent || "").trim();
  var m   = raw.match(/^(\D*)([\d,]*\.?\d+)(\D*)$/);
  if (!m) return;
  var prefix   = m[1] || "";
  var numStr   = m[2];
  var suffix   = m[3] || "";
  var decimals = (numStr.split(".")[1] || "").length;
  var hasComma = numStr.indexOf(",") > -1;
  var target   = parseFloat(numStr.replace(/,/g, ""));
  if (isNaN(target)) return;
  if (el._cuTarget === target) return;   // already showing this value
  el._cuTarget = target;

  function fmt(v) {
    var s = v.toFixed(decimals);
    if (hasComma) {
      var parts = s.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      s = parts.join(".");
    }
    return prefix + s + suffix;
  }

  var dur = 900, start = null;
  function step(ts) {
    if (start === null) start = ts;
    var t     = Math.min((ts - start) / dur, 1);
    var eased = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(target * eased);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = fmt(target);
  }
  requestAnimationFrame(step);
}

/* reveal-on-scroll for cards, plus count-up for any numbers inside them */
function initReveal() {
  if (!("IntersectionObserver" in window)) return;   // graceful: leave everything visible
  var targets = document.querySelectorAll(".hero-stats>div,.afeat,.av-item,.dash-card,.doc-card,.kpi,.sc");
  if (!targets.length) return;

  /* stagger the entrance delay, reset per parent container */
  var seen = {}, pid = 0;
  targets.forEach(function(el) {
    el.classList.add("rw-reveal");
    var p = el.parentNode;
    if (p._rwId === undefined) { p._rwId = ++pid; seen[p._rwId] = 0; }
    el.style.animationDelay = (Math.min(seen[p._rwId]++, 6) * 0.07) + "s";
  });

  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(en) {
      if (!en.isIntersecting) return;
      en.target.classList.add("rw-in");
      countGroup(en.target);
      io.unobserve(en.target);
    });
  }, { threshold: 0.12 });

  targets.forEach(function(el) { io.observe(el); });
}

/* animate non-live numbers inside a freshly revealed card */
function countGroup(root) {
  root.querySelectorAll(".kpi-val,.hstat-v,.av-val").forEach(function(el) {
    if (el.hasAttribute("data-live")) return;   // data-driven values animate via updateIdeasKPIs
    countUp(el);
  });
}

/* cursor-follow spotlight on the navy hero */
function initSpotlight() {
  var hero = document.querySelector(".hero");
  if (!hero) return;
  hero.addEventListener("mousemove", function(e) {
    var r = hero.getBoundingClientRect();
    hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width  * 100) + "%");
    hero.style.setProperty("--my", ((e.clientY - r.top)  / r.height * 100) + "%");
  });
}

/* staggered word reveal for the hero headline */
function animateHeroTitle() {
  var el = document.getElementById("heroTitle");
  if (!el) return;
  var text = (el.textContent || "").trim();
  if (!text) return;
  el.innerHTML = text.split(/\s+/).map(function(w, i) {
    return '<span class="rw-word" style="animation-delay:' + (i * 0.08) + 's">' + escHtml(w) + '</span>';
  }).join(" ");
}

/* ════════════════════════════════════════════════════
   SLIDING TAB INDICATOR (Motion "animated background")
   ════════════════════════════════════════════════════ */
function indicatorGroups() {
  return document.querySelectorAll(".mnav, .tabs-row, .cf-row");
}

function initIndicator(group) {
  if (!group || group._rwInd) return;
  var ind = document.createElement("span");
  ind.className = "rw-ind";
  group.insertBefore(ind, group.firstChild);
  group._rwInd = ind;
}

function moveIndicator(group) {
  if (!group || !group._rwInd) return;
  var ind    = group._rwInd;
  var active = group.querySelector(".act");
  /* hide the pill when the group is off-screen (offset size is 0) */
  if (!active || (!active.offsetWidth && !active.offsetHeight)) {
    ind.style.opacity = "0";
    return;
  }
  ind.style.opacity   = "1";
  ind.style.width     = active.offsetWidth + "px";
  ind.style.height    = active.offsetHeight + "px";
  ind.style.transform = "translate(" + active.offsetLeft + "px," + active.offsetTop + "px)";
}

function refreshIndicators() {
  indicatorGroups().forEach(moveIndicator);
}

function initIndicators() {
  indicatorGroups().forEach(initIndicator);
  refreshIndicators();
  window.addEventListener("resize", refreshIndicators);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshIndicators);
}

/* ════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════ */
window.addEventListener("load", function() {
  /* wait for GSI library */
  var t = setInterval(function() {
    if (window.google && google.accounts && google.accounts.id) {
      clearInterval(t);
      initGSI();
    }
  }, 100);
});

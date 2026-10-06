#!/usr/bin/env node
// buoc3.mjs — BƯỚC 3 LINH HOẠT: đẩy giả chiến (Bảng 1/2/3) lên Facebook Ads, TẤT CẢ PAUSED.
// Hỗ trợ: Chuyển đổi (OUTCOME_LEADS + pixel + ảnh) HOẶC Tương tác/Engagement (OUTCOME_ENGAGEMENT + video/ảnh).
import fs from "node:fs";
import { graph, createConversionAd, createVideoAd, uploadVideoToPage, getVideoThumb, getVideoStatus, AD_ACCOUNT } from "./lib/meta.mjs";

const arg=(k,d)=>{const i=process.argv.indexOf("--"+k);return i>=0?process.argv[i+1]:d;};
const DIR=arg("dir",".");
const mediaPath=arg("media","");
const J=(f)=>JSON.parse(fs.readFileSync(DIR+"/"+f,"utf8"));
const meta=J("_c_meta.json"); const adsets=J("_c_adsets.json"); const contents=J("_c_content.json");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

const eventCode=(s)=>{s=(s||"").toLowerCase(); if(s.includes("hoàn tất")||s.includes("đăng ký")) return "COMPLETE_REGISTRATION"; if(s.includes("mua")) return "PURCHASE"; if(s.includes("xem")) return "VIEW_CONTENT"; if(s.includes("lead")) return "LEAD"; return "LEAD";};
const genderArr=(s)=>{s=(s||"").toLowerCase(); if(s.includes("nam")&&!s.includes("tất")) return [1]; if(s.includes("nữ")) return [2]; return null;};

async function resolveCity(name){
  try{ const r=await graph("GET","search",{type:"adgeolocation",location_types:["city"],q:name,limit:8});
    // CHỈ nhận thành phố ở Việt Nam — tránh fallback lấy đại thành phố nước ngoài (vd "VN" -> Vienna/AT).
    const hit=(r.data||[]).find(x=>x.country_code==="VN");
    return hit?{key:hit.key}:null; }catch{ return null; }
}

async function run(){
  const log=[];
  const obj=(meta.objective||"").toLowerCase();
  const ev=eventCode(meta.event);
  const isMsg=obj.includes("tin nhắn")||obj.includes("messenger")||(meta.event||"").toLowerCase().includes("tin nhắn");
  const isEng=isMsg||obj.includes("tương tác")||obj.includes("engagement")||obj.includes("video");
  const isVideo=(meta.mediaType||"")==="video";
  const objective=isEng?"OUTCOME_ENGAGEMENT":"OUTCOME_LEADS";
  const cbo=(meta.budgetMode||"").toUpperCase().includes("CBO") && !isMsg;  // messenger BẮT BUỘC ABO
  log.push(`loại: ${isMsg?'TIN NHẮN':isEng?'TƯƠNG TÁC':'CHUYỂN ĐỔI'} | media: ${isVideo?'video':'ảnh'} | ${objective} | ${cbo?'CBO':'ABO'}`);

  // 1) CAMPAIGN
  const tag=isMsg?'[TIN NHẮN]':isEng?'[TƯƠNG TÁC]':'[CHUYỂN ĐỔI]';
  const campParams={ name:`${tag} ${meta.name}`, objective, status:"PAUSED", special_ad_categories:[] };
  if(cbo){ campParams.daily_budget=Math.round(meta.budget); campParams.bid_strategy="LOWEST_COST_WITHOUT_CAP"; }
  else campParams.is_adset_budget_sharing_enabled=false;
  const camp=await graph("POST",`${AD_ACCOUNT}/campaigns`,campParams);
  log.push(`campaign ${camp.id}`);

  // 2) AD SETS
  const adsetIds=[];
  for(const a of adsets){
    const targeting={ age_min:a.ageMin||22, age_max:a.ageMax||55, targeting_automation:{advantage_audience: meta.advAudience||0} };
    const geoRaw=(a.geo||"VN").trim();
    // Mã quốc gia 2 ký tự (VN, US...) -> target theo NƯỚC; ngược lại mới tra tên thành phố.
    if(/^[A-Za-z]{2}$/.test(geoRaw)){ targeting.geo_locations={countries:[geoRaw.toUpperCase()]}; }
    else { const city=await resolveCity(geoRaw); targeting.geo_locations = city ? {cities:[{key:city.key}]} : {countries:["VN"]}; }
    const g=genderArr(a.gender); if(g) targeting.genders=g;
    if(meta.tepNums&&meta.tepNums.length) targeting.custom_audiences=meta.tepNums.map(id=>({id:String(id)}));
    const p={ name:a.name, campaign_id:camp.id, status:"PAUSED", billing_event:"IMPRESSIONS", targeting };
    if(isMsg){
      p.optimization_goal="CONVERSATIONS"; p.destination_type="MESSENGER"; p.promoted_object={page_id:String(meta.pageId)};
    } else if(isEng){
      p.optimization_goal = isVideo ? "THRUPLAY" : "POST_ENGAGEMENT";   // tương tác: video view / post engagement
    } else if(meta.pixelNum){
      p.optimization_goal="OFFSITE_CONVERSIONS"; p.promoted_object={pixel_id:String(meta.pixelNum),custom_event_type:ev};
    } else {
      p.optimization_goal="LINK_CLICKS";   // chuyển đổi nhưng thiếu pixel -> tối thiểu click
    }
    if(!cbo){ p.daily_budget=Math.round(meta.budget); p.bid_strategy="LOWEST_COST_WITHOUT_CAP"; }
    try{ const ad=await graph("POST",`${AD_ACCOUNT}/adsets`,p); adsetIds.push(ad.id); log.push(`adset ${ad.id} [${a.geo}]`); }
    catch(e){ log.push(`✗ adset [${a.geo}]: ${e.message}`); }
  }
  if(!adsetIds.length){ console.log("RESULT::"+JSON.stringify({ok:false,campaign_id:camp.id,log,err:"không tạo được ad set"})); return; }

  // 3) MEDIA + ADS
  const ads=[];
  if(isVideo){
    if(!meta.pageId){ log.push("✗ thiếu Page chạy -> không tạo được video ad"); console.log("RESULT::"+JSON.stringify({ok:false,campaign_id:camp.id,adset_ids:adsetIds,log,err:"thiếu Page cho video"})); return; }
    if(!mediaPath || !fs.existsSync(mediaPath)){ log.push("✗ không có file video"); console.log("RESULT::"+JSON.stringify({ok:false,campaign_id:camp.id,adset_ids:adsetIds,log,err:"thiếu file video"})); return; }
    let videoId=null;
    try{ const up=await uploadVideoToPage({pageId:meta.pageId, filePath:mediaPath, published:false, description:meta.name}); videoId=up.id||up.video_id; log.push(`video upload ${videoId}`); }
    catch(e){ log.push("✗ upload video: "+e.message); console.log("RESULT::"+JSON.stringify({ok:false,campaign_id:camp.id,adset_ids:adsetIds,log,err:"upload video lỗi"})); return; }
    // chờ video xử lý xong (tối đa ~120s)
    let thumb=null;
    for(let i=0;i<24;i++){ await sleep(5000);
      try{ const st=await getVideoStatus(videoId); const sv=st.status&&(st.status.video_status||st.status.processing_progress); if(st.status&&st.status.video_status==="ready"){ thumb=await getVideoThumb(videoId); break; } }catch{} }
    log.push(thumb?"video ready":"video chưa ready (vẫn thử tạo ad)");
    for(const c of contents){ for(const adsetId of adsetIds){
      try{
        const vd={ video_id:String(videoId), message:c.caption, title:meta.name.slice(0,40) };
        if(thumb) vd.image_url=thumb;
        if(isMsg) vd.call_to_action={type:"MESSAGE_PAGE"};
        else if(meta.url) vd.call_to_action={type:"LEARN_MORE",value:{link:meta.url}};
        const cre=await graph("POST",`${AD_ACCOUNT}/adcreatives`,{name:`vc ${c.hook}`,object_story_spec:{page_id:String(meta.pageId),video_data:vd}});
        const ad=await graph("POST",`${AD_ACCOUNT}/ads`,{name:`video ad ${c.hook}`,adset_id:adsetId,status:"PAUSED",creative:{creative_id:cre.id}});
        ads.push(ad.id); log.push(`video ad ${ad.id} [${c.hook}]`);
      }catch(e){ log.push(`✗ video ad [${c.hook}]: ${e.message}`); }
    }}
  } else {
    let imageHash=null;
    if(mediaPath && fs.existsSync(mediaPath)){
      try{ const b64=fs.readFileSync(mediaPath).toString("base64"); const r=await graph("POST",`${AD_ACCOUNT}/adimages`,{bytes:b64}); const first=r.images&&Object.values(r.images)[0]; imageHash=first?.hash; log.push(`image_hash ${imageHash?'OK':'?'}`); }
      catch(e){ log.push("✗ upload ảnh: "+e.message); }
    }
    for(const c of contents){ for(const adsetId of adsetIds){
      try{ const r=await createConversionAd({adsetId, pageId:meta.pageId, link:meta.url||"https://hoangminhhoa.com", message:c.caption, headline:meta.name.slice(0,40), imageHash, cta:"SIGN_UP"}); ads.push(r.ad_id); log.push(`ad ${r.ad_id} [${c.hook}]`); }
      catch(e){ log.push(`✗ ad [${c.hook}]: ${e.message}`); }
    }}
  }
  console.log("RESULT::"+JSON.stringify({ok:ads.length>0,campaign_id:camp.id,adset_ids:adsetIds,ad_ids:ads,log}));
}
run().catch(e=>{ console.log("RESULT::"+JSON.stringify({ok:false,err:e.message})); });

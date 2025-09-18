// ad_remove.js
// 适用于 Surge 的 http-response 脚本。会把两个接口的广告字段清空。
let body = $response.body;
let url = $request.url || "";

try {
  if (url.includes("/jump/getlaunchad/v2")) {
    let obj = JSON.parse(body || "{}");
    if (obj && obj.data) {
      obj.data.adList = [];
      if (!obj.data.launchAd) obj.data.launchAd = {};
      obj.data.launchAd.showType = 0;
    }
    body = JSON.stringify(obj);
  } else if (url.includes("/jump/recommend/ad_conf")) {
    let obj = JSON.parse(body || "{}");
    if (obj) obj.data = [];
    body = JSON.stringify(obj);
  }
} catch (e) {
  // 出错就返回原始 body，避免把响应弄崩
  console.log("ad_remove.js error:", e);
}

$done({ body });

// 修改自 https://raw.githubusercontent.com/TAKAGIVEGETA/MyScripts/main/lingoDuo/lingoDuo-xaM-enhanced.js

try {
    let body = $response.body;
    
    // 1. 严格限流保护：超过 20MB 直接放行，防止极端超大包撑爆内存
    if (!body || body.length > 20000000) {
        $done({});
        return;
    }

    const now = Math.floor(Date.now() / 1000);
    const rawArgs = typeof $argument !== 'undefined' ? $argument : '';
    const params = typeof rawArgs === 'string' && rawArgs.length > 0
        ? Object.fromEntries(new URLSearchParams(rawArgs))
        : (rawArgs || {});

    const args = {
        xp_boost: params.xp_boost === true || params.xp_boost === '1' || params.xp_boost === 'true',
        multiplier: Math.max(1, parseInt(params.multiplier, 10) || 3),
        unlock_all: params.unlock_all === true || params.unlock_all === '1' || params.unlock_all === 'true'
    };

    let modified = false;

    // 2. 核心用户属性与业务逻辑修改函数（带严格的 Dirty Check，避免无效修改）
    const applyUserLogic = (userdata) => {
        if (!userdata || typeof userdata !== 'object') return false;
        let changed = false;

        // A. 解锁所有关卡 (unlock_all) —— 在对象树中处理，比全局盲目正则更安全精准
        if (args.unlock_all && userdata.currentCourse && Array.isArray(userdata.currentCourse.pathSectioned)) {
            const sections = userdata.currentCourse.pathSectioned;
            for (let s = 0; s < sections.length; s++) {
                const units = sections[s] && sections[s].units;
                if (Array.isArray(units)) {
                    for (let u = 0; u < units.length; u++) {
                        const levels = units[u] && units[u].levels;
                        if (Array.isArray(levels)) {
                            for (let l = 0; l < levels.length; l++) {
                                if (levels[l] && levels[l].state === 'locked') {
                                    levels[l].state = 'active';
                                    changed = true;
                                }
                            }
                        }
                    }
                }
            }
        }

        // B. 会员状态注入
        if (userdata.subscriberLevel !== 'GOLD') {
            userdata.subscriberLevel = 'GOLD';
            changed = true;
        }

        // C. 追踪属性安全注入
        if (!userdata.trackingProperties || typeof userdata.trackingProperties !== 'object') {
            userdata.trackingProperties = {};
            changed = true;
        }
        const trackingKeys = [
            "has_item_immersive_subscription",
            "has_item_premium_subscription",
            "has_item_live_subscription",
            "has_item_gold_subscription",
            "has_item_max_subscription"
        ];
        for (let i = 0; i < trackingKeys.length; i++) {
            const key = trackingKeys[i];
            if (userdata.trackingProperties[key] !== true) {
                userdata.trackingProperties[key] = true;
                changed = true;
            }
        }

        // D. 商店道具与权益注入 (shopItems)
        if (!Array.isArray(userdata.shopItems)) {
            userdata.shopItems = [];
            changed = true;
        }

        let hasGold = false;
        let foundXpBoost = false;

        for (let i = 0; i < userdata.shopItems.length; i++) {
            const item = userdata.shopItems[i];
            if (item && item.id === 'gold_subscription') {
                hasGold = true;
            }
            if (args.xp_boost && item && item.id === 'xp_boost_stackable') {
                // 仅当时间或倍率发生实际变动时才标记修改
                if (item.xpBoostMultiplier !== args.multiplier || (item.expectedExpirationDate && item.expectedExpirationDate < now)) {
                    item.purchaseDate = now;
                    item.expectedExpirationDate = now + 3600;
                    item.xpBoostMultiplier = args.multiplier;
                    changed = true;
                }
                foundXpBoost = true;
            }
        }

        if (!hasGold) {
            userdata.shopItems.push({
                id: 'gold_subscription',
                purchaseDate: now - 172800,
                purchasePrice: 0,
                subscriptionInfo: {
                    expectedExpiration: now + 31536000,
                    productId: "com.duolingo.DuolingoMobile.subscription.Gold.TwelveMonth.24Q2Max.168",
                    renewer: 'APPLE',
                    renewing: true,
                    tier: 'twelve_month',
                    type: 'gold'
                }
            });
            changed = true;
        }

        if (args.xp_boost && !foundXpBoost) {
            userdata.shopItems.push({
                id: 'xp_boost_stackable',
                purchaseDate: now,
                expectedExpirationDate: now + 3600,
                purchasePrice: 0,
                xpBoostMultiplier: args.multiplier
            });
            changed = true;
        }

        return changed;
    };

    // 3. 结构化特征分流处理（严格互斥、杜绝串台）
    try {
        if (body.includes('"responses":')) {
            const obj = JSON.parse(body);
            if (obj && Array.isArray(obj.responses) && obj.responses.length >= 1) {
                if (!(obj.responses[0].headers && 'etag' in obj.responses[0].headers)) {
                    const b0 = obj.responses[0].body;
                    let subChanged = false;
                    
                    if (typeof b0 === 'string') {
                        const userdata = JSON.parse(b0);
                        subChanged = applyUserLogic(userdata);
                        if (subChanged) {
                            obj.responses[0].body = JSON.stringify(userdata);
                        }
                    } else if (b0 && typeof b0 === 'object') {
                        subChanged = applyUserLogic(b0);
                    }
                    
                    if (subChanged) {
                        body = JSON.stringify(obj);
                        modified = true;
                    }
                }
            }
        } else if (body.includes('"subscriberLevel"') || body.includes('"shopItems"')) {
            const obj = JSON.parse(body);
            if (applyUserLogic(obj)) {
                body = JSON.stringify(obj);
                modified = true;
            }
        }
    } catch (parseErr) {
        // 任何结构解析异常时触发熔断，丢弃半成品，绝对安全回退
        modified = false;
    }

    // 4. 根据是否有实质性修改来决定输出
    if (modified) {
        $done({ body });
    } else {
        $done({});
    }

} catch (e) {
    // 全局致命异常绝对兜底，保证 App 绝不白屏或断网
    $done({});
}

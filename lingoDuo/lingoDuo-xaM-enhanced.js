// 修改自 https://raw.githubusercontent.com/TAKAGIVEGETA/MyScripts/main/lingoDuo/lingoDuo-xaM-enhanced.js
try {
    const obj = JSON.parse($response.body);
    const now = (Date.now() / 1000) | 0; // 位运算取整，比 Math.floor 更快

    // 优化参数解析
    const params = typeof $argument === 'string' ? Object.fromEntries(new URLSearchParams($argument)) : ($argument || {});
    const args = {
        xp_boost: params.xp_boost === true || params.xp_boost === '1' || params.xp_boost === 'true',
        multiplier: Math.max(1, parseInt(params.multiplier, 10) || 3),
        unlock_all: params.unlock_all === true || params.unlock_all === '1' || params.unlock_all === 'true'
    };

    const applyGold = (userdata) => {
        if (!userdata.shopItems) userdata.shopItems = [];
        
        // 查找或添加 gold_subscription
        let goldItem = userdata.shopItems.find(item => item.id === 'gold_subscription');
        if (!goldItem) {
            goldItem = {
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
            };
            userdata.shopItems.push(goldItem);
        }

        userdata.subscriberLevel = 'GOLD';
        
        if (!userdata.trackingProperties) userdata.trackingProperties = {};
        userdata.trackingProperties.has_item_immersive_subscription = true;
        userdata.trackingProperties.has_item_premium_subscription = true;
        userdata.trackingProperties.has_item_live_subscription = true;
        userdata.trackingProperties.has_item_gold_subscription = true;
        userdata.trackingProperties.has_item_max_subscription = true;
    };

    const applyXpBoost = (userdata) => {
        if (!args.xp_boost) return;
        if (!userdata.shopItems) userdata.shopItems = [];

        let boostItem = userdata.shopItems.find(item => item.id === 'xp_boost_stackable');
        if (boostItem) {
            boostItem.purchaseDate = now;
            boostItem.expectedExpirationDate = now + 3600;
            boostItem.xpBoostMultiplier = args.multiplier;
        } else {
            userdata.shopItems.push({
                id: 'xp_boost_stackable',
                purchaseDate: now,
                expectedExpirationDate: now + 3600,
                purchasePrice: 0,
                xpBoostMultiplier: args.multiplier
            });
        }
    };

    const applyUnlockAll = (userdata) => {
        if (!args.unlock_all) return;
        const sections = userdata.currentCourse?.pathSectioned;
        if (!Array.isArray(sections)) return;

        for (let i = 0; i < sections.length; i++) {
            const units = sections[i].units;
            if (!Array.isArray(units)) continue;

            for (let j = 0; j < units.length; j++) {
                const levels = units[j].levels;
                if (!Array.isArray(levels)) continue;

                for (let k = 0; k < levels.length; k++) {
                    if (levels[k].state === 'locked') {
                        levels[k].state = 'active';
                    }
                }
            }
        }
    };

    const applyAll = (userdata) => {
        applyGold(userdata);
        applyXpBoost(userdata);
        applyUnlockAll(userdata);
    };

    if (Array.isArray(obj.responses) && obj.responses.length >= 2) {
        const resp0 = obj.responses[0];
        if (resp0?.headers && 'etag' in resp0.headers) {
            $done({});
            return;
        }

        let b0 = resp0.body;
        if (typeof b0 === 'string') {
            const userdata = JSON.parse(b0);
            applyAll(userdata);
            resp0.body = JSON.stringify(userdata);
        } else if (b0 && typeof b0 === 'object') {
            applyAll(b0);
            // 如果已经是对象，直接赋值，减少一次不必要的 JSON.stringify 转字符串再转对象的开销
            resp0.body = b0; 
        }
        $done({ body: JSON.stringify(obj) });
    } else if (obj && typeof obj === 'object' && (obj.shopItems !== undefined || obj.subscriberLevel !== undefined || (obj.id && obj.trackingProperties))) {
        applyAll(obj);
        $done({ body: JSON.stringify(obj) });
    } else {
        $done({});
    }
} catch (e) {
    $done({});
}

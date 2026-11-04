try {
    let obj = JSON.parse($response.body);
	let minutes = parseInt($argument, 10) || 60;
	let seconds = minutes * 60;
    if (!isNaN(seconds) && seconds > 0 && obj.liveOpsChallenges)
        obj.liveOpsChallenges.forEach(challenge => {
            if (challenge.initialTime) challenge.initialTime = seconds;
            if (challenge.initialLevelTimes) challenge.initialLevelTimes = challenge.initialLevelTimes.map(() => seconds);
            if (challenge.initialSessionTimes) challenge.initialSessionTimes = challenge.initialSessionTimes.map(() => seconds);
        });
    $done({ body: JSON.stringify(obj) });
} catch (e) {
    $done({});
}

const { buildTimeline } = require("../services/timeline/buildTimeline");

const fakeSkins = [
  {
    history: [
      { t: Date.now() - 3600 * 1000, p: 400 },
      { t: Date.now() - 1800 * 1000, p: 410 },
      { t: Date.now(), p: 415 }
    ]
  }
];

console.log(buildTimeline(fakeSkins, "1h"));

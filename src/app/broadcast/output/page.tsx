"use client";
import React, { useEffect } from "react";
import Script from "next/script";

export default function BroadcastOutputPage() {
  useEffect(() => {
    // Add broadcast-output class to body to ensure transparency and clean rendering
    document.body.classList.add("broadcast-clean-output");
    return () => {
      document.body.classList.remove("broadcast-clean-output");
    };
  }, []);

  return (
    <>
      {/* Stylesheet for 1920x1080 graphics suite */}
      <link rel="stylesheet" href="/broadcast/styles.css?v=20261024_v13" />

      <main id="viewport" style={{ background: "transparent" }}>
        <section aria-label="Cricket broadcast output" className="stage" id="stage">
          <div aria-hidden="true" className="preview-scene">
            <div className="scene-sky"></div>
            <div className="scene-lights scene-lights-left"></div>
            <div className="scene-lights scene-lights-right"></div>
            <div className="scene-field"></div>
          </div>
          <div aria-hidden="true" className="safe-frame"></div>
          <div aria-hidden="true" className="broadcast-atmosphere">
            <i></i>
            <i></i>
            <i></i>
          </div>

          {/* 01 LIVE SCOREBAR */}
          <section className="gfx scorebar is-hidden" data-gfx="scorebar" id="scorebar">
            <div className="scorebar-main">
              <div className="team-chip team-chip-a">
                <div className="team-monogram" id="teamAMonogram">LUL</div>
                <div className="team-stack">
                  <b id="teamAName">LUMBINI LIONS</b>
                  <span id="inningsText">MATCH SCHEDULED</span>
                </div>
              </div>
              <div className="score-lockup">
                <div className="score-value">
                  <span id="runs">0</span>
                  <i>/</i>
                  <span id="wickets">0</span>
                </div>
                <div className="overs-value">
                  <b id="overs">0.0</b>
                  <span>OVERS</span>
                </div>
              </div>
              <div className="batters-block">
                <div className="batter-line striker">
                  <span className="strike-mark"></span>
                  <b id="strikerName">ROHIT PAUDEL</b>
                  <strong id="strikerRuns">0</strong>
                  <small id="strikerBalls">0</small>
                </div>
                <div className="batter-line">
                  <span className="strike-mark"></span>
                  <b id="nonStrikerName">AAKASH TRIPATHI</b>
                  <strong id="nonStrikerRuns">0</strong>
                  <small id="nonStrikerBalls">0</small>
                </div>
              </div>
              <div className="bowler-block">
                <div className="bowler-line">
                  <span className="ball-dot"></span>
                  <b id="bowlerName">ABINASH BOHARA</b>
                  <strong id="bowlerFigures">0/0</strong>
                  <small id="bowlerOvers">0.0</small>
                </div>
                <div className="recent-line">
                  <span>THIS OVER</span>
                  <div className="recent-balls" id="recentBalls"></div>
                </div>
              </div>
              <div className="team-chip team-chip-b">
                <div className="team-stack right">
                  <b id="teamBName">SUDURPASCHIM ROYALS</b>
                  <span id="rateText">MATCH NOT STARTED</span>
                </div>
                <div className="team-monogram alt" id="teamBMonogram">SPR</div>
              </div>
            </div>
            <div className="scorebar-foot">
              <span id="matchLabel">NPL 2026 · MATCH 01 · SEASON3-M1</span>
              <b id="requirement">LUMBINI LIONS vs SUDURPASCHIM ROYALS · MATCH SCHEDULED</b>
              <span id="venueLabel">TU INTERNATIONAL CRICKET GROUND, KIRTIPUR</span>
            </div>
          </section>

          {/* 02 COMPACT SCOREBUG */}
          <section className="gfx compact-bug is-hidden" data-gfx="compactBug" id="compactBug">
            <div className="compact-team">
              <span id="compactTeam">LUL</span>
              <b id="compactScore">0/0</b>
            </div>
            <div className="compact-meta">
              <b id="compactOvers">0.0</b>
              <span>OVERS</span>
            </div>
            <div className="compact-batter">
              <span>▶</span>
              <b id="compactStrikerName">ROHIT PAUDEL</b>
              <strong>
                <span id="compactStrikerRuns">0</span> <small id="compactStrikerBalls">0</small>
              </strong>
            </div>
            <div className="compact-bowler">
              <b id="compactBowlerName">ABINASH BOHARA</b>
              <strong>
                <span id="compactBowlerFigures">0/0</span> <small id="compactBowlerOvers">0.0</small>
              </strong>
            </div>
          </section>

          {/* 03 LOWER THIRD */}
          <section className="gfx lower-third is-hidden" data-gfx="lowerThird" id="lowerThird">
            <div className="portrait-slab">
              <div className="portrait-placeholder" id="ltPhoto">
                <span id="ltInitials">KK</span>
              </div>
            </div>
            <div className="lower-copy">
              <span className="eyebrow" id="ltEyebrow">CAPTAIN · KATHMANDU GURKHAS</span>
              <h2 id="ltName">KARAN KC</h2>
              <div className="lower-detail">
                <span id="ltRole">BOWLING ALL-ROUNDER</span>
                <b id="ltStat">19 <small>JERSEY</small></b>
              </div>
            </div>
            <div className="jersey-number" id="ltNumber">19</div>
          </section>

          {/* 04 MATCHUP */}
          <section className="gfx full-card matchup-card is-hidden" data-gfx="matchup" id="matchup">
            <header className="card-title">
              <span>MATCH DAY</span>
              <b>NEPAL PREMIER LEAGUE · 2026</b>
            </header>
            <div className="matchup-grid">
              <div className="match-team">
                <div className="mega-monogram" id="matchupACode">KAG</div>
                <small>HOME</small>
                <h2 id="matchupAName">KATHMANDU GURKHAS</h2>
              </div>
              <div className="match-center">
                <span>NPL · MATCH 05</span>
                <strong>VS</strong>
                <small>16:30 NPT</small>
              </div>
              <div className="match-team right">
                <div className="mega-monogram alt" id="matchupBCode">JAB</div>
                <small>AWAY</small>
                <h2 id="matchupBName">JANAKPUR BOLTS</h2>
              </div>
            </div>
            <footer className="card-foot">
              TU INTERNATIONAL CRICKET GROUND <span>·</span> KIRTIPUR <span>·</span> NPL SEASON 3
            </footer>
          </section>

          {/* 05 TOSS */}
          <section className="gfx full-card editorial-card is-hidden" data-gfx="toss" id="toss">
            <header className="card-title">
              <span>TOSS</span>
              <b>NPL · MATCH 05</b>
            </header>
            <div className="editorial-layout">
              <div className="editorial-mark">
                <div className="mega-monogram alt" id="tossCode">JAB</div>
                <span id="tossTeamName">JANAKPUR BOLTS</span>
              </div>
              <div className="editorial-copy">
                <small>JANAKPUR BOLTS WON THE TOSS</small>
                <h2>WE&apos;LL<br /><em>BAT FIRST</em></h2>
                <p>Fresh surface at Kirtipur — put runs on the board.</p>
              </div>
              <div className="side-stat">
                <span>CAPTAIN</span>
                <b>ANIL SAH</b>
                <small>DECISION · BAT</small>
              </div>
            </div>
          </section>

          {/* 06 PLAYING XI */}
          <section className="gfx full-card list-card is-hidden" data-gfx="playingXI" id="playingXI">
            <header className="card-title">
              <span>PLAYING XI</span>
              <b id="xiTeamName">KATHMANDU GURKHAS</b>
            </header>
            <div className="xi-layout">
              <div className="xi-lead">
                <div className="mega-monogram" id="xiTeamCode">KAG</div>
                <h2 id="xiTeamNameBig">KATHMANDU GURKHAS</h2>
                <span>PLAYING XI</span>
                <small>NPL SEASON 3 · 2026</small>
              </div>
              <div className="xi-list" id="xiList"></div>
            </div>
          </section>

          {/* 07 BATTER PROFILE */}
          <section className="gfx full-card profile-card is-hidden" data-gfx="batterProfile" id="batterProfile">
            <div className="profile-photo">
              <div className="profile-placeholder" id="profilePhoto">
                <span id="profileInitials">BS</span>
              </div>
              <div className="profile-number">27</div>
            </div>
            <div className="profile-copy">
              <span className="eyebrow">BATTER PROFILE · KATHMANDU GURKHAS</span>
              <h2 id="profileName">BHIM SHARKI</h2>
              <p id="profileRole">RIGHT-HANDED BATTER</p>
              <div className="profile-stats" id="profileStats"></div>
            </div>
          </section>

          {/* 08 BOWLER PROFILE */}
          <section className="gfx full-card profile-card reverse is-hidden" data-gfx="bowlerProfile" id="bowlerProfile">
            <div className="profile-photo">
              <div className="profile-placeholder alt">
                <span>LR</span>
              </div>
              <div className="profile-number">27</div>
            </div>
            <div className="profile-copy">
              <span className="eyebrow">BOWLER PROFILE · JANAKPUR BOLTS</span>
              <h2>LALIT RAJBANSHI</h2>
              <p>LEFT-ARM ORTHODOX</p>
              <div className="profile-stats">
                <div><span>MATCHES</span><b>28</b></div>
                <div><span>WICKETS</span><b>41</b></div>
                <div><span>AVERAGE</span><b>18.7</b></div>
                <div><span>ECONOMY</span><b>6.54</b></div>
                <div><span>BEST</span><b>4/17</b></div>
                <div><span>DOT %</span><b>46.2</b></div>
              </div>
            </div>
          </section>

          {/* 09 PLAYER COMPARISON */}
          <section className="gfx full-card compare-card is-hidden" data-gfx="comparison" id="comparison">
            <header className="card-title">
              <span>HEAD TO HEAD</span>
              <b>BATTER vs BOWLER</b>
            </header>
            <div className="compare-layout">
              <div className="compare-person">
                <div className="mini-portrait"><span>BS</span></div>
                <small>BATTER</small>
                <h2>BHIM SHARKI</h2>
                <b>58 <span>41</span></b>
              </div>
              <div className="compare-rows" id="compareRows"></div>
              <div className="compare-person right">
                <div className="mini-portrait alt"><span>LR</span></div>
                <small>BOWLER</small>
                <h2>LALIT RAJBANSHI</h2>
                <b>1/24 <span>3.2</span></b>
              </div>
            </div>
          </section>

          {/* 10 PARTNERSHIP */}
          <section className="gfx lower-strip is-hidden" data-gfx="partnership" id="partnership">
            <div className="strip-label"><span>PARTNERSHIP</span><b>5TH WICKET</b></div>
            <div className="strip-player"><span>▶</span><b>BHIM SHARKI</b><strong>58 <small>41</small></strong></div>
            <div className="partnership-value"><b>64</b><span>42 BALLS</span></div>
            <div className="strip-player right"><strong>27 <small>21</small></strong><b>AADIL ALAM</b></div>
          </section>

          {/* 11 CHASE EQUATION */}
          <section className="gfx lower-strip chase-strip is-hidden" data-gfx="chase" id="chase">
            <div className="strip-label"><span>CHASE</span><b>KATHMANDU GURKHAS</b></div>
            <div className="chase-big"><span>NEED</span><b>27</b><small>RUNS</small></div>
            <div className="chase-big"><span>FROM</span><b>22</b><small>BALLS</small></div>
            <div className="chase-small"><span>REQ. RATE</span><b>7.36</b></div>
            <div className="chase-small"><span>WICKETS</span><b>6</b></div>
          </section>

          {/* 12 OVER SUMMARY */}
          <section className="gfx lower-strip over-strip is-hidden" data-gfx="overSummary" id="overSummary">
            <div className="strip-label"><span>OVER 17</span><b>9 RUNS</b></div>
            <div className="over-balls"><i>1</i><i>1</i><i className="four">4</i><i>0</i><i>1</i><i className="six">6</i></div>
            <div className="over-copy"><b>LALIT RAJBANSHI</b><span>1/31 · 4.0 OV</span></div>
          </section>

          {/* 13 FALL OF WICKETS */}
          <section className="gfx full-card table-card is-hidden" data-gfx="fow" id="fow">
            <header className="card-title scorecard-header">
              <div className="scorecard-brand">
                <div className="scorecard-crest-box" id="fowCrest"></div>
                <div className="scorecard-meta">
                  <span>FALL OF WICKETS</span>
                  <b id="fowTeam">KATHMANDU GURKHAS</b>
                </div>
              </div>
              <div className="scorecard-tourney-badge">NPL SEASON 3 · 2026</div>
            </header>
            <div className="fow-list" id="fowRows"></div>
          </section>

          {/* 14 INNINGS SUMMARY */}
          <section className="gfx full-card table-card is-hidden" data-gfx="inningsSummary" id="inningsSummary">
            <header className="card-title scorecard-header">
              <div className="scorecard-brand">
                <div className="scorecard-crest-box" id="inningsSummaryCrest"></div>
                <div className="scorecard-meta">
                  <span>INNINGS SUMMARY</span>
                  <b id="inningsSummaryTeam">KATHMANDU · 146/4</b>
                </div>
              </div>
              <div className="scorecard-tourney-badge">NPL SEASON 3 · 2026</div>
            </header>
            <div className="summary-head"><span>BATTER</span><span>R</span><span>B</span><span>4s</span><span>6s</span><span>SR</span></div>
            <div className="summary-list" id="summaryRows"></div>
            <div className="table-footer"><span>EXTRAS <b>11</b></span><span>RUN RATE <b>5.79</b></span><span>OVERS <b>32.4</b></span></div>
          </section>

          {/* 15 POINTS TABLE */}
          <section className="gfx full-card table-card is-hidden" data-gfx="pointsTable" id="pointsTable">
            <header className="card-title"><span>NPL POINTS TABLE</span><b>SEASON 3 · STANDINGS</b></header>
            <div className="points-head"><span>POS</span><span>TEAM</span><span>M</span><span>W</span><span>L</span><span>PTS</span><span>NRR</span></div>
            <div className="points-list" id="pointsRows"></div>
          </section>

          {/* 16 RESULT */}
          <section className="gfx full-card result-card is-hidden" data-gfx="result" id="result">
            <header className="card-title"><span>FULL TIME</span><b>MATCH RESULT</b></header>
            <div className="result-layout">
              <div className="result-team">
                <div className="mega-monogram" id="resultACode">KAG</div>
                <h2 id="resultAName">KATHMANDU GURKHAS</h2>
                <b>174/5</b><span>19.1 OV</span>
              </div>
              <div className="result-middle">
                <small>KATHMANDU GURKHAS WON</small>
                <strong>BY 5<br />WICKETS</strong>
                <p>PLAYER OF THE MATCH<br /><b>BHIM SHARKI</b></p>
              </div>
              <div className="result-team right">
                <div className="mega-monogram alt" id="resultBCode">JAB</div>
                <h2 id="resultBName">JANAKPUR BOLTS</h2>
                <b>171/7</b><span>20.0 OV</span>
              </div>
            </div>
          </section>

          {/* 17 PLAYER OF MATCH */}
          <section className="gfx full-card award-card is-hidden" data-gfx="playerOfMatch" id="playerOfMatch">
            <div className="award-copy">
              <span>PLAYER OF THE MATCH</span>
              <h2 id="potmName">BHIM SHARKI</h2>
              <p>MATCH-WINNING HALF-CENTURY IN THE CHASE</p>
              <div>
                <b>58*</b><small>RUNS</small>
                <b>41</b><small>BALLS</small>
                <b>141.5</b><small>STRIKE RATE</small>
              </div>
            </div>
            <div className="award-photo">
              <div className="profile-placeholder"><span>BS</span></div>
            </div>
          </section>

          {/* 18 DRS REVIEW */}
          <section className="gfx full-card review-card is-hidden" data-gfx="review" id="review">
            <header className="card-title"><span>DRS</span><b>DECISION REVIEW SYSTEM</b></header>
            <div className="review-layout">
              <div className="review-badge"><span>ORIGINAL DECISION</span><b>NOT OUT</b></div>
              <div className="review-graphic">
                <div className="stump-camera">
                  <div className="stumps-art"><i></i><i></i><i></i></div>
                  <div className="ball-path"></div>
                  <span className="ball-tracker">BALL TRACKING · PITCHING IN LINE · IMPACT IN LINE · WICKETS HITTING</span>
                </div>
              </div>
              <div className="review-badge out"><span>FINAL DECISION</span><b>OUT</b></div>
            </div>
          </section>

          {/* 19 POWERPLAY */}
          <section className="gfx lower-strip powerplay-strip is-hidden" data-gfx="powerplay" id="powerplay">
            <div className="strip-label"><span>FIELD RESTRICTIONS</span><b>MANDATORY POWERPLAY</b></div>
            <div className="powerplay-info"><span>OVERS 1–6</span><b>MAXIMUM 2 FIELDERS OUTSIDE THE 30-YARD CIRCLE</b></div>
          </section>

          {/* 20 BOWLING CARD */}
          <section className="gfx full-card table-card is-hidden" data-gfx="bowlingCard" id="bowlingCard">
            <header className="card-title scorecard-header">
              <div className="scorecard-brand">
                <div className="scorecard-crest-box" id="bowlingCardCrest"></div>
                <div className="scorecard-meta">
                  <span>BOWLING FIGURES</span>
                  <b id="bowlingCardTeam">JANAKPUR BOLTS</b>
                </div>
              </div>
              <div className="scorecard-tourney-badge">NPL SEASON 3 · 2026</div>
            </header>
            <div className="bowling-head"><span>BOWLER</span><span>O</span><span>M</span><span>R</span><span>W</span><span>ECON</span></div>
            <div className="bowling-list" id="bowlingRows"></div>
            <div className="table-footer"><span>OVERS <b>16.2</b></span><span>RUNS <b>146</b></span><span>WICKETS <b>4</b></span></div>
          </section>

          {/* 21 PROJECTED SCORE */}
          <section className="gfx lower-strip projected-strip is-hidden" data-gfx="projected" id="projected">
            <div className="strip-label"><span>PROJECTED SCORE</span><b>KATHMANDU GURKHAS</b></div>
            <div className="projection"><small>CURRENT RATE</small><b>179</b></div>
            <div className="projection hot"><small>9.5 RPO</small><b>190</b></div>
            <div className="projection"><small>10.5 RPO</small><b>200</b></div>
            <div className="projection"><small>11.5 RPO</small><b>210</b></div>
          </section>

          {/* 23 MASTER FULL SCREEN CRICKET INFORMATICS DASHBOARD — 16:9 5-ZONE HERO */}
          <section className="gfx master-card is-hidden" data-gfx="masterCard" id="masterCard">
            {/* Dynamic Franchise Ambient Crest Watermarks */}
            <div className="master-bg-crest team-a" id="masterBgCrestA" aria-hidden="true"></div>
            <div className="master-bg-crest team-b" id="masterBgCrestB" aria-hidden="true"></div>

            {/* ZONE 1: MATCH HEADER & TOURNAMENT SITUATION BAR */}
            <header className="master-zone-header">
              <div className="master-header-team master-team-a-box">
                <div className="master-crest-wrapper" id="masterTeamACrest">
                  <span className="team-monogram" id="masterTeamAMonogram">LUL</span>
                </div>
                <div className="master-team-meta">
                  <div className="master-team-badge-row">
                    <span className="master-team-badge" id="masterTeamABadge">BATTING</span>
                    <span className="master-team-code-pill" id="masterTeamACode">LUL</span>
                  </div>
                  <h2 id="masterTeamAName">LUMBINI LIONS</h2>
                  <small id="masterInnings">MATCH SCHEDULED</small>
                </div>
              </div>

              <div className="master-header-center">
                <div className="master-tournament-tag">
                  <span className="live-dot-pulse"></span>
                  <span className="master-match-pill" id="masterMatchPill">MATCH 01</span>
                  <span className="master-match-sep">·</span>
                  <span id="masterMatchLabel">NEPAL PREMIER LEAGUE 2026</span>
                </div>
                <div className="master-mega-score-cluster">
                  <div className="master-mega-runs">
                    <span id="masterRuns">0</span>
                    <i className="divider">/</i>
                    <span id="masterWickets">0</span>
                  </div>
                  <div className="master-mega-overs-pill">
                    <b id="masterOvers">0.0</b> <small>OVERS</small>
                  </div>
                </div>
                <div className="master-run-rates">
                  <span className="rate-pill"><small>CRR</small> <b id="masterRate">-</b></span>
                  <span className="rate-pill"><small>RRR</small> <b id="masterRrr">-</b></span>
                  <span className="rate-pill"><small>TARGET</small> <b id="masterTarget">-</b></span>
                  <span className="rate-pill"><small>PROJECTED</small> <b id="masterProjected">-</b></span>
                </div>
                <div className="master-equation-banner">
                  <span id="masterRequirement">LUMBINI LIONS vs SUDURPASCHIM ROYALS · MATCH SCHEDULED</span>
                </div>
              </div>

              <div className="master-header-team master-team-b-box right">
                <div className="master-team-meta right">
                  <div className="master-team-badge-row right">
                    <span className="master-team-code-pill" id="masterTeamBCode">SPR</span>
                    <span className="master-team-badge alt" id="masterTeamBBadge">BOWLING</span>
                  </div>
                  <h2 id="masterTeamBName">SUDURPASCHIM ROYALS</h2>
                  <small id="masterVenue">TU CRICKET GROUND · KIRTIPUR</small>
                </div>
                <div className="master-crest-wrapper" id="masterTeamBCrest">
                  <span className="team-monogram alt" id="masterVsMonogram">SPR</span>
                </div>
              </div>

              {/* LIVE WIN PROBABILITY GAUGE */}
              <div className="master-win-prob-bar">
                <div className="win-prob-fill team-a" id="masterWinProbA" style={{ width: '50%' }}>
                  <span id="masterWinProbAText">LUMBINI 50%</span>
                </div>
                <div className="win-prob-fill team-b" id="masterWinProbB" style={{ width: '50%' }}>
                  <span id="masterWinProbBText">SUDURPASCHIM 50%</span>
                </div>
              </div>
            </header>

            {/* 16:9 MAIN BODY GRID: ZONE 2, ZONE 3, ZONE 4, ZONE 5 */}
            <div className="master-grid-body">
              {/* ZONE 2: CREASE INFORMATICS (BATTERS) */}
              <div className="master-zone master-zone-batting">
                <div className="zone-header">
                  <div className="zone-title-wrap">
                    <span className="zone-num">ZONE 02</span>
                    <h3>BATTING CREASE & PARTNERSHIP</h3>
                  </div>
                  <span className="zone-pill">LIVE STRIKE</span>
                </div>

                <div className="master-batters-pair">
                  {/* Striker Card */}
                  <div className="master-batter-card striker-active">
                    <div className="batter-photo-frame">
                      <div className="player-cutout-img" id="masterStrikerPhoto"></div>
                      <span className="strike-star-badge">★ ON STRIKE</span>
                    </div>
                    <div className="batter-content">
                      <div className="batter-tag-row">
                        <span className="batter-role" id="masterStrikerRole">TOP-ORDER BATTER</span>
                        <span className="batter-style">RHB</span>
                      </div>
                      <h4 id="masterStrikerName">ROHIT PAUDEL</h4>
                      <div className="batter-runs-row">
                        <strong className="runs-big" id="masterStrikerRuns">0*</strong>
                        <div className="balls-sr">
                          <span><b id="masterStrikerBalls">0</b> BALLS</span>
                          <span>SR <b id="masterStrikerSR">0.0</b></span>
                        </div>
                      </div>
                      <div className="batter-boundaries">
                        <span className="boundary-chip fours"><small>4s</small> <b id="masterStrikerFours">0</b></span>
                        <span className="boundary-chip sixes"><small>6s</small> <b id="masterStrikerSixes">0</b></span>
                        <span className="boundary-chip dots"><small>DOTS</small> <b id="masterStrikerDots">0</b></span>
                      </div>
                    </div>
                  </div>

                  {/* Non-Striker Card */}
                  <div className="master-batter-card non-striker">
                    <div className="batter-photo-frame">
                      <div className="player-cutout-img" id="masterNonStrikerPhoto"></div>
                      <span className="strike-star-badge non">NON-STRIKER</span>
                    </div>
                    <div className="batter-content">
                      <div className="batter-tag-row">
                        <span className="batter-role" id="masterNonStrikerRole">ALL-ROUNDER</span>
                        <span className="batter-style">RHB</span>
                      </div>
                      <h4 id="masterNonStrikerName">AAKASH TRIPATHI</h4>
                      <div className="batter-runs-row">
                        <strong className="runs-big" id="masterNonStrikerRuns">0*</strong>
                        <div className="balls-sr">
                          <span><b id="masterNonStrikerBalls">0</b> BALLS</span>
                          <span>SR <b id="masterNonStrikerSR">0.0</b></span>
                        </div>
                      </div>
                      <div className="batter-boundaries">
                        <span className="boundary-chip fours"><small>4s</small> <b id="masterNonStrikerFours">0</b></span>
                        <span className="boundary-chip sixes"><small>6s</small> <b id="masterNonStrikerSixes">0</b></span>
                        <span className="boundary-chip dots"><small>DOTS</small> <b id="masterNonStrikerDots">0</b></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Active Partnership Strip */}
                <div className="master-partnership-bar">
                  <div className="part-label">
                    <span id="masterPartnershipLabel">OPENING STAND · 0 (0b)</span>
                    <strong id="masterPartnershipRuns">0 RUNS</strong>
                  </div>
                  <div className="part-stat">
                    <span>FROM <b id="masterPartnershipBalls">0</b> BALLS</span>
                    <span>RUN RATE <b id="masterPartnershipRate">-</b></span>
                  </div>
                  <div className="part-split-bar">
                    <div className="split-a" id="masterPartSplitA" style={{ width: '50%' }}></div>
                    <div className="split-b" id="masterPartSplitB" style={{ width: '50%' }}></div>
                  </div>
                </div>
              </div>

              {/* ZONE 3: BOWLING & OVER ANALYSIS */}
              <div className="master-zone master-zone-bowling">
                <div className="zone-header">
                  <div className="zone-title-wrap">
                    <span className="zone-num">ZONE 03</span>
                    <h3>BOWLING & OVER TRAJECTORY</h3>
                  </div>
                  <span className="zone-pill">THIS OVER</span>
                </div>

                {/* Current Bowler Card */}
                <div className="master-bowler-card">
                  <div className="bowler-photo-frame">
                    <div className="player-cutout-img" id="masterBowlerPhoto"></div>
                    <span className="bowler-spell-badge" id="masterBowlerSpellBadge">1ST SPELL</span>
                  </div>
                  <div className="bowler-content">
                    <div className="bowler-tag-row">
                      <span className="bowler-role" id="masterBowlerStyle">LEFT-ARM ORTHODOX SPIN</span>
                      <span className="bowler-country">NEP</span>
                    </div>
                    <h4 id="masterBowlerName">ABINASH BOHARA</h4>
                    <div className="bowler-figures-row">
                      <strong className="figures-big" id="masterBowlerFigures">0/0</strong>
                      <div className="bowler-overs-pill">
                        <span><b id="masterBowlerOvers">0.0</b> OVERS</span>
                        <span>ECON <b id="masterBowlerEcon">0.00</b></span>
                      </div>
                    </div>
                    <div className="bowler-extra-stats">
                      <span>MAIDENS: <b id="masterBowlerMaidens">0</b></span>
                      <span>DOTS: <b id="masterBowlerDots">0</b></span>
                      <span>BOUNDARIES: <b id="masterBowlerBoundaries">0</b></span>
                    </div>
                  </div>
                </div>

                {/* This Over Deliveries Track */}
                <div className="master-this-over-box">
                  <div className="over-track-head">
                    <span id="masterOverProgressTitle">OVER 1 PENDING</span>
                    <small id="masterOverStatus">FIRST OVER PENDING</small>
                  </div>
                  <div className="master-recent-balls" id="masterRecentBalls">
                    {/* Balls injected dynamically by app.js */}
                  </div>
                </div>

                {/* Toss & Match State Box */}
                <div className="master-toss-box">
                  <div className="toss-icon">🪙</div>
                  <div className="toss-copy">
                    <small>TOSS & MATCH STATUS</small>
                    <strong id="masterTossText">MATCH SCHEDULED · TOSS AT 12:45 PM · MATCH COMMENCES 1:15 PM NPT</strong>
                  </div>
                </div>
              </div>

              {/* ZONE 4: FALL OF WICKETS & INNINGS PROGRESS */}
              <div className="master-zone master-zone-fow">
                <div className="zone-header">
                  <div className="zone-title-wrap">
                    <span className="zone-num">ZONE 04</span>
                    <h3>FALL OF WICKETS & TIMELINE</h3>
                  </div>
                  <span className="zone-pill">INNINGS PROGRESS</span>
                </div>

                <div className="master-fow-cards-row" id="masterFowCards">
                  {/* Dynamic Fall of Wickets cards injected dynamically from active batting team roster */}
                  <div className="fow-step-card opening">
                    <span className="fow-score">0/0</span>
                    <b className="fow-player">OPENING PARTNERSHIP</b>
                    <small className="fow-over">0.0 OV · NO WICKETS DOWN</small>
                  </div>
                </div>

                <div className="master-phases-row" id="masterPhasesRow">
                  <div className="phase-pill">
                    <small>POWERPLAY (1-6)</small>
                    <b id="phasePP">YET TO BAT</b>
                  </div>
                  <div className="phase-pill">
                    <small>MIDDLE OVERS (7-15)</small>
                    <b id="phaseMid">YET TO BAT</b>
                  </div>
                  <div className="phase-pill hot">
                    <small>DEATH OVERS (16-20)</small>
                    <b id="phaseDeath">YET TO BAT</b>
                  </div>
                </div>
              </div>

              {/* ZONE 5: TOURNAMENT STANDINGS & LIVE TABLE */}
              <div className="master-zone master-zone-standings">
                <div className="zone-header">
                  <div className="zone-title-wrap">
                    <span className="zone-num">ZONE 05</span>
                    <h3>NPL 2026 STANDINGS · TABLE</h3>
                  </div>
                  <span className="zone-pill" id="masterStandingsPill">SEASON 3 · PRE-TOURNAMENT</span>
                </div>

                <div className="master-mini-table">
                  <div className="table-row head">
                    <span>#</span>
                    <span>TEAM</span>
                    <span>P</span>
                    <span>W</span>
                    <span>L</span>
                    <span>PTS</span>
                    <span>NRR</span>
                  </div>
                  <div className="master-points-rows" id="masterPointsRows">
                    {/* Rows injected dynamically from NPL data */}
                  </div>
                </div>
              </div>
            </div>

            {/* MASTER FOOTER */}
            <footer className="master-foot">
              <div className="master-foot-left">
                <span className="broadcaster-tag">OFFICIAL BROADCAST</span>
                <span>NEPAL PREMIER LEAGUE 2026 · LIVE FROM TU INTERNATIONAL CRICKET GROUND</span>
              </div>
              <div className="master-foot-right">
                <span id="masterVenueFooter">TU INTERNATIONAL CRICKET GROUND · KIRTIPUR</span>
              </div>
            </footer>
          </section>

          {/* 23B FULL GRAPHICS MASTER WITH BOTTOM-LEFT COMPACT ANCHOR POSITION & FULL MATCH INFORMATICS */}
          <section className="gfx master-card anchor-master is-hidden" data-gfx="anchorMaster" id="anchorMaster">
            <div className="master-bg-crest team-a" id="anchorMasterBgCrestA" aria-hidden="true"></div>
            <div className="master-bg-crest team-b" id="anchorMasterBgCrestB" aria-hidden="true"></div>

            {/* Header: Batting Franchise, Score lockup & Bowling Franchise */}
            <header className="anchor-master-header">
              <div className="anchor-master-team">
                <div className="master-crest-wrapper"><span className="team-monogram" id="anchorMasterTeamAMonogram">LUL</span></div>
                <div><small>BATTING</small><h2 id="anchorMasterTeamAName">LUMBINI LIONS</h2></div>
              </div>
              <div className="anchor-master-score">
                <span id="anchorMasterMatchLabel">NPL 2026 · MATCH 01</span>
                <strong><b id="anchorMasterRuns">0</b><i>/</i><b id="anchorMasterWickets">0</b></strong>
                <em><b id="anchorMasterOvers">0.0</b> OVERS</em>
              </div>
              <div className="anchor-master-team right">
                <div><small>BOWLING</small><h2 id="anchorMasterTeamBName">SUDURPASCHIM ROYALS</h2></div>
                <div className="master-crest-wrapper"><span className="team-monogram" id="anchorMasterTeamBMonogram">SPR</span></div>
              </div>
            </header>

            {/* Equation bar */}
            <div className="anchor-master-equation">
              <span id="anchorMasterRequirement">LUMBINI LIONS vs SUDURPASCHIM ROYALS · MATCH SCHEDULED</span>
              <div><small>CRR</small> <b id="anchorMasterRate">-</b><small>RRR</small> <b id="anchorMasterRrr">-</b><small>TARGET</small> <b id="anchorMasterTarget">-</b></div>
            </div>

            {/* 4-Column Grid: Anchor + Batters + Bowler + Standings */}
            <div className="anchor-master-grid">
              {/* COLUMN 1: COMPACT ANCHOR PRESENTER + PHASES + TOSS */}
              <div className="anchor-col anchor-col-left">
                {/* Compact 16:9 Anchor Presenter PIP window (clean without badges over frame) */}
                <div className="anchor-master-video-zone">
                  <div className="anchor-frame-corner top-left"></div>
                  <div className="anchor-frame-corner top-right"></div>
                  <div className="anchor-frame-corner bottom-left"></div>
                  <div className="anchor-frame-corner bottom-right"></div>
                  <div className="anchor-safe-copy">
                    <b>PRESENTER FEED</b>
                    <span>16:9 BROADCAST DESK</span>
                  </div>
                  <div className="anchor-audio-eq">
                    <span></span><span></span><span></span><span></span><span></span><span></span>
                  </div>
                </div>

                {/* Match Phases Timeline */}
                <div className="anchor-phases-card">
                  <div className="anchor-card-head">
                    <span>MATCH PHASES</span>
                    <small>INNINGS TEMPO</small>
                  </div>
                  <div className="anchor-phase-pills">
                    <div className="phase-pill">
                      <small>POWERPLAY (1-6)</small>
                      <b id="anchorMasterPhasePP">YET TO BAT</b>
                    </div>
                    <div className="phase-pill">
                      <small>MIDDLE (7-15)</small>
                      <b id="anchorMasterPhaseMid">YET TO BAT</b>
                    </div>
                    <div className="phase-pill hot">
                      <small>DEATH (16-20)</small>
                      <b id="anchorMasterPhaseDeath">YET TO BAT</b>
                    </div>
                  </div>
                </div>

                {/* Toss & Venue Card */}
                <div className="anchor-toss-card">
                  <div className="toss-icon">🪙</div>
                  <div className="toss-copy">
                    <small>TOSS & VENUE</small>
                    <strong id="anchorMasterTossText">MATCH SCHEDULED · TOSS AT TU GROUND</strong>
                  </div>
                </div>
              </div>

              {/* COLUMN 2: AT THE CREASE & ACTIVE PARTNERSHIP */}
              <div className="anchor-col anchor-col-batting">
                <div className="anchor-section-header">
                  <span>AT THE CREASE</span>
                  <b>LIVE BATTERS</b>
                </div>

                {/* Striker Card */}
                <div className="anchor-player-card striker">
                  <div className="player-cutout-img" id="anchorMasterStrikerPhoto"></div>
                  <div className="anchor-player-info">
                    <small className="strike-tag">ON STRIKE ★</small>
                    <h3 id="anchorMasterStrikerName">ROHIT PAUDEL</h3>
                    <strong id="anchorMasterStrikerRuns">0*</strong>
                    <div className="anchor-player-sub">
                      <span><b id="anchorMasterStrikerBalls">0</b> BALLS</span>
                      <span>SR <b id="anchorMasterStrikerSR">0.0</b></span>
                    </div>
                    <div className="anchor-player-boundaries">
                      <span>4s: <b id="anchorMasterStrikerFours">0</b></span>
                      <span>6s: <b id="anchorMasterStrikerSixes">0</b></span>
                    </div>
                  </div>
                </div>

                {/* Non-Striker Card */}
                <div className="anchor-player-card">
                  <div className="player-cutout-img" id="anchorMasterNonStrikerPhoto"></div>
                  <div className="anchor-player-info">
                    <small className="non-strike-tag">NON-STRIKER</small>
                    <h3 id="anchorMasterNonStrikerName">AAKASH TRIPATHI</h3>
                    <strong id="anchorMasterNonStrikerRuns">0*</strong>
                    <div className="anchor-player-sub">
                      <span><b id="anchorMasterNonStrikerBalls">0</b> BALLS</span>
                      <span>SR <b id="anchorMasterNonStrikerSR">0.0</b></span>
                    </div>
                    <div className="anchor-player-boundaries">
                      <span>4s: <b id="anchorMasterNonStrikerFours">0</b></span>
                      <span>6s: <b id="anchorMasterNonStrikerSixes">0</b></span>
                    </div>
                  </div>
                </div>

                {/* Partnership Card */}
                <div className="anchor-partnership-card">
                  <div className="partnership-head">
                    <span id="anchorMasterPartnershipLabel">OPENING PARTNERSHIP</span>
                    <b id="anchorMasterPartnershipRuns">0 RUNS</b>
                  </div>
                  <div className="anchor-part-split-bar">
                    <div className="part-seg a" id="anchorMasterPartSplitA" style={{ width: '50%' }}></div>
                    <div className="part-seg b" id="anchorMasterPartSplitB" style={{ width: '50%' }}></div>
                  </div>
                  <div className="partnership-foot">
                    <span>BALLS: <b id="anchorMasterPartnershipBalls">0 BALLS</b></span>
                    <span>RUN RATE: <b id="anchorMasterPartnershipRate">0.00</b></span>
                  </div>
                </div>
              </div>

              {/* COLUMN 3: CURRENT BOWLER & OVER TRAJECTORY & FOW */}
              <div className="anchor-col anchor-col-bowling">
                <div className="anchor-section-header">
                  <span>CURRENT SPELL</span>
                  <b>BOWLER & OVER</b>
                </div>

                {/* Bowler Hero Card */}
                <div className="anchor-bowler-hero">
                  <div className="player-cutout-img" id="anchorMasterBowlerPhoto"></div>
                  <div className="anchor-player-info">
                    <div className="bowler-tag-row">
                      <small id="anchorMasterBowlerStyle">RIGHT-ARM MEDIUM</small>
                    </div>
                    <h3 id="anchorMasterBowlerName">ABINASH BOHARA</h3>
                    <div className="bowler-figures-lockup">
                      <strong id="anchorMasterBowlerFigures">0/0</strong>
                      <div className="bowler-pills">
                        <span><b id="anchorMasterBowlerOvers">0.0</b> OV</span>
                        <span>ECON <b id="anchorMasterBowlerEcon">0.00</b></span>
                      </div>
                    </div>
                    <div className="bowler-extra-stats">
                      <span>MAIDENS: <b id="anchorMasterBowlerMaidens">0</b></span>
                      <span>DOTS: <b id="anchorMasterBowlerDots">0</b></span>
                    </div>
                  </div>
                </div>

                {/* Over Deliveries Strip */}
                <div className="anchor-master-over">
                  <div className="over-head-row">
                    <span>THIS OVER DELIVERIES</span>
                    <small id="anchorMasterVenue">TU GROUND</small>
                  </div>
                  <div className="master-recent-balls" id="anchorMasterRecentBalls"></div>
                </div>

                {/* Fall of Wickets Timeline */}
                <div className="anchor-fow-section">
                  <div className="fow-head-row">
                    <span>FALL OF WICKETS</span>
                    <small>TIMELINE</small>
                  </div>
                  <div className="anchor-fow-cards-row" id="anchorMasterFowCards">
                    <div className="fow-step-card opening">
                      <span className="fow-score">0/0</span>
                      <b className="fow-player">OPENING STAND</b>
                      <small className="fow-over">0.0 OV</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* COLUMN 4: NPL 2026 STANDINGS & MATCH INFORMATICS */}
              <div className="anchor-col anchor-col-standings">
                <div className="anchor-section-header">
                  <span>TOURNAMENT TABLE</span>
                  <b id="anchorMasterStandingsPill">NPL 2026 STANDINGS</b>
                </div>

                <div className="master-mini-table">
                  <div className="table-row head">
                    <span>#</span>
                    <span>TEAM</span>
                    <span>P</span>
                    <span>W</span>
                    <span>L</span>
                    <span>PTS</span>
                    <span>NRR</span>
                  </div>
                  <div className="master-points-rows" id="anchorMasterPointsRows">
                    {/* Standings injected dynamically by app.js */}
                  </div>
                </div>

                <div className="anchor-chase-box">
                  <div className="chase-title">MATCH EQUATION & STATUS</div>
                  <div className="chase-stats">
                    <div><small>TARGET</small><b id="anchorMasterTarget">-</b></div>
                    <div><small>CURRENT RR</small><b id="anchorMasterRate">-</b></div>
                    <div><small>REQ RR</small><b id="anchorMasterRrr">-</b></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="master-foot anchor-master-foot">
              <div className="master-foot-left">
                <span className="broadcaster-tag">OFFICIAL BROADCAST</span>
                <span>NEPAL PREMIER LEAGUE 2026 · LIVE BROADCAST DESK</span>
              </div>
              <div className="master-foot-right">
                <span>PRESENTER DESK & LIVE INFORMATICS</span>
              </div>
            </footer>
          </section>

          {/* INTEGRATED PURE ANIMATED CRICKET LOWER THIRD (NO NAMES - PURE BROADCAST MOTION GRAPHICS) */}
          <div className="master-event-lower-third is-hidden" id="masterEventLowerThird">
            <div className="melt-laser-sheen"></div>
            <div className="melt-glow-bar top" id="meltGlowBar"></div>
            <div className="melt-glow-bar bottom" id="meltGlowBarBottom"></div>
            <div className="melt-motion-bg" id="meltMotionBg"></div>

            <div className="melt-inner">
              {/* Left: Animated Icon & Shockwave Burst */}
              <div className="melt-burst-box" id="meltBurstBox">
                <div className="melt-burst-ring ring-1"></div>
                <div className="melt-burst-ring ring-2"></div>
                <div className="melt-icon-symbol" id="meltIconSymbol">⚡</div>
              </div>

              {/* Center: Pure Kinetic Typography & Kicker Badge (NO NAMES) */}
              <div className="melt-kinetic-core">
                <div className="melt-kicker-row">
                  <span className="melt-kicker-chip" id="meltKicker">BOUNDARY</span>
                  <div className="melt-speed-arrows">
                    <i></i><i></i><i></i>
                  </div>
                </div>
                <h2 className="melt-kinetic-title" id="meltTitle">FOUR</h2>
              </div>

              {/* Right: Dynamic Broadcast Equalizer Visualizer & Event Badge */}
              <div className="melt-graphic-flairs">
                <div className="melt-equalizer-bars" id="meltEqBars">
                  <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
                </div>
                <div className="melt-badge-pill" id="meltBadge">
                  <span className="live-dot">●</span>
                  <span id="meltBadgeText">4 RUNS</span>
                </div>
              </div>
            </div>
          </div>

          {/* 24 DUAL SCREEN / ANCHOR SPLIT */}
          <section className="gfx dual-screen is-hidden" data-gfx="dualScreen" id="dualScreen">
            <div className="anchor-side">
              <div className="anchor-safe-corner anchor-safe-tl"></div>
              <div className="anchor-safe-corner anchor-safe-tr"></div>
              <div className="anchor-safe-corner anchor-safe-bl"></div>
              <div className="anchor-safe-corner anchor-safe-br"></div>
              <div>
                <span className="anchor-badge">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'inline-block' }}></span>
                  LIVE ANCHOR · TU STADIUM
                </span>
              </div>
              <div className="anchor-title-strap">
                <h3 id="dualAnchorTitle">MATCH PRESENTATION & ANALYSIS</h3>
                <span id="dualAnchorSubtitle">NEPAL PREMIER LEAGUE 2026 · LIVE BROADCAST DESK</span>
              </div>
            </div>
            <div className="cricket-side">
              <div className="cricket-side-head">
                <div>
                  <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 900 }} id="dualMatchLabel">NPL 2026 MATCH 05</h3>
                  <small style={{ color: '#94a3b8' }} id="dualTeams">LUMBINI LIONS vs SUDURPASCHIM ROYALS</small>
                </div>
                <div className="team-monogram" id="dualTeamMonogram">LUL</div>
              </div>
              <div className="cricket-side-score">
                <b id="dualScore">0/0</b>
                <span id="dualOvers">0.0 OVERS · MATCH NOT STARTED</span>
              </div>
              <div className="cricket-side-details">
                <div className="cricket-side-row">
                  <span>EQUATION:</span>
                  <strong style={{ color: '#f59e0b' }} id="dualRequirement">LUMBINI LIONS vs SUDURPASCHIM ROYALS · MATCH SCHEDULED</strong>
                </div>
                <div className="cricket-side-row">
                  <span>AT CREASE:</span>
                  <b id="dualBatters">R. Paudel 0* (0) · A. Tripathi 0* (0)</b>
                </div>
                <div className="cricket-side-row">
                  <span>BOWLING:</span>
                  <b id="dualBowler">A. Bohara · 0/0 (0.0 ov)</b>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px' }}>
                <span>NPL LIVE GRAPHICS V7</span>
                <span style={{ color: '#22c55e', fontWeight: 750 }}>ON AIR</span>
              </div>
            </div>
          </section>

          {/* 22 CINEMATIC EVENT STINGERS WITH SHOCKWAVE & PARTICLES (PURE BROADCAST MOTION GRAPHICS - NO NAMES) */}
          <section className="gfx stinger is-hidden" data-gfx="stinger" id="stinger">
            <div className="stinger-bg"></div>
            <div className="stinger-shockwave-rings">
              <span className="shock-ring ring-1"></span>
              <span className="shock-ring ring-2"></span>
              <span className="shock-ring ring-3"></span>
            </div>
            <div className="stinger-particles" id="stingerParticles">
              <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
            </div>
            <div className="stinger-rule rule-a"></div>
            <div className="stinger-rule rule-b"></div>
            <div className="stinger-copy">
              <div className="stinger-kicker-badge">
                <span className="pulse-star">✦</span>
                <span id="stingerKicker">MAXIMUM</span>
                <span className="pulse-star">✦</span>
              </div>
              <h2 id="stingerWord">SIX</h2>
              <div className="stinger-motion-bars">
                <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
              </div>
              <div className="stinger-event-pill" id="stingerBadge">
                <span className="pulse-dot">●</span>
                <span id="stingerBadgeText">MAXIMUM 6 · OVER THE ROPES</span>
              </div>
            </div>
          </section>
        </section>
      </main>

      {/* GSAP & Anime.js for 120 FPS Rendering */}
      <Script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js" strategy="beforeInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js" strategy="beforeInteractive" />
      <Script src="/broadcast/app.js?v=20261024_v13" strategy="afterInteractive" />
    </>
  );
}
